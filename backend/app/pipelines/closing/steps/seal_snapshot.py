"""
app/pipelines/closing/steps/seal_snapshot.py
Stage 3 – Compute and store the final SHA-256 chained hash for this period's snapshot.
"""
from __future__ import annotations

import hashlib
import json
import logging
from datetime import datetime, timezone
from typing import TYPE_CHECKING
from uuid import uuid4

from sqlalchemy import text

if TYPE_CHECKING:
    from sqlalchemy.orm import Session
    from app.pipelines.closing.pipeline import ClosingContext

logger = logging.getLogger(__name__)


def _compute_snapshot_hash(
    period_id: str,
    root_entity_id: str,
    prev_hash: str | None,
    payload_digest: str,
    sealed_at: datetime,
) -> str:
    """Produce a deterministic SHA-256 hash over snapshot metadata + previous hash."""
    canonical = json.dumps(
        {
            "period_id": period_id,
            "root_entity_id": root_entity_id,
            "prev_hash": prev_hash or "GENESIS",
            "payload_digest": payload_digest,
            "sealed_at": sealed_at.isoformat(),
        },
        sort_keys=True,
    )
    return hashlib.sha256(canonical.encode()).hexdigest()


def _get_payload_digest(db: "Session", period_id: str, root_entity_id: str) -> str:
    """
    Build a stable digest from all approved data-entry values for this period.
    Returns a SHA-256 hex string over the sorted metric-value pairs.
    """
    try:
        rows = db.execute(
            text("""
                SELECT metric_id, entity_id, value_numeric, value_text
                FROM data_entries
                WHERE period_id = :period_id
                  AND status = 'APPROVED'
                ORDER BY metric_id, entity_id
            """),
            {"period_id": period_id},
        ).fetchall()
    except Exception:  # noqa: BLE001
        rows = []

    payload = json.dumps(
        [{"m": str(r[0]), "e": str(r[1]), "n": str(r[2]), "t": str(r[3])} for r in rows],
        sort_keys=True,
    )
    return hashlib.sha256(payload.encode()).hexdigest()


def _get_previous_snapshot_hash(
    db: "Session", period_id: str, root_entity_id: str
) -> str | None:
    """Return the hash of the last sealed snapshot for this entity (any period)."""
    try:
        row = db.execute(
            text("""
                SELECT hash
                FROM snapshots
                WHERE root_entity_id = :root_entity_id
                  AND status = 'SEALED'
                ORDER BY sealed_at DESC
                LIMIT 1
            """),
            {"root_entity_id": root_entity_id},
        ).fetchone()
        return row[0] if row else None
    except Exception:  # noqa: BLE001
        return None


def seal_snapshot(ctx: "ClosingContext", db: "Session") -> None:
    """
    Compute the final chained snapshot hash and upsert the snapshot record.
    """
    sealed_at = datetime.now(timezone.utc)
    snapshot_id = str(uuid4())

    payload_digest = _get_payload_digest(db, ctx.period_id, ctx.root_entity_id)
    prev_hash = _get_previous_snapshot_hash(db, ctx.period_id, ctx.root_entity_id)

    snapshot_hash = _compute_snapshot_hash(
        period_id=ctx.period_id,
        root_entity_id=ctx.root_entity_id,
        prev_hash=prev_hash,
        payload_digest=payload_digest,
        sealed_at=sealed_at,
    )

    try:
        db.execute(
            text("""
                INSERT INTO snapshots
                    (id, period_id, root_entity_id, status, hash, prev_hash,
                     payload_digest, sealed_at, sealed_by, created_at, updated_at)
                VALUES
                    (:id, :period_id, :root_entity_id, 'SEALED', :hash, :prev_hash,
                     :payload_digest, :sealed_at, :sealed_by, NOW(), NOW())
                ON CONFLICT (period_id, root_entity_id)
                DO UPDATE SET
                    status        = 'SEALED',
                    hash          = EXCLUDED.hash,
                    prev_hash     = EXCLUDED.prev_hash,
                    payload_digest= EXCLUDED.payload_digest,
                    sealed_at     = EXCLUDED.sealed_at,
                    sealed_by     = EXCLUDED.sealed_by,
                    updated_at    = NOW()
            """),
            {
                "id": snapshot_id,
                "period_id": ctx.period_id,
                "root_entity_id": ctx.root_entity_id,
                "hash": snapshot_hash,
                "prev_hash": prev_hash,
                "payload_digest": payload_digest,
                "sealed_at": sealed_at,
                "sealed_by": ctx.closed_by,
            },
        )
        db.commit()

        ctx.snapshot_id = snapshot_id
        ctx.snapshot_hash = snapshot_hash
        logger.info(
            "Snapshot sealed | id=%s hash=%s... period=%s",
            snapshot_id, snapshot_hash[:16], ctx.period_id,
        )

    except Exception as exc:  # noqa: BLE001
        db.rollback()
        logger.exception("seal_snapshot failed: %s", exc)
        raise
