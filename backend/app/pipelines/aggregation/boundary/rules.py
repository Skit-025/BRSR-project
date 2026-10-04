"""
app/pipelines/aggregation/boundary/rules.py
Consolidation boundary rules: Operational Control (100%), Financial Control (100%), Equity Share (% share).
"""
from typing import Tuple
from app.modules.org.models import OrgNode, ControlType


def resolve_consolidation_rule(node: OrgNode) -> Tuple[bool, float]:
    """
    Returns (is_included: bool, effective_weight: float)
    - If boundary == False, excluded (0.0)
    - Operational Control -> 100.0%
    - Financial Control -> 100.0%
    - Equity Share -> node.ownership_pct
    """
    if not node.boundary or not node.is_active:
        return False, 0.0

    if node.control_type in [ControlType.OPERATIONAL_CONTROL.value, ControlType.FINANCIAL_CONTROL.value]:
        return True, 100.0
    elif node.control_type == ControlType.EQUITY_SHARE.value:
        return True, float(node.ownership_pct)

    return True, 100.0
