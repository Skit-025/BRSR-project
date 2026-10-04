"""
app/pipelines/aggregation/pipeline.py
Orchestrates the 9-stage boundary aggregation pipeline for a given reporting period.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import uuid4

from sqlalchemy.orm import Session

from app.pipelines.aggregation.stages import (
    stage_01_collect_approved,
    stage_02_normalize_units,
    stage_03_calculate,
    stage_04_apply_boundary,
    stage_05_rollup,
    stage_06_eliminate,
    stage_07_reconcile,
    stage_08_persist_lineage,
    stage_09_refresh_views,
)

logger = logging.getLogger(__name__)


@dataclass
class AggregationContext:
    """Shared state passed through all pipeline stages."""

    run_id: str = field(default_factory=lambda: str(uuid4()))
    period_id: str = ""
    root_entity_id: str = ""
    triggered_by: str = "system"
    dry_run: bool = False

    # Populated progressively by stages
    approved_entries: List[Dict[str, Any]] = field(default_factory=list)
    normalized_entries: List[Dict[str, Any]] = field(default_factory=list)
    calculated_entries: List[Dict[str, Any]] = field(default_factory=list)
    boundary_entries: List[Dict[str, Any]] = field(default_factory=list)
    rolled_up: List[Dict[str, Any]] = field(default_factory=list)
    eliminated: List[Dict[str, Any]] = field(default_factory=list)
    reconciled: List[Dict[str, Any]] = field(default_factory=list)
    lineage_ids: List[str] = field(default_factory=list)

    metrics_processed: int = 0
    entities_included: int = 0
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    started_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


STAGES = [
    ("01_collect_approved",   stage_01_collect_approved),
    ("02_normalize_units",    stage_02_normalize_units),
    ("03_calculate",          stage_03_calculate),
    ("04_apply_boundary",     stage_04_apply_boundary),
    ("05_rollup",             stage_05_rollup),
    ("06_eliminate",          stage_06_eliminate),
    ("07_reconcile",          stage_07_reconcile),
    ("08_persist_lineage",    stage_08_persist_lineage),
    ("09_refresh_views",      stage_09_refresh_views),
]


def run_aggregation_pipeline(
    db: Session,
    period_id: str,
    root_entity_id: str,
    triggered_by: str = "system",
    dry_run: bool = False,
) -> Dict[str, Any]:
    """
    Execute the full 9-stage boundary aggregation pipeline.

    Returns a summary dict with run_id, status, metrics processed, and any errors.
    """
    ctx = AggregationContext(
        period_id=period_id,
        root_entity_id=root_entity_id,
        triggered_by=triggered_by,
        dry_run=dry_run,
    )

    logger.info(
        "Aggregation pipeline started | run_id=%s period=%s entity=%s",
        ctx.run_id, period_id, root_entity_id,
    )

    failed_at: Optional[str] = None
    for stage_name, stage_fn in STAGES:
        try:
            logger.debug("Running stage %s", stage_name)
            stage_fn(ctx, db)
        except Exception as exc:  # noqa: BLE001
            logger.exception("Stage %s failed: %s", stage_name, exc)
            ctx.errors.append(f"{stage_name}: {exc}")
            failed_at = stage_name
            break

    elapsed = (datetime.now(timezone.utc) - ctx.started_at).total_seconds()
    status = "FAILED" if failed_at else "COMPLETED"

    # Persist run record (best-effort, skip in dry-run)
    if not dry_run:
        try:
            _persist_run(db, ctx, status, elapsed)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Could not persist aggregation run record: %s", exc)

    summary = {
        "run_id": ctx.run_id,
        "period_id": period_id,
        "root_entity_id": root_entity_id,
        "status": status,
        "failed_at_stage": failed_at,
        "metrics_processed": ctx.metrics_processed,
        "entities_included": ctx.entities_included,
        "elapsed_seconds": elapsed,
        "errors": ctx.errors,
        "warnings": ctx.warnings,
    }

    logger.info("Aggregation pipeline %s | %s", status, summary)
    return summary


def _persist_run(db: Session, ctx: AggregationContext, status: str, elapsed: float):
    """Store the aggregation run record in the database."""
    from app.pipelines.aggregation.models import AggregationRun

    run = AggregationRun(
        id=ctx.run_id,
        period_id=ctx.period_id,
        root_entity_id=ctx.root_entity_id,
        status=status,
        metrics_processed=ctx.metrics_processed,
        entities_included=ctx.entities_included,
        summary={
            "elapsed_seconds": elapsed,
            "errors": ctx.errors,
            "warnings": ctx.warnings,
        },
    )
    db.add(run)
    db.commit()
