"""
app/modules/assurance/schemas.py
Pydantic schemas for assurance engagements, auditor findings, and sampling.
"""
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.modules.assurance.models import AssuranceLevel, EngagementStatus


class EngagementCreate(BaseModel):
    period_id: str
    entity_id: str
    assurance_firm_name: str
    lead_auditor_name: str
    level: AssuranceLevel = AssuranceLevel.REASONABLE
    scope_indicators: List[str] = []


class EngagementRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    period_id: str
    entity_id: str
    assurance_firm_name: str
    lead_auditor_name: str
    level: str
    status: str
    scope_indicators: List[str]
    created_at: datetime


class FindingCreate(BaseModel):
    engagement_id: str
    data_point_id: Optional[str] = None
    metric_code: str
    materiality: str = "MATERIAL"
    title: str
    description: str
    auditor_recommendation: Optional[str] = None


class FindingResponse(BaseModel):
    management_response: str


class SamplingRequest(BaseModel):
    engagement_id: str
    metric_code: str
    sample_percentage: float = 15.0       # e.g. 15% sample size
    stratify_by_value: bool = True
