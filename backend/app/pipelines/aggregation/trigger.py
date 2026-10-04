"""
app/pipelines/aggregation/trigger.py
Event-driven trigger for the aggregation pipeline.
Supports HTTP webhooks, background job scheduling, and direct invocation.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/pipelines/aggregation", tags=["Aggregation Pipeline"])


class TriggerRequest(BaseModel):
    period_id: str
    root_entity_id: str
    triggered_by: Optional[str] = "api"
    dry_run: bool = False


class TriggerResponse(BaseModel):
    run_id: str
    status: str
    metrics_processed: int
    entities_included: int
    elapsed_seconds: float
    errors: list[str]
    warnings: list[str]


@router.post(
    "/trigger",
    response_model=TriggerResponse,
    summary="Trigger boundary aggregation pipeline",
    description=(
        "Starts a full 9-stage boundary rollup for the specified reporting period "
        "and root entity. Runs synchronously; use the background task API for "
        "asynchronous scheduling."
    ),
)
def trigger_aggregation(
    payload: TriggerRequest,
    db: Session = Depends(get_db),
) -> TriggerResponse:
    from app.pipelines.aggregation.pipeline import run_aggregation_pipeline

    try:
        result = run_aggregation_pipeline(
            db=db,
            period_id=payload.period_id,
            root_entity_id=payload.root_entity_id,
            triggered_by=payload.triggered_by or "api",
            dry_run=payload.dry_run,
        )
        return TriggerResponse(**{k: result[k] for k in TriggerResponse.model_fields})
    except Exception as exc:  # noqa: BLE001
        logger.exception("Aggregation trigger error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Pipeline execution error: {exc}",
        )


@router.get(
    "/runs",
    summary="List recent aggregation runs",
)
def list_aggregation_runs(
    limit: int = 20,
    period_id: Optional[str] = None,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    from app.pipelines.aggregation.models import AggregationRun
    from sqlalchemy import desc

    q = db.query(AggregationRun).order_by(desc(AggregationRun.created_at))
    if period_id:
        q = q.filter(AggregationRun.period_id == period_id)
    runs = q.limit(limit).all()

    return {
        "total": len(runs),
        "runs": [
            {
                "id": str(r.id),
                "period_id": r.period_id,
                "root_entity_id": r.root_entity_id,
                "status": r.status,
                "metrics_processed": r.metrics_processed,
                "entities_included": r.entities_included,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in runs
        ],
    }
