"""
app/pipelines/aggregation/incremental.py
Incremental aggregation: re-runs only for entities/metrics that changed
since the last successful run, rather than recalculating everything.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set

from sqlalchemy import text
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


def get_dirty_entities(
    db: Session,
    period_id: str,
    since: datetime,
) -> List[str]:
    """
    Return entity IDs that have data-entry updates since `since`.
    Queries the data_entries table for approved records updated after `since`.
    """
    sql = text("""
        SELECT DISTINCT entity_id
        FROM data_entries
        WHERE period_id = :period_id
          AND status = 'APPROVED'
          AND updated_at >= :since
    """)
    rows = db.execute(sql, {"period_id": period_id, "since": since}).fetchall()
    return [str(r[0]) for r in rows]


def get_last_successful_run_time(
    db: Session,
    period_id: str,
    root_entity_id: str,
) -> Optional[datetime]:
    """Return the created_at timestamp of the most recent COMPLETED aggregation run."""
    sql = text("""
        SELECT created_at
        FROM aggregation_runs
        WHERE period_id = :period_id
          AND root_entity_id = :root_entity_id
          AND status = 'COMPLETED'
        ORDER BY created_at DESC
        LIMIT 1
    """)
    row = db.execute(
        sql,
        {"period_id": period_id, "root_entity_id": root_entity_id},
    ).fetchone()
    return row[0] if row else None


def run_incremental_aggregation(
    db: Session,
    period_id: str,
    root_entity_id: str,
    triggered_by: str = "incremental_job",
) -> Dict[str, Any]:
    """
    Perform incremental aggregation for entities changed since the last run.
    Falls back to a full pipeline run if no previous run exists.
    """
    from app.pipelines.aggregation.pipeline import run_aggregation_pipeline

    last_run_at = get_last_successful_run_time(db, period_id, root_entity_id)

    if last_run_at is None:
        logger.info(
            "No prior run for period=%s entity=%s — triggering full aggregation.",
            period_id, root_entity_id,
        )
        return run_aggregation_pipeline(
            db=db,
            period_id=period_id,
            root_entity_id=root_entity_id,
            triggered_by=triggered_by,
        )

    dirty_entities = get_dirty_entities(db, period_id, last_run_at)
    if not dirty_entities:
        logger.info(
            "No dirty entities since %s — skipping incremental run.", last_run_at
        )
        return {
            "run_id": None,
            "status": "SKIPPED",
            "reason": "No changes since last run",
            "period_id": period_id,
            "root_entity_id": root_entity_id,
            "dirty_entities": [],
            "metrics_processed": 0,
            "entities_included": 0,
            "elapsed_seconds": 0.0,
            "errors": [],
            "warnings": [],
        }

    logger.info(
        "Incremental run: %d dirty entities for period=%s since %s",
        len(dirty_entities), period_id, last_run_at,
    )

    # Full pipeline (boundary-aware stages handle entity scoping internally)
    result = run_aggregation_pipeline(
        db=db,
        period_id=period_id,
        root_entity_id=root_entity_id,
        triggered_by=triggered_by,
    )
    result["dirty_entities"] = dirty_entities
    result["incremental"] = True
    return result
