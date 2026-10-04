"""
app/pipelines/aggregation/models.py
Pipeline aggregation run tracking model.
"""
from sqlalchemy import Column, String, Integer, DateTime, text
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from datetime import datetime, timezone
import uuid
from app.db.base import Base, TimestampMixin


class AggregationRun(Base, TimestampMixin):
    """
    Execution trace for multi-tier boundary rollup runs.
    """
    __tablename__ = "aggregation_runs"

    id = Column(
        PG_UUID(as_uuid=False),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
        default=lambda: str(uuid.uuid4()),
        index=True,
    )
    period_id = Column(String(36), nullable=False, index=True)
    root_entity_id = Column(String(36), nullable=False, index=True)
    status = Column(String(50), default="COMPLETED", nullable=False)
    metrics_processed = Column(Integer, default=0, nullable=False)
    entities_included = Column(Integer, default=0, nullable=False)
    summary = Column(JSONB, nullable=True)
