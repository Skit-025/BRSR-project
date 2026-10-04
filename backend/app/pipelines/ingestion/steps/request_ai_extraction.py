"""
app/pipelines/ingestion/steps/request_ai_extraction.py
P1 Stage 4: Enqueue AI OCR extraction for uploaded evidence files.
Writes an outbox message (transactional) — the Celery worker picks it up.
"""
import logging
from sqlalchemy.orm import Session
from app.pipelines.outbox.publisher import publish_ai_extraction
from app.modules.evidence.models import EvidenceFile

logger = logging.getLogger(__name__)

# MIME types that support AI extraction
AI_EXTRACTABLE_TYPES = {
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/tiff",
    "image/webp",
}


def request_ai_extraction(
    db: Session,
    evidence_files: list[EvidenceFile],
) -> int:
    """
    For each eligible evidence file, publish an outbox event to trigger
    AI OCR extraction. The outbox message is added to the session but
    NOT committed — the caller commits the whole transaction.

    Args:
        db:             Open DB session.
        evidence_files: List of EvidenceFile ORM objects just uploaded.

    Returns:
        Number of AI extraction jobs enqueued.
    """
    enqueued = 0
    for ev in evidence_files:
        if ev.content_type not in AI_EXTRACTABLE_TYPES:
            logger.debug(
                "Skipping AI extraction for %s (unsupported type: %s)",
                ev.filename, ev.content_type,
            )
            continue

        publish_ai_extraction(
            db          = db,
            evidence_id = ev.id,
            file_path   = ev.storage_path,
            mime_type   = ev.content_type,
        )
        enqueued += 1
        logger.info(
            "AI extraction queued: evidence_id=%s filename=%s",
            ev.id, ev.filename,
        )

    return enqueued
