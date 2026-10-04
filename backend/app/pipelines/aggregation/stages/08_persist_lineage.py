"""
app/pipelines/aggregation/stages/08_persist_lineage.py
Stage 8: Persists complete aggregation run into ledger and audit logs.
"""
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.pipelines.aggregation.models import AggregationRun
from app.modules.audit.service import AuditService
from app.modules.audit.schemas import AuditLogCreate
from app.modules.audit.actions import AuditAction


def stage_08_persist_lineage(
    db: Session,
    period_id: str,
    root_entity_id: str,
    reconciliation_summary: Dict[str, Any],
    metrics_count: int,
) -> AggregationRun:
    """Logs the completed rollup run."""
    run_record = AggregationRun(
        period_id=period_id,
        root_entity_id=root_entity_id,
        status="COMPLETED" if reconciliation_summary.get("is_reconciled") else "RECONCILED_WITH_WARNINGS",
        metrics_processed=metrics_count,
        summary=reconciliation_summary,
    )
    db.add(run_record)
    db.commit()
    db.refresh(run_record)

    # Log into cryptographic audit trail
    audit_service = AuditService(db)
    audit_service.log_event(
        AuditLogCreate(
            action=AuditAction.AGGREGATION_RUN.value,
            actor_id="SYSTEM_PIPELINE",
            target_type="aggregation_run",
            target_id=run_record.id,
            details={"period_id": period_id, "root_entity_id": root_entity_id, "metrics_count": metrics_count},
        )
    )

    return run_record
