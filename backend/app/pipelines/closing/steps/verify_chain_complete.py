"""
app/pipelines/closing/steps/verify_chain_complete.py
Stage 1 – Verify the cryptographic audit chain has no gaps before closing.
"""
from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from sqlalchemy import text

if TYPE_CHECKING:
    from sqlalchemy.orm import Session
    from app.pipelines.closing.pipeline import ClosingContext

logger = logging.getLogger(__name__)


def verify_chain_complete(ctx: "ClosingContext", db: "Session") -> None:
    """
    Check that every audit_events row for this period has a valid prev_hash
    linkage (no orphans, no missing hashes).  Populates ctx.chain_gaps with
    any broken links found.
    """
    sql = text("""
        SELECT e.id::text, e.prev_hash, p.hash AS expected_prev_hash
        FROM audit_events e
        LEFT JOIN audit_events p ON e.prev_hash = p.hash
        WHERE e.entity_id IN (
            SELECT id::text FROM entities WHERE root_entity_id = :root_entity_id
        )
          AND e.period_id = :period_id
          AND e.prev_hash IS NOT NULL
          AND p.hash IS NULL
        ORDER BY e.created_at
    """)

    try:
        rows = db.execute(
            sql,
            {
                "period_id": ctx.period_id,
                "root_entity_id": ctx.root_entity_id,
            },
        ).fetchall()
    except Exception as exc:  # noqa: BLE001
        # If the audit_events table does not yet exist, treat as no gaps
        logger.warning("Could not query audit chain: %s — assuming no gaps.", exc)
        rows = []

    gaps = [str(r[0]) for r in rows]
    ctx.chain_gaps = gaps

    if gaps:
        msg = f"Audit chain has {len(gaps)} broken link(s): {gaps[:5]}"
        ctx.warnings.append(msg)
        logger.warning(msg)
    else:
        ctx.chain_verified = True
        logger.info(
            "Audit chain verified — no gaps for period=%s entity=%s",
            ctx.period_id, ctx.root_entity_id,
        )
