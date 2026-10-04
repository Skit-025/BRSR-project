from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.modules.lineage.schemas import LineageTreeResponse
from app.modules.lineage.service import build_metric_lineage

router = APIRouter(prefix="/lineage", tags=["3-Click Audit Lineage Explorer"])

@router.get("/{metric_code}/{period_id}", response_model=LineageTreeResponse)
def get_metric_audit_lineage(
    metric_code: str,
    period_id: str,
    entity_id: Optional[str] = Query(None, description="Optional root entity (defaults to Group root)"),
    db: Session = Depends(get_db)
):
    """
    F25 Lineage Explorer (3-Click Audit Trace):
    Traces any consolidated metric figure down the tree:
    Group -> Subsidiary -> Business Unit -> Site DataPoint -> Evidence File & SHA-256 Hash.
    """
    return build_metric_lineage(db, metric_code, period_id, entity_id)
