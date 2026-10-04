"""
app/modules/valuechain/router.py
FastAPI router for SEBI Value Chain partners, cumulative 75% boundary, and assessments.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.modules.valuechain.schemas import PartnerCreate, PartnerRead, AssessmentCreate
from app.modules.valuechain.service import ValueChainService

router = APIRouter(prefix="/valuechain", tags=["Value Chain ESG Disclosures (SEBI 75% Rule)"])


@router.get("/partners", response_model=List[PartnerRead])
def list_partners(
    in_boundary_only: bool = Query(False, description="Filter only partners in top 75% spend boundary"),
    db: Session = Depends(get_db),
):
    """Lists value chain partners ordered by annual procurement spend."""
    service = ValueChainService(db)
    return service.list_partners(in_boundary_only=in_boundary_only)


@router.post("/partners", response_model=PartnerRead, status_code=status.HTTP_201_CREATED)
def create_partner(req: PartnerCreate, db: Session = Depends(get_db)):
    """Registers a new value chain partner and recalculates cumulative 75% boundary."""
    service = ValueChainService(db)
    return service.create_partner(req)


@router.post("/assessments", status_code=status.HTTP_201_CREATED)
def record_partner_assessment(req: AssessmentCreate, db: Session = Depends(get_db)):
    """Submits ESG assessment and questionnaire results for a value chain partner."""
    service = ValueChainService(db)
    return service.record_assessment(req)
