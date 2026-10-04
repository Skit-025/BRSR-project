"""
app/pipelines/aggregation/methods/non_aggregable.py
NON_AGGREGABLE roll-up handler: Indicators that cannot be arithmetically rolled up.
Retains discrete entity breakdowns rather than summing (e.g. narrative policies, site names).
"""
from typing import List, Dict, Any


def format_non_aggregable(child_contributions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Returns array of individual entity entries without arithmetic consolidation.
    """
    return [
        {
            "entity_id": c.get("entity_id"),
            "entity_name": c.get("entity_name"),
            "value": c.get("value"),
        }
        for c in child_contributions
    ]
