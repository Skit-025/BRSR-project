"""
app/pipelines/reporting/pipeline.py
Reporting Generation Pipeline: loads snapshot, maps disclosures, renders documents,
and compiles the SEBI/assurance audit pack.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import uuid4

from sqlalchemy.orm import Session

from app.pipelines.reporting.steps.load_snapshot import load_snapshot
from app.pipelines.reporting.steps.map_disclosures import map_disclosures
from app.pipelines.reporting.steps.render_documents import render_documents
from app.pipelines.reporting.steps.assemble_audit_pack import assemble_audit_pack

logger = logging.getLogger(__name__)


@dataclass
class ReportingContext:
    """Shared state for the reporting generation pipeline."""

    run_id: str = field(default_factory=lambda: str(uuid4()))
    period_id: str = ""
    root_entity_id: str = ""
    requested_by: str = "system"
    output_formats: List[str] = field(default_factory=lambda: ["json", "csv", "html"])

    # Stage outputs
    snapshot_meta: Dict[str, Any] = field(default_factory=dict)
    metric_entries: List[Dict[str, Any]] = field(default_factory=list)
    disclosure_tree: List[Dict[str, Any]] = field(default_factory=list)
    rendered_outputs: Dict[str, str] = field(default_factory=dict)
    audit_pack: Dict[str, Any] = field(default_factory=dict)

    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    started_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


REPORTING_STAGES = [
    ("load_snapshot",      load_snapshot),
    ("map_disclosures",    map_disclosures),
    ("render_documents",   render_documents),
    ("assemble_audit_pack", assemble_audit_pack),
]


def run_reporting_pipeline(
    db: Session,
    period_id: str,
    root_entity_id: str,
    requested_by: str = "system",
    output_formats: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Execute the full 4-stage reporting generation pipeline.

    Returns a summary with rendered outputs and the assembled audit pack.
    """
    ctx = ReportingContext(
        period_id=period_id,
        root_entity_id=root_entity_id,
        requested_by=requested_by,
        output_formats=output_formats or ["json", "csv", "html"],
    )

    logger.info(
        "Reporting pipeline started | run_id=%s period=%s entity=%s formats=%s",
        ctx.run_id, period_id, root_entity_id, ctx.output_formats,
    )

    failed_at: Optional[str] = None
    for stage_name, stage_fn in REPORTING_STAGES:
        try:
            logger.debug("Reporting stage: %s", stage_name)
            stage_fn(ctx, db)
        except Exception as exc:  # noqa: BLE001
            logger.exception("Reporting stage %s failed: %s", stage_name, exc)
            ctx.errors.append(f"{stage_name}: {exc}")
            failed_at = stage_name
            break

    elapsed = (datetime.now(timezone.utc) - ctx.started_at).total_seconds()
    status = "FAILED" if failed_at else "COMPLETED"

    summary = {
        "run_id": ctx.run_id,
        "period_id": period_id,
        "root_entity_id": root_entity_id,
        "status": status,
        "failed_at_stage": failed_at,
        "snapshot": ctx.snapshot_meta,
        "sections_count": len(ctx.disclosure_tree),
        "total_disclosures": sum(len(s.get("disclosures", [])) for s in ctx.disclosure_tree),
        "output_formats": list(ctx.rendered_outputs.keys()),
        "rendered_outputs": ctx.rendered_outputs,
        "audit_pack_id": ctx.audit_pack.get("pack_id"),
        "audit_pack_hash": ctx.audit_pack.get("pack_hash"),
        "elapsed_seconds": elapsed,
        "errors": ctx.errors,
        "warnings": ctx.warnings,
    }

    logger.info("Reporting pipeline %s | run=%s elapsed=%.2fs", status, ctx.run_id, elapsed)
    return summary
