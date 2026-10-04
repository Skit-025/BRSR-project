"""
app/modules/validation/exceptions/router.py
FastAPI router for managing and resolving validation exceptions.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.modules.validation.exceptions.service import ValidationExceptionService

router = APIRouter(prefix="/exceptions", tags=["Validation Exception Management"])


class ExceptionCreate(BaseModel):
    submission_id: str
    metric_code: str
    rule_id: str
    severity: str
    description: str
    assigned_to: Optional[str] = None


class ExceptionResolve(BaseModel):
    resolution_notes: str
    resolved_by: str
    waive: bool = False


@router.get("/")
def list_exceptions(
    submission_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    assigned_to: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Lists validation exceptions with filters."""
    service = ValidationExceptionService(db)
    records = service.list_exceptions(submission_id=submission_id, status=status, assigned_to=assigned_to)
    return [
        {
            "id": r.id,
            "submission_id": r.submission_id,
            "metric_code": r.metric_code,
            "rule_id": r.rule_id,
            "severity": r.severity,
            "description": r.description,
            "status": r.status,
            "assigned_to": r.assigned_to,
            "resolution_notes": r.resolution_notes,
            "resolved_by": r.resolved_by,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in records
    ]


@router.post("/", status_code=status.HTTP_201_CREATED)
def raise_exception(req: ExceptionCreate, db: Session = Depends(get_db)):
    """Raises a new validation exception ticket."""
    service = ValidationExceptionService(db)
    return service.raise_exception(
        submission_id=req.submission_id,
        metric_code=req.metric_code,
        rule_id=req.rule_id,
        severity=req.severity,
        description=req.description,
        assigned_to=req.assigned_to,
    )


@router.post("/{exception_id}/resolve")
def resolve_exception(exception_id: str, req: ExceptionResolve, db: Session = Depends(get_db)):
    """Resolves or waives a validation exception."""
    service = ValidationExceptionService(db)
    try:
        return service.resolve_exception(
            exception_id=exception_id,
            resolution_notes=req.resolution_notes,
            resolved_by=req.resolved_by,
            waive=req.waive,
        )
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
