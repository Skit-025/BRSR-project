"""
app/modules/snapshots/service.py
Service layer for orchestrating snapshots, seals, diffs, and restatements.
"""
from typing import List, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.modules.snapshots.models import ReportSnapshot
from app.modules.snapshots.schemas import SnapshotCreate, SnapshotDiffResponse
from app.modules.snapshots.builder import build_snapshot_payload
from app.modules.snapshots.diff import compute_snapshot_diff
from app.modules.snapshots.restatement import restate_snapshot


class SnapshotService:
    def __init__(self, db: Session):
        self.db = db

    def create_snapshot(self, req: SnapshotCreate, created_by: Optional[str] = None) -> ReportSnapshot:
        payload, sha256_hash = build_snapshot_payload(self.db, req.entity_id, req.period_id)
        
        # Check existing version count
        existing_count = (
            self.db.query(ReportSnapshot)
            .filter(ReportSnapshot.entity_id == req.entity_id, ReportSnapshot.period_id == req.period_id)
            .count()
        )

        snapshot = ReportSnapshot(
            period_id=req.period_id,
            entity_id=req.entity_id,
            snapshot_name=req.snapshot_name,
            version=existing_count + 1,
            is_sealed=False,
            sha256_hash=sha256_hash,
            data_payload=payload,
            metadata_json={"notes": req.notes, "created_by": created_by},
        )
        self.db.add(snapshot)
        self.db.commit()
        self.db.refresh(snapshot)
        return snapshot

    def seal_snapshot(self, snapshot_id: str, sealed_by: str) -> ReportSnapshot:
        snapshot = self.db.query(ReportSnapshot).filter(ReportSnapshot.id == snapshot_id).first()
        if not snapshot:
            raise ValueError(f"Snapshot '{snapshot_id}' not found.")
        if snapshot.is_sealed:
            return snapshot

        snapshot.is_sealed = True
        snapshot.sealed_at = datetime.now(timezone.utc)
        snapshot.sealed_by = sealed_by
        self.db.commit()
        self.db.refresh(snapshot)
        return snapshot

    def get_snapshot(self, snapshot_id: str) -> Optional[ReportSnapshot]:
        return self.db.query(ReportSnapshot).filter(ReportSnapshot.id == snapshot_id).first()

    def list_snapshots(
        self,
        entity_id: Optional[str] = None,
        period_id: Optional[str] = None,
    ) -> List[ReportSnapshot]:
        query = self.db.query(ReportSnapshot).filter(ReportSnapshot.is_deleted == False)
        if entity_id:
            query = query.filter(ReportSnapshot.entity_id == entity_id)
        if period_id:
            query = query.filter(ReportSnapshot.period_id == period_id)
        return query.order_by(ReportSnapshot.created_at.desc()).all()

    def diff_snapshots(self, base_id: str, target_id: str) -> SnapshotDiffResponse:
        b = self.get_snapshot(base_id)
        t = self.get_snapshot(target_id)
        if not b or not t:
            raise ValueError("Both snapshots must exist to compute diff.")
        return compute_snapshot_diff(b, t)

    def apply_restatement(self, original_id: str, reason: str, approved_by: str) -> ReportSnapshot:
        return restate_snapshot(self.db, original_id, reason, approved_by)
