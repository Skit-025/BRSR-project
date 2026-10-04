"""
app/workers/tasks_reports.py
Celery tasks for report generation and audit pack compilation.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from app.workers import celery_app

logger = logging.getLogger(__name__)


def _get_db():
    from app.db.session import SessionLocal
    return SessionLocal()


@celery_app.task(
    name="app.workers.tasks_reports.generate_report",
    bind=True,
    max_retries=2,
    default_retry_delay=30,
    queue="reports",
)
def generate_report(
    self,
    period_id: str,
    root_entity_id: str,
    requested_by: str = "celery",
    output_formats: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Background task: generate a full BRSR report for the given period/entity.
    Returns the summary with rendered outputs and audit pack metadata.
    """
    db = _get_db()
    try:
        from app.pipelines.reporting.pipeline import run_reporting_pipeline
        result = run_reporting_pipeline(
            db=db,
            period_id=period_id,
            root_entity_id=root_entity_id,
            requested_by=requested_by,
            output_formats=output_formats or ["json", "csv", "html"],
        )
        logger.info(
            "Report generated | period=%s entity=%s status=%s",
            period_id, root_entity_id, result.get("status"),
        )
        return result
    except Exception as exc:
        logger.exception("generate_report task failed: %s", exc)
        raise self.retry(exc=exc)
    finally:
        db.close()


@celery_app.task(
    name="app.workers.tasks_reports.export_report_to_storage",
    bind=True,
    max_retries=2,
    default_retry_delay=60,
    queue="reports",
)
def export_report_to_storage(
    self,
    period_id: str,
    root_entity_id: str,
    requested_by: str = "celery",
    output_formats: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Background task: generate a report and persist all rendered outputs to MinIO/S3.
    """
    db = _get_db()
    try:
        from app.pipelines.reporting.pipeline import run_reporting_pipeline

        result = run_reporting_pipeline(
            db=db,
            period_id=period_id,
            root_entity_id=root_entity_id,
            requested_by=requested_by,
            output_formats=output_formats or ["json", "csv", "html"],
        )

        if result.get("status") != "COMPLETED":
            return result

        # Upload each rendered format to MinIO
        uploaded: Dict[str, str] = {}
        try:
            import boto3
            from botocore.client import Config
            from app.config.settings import settings

            s3 = boto3.client(
                "s3",
                endpoint_url=settings.S3_ENDPOINT,
                aws_access_key_id=settings.S3_ACCESS_KEY,
                aws_secret_access_key=settings.S3_SECRET_KEY,
                config=Config(signature_version="s3v4"),
                region_name=settings.S3_REGION,
            )

            for fmt, content in result.get("rendered_outputs", {}).items():
                key = f"reports/{period_id}/{root_entity_id}/brsr_report.{fmt}"
                s3.put_object(
                    Bucket=settings.S3_BUCKET_NAME,
                    Key=key,
                    Body=content.encode("utf-8"),
                    ContentType=_content_type(fmt),
                )
                uploaded[fmt] = f"{settings.S3_ENDPOINT}/{settings.S3_BUCKET_NAME}/{key}"
                logger.info("Uploaded %s report to %s", fmt, uploaded[fmt])

        except Exception as upload_exc:  # noqa: BLE001
            logger.warning("MinIO upload failed (non-fatal): %s", upload_exc)

        result["storage_urls"] = uploaded
        return result

    except Exception as exc:
        logger.exception("export_report_to_storage task failed: %s", exc)
        raise self.retry(exc=exc)
    finally:
        db.close()


def _content_type(fmt: str) -> str:
    return {
        "json": "application/json",
        "csv": "text/csv",
        "html": "text/html",
        "pdf": "application/pdf",
    }.get(fmt, "application/octet-stream")


@celery_app.task(
    name="app.workers.tasks_reports.scheduled_report_all_entities",
    queue="reports",
)
def scheduled_report_all_entities() -> Dict[str, Any]:
    """
    Beat periodic task: generate and export reports for all closed periods.
    """
    from sqlalchemy import text

    db = _get_db()
    try:
        rows = db.execute(
            text("""
                SELECT DISTINCT rp.id::text, e.id::text
                FROM reporting_periods rp
                JOIN entities e ON e.is_root = TRUE
                WHERE rp.status = 'LOCKED'
                ORDER BY rp.id
            """)
        ).fetchall()

        dispatched = []
        for period_id, root_entity_id in rows:
            export_report_to_storage.delay(period_id, root_entity_id)
            dispatched.append({"period_id": period_id, "root_entity_id": root_entity_id})

        return {"dispatched": len(dispatched), "tasks": dispatched}
    except Exception as exc:
        logger.exception("scheduled_report_all_entities failed: %s", exc)
        return {"error": str(exc)}
    finally:
        db.close()
