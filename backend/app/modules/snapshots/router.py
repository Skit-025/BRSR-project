"""
app/modules/snapshots/router.py
FastAPI router for generating, sealing, restating, and diffing report snapshots.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.modules.snapshots.schemas import (
    SnapshotCreate,
    SnapshotSealRequest,
    SnapshotRead,
    SnapshotDiffResponse,
    RestatementRequest,
)
from app.modules.snapshots.service import SnapshotService

router = APIRouter(prefix="/snapshots", tags=["Reporting Snapshots & Restatements"])


@router.get("/", response_model=List[SnapshotRead])
def list_snapshots(
    entity_id: Optional[str] = Query(None),
    period_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Lists snapshots with entity and period filters."""
    service = SnapshotService(db)
    return service.list_snapshots(entity_id=entity_id, period_id=period_id)


@router.get("/{snapshot_id}", response_model=SnapshotRead)
def get_snapshot(snapshot_id: str, db: Session = Depends(get_db)):
    """Retrieves single snapshot with complete data payload."""
    service = SnapshotService(db)
    snap = service.get_snapshot(snapshot_id)
    if not snap:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Snapshot not found.")
    return snap


@router.post("/", response_model=SnapshotRead, status_code=status.HTTP_201_CREATED)
def create_snapshot(req: SnapshotCreate, db: Session = Depends(get_db)):
    """Generates a point-in-time snapshot with SHA-256 fingerprint."""
    service = SnapshotService(db)
    try:
        return service.create_snapshot(req)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.post("/{snapshot_id}/seal", response_model=SnapshotRead)
def seal_snapshot(snapshot_id: str, req: SnapshotSealRequest, db: Session = Depends(get_db)):
    """Seals snapshot to make it immutable."""
    service = SnapshotService(db)
    try:
        return service.seal_snapshot(snapshot_id, req.sealed_by)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.get("/diff/{base_id}/{target_id}", response_model=SnapshotDiffResponse)
def diff_snapshots(base_id: str, target_id: str, db: Session = Depends(get_db)):
    """Computes metric differences between two snapshots."""
    service = SnapshotService(db)
    try:
        return service.diff_snapshots(base_id, target_id)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.post("/restate", response_model=SnapshotRead)
def restate_sealed_snapshot(req: RestatementRequest, db: Session = Depends(get_db)):
    """Creates an audited restatement of a sealed snapshot."""
    service = SnapshotService(db)
    try:
        return service.apply_restatement(
            original_id=req.original_snapshot_id,
            reason=req.restatement_reason,
            approved_by=req.approved_by,
        )
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
