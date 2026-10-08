from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.ai.schemas import (
    E1ExtractRequest,
    E2AnomalyRequest,
    E3ExplainFieldRequest,
    E4PolicyCheckRequest,
    E5NarrativeRequest,
    E6ValueChainRequest,
    E7ExplainNumberRequest,
    AIRunDecisionRequest,
    AIRunDecisionResponse,
)
from app.ai.e1_extract.extractor import e1_engine
from app.ai.e2_anomaly.engine import e2_engine
from app.ai.e3_rag.engine import e3_engine
from app.ai.e4_policy.analyzer import e4_engine
from app.ai.e5_narrative.drafter import e5_engine
from app.ai.e6_valuechain.estimator import e6_engine
from app.ai.e7_explainer.explain import e7_engine
from app.ai.governance.ai_runs_service import get_run, list_runs_for_engine, record_decision
from app.ai.models import AIRun
from app.modules.auth.models import User
from app.modules.auth.router import get_current_active_user
from app.security.rbac import Permission, has_permission

router = APIRouter(prefix="/aarohan", tags=["Ask AAROHAN AI"])

ENGINE_TO_PERMISSION = {
    "E1": Permission.AI_E1_USE,
    "E2": Permission.AI_E2_USE,
    "E3": Permission.AI_E3_USE,
    "E4": Permission.AI_E4_USE,
    "E5": Permission.AI_E5_USE,
    "E6": Permission.AI_E6_USE,
    "E7": Permission.AI_E7_USE,
}

ENGINE_REGISTRY = {
    "E1": {"label": "Evidence Extraction", "description": "Extract structured evidence fields", "input": "evidence"},
    "E2": {"label": "Anomaly Detection", "description": "Check metric plausibility and outliers", "input": "metrics"},
    "E3": {"label": "BRSR Guidance", "description": "Grounded policy and indicator guidance", "input": "question"},
    "E4": {"label": "Policy Checker", "description": "Match policy evidence against checklist", "input": "policy"},
    "E5": {"label": "Narrative Draft", "description": "Draft narrative with number lock", "input": "narrative"},
    "E6": {"label": "Value Chain Estimator", "description": "Estimate Scope 3 emissions", "input": "valuechain"},
    "E7": {"label": "Number Explainer", "description": "Explain metric drivers and lineage", "input": "lineage"},
}


def get_aarohan_engine_catalog(role: str) -> List[Dict[str, Any]]:
    engines: List[Dict[str, Any]] = []
    for engine, meta in ENGINE_REGISTRY.items():
        if has_permission(role, ENGINE_TO_PERMISSION[engine]):
            engines.append({"engine": engine, "label": meta["label"], "description": meta["description"], "input": meta["input"]})
    return engines


def require_ai_engine_access(engine: str, user: User) -> None:
    permission = ENGINE_TO_PERMISSION.get(engine)
    if permission is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unknown engine.")
    if not has_permission(user.role, permission):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Engine permission denied.")


import logging

logger = logging.getLogger("app.ai.aarohan")


def _run_engine(engine: str, payload: Dict[str, Any], db: Session):
    if engine == "E1":
        # Normalize doc_type alias
        if "doc_type" in payload and not payload.get("doc_type_hint"):
            payload["doc_type_hint"] = payload["doc_type"]
        # Filter extra fields not in E1ExtractRequest
        req = E1ExtractRequest(
            evidence_id=str(payload.get("evidence_id") or ""),
            file_path=payload.get("file_path"),
            file_bytes=payload.get("file_bytes"),
            filename=payload.get("filename"),
            mime_type=payload.get("mime_type"),
            doc_type_hint=payload.get("doc_type_hint"),
        )
        return e1_engine.extract_from_file(req, db_session=db)
    if engine == "E2":
        return e2_engine.evaluate(E2AnomalyRequest(**payload), db_session=db)
    if engine == "E3":
        return e3_engine.explain(E3ExplainFieldRequest(**payload), db_session=db)
    if engine == "E4":
        return e4_engine.analyze(E4PolicyCheckRequest(**payload), db_session=db)
    if engine == "E5":
        return e5_engine.draft(E5NarrativeRequest(**payload), db_session=db)
    if engine == "E6":
        return e6_engine.estimate(E6ValueChainRequest(**payload), db_session=db)
    if engine == "E7":
        return e7_engine.explain(E7ExplainNumberRequest(**payload), db_session=db)
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unknown engine.")


@router.get("/engines")
def list_aarohan_engines(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    return get_aarohan_engine_catalog(current_user.role)


@router.post("/run/{engine}")
def run_aarohan_engine(engine: str, payload: Dict[str, Any], current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    engine_name = engine.upper()
    require_ai_engine_access(engine_name, current_user)
    try:
        return _run_engine(engine_name, payload, db)
    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("AI engine '%s' execution failed: %s", engine_name, exc)
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"AI engine {engine_name} processing failed: {exc}") from exc


@router.get("/runs")
def list_aarohan_runs(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    runs = db.query(AIRun).order_by(AIRun.created_at.desc()).limit(50).all()
    return [r.to_dict() for r in runs]


@router.get("/runs/{run_id}")
def get_aarohan_run(run_id: str, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    run = get_run(run_id, db)
    if not run:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Run not found.")
    return run.to_dict()


@router.post("/runs/{run_id}/decision")
def submit_aarohan_decision(run_id: str, request: AIRunDecisionRequest, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    if not has_permission(current_user.role, Permission.AI_APPROVE):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Approval authority required.")
    if request.decision.value not in {"accepted", "edited", "rejected"}:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Unsupported decision.")
    if request.decision in {"rejected", "edited"} and not request.remarks:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Reason required for edit/reject decisions.")
    return record_decision(run_id, request, str(current_user.id), db)
