from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field
from datetime import datetime
from uuid import UUID
from enum import Enum

# --- Enums ---

class AIRunStatus(str, Enum):
    PROPOSED = "proposed"
    ACCEPTED = "accepted"
    EDITED = "edited"
    REJECTED = "rejected"

class AIEngineType(str, Enum):
    E1_EXTRACT = "E1"
    E2_ANOMALY = "E2"
    E3_RAG = "E3"
    E4_POLICY = "E4"
    E5_NARRATIVE = "E5"
    E6_VALUECHAIN = "E6"
    E7_EXPLAINER = "E7"

class AnomalySeverity(str, Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"

class PolicyCheckStatus(str, Enum):
    PRESENT = "present"
    PARTIAL = "partial"
    ABSENT = "absent"


# --- E1: Evidence Extraction Schemas ---

class ExtractedField(BaseModel):
    metric: str = Field(..., description="Target BRSR metric code, e.g. ENV-ENERGY-001")
    value: Union[float, int, str] = Field(..., description="Extracted numerical or textual value")
    unit: str = Field(..., description="Detected unit e.g. kWh, kL, tonnes")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score between 0.0 and 1.0")
    page: int = Field(1, description="Source page in document (1-indexed)")
    bbox: Optional[List[float]] = Field(default=None, description="Optional bounding box [x1, y1, x2, y2]")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="E.g. billing_period, meter_id, tariff")

class E1ExtractRequest(BaseModel):
    evidence_id: str = Field(..., description="UUID or identifier of the uploaded evidence file")
    file_path: Optional[str] = Field(None, description="Direct file path or presigned URL if testing locally")
    file_bytes: Optional[bytes] = Field(None, description="Raw file bytes for in-memory OCR processing")
    filename: Optional[str] = Field(None, description="Original filename, used for extension-based type detection")
    mime_type: Optional[str] = Field(None, description="MIME type of the uploaded file")
    doc_type_hint: Optional[str] = Field(None, description="Hint: electricity_bill, fuel_receipt, waste_manifest, etc.")

class E1ExtractResponse(BaseModel):
    run_id: str
    doc_type: str
    fields: List[ExtractedField]
    is_relevant: bool = True
    rejection_reason: Optional[str] = None
    is_fallback: bool = False


# --- E2: Anomaly Engine Schemas ---

class AnomalyReason(BaseModel):
    feature: str
    message: str
    contribution: float = 0.0

class E2AnomalyRequest(BaseModel):
    metric_code: str
    current_value: float
    unit: str
    history: List[float] = Field(default_factory=list, description="Trailing 12 or 24 monthly values")
    peer_values: List[float] = Field(default_factory=list, description="Values from peer projects in same period")
    extra_context: Optional[Dict[str, Any]] = Field(default_factory=dict, description="e.g. man_hours, machine_hours")

class E2AnomalyResponse(BaseModel):
    run_id: str
    is_anomaly: bool
    score: float = Field(..., ge=0.0, le=1.0, description="Composite anomaly score 0-1")
    severity: Optional[AnomalySeverity] = None
    reasons: List[AnomalyReason] = Field(default_factory=list)
    suggested_correction: Optional[float] = None
    layer_scores: Optional[Dict[str, float]] = Field(default_factory=dict)
    is_fallback: bool = False


# --- E3: Guidance RAG Schemas ---

class Citation(BaseModel):
    doc: str = "BRSR Guidance Note"
    version: str = "BRSR-2023"
    section: str
    text: str
    score: Optional[float] = None

class E3ExplainFieldRequest(BaseModel):
    indicator_code: str = Field(..., description="BRSR Indicator Code, e.g. ENV-ENERGY-001 or Principle 6 Essential 1")
    question: str = Field(..., description="User question or query about reporting rules/units")

class E3ExplainFieldResponse(BaseModel):
    run_id: str = ""
    indicator_code: str = ""
    answer: str
    citations: List[Citation] = Field(default_factory=list)
    grounded: bool = True
    is_fallback: bool = False


# --- E4: Policy-Gap Analyzer Schemas ---

class PolicyCheckItem(BaseModel):
    element: str = Field(..., description="Key requirement, e.g. Whistleblower mechanism")
    status: PolicyCheckStatus
    quote: Optional[str] = Field(None, description="Verbatim quote from policy document")
    page: Optional[int] = None
    verified: bool = False

class E4PolicyCheckRequest(BaseModel):
    evidence_id: str
    policy_type: str = Field(..., description="e.g. Anti-Corruption, Human Rights, Environmental Policy")
    text_content: Optional[str] = None

class E4PolicyCheckResponse(BaseModel):
    run_id: str
    policy_type: str
    items: List[PolicyCheckItem]
    completeness_score: float
    is_fallback: bool = False


# --- E5: Narrative Copilot Schemas ---

class E5NarrativeRequest(BaseModel):
    section: str = Field(..., description="Section title or principle e.g. Section B Governance")
    approved_kpis: Dict[str, Any] = Field(..., description="Set of verified numbers that MUST match")
    bullets: List[str] = Field(default_factory=list, description="User draft bullet points")
    period: str = "FY 2025-26"

class E5NarrativeResponse(BaseModel):
    run_id: str
    draft: str
    numbers_found: List[str] = Field(default_factory=list)
    numbers_unapproved: List[str] = Field(default_factory=list)
    number_lock_passed: bool
    is_fallback: bool = False


# --- E6: Value-Chain Estimator Schemas ---

class E6ValueChainRequest(BaseModel):
    work_category: str = Field(..., description="e.g. Earthmoving, diesel subcontracting, cement transport")
    billed_quantity: float
    billed_unit: str = Field(..., description="e.g. INR Lakhs, Machine Hours, Litres")

class E6ValueChainResponse(BaseModel):
    run_id: str
    work_category: str
    proxy_factor: float
    proxy_factor_unit: str
    estimated_emissions_tco2e: float
    confidence: float
    is_fallback: bool = False
    # ── LLM validation layer ──────────────────────────────────────────────────
    llm_validated: bool = False
    llm_adjusted_tco2e: Optional[float] = None          # LLM override if formula seems off
    llm_reasoning: Optional[str] = None                 # Structured LLM explanation
    llm_confidence_note: Optional[str] = None           # LLM assessment of reliability
    llm_suggested_method: Optional[str] = None          # spend-based / activity-based / hybrid
    llm_brsr_reference: Optional[str] = None            # BRSR/GHG Protocol section cited
    llm_data_gaps: Optional[List[str]] = None           # Gaps LLM flags for improvement


# --- E7: Number Explainer Schemas ---

class DriverContribution(BaseModel):
    entity: str
    delta: float
    share: float

class E7ExplainNumberRequest(BaseModel):
    consolidated_value_id: str
    metric_code: str
    period: str
    question: str
    lineage_data: Dict[str, Any] = Field(default_factory=dict)

class E7ExplainNumberResponse(BaseModel):
    run_id: str
    summary: str
    drivers: List[DriverContribution] = Field(default_factory=list)
    lineage_url: Optional[str] = None
    is_fallback: bool = False


# --- Human Review Gate ---

class AIRunDecisionRequest(BaseModel):
    decision: AIRunStatus = Field(..., description="accepted, edited, or rejected")
    final_value: Optional[Any] = None
    remarks: Optional[str] = None

class AIRunDecisionResponse(BaseModel):
    run_id: str
    status: AIRunStatus
    message: str
