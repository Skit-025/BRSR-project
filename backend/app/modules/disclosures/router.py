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


@router.get("/{level}/{org_node_id}/{period_id}", response_model=List[OrgLevelDisclosureRead])
def get_disclosures_for_level(
    level: str,
    org_node_id: str,
    period_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Retrieves all section disclosures for an entity and period at the specified level (bu / subsidiary / group)."""
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
    return save_disclosure(db, req, user_id=str(current_user.id))


@router.post("/submit/{disclosure_id}", response_model=OrgLevelDisclosureRead)
def submit_disclosure_endpoint(
    disclosure_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Submits a disclosure section for higher-tier review."""
    return submit_disclosure(db, disclosure_id=disclosure_id, user_id=str(current_user.id))


@router.post("/approve/{disclosure_id}", response_model=OrgLevelDisclosureRead)
def approve_disclosure_endpoint(
    disclosure_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Approves a disclosure section."""
    return approve_disclosure(db, disclosure_id=disclosure_id, user_id=str(current_user.id))


@router.get("/calc-pipeline/{org_node_id}", response_model=Optional[CalculationJobRead])
def get_calc_pipeline_status(
    org_node_id: str,
    period_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Returns the calculation pipeline execution status (spec §48)."""
    job = get_latest_calc_job(db, org_node_id=org_node_id, period_id=period_id)
    return job


@router.post("/calc-pipeline/trigger", response_model=CalculationJobRead)
def trigger_calc_pipeline(
    req: CalculationJobTriggerRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Triggers an aggregation and calculation pipeline execution (spec §48)."""
    return create_or_trigger_calc_job(
        db,
        org_node_id=req.org_node_id,
        period_id=req.period_id,
        trigger_event=req.trigger_event,
        user_id=str(current_user.id)
    )
