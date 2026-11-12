"""
app/pipelines/reporting/steps/assemble_audit_pack.py
Step 4 – Compile the complete audit pack for SEBI submission and assurance review.
"""
from __future__ import annotations

import hashlib
import json
import logging
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any, Dict, List
from uuid import uuid4

from sqlalchemy import text

if TYPE_CHECKING:
    from sqlalchemy.orm import Session
    from app.pipelines.reporting.pipeline import ReportingContext

logger = logging.getLogger(__name__)


def _load_audit_events(db: "Session", period_id: str, root_entity_id: str) -> List[Dict]:
    """Load relevant audit events for this period and entity subtree."""
    rows = db.execute(
        text("""
            SELECT ae.id, ae.action, ae.actor_id, ae.actor_role,
                   ae.target_type, ae.target_id, ae.record_hash, ae.prev_hash,
                   ae.sequence_number, ae.created_at
            FROM audit_events ae
            WHERE (
                ae.target_id = :period_id
                OR ae.target_id = :root_entity_id
                OR ae.target_id IN (
                    SELECT o.id::text
                    FROM org_nodes o
                    WHERE o.is_deleted = FALSE
                      AND o.path <@ (
                          SELECT path FROM org_nodes WHERE id = CAST(:root_entity_id AS uuid) AND is_deleted = FALSE
                      )
                )
                OR ae.target_id IN (
                    SELECT s.id::text
                    FROM submissions s
                    JOIN org_nodes o ON o.id = s.entity_id
                    WHERE s.period_id = CAST(:period_id AS uuid)
                      AND s.is_deleted = FALSE
                      AND o.is_deleted = FALSE
                      AND o.path <@ (
                          SELECT path FROM org_nodes WHERE id = CAST(:root_entity_id AS uuid) AND is_deleted = FALSE
                      )
                )
                OR ae.target_id IN (
                    SELECT rs.id::text
                    FROM report_snapshots rs
                    WHERE rs.period_id = CAST(:period_id AS uuid)
                      AND rs.entity_id = CAST(:root_entity_id AS uuid)
                      AND rs.is_deleted = FALSE
                )
                OR (ae.details IS NOT NULL AND ae.details->>'period_id' = :period_id)
            )
            ORDER BY ae.sequence_number ASC NULLS LAST, ae.created_at ASC
            LIMIT 5000
        """),
        {"period_id": period_id, "root_entity_id": root_entity_id},
    ).fetchall()
    return [
        {
            "id": str(r[0]),
            "action": r[1],
            "actor_id": str(r[2]) if r[2] else None,
            "actor_role": r[3],
            "target_type": r[4],
            "target_id": str(r[5]) if r[5] else None,
            "resource_type": r[4],
            "resource_id": str(r[5]) if r[5] else None,
            "record_hash": r[6],
            "hash": r[6],
            "prev_hash": r[7],
            "sequence_number": r[8],
            "created_at": r[9].isoformat() if r[9] else None,
        }
        for r in rows
    ]


def _load_validation_exceptions(
    db: "Session",
    period_id: str,
    root_entity_id: str | None = None,
) -> List[Dict]:
    """Load validation exceptions scoped to this period (and optional entity subtree)."""
    sql = """
        SELECT ve.id, ve.submission_id, s.entity_id, ve.metric_code, ve.rule_id,
               ve.severity, ve.description, ve.status, ve.resolution_notes,
               ve.resolved_by, ve.resolved_at, ve.created_at
        FROM validation_exceptions ve
        JOIN submissions s ON s.id = ve.submission_id
        JOIN org_nodes o ON o.id = s.entity_id
        WHERE s.period_id = :period_id
          AND ve.is_deleted = FALSE
          AND s.is_deleted = FALSE
          AND o.is_deleted = FALSE
    """
    params: Dict[str, Any] = {"period_id": period_id}
    if root_entity_id:
        sql += """
          AND o.path <@ (
              SELECT path FROM org_nodes WHERE id = :root_entity_id AND is_deleted = FALSE
          )
        """
        params["root_entity_id"] = root_entity_id

    sql += " ORDER BY ve.created_at ASC"
    rows = db.execute(text(sql), params).fetchall()
    return [
        {
            "id": str(r[0]),
            "submission_id": str(r[1]) if r[1] else None,
            "entity_id": str(r[2]) if r[2] else None,
            "metric_code": r[3],
            "rule_id": r[4],
            "rule_code": r[4],
            "severity": r[5],
            "description": r[6],
            "status": r[7],
            "resolution_notes": r[8],
            "resolved_by": str(r[9]) if r[9] else None,
            "resolved_at": r[10].isoformat() if r[10] else None,
            "created_at": r[11].isoformat() if r[11] else None,
        }
        for r in rows
    ]


def _compute_pack_hash(pack: Dict[str, Any]) -> str:
    """Produce a SHA-256 fingerprint of the assembled audit pack."""
    canonical = json.dumps(pack, sort_keys=True, default=str)
    return hashlib.sha256(canonical.encode()).hexdigest()


def assemble_audit_pack(ctx: "ReportingContext", db: "Session") -> None:
    """
    Compile snapshot metadata, audit event trail, validation exceptions, and
    rendered outputs into a single signed audit pack.
    """
    audit_events = _load_audit_events(db, ctx.period_id, ctx.root_entity_id)
    val_exceptions = _load_validation_exceptions(db, ctx.period_id, ctx.root_entity_id)

    pack: Dict[str, Any] = {
        "pack_id": str(uuid4()),
        "period_id": ctx.period_id,
        "root_entity_id": ctx.root_entity_id,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "snapshot": ctx.snapshot_meta,
        "disclosure_sections_count": len(ctx.disclosure_tree),
        "total_disclosures": sum(
            len(s.get("disclosures", [])) for s in ctx.disclosure_tree
        ),
        "audit_events_count": len(audit_events),
        "audit_events_sample": audit_events[:100],  # first 100 for pack
        "validation_exceptions": val_exceptions,
        "rendered_formats": list(ctx.rendered_outputs.keys()),
        "output_sizes": {
            fmt: len(content) for fmt, content in ctx.rendered_outputs.items()
        },
    }

    pack["pack_hash"] = _compute_pack_hash(pack)

    ctx.audit_pack = pack
    logger.info(
        "Audit pack assembled | pack_id=%s events=%d exceptions=%d hash=%s...",
        pack["pack_id"],
        len(audit_events),
        len(val_exceptions),
        pack["pack_hash"][:16],
    )
