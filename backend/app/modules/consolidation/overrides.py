"""
app/modules/consolidation/overrides.py
Audited manual override mechanics for consolidated numbers.
Preserves original computed values and logs overrides in audit trail.
"""
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.modules.consolidation.models import ConsolidatedValue
from app.modules.audit.service import AuditService
from app.modules.audit.schemas import AuditLogCreate
from app.modules.audit.actions import AuditAction


def apply_consolidation_override(
    db: Session,
    entity_id: str,
    period_id: str,
    metric_code: str,
    new_value: float,
    justification: str,
    overridden_by_id: str,
    overridden_by_email: Optional[str] = None,
) -> ConsolidatedValue:
    """
    Applies an audited executive override to a consolidated figure.
    """
    record = (
        db.query(ConsolidatedValue)
        .filter(
            ConsolidatedValue.entity_id == entity_id,
            ConsolidatedValue.period_id == period_id,
            ConsolidatedValue.metric_code == metric_code,
            ConsolidatedValue.is_deleted == False,
        )
        .first()
    )
    if not record:
        raise ValueError(f"Consolidated value not found for entity {entity_id}, metric {metric_code}, period {period_id}.")

    old_value = record.value
    record.value = new_value
    record.version += 1

    # Record in child_contributions audit metadata
    contribs = list(record.child_contributions or [])
    contribs.append({
        "override": True,
        "previous_value": old_value,
        "new_value": new_value,
        "justification": justification,
        "overridden_by": overridden_by_id,
    })
    record.child_contributions = contribs
    db.commit()
    db.refresh(record)

    # Log into immutable audit trail
    audit_service = AuditService(db)
    audit_service.log_event(
        AuditLogCreate(
            action=AuditAction.CONSOLIDATION_OVERRIDE.value,
            actor_id=overridden_by_id,
            actor_email=overridden_by_email,
            target_type="consolidated_value",
            target_id=record.id,
            changes={"old_value": old_value, "new_value": new_value, "justification": justification},
            details={"entity_id": entity_id, "period_id": period_id, "metric_code": metric_code},
        )
    )

    return record
