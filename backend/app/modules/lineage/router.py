"""
app/modules/lineage/router.py
3-Click Audit Lineage Explorer — requires authentication.
Lineage data contains consolidated financial-grade ESG figures and must be access-controlled.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.modules.auth.models import User
from app.modules.auth.router import get_current_active_user
from app.modules.lineage.schemas import LineageTreeResponse
from app.modules.lineage.service import build_metric_lineage
from app.security.rbac import Permission, has_permission

router = APIRouter(prefix="/lineage", tags=["3-Click Audit Lineage Explorer"])


@router.get("/{metric_code}/{period_id}", response_model=LineageTreeResponse)
def get_metric_audit_lineage(
    metric_code: str,
    period_id: str,
    entity_id: Optional[str] = Query(None, description="Optional root entity (defaults to Group root)"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    F25 Lineage Explorer (3-Click Audit Trace):
    Traces any consolidated metric figure down the tree:
    Group -> Subsidiary -> Business Unit -> Site DataPoint -> Evidence File & SHA-256 Hash.
    Requires report:lineage permission.
    """
    if not has_permission(current_user.role, Permission.REPORT_LINEAGE):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view metric audit lineage.",
        )
    return build_metric_lineage(db, metric_code, period_id, entity_id)
