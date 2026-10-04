from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.modules.consolidation.models import ConsolidatedValue
from app.modules.consolidation.schemas import (
    ConsolidatedValueRead,
    ConsolidationRunRequest,
    ConsolidationRunResponse
)
from app.modules.consolidation.service import run_consolidation_engine

router = APIRouter(prefix="/consolidation", tags=["Boundary & Consolidation Engine"])

@router.get("/status", response_model=Dict[str, Any])
def get_consolidation_status(db: Session = Depends(get_db)):
    """
    Returns the current and historical consolidation run status.
    Frontend uses this for real-time polling and history display.
    """
    try:
        # Count consolidated values as a proxy for run completeness
        total_consolidated = db.query(ConsolidatedValue).count()
        # Group by period to build history
        from sqlalchemy import func, text
        periods = db.execute(
            text("SELECT DISTINCT period_id FROM consolidated_values ORDER BY period_id DESC LIMIT 10")
        ).fetchall() if total_consolidated > 0 else []
        history = []
        for row in periods:
            pid = row[0]
            count = db.query(ConsolidatedValue).filter(ConsolidatedValue.period_id == pid).count()
            history.append({
                "period_id": pid,
                "status": "completed",
                "entities_processed": count,
                "variance_flags": 0,
                "duration_ms": None,
            })
        return {
            "current_run": history[0] if history else None,
            "history": history,
            "total_consolidated_values": total_consolidated,
        }
    except Exception as e:
        return {
            "current_run": None,
            "history": [],
            "total_consolidated_values": 0,
            "error": str(e),
        }

@router.post("/run", response_model=ConsolidationRunResponse, status_code=status.HTTP_200_OK)
def trigger_consolidation(
    req: ConsolidationRunRequest,
    db: Session = Depends(get_db)
):
    """
    F22-F23: Triggers deterministic post-order roll-up of approved site numbers
    up to Business Units, Subsidiaries, and MEIL Group.
    """
    try:
        res = run_consolidation_engine(db, req.period_id, req.root_node_id)
        return res
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/{entity_id}/{period_id}", response_model=List[ConsolidatedValueRead])
def get_consolidated_figures(
    entity_id: str,
    period_id: str,
    db: Session = Depends(get_db)
):
    """
    Retrieves rolled-up KPI values for a parent node (BU, Subsidiary, or Group)
    including child contribution lineage (raw value, boundary share %, weighted value).
    """
    values = db.query(ConsolidatedValue).filter(
        ConsolidatedValue.entity_id == entity_id,
        ConsolidatedValue.period_id == period_id
    ).all()
    return values
