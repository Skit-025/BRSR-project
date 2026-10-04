import enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from app.db.base import Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin

class ReportType(str, enum.Enum):
    BRSR_FULL = "BRSR_FULL"
    BRSR_CORE = "BRSR_CORE"

class Report(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    """
    F26-F29 Reports and Disclosures table:
    Stores generated SEBI-aligned reports with immutable snapshot hash seal.
    """
    __tablename__ = "reports"

    entity_id = Column(PG_UUID(as_uuid=False), ForeignKey("org_nodes.id"), nullable=False, index=True)
    period_id = Column(PG_UUID(as_uuid=False), ForeignKey("reporting_periods.id"), nullable=False, index=True)
    report_type = Column(String(50), default=ReportType.BRSR_FULL.value, nullable=False)
    snapshot_hash = Column(String(64), nullable=False, index=True)  # Seal for reasonable assurance
    generated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    generated_by = Column(String(255), default="system", nullable=False)
    content_json = Column(JSON, nullable=False, default=dict)
