"""
app/modules/validation/rules/required_and_type.py
Validation rule: Data type compliance and required field presence.
"""
from typing import Optional, Tuple
from app.modules.collection.models import DataPoint
from app.modules.metrics.models import Metric


def validate_required_and_type(dp: DataPoint, metric: Optional[Metric]) -> Tuple[bool, Optional[str]]:
    """
    Validates data type against metric definition (numeric, text, percentage).
    """
    if not metric:
        return True, None

    if metric.data_type == "numeric":
        if dp.value_numeric is None and not dp.value_text:
            return False, f"Value required for numeric metric '{metric.code}'."
    elif metric.data_type == "percentage":
        if dp.value_numeric is None:
            return False, f"Percentage value required for metric '{metric.code}'."
        if not (0.0 <= dp.value_numeric <= 100.0):
            return False, f"Percentage value {dp.value_numeric}% must be between 0 and 100."

    return True, None
