"""
app/workers/tasks_pipelines.py
Celery tasks for aggregation and closing pipeline execution.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.workers import celery_app

logger = logging.getLogger(__name__)


def _get_db():
    """Get a synchronous DB session for use inside Celery tasks."""
    from app.db.session import SessionLocal
    return SessionLocal()


@celery_app.task(
    name="app.workers.tasks_pipelines.run_aggregation",
    bind=True,
    max_retries=2,
    default_retry_delay=60,
    queue="pipelines",
)
def run_aggregation(
    self,
    period_id: str,
    root_entity_id: str,
    triggered_by: str = "celery",
    dry_run: bool = False,
) -> Dict[str, Any]:
    """Background task: run the authoritative boundary aggregation pipeline."""
    db = _get_db()
    try:
        from app.modules.consolidation.service import run_consolidation_engine
        res = run_consolidation_engine(
            db=db,
            period_id=str(period_id),
            root_node_id=str(root_entity_id) if root_entity_id else None,
        )
        return {
            "status": "COMPLETED",
            "period_id": period_id,
            "root_entity_id": root_entity_id,
            "entities_processed": res.consolidated_nodes_count,
            "metrics_processed": res.consolidated_metrics_count,
            "message": res.message,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    except Exception as exc:
        logger.exception("run_aggregation task failed: %s", exc)
        raise self.retry(exc=exc)
    finally:
        db.close()


@celery_app.task(
    name="app.workers.tasks_pipelines.run_incremental_aggregation",
    bind=True,
    max_retries=2,
    default_retry_delay=30,
    queue="pipelines",
)
def run_incremental_aggregation(
    self,
    period_id: str,
    root_entity_id: str,
) -> Dict[str, Any]:
    """Background task: run incremental aggregation (dirty entities only)."""
    db = _get_db()
    try:
        from app.pipelines.aggregation.incremental import run_incremental_aggregation as _run
        return _run(db=db, period_id=str(period_id), root_entity_id=str(root_entity_id))
    except Exception as exc:
        logger.exception("run_incremental_aggregation task failed: %s", exc)
        raise self.retry(exc=exc)
    finally:
        db.close()


@celery_app.task(
    name="app.workers.tasks_pipelines.trigger_incremental_aggregation_all",
    queue="pipelines",
)
def trigger_incremental_aggregation_all() -> Dict[str, Any]:
    """
    Beat periodic task: trigger incremental aggregation for all open periods.
    Fires every hour (configured in settings.beat_schedule).
    """
    from sqlalchemy import text
    db = _get_db()
    try:
        rows = db.execute(
            text("""
                SELECT DISTINCT rp.id::text, e.id::text AS root_entity_id
                FROM reporting_periods rp
                JOIN org_nodes e ON e.is_root = TRUE
                WHERE rp.status = 'OPEN'
                  AND rp.is_deleted = FALSE
                  AND e.is_deleted = FALSE
            """)
        ).fetchall()

        dispatched = []
        for period_id, root_entity_id in rows:
            run_incremental_aggregation.delay(period_id, root_entity_id)
            dispatched.append({"period_id": period_id, "root_entity_id": root_entity_id})

        logger.info("Dispatched %d incremental aggregation tasks.", len(dispatched))
        return {"dispatched": len(dispatched), "tasks": dispatched}
    except Exception as exc:
        logger.exception("trigger_incremental_aggregation_all failed: %s", exc)
        return {"error": str(exc)}
    finally:
        db.close()


@celery_app.task(
    name="app.workers.tasks_pipelines.run_closing",
    bind=True,
    max_retries=1,
    queue="pipelines",
)
def run_closing(
    self,
    period_id: str,
    root_entity_id: str,
    closed_by: str = "celery",
) -> Dict[str, Any]:
    """Background task: run the period-closing pipeline."""
    db = _get_db()
    try:
        from app.pipelines.closing.pipeline import run_closing_pipeline
        return run_closing_pipeline(
            db=db,
            period_id=period_id,
            root_entity_id=root_entity_id,
            closed_by=closed_by,
        )
    except Exception as exc:
        logger.exception("run_closing task failed: %s", exc)
        raise self.retry(exc=exc)
    finally:
        db.close()


@celery_app.task(
    name="app.workers.tasks_pipelines.run_full_lifecycle",
    bind=True,
    max_retries=1,
    queue="pipelines",
)
def run_full_lifecycle(
    self,
    period_id: str,
    root_entity_id: str,
    actor: str = "celery",
    output_formats: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """Background task: run the full aggregation → closing → reporting lifecycle."""
    db = _get_db()
    try:
        from app.pipelines.orchestrator import PipelineOrchestrator
        orch = PipelineOrchestrator(db=db)
        return orch.run_full_lifecycle(
            period_id=period_id,
            root_entity_id=root_entity_id,
            actor=actor,
            output_formats=output_formats,
        )
    except Exception as exc:
        logger.exception("run_full_lifecycle task failed: %s", exc)
        raise self.retry(exc=exc)
    finally:
        db.close()
