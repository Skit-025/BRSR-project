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


def calculate_water_intensity(
    total_water_kl: Decimal,
    turnover_inr_crores: Decimal,
) -> Dict[str, Any]:
    """
    Computes Water Intensity: kL / Crore INR turnover.
    Mandatory SEBI BRSR Core KPI.
    """
    if turnover_inr_crores <= Decimal("0"):
        raise ValueError("Turnover must be strictly positive to compute intensity ratio.")

    intensity = total_water_kl / turnover_inr_crores
    return {
        "formula_code": "CALC-INTENSITY-WATER",
        "result_value": intensity.quantize(Decimal("0.0001")),
        "result_unit": "kL/Crore INR",
        "intermediate_steps": {
            "numerator_kl": str(total_water_kl),
            "turnover_crores": str(turnover_inr_crores),
        },
        "factors_applied": {}
    }


def calculate_women_pct(
    female_count: int,
    total_count: int,
) -> Dict[str, Any]:
    """
    Computes Percentage of Women Representation: (Females / Total) * 100.
    """
    if total_count <= 0:
        pct = Decimal("0.0")
    else:
        pct = (Decimal(str(female_count)) * Decimal("100")) / Decimal(str(total_count))
    return {
        "formula_code": "CALC-DERIVED-WOMEN-PCT",
        "result_value": pct.quantize(Decimal("0.01")),
        "result_unit": "%",
        "intermediate_steps": {
            "female_count": female_count,
            "total_count": total_count,
        },
        "factors_applied": {}
    }


def calculate_msme_pct(
    msme_spend_inr: Decimal,
    total_spend_inr: Decimal,
) -> Dict[str, Any]:
    """
    Computes Percentage of Purchases from MSMEs: (MSME Spend / Total Spend) * 100.
    """
    if total_spend_inr <= Decimal("0"):
        pct = Decimal("0.0")
    else:
        pct = (Decimal(str(msme_spend_inr)) * Decimal("100")) / Decimal(str(total_spend_inr))
    return {
        "formula_code": "CALC-DERIVED-MSME-PCT",
        "result_value": pct.quantize(Decimal("0.01")),
        "result_unit": "%",
        "intermediate_steps": {
            "msme_spend": str(msme_spend_inr),
            "total_spend": str(total_spend_inr),
        },
        "factors_applied": {}
    }

