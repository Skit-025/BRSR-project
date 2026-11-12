from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class SectionAData(BaseModel):
    corporate_name: str
    cin: str = "U45200TG2006PLC050277"
    year_of_incorporation: str = ""
    registered_office: str = ""
    corporate_address: str = ""
    email: str = ""
    telephone: str = ""
    website: str = ""
    stock_exchanges: str = ""
    paid_up_capital_inr: str = ""
    contact_person: str = ""
    reporting_boundary: str = "Consolidated (Subsidiaries, JVs, and Operating Sites)"
    financial_year: str
    total_employees: int
    operating_plants_and_sites_count: int
    turnover_inr: Optional[str] = None
    net_worth_inr: Optional[str] = None
    business_activities: List[Dict[str, Any]] = []
    products_services: List[Dict[str, Any]] = []
    locations: Dict[str, Any] = {}
    markets_served: Dict[str, Any] = {}
    employees_breakdown: Dict[str, Any] = {}
    differently_abled: Dict[str, Any] = {}
    women_representation: Dict[str, Any] = {}
    turnover_rate: Dict[str, Any] = {}
    holding_subsidiaries: List[Dict[str, Any]] = []
    csr_details: Dict[str, Any] = {}
    complaints: Dict[str, Any] = {}
    material_issues: List[Dict[str, Any]] = []

class SectionBData(BaseModel):
    policy_governance_score: str = "100% compliant with National Guidelines on Responsible Business Conduct (NGRBC)"
    board_oversight_committee: str = "MEIL ESG & Risk Management Committee"
    grievance_redressal_active: bool = True
    principles_matrix: Dict[str, Dict[str, Any]] = {}
    director_statement: str = ""
    highest_authority: str = ""
    sustainability_committee: str = ""
    review_details: Dict[str, Any] = {}
    independent_assessment: Dict[str, Any] = {}
    reasons_not_covered: Dict[str, Dict[str, Any]] = {}

class PrincipleIndicatorDisclosure(BaseModel):
    metric_code: str
    indicator_name: str
    principle: int
    brsr_core: bool
    disclosed_value: Optional[float] = None
    unit: str
    aggregation_method: str
    assurance_ready: bool
    evidence_verified: bool
    status: str = "CALCULATED"
    status_reason: Optional[str] = None

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
    total_scope_1_tco2e: float = 0.0
    total_scope_2_tco2e: float = 0.0
    total_scope_3_tco2e: float = 0.0
    total_ghg_emissions_tco2e: float = 0.0
    ghg_intensity_turnover: Optional[float] = None
    reporting_coverage: Optional[Dict[str, Any]] = None
    is_partially_reported: bool = False
