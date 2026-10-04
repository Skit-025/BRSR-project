"""
app/pipelines/reporting/steps/load_snapshot.py
Step 1 – Load the sealed snapshot data for report generation.
"""
from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Any, Dict, List

from sqlalchemy import text

if TYPE_CHECKING:
    from sqlalchemy.orm import Session
    from app.pipelines.reporting.pipeline import ReportingContext

logger = logging.getLogger(__name__)


def load_snapshot(ctx: "ReportingContext", db: "Session") -> None:
    """
    Load the sealed snapshot record and associated consolidated metric values
    for the target period and entity.
    """
    try:
        snap_row = db.execute(
            text("""
                SELECT id, hash, prev_hash, payload_digest, sealed_at, sealed_by
                FROM snapshots
                WHERE period_id = :period_id
                  AND root_entity_id = :root_entity_id
                  AND status = 'SEALED'
                ORDER BY sealed_at DESC
                LIMIT 1
            """),
            {
                "period_id": ctx.period_id,
                "root_entity_id": ctx.root_entity_id,
            },
        ).fetchone()

        if snap_row is None:
            ctx.warnings.append(
                f"No sealed snapshot found for period={ctx.period_id} "
                f"entity={ctx.root_entity_id}. Using live approved data."
            )
            snap_meta: Dict[str, Any] = {}
        else:
            snap_meta = {
                "id": str(snap_row[0]),
                "hash": snap_row[1],
                "prev_hash": snap_row[2],
                "payload_digest": snap_row[3],
                "sealed_at": snap_row[4].isoformat() if snap_row[4] else None,
                "sealed_by": snap_row[5],
            }

        ctx.snapshot_meta = snap_meta

        # Load approved/consolidated metric data
        entries: List[Dict[str, Any]] = []
        rows = db.execute(
            text("""
                SELECT de.metric_id, de.entity_id, de.value_numeric,
                       de.value_text, de.unit, de.period_id, de.status,
                       m.code, m.label, m.pillar, m.section, m.sub_section
                FROM data_entries de
                LEFT JOIN metrics m ON m.id = de.metric_id
                WHERE de.period_id = :period_id
                  AND de.status IN ('APPROVED', 'CONSOLIDATED')
                ORDER BY m.section, m.sub_section, m.code
            """),
            {"period_id": ctx.period_id},
        ).fetchall()

        for r in rows:
            entries.append(
                {
                    "metric_id": str(r[0]),
                    "entity_id": str(r[1]),
                    "value_numeric": r[2],
                    "value_text": r[3],
                    "unit": r[4],
                    "period_id": str(r[5]),
                    "status": r[6],
                    "code": r[7],
                    "label": r[8],
                    "pillar": r[9],
                    "section": r[10],
                    "sub_section": r[11],
                }
            )

        ctx.metric_entries = entries
        logger.info(
            "Snapshot loaded | snapshot_id=%s entries=%d",
            snap_meta.get("id", "live"),
            len(entries),
        )

    except Exception as exc:  # noqa: BLE001
        logger.exception("load_snapshot failed: %s", exc)
        raise
