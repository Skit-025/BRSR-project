"""
app/modules/snapshots/models.py
Immutable Reporting Snapshots and Restatement models.
"""
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, text
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from datetime import datetime, timezone
import uuid
from app.db.base import Base, TimestampMixin, SoftDeleteMixin


class ReportSnapshot(Base, TimestampMixin, SoftDeleteMixin):
    """
    Immutable sealed snapshot of all ESG data at a specific point in time (e.g. Year-End or Filing).
    Sealed with a SHA-256 cryptographic hash across all constituent metrics.
    """
    __tablename__ = "report_snapshots"

    id = Column(
        PG_UUID(as_uuid=False),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
        default=lambda: str(uuid.uuid4()),
        index=True,
    )
    period_id = Column(PG_UUID(as_uuid=False), ForeignKey("reporting_periods.id"), nullable=False, index=True)
    entity_id = Column(PG_UUID(as_uuid=False), ForeignKey("org_nodes.id"), nullable=False, index=True)
    snapshot_name = Column(String(255), nullable=False)
    version = Column(Integer, default=1, nullable=False)
    is_sealed = Column(Boolean, default=False, nullable=False)
    sealed_at = Column(DateTime(timezone=True), nullable=True)
    sealed_by = Column(String(64), nullable=True)
    
    # Cryptographic integrity signature
    sha256_hash = Column(String(64), nullable=False, index=True)
    
    # Frozen point-in-time state payload
    data_payload = Column(JSONB, nullable=False)
    metadata_json = Column(JSONB, nullable=True)


class SnapshotRestatement(Base, TimestampMixin):
    """
    Audit record of restatement applied to a previously sealed snapshot.
    Documents SEBI-mandated justification for retroactive adjustments.
    """
    __tablename__ = "snapshot_restatements"

    id = Column(
        PG_UUID(as_uuid=False),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
        default=lambda: str(uuid.uuid4()),
        index=True,
    )
    original_snapshot_id = Column(PG_UUID(as_uuid=False), ForeignKey("report_snapshots.id"), nullable=False, index=True)
    new_snapshot_id = Column(PG_UUID(as_uuid=False), ForeignKey("report_snapshots.id"), nullable=False, index=True)
    restatement_reason = Column(String(500), nullable=False)
    approved_by = Column(String(255), nullable=False)
    effective_date = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
