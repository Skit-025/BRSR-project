"""
app/pipelines/aggregation/incremental.py
Incremental aggregation: re-runs boundary consolidation for entities/metrics
associated with submissions updated since the last run.
Aligned with PostgreSQL submissions and data_points schema (DEF-CALC-002).
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session
from app.modules.collection.models import Submission, SubmissionStatus
from app.modules.consolidation.models import ConsolidatedValue
from app.modules.consolidation.service import run_consolidation_engine

logger = logging.getLogger(__name__)


def get_dirty_entities(
    db: Session,
    period_id: str,
    since: datetime,
) -> List[str]:
    """
    Return entity IDs that have submission updates since `since`.
    Queries the PostgreSQL submissions table for records updated after `since`.
    """
    rows = (
        db.query(Submission.entity_id)
        .filter(
            Submission.period_id == period_id,
            Submission.is_deleted == False,
            Submission.updated_at >= since,
        )
        .distinct()
        .all()
    )
    return [str(r[0]) for r in rows]


def get_last_successful_run_time(
    db: Session,
    period_id: str,
    root_entity_id: str,
) -> Optional[datetime]:
    """Return the most recent updated_at timestamp of consolidated values for this period."""
    cv = (
        db.query(ConsolidatedValue.updated_at)
        .filter(
            ConsolidatedValue.period_id == period_id,
            ConsolidatedValue.is_deleted == False,
        )
        .order_by(ConsolidatedValue.updated_at.desc())
        .first()
    )
    return cv[0] if cv else None


def run_incremental_aggregation(
    db: Session,
    period_id: str,
    root_entity_id: str,
    triggered_by: str = "incremental_job",
) -> Dict[str, Any]:
    """
    Performs boundary consolidation using the authoritative consolidation engine.
    Guarantees schema alignment with PostgreSQL models.
    """
    last_run_at = get_last_successful_run_time(db, period_id, root_entity_id)

    if last_run_at is not None:
        dirty_entities = get_dirty_entities(db, period_id, last_run_at)
        if not dirty_entities:
            logger.info("No dirty submissions since %s — skipping incremental run.", last_run_at)
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

    # Execute authoritative consolidation engine
    res = run_consolidation_engine(db, period_id=str(period_id), root_node_id=str(root_entity_id))

    return {
        "status": "COMPLETED",
        "period_id": period_id,
        "root_entity_id": root_entity_id,
        "triggered_by": triggered_by,
        "entities_processed": res.consolidated_nodes_count,
        "metrics_processed": res.consolidated_metrics_count,
        "timestamp": res.timestamp,
        "incremental": True,
    }
