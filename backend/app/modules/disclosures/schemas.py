"""
app/modules/disclosures/schemas.py
Pydantic schemas for Type 3 Disclosures (BU, Subsidiary, Group) and Calculation Pipeline Jobs.
"""
from typing import Optional, Dict, Any, List
from datetime import datetime
from pydantic import BaseModel, Field


class OrgLevelDisclosureBase(BaseModel):
    org_node_id: str
    period_id: Optional[str] = None
    disclosure_level: str
    disclosure_section: str
    payload: Dict[str, Any] = Field(default_factory=dict)
    payload_version: str = "v1"
    notes: Optional[str] = None


class OrgLevelDisclosureSaveRequest(OrgLevelDisclosureBase):
    pass


class OrgLevelDisclosureRead(OrgLevelDisclosureBase):
    id: str
    status: str
    submitted_by_id: Optional[str] = None
    submitted_at: Optional[datetime] = None
    approved_by_id: Optional[str] = None
    approved_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CalculationJobRead(BaseModel):
    id: str
    trigger_event: str
    org_node_id: str
    period_id: Optional[str] = None
    initiated_by_id: Optional[str] = None
    pipeline_status: Dict[str, str] = Field(default_factory=dict)
    overall_status: str
    methodology_version: Optional[str] = "v1.0"
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    affected_reports: List[str] = Field(default_factory=list)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CalculationJobTriggerRequest(BaseModel):
    trigger_event: str = "manual"
    org_node_id: str
    period_id: Optional[str] = None
