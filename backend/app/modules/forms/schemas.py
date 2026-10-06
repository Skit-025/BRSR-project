from typing import List, Optional, Any, Dict
from pydantic import BaseModel


class FormField(BaseModel):
    metric_code: str
    metric_name: str
    principle: str                          # P1 to P9
    pillar: str                             # Environment, Social, Governance
    data_type: str                          # numeric, text, boolean
    unit: str
    allowed_units: List[str] = []
    is_mandatory: bool = True
    read_only: bool = False
    current_value: Optional[Any] = None
    notes: Optional[str] = None
    formula_ref: Optional[str] = None
    indicator_disclosure_name: Optional[str] = None
    definition: Optional[str] = None
    # ── Entry Level Routing ───────────────────────────────────────────────────
    entry_level: str = "project"            # project | business_unit | subsidiary | group
    # ── UI Guidance Cards ─────────────────────────────────────────────────────
    guidance_text: Optional[str] = None     # Plain-language "what to enter"
    why_needed: Optional[str] = None        # Regulatory reason / audit justification
    document_hint: Optional[str] = None     # "Upload IOCL fuel challan or DG logbook"
    # ── Display Badges ────────────────────────────────────────────────────────
    scope_badge: Optional[str] = None       # "SCOPE 1", "SCOPE 2", "SCOPE 3", etc.
    is_brsr_core: bool = False              # SEBI BRSR Core mandatory indicator
    evidence_rule: str = "mandatory"        # mandatory | conditional | optional | none


class FormSection(BaseModel):
    principle: str
    principle_name: str
    pillar: str
    field_count: int
    fields: List[FormField]


class DigitalFormResponse(BaseModel):
    form_id: str
    form_type: str                          # "master" | "scoped"
    entity_id: Optional[str] = None
    entity_code: Optional[str] = None
    entity_name: Optional[str] = None
    entity_type: Optional[str] = None      # group | company | business_unit | project
    project_description: Optional[str] = None   # Shown in project context card
    project_type: Optional[str] = None     # road | solar | tunnel | etc.
    entity_state: Optional[str] = None     # State location for grid factor context
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
