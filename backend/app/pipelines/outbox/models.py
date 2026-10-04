"""
app/pipelines/outbox/models.py
Transactional Outbox pattern — guarantees at-least-once delivery of
async events even if the worker crashes mid-processing.

Every state-changing API call that needs to trigger async work
(AI extraction, pipeline stage, report compilation) writes an OutboxMessage
in the SAME transaction as the business data write.
A poller/consumer picks it up and dispatches to Celery.
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime, Integer, Boolean
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, JSONB
from app.db.base import Base


class OutboxMessage(Base):
    """
    Persistent outbox record written transactionally alongside business data.

    Fields:
        event_type  - logical event name, e.g. 'evidence.uploaded'
        payload     - JSONB event body dispatched to Celery
        status      - PENDING → PROCESSING → DONE / FAILED
        attempts    - number of delivery attempts
        locked_by   - worker ID that is currently processing this message
        locked_at   - when the lock was acquired
        scheduled_at- earliest time this message may be processed
        processed_at- when successfully processed
        error       - last error message on failure
    """
    __tablename__ = "outbox_messages"

    id           = Column(PG_UUID(as_uuid=False), primary_key=True,
                          default=lambda: str(uuid.uuid4()))
    event_type   = Column(String(128), nullable=False, index=True)
    aggregate_id = Column(String(128), nullable=True, index=True)   # e.g. submission_id
    payload      = Column(JSONB, nullable=False, default=dict)
    status       = Column(String(32), nullable=False, default="PENDING", index=True)
    attempts     = Column(Integer, nullable=False, default=0)
    max_attempts = Column(Integer, nullable=False, default=5)
    locked_by    = Column(String(64), nullable=True)
    locked_at    = Column(DateTime(timezone=True), nullable=True)
    scheduled_at = Column(DateTime(timezone=True),
                          default=lambda: datetime.now(timezone.utc), nullable=False)
    processed_at = Column(DateTime(timezone=True), nullable=True)
    error        = Column(Text, nullable=True)
    created_at   = Column(DateTime(timezone=True),
                          default=lambda: datetime.now(timezone.utc), nullable=False)
