"""
app/modules/forms/router.py
Dynamic Digital Forms Router.
Exposes the Master Digital Form and role/entity-scoped projections.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.auth.models import User
from app.modules.auth.router import get_current_active_user, require_system_admin
from app.modules.forms.schemas import DigitalFormResponse
from app.modules.forms.service import build_master_digital_form, build_scoped_digital_form
from app.security.rbac import Role

router = APIRouter(prefix="/forms", tags=["Dynamic Digital Forms (40 Dimensions)"])


@router.get(
    "/master",
    response_model=DigitalFormResponse,
    summary="Retrieve Master Digital Form (System Admin & Group ESG)"
)
def get_master_form(
    period_id: str = Query(..., description="Reporting period ID"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Returns the comprehensive Master Digital Form containing all metrics across
    all 5 MEIL subsidiaries and principles.
    Restricted to system_admin, group_admin, and esg_manager.
    """
    allowed = [Role.SYSTEM_ADMIN.value, Role.GROUP_ADMIN.value, Role.ESG_MANAGER.value]
    if current_user.role not in allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied. Only {allowed} can view the master digital form."
        )
    return build_master_digital_form(db, period_id)


@router.get(
    "/scoped",
    response_model=DigitalFormResponse,
    summary="Retrieve entity & role scoped digital form"
)
def get_scoped_form(
    period_id: str = Query(..., description="Reporting period ID"),
    entity_id: Optional[str] = Query(None, description="Optional entity override for admins or makers"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Returns the caller's scoped digital form view.
    - If entity_id is specified (by admin, manager, or maker), projects parameters for that entity.
    - Otherwise defaults to user's assigned org node.
    """
    target_entity_id = entity_id if entity_id else (str(current_user.org_node_id) if current_user.org_node_id else None)
    
    return build_scoped_digital_form(
        db=db,
        period_id=period_id,
        user_role=current_user.role,
        user_entity_id=target_entity_id
    )


@router.get(
    "/template/{entity_id}/{period_id}",
    summary="Download pre-filled CSV upload template for this digital form"
)
def download_form_template(
    entity_id: str,
    period_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Generates a pre-formatted CSV template containing all applicable metric codes and units
    for offline completion and bulk upload.
    """
    scoped = build_scoped_digital_form(
        db=db,
        period_id=period_id,
        user_role=current_user.role,
        user_entity_id=entity_id
    )

    rows = ["metric_code,metric_name,principle,unit,value_numeric,value_text,notes"]
    for sec in scoped.sections:
        for f in sec.fields:
            safe_name = f.metric_name.replace(",", " ")
            rows.append(f"{f.metric_code},{safe_name},{f.principle},{f.unit},,,")

    csv_content = "\n".join(rows)
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=BRSR_Form_Template_{scoped.entity_code}_{scoped.period_code}.csv"
        }
    )
