"""
app/ai/router.py
FastAPI router for all 7 AI engines (E1-E7) and the Aarohan AI-run governance endpoints.
All engine endpoints require authentication; review endpoints require ai:review permission.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.security.deps import get_current_user, require_permission
from app.security.rbac import Permission

from app.ai.schemas import (
    E1ExtractRequest, E1ExtractResponse,
    E2AnomalyRequest, E2AnomalyResponse,
    E3ExplainFieldRequest, E3ExplainFieldResponse,
    E4PolicyCheckRequest, E4PolicyCheckResponse,
    E5NarrativeRequest, E5NarrativeResponse,
    E6ValueChainRequest, E6ValueChainResponse,
    E7ExplainNumberRequest, E7ExplainNumberResponse,
    AIRunDecisionRequest, AIRunDecisionResponse,
    AIRunStatus,
)
from app.ai.e1_extract.extractor import e1_engine
from app.ai.e2_anomaly.engine import e2_engine
from app.ai.e3_rag.engine import e3_engine
from app.ai.e4_policy.analyzer import e4_engine
from app.ai.e5_narrative.drafter import e5_engine
from app.ai.e6_valuechain.estimator import e6_engine
from app.ai.e7_explainer.explain import e7_engine
from app.ai.governance.ai_runs_service import (
    get_run,
    list_pending_runs,
    list_runs_for_engine,
    record_decision,
)
from app.ai.models import AIRun

router = APIRouter(prefix="/ai", tags=["AI Engines"])

_authenticated = Depends(get_current_user)
_reviewer = Depends(require_permission(Permission.AI_REVIEW))


@router.post("/extract", response_model=E1ExtractResponse)
def extract_evidence(request: E1ExtractRequest, _user=_authenticated):
    """Extract structured BRSR fields from uploaded evidence."""
    return e1_engine.extract_from_file(request)


@router.post("/anomaly-check", response_model=E2AnomalyResponse)
def check_anomaly(request: E2AnomalyRequest, _user=_authenticated):
    """Evaluate metric inputs across 4-layer anomaly pipeline."""
    return e2_engine.evaluate(request)


@router.post("/explain-field", response_model=E3ExplainFieldResponse)
def explain_field(request: E3ExplainFieldRequest, _user=_authenticated):
    """Provide grounded BRSR guidance using RAG."""
    return e3_engine.explain(request)


@router.post("/check-policy", response_model=E4PolicyCheckResponse)
def check_policy(request: E4PolicyCheckRequest, _user=_authenticated):
    """Check policy documents against mandatory BRSR Section B clauses."""
    return e4_engine.analyze(request)


@router.post("/draft-narrative", response_model=E5NarrativeResponse)
def draft_narrative(request: E5NarrativeRequest, _user=_authenticated):
    """Draft qualitative BRSR sections with Number-Lock guardrail."""
    return e5_engine.draft(request)


@router.post("/estimate-valuechain", response_model=E6ValueChainResponse)
def estimate_valuechain(request: E6ValueChainRequest, _user=_authenticated):
    """Estimate Scope 3 emissions for value-chain activities."""
    return e6_engine.estimate(request)


@router.post("/explain-number", response_model=E7ExplainNumberResponse)
def explain_number(request: E7ExplainNumberRequest, _user=_authenticated):
    """Explain consolidated KPI roll-up changes and primary drivers."""
    return e7_engine.explain(request)


# -------------------------------------------------------------------
# Aarohan AI Governance (ai:review permission)
# -------------------------------------------------------------------

@router.get("/runs", summary="List AI run proposals")
def list_ai_runs(
    engine: Optional[str] = Query(None, description="Filter by engine: E1..E7"),
    status_filter: Optional[str] = Query(None, alias="status"),
    limit: int = Query(50, ge=1, le=200),
    _user=_reviewer,
    db: Session = Depends(get_db),
):
    """Returns AI-proposed outputs. Requires ai:review permission."""
    if engine:
        runs = list_runs_for_engine(engine.upper(), db, limit=limit)
    else:
        runs = list_pending_runs(db, limit=limit)
    if status_filter:
        runs = [r for r in runs if r.status == status_filter]
    return [r.to_dict() for r in runs]


@router.get("/runs/{run_id}", summary="Get single AI run")
def get_ai_run(run_id: str, _user=_reviewer, db: Session = Depends(get_db)):
    """Fetch a single ai_run record by UUID."""
    run = get_run(run_id, db)
    if not run:
        raise HTTPException(status_code=404, detail=f"AI run {run_id!r} not found.")
    return run.to_dict()


@router.post("/runs/{run_id}/decision", response_model=AIRunDecisionResponse)
def submit_ai_decision(
    run_id: str,
    request: AIRunDecisionRequest,
    user=_reviewer,
    db: Session = Depends(get_db),
):
    """
    Aarohan human review gate.
    Accept / edit / reject an AI proposal. Requires ai:review permission.
    """
    try:
        return record_decision(
            run_id=run_id,
            decision=request,
            reviewer_id=user.user_id,
            db=db,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
