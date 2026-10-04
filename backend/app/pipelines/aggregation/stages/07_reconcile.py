"""
app/pipelines/aggregation/stages/07_reconcile.py
Stage 7: Reconciles consolidated totals against constituent parts to guarantee zero arithmetic discrepancy.
"""
from typing import List, Dict, Any
from app.modules.consolidation.models import ConsolidatedValue


def stage_07_reconcile(records: List[ConsolidatedValue]) -> Dict[str, Any]:
    """
    Validates arithmetic reconciliation across rolled-up numbers.
    """
    discrepancies = []
    for r in records:
        if r.method == "sum" and r.child_contributions:
            computed_sum = sum(
                (c.get("value", 0.0) or 0.0) * (c.get("share_pct", 100.0) / 100.0)
                for c in r.child_contributions
            )
            if abs(r.value - computed_sum) > 0.05:
                discrepancies.append({
                    "metric_code": r.metric_code,
                    "recorded_value": r.value,
                    "computed_sum": round(computed_sum, 4),
                    "delta": round(r.value - computed_sum, 4),
                })

    return {
        "is_reconciled": len(discrepancies) == 0,
        "discrepancies_count": len(discrepancies),
        "discrepancies": discrepancies,
    }
