"""
app/pipelines/closing/pipeline.py
Period-Closing Pipeline: locks the reporting period, seals the cryptographic
snapshot chain, and verifies complete lineage before final submission.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import uuid4

from sqlalchemy.orm import Session

from app.pipelines.closing.steps.verify_chain_complete import verify_chain_complete
from app.pipelines.closing.steps.lock_period import lock_period
from app.pipelines.closing.steps.seal_snapshot import seal_snapshot

logger = logging.getLogger(__name__)


@dataclass
class ClosingContext:
    """Shared state for the period-closing pipeline."""

    run_id: str = field(default_factory=lambda: str(uuid4()))
    period_id: str = ""
    root_entity_id: str = ""
    closed_by: str = "system"

    # Stage outputs
    chain_verified: bool = False
    chain_gaps: List[str] = field(default_factory=list)
    period_locked: bool = False
    snapshot_hash: Optional[str] = None
    snapshot_id: Optional[str] = None

    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    started_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


CLOSING_STAGES = [
    ("verify_chain_complete", verify_chain_complete),
    ("lock_period",           lock_period),
    ("seal_snapshot",         seal_snapshot),
]


def run_closing_pipeline(
    db: Session,
    period_id: str,
    root_entity_id: str,
    closed_by: str = "system",
) -> Dict[str, Any]:
    """
    Execute the period-closing pipeline.
    1. Verify audit-chain completeness
    2. Lock the reporting period (no further edits allowed)
    3. Seal the immutable snapshot with a chained SHA-256 hash

    Returns a summary dict.
    """
    ctx = ClosingContext(
        period_id=period_id,
        root_entity_id=root_entity_id,
        closed_by=closed_by,
    )

    logger.info(
        "Closing pipeline started | run_id=%s period=%s entity=%s closed_by=%s",
        ctx.run_id, period_id, root_entity_id, closed_by,
    )

    failed_at: Optional[str] = None
    for stage_name, stage_fn in CLOSING_STAGES:
        try:
            logger.debug("Closing stage: %s", stage_name)
            stage_fn(ctx, db)
        except Exception as exc:  # noqa: BLE001
            logger.exception("Closing stage %s failed: %s", stage_name, exc)
            ctx.errors.append(f"{stage_name}: {exc}")
            failed_at = stage_name
            break

    elapsed = (datetime.now(timezone.utc) - ctx.started_at).total_seconds()
    status = "FAILED" if failed_at else "CLOSED"

    summary = {
        "run_id": ctx.run_id,
        "period_id": period_id,
        "root_entity_id": root_entity_id,
        "status": status,
        "failed_at_stage": failed_at,
        "chain_verified": ctx.chain_verified,
        "chain_gaps": ctx.chain_gaps,
        "period_locked": ctx.period_locked,
        "snapshot_id": ctx.snapshot_id,
        "snapshot_hash": ctx.snapshot_hash,
        "elapsed_seconds": elapsed,
        "closed_by": closed_by,
        "errors": ctx.errors,
        "warnings": ctx.warnings,
    }

    logger.info("Closing pipeline %s | %s", status, summary)
    return summary
