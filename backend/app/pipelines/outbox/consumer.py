"""
app/pipelines/outbox/consumer.py
Polls the outbox table and dispatches pending messages to Celery.
Runs as a periodic Celery Beat task (every 5 seconds).

Uses SELECT FOR UPDATE SKIP LOCKED for safe concurrent polling
without message duplication across multiple worker pods.
"""
import logging
import socket
from datetime import datetime, timezone, timedelta
from typing import Optional

from sqlalchemy.orm import Session
from sqlalchemy import select, update

from app.pipelines.outbox.models import OutboxMessage

logger = logging.getLogger(__name__)
WORKER_ID = socket.gethostname()
LOCK_TIMEOUT_MINUTES = 5


def _release_stale_locks(db: Session) -> None:
    """Release locks held by workers that have been processing > LOCK_TIMEOUT_MINUTES."""
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=LOCK_TIMEOUT_MINUTES)
    db.query(OutboxMessage).filter(
        OutboxMessage.status == "PROCESSING",
        OutboxMessage.locked_at < cutoff,
    ).update(
        {"status": "PENDING", "locked_by": None, "locked_at": None},
        synchronize_session=False,
    )
    db.commit()


def poll_and_dispatch(db: Session, batch_size: int = 50) -> int:
    """
    Claim and dispatch a batch of PENDING outbox messages.

    1. Release any stale locks.
    2. SELECT FOR UPDATE SKIP LOCKED — claim `batch_size` messages.
    3. Mark each as PROCESSING, dispatch to Celery, mark DONE or FAILED.

    Returns:
        Number of messages dispatched in this batch.
    """
    _release_stale_locks(db)

    now = datetime.now(timezone.utc)

    # Claim batch with pessimistic lock
    messages = (
        db.query(OutboxMessage)
        .filter(
            OutboxMessage.status == "PENDING",
            OutboxMessage.scheduled_at <= now,
        )
        .order_by(OutboxMessage.created_at)
        .limit(batch_size)
        .with_for_update(skip_locked=True)
        .all()
    )

    if not messages:
        return 0

    dispatched = 0
    for msg in messages:
        # Mark as processing
        msg.status    = "PROCESSING"
        msg.locked_by = WORKER_ID
        msg.locked_at = now
        msg.attempts += 1
        db.flush()

        try:
            _dispatch(msg)
            msg.status       = "DONE"
            msg.processed_at = datetime.now(timezone.utc)
            dispatched += 1
        except Exception as exc:
            logger.error("Outbox dispatch failed for %s [%s]: %s", msg.event_type, msg.id, exc)
            msg.error  = str(exc)[:1024]
            if msg.attempts >= msg.max_attempts:
                msg.status = "FAILED"
                logger.error("Outbox message %s permanently failed after %d attempts.", msg.id, msg.attempts)
            else:
                msg.status    = "PENDING"
                msg.locked_by = None
                msg.locked_at = None
                # Exponential backoff: 30s * 2^(attempts-1)
                backoff = 30 * (2 ** (msg.attempts - 1))
                msg.scheduled_at = datetime.now(timezone.utc) + timedelta(seconds=backoff)

    db.commit()
    return dispatched


def _dispatch(msg: OutboxMessage) -> None:
    """Route an outbox message to the appropriate Celery task."""
    # Import tasks lazily to avoid circular imports
    from app.workers import tasks_ai, tasks_pipelines, tasks_reports

    event   = msg.event_type
    payload = msg.payload or {}

    if event == "evidence.ai_extract_requested":
        tasks_ai.run_ai_extraction.delay(**payload)

    elif event == "submission.validation_requested":
        tasks_pipelines.run_validation.delay(**payload)

    elif event == "consolidation.run_requested":
        tasks_pipelines.run_consolidation.delay(**payload)

    elif event == "report.compile_requested":
        tasks_reports.compile_report.delay(**payload)

    else:
        logger.warning("Outbox: unknown event_type '%s' — skipping.", event)
