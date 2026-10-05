from typing import List, Optional, Any, Dict
from pydantic import BaseModel


class FormField(BaseModel):
    metric_code: str
    metric_name: str
    principle: str           # P1 to P9
    pillar: str              # Environment, Social, Governance
    data_type: str           # numeric, text, boolean
    unit: str
    allowed_units: List[str] = []
    is_mandatory: bool = True
    read_only: bool = False
    current_value: Optional[Any] = None
    notes: Optional[str] = None
    formula_ref: Optional[str] = None


class FormSection(BaseModel):
    principle: str
    principle_name: str
    pillar: str
    field_count: int
    fields: List[FormField]


class DigitalFormResponse(BaseModel):
    form_id: str
    form_type: str                    # "master" | "scoped"
    entity_id: Optional[str] = None
    entity_code: Optional[str] = None
    entity_name: Optional[str] = None
    role: str
    period_id: str
    period_code: str
    submission_id: Optional[str] = None
    submission_status: Optional[str] = "DRAFT"
    is_editable: bool
    can_submit: bool
    can_approve: bool
    can_audit: bool
    can_upload_spreadsheet: bool
    total_metrics: int
    sections: List[FormSection]
    dimensions_summary: Optional[Dict[str, Any]] = None
