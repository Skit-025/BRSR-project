from sqlalchemy import Column, String, Float, Integer, JSON, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from app.db.base import Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin

class ConsolidatedValue(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    """
    F22-F23 Consolidated Values table:
    Stores rolled-up metrics for Business Units, Subsidiaries, and Group.
    Preserves consolidation method, effective share %, and full child contribution lineage.
    """
    __tablename__ = "consolidated_values"

    entity_id = Column(PG_UUID(as_uuid=False), ForeignKey("org_nodes.id"), nullable=False, index=True)
    period_id = Column(PG_UUID(as_uuid=False), ForeignKey("reporting_periods.id"), nullable=False, index=True)
    metric_code = Column(String(50), nullable=False, index=True)
    value = Column(Float, nullable=False)
    unit = Column(String(50), nullable=False)
    method = Column(String(50), nullable=False)  # sum, ratio, weighted_pct
    share_pct = Column(Float, default=100.0, nullable=False)  # Effective boundary % applied
    child_contributions = Column(JSON, nullable=False, default=list)  # Audit trail of contributing children
    version = Column(Integer, default=1, nullable=False)

    __table_args__ = (
        UniqueConstraint("entity_id", "period_id", "metric_code", name="uq_entity_period_metric_cons"),
    )
