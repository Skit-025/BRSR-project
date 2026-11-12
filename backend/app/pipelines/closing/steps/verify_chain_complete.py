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


GENESIS_HASH = "0" * 64


def verify_chain_complete(ctx: "ClosingContext", db: "Session") -> None:
    """
    Check that every audit_events row has a valid record_hash and prev_hash
    linkage (no orphans, no missing hashes). Populates ctx.chain_gaps with
    any broken links found. Database errors propagate so chain integrity is
    never assumed on failure.
    """
    sql = text("""
        SELECT e.id::text, e.prev_hash, p.record_hash AS expected_prev_hash
        FROM audit_events e
        LEFT JOIN audit_events p ON e.prev_hash = p.record_hash
        WHERE e.prev_hash IS NULL
           OR e.record_hash IS NULL
           OR e.record_hash = ''
           OR (e.prev_hash <> :genesis_hash AND p.record_hash IS NULL)
        ORDER BY e.sequence_number ASC NULLS LAST, e.created_at ASC
    """)

    rows = db.execute(sql, {"genesis_hash": GENESIS_HASH}).fetchall()

    gaps = [str(r[0]) for r in rows]
    ctx.chain_gaps = gaps

    if gaps:
        ctx.chain_verified = False
        msg = f"Audit chain has {len(gaps)} broken link(s): {gaps[:5]}"
        ctx.warnings.append(msg)
        logger.warning(msg)
    else:
        ctx.chain_verified = True
        logger.info(
            "Audit chain verified — no gaps for period=%s entity=%s",
            ctx.period_id, ctx.root_entity_id,
        )
