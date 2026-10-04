"""
app/modules/calc/formulas/safety.py
Occupational Health & Safety Calculation Engine.
Complies with SEBI BRSR Principle 3 Indicator E10 and OSHA / ILO reporting standards.
"""
from decimal import Decimal
from typing import Dict, Any


def calculate_ltifr(
    lost_time_injuries: int,
    total_man_hours_worked: Decimal,
) -> Dict[str, Any]:
    """
    Computes Lost Time Injury Frequency Rate (LTIFR):
    LTIFR = (Number of Lost Time Injuries * 1,000,000) / Total Man-hours worked
    """
    if total_man_hours_worked <= Decimal("0"):
        raise ValueError("Total man-hours worked must be strictly positive to calculate LTIFR.")

    rate = (Decimal(str(lost_time_injuries)) * Decimal("1000000")) / total_man_hours_worked

    return {
        "formula_code": "CALC-SAFETY-LTIFR",
        "result_value": rate.quantize(Decimal("0.0001")),
        "result_unit": "per million hours",
        "intermediate_steps": {
            "lost_time_injuries": lost_time_injuries,
            "man_hours_worked": str(total_man_hours_worked),
            "multiplier": "1,000,000",
        },
        "factors_applied": {
            "standard": "ILO / OSHA Frequency Multiplier (1,000,000 hours)",
        }
    }


def calculate_fatality_rate(
    fatalities_count: int,
    total_man_hours_worked: Decimal,
) -> Dict[str, Any]:
    """
    Computes Fatality Rate per million man-hours worked.
    """
    if total_man_hours_worked <= Decimal("0"):
        raise ValueError("Total man-hours worked must be strictly positive to calculate fatality rate.")

    rate = (Decimal(str(fatalities_count)) * Decimal("1000000")) / total_man_hours_worked

    return {
        "formula_code": "CALC-SAFETY-FATALITY-RATE",
        "result_value": rate.quantize(Decimal("0.0001")),
        "result_unit": "per million hours",
        "intermediate_steps": {
            "fatalities_count": fatalities_count,
            "man_hours_worked": str(total_man_hours_worked),
        },
        "factors_applied": {}
    }
