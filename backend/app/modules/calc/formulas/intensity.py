"""
app/modules/calc/formulas/intensity.py
Intensity Ratios Engine for SEBI BRSR Core Metrics.
Computes ratios per rupee of turnover (INR Crores) and physical output units.
"""
from decimal import Decimal
from typing import Dict, Any


def calculate_energy_intensity(
    total_energy_gj: Decimal,
    turnover_inr_crores: Decimal,
) -> Dict[str, Any]:
    """
    Computes Energy Intensity: GJ / Crore INR turnover.
    Mandatory SEBI BRSR Core KPI.
    """
    if turnover_inr_crores <= Decimal("0"):
        raise ValueError("Turnover must be strictly positive to compute intensity ratio.")

    intensity = total_energy_gj / turnover_inr_crores
    return {
        "formula_code": "CALC-INTENSITY-ENERGY",
        "result_value": intensity.quantize(Decimal("0.0001")),
        "result_unit": "GJ/Crore INR",
        "intermediate_steps": {
            "numerator_gj": str(total_energy_gj),
            "turnover_crores": str(turnover_inr_crores),
        },
        "factors_applied": {}
    }


def calculate_ghg_intensity(
    total_emissions_tco2e: Decimal,
    turnover_inr_crores: Decimal,
) -> Dict[str, Any]:
    """
    Computes GHG Intensity: tCO2e / Crore INR turnover.
    Mandatory SEBI BRSR Core KPI.
    """
    if turnover_inr_crores <= Decimal("0"):
        raise ValueError("Turnover must be strictly positive to compute intensity ratio.")

    intensity = total_emissions_tco2e / turnover_inr_crores
    return {
        "formula_code": "CALC-INTENSITY-GHG",
        "result_value": intensity.quantize(Decimal("0.0001")),
        "result_unit": "tCO2e/Crore INR",
        "intermediate_steps": {
            "numerator_tco2e": str(total_emissions_tco2e),
            "turnover_crores": str(turnover_inr_crores),
        },
        "factors_applied": {}
    }
