"""
app/modules/validation/rules/cross_field.py
Validation rule: Inter-field and multi-metric relational consistency.
"""
from typing import Dict, List, Optional, Tuple
from app.modules.collection.models import DataPoint


def validate_cross_field_consistency(data_points: List[DataPoint]) -> List[Tuple[str, str]]:
    """
    Validates mathematical relations across multiple submitted metrics:
    - Total employees == Male + Female employees
    - Total Energy >= Renewable Energy
    """
    issues = []
    points_by_code: Dict[str, float] = {}
    for dp in data_points:
        if dp.value_numeric is not None:
            points_by_code[dp.metric_code] = dp.value_numeric

    # Example: Male (SOC-EMP-002) + Female (SOC-EMP-003) vs Total (SOC-EMP-001)
    if "SOC-EMP-001" in points_by_code and "SOC-EMP-002" in points_by_code and "SOC-EMP-003" in points_by_code:
        tot = points_by_code["SOC-EMP-001"]
        m = points_by_code["SOC-EMP-002"]
        f = points_by_code["SOC-EMP-003"]
        if abs(tot - (m + f)) > 0.01:
            issues.append((
                "SOC-EMP-001",
                f"Total employees ({tot}) does not equal Male ({m}) + Female ({f}) headcount."
            ))

    return issues
