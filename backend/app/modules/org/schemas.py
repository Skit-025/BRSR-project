from typing import Optional, List
from datetime import date
from pydantic import BaseModel, ConfigDict
from app.modules.org.models import NodeType, ControlType, ProjectType, PeriodType, PeriodStatus

class OrgNodeCreate(BaseModel):
    code: str
    name: str
    type: NodeType = NodeType.PROJECT
    parent_id: Optional[str] = None
    ownership_pct: float = 100.0
    control_type: ControlType = ControlType.OPERATIONAL_CONTROL
    boundary: bool = True
    project_type: ProjectType = ProjectType.CORPORATE
    location_state: Optional[str] = None
    location_country: str = "India"
    is_listed: bool = False
    is_water_stressed: bool = False
    is_pat_designated: bool = False
    has_land_acquisition: bool = False

class OrgNodeUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    ownership_pct: Optional[float] = None
    control_type: Optional[ControlType] = None
    boundary: Optional[bool] = None
    project_type: Optional[ProjectType] = None
    location_state: Optional[str] = None
    is_water_stressed: Optional[bool] = None
    is_pat_designated: Optional[bool] = None
    has_land_acquisition: Optional[bool] = None
    is_active: Optional[bool] = None
    admin_password: Optional[str] = None


class ReportingPeriodUpdate(BaseModel):
    status: Optional[PeriodStatus] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    admin_password: Optional[str] = None


class OrgNodeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    code: str
    name: str
    type: str
    parent_id: Optional[str] = None
    path: str
    ownership_pct: float
    control_type: str
    boundary: bool
    project_type: str
    location_state: Optional[str] = None
    location_country: str
    is_listed: bool
    is_water_stressed: bool
    is_pat_designated: bool
    has_land_acquisition: bool
    is_active: bool

class OrgNodeTreeRead(OrgNodeRead):
    children: List["OrgNodeTreeRead"] = []

class ReportingPeriodCreate(BaseModel):
    code: str
    financial_year: str
    period_type: PeriodType = PeriodType.MONTH
    month: Optional[int] = None
    quarter: Optional[int] = None
    start_date: date
    end_date: date
    status: PeriodStatus = PeriodStatus.OPEN

class ReportingPeriodRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    code: str
    financial_year: str
    period_type: str
    month: Optional[int] = None
    quarter: Optional[int] = None
    start_date: date
    end_date: date
    status: str

class MetricApplicabilityRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    org_node_id: str
    metric_code: str
    period_id: Optional[str] = None
    is_applicable: bool
    reason: str
    rule_id: str
    is_exception: bool
    exception_reason: Optional[str] = None
    approved_by: Optional[str] = None

class ApplicabilityOverrideRequest(BaseModel):
    node_id: Optional[str] = None
    metric_code: str
    is_applicable: bool
    reason: str
    approved_by: Optional[str] = None
