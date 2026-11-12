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

from app.modules.audit.schemas import AuditLogCreate
from app.modules.audit.service import AuditService
from app.modules.snapshots.builder import build_snapshot_payload
from app.modules.snapshots.models import ReportSnapshot

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
    Build a stable digest from all approved data_points values for this period
    within the root entity's organizational subtree.
    """
    rows = db.execute(
        text("""
            SELECT dp.metric_code,
                   s.entity_id::text,
                   COALESCE(dp.normalized_value, dp.value_numeric),
                   dp.value_text,
                   COALESCE(m.base_unit, dp.unit)
            FROM data_points dp
            JOIN submissions s ON s.id = dp.submission_id
            JOIN org_nodes o ON o.id = s.entity_id
            LEFT JOIN metrics m ON m.code = dp.metric_code AND m.is_deleted = FALSE
            WHERE s.period_id = :period_id
              AND s.is_deleted = FALSE
              AND dp.is_deleted = FALSE
              AND o.is_deleted = FALSE
              AND o.path <@ (
                  SELECT path FROM org_nodes WHERE id = :root_entity_id AND is_deleted = FALSE
              )
              AND s.status IN (
                  'PROJECT_APPROVED',
                  'BU_APPROVED',
                  'SUBSIDIARY_APPROVED',
                  'CONSOLIDATED',
                  'LOCKED'
              )
            ORDER BY dp.metric_code ASC, s.entity_id ASC
        """),
        {"period_id": period_id, "root_entity_id": root_entity_id},
    ).fetchall()

    payload = json.dumps(
        [
            {"m": str(r[0]), "e": str(r[1]), "n": str(r[2]), "t": str(r[3]), "u": str(r[4])}
            for r in rows
        ],
        sort_keys=True,
    )
    return hashlib.sha256(payload.encode()).hexdigest()


def _get_previous_snapshot_hash(
    db: "Session", period_id: str, root_entity_id: str
) -> str | None:
    """Return the sha256_hash of the last sealed snapshot for this entity."""
    row = db.execute(
        text("""
            SELECT sha256_hash
            FROM report_snapshots
            WHERE entity_id = :root_entity_id
              AND is_sealed = TRUE
              AND is_deleted = FALSE
            ORDER BY sealed_at DESC NULLS LAST, created_at DESC, version DESC
            LIMIT 1
        """),
        {"root_entity_id": root_entity_id},
    ).fetchone()
    return row[0] if row else None


def seal_snapshot(ctx: "ClosingContext", db: "Session") -> None:
    """
    Compute the final chained snapshot hash and persist an immutable
    ReportSnapshot record in report_snapshots.
    """
    sealed_at = datetime.now(timezone.utc)
    snapshot_id = str(uuid4())

    try:
        data_payload, _ = build_snapshot_payload(db, ctx.root_entity_id, ctx.period_id)
        payload_digest = _get_payload_digest(db, ctx.period_id, ctx.root_entity_id)
        prev_hash = _get_previous_snapshot_hash(db, ctx.period_id, ctx.root_entity_id)

        snapshot_hash = _compute_snapshot_hash(
            period_id=ctx.period_id,
            root_entity_id=ctx.root_entity_id,
            prev_hash=prev_hash,
            payload_digest=payload_digest,
            sealed_at=sealed_at,
        )

        next_version = db.execute(
            text("""
                SELECT COALESCE(MAX(version), 0) + 1
                FROM report_snapshots
                WHERE period_id = :period_id
                  AND entity_id = :root_entity_id
                  AND is_deleted = FALSE
            """),
            {"period_id": ctx.period_id, "root_entity_id": ctx.root_entity_id},
        ).scalar() or 1

        period_code = data_payload.get("period", {}).get("code") or ctx.period_id[:8]
        snapshot = ReportSnapshot(
            id=snapshot_id,
            period_id=ctx.period_id,
            entity_id=ctx.root_entity_id,
            snapshot_name=f"Closing Snapshot - {period_code} (v{next_version})",
            version=int(next_version),
            is_sealed=True,
            sealed_at=sealed_at,
            sealed_by=str(ctx.closed_by)[:64] if ctx.closed_by else None,
            sha256_hash=snapshot_hash,
            data_payload=data_payload,
            metadata_json={
                "prev_hash": prev_hash,
                "payload_digest": payload_digest,
                "closing_run_id": ctx.run_id,
                "closed_by": ctx.closed_by,
            },
        )
        db.add(snapshot)
        AuditService(db).log_event(
            AuditLogCreate(
                action="SEAL_SNAPSHOT",
                actor_id=str(ctx.closed_by)[:64] if ctx.closed_by else None,
                target_type="REPORT_SNAPSHOT",
                target_id=snapshot_id,
                changes={"is_sealed": {"from": False, "to": True}, "sha256_hash": snapshot_hash},
                details={
                    "period_id": ctx.period_id,
                    "root_entity_id": ctx.root_entity_id,
                    "version": int(next_version),
                    "prev_hash": prev_hash,
                    "payload_digest": payload_digest,
                    "closing_run_id": ctx.run_id,
                },
            )
        )

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
