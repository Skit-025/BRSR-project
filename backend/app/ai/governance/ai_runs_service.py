"""
AI Governance: AI Runs Service
Provides the data access layer for the ai_runs audit table.
Handles querying, human decision recording (accept/edit/reject),
and run history retrieval.
"""
import uuid
from datetime import datetime
from typing import Optional, List
from sqlalchemy.orm import Session

from app.ai.models import AIRun
from app.ai.schemas import AIRunStatus, AIRunDecisionRequest, AIRunDecisionResponse


def get_run(run_id: str, db: Session) -> Optional[AIRun]:
    """Fetches a single ai_run record by ID."""
    return db.query(AIRun).filter(AIRun.id == uuid.UUID(run_id)).first()


def list_runs_for_engine(engine: str, db: Session, limit: int = 50) -> List[AIRun]:
    """Returns the latest N ai_runs for a specific engine (E1, E2, etc.)."""
    return (
        db.query(AIRun)
        .filter(AIRun.engine == engine)
        .order_by(AIRun.created_at.desc())
        .limit(limit)
        .all()
    )


def list_pending_runs(db: Session, limit: int = 50) -> List[AIRun]:
    """Returns all ai_runs awaiting human review (status = proposed)."""
    return (
        db.query(AIRun)
        .filter(AIRun.status == AIRunStatus.PROPOSED.value)
        .order_by(AIRun.created_at.desc())
        .limit(limit)
        .all()
    )


def record_decision(
    run_id: str,
    decision: AIRunDecisionRequest,
    reviewer_id: Optional[str],
    db: Session
) -> AIRunDecisionResponse:
    """
    Persists a human reviewer's decision on an AI-proposed output.
    Updates status, reviewer_id, reviewed_at, and final_ref.
    """
    run = get_run(run_id, db)
    if not run:
        raise ValueError(f"AIRun with id={run_id} not found.")

    run.status = decision.decision.value
    run.reviewer_id = uuid.UUID(reviewer_id) if reviewer_id else None
    run.reviewed_at = datetime.utcnow()

    if decision.final_value:
        run.final_ref = str(decision.final_value)

    db.commit()
    db.refresh(run)

    return AIRunDecisionResponse(
        run_id=run_id,
        status=decision.decision,
        message=f"AI proposal {run_id} marked as '{decision.decision.value}' by reviewer."
    )
