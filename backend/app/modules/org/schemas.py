from typing import Optional, List
from datetime import date, datetime
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
    financial_year: Optional[str] = None
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
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    project_admin_name: Optional[str] = None
    project_admin_email: Optional[str] = None

class OrgNodeTreeRead(OrgNodeRead):
    children: List["OrgNodeTreeRead"] = []

class ReportingPeriodCreate(BaseModel):
    code: Optional[str] = None   # auto-generated when create_monthly_periods=True
    financial_year: str
    period_type: PeriodType = PeriodType.MONTH
    month: Optional[int] = None
    quarter: Optional[int] = None
    start_date: Optional[date] = None   # ignored when create_monthly_periods=True
    end_date: Optional[date] = None     # ignored when create_monthly_periods=True
    status: PeriodStatus = PeriodStatus.OPEN
    create_monthly_periods: Optional[bool] = False

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
    metric_code: str
    is_applicable: bool
    reason: str
    approved_by: str
