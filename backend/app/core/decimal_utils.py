"""
app/core/decimal_utils.py
Precision-safe numeric utilities for ESG metric calculations.
All ESG values use Python Decimal to avoid floating-point drift.
"""
from decimal import Decimal, ROUND_HALF_UP, InvalidOperation
from typing import Union, Optional


Number = Union[int, float, str, Decimal]


def to_decimal(value: Number, default: Optional[Decimal] = None) -> Optional[Decimal]:
    """
    Safely convert `value` to Decimal.
    Returns `default` (None by default) if conversion fails.
    """
    if value is None:
        return default
    try:
        return Decimal(str(value))
    except InvalidOperation:
        return default


def round_dp(value: Number, places: int = 4) -> Decimal:
    """Round `value` to `places` decimal places using ROUND_HALF_UP."""
    d = to_decimal(value, Decimal("0"))
    quantize_str = Decimal("0." + "0" * places) if places > 0 else Decimal("1")
    return d.quantize(quantize_str, rounding=ROUND_HALF_UP)


def safe_divide(
    numerator: Number,
    denominator: Number,
    default: Decimal = Decimal("0"),
    places: int = 4,
) -> Decimal:
    """
    Divide numerator by denominator; return `default` on division-by-zero.
    Result is rounded to `places` decimal places.
    """
    n = to_decimal(numerator, Decimal("0"))
    d = to_decimal(denominator, Decimal("0"))
    if d == 0:
        return default
    return round_dp(n / d, places)


def pct(part: Number, total: Number, places: int = 2) -> Decimal:
    """
    Compute percentage: (part / total) * 100.
    Returns 0 if total is zero.
    """
    return safe_divide(
        Decimal(str(part)) * 100,
        to_decimal(total, Decimal("0")),
        default=Decimal("0"),
        places=places,
    )


def jv_equity_share(value: Number, equity_pct: Number) -> Decimal:
    """
    Apply JV equity-share weighting: value * (equity_pct / 100).
    Used by the consolidation engine for joint ventures.
    """
    v = to_decimal(value, Decimal("0"))
    e = to_decimal(equity_pct, Decimal("0"))
    return round_dp(v * e / 100, places=4)


def sum_decimals(*values: Optional[Number]) -> Decimal:
    """Sum an arbitrary number of values, skipping None/invalid entries."""
    total = Decimal("0")
    for v in values:
        d = to_decimal(v)
        if d is not None:
            total += d
    return total
