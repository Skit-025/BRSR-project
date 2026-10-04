from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any
from app.ai.schemas import (
    E1ExtractRequest, E1ExtractResponse,
    E2AnomalyRequest, E2AnomalyResponse,
    E3ExplainFieldRequest, E3ExplainFieldResponse,
    E4PolicyCheckRequest, E4PolicyCheckResponse,
    E5NarrativeRequest, E5NarrativeResponse,
    E6ValueChainRequest, E6ValueChainResponse,
    E7ExplainNumberRequest, E7ExplainNumberResponse,
    AIRunDecisionRequest, AIRunDecisionResponse,
    AIRunStatus
)
from app.ai.e1_extract.extractor import e1_engine
from app.ai.e2_anomaly.engine import e2_engine
from app.ai.e3_rag.engine import e3_engine
from app.ai.e4_policy.analyzer import e4_engine
from app.ai.e5_narrative.drafter import e5_engine
from app.ai.e6_valuechain.estimator import e6_engine
from app.ai.e7_explainer.explain import e7_engine

router = APIRouter(prefix="/ai", tags=["AI Engines"])

# -------------------------------------------------------------------
# E1: Evidence Intelligence (OCR + Field Extraction)
# -------------------------------------------------------------------
@router.post("/extract", response_model=E1ExtractResponse)
def extract_evidence(request: E1ExtractRequest):
    """
    Extracts structured BRSR fields from uploaded evidence (bills, receipts).
    Drafts are marked 'pending_verification' until human confirms.
    """
    return e1_engine.extract_from_file(request)

# -------------------------------------------------------------------
# E2: Anomaly and Plausibility Engine
# -------------------------------------------------------------------
@router.post("/anomaly-check", response_model=E2AnomalyResponse)
def check_anomaly(request: E2AnomalyRequest):
    """
    Evaluates metric inputs across L1 rules, L2 MAD z-scores, L3 peer IQR, and L4 Isolation Forest.
    """
    return e2_engine.evaluate(request)

# -------------------------------------------------------------------
# E3: Guidance RAG
# -------------------------------------------------------------------
@router.post("/explain-field", response_model=E3ExplainFieldResponse)
def explain_field(request: E3ExplainFieldRequest):
    """
    Provides grounded interpretations of BRSR indicators strictly citing official guidance.
    """
    return e3_engine.explain(request)

# -------------------------------------------------------------------
# E4: Policy-Gap Analyzer
# -------------------------------------------------------------------
@router.post("/check-policy", response_model=E4PolicyCheckResponse)
def check_policy(request: E4PolicyCheckRequest):
    """
    Checks policy documents against mandatory BRSR Section B clauses with verbatim quote validation.
    """
    return e4_engine.analyze(request)

# -------------------------------------------------------------------
# E5: Narrative Copilot
# -------------------------------------------------------------------
@router.post("/draft-narrative", response_model=E5NarrativeResponse)
def draft_narrative(request: E5NarrativeRequest):
    """
    Drafts qualitative sections with Number-Lock guardrail to prevent hallucinated values.
    """
    return e5_engine.draft(request)

# -------------------------------------------------------------------
# E6: Value-Chain Estimator
# -------------------------------------------------------------------
@router.post("/estimate-valuechain", response_model=E6ValueChainResponse)
def estimate_valuechain(request: E6ValueChainRequest):
    """
    Estimates Scope 3 emissions for subcontractor activities using standard activity proxies.
    """
    return e6_engine.estimate(request)

# -------------------------------------------------------------------
# E7: Number Explainer
# -------------------------------------------------------------------
@router.post("/explain-number", response_model=E7ExplainNumberResponse)
def explain_number(request: E7ExplainNumberRequest):
    """
    Explains roll-up changes and primary drivers without raw text-to-SQL.
    """
    return e7_engine.explain(request)

# -------------------------------------------------------------------
# Human Review Gate: Accept / Edit / Reject AI proposals
# -------------------------------------------------------------------
@router.post("/runs/{run_id}/decision", response_model=AIRunDecisionResponse)
def submit_ai_decision(run_id: str, request: AIRunDecisionRequest):
    """
    Audited human decision gate. Only confirmed proposals become official data points.
    """
    return AIRunDecisionResponse(
        run_id=run_id,
        status=request.decision,
        message=f"AI proposal {run_id} marked as {request.decision.value}."
    )
