"""
app/pipelines/ingestion/pipeline.py
P1 Ingestion Pipeline — orchestrates all four ingestion stages:
  1. receive_and_authorize
  2. store_evidence        (optional — only if files provided)
  3. persist_draft
  4. request_ai_extraction (optional — only for PDF/image evidence)

All steps run inside a single transaction.
"""
import logging
from typing import Optional
from sqlalchemy.orm import Session

from app.pipelines.ingestion.steps.receive_and_authorize import receive_and_authorize
from app.pipelines.ingestion.steps.store_evidence import store_evidence
from app.pipelines.ingestion.steps.persist_draft import persist_draft
from app.pipelines.ingestion.steps.request_ai_extraction import request_ai_extraction
from app.modules.collection.models import Submission

logger = logging.getLogger(__name__)


def run_ingestion_pipeline(
    db: Session,
    entity_id: str,
    period_id: str,
    user_id: str,
    user_role: str,
    data_points: list[dict],
    uploaded_files: Optional[list] = None,   # list of (filename, file_obj, content_type) tuples
    mutation_id: Optional[str] = None,
) -> Submission:
    """
    Full P1 ingestion pipeline. Returns the created Submission.

    Args:
        uploaded_files: Optional list of file tuples:
                        [(filename, file_obj, content_type), ...]
    """
    # Stage 1 — Authorise
    entity, period = receive_and_authorize(
        db, entity_id, period_id, user_id, user_role,
        metric_codes=[dp["metric_code"] for dp in data_points],
    )

    # Stage 2 — Persist draft submission
    submission = persist_draft(
        db          = db,
        entity_id   = entity_id,
        period_id   = period_id,
        maker_id    = user_id,
        data_points = data_points,
        mutation_id = mutation_id,
    )

    # Stage 3 — Store evidence files (if any)
    evidence_files = []
    if uploaded_files:
        for filename, file_obj, content_type in uploaded_files:
            ev = store_evidence(
                db            = db,
                submission_id = submission.id,
                entity_id     = entity_id,
                period_id     = period_id,
                metric_codes  = [dp["metric_code"] for dp in data_points],
                filename      = filename,
                file_obj      = file_obj,
                content_type  = content_type,
                uploaded_by   = user_id,
            )
            evidence_files.append(ev)

    # Stage 4 — Queue AI extraction (writes outbox rows, no extra commit needed)
    if evidence_files:
        n_queued = request_ai_extraction(db, evidence_files)
        logger.info("Ingestion pipeline complete: submission=%s, ai_jobs=%d", submission.id, n_queued)
    else:
        logger.info("Ingestion pipeline complete: submission=%s (no evidence)", submission.id)

    return submission
