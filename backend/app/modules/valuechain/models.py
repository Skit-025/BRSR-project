"""
app/modules/valuechain/models.py
SEBI BRSR Core Value Chain Partner and Assessment models (Top 75% spend/revenue rule).
"""
import enum
from sqlalchemy import Column, String, Float, Boolean, Integer, DateTime, ForeignKey, text
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from datetime import datetime, timezone
import uuid
from app.db.base import Base, TimestampMixin, SoftDeleteMixin


class PartnerType(str, enum.Enum):
    UPSTREAM_SUPPLIER = "UPSTREAM_SUPPLIER"
    DOWNSTREAM_CUSTOMER = "DOWNSTREAM_CUSTOMER"


class ValueChainPartner(Base, TimestampMixin, SoftDeleteMixin):
    """
    Tier-1 supplier or downstream customer included in the SEBI 75% spend boundary.
    """
    __tablename__ = "value_chain_partners"

    id = Column(
        PG_UUID(as_uuid=False),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
        default=lambda: str(uuid.uuid4()),
        index=True,
    )
    name = Column(String(255), nullable=False)
    identifier = Column(String(100), unique=True, index=True, nullable=False) # GSTIN / PAN / Registration
    partner_type = Column(String(50), default=PartnerType.UPSTREAM_SUPPLIER.value, nullable=False, index=True)
    category = Column(String(100), nullable=False)                             # Raw Materials, Logistics, Services
    annual_spend_inr_crores = Column(Float, default=0.0, nullable=False)
    spend_share_pct = Column(Float, default=0.0, nullable=False)               # % of total procurement
    cumulative_spend_pct = Column(Float, default=0.0, nullable=False)          # Cumulative Pareto threshold
    in_sebi_75_boundary = Column(Boolean, default=True, nullable=False, index=True)
    contact_email = Column(String(255), nullable=True)


class ValueChainAssessment(Base, TimestampMixin, SoftDeleteMixin):
    """
    Periodic ESG assessment and questionnaire response for a value chain partner.
    """
    __tablename__ = "value_chain_assessments"

    id = Column(
        PG_UUID(as_uuid=False),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
        default=lambda: str(uuid.uuid4()),
        index=True,
    )
    partner_id = Column(PG_UUID(as_uuid=False), ForeignKey("value_chain_partners.id"), nullable=False, index=True)
    period_id = Column(PG_UUID(as_uuid=False), ForeignKey("reporting_periods.id"), nullable=False, index=True)
    
    esg_score = Column(Float, nullable=True)                                   # 0 to 100
    has_iso14001 = Column(Boolean, default=False, nullable=False)
    has_code_of_conduct = Column(Boolean, default=False, nullable=False)
    scope3_reported_tco2e = Column(Float, nullable=True)
    assessment_responses = Column(JSONB, nullable=True)
    risk_level = Column(String(50), default="LOW", nullable=False)             # LOW, MEDIUM, HIGH, CRITICAL
