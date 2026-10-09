"""
app/modules/dashboards/schemas.py
Pydantic schemas for Executive ESG Dashboard, Principle Cards, and Data Quality Scores.
"""
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
