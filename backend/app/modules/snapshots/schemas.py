"""
app/modules/snapshots/schemas.py
Pydantic schemas for Snapshot creation, viewing, and diff analysis.
"""
from typing import Optional, Dict, Any, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class SnapshotCreate(BaseModel):
    period_id: str
    entity_id: str
    snapshot_name: str
    notes: Optional[str] = None


class SnapshotSealRequest(BaseModel):
    sealed_by: str
    signature_note: Optional[str] = None


class SnapshotRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    period_id: str
    entity_id: str
    snapshot_name: str
    version: int
    is_sealed: bool
    sealed_at: Optional[datetime] = None
    sealed_by: Optional[str] = None
    sha256_hash: str
    data_payload: Dict[str, Any]
    metadata_json: Optional[Dict[str, Any]] = None
    created_at: datetime


class MetricDiffItem(BaseModel):
    metric_code: str
    base_value: Optional[float] = None
    target_value: Optional[float] = None
    unit: str
    absolute_delta: Optional[float] = None
    percentage_change: Optional[float] = None


class SnapshotDiffResponse(BaseModel):
    base_snapshot_id: str
    target_snapshot_id: str
    metrics_changed_count: int
    diffs: List[MetricDiffItem] = []


class RestatementRequest(BaseModel):
    original_snapshot_id: str
    restatement_reason: str
    approved_by: str
