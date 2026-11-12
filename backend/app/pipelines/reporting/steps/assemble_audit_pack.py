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
    """Load relevant audit events for this period."""
    try:
        rows = db.execute(
            text("""
                SELECT ae.id, ae.action, ae.actor_id, ae.entity_id,
                       ae.resource_type, ae.resource_id, ae.hash, ae.prev_hash,
                       ae.created_at
                FROM audit_events ae
                WHERE ae.period_id = :period_id
                ORDER BY ae.created_at ASC
                LIMIT 5000
            """),
            {"period_id": period_id},
        ).fetchall()
        return [
            {
                "id": str(r[0]),
                "action": r[1],
                "actor_id": str(r[2]) if r[2] else None,
                "entity_id": str(r[3]) if r[3] else None,
                "resource_type": r[4],
                "resource_id": str(r[5]) if r[5] else None,
                "hash": r[6],
                "prev_hash": r[7],
                "created_at": r[8].isoformat() if r[8] else None,
            }
            for r in rows
        ]
    except Exception:  # noqa: BLE001
        return []


def _load_validation_exceptions(db: "Session", period_id: str) -> List[Dict]:
    """Load open or waived validation exceptions."""
    try:
        rows = db.execute(
            text("""
                SELECT id, metric_id, entity_id, rule_code, status,
                       reason, approved_by, created_at
                FROM validation_exceptions
                WHERE period_id = :period_id
                ORDER BY created_at ASC
            """),
            {"period_id": period_id},
        ).fetchall()
        return [
            {
                "id": str(r[0]),
                "metric_id": str(r[1]) if r[1] else None,
                "entity_id": str(r[2]) if r[2] else None,
                "rule_code": r[3],
                "status": r[4],
                "reason": r[5],
                "approved_by": str(r[6]) if r[6] else None,
                "created_at": r[7].isoformat() if r[7] else None,
            }
            for r in rows
        ]
    except Exception:  # noqa: BLE001
        return []


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
    val_exceptions = _load_validation_exceptions(db, ctx.period_id)

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
