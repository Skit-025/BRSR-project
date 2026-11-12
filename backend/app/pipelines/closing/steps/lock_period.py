"""
app/pipelines/closing/steps/lock_period.py
Stage 2 – Lock the reporting period to prevent further data-entry modifications.
"""
from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from sqlalchemy import text

from app.modules.audit.schemas import AuditLogCreate
from app.modules.audit.service import AuditService

if TYPE_CHECKING:
    from sqlalchemy.orm import Session
    from app.pipelines.closing.pipeline import ClosingContext

logger = logging.getLogger(__name__)


def lock_period(ctx: "ClosingContext", db: "Session") -> None:
    """
    Mark the reporting period as LOCKED in the reporting_periods table and
    record an immutable LOCK_PERIOD audit event.
    """
    try:
        result = db.execute(
            text("""
                UPDATE reporting_periods
                SET status = 'LOCKED',
                    updated_at = NOW()
                WHERE id = :period_id
                  AND is_deleted = FALSE
                  AND status != 'LOCKED'
                RETURNING id, code, status
            """),
            {"period_id": ctx.period_id},
        )
        locked_row = result.fetchone()

        if locked_row is None:
            existing = db.execute(
                text("""
                    SELECT status
                    FROM reporting_periods
                    WHERE id = :period_id
                      AND is_deleted = FALSE
                """),
                {"period_id": ctx.period_id},
            ).fetchone()
            db.commit()

            if existing and existing[0] == "LOCKED":
                ctx.period_locked = True
                ctx.warnings.append(f"Period {ctx.period_id} was already LOCKED.")
                logger.warning("Period %s already locked.", ctx.period_id)
                return

            ctx.period_locked = False
            raise ValueError(f"Reporting period '{ctx.period_id}' was not found or is deleted.")

        AuditService(db).log_event(
            AuditLogCreate(
                action="LOCK_PERIOD",
                actor_id=str(ctx.closed_by)[:64] if ctx.closed_by else None,
                target_type="REPORTING_PERIOD",
                target_id=str(ctx.period_id)[:64],
                changes={"status": {"from": "OPEN", "to": "LOCKED"}},
                details={
                    "period_id": ctx.period_id,
                    "period_code": locked_row[1],
                    "root_entity_id": ctx.root_entity_id,
                    "closed_by": ctx.closed_by,
                    "closing_run_id": ctx.run_id,
                },
            )
        )
        ctx.period_locked = True
        logger.info("Period %s successfully locked by %s.", ctx.period_id, ctx.closed_by)

    except Exception as exc:  # noqa: BLE001
        db.rollback()
        logger.exception("lock_period failed: %s", exc)
        raise
