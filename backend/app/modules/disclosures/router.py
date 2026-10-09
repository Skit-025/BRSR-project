"""
app/modules/disclosures/router.py
API endpoints for Type 3 Disclosure Forms (BU, Subsidiary, Group) and Calculation Pipeline Jobs.
"""
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.auth.models import User
from app.modules.auth.router import get_current_active_user
from app.modules.disclosures.schemas import (
    OrgLevelDisclosureRead,
    OrgLevelDisclosureSaveRequest,
    CalculationJobRead,
    CalculationJobTriggerRequest
)
from app.modules.disclosures.service import (
    get_or_create_disclosure,
    list_disclosures,
    save_disclosure,
    submit_disclosure,
    approve_disclosure,
    create_or_trigger_calc_job,
    get_latest_calc_job
)

router = APIRouter(prefix="/disclosures", tags=["Type 3 Org-Level Disclosures"])


from app.security.scope import assert_user_authorized_for_project
from app.security.rbac import Role, Permission, has_permission

def _check_disclosure_access(user: User, level: str, is_write: bool = False):
    if user.role == Role.PROJECT_ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Project Admins cannot access organization-level disclosure forms."
        )
    lvl = level.lower()
    if lvl == "bu":
        perm = Permission.BU_DISCLOSURE_WRITE if is_write else Permission.BU_DISCLOSURE_READ
        if not has_permission(user.role, perm):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized for BU disclosures.")
    elif lvl in ("subsidiary", "company"):
        perm = Permission.SUBSIDIARY_DISCLOSURE_WRITE if is_write else Permission.SUBSIDIARY_DISCLOSURE_READ
        if not has_permission(user.role, perm):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized for Subsidiary disclosures.")
    elif lvl == "group":
        perm = Permission.GROUP_DISCLOSURE_WRITE if is_write else Permission.GROUP_DISCLOSURE_READ
        if not has_permission(user.role, perm):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized for Group disclosures.")


@router.get("/{level}/{org_node_id}/{period_id}", response_model=List[OrgLevelDisclosureRead])
def get_disclosures_for_level(
    level: str,
    org_node_id: str,
    period_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Retrieves all section disclosures for an entity and period at the specified level (bu / subsidiary / group)."""
    _check_disclosure_access(current_user, level, is_write=False)
    assert_user_authorized_for_project(db, current_user, org_node_id, f"view {level} disclosures for this entity")
    return list_disclosures(db, org_node_id=org_node_id, period_id=period_id, disclosure_level=level)


@router.get("/section/{level}/{org_node_id}/{period_id}/{section}", response_model=OrgLevelDisclosureRead)
def get_disclosure_section(
    level: str,
    org_node_id: str,
    period_id: str,
    section: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Retrieves or creates a specific section disclosure (e.g. section_a_org, bu_targets)."""
    _check_disclosure_access(current_user, level, is_write=False)
    assert_user_authorized_for_project(db, current_user, org_node_id, f"access {level} disclosure section for this entity")
    return get_or_create_disclosure(
        db,
        org_node_id=org_node_id,
        period_id=period_id,
        disclosure_level=level,
        disclosure_section=section
    )


@router.post("/save", response_model=OrgLevelDisclosureRead)
def save_disclosure_endpoint(
    req: OrgLevelDisclosureSaveRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Autosaves a draft disclosure section payload."""
    _check_disclosure_access(current_user, req.disclosure_level, is_write=True)
    assert_user_authorized_for_project(db, current_user, req.org_node_id, f"save {req.disclosure_level} disclosures for this entity")
    return save_disclosure(db, req, user_id=str(current_user.id))


@router.post("/submit/{disclosure_id}", response_model=OrgLevelDisclosureRead)
def submit_disclosure_endpoint(
    disclosure_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Submits a disclosure section for higher-tier review."""
    from app.modules.disclosures.models import OrgLevelDisclosure
    disc = db.query(OrgLevelDisclosure).filter(OrgLevelDisclosure.id == disclosure_id).first()
    if not disc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Disclosure not found.")
    _check_disclosure_access(current_user, disc.disclosure_level, is_write=True)
    assert_user_authorized_for_project(db, current_user, str(disc.org_node_id), f"submit {disc.disclosure_level} disclosures for this entity")
    return submit_disclosure(db, disclosure_id=disclosure_id, user_id=str(current_user.id))


@router.post("/approve/{disclosure_id}", response_model=OrgLevelDisclosureRead)
def approve_disclosure_endpoint(
    disclosure_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Approves a disclosure section."""
    if current_user.role == Role.PROJECT_ADMIN.value:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Project Admins cannot approve disclosures.")
    from app.modules.disclosures.models import OrgLevelDisclosure
    disc = db.query(OrgLevelDisclosure).filter(OrgLevelDisclosure.id == disclosure_id).first()
    if not disc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Disclosure not found.")
    assert_user_authorized_for_project(db, current_user, str(disc.org_node_id), f"approve {disc.disclosure_level} disclosures for this entity")
    return approve_disclosure(db, disclosure_id=disclosure_id, user_id=str(current_user.id))


@router.get("/calc-pipeline/{org_node_id}", response_model=Optional[CalculationJobRead])
def get_calc_pipeline_status(
    org_node_id: str,
    period_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Returns the calculation pipeline execution status (spec §48)."""
    assert_user_authorized_for_project(db, current_user, org_node_id, "view calculation pipeline status for this entity")
    job = get_latest_calc_job(db, org_node_id=org_node_id, period_id=period_id)
    return job


@router.post("/calc-pipeline/trigger", response_model=CalculationJobRead)
def trigger_calc_pipeline(
    req: CalculationJobTriggerRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Triggers an aggregation and calculation pipeline execution (spec §48)."""
    if current_user.role == Role.PROJECT_ADMIN.value:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Project Admins cannot trigger calculation pipelines.")
    assert_user_authorized_for_project(db, current_user, req.org_node_id, "trigger calculation pipeline for this entity")
    return create_or_trigger_calc_job(
        db,
        org_node_id=req.org_node_id,
        period_id=req.period_id,
        trigger_event=req.trigger_event,
        user_id=str(current_user.id)
    )
