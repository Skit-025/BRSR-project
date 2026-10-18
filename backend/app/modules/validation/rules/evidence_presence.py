"""
app/modules/validation/rules/evidence_presence.py
Validation rule: Mandatory and conditional evidence presence verification.
"""
from typing import Optional, Tuple
from sqlalchemy.orm import Session
from app.modules.metrics.models import Metric, EvidenceRule
from app.modules.evidence.models import EvidenceLink


def validate_evidence_presence(
    db: Session,
    data_point_id: str,
    metric: Metric
) -> Tuple[bool, Optional[str]]:
    """
    Checks if evidence attachment exists when mandatory for the given metric.
    Auto-calculated/derived indicators do not require direct evidence attachments.
    """
    is_calculated = bool(
        metric and (
            metric.calc_formula_code
            or metric.entry_level == "calculated"
            or (metric.code.startswith("ENV-GHG") and "FUEL" not in metric.code)
            or "INTENSITY" in metric.code
        )
    )
    if is_calculated:
        return True, None

    if metric.evidence_rule == EvidenceRule.MANDATORY.value:
        has_link = db.query(EvidenceLink).filter(EvidenceLink.data_point_id == data_point_id).first()
        if not has_link:
            return (
                False,
                f"Mandatory evidence document required for metric '{metric.code}' ({metric.name})."
            )

    return True, None
