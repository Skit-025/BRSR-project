"""
app/modules/collection/offline_sync/router.py
FastAPI router for offline PWA synchronisation payloads.
"""
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.modules.collection.models import Submission, DataPoint, EntryMethod
from app.modules.collection.offline_sync.conflict_policy import resolve_datapoint_conflict

router = APIRouter(prefix="/sync", tags=["Offline PWA Sync"])


class OfflineDataPointPayload(BaseModel):
    metric_code: str
    value_numeric: float = None
    value_text: str = None
    unit: str
    version: int = 1
    notes: str = None


class OfflineSyncBatchRequest(BaseModel):
    submission_id: str
    items: List[OfflineDataPointPayload]


@router.post("/batch")
def sync_offline_batch(req: OfflineSyncBatchRequest, db: Session = Depends(get_db)):
    """Receives offline records collected in remote field sites and reconciles them."""
    submission = (
        db.query(Submission)
        .filter(Submission.id == req.submission_id, Submission.is_deleted == False)
        .first()
    )
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Submission {req.submission_id} not found."
        )

    if submission.status in ["LOCKED", "CONSOLIDATED"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot sync offline updates to closed submission (Status: {submission.status})."
        )

    applied = 0
    conflicts = []

    for item in req.items:
        existing = (
            db.query(DataPoint)
            .filter(
                DataPoint.submission_id == req.submission_id,
                DataPoint.metric_code == item.metric_code,
                DataPoint.is_deleted == False,
            )
            .first()
        )
        if not existing:
            dp = DataPoint(
                submission_id=req.submission_id,
                metric_code=item.metric_code,
                value_numeric=item.value_numeric,
                value_text=item.value_text,
                unit=item.unit,
                normalized_value=item.value_numeric,
                entry_method=EntryMethod.OFFLINE_PWA.value,
                version=item.version,
                notes=item.notes,
            )
            db.add(dp)
            applied += 1
        else:
            can_apply, reason = resolve_datapoint_conflict(existing, item.model_dump())
            if can_apply:
                existing.value_numeric = item.value_numeric
                existing.value_text = item.value_text
                existing.unit = item.unit
                existing.normalized_value = item.value_numeric
                existing.version += 1
                existing.entry_method = EntryMethod.OFFLINE_PWA.value
                applied += 1
            else:
                conflicts.append({"metric_code": item.metric_code, "reason": reason})

    db.commit()
    return {
        "status": "success",
        "applied_count": applied,
        "conflicts_count": len(conflicts),
        "conflicts": conflicts,
    }
