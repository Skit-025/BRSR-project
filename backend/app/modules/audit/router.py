"""
app/modules/audit/router.py
FastAPI router for querying immutable audit logs and running cryptographic chain verification.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.modules.audit.schemas import AuditLogRead, AuditLogCreate, ChainVerificationResult
from app.modules.audit.service import AuditService

router = APIRouter(prefix="/audit", tags=["Immutable Audit Trail"])


@router.get("/logs", response_model=List[AuditLogRead])
def list_audit_logs(
    target_type: Optional[str] = Query(None, description="Filter by target type e.g. submission"),
    target_id: Optional[str] = Query(None, description="Filter by target resource UUID"),
    actor_id: Optional[str] = Query(None, description="Filter by actor UUID"),
    action: Optional[str] = Query(None, description="Filter by action code"),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """Retrieve immutable audit events with pagination and filters."""
    service = AuditService(db)
    return service.list_events(
        target_type=target_type,
        target_id=target_id,
        actor_id=actor_id,
        action=action,
        limit=limit,
        offset=offset,
    )


@router.get("/verify-chain", response_model=ChainVerificationResult)
def verify_audit_chain(db: Session = Depends(get_db)):
    """
    Cryptographic verification endpoint:
    Verifies that the entire audit log SHA-256 hash chain is unbroken and unmodified.
    """
    service = AuditService(db)
    return service.verify_ledger()


@router.post("/events", response_model=AuditLogRead, status_code=status.HTTP_201_CREATED)
def record_audit_event(
    event_in: AuditLogCreate,
    db: Session = Depends(get_db),
):
    """Manually record a structured audit event into the ledger."""
    service = AuditService(db)
    return service.log_event(event_in)
