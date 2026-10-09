"""
app/modules/snapshots/router.py
FastAPI router for generating, sealing, restating, and diffing report snapshots.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.modules.auth.models import User
from app.modules.auth.router import get_current_active_user
from app.modules.snapshots.schemas import (
    SnapshotCreate,
    SnapshotSealRequest,
    SnapshotRead,
    SnapshotDiffResponse,
    RestatementRequest,
)
from app.modules.snapshots.service import SnapshotService
from app.security.rbac import Role, Permission, has_permission

router = APIRouter(prefix="/snapshots", tags=["Reporting Snapshots & Restatements"])

# Roles permitted to create/seal snapshots
_SNAPSHOT_WRITE_ROLES = {
    Role.SYSTEM_ADMIN.value,
    Role.GROUP_ADMIN.value,
    Role.SUBSIDIARY_ADMIN.value,
}

# Only group/system admin may seal or restate (financial-grade governance)
_SNAPSHOT_SEAL_ROLES = {
    Role.SYSTEM_ADMIN.value,
    Role.GROUP_ADMIN.value,
}


@router.get("/", response_model=List[SnapshotRead])
def list_snapshots(
    entity_id: Optional[str] = Query(None),
    period_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Lists snapshots with entity and period filters. Visible to roles with report:read."""
    if not has_permission(current_user.role, Permission.REPORT_READ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to list snapshots.",
        )
    service = SnapshotService(db)
    return service.list_snapshots(entity_id=entity_id, period_id=period_id)


@router.get("/{snapshot_id}", response_model=SnapshotRead)
def get_snapshot(
    snapshot_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Retrieves single snapshot with complete data payload."""
    if not has_permission(current_user.role, Permission.REPORT_READ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view snapshots.",
        )
    service = SnapshotService(db)
    snap = service.get_snapshot(snapshot_id)
    if not snap:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Snapshot not found.")
    return snap


@router.post("/", response_model=SnapshotRead, status_code=status.HTTP_201_CREATED)
def create_snapshot(
    req: SnapshotCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Generates a point-in-time snapshot with SHA-256 fingerprint. Restricted to admins."""
    if current_user.role not in _SNAPSHOT_WRITE_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only group_admin, subsidiary_admin, or system_admin may create snapshots.",
        )
    service = SnapshotService(db)
    try:
        return service.create_snapshot(req)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.post("/{snapshot_id}/seal", response_model=SnapshotRead)
def seal_snapshot(
    snapshot_id: str,
    req: SnapshotSealRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Seals snapshot to make it immutable. Only group_admin and system_admin."""
    if current_user.role not in _SNAPSHOT_SEAL_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only group_admin or system_admin may seal snapshots.",
        )
    # Enforce: the caller IS the sealer; prevent spoofing
    req.sealed_by = str(current_user.id)
    service = SnapshotService(db)
    try:
        return service.seal_snapshot(snapshot_id, req.sealed_by)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.get("/diff/{base_id}/{target_id}", response_model=SnapshotDiffResponse)
def diff_snapshots(
    base_id: str,
    target_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Computes metric differences between two snapshots."""
    if not has_permission(current_user.role, Permission.REPORT_READ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to compare snapshots.",
        )
    service = SnapshotService(db)
    try:
        return service.diff_snapshots(base_id, target_id)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.post("/restate", response_model=SnapshotRead)
def restate_sealed_snapshot(
    req: RestatementRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Creates an audited restatement of a sealed snapshot. Only group_admin or system_admin."""
    if current_user.role not in _SNAPSHOT_SEAL_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only group_admin or system_admin may restate sealed snapshots.",
        )
    # Enforce: the caller is the approver; prevent spoofing
    req.approved_by = str(current_user.id)
    service = SnapshotService(db)
    try:
        return service.apply_restatement(
            original_id=req.original_snapshot_id,
            reason=req.restatement_reason,
            approved_by=req.approved_by,
        )
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
