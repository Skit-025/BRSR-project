"""
app/modules/assurance/models.py
SEBI BRSR Core Reasonable Assurance and Independent Audit engagement models.
"""
import enum
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, text
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from datetime import datetime, timezone
import uuid
from app.db.base import Base, TimestampMixin, SoftDeleteMixin


class AssuranceLevel(str, enum.Enum):
    LIMITED = "LIMITED"
    REASONABLE = "REASONABLE"


class EngagementStatus(str, enum.Enum):
    PLANNING = "PLANNING"
    FIELDWORK = "FIELDWORK"
    TESTING = "TESTING"
    REPORTING = "REPORTING"
    CONCLUDED = "CONCLUDED"


class AssuranceEngagement(Base, TimestampMixin, SoftDeleteMixin):
    """
    Assurance engagement record for external third-party verifiers.
    """
    __tablename__ = "assurance_engagements"

    id = Column(
        PG_UUID(as_uuid=False),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
        default=lambda: str(uuid.uuid4()),
        index=True,
    )
    period_id = Column(PG_UUID(as_uuid=False), ForeignKey("reporting_periods.id"), nullable=False, index=True)
    entity_id = Column(PG_UUID(as_uuid=False), ForeignKey("org_nodes.id"), nullable=False, index=True)
    assurance_firm_name = Column(String(255), nullable=False)
    lead_auditor_name = Column(String(255), nullable=False)
    level = Column(String(20), default=AssuranceLevel.REASONABLE.value, nullable=False)
    status = Column(String(50), default=EngagementStatus.PLANNING.value, nullable=False, index=True)
    scope_indicators = Column(JSONB, nullable=False, default=list)  # List of metric codes included


class AssuranceFinding(Base, TimestampMixin, SoftDeleteMixin):
    """
    Auditor observation, deficiency, or inquiry on a specific data point or process.
    """
    __tablename__ = "assurance_findings"

    id = Column(
        PG_UUID(as_uuid=False),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
        default=lambda: str(uuid.uuid4()),
        index=True,
    )
    engagement_id = Column(PG_UUID(as_uuid=False), ForeignKey("assurance_engagements.id"), nullable=False, index=True)
    data_point_id = Column(String(36), nullable=True, index=True)
    metric_code = Column(String(50), nullable=False, index=True)
    materiality = Column(String(20), default="MATERIAL", nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    auditor_recommendation = Column(Text, nullable=True)
    management_response = Column(Text, nullable=True)
    status = Column(String(50), default="OPEN", nullable=False, index=True)  # OPEN, RESPONDED, CLOSED
