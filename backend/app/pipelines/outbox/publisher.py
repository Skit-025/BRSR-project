"""
app/pipelines/outbox/publisher.py
Writes outbox messages transactionally inside an existing DB session.
Never commits — the caller's transaction commits both the business row
and the outbox row atomically.
"""
import logging
from datetime import datetime, timezone, timedelta
from typing import Any, Optional
from sqlalchemy.orm import Session
from app.pipelines.outbox.models import OutboxMessage

logger = logging.getLogger(__name__)


def publish(
    db: Session,
    event_type: str,
    payload: dict[str, Any],
    aggregate_id: Optional[str] = None,
    delay_seconds: int = 0,
) -> OutboxMessage:
    """
    Append an outbox message to be dispatched by the consumer.

    This function does NOT commit. The caller must commit after the
    business data write to ensure atomicity.

    Args:
        db:            Active SQLAlchemy session (open transaction).
        event_type:    Logical event name (e.g. 'evidence.uploaded').
        payload:       JSONB-serialisable dict passed to the Celery task.
        aggregate_id:  Optional ID of the primary business entity (for tracing).
        delay_seconds: Schedule dispatch at least this many seconds in the future.

    Returns:
        The newly created OutboxMessage ORM object (not yet committed).
    """
    scheduled_at = datetime.now(timezone.utc) + timedelta(seconds=delay_seconds)
    msg = OutboxMessage(
        event_type   = event_type,
        aggregate_id = aggregate_id,
        payload      = payload,
        status       = "PENDING",
        attempts     = 0,
        scheduled_at = scheduled_at,
    )
    db.add(msg)
    logger.debug("Outbox: queued event '%s' for aggregate '%s'", event_type, aggregate_id)
    return msg


# ── Convenience publishers ────────────────────────────────────────
def publish_ai_extraction(db: Session, evidence_id: str, file_path: str, mime_type: str) -> OutboxMessage:
    return publish(
        db, "evidence.ai_extract_requested",
        payload={"evidence_id": evidence_id, "file_path": file_path, "mime_type": mime_type},
        aggregate_id=evidence_id,
    )


def publish_validation_requested(db: Session, submission_id: str) -> OutboxMessage:
    return publish(
        db, "submission.validation_requested",
        payload={"submission_id": submission_id},
        aggregate_id=submission_id,
    )


def publish_consolidation_requested(db: Session, node_id: str, period_id: str) -> OutboxMessage:
    return publish(
        db, "consolidation.run_requested",
        payload={"node_id": node_id, "period_id": period_id},
        aggregate_id=node_id,
    )


def publish_report_compile_requested(db: Session, node_id: str, period_id: str) -> OutboxMessage:
    return publish(
        db, "report.compile_requested",
        payload={"node_id": node_id, "period_id": period_id},
        aggregate_id=node_id,
    )
