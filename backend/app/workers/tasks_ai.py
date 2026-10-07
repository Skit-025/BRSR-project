"""
app/workers/tasks_ai.py
Celery tasks for AI engine processing: OCR, anomaly detection, RAG, policy gap analysis,
narrative generation, value-chain scoring, and explainer.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, Optional

from app.workers import celery_app
from app.config.settings import settings

logger = logging.getLogger(__name__)


def _get_db():
    from app.db.session import SessionLocal
    return SessionLocal()


async def _call_ai(prompt: str, model_type: str = "text") -> str:
    """Dispatch to the active AI provider (Gemini -> OpenRouter -> Mock fallback)."""
    from app.ai.engine import get_ai_engine
    engine = get_ai_engine()
    if model_type == "vision":
        return await engine.vision(prompt)
    return await engine.complete(prompt)


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
    OCR + structured extraction from an uploaded evidence document.
    Calls the vision AI engine to extract ESG metrics from image/PDF.
    """
    if getattr(settings, "AI_ENGINES_V2", False):
        from app.workers.tasks_ai_adapters import E1TaskAdapter
        return E1TaskAdapter.run(evidence_id, file_url, entity_id, period_id)

    import asyncio
    db = _get_db()
    try:
        prompt = (
            f"You are an ESG data extraction specialist. "
            f"Extract all measurable ESG metrics (numeric values, units, dates) "
            f"from the document at {file_url}. "
            f"Return a JSON array of: {{metric_name, value, unit, confidence_score}}."
        )
        loop = asyncio.new_event_loop()
        raw_text = loop.run_until_complete(_call_ai(prompt, model_type="vision"))
        loop.close()

        # Store AI extraction result in evidence record
        db.execute(
            __import__("sqlalchemy").text("""
                UPDATE evidence_files
                SET ai_extracted = :data, updated_at = NOW()
                WHERE id = :id
            """),
            {"id": evidence_id, "data": raw_text},
        )
        db.commit()

        return {"evidence_id": evidence_id, "status": "extracted", "raw": raw_text[:500]}
    except Exception as exc:
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
    if getattr(settings, "AI_ENGINES_V2", False):
        from app.workers.tasks_ai_adapters import E2TaskAdapter
        return E2TaskAdapter.run(period_id, entity_id)

    import asyncio
    from sqlalchemy import text

    db = _get_db()
    try:
        rows = db.execute(
            text("""
                SELECT m.code, m.label, de.value_numeric, de.unit
                FROM data_entries de
                JOIN metrics m ON m.id = de.metric_id
                WHERE de.period_id = :period_id
                  AND de.entity_id = :entity_id
                  AND de.status = 'APPROVED'
                  AND de.value_numeric IS NOT NULL
            """),
            {"period_id": period_id, "entity_id": entity_id},
        ).fetchall()

        metrics_summary = "\n".join(
            f"- {r[0]} ({r[1]}): {r[2]} {r[3] or ''}" for r in rows
        )

        prompt = (
            f"You are an ESG data quality analyst. "
            f"Review these metric values for entity {entity_id}, period {period_id}:\n"
            f"{metrics_summary}\n\n"
            f"Identify any anomalies, outliers, or values that seem implausible. "
            f"Return JSON: [{{metric_code, anomaly_type, severity, explanation}}]"
        )

        loop = asyncio.new_event_loop()
        result = loop.run_until_complete(_call_ai(prompt))
        loop.close()

        return {
            "period_id": period_id,
            "entity_id": entity_id,
            "metrics_checked": len(rows),
            "anomaly_report": result[:1000],
            "status": "completed",
        }
    except Exception as exc:
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
    Generate an AI-written BRSR narrative for a specific section.
    Used in the reporting module to auto-draft qualitative disclosures.
    """
    if getattr(settings, "AI_ENGINES_V2", False):
        from app.workers.tasks_ai_adapters import E5TaskAdapter
        return E5TaskAdapter.run(period_id, root_entity_id, section, tone)

    import asyncio
    from sqlalchemy import text

    db = _get_db()
    try:
        rows = db.execute(
            text("""
                SELECT m.code, m.label, de.value_numeric, de.value_text, de.unit
                FROM data_entries de
                JOIN metrics m ON m.id = de.metric_id
                WHERE de.period_id = :period_id
                  AND de.status IN ('APPROVED', 'CONSOLIDATED')
                  AND m.pillar ILIKE :section
                ORDER BY m.code
                LIMIT 50
            """),
            {"period_id": period_id, "section": f"%{section}%"},
        ).fetchall()

        data_points = "\n".join(
            f"- {r[0]} {r[1]}: {r[2] or r[3]} {r[4] or ''}" for r in rows
        )

        prompt = (
            f"Write a {tone} ESG narrative for the '{section}' section of a BRSR report "
            f"(as per SEBI guidelines). Use the following data:\n{data_points}\n\n"
            f"The narrative should be 200-300 words, factual, and suitable for annual report publication."
        )

        loop = asyncio.new_event_loop()
        narrative = loop.run_until_complete(_call_ai(prompt))
        loop.close()

        return {
            "period_id": period_id,
            "entity_id": root_entity_id,
            "section": section,
            "narrative": narrative,
            "status": "generated",
        }
    except Exception as exc:
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
    Analyze disclosed values against SEBI BRSR mandatory requirements and
    identify gaps or missing disclosures.
    """
    if getattr(settings, "AI_ENGINES_V2", False):
        from app.workers.tasks_ai_adapters import E4TaskAdapter
        return E4TaskAdapter.run(period_id, entity_id)

    import asyncio
    from sqlalchemy import text

    db = _get_db()
    try:
        # Get metrics that are mandatory but have no approved value
        rows = db.execute(
            text("""
                SELECT m.code, m.label, m.pillar, m.is_mandatory
                FROM metrics m
                WHERE m.is_mandatory = TRUE
                  AND m.id NOT IN (
                    SELECT metric_id FROM data_entries
                    WHERE period_id = :period_id
                      AND entity_id = :entity_id
                      AND status IN ('APPROVED', 'CONSOLIDATED')
                  )
                ORDER BY m.pillar, m.code
            """),
            {"period_id": period_id, "entity_id": entity_id},
        ).fetchall()

        missing = "\n".join(f"- [{r[2]}] {r[0]}: {r[1]}" for r in rows)

        prompt = (
            f"As an ESG compliance expert, analyze these missing mandatory BRSR disclosures "
            f"for period {period_id}:\n{missing or 'None ?" all mandatory disclosures present.'}\n\n"
            f"For each gap: explain the regulatory risk, suggested action, and priority (High/Medium/Low). "
            f"Return JSON: [{{code, risk_level, action, regulatory_reference}}]"
        )

        loop = asyncio.new_event_loop()
        analysis = loop.run_until_complete(_call_ai(prompt))
        loop.close()

        return {
            "period_id": period_id,
            "entity_id": entity_id,
            "missing_mandatory_count": len(rows),
            "gap_analysis": analysis[:2000],
            "status": "completed",
        }
    except Exception as exc:
        logger.exception("analyze_policy_gaps task failed: %s", exc)
        raise self.retry(exc=exc)
    finally:
        db.close()
