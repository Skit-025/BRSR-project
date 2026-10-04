"""
app/modules/snapshots/restatement.py
Snapshot restatement engine for regulated ESG disclosures.
"""
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.modules.snapshots.models import ReportSnapshot, SnapshotRestatement
from app.modules.snapshots.builder import build_snapshot_payload


def restate_snapshot(
    db: Session,
    original_snapshot_id: str,
    restatement_reason: str,
    approved_by: str,
) -> ReportSnapshot:
    """
    Creates a new versioned snapshot linked to the original snapshot via SnapshotRestatement.
    """
    orig = db.query(ReportSnapshot).filter(ReportSnapshot.id == original_snapshot_id).first()
    if not orig:
        raise ValueError(f"Original snapshot '{original_snapshot_id}' not found.")

    # Re-build snapshot with current reconciled data
    payload, sha256_hash = build_snapshot_payload(db, orig.entity_id, orig.period_id)

    new_version = orig.version + 1
    new_snapshot = ReportSnapshot(
        period_id=orig.period_id,
        entity_id=orig.entity_id,
        snapshot_name=f"{orig.snapshot_name} (Restatement v{new_version})",
        version=new_version,
        is_sealed=True,
        sealed_at=datetime.now(timezone.utc),
        sealed_by=approved_by,
        sha256_hash=sha256_hash,
        data_payload=payload,
        metadata_json={
            "is_restatement": True,
            "original_snapshot_id": orig.id,
            "restatement_reason": restatement_reason,
        }
    )
    db.add(new_snapshot)
    db.flush()

    restatement_record = SnapshotRestatement(
        original_snapshot_id=orig.id,
        new_snapshot_id=new_snapshot.id,
        restatement_reason=restatement_reason,
        approved_by=approved_by,
        effective_date=datetime.now(timezone.utc),
    )
    db.add(restatement_record)
    db.commit()
    db.refresh(new_snapshot)

    return new_snapshot
