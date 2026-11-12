"""
app/workers/tasks_ai.py
Celery tasks for AI engine processing: OCR, anomaly detection, RAG, policy gap analysis,
narrative generation, value-chain scoring, and explainer.
"""
from __future__ import annotations

import json
import logging
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from app.workers import celery_app

logger = logging.getLogger(__name__)


class _WorkerAnomalyItem(BaseModel):
    metric_code: str
    anomaly_type: str
    severity: str
    explanation: str


class _WorkerAnomalyReport(BaseModel):
    anomalies: List[_WorkerAnomalyItem] = Field(default_factory=list)


class _WorkerNarrativeOutput(BaseModel):
    draft: str


class _WorkerPolicyGapItem(BaseModel):
    code: str
    risk_level: str
    action: str
    regulatory_reference: str


class _WorkerPolicyGapReport(BaseModel):
    gaps: List[_WorkerPolicyGapItem] = Field(default_factory=list)


def _get_db():
    from app.db.session import SessionLocal
    return SessionLocal()


# ------------------------------------------------------------------
# OCR / Document Extraction
# ------------------------------------------------------------------

@celery_app.task(
    name="app.workers.tasks_ai.extract_document",
    bind=True,
    max_retries=2,
    default_retry_delay=30,
    queue="ai",
)
def extract_document(
    self,
    evidence_id: str,
    file_url: str,
    entity_id: str,
    period_id: str,
) -> Dict[str, Any]:
    """
    OCR + structured extraction from an uploaded evidence document using the E1
    extraction pipeline, persisting proposed outputs in the ai_runs table.
    """
    from app.ai.e1_extract.extractor import e1_engine
    from app.ai.models import AIRun
    from app.ai.schemas import AIRunStatus, E1ExtractRequest
    from app.modules.evidence.models import EvidenceFile
    from app.modules.evidence.storage import storage_service

    db = _get_db()
    try:
        evidence = (
            db.query(EvidenceFile)
            .filter(EvidenceFile.id == evidence_id, EvidenceFile.is_deleted == False)
            .first()
        )
        if not evidence:
            raise ValueError(f"EvidenceFile '{evidence_id}' not found or is deleted.")

        file_bytes = storage_service.get_file_bytes(evidence.storage_key)
        if file_bytes is None and file_url:
            file_bytes = storage_service.get_file_bytes(file_url)
        if file_bytes is None:
            raise FileNotFoundError(
                f"Evidence bytes not found for evidence_id={evidence_id} storage_key={evidence.storage_key}"
            )

        req = E1ExtractRequest(
            evidence_id=str(evidence.id),
            file_bytes=file_bytes,
            filename=evidence.original_name,
            mime_type=evidence.mime_type,
            doc_type_hint=evidence.bill_type or evidence.doc_type,
        )
        res = e1_engine.extract_from_file(req, db_session=db)

        existing_run = db.query(AIRun).filter(AIRun.id == res.run_id).first()
        if not existing_run:
            max_conf = max((f.confidence for f in res.fields), default=0.0)
            run_record = AIRun(
                id=res.run_id,
                engine="E1",
                model="e1_extraction_pipeline",
                prompt_version="v2.0",
                input_ref=str(evidence.id),
                output=res.model_dump(),
                confidence=max_conf,
                status=AIRunStatus.PROPOSED.value,
            )
            db.add(run_record)
            db.commit()

        return {
            "evidence_id": str(evidence.id),
            "run_id": res.run_id,
            "doc_type": res.doc_type,
            "is_relevant": res.is_relevant,
            "rejection_reason": res.rejection_reason,
            "fields_count": len(res.fields),
            "fields": [f.model_dump() for f in res.fields],
            "status": "extracted" if res.is_relevant else "rejected",
        }
    except Exception as exc:
        db.rollback()
        logger.exception("extract_document task failed: %s", exc)
        raise self.retry(exc=exc)
    finally:
        db.close()


# ------------------------------------------------------------------
# Anomaly Detection
# ------------------------------------------------------------------

@celery_app.task(
    name="app.workers.tasks_ai.detect_anomalies",
    bind=True,
    max_retries=2,
    default_retry_delay=30,
    queue="ai",
)
def detect_anomalies(
    self,
    period_id: str,
    entity_id: str,
) -> Dict[str, Any]:
    """
    Run AI-powered anomaly detection on approved metric values for the period/entity.
    Flags outliers vs. historical trend and YoY variance thresholds.
    """
    from sqlalchemy import text
    from app.ai.gateway import ai_gateway

    db = _get_db()
    try:
        rows = db.execute(
            text("""
                SELECT m.code, m.name, COALESCE(dp.normalized_value, dp.value_numeric), COALESCE(m.base_unit, dp.unit)
                FROM data_points dp
                JOIN submissions s ON s.id = dp.submission_id
                JOIN metrics m ON m.code = dp.metric_code
                WHERE s.period_id = :period_id
                  AND s.entity_id = :entity_id
                  AND s.is_deleted = FALSE
                  AND dp.is_deleted = FALSE
                  AND m.is_deleted = FALSE
                  AND s.status IN ('PROJECT_APPROVED', 'BU_APPROVED', 'SUBSIDIARY_APPROVED', 'CONSOLIDATED', 'LOCKED', 'SUBMITTED')
                  AND COALESCE(dp.normalized_value, dp.value_numeric) IS NOT NULL
            """),
            {"period_id": period_id, "entity_id": entity_id},
        ).fetchall()

        metrics_summary = "\n".join(
            f"- {r[0]} ({r[1]}): {r[2]} {r[3] or ''}" for r in rows
        )

        prompt = (
            f"You are an ESG data quality analyst. "
            f"Review these metric values for entity {entity_id}, period {period_id}:\n"
            f"{metrics_summary or 'No numeric metric values reported.'}\n\n"
            f"Identify any anomalies, outliers, or values that seem implausible. "
            f"Return JSON with key 'anomalies': [{{metric_code, anomaly_type, severity, explanation}}]."
        )

        report = ai_gateway.run_structured(
            engine="E2",
            prompt=prompt,
            response_model=_WorkerAnomalyReport,
            input_ref=f"{period_id}:{entity_id}",
            db_session=db,
        )
        serialized = json.dumps([item.model_dump() for item in report.anomalies])

        return {
            "period_id": period_id,
            "entity_id": entity_id,
            "metrics_checked": len(rows),
            "anomaly_report": serialized[:1000],
            "status": "completed",
        }
    except Exception as exc:
        db.rollback()
        logger.exception("detect_anomalies task failed: %s", exc)
        raise self.retry(exc=exc)
    finally:
        db.close()


# ------------------------------------------------------------------
# Narrative Generation
# ------------------------------------------------------------------

@celery_app.task(
    name="app.workers.tasks_ai.generate_narrative",
    bind=True,
    max_retries=2,
    default_retry_delay=30,
    queue="ai",
)
def generate_narrative(
    self,
    period_id: str,
    root_entity_id: str,
    section: str = "general",
    tone: str = "professional",
) -> Dict[str, Any]:
    """
    Generate an AI-written BRSR narrative for a specific section scoped to the
    target period and organizational subtree.
    """
    from sqlalchemy import text
    from app.ai.gateway import ai_gateway

    db = _get_db()
    try:
        rows = db.execute(
            text("""
                SELECT m.code,
                       m.name,
                       COALESCE(dp.normalized_value, dp.value_numeric),
                       dp.value_text,
                       COALESCE(m.base_unit, dp.unit)
                FROM data_points dp
                JOIN submissions s ON s.id = dp.submission_id
                JOIN org_nodes o ON o.id = s.entity_id
                JOIN metrics m ON m.code = dp.metric_code
                WHERE s.period_id = :period_id
                  AND s.is_deleted = FALSE
                  AND dp.is_deleted = FALSE
                  AND m.is_deleted = FALSE
                  AND o.is_deleted = FALSE
                  AND o.path <@ (
                      SELECT path FROM org_nodes WHERE id = :root_entity_id AND is_deleted = FALSE
                  )
                  AND s.status IN ('PROJECT_APPROVED', 'BU_APPROVED', 'SUBSIDIARY_APPROVED', 'CONSOLIDATED', 'LOCKED')
                  AND (
                      LOWER(:section) = 'general'
                      OR m.category ILIKE :section_pat
                      OR m.section ILIKE :section_pat
                      OR COALESCE(m.core_attribute, '') ILIKE :section_pat
                  )
                ORDER BY m.code
                LIMIT 50
            """),
            {
                "period_id": period_id,
                "root_entity_id": root_entity_id,
                "section": section,
                "section_pat": f"%{section}%",
            },
        ).fetchall()

        data_points = "\n".join(
            f"- {r[0]} ({r[1]}): {r[2] if r[2] is not None else r[3]} {r[4] or ''}" for r in rows
        )

        prompt = (
            f"Write a {tone} ESG narrative for the '{section}' section of a BRSR report "
            f"(as per SEBI guidelines) for entity {root_entity_id}, period {period_id}. Use the following data:\n"
            f"{data_points or 'No approved data points found for this section.'}\n\n"
            f"The narrative should be 200-300 words, factual, and suitable for annual report publication. "
            f"Return JSON with key 'draft'."
        )

        narrative_res = ai_gateway.run_structured(
            engine="E5",
            prompt=prompt,
            response_model=_WorkerNarrativeOutput,
            input_ref=f"{period_id}:{root_entity_id}:{section}",
            db_session=db,
        )

        return {
            "period_id": period_id,
            "entity_id": root_entity_id,
            "section": section,
            "narrative": narrative_res.draft,
            "status": "generated",
        }
    except Exception as exc:
        db.rollback()
        logger.exception("generate_narrative task failed: %s", exc)
        raise self.retry(exc=exc)
    finally:
        db.close()


# ------------------------------------------------------------------
# Policy Gap Analysis (RAG)
# ------------------------------------------------------------------

@celery_app.task(
    name="app.workers.tasks_ai.analyze_policy_gaps",
    bind=True,
    max_retries=2,
    default_retry_delay=60,
    queue="ai",
)
def analyze_policy_gaps(
    self,
    period_id: str,
    entity_id: str,
) -> Dict[str, Any]:
    """
    Analyze disclosed values against essential/core SEBI BRSR requirements and
    identify gaps or missing disclosures.
    """
    from sqlalchemy import text
    from app.ai.gateway import ai_gateway

    db = _get_db()
    try:
        rows = db.execute(
            text("""
                SELECT m.code, m.name, m.category
                FROM metrics m
                WHERE m.is_deleted = FALSE
                  AND (m.indicator_type = 'essential' OR m.brsr_core = TRUE)
                  AND m.code NOT IN (
                    SELECT dp.metric_code
                    FROM data_points dp
                    JOIN submissions s ON s.id = dp.submission_id
                    WHERE s.period_id = :period_id
                      AND s.entity_id = :entity_id
                      AND s.is_deleted = FALSE
                      AND dp.is_deleted = FALSE
                      AND s.status IN ('PROJECT_APPROVED', 'BU_APPROVED', 'SUBSIDIARY_APPROVED', 'CONSOLIDATED', 'LOCKED')
                  )
                ORDER BY m.category, m.code
            """),
            {"period_id": period_id, "entity_id": entity_id},
        ).fetchall()

        missing = "\n".join(f"- [{r[2]}] {r[0]}: {r[1]}" for r in rows)

        prompt = (
            f"As an ESG compliance expert, analyze these missing essential/core BRSR disclosures "
            f"for period {period_id}:\n{missing or 'None — all essential disclosures present.'}\n\n"
            f"For each gap: explain the regulatory risk, suggested action, and priority (High/Medium/Low). "
            f"Return JSON with key 'gaps': [{{code, risk_level, action, regulatory_reference}}]."
        )

        gap_res = ai_gateway.run_structured(
            engine="E4",
            prompt=prompt,
            response_model=_WorkerPolicyGapReport,
            input_ref=f"{period_id}:{entity_id}",
            db_session=db,
        )
        serialized = json.dumps([item.model_dump() for item in gap_res.gaps])

        return {
            "period_id": period_id,
            "entity_id": entity_id,
            "missing_mandatory_count": len(rows),
            "gap_analysis": serialized[:2000],
            "status": "completed",
        }
    except Exception as exc:
        db.rollback()
        logger.exception("analyze_policy_gaps task failed: %s", exc)
        raise self.retry(exc=exc)
    finally:
        db.close()
