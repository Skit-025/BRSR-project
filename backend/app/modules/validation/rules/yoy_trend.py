"""
app/modules/validation/rules/yoy_trend.py
Validation rule: Year-over-Year (YoY) variance and trend deviation detector.
"""
from typing import Optional, Tuple
from decimal import Decimal


def check_yoy_variance(
    current_value: float,
    prior_year_value: Optional[float],
    threshold_pct: float = 30.0,
) -> Tuple[bool, Optional[str]]:
    """
    Checks if current value deviates from prior year by more than threshold_pct (default 30%).
    Returns (is_anomaly: bool, message: str)
    """
    if prior_year_value is None or prior_year_value == 0:
        return False, None

    pct_diff = abs(current_value - prior_year_value) / abs(prior_year_value) * 100.0
    if pct_diff > threshold_pct:
        direction = "increase" if current_value > prior_year_value else "decrease"
        return (
            True,
            f"YoY variance of {pct_diff:.1f}% ({direction}) exceeds {threshold_pct}% threshold (Prior: {prior_year_value}, Current: {current_value}). Written justification recommended."
        )

    return False, None
