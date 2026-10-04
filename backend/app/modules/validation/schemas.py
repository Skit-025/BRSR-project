from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from app.modules.validation.models import Severity

class ValidationResultRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    submission_id: str
    data_point_id: Optional[str] = None
    metric_code: str
    rule_id: str
    severity: str
    message: str
    justification: Optional[str] = None
    resolved: bool

class ValidationSummary(BaseModel):
    submission_id: str
    can_submit: bool
    error_count: int
    warning_count: int
    unjustified_warning_count: int
    results: List[ValidationResultRead] = []

class JustifyWarningRequest(BaseModel):
    validation_id: str
    justification: str
