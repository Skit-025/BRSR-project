"""
app/pipelines/closing/steps/lock_period.py
Stage 2 – Lock the reporting period to prevent further data-entry modifications.
"""
from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from sqlalchemy import text

if TYPE_CHECKING:
    from sqlalchemy.orm import Session
    from app.pipelines.closing.pipeline import ClosingContext

logger = logging.getLogger(__name__)


def lock_period(ctx: "ClosingContext", db: "Session") -> None:
    """
    Mark the reporting period as LOCKED in the reporting_periods table.
    After this step no data_entries record for this period can be edited.
    """
    try:
        result = db.execute(
            text("""
                UPDATE reporting_periods
                SET status = 'LOCKED',
                    locked_at = NOW(),
                    locked_by = :locked_by,
                    updated_at = NOW()
                WHERE id = :period_id
                  AND status != 'LOCKED'
                RETURNING id
            """),
            {
                "period_id": ctx.period_id,
                "locked_by": ctx.closed_by,
            },
        )
        affected = result.rowcount
        db.commit()

        if affected == 0:
            ctx.warnings.append(
                f"Period {ctx.period_id} was already LOCKED or not found."
            )
            logger.warning(
                "Period %s already locked or not found.", ctx.period_id
            )
        else:
            ctx.period_locked = True
            logger.info("Period %s successfully locked by %s.", ctx.period_id, ctx.closed_by)

    except Exception as exc:  # noqa: BLE001
        db.rollback()
        logger.exception("lock_period failed: %s", exc)
        raise
