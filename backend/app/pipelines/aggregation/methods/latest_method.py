"""
app/pipelines/aggregation/methods/latest_method.py
LATEST roll-up method: Takes the most recent snapshot value.
Used for point-in-time states (e.g. employee headcount at year end, ISO certification status).
"""
from typing import List, Dict, Any, Optional


def aggregate_latest(child_contributions: List[Dict[str, Any]]) -> Optional[Any]:
    """
    Returns the value with the latest timestamp.
    """
    if not child_contributions:
        return None
    # Sort by timestamp descending
    sorted_items = sorted(
        child_contributions,
        key=lambda x: x.get("timestamp", ""),
        reverse=True
    )
    return sorted_items[0].get("value")
