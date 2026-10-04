"""
app/pipelines/orchestrator.py
Central pipeline orchestrator: coordinates aggregation, closing, and reporting pipelines.
Provides a unified interface for triggering multi-phase workflows.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


class PipelineOrchestrator:
    """
    Coordinates multi-pipeline workflows for ESG reporting lifecycle:
      1. Aggregation  – boundary rollup of metric values
      2. Closing      – period lock + snapshot seal
      3. Reporting    – disclosure rendering + audit pack
    """

    def __init__(self, db: Session):
        self.db = db

    # ------------------------------------------------------------------
    # Individual pipeline runners
    # ------------------------------------------------------------------

    def run_aggregation(
        self,
        period_id: str,
        root_entity_id: str,
        triggered_by: str = "orchestrator",
        dry_run: bool = False,
    ) -> Dict[str, Any]:
        """Run the 9-stage boundary aggregation pipeline."""
        from app.pipelines.aggregation.pipeline import run_aggregation_pipeline

        return run_aggregation_pipeline(
            db=self.db,
            period_id=period_id,
            root_entity_id=root_entity_id,
            triggered_by=triggered_by,
            dry_run=dry_run,
        )

    def run_incremental_aggregation(
        self,
        period_id: str,
        root_entity_id: str,
    ) -> Dict[str, Any]:
        """Run incremental aggregation (only dirty entities)."""
        from app.pipelines.aggregation.incremental import run_incremental_aggregation

        return run_incremental_aggregation(
            db=self.db,
            period_id=period_id,
            root_entity_id=root_entity_id,
            triggered_by="orchestrator_incremental",
        )

    def run_closing(
        self,
        period_id: str,
        root_entity_id: str,
        closed_by: str = "orchestrator",
    ) -> Dict[str, Any]:
        """Run the period-closing pipeline."""
        from app.pipelines.closing.pipeline import run_closing_pipeline

        return run_closing_pipeline(
            db=self.db,
            period_id=period_id,
            root_entity_id=root_entity_id,
            closed_by=closed_by,
        )

    def run_reporting(
        self,
        period_id: str,
        root_entity_id: str,
        requested_by: str = "orchestrator",
        output_formats: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """Run the 4-stage reporting generation pipeline."""
        from app.pipelines.reporting.pipeline import run_reporting_pipeline

        return run_reporting_pipeline(
            db=self.db,
            period_id=period_id,
            root_entity_id=root_entity_id,
            requested_by=requested_by,
            output_formats=output_formats,
        )

    # ------------------------------------------------------------------
    # Full lifecycle workflow
    # ------------------------------------------------------------------

    def run_full_lifecycle(
        self,
        period_id: str,
        root_entity_id: str,
        actor: str = "orchestrator",
        output_formats: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Execute the complete ESG reporting lifecycle in sequence:
          Aggregation → Closing → Reporting

        Aborts on the first stage failure and returns a combined summary.
        """
        logger.info(
            "Full lifecycle started | period=%s entity=%s actor=%s",
            period_id, root_entity_id, actor,
        )

        results: Dict[str, Any] = {
            "period_id": period_id,
            "root_entity_id": root_entity_id,
            "actor": actor,
            "stages": {},
        }

        # Stage 1: Aggregation
        agg_result = self.run_aggregation(period_id, root_entity_id, triggered_by=actor)
        results["stages"]["aggregation"] = agg_result
        if agg_result.get("status") != "COMPLETED":
            results["status"] = "FAILED"
            results["failed_at"] = "aggregation"
            logger.error("Full lifecycle aborted at aggregation stage.")
            return results

        # Stage 2: Closing
        close_result = self.run_closing(period_id, root_entity_id, closed_by=actor)
        results["stages"]["closing"] = close_result
        if close_result.get("status") != "CLOSED":
            results["status"] = "FAILED"
            results["failed_at"] = "closing"
            logger.error("Full lifecycle aborted at closing stage.")
            return results

        # Stage 3: Reporting
        report_result = self.run_reporting(
            period_id, root_entity_id, requested_by=actor, output_formats=output_formats
        )
        results["stages"]["reporting"] = report_result
        if report_result.get("status") != "COMPLETED":
            results["status"] = "FAILED"
            results["failed_at"] = "reporting"
            logger.error("Full lifecycle aborted at reporting stage.")
            return results

        results["status"] = "COMPLETED"
        results["audit_pack_id"] = report_result.get("audit_pack_id")
        results["audit_pack_hash"] = report_result.get("audit_pack_hash")
        logger.info("Full lifecycle COMPLETED | period=%s entity=%s", period_id, root_entity_id)
        return results
