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
from app.modules.dashboards.schemas import ExecutiveDashboardSummary, CommandCenterResponse, GroupOverviewResponse, GroupOverviewDesignResponse, Principle6RolldownResponse
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


_GROUP_WIDE_ROLES = {
    Role.SYSTEM_ADMIN.value,
    Role.GROUP_ADMIN.value,
    Role.GROUP_SUPERVISOR.value,
    Role.GROUP_ESG_MANAGER.value,
}


def _resolve_and_assert_dashboard_scope(db: Session, current_user: User, entity_id: Optional[str]) -> Optional[str]:
    """Enforce top-down scope on dashboard endpoints: non-group roles default to own node and cannot view Group/ancestors."""
    if current_user.role in _GROUP_WIDE_ROLES:
        return entity_id
    target_id = entity_id
    if not target_id:
        from app.security.scope import get_user_effective_scope_node_ids
        eff_ids = get_user_effective_scope_node_ids(db, current_user)
        for eid in eff_ids:
            try:
                uuid.UUID(str(eid))
                target_id = str(eid)
                break
            except (ValueError, AttributeError, TypeError):
                pass
        if not target_id and current_user.org_node_id:
            target_id = str(current_user.org_node_id)
    if target_id:
        assert_user_authorized_for_project(db, current_user, str(target_id), "view dashboard for this entity")
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No organizational node assigned to your account.",
        )
    return target_id


@router.get("/command-center", response_model=CommandCenterResponse)
def get_command_center(
    period_id: Optional[str] = Query(None),
    entity_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Returns the complete dynamic Executive ESG Command Center payload scoped top-down to caller's tier.
    """
    scoped_entity_id = _resolve_and_assert_dashboard_scope(db, current_user, entity_id)
    service = DashboardService(db)
    return service.get_command_center(
        period_id=period_id,
        entity_id=scoped_entity_id,
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
    Returns authentic, 100% database-driven Overview scoped top-down to caller's tier.
    """
    scoped_entity_id = _resolve_and_assert_dashboard_scope(db, current_user, entity_id)
    service = DashboardService(db)
    return service.get_group_overview(
        period_id=period_id,
        entity_id=scoped_entity_id,
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
    Returns the visual layout-tailored Overview scoped top-down to caller's tier.
    """
    scoped_entity_id = _resolve_and_assert_dashboard_scope(db, current_user, entity_id)
    service = DashboardService(db)
    return service.get_group_overview_design(
        period_id=period_id,
        entity_id=scoped_entity_id,
        current_user=current_user,
    )


@router.get("/principle6-rolldown", response_model=Principle6RolldownResponse)
def get_principle6_rolldown(
    period_id: Optional[str] = Query(None),
    entity_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Top-down Principle 6 roll-down endpoint for all admin tiers (Group -> Subsidiary -> BU -> Project).
    """
    if not entity_id:
        if current_user.role not in (
            Role.SYSTEM_ADMIN.value,
            Role.GROUP_ADMIN.value,
            Role.GROUP_SUPERVISOR.value,
            Role.GROUP_ESG_MANAGER.value,
        ) and current_user.org_node_id:
            entity_id = str(current_user.org_node_id)
        else:
            root = db.query(OrgNode).filter(OrgNode.type == "group", OrgNode.is_deleted == False).first() or db.query(OrgNode).filter(OrgNode.is_deleted == False).first()
            if not root:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No organization nodes configured.")
            entity_id = str(root.id)

    if not period_id:
        latest_p = db.query(ReportingPeriod).order_by(ReportingPeriod.start_date.desc()).first()
        if not latest_p:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No reporting periods configured.")
        period_id = str(latest_p.id)

    if current_user.role != Role.SYSTEM_ADMIN.value:
        assert_user_authorized_for_project(db, current_user, str(entity_id), "view Principle 6 dashboard for this entity")

    service = DashboardService(db)
    return service.get_principle6_rolldown(period_id=period_id, entity_id=entity_id, current_user=current_user)



