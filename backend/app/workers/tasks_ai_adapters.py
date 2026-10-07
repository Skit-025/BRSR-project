"""
app/workers/tasks_ai_adapters.py
Thin adapter layer between Celery pipeline tasks and enhanced AI engines (E1..E7).
Preserves existing task names, arguments, return shapes, DB writes, and status values,
while invoking enhanced real AI engines, recording AI runs, and enforcing Number Lock.
"""
from __future__ import annotations

import json
import logging
import time
import uuid
from typing import Any, Dict, Optional, List

from sqlalchemy import text
from app.db.session import SessionLocal
from app.config.settings import settings
from app.ai.models import AIRun
from app.ai.schemas import AIRunStatus

# Import enhanced AI engines
from app.ai.e1_extract.pipeline import run_extraction_pipeline
from app.ai.schemas import (
    E1ExtractRequest,
    E2AnomalyRequest,
    E4PolicyCheckRequest,
    E5NarrativeRequest,
)
from app.ai.e2_anomaly.engine import e2_engine
from app.ai.e3_rag.retriever import retrieve
from app.ai.e5_narrative.drafter import e5_engine

logger = logging.getLogger(__name__)


def _record_ai_run(
    db,
    engine: str,
    model: str,
    output: Dict[str, Any],
    input_ref: Optional[str] = None,
    confidence: Optional[float] = None,
    citations: Optional[List[Dict[str, Any]]] = None,
    latency_ms: Optional[int] = None,
    status: str = AIRunStatus.PROPOSED.value,
    reviewer_id: Optional[str] = None,
    prompt_version: str = "v1.0"
) -> str:
    """Records an immutable AI execution audit record in the ai_runs table."""
    run_id = str(uuid.uuid4())
    try:
        run_record = AIRun(
            id=run_id,
            engine=engine,
            model=model,
            prompt_version=prompt_version,
            input_ref=input_ref,
            output=output,
            confidence=confidence,
            citations=citations,
            latency_ms=latency_ms,
            status=status,
            reviewer_id=reviewer_id
        )
        db.add(run_record)
        db.commit()
    except Exception as e:
        logger.warning(f"Failed to record ai_run audit record: {e}")
        db.rollback()
    return run_id


class E1TaskAdapter:
    @staticmethod
    def run(
        evidence_id: str,
        file_url: str,
        entity_id: str,
        period_id: str,
        reviewer_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Adapter for extract_document Celery task.
        Preserves return: {"evidence_id": ..., "status": "extracted", "raw": ...}
        Side effect: UPDATE evidence_files SET ai_extracted = :data, updated_at = NOW()
        """
        start_time = time.time()
        db = SessionLocal()
        try:
            # 1. Look up evidence record to check filename, storage_key, or doc_type
            row = db.execute(
                text("SELECT original_name, mime_type, storage_key FROM evidence_files WHERE id = :id"),
                {"id": evidence_id}
            ).fetchone()

            filename = row[0] if row else "document.pdf"
            mime_type = row[1] if row else "application/pdf"

            # 2. Build extraction request
            req = E1ExtractRequest(
                evidence_id=evidence_id,
                filename=filename,
                mime_type=mime_type,
                file_path=file_url if file_url and not file_url.startswith("http") else None
            )

            # 3. Execute enhanced extraction pipeline
            res = run_extraction_pipeline(req, db_session=db)
            latency_ms = int((time.time() - start_time) * 1000)

            if not res.is_relevant:
                logger.warning(f"E1TaskAdapter: Document rejected: {res.rejection_reason}")
                error_payload = {
                    "rejected": True,
                    "reason": res.rejection_reason,
                    "fields": []
                }
                raw_text = json.dumps(error_payload)
            else:
                fields_payload = [f.model_dump() for f in res.fields]
                if res.bill_details:
                    fields_payload.append({"__bill_details__": res.bill_details.model_dump()})
                raw_text = json.dumps(fields_payload)

            # 4. Update evidence_files record
            db.execute(
                text("""
                    UPDATE evidence_files
                    SET ai_extracted = :data, updated_at = NOW()
                    WHERE id = :id
                """),
                {"id": evidence_id, "data": raw_text}
            )
            db.commit()

            # 5. Record ai_runs audit entry
            avg_conf = None
            if res.fields:
                avg_conf = round(sum(f.confidence for f in res.fields) / len(res.fields), 4)

            _record_ai_run(
                db=db,
                engine="E1",
                model=getattr(settings, "AI_MODEL_VISION", "gemini-3.8-flash"),
                input_ref=evidence_id,
                output=res.model_dump(),
                confidence=avg_conf,
                latency_ms=latency_ms,
                status=AIRunStatus.PROPOSED.value if res.is_relevant else AIRunStatus.REJECTED.value,
                reviewer_id=reviewer_id
            )

            return {
                "evidence_id": evidence_id,
                "status": "extracted" if res.is_relevant else "rejected",
                "raw": raw_text[:500]
            }
        except Exception as exc:
            logger.exception("E1TaskAdapter failed: %s", exc)
            raise
        finally:
            db.close()


class E2TaskAdapter:
    @staticmethod
    def run(
        period_id: str,
        entity_id: str,
        reviewer_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Adapter for detect_anomalies Celery task.
        Preserves return: {"period_id": ..., "entity_id": ..., "metrics_checked": ..., "anomaly_report": ..., "status": "completed"}
        """
        start_time = time.time()
        db = SessionLocal()
        try:
            # 1. Fetch approved metrics for the current period and entity
            rows = db.execute(
                text("""
                    SELECT m.code, m.label, de.value_numeric, de.unit, de.metric_id
                    FROM data_entries de
                    JOIN metrics m ON m.id = de.metric_id
                    WHERE de.period_id = :period_id
                      AND de.entity_id = :entity_id
                      AND de.status = 'APPROVED'
                      AND de.value_numeric IS NOT NULL
                """),
                {"period_id": period_id, "entity_id": entity_id}
            ).fetchall()

            anomaly_items = []
            for r in rows:
                code, label, curr_val, unit, m_id = r[0], r[1], float(r[2]), r[3] or "", r[4]

                # 2. Fetch historical values across prior periods
                hist_rows = db.execute(
                    text("""
                        SELECT de.value_numeric
                        FROM data_entries de
                        WHERE de.metric_id = :m_id
                          AND de.entity_id = :entity_id
                          AND de.period_id != :period_id
                          AND de.status = 'APPROVED'
                          AND de.value_numeric IS NOT NULL
                        ORDER BY de.created_at DESC
                        LIMIT 10
                    """),
                    {"m_id": m_id, "entity_id": entity_id, "period_id": period_id}
                ).fetchall()

                history = [float(h[0]) for h in hist_rows]

                # 3. Run enhanced E2 anomaly evaluation
                req = E2AnomalyRequest(
                    metric_code=code,
                    current_value=curr_val,
                    unit=unit,
                    history=history
                )
                res = e2_engine.evaluate(req)

                if res.is_anomaly:
                    anomaly_items.append({
                        "metric_code": code,
                        "metric_label": label,
                        "current_value": curr_val,
                        "unit": unit,
                        "score": round(res.score, 4),
                        "reasons": [reason.feature for reason in res.reasons]
                    })

            latency_ms = int((time.time() - start_time) * 1000)
            result_json = json.dumps(anomaly_items)

            # 4. Record ai_runs audit entry
            _record_ai_run(
                db=db,
                engine="E2",
                model="statistical-rules-mad-zscore",
                input_ref=f"{entity_id}:{period_id}",
                output={"anomalies": anomaly_items, "metrics_evaluated": len(rows)},
                latency_ms=latency_ms,
                status=AIRunStatus.COMPLETED.value,
                reviewer_id=reviewer_id
            )

            return {
                "period_id": period_id,
                "entity_id": entity_id,
                "metrics_checked": len(rows),
                "anomaly_report": result_json[:1000],
                "status": "completed"
            }
        except Exception as exc:
            logger.exception("E2TaskAdapter failed: %s", exc)
            raise
        finally:
            db.close()


class E4TaskAdapter:
    @staticmethod
    def run(
        period_id: str,
        entity_id: str,
        reviewer_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Adapter for analyze_policy_gaps Celery task.
        Preserves return: {"period_id": ..., "entity_id": ..., "missing_mandatory_count": ..., "gap_analysis": ..., "status": "completed"}
        """
        start_time = time.time()
        db = SessionLocal()
        try:
            # 1. Query mandatory metrics without approved value
            rows = db.execute(
                text("""
                    SELECT m.code, m.label, m.pillar
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
                {"period_id": period_id, "entity_id": entity_id}
            ).fetchall()

            # 2. Enrich missing metrics using official SEBI BRSR Core guidance
            gap_items = []
            for r in rows:
                code, label, pillar = r[0], r[1], r[2]
                chunk, citation = retrieve(code)
                reg_ref = citation.section if citation else f"SEBI BRSR {pillar}"
                
                # Priority: Essential / Environmental & GHG is High risk; otherwise Medium
                is_high_risk = any(k in code.upper() for k in ["GHG", "ENERGY", "WATER", "SAFE", "001"])
                risk_level = "High" if is_high_risk else "Medium"
                
                action = f"Collect and verify {label} measurement or substantiate with utility/log evidence."
                if chunk and "guidance" in chunk:
                    action += f" Note: {chunk['guidance'][:120]}..."

                gap_items.append({
                    "code": code,
                    "label": label,
                    "pillar": pillar,
                    "risk_level": risk_level,
                    "action": action,
                    "regulatory_reference": reg_ref
                })

            latency_ms = int((time.time() - start_time) * 1000)
            result_json = json.dumps(gap_items)

            # 3. Record ai_runs audit entry
            _record_ai_run(
                db=db,
                engine="E4",
                model="sebi-brsr-guidance-policy-matcher",
                input_ref=f"{entity_id}:{period_id}",
                output={"gaps": gap_items, "count": len(gap_items)},
                latency_ms=latency_ms,
                status=AIRunStatus.COMPLETED.value,
                reviewer_id=reviewer_id
            )

            return {
                "period_id": period_id,
                "entity_id": entity_id,
                "missing_mandatory_count": len(rows),
                "gap_analysis": result_json[:2000],
                "status": "completed"
            }
        except Exception as exc:
            logger.exception("E4TaskAdapter failed: %s", exc)
            raise
        finally:
            db.close()


class E5TaskAdapter:
    @staticmethod
    def run(
        period_id: str,
        root_entity_id: str,
        section: str = "general",
        tone: str = "professional",
        reviewer_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Adapter for generate_narrative Celery task with Number Lock enforcement.
        Preserves return: {"period_id": ..., "entity_id": ..., "section": ..., "narrative": ..., "status": "generated"}
        """
        start_time = time.time()
        db = SessionLocal()
        try:
            # 1. Fetch approved and consolidated KPI values for the requested pillar
            rows = db.execute(
                text("""
                    SELECT m.code, m.label, de.value_numeric, de.unit
                    FROM data_entries de
                    JOIN metrics m ON m.id = de.metric_id
                    WHERE de.period_id = :period_id
                      AND de.status IN ('APPROVED', 'CONSOLIDATED')
                      AND m.pillar ILIKE :section
                      AND de.value_numeric IS NOT NULL
                    ORDER BY m.code
                    LIMIT 50
                """),
                {"period_id": period_id, "section": f"%{section}%"}
            ).fetchall()

            # 2. Map KPIs for Number Lock
            approved_kpis = {}
            for r in rows:
                code, val = r[0], float(r[2])
                approved_kpis[code] = val

            # Period code lookup
            p_row = db.execute(
                text("SELECT code FROM reporting_periods WHERE id = :id"),
                {"id": period_id}
            ).fetchone()
            period_code = p_row[0] if p_row else "Current Period"

            # 3. Draft narrative with enhanced E5 engine
            req = E5NarrativeRequest(
                section=section,
                approved_kpis=approved_kpis,
                period=period_code
            )
            res = e5_engine.draft(req)

            # 4. Strict Number Lock check
            if not res.number_lock_passed:
                logger.error(
                    f"E5 Number Lock VIOLATION: Unapproved numbers detected in draft: {res.unapproved_numbers}"
                )
                raise ValueError(
                    f"E5 Number Lock Failed: Generated narrative contains unapproved numbers {res.unapproved_numbers} "
                    f"not in supplied approved KPIs. Refusing to persist unverified data."
                )

            latency_ms = int((time.time() - start_time) * 1000)

            # 5. Record ai_runs audit entry
            _record_ai_run(
                db=db,
                engine="E5",
                model=getattr(settings, "AI_MODEL_TEXT", "gemini-3.8-flash"),
                input_ref=f"{root_entity_id}:{period_id}:{section}",
                output=res.model_dump(),
                latency_ms=latency_ms,
                status=AIRunStatus.PROPOSED.value,
                reviewer_id=reviewer_id
            )

            return {
                "period_id": period_id,
                "entity_id": root_entity_id,
                "section": section,
                "narrative": res.draft,
                "status": "generated"
            }
        except Exception as exc:
            logger.exception("E5TaskAdapter failed: %s", exc)
            raise
        finally:
            db.close()
