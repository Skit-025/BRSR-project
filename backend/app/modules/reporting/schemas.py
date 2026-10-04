from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class SectionAData(BaseModel):
    corporate_name: str
    cin: str = "U45200TG2006PLC050277"
    reporting_boundary: str = "Consolidated (Subsidiaries, JVs, and Operating Sites)"
    financial_year: str
    total_employees: int
    operating_plants_and_sites_count: int

class SectionBData(BaseModel):
    policy_governance_score: str = "100% compliant with National Guidelines on Responsible Business Conduct (NGRBC)"
    board_oversight_committee: str = "MEIL ESG & Risk Management Committee"
    grievance_redressal_active: bool = True

class PrincipleIndicatorDisclosure(BaseModel):
    metric_code: str
    indicator_name: str
    principle: int
    brsr_core: bool
    disclosed_value: float
    unit: str
    aggregation_method: str
    assurance_ready: bool
    evidence_verified: bool

class BRSRFullReportResponse(BaseModel):
    report_id: str
    report_type: str
    entity_code: str
    entity_name: str
    financial_year: str
    period_code: str
    snapshot_hash: str
    generated_at: datetime
    section_a: SectionAData
    section_b: SectionBData
    section_c: List[PrincipleIndicatorDisclosure] = []
