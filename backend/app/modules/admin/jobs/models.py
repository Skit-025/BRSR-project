"""
app/modules/admin/jobs/models.py
Background job execution tracking models for asynchronous pipelines and worker tasks.
"""
from sqlalchemy import Column, String, Integer, DateTime, text
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from datetime import datetime, timezone
import uuid
from app.db.base import Base, TimestampMixin


class BackgroundJob(Base, TimestampMixin):
    """
    Execution trace for long-running pipeline runs and Celery tasks.
    """
    __tablename__ = "background_jobs"

    id = Column(
        PG_UUID(as_uuid=False),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
        default=lambda: str(uuid.uuid4()),
        index=True,
    )
    job_type = Column(String(100), nullable=False, index=True) # "AGGREGATION_ROLLUP", "AI_OCR_EXTRACTION", "PDF_REPORT"
    celery_task_id = Column(String(100), nullable=True, index=True)
    status = Column(String(50), default="PENDING", nullable=False, index=True) # PENDING, RUNNING, COMPLETED, FAILED
    
    payload = Column(JSONB, nullable=True)
    result = Column(JSONB, nullable=True)
    error_message = Column(String(500), nullable=True)
    
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    triggered_by = Column(String(64), nullable=True)
