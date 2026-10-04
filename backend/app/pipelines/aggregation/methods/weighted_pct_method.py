"""
app/pipelines/aggregation/methods/weighted_pct_method.py
WEIGHTED_PCT roll-up method: Weighted average percentage across entities.
"""
from typing import List, Dict, Any


def aggregate_weighted_pct(items: List[Dict[str, Any]]) -> float:
    """
    Computes sum(child_pct * weight) / sum(weight).
    """
    total_weighted = 0.0
    total_weights = 0.0

    for item in items:
        pct = item.get("percentage", 0.0) or 0.0
        w = item.get("weight", 1.0) or 1.0
        total_weighted += (pct * w)
        total_weights += w

    if total_weights == 0:
        return 0.0

    return round(total_weighted / total_weights, 2)
