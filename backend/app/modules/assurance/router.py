"""
app/modules/assurance/router.py
FastAPI router for independent ESG assurance providers, audit sampling, and workpaper dossier generation.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.modules.assurance.schemas import (
    EngagementCreate,
    EngagementRead,
    FindingCreate,
    FindingResponse,
    SamplingRequest,
)
from app.modules.assurance.service import AssuranceService

router = APIRouter(prefix="/assurance", tags=["Independent ESG Assurance & Audit"])


@router.get("/engagements", response_model=List[EngagementRead])
def list_engagements(period_id: Optional[str] = Query(None), db: Session = Depends(get_db)):
    """List third-party assurance engagements."""
    service = AssuranceService(db)
    return service.list_engagements(period_id=period_id)


@router.post("/engagements", response_model=EngagementRead, status_code=status.HTTP_201_CREATED)
def create_engagement(req: EngagementCreate, db: Session = Depends(get_db)):
    """Register a new assurance engagement."""
    service = AssuranceService(db)
    return service.create_engagement(req)


@router.get("/engagements/{engagement_id}")
def get_engagement_details(engagement_id: str, db: Session = Depends(get_db)):
    """Retrieve engagement details including findings."""
    service = AssuranceService(db)
    eng = service.get_engagement(engagement_id)
    if not eng:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Engagement not found.")
    return eng


@router.post("/findings", status_code=status.HTTP_201_CREATED)
def log_auditor_finding(req: FindingCreate, db: Session = Depends(get_db)):
    """Logs an auditor inquiry or deficiency observation."""
    service = AssuranceService(db)
    return service.add_finding(req)


@router.post("/findings/{finding_id}/respond")
def submit_management_response(finding_id: str, req: FindingResponse, db: Session = Depends(get_db)):
    """Submit formal management response to an auditor finding."""
    service = AssuranceService(db)
    try:
        return service.respond_to_finding(finding_id, req.management_response)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.post("/sample")
def get_audit_sample(req: SamplingRequest, db: Session = Depends(get_db)):
    """Generates stratified risk-based statistical sample of data points for substantive audit testing."""
    service = AssuranceService(db)
    eng = service.get_engagement(req.engagement_id)
    if not eng:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Engagement not found.")
    return service.run_sampling(eng.period_id, req.metric_code, req.sample_percentage)


@router.get("/engagements/{engagement_id}/workpaper")
def export_audit_workpaper(engagement_id: str, db: Session = Depends(get_db)):
    """Exports structured workpaper dossier for the external auditor."""
    service = AssuranceService(db)
    try:
        return service.export_workpaper(engagement_id)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
