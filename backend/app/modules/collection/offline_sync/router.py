"""
app/modules/collection/offline_sync/router.py
FastAPI router for offline PWA synchronisation payloads.
"""
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.modules.collection.offline_sync.service import OfflineSyncService

router = APIRouter(prefix="/sync", tags=["Offline PWA Sync"])


class OfflineDataPointPayload(BaseModel):
    idempotency_key: Optional[str] = None
    metric_code: str
    value_numeric: Optional[float] = None
    value_text: Optional[str] = None
    unit: str
    version: int = 1
    collected_at: Optional[str] = None
    notes: Optional[str] = None


class OfflineSyncBatchRequest(BaseModel):
    submission_id: str
    batch_id: Optional[str] = None
    sync_timestamp: Optional[str] = None
    client_device: Optional[str] = None
    items: List[OfflineDataPointPayload]


@router.post("/batch")
def sync_offline_batch(req: OfflineSyncBatchRequest, db: Session = Depends(get_db)):
    """
    Receives offline records collected in remote field sites and reconciles them
    according to the Server-Wins conflict policy with per-item partial evaluation.
    """
    items_dicts = [item.model_dump() for item in req.items]
    result = OfflineSyncService.process_sync_batch(
        db=db,
        submission_id=req.submission_id,
        items=items_dicts,
        batch_id=req.batch_id,
    )
    if result.get("error_code") == "SUBMISSION_NOT_FOUND":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=result["message"]
        )
    return result
