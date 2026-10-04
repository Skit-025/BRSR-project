from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict
from app.modules.metrics.models import AggregationType, IndicatorType, EvidenceRule, MetricCategory

class MetricCreate(BaseModel):
    code: str
    name: str
    definition: str
    category: MetricCategory = MetricCategory.ENVIRONMENT
    section: str = "Section C"
    principle: int = 6
    indicator_type: IndicatorType = IndicatorType.ESSENTIAL
    brsr_core: bool = False
    core_attribute: Optional[str] = None
    data_type: str = "numeric"
    base_unit: str
    allowed_units: List[str] = []
    aggregation_type: AggregationType = AggregationType.SUM
    numerator_metric_id: Optional[str] = None
    denominator_metric_id: Optional[str] = None
    evidence_rule: EvidenceRule = EvidenceRule.MANDATORY
    frequency: str = "monthly"
    owner_role: str = "maker"
    calc_formula_code: Optional[str] = None

class MetricRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    code: str
    name: str
    definition: str
    category: str
    section: str
    principle: int
    indicator_type: str
    brsr_core: bool
    core_attribute: Optional[str] = None
    data_type: str
    base_unit: str
    allowed_units: List[str]
    aggregation_type: str
    evidence_rule: str
    frequency: str
    owner_role: str

class FormFieldSchema(BaseModel):
    metric_code: str
    name: str
    definition: str
    category: str
    section: str
    principle: int
    indicator_type: str
    brsr_core: bool
    data_type: str
    base_unit: str
    allowed_units: List[str]
    evidence_rule: str
    is_applicable: bool
    applicability_reason: str
    current_value: Optional[float] = None
    current_unit: Optional[str] = None
    current_status: str = "NOT_AVAILABLE"

class DynamicFormSection(BaseModel):
    title: str
    principle: Optional[int] = None
    fields: List[FormFieldSchema] = []

class DynamicFormResponse(BaseModel):
    entity_id: str
    period_id: str
    submission_id: Optional[str] = None
    submission_status: str = "DRAFT"
    sections: List[DynamicFormSection] = []
