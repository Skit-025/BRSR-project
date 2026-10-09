"""
app/modules/dashboards/router.py
FastAPI router for executive dashboards, KPI cards, and ESG Data Quality scores.
"""
from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.modules.org.models import OrgNode, ReportingPeriod
from app.modules.dashboards.schemas import ExecutiveDashboardSummary
from app.modules.dashboards.service import DashboardService

router = APIRouter(prefix="/dashboards", tags=["ESG Analytics & Dashboards"])


from app.modules.auth.models import User
from app.modules.auth.router import get_current_active_user
from app.security.scope import assert_user_authorized_for_project
from app.security.rbac import Role

@router.get("/summary", response_model=ExecutiveDashboardSummary)
def get_executive_summary(
    period_id: Optional[str] = Query(None),
    entity_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Returns top-level executive metrics, submission progress, ESG Data Quality score, and principle cards.
    """
    # Scope default for project_admin
    if not entity_id and current_user.role == Role.PROJECT_ADMIN.value and current_user.org_node_id:
        entity_id = str(current_user.org_node_id)

    # Resolve default period if not provided
    if not period_id:
        latest_p = db.query(ReportingPeriod).order_by(ReportingPeriod.start_date.desc()).first()
        if not latest_p:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No reporting periods configured.")
        period_id = latest_p.id

    # Resolve root entity if not provided
    if not entity_id:
        root = db.query(OrgNode).filter(OrgNode.type == "group").first()
        if not root:
            root = db.query(OrgNode).first()
        if not root:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No organization nodes configured.")
        entity_id = root.id

    if current_user.role == Role.PROJECT_ADMIN.value or current_user.role != Role.SYSTEM_ADMIN.value:
        assert_user_authorized_for_project(db, current_user, str(entity_id), "view dashboard for this entity")

    service = DashboardService(db)
    return service.get_summary(period_id=period_id, entity_id=entity_id)
