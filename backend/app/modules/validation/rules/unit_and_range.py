"""
app/modules/validation/rules/unit_and_range.py
Validation rule: Allowed units and physical range limits.
"""
from typing import Optional, Tuple
from app.modules.collection.models import DataPoint
from app.modules.metrics.models import Metric


def validate_unit_and_range(dp: DataPoint, metric: Optional[Metric]) -> Tuple[bool, Optional[str]]:
    """
    Ensures entered unit is among the permitted units for this indicator,
    and physical quantities are strictly non-negative.
    """
    if not metric:
        return True, None

    # Unit validation
    if metric.allowed_units and dp.unit:
        allowed_normalized = [u.strip().lower() for u in metric.allowed_units]
        if dp.unit.strip().lower() not in allowed_normalized:
            return (
                False,
                f"Entered unit '{dp.unit}' is not in allowed units {metric.allowed_units} for metric '{metric.code}'."
            )

    # Negative check for physical indicators
    if dp.value_numeric is not None and dp.value_numeric < 0:
        return False, f"Negative value ({dp.value_numeric}) prohibited for physical metric '{metric.code}'."

    return True, None
