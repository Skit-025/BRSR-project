"""
app/pipelines/aggregation/methods/sum_method.py
SUM roll-up method: Direct weighted sum of child indicator values.
Used for absolute quantities (Energy, Fuel, Scope 1, Scope 2, Water, Waste, Headcount).
"""
from typing import List, Dict, Any


def aggregate_sum(child_contributions: List[Dict[str, Any]]) -> float:
    """
    Computes total = sum(child_value * (share_pct / 100.0))
    """
    total = 0.0
    for c in child_contributions:
        val = c.get("value", 0.0) or 0.0
        share = c.get("share_pct", 100.0) / 100.0
        total += (val * share)
    return round(total, 4)
