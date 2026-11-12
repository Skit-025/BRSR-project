"""
app/modules/dashboards/router.py
FastAPI router for executive dashboards, KPI cards, and ESG Data Quality scores.
"""
from typing import Optional
import uuid
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.modules.org.models import OrgNode, ReportingPeriod
from app.modules.dashboards.schemas import ExecutiveDashboardSummary, CommandCenterResponse, GroupOverviewResponse, GroupOverviewDesignResponse
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
    # Scope default for scoped roles (project, BU, subsidiary)
    if not entity_id and current_user.role not in (
        Role.SYSTEM_ADMIN.value,
        Role.GROUP_ADMIN.value,
        Role.GROUP_SUPERVISOR.value,
        Role.GROUP_ESG_MANAGER.value,
    ):
        from app.security.scope import get_user_effective_scope_node_ids
        eff_ids = get_user_effective_scope_node_ids(db, current_user)
        for eid in eff_ids:
            try:
                uuid.UUID(str(eid))
                entity_id = str(eid)
                break
            except (ValueError, AttributeError, TypeError):
                pass
        if not entity_id and current_user.org_node_id:
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


@router.get("/command-center", response_model=CommandCenterResponse)
def get_command_center(
    period_id: Optional[str] = Query(None),
    entity_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Returns the complete dynamic Executive ESG Command Center payload for Group Supervisor & Group Admin.
    Reflects live database hierarchy, submissions, approval queues, heatmaps, and role-tailored actions.
    """
    service = DashboardService(db)
    return service.get_command_center(
        period_id=period_id,
        entity_id=entity_id,
        current_user=current_user,
    )


@router.get("/group-overview", response_model=GroupOverviewResponse)
def get_group_overview(
    period_id: Optional[str] = Query(None),
    entity_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Returns authentic, 100% database-driven Group Overview with true hierarchy,
    calculated reporting metrics, real submission statuses, and actionable approval/exception items.
    """
    service = DashboardService(db)
    return service.get_group_overview(
        period_id=period_id,
        entity_id=entity_id,
        current_user=current_user,
    )


@router.get("/overview", response_model=GroupOverviewDesignResponse)
def get_group_overview_design(
    period_id: Optional[str] = Query(None),
    entity_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Returns the visual layout-tailored Group Overview matching the executive reference design.
    Zero hardcoded values: all entity names, counts, completion percentages, emissions,
    and approval queues are dynamically computed from live PostgreSQL records.
    """
    service = DashboardService(db)
    return service.get_group_overview_design(
        period_id=period_id,
        entity_id=entity_id,
        current_user=current_user,
    )



