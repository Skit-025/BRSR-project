"""
app/modules/valuechain/router.py
FastAPI router for SEBI Value Chain partners, cumulative 75% boundary, and assessments.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.modules.auth.models import User
from app.modules.auth.router import get_current_active_user
from app.modules.valuechain.schemas import PartnerCreate, PartnerRead, AssessmentCreate
from app.modules.valuechain.service import ValueChainService
from app.security.rbac import Role, Permission, has_permission

router = APIRouter(prefix="/valuechain", tags=["Value Chain ESG Disclosures (SEBI 75% Rule)"])

# Roles permitted to manage value-chain partners and assessments
_VC_WRITE_ROLES = {
    Role.SYSTEM_ADMIN.value,
    Role.GROUP_ADMIN.value,
    Role.SUBSIDIARY_ADMIN.value,
    Role.BU_ADMIN.value,
}


@router.get("/partners", response_model=List[PartnerRead])
def list_partners(
    in_boundary_only: bool = Query(False, description="Filter only partners in top 75% spend boundary"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Lists value chain partners ordered by annual procurement spend."""
    if not has_permission(current_user.role, Permission.REPORT_READ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view value chain partners.",
        )
    service = ValueChainService(db)
    return service.list_partners(in_boundary_only=in_boundary_only)


@router.post("/partners", response_model=PartnerRead, status_code=status.HTTP_201_CREATED)
def create_partner(
    req: PartnerCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Registers a new value chain partner and recalculates cumulative 75% boundary."""
    if current_user.role not in _VC_WRITE_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only bu_admin and above may register value chain partners.",
        )
    service = ValueChainService(db)
    return service.create_partner(req)


@router.post("/assessments", status_code=status.HTTP_201_CREATED)
def record_partner_assessment(
    req: AssessmentCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Submits ESG assessment and questionnaire results for a value chain partner."""
    if current_user.role not in _VC_WRITE_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only bu_admin and above may record value chain partner assessments.",
        )
    service = ValueChainService(db)
    return service.record_assessment(req)
