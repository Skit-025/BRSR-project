"""
app/pipelines/aggregation/methods/ratio_method.py
RATIO roll-up method: Roll-up numerator sum divided by denominator sum.
Never averages individual ratios directly (avoids Simpson's paradox).
"""
from typing import Optional


def aggregate_ratio(
    consolidated_numerator: float,
    consolidated_denominator: float,
    multiplier: float = 1.0,
) -> Optional[float]:
    """
    Computes ratio = (sum(numerator) / sum(denominator)) * multiplier.
    Returns None if denominator is zero.
    """
    if consolidated_denominator == 0:
        return 0.0
    return round((consolidated_numerator / consolidated_denominator) * multiplier, 4)
