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


def _derive_pillar(code: str, category: str | None, section: str | None) -> str:
    """Map real Metric columns (code, category, section) to BRSR_SECTION_MAP keys."""
    cat = (category or "").strip().lower()
    sec = (section or "").strip().upper()
    code_up = (code or "").strip().upper()

    if cat == "social":
        return "SOCIAL"
    if cat == "governance":
        return "GOVERNANCE"
    if cat == "environment":
        if "GHG" in code_up:
            return "GHG"
        if "ENERGY" in code_up:
            return "ENERGY"
        if "WATER" in code_up:
            return "WATER"
        if "WASTE" in code_up:
            return "WASTE"
        return "C_ENV"
    if sec in ("A", "SECTION A"):
        return "A"
    if sec in ("B", "SECTION B"):
        return "B"
    return cat.upper() or sec or "GENERAL"


def load_snapshot(ctx: "ReportingContext", db: "Session") -> None:
    """
    Load the sealed snapshot record from report_snapshots and associated approved
    metric data_points for the target period and entity subtree.
    """
    try:
        snap_row = db.execute(
            text("""
                SELECT id,
                       sha256_hash,
                       metadata_json->>'prev_hash' AS prev_hash,
                       metadata_json->>'payload_digest' AS payload_digest,
                       sealed_at,
                       sealed_by
                FROM report_snapshots
                WHERE period_id = :period_id
                  AND entity_id = :root_entity_id
                  AND is_sealed = TRUE
                  AND is_deleted = FALSE
                ORDER BY version DESC, sealed_at DESC NULLS LAST, created_at DESC
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

        # Load approved/consolidated metric data from data_points + submissions + metrics
        entries: List[Dict[str, Any]] = []
        rows = db.execute(
            text("""
                SELECT COALESCE(m.id::text, dp.metric_code) AS metric_id,
                       s.entity_id::text,
                       COALESCE(dp.normalized_value, dp.value_numeric) AS value_numeric,
                       dp.value_text,
                       COALESCE(m.base_unit, dp.unit) AS unit,
                       s.period_id::text,
                       s.status,
                       dp.metric_code,
                       COALESCE(m.name, dp.metric_code) AS label,
                       m.category,
                       COALESCE(m.section, 'Section C') AS section,
                       COALESCE(m.core_attribute, 'General') AS sub_section
                FROM data_points dp
                JOIN submissions s ON s.id = dp.submission_id
                JOIN org_nodes o ON o.id = s.entity_id
                LEFT JOIN metrics m ON m.code = dp.metric_code AND m.is_deleted = FALSE
                WHERE s.period_id = :period_id
                  AND s.is_deleted = FALSE
                  AND dp.is_deleted = FALSE
                  AND o.is_deleted = FALSE
                  AND o.path <@ (
                      SELECT path FROM org_nodes WHERE id = :root_entity_id AND is_deleted = FALSE
                  )
                  AND s.status IN (
                      'PROJECT_APPROVED',
                      'BU_APPROVED',
                      'SUBSIDIARY_APPROVED',
                      'CONSOLIDATED',
                      'LOCKED'
                  )
                ORDER BY COALESCE(m.section, 'Section C'), COALESCE(m.core_attribute, 'General'), dp.metric_code
            """),
            {"period_id": ctx.period_id, "root_entity_id": ctx.root_entity_id},
        ).fetchall()

        for r in rows:
            code = r[7]
            category = r[9]
            section = r[10]
            entries.append(
                {
                    "metric_id": str(r[0]),
                    "entity_id": str(r[1]),
                    "value_numeric": float(r[2]) if r[2] is not None else None,
                    "value_text": r[3],
                    "unit": r[4],
                    "period_id": str(r[5]),
                    "status": r[6],
                    "code": code,
                    "label": r[8],
                    "pillar": _derive_pillar(code, category, section),
                    "section": section,
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
