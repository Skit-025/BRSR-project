"""
app/modules/valuechain/schemas.py
Pydantic schemas for Value Chain partners, 75% boundary resolution, and assessments.
"""
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.modules.valuechain.models import PartnerType


class PartnerCreate(BaseModel):
    name: str
    identifier: str
    partner_type: PartnerType = PartnerType.UPSTREAM_SUPPLIER
    category: str
    annual_spend_inr_crores: float
    contact_email: Optional[str] = None


class PartnerRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    identifier: str
    partner_type: str
    category: str
    annual_spend_inr_crores: float
    spend_share_pct: float
    cumulative_spend_pct: float
    in_sebi_75_boundary: bool
    contact_email: Optional[str] = None


class AssessmentCreate(BaseModel):
    partner_id: str
    period_id: str
    esg_score: Optional[float] = None
    has_iso14001: bool = False
    has_code_of_conduct: bool = False
    scope3_reported_tco2e: Optional[float] = None
    assessment_responses: Optional[Dict[str, Any]] = None
    risk_level: str = "LOW"
