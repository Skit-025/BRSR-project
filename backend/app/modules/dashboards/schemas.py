"""
app/modules/dashboards/schemas.py
Pydantic schemas for Executive ESG Dashboard, Principle Cards, and Data Quality Scores.
"""
from __future__ import annotations
from typing import Optional, Dict, Any, List
from pydantic import BaseModel


class PrincipleSummary(BaseModel):
    principle: int
    title: str
    total_metrics: int
    reported_metrics: int
    completion_percentage: float
    data_quality_score: float


class SubmissionProgressSummary(BaseModel):
    total_entities: int
    total_submissions: int
    approved: int
    in_review: int
    draft: int
    rejected: int
    overall_progress_pct: float


class ExecutiveDashboardSummary(BaseModel):
    reporting_period: str
    submission_progress: SubmissionProgressSummary
    data_quality_score: float
    data_quality_grade: str                    # "A" (90+), "B" (75-89), "C" (60-74), "D" (<60)
    assurance_score: Optional[float] = None    # 0 to 100 percentage
    data_coverage_pct: Optional[float] = None  # 0 to 100 percentage
    completeness_pct: Optional[float] = None   # 0 to 100 percentage
    brsr_core_status: Optional[str] = None     # e.g. "SEBI Aligned" or "Submissions Pending"
    key_environmental_kpis: Dict[str, Any]     # energy_gj, renewable_pct, scope1_tco2e, scope2_tco2e, water_kl, waste_generated_mt
    key_social_kpis: Dict[str, Any]            # ltifr, fatalities, employee_count, female_pct
    principles: List[PrincipleSummary] = []
    operating_units: List[Dict[str, Any]] = [] # Child entities with individual progress percentages


# ── Production-Grade Database-Driven Group Overview Schemas ──

class OrgHierarchyProject(BaseModel):
    id: str
    name: str
    code: str
    type: str = "project"
    status: str
    submission_id: Optional[str] = None
    data_points_count: int = 0
    updated_at: Optional[str] = None


class OrgHierarchyBU(BaseModel):
    id: str
    name: str
    code: str
    type: str = "business_unit"
    status: str
    submission_id: Optional[str] = None
    total_projects: int = 0
    approved_projects: int = 0
    projects: List[OrgHierarchyProject] = []


class OrgHierarchySubsidiary(BaseModel):
    id: str
    name: str
    code: str
    type: str = "subsidiary"
    status: str
    total_bus: int = 0
    total_projects: int = 0
    completion_pct: float = 0.0
    business_units: List[OrgHierarchyBU] = []


class OrgHierarchyGroup(BaseModel):
    id: str
    name: str
    code: str
    type: str = "group"
    subsidiaries: List[OrgHierarchySubsidiary] = []


class GroupOverviewMetrics(BaseModel):
    total_subsidiaries: int
    total_bus: int
    total_projects: int
    total_reporting_entities: int
    approved_submissions: int
    pending_reviews: int
    returned_submissions: int
    draft_submissions: int
    reporting_coverage_pct: float
    brsr_readiness_pct: float
    period_id: str
    period_code: str
    financial_year: str
    live_timestamp: str


class PendingActionItem(BaseModel):
    id: str
    submission_id: str
    entity_id: str
    entity_name: str
    entity_type: str
    status: str
    stage: str
    comment: Optional[str] = None
    submitted_at: Optional[str] = None
    maker_name: Optional[str] = None


class SubsidiaryStatusRow(BaseModel):
    id: str
    name: str
    code: str
    bu_count: int
    project_count: int
    status: str
    status_label: str
    approved_count: int
    total_submissions: int
    completion_pct: float


class GroupOverviewResponse(BaseModel):
    metrics: GroupOverviewMetrics
    hierarchy: OrgHierarchyGroup
    subsidiaries_matrix: List[SubsidiaryStatusRow] = []
    pending_actions: List[PendingActionItem] = []
    role_context: Dict[str, Any] = {}
    design: Optional[GroupOverviewDesignResponse] = None



class HeaderInfo(BaseModel):
    group_id: str
    group_name: str
    group_code: str
    period_id: str
    period_code: str
    financial_year: str
    live_timestamp: str
    role: str
    user_name: str


class KpiCoverage(BaseModel):
    pct: float
    approved_entities: int
    total_entities: int
    trend: str


class KpiPending(BaseModel):
    count: int
    subtitle: str
    trend: str


class KpiSubsidiaries(BaseModel):
    count: int
    subtitle: str
    trend: str


class KpiAvgTime(BaseModel):
    hours: int
    subtitle: str
    trend: str


class KpiCards(BaseModel):
    reporting_coverage: KpiCoverage
    pending_approvals: KpiPending
    subsidiaries: KpiSubsidiaries
    avg_approval_time: KpiAvgTime
    brsr_readiness_pct: float
    role_specific: Dict[str, Any] = {}


class OrgNodeBU(BaseModel):
    id: str
    name: str
    code: str
    type: str = "business_unit"
    completion_pct: float
    pending_count: int
    approved_projects: int
    total_projects: int
    status: str  # "approved" | "in_progress" | "pending" | "rejected"


class OrgNodeSubsidiary(BaseModel):
    id: str
    name: str
    code: str
    type: str = "subsidiary"
    completion_pct: float
    pending_count: int
    approved_count: int
    total_projects: int
    status: str  # "approved" | "in_progress" | "pending" | "rejected"
    business_units: List[OrgNodeBU] = []


class OrgNodeRoot(BaseModel):
    id: str
    name: str
    code: str
    type: str = "group"
    completion_pct: float
    pending_count: int
    approved_count: int
    total_entities: int
    status: str


class OrgReportingFlow(BaseModel):
    root: OrgNodeRoot
    subsidiaries: List[OrgNodeSubsidiary] = []


class SubsidiaryPerformanceItem(BaseModel):
    id: str
    name: str
    code: str
    completion_pct: float
    status: str
    pending_count: int
    approved_count: int
    total_entities: int


class HeatmapCell(BaseModel):
    status: str  # "approved" | "in_progress" | "pending" | "rejected" | "not_submitted"
    completion_pct: float
    approved_count: int
    total_count: int


class HeatmapRow(BaseModel):
    subsidiary_id: str
    subsidiary_name: str
    cells: Dict[str, HeatmapCell]


class ReportingHeatmap(BaseModel):
    columns: List[str]
    rows: List[HeatmapRow]


class KeyAlertItem(BaseModel):
    id: str
    type: str  # "pending" | "critical" | "info" | "success"
    title: str
    subtitle: str
    entity_id: Optional[str] = None
    route: Optional[str] = None


class KeyInsightItem(BaseModel):
    type: str  # "success" | "warning" | "info"
    text: str


class KeyInsights(BaseModel):
    items: List[KeyInsightItem] = []
    recommendation_banner: Dict[str, Any] = {}


class CommandCenterResponse(BaseModel):
    executive_header: HeaderInfo
    kpi_cards: KpiCards
    org_reporting_flow: OrgReportingFlow
    subsidiary_performance: List[SubsidiaryPerformanceItem] = []
    reporting_heatmap: ReportingHeatmap
    key_alerts: List[KeyAlertItem] = []
    key_insights: KeyInsights


# ── Reference Design Models Matching UI Template ──

class KpiMetricCard(BaseModel):
    value: Any
    label: str
    subtext: Optional[str] = None
    trend: Optional[str] = None
    trend_direction: Optional[str] = "up"
    is_available: bool = True


class EmissionsScopeItem(BaseModel):
    label: str
    value: float
    percentage: float
    unit: str = "tCO₂e"
    color: str


class EmissionsDonut(BaseModel):
    total_tco2e: float
    unit: str = "tCO₂e"
    scope1: EmissionsScopeItem
    scope2: EmissionsScopeItem
    scope3: EmissionsScopeItem
    is_available: bool = True


class EmissionsTrendPoint(BaseModel):
    quarter: str
    period_code: str
    value: float
    display_value: str


class EmissionsOverview(BaseModel):
    donut: EmissionsDonut
    trend: List[EmissionsTrendPoint] = []
    has_trend: bool = False


class LevelCompletionGauge(BaseModel):
    level: str
    percentage: float
    completed_count: int
    total_count: int
    color: str


class HierarchyProjectNode(BaseModel):
    id: str
    name: str
    code: str
    status: str
    submission_id: Optional[str] = None


class HierarchyBUNode(BaseModel):
    id: str
    name: str
    code: str
    status: str
    percentage: float
    completed_count: int
    total_count: int
    projects: List[HierarchyProjectNode] = []


class HierarchySubsidiaryNode(BaseModel):
    id: str
    name: str
    code: str
    status: str
    percentage: float
    completed_count: int
    total_count: int
    business_units: List[HierarchyBUNode] = []


class HierarchyRootNode(BaseModel):
    id: str
    name: str
    code: str
    percentage: float
    completed_count: int
    total_count: int
    subsidiaries: List[HierarchySubsidiaryNode] = []


class SubsidiaryPerformanceMetric(BaseModel):
    id: str
    name: str
    code: str
    short_name: str
    completion_percentage: float
    emissions_tco2e: float
    emissions_badge: str


class PendingActionLevelSummary(BaseModel):
    level: str
    count: int
    label: str
    color_type: str
    route: str


class QuickInsightData(BaseModel):
    text: str
    status_tone: str = "info"


class GroupOverviewDesignResponse(BaseModel):
    reporting_period: str
    period_id: str
    group_name: str
    kpi_completion: KpiMetricCard
    kpi_emissions: KpiMetricCard
    kpi_bus: KpiMetricCard
    kpi_projects: KpiMetricCard
    kpi_pending: KpiMetricCard
    emissions_overview: EmissionsOverview
    completion_by_level: List[LevelCompletionGauge] = []
    hierarchy: HierarchyRootNode
    subsidiary_performance: List[SubsidiaryPerformanceMetric] = []
    pending_actions: List[PendingActionLevelSummary] = []
    quick_insight: QuickInsightData


GroupOverviewResponse.model_rebuild()


class Principle6BreadcrumbItem(BaseModel):
    id: str
    name: str
    code: str
    type: str


class Principle6ChildSummary(BaseModel):
    id: str
    name: str
    code: str
    type: str
    submission_status: str = "NOT_STARTED"
    energy_gj: float = 0.0
    ghg_s1_s2_tco2e: float = 0.0
    scope3_tco2e: float = 0.0
    water_kl: float = 0.0
    waste_mt: float = 0.0
    has_children: bool = False


class Principle6RawEntry(BaseModel):
    metric_code: str
    metric_name: str
    value_numeric: Optional[float] = None
    value_text: Optional[str] = None
    unit: str
    status: str = "ACTUAL"
    notes: Optional[str] = None
    evidence_count: int = 0


class Principle6RolldownResponse(BaseModel):
    entity: Principle6BreadcrumbItem
    period: Dict[str, Any]
    breadcrumbs: List[Principle6BreadcrumbItem] = []
    kpis: Dict[str, Any]
    children: List[Principle6ChildSummary] = []
    project_raw_entries: List[Principle6RawEntry] = []



