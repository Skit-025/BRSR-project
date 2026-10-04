"""
app/pipelines/aggregation/boundary/partial_period.py
Pro-rata adjustments for assets acquired, commissioned, or divested mid-period.
"""
from datetime import date
from typing import Optional


def compute_partial_period_fraction(
    acquisition_date: Optional[date],
    divestment_date: Optional[date],
    period_start: date,
    period_end: date,
) -> float:
    """
    Returns pro-rata multiplier (0.0 to 1.0) for partial period ownership.
    """
    effective_start = max(period_start, acquisition_date) if acquisition_date else period_start
    effective_end = min(period_end, divestment_date) if divestment_date else period_end

    if effective_start > effective_end:
        return 0.0

    active_days = (effective_end - effective_start).days + 1
    total_days = (period_end - period_start).days + 1

    return min(1.0, max(0.0, active_days / float(total_days)))
