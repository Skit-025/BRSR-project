"""
backend/app/modules/calc/brsr_p6_formulas.py

Official SEBI BRSR Annexure I — Principle 6 Calculation & Aggregation Formulas.
Used as the authoritative backend formula reference for Energy (EI-1/LI-1),
Water (EI-3/LI-2/LI-3), GHG Emissions (EI-6/LI-4), Air Emissions (EI-5),
Waste Management (EI-8), and Hierarchical Bottom-Up Roll-up.
"""
from __future__ import annotations

from typing import Dict, List, Optional


def sum_optional(values: List[Optional[float]]) -> Optional[float]:
    """Sum non-null numeric values; returns None when all inputs are unreported."""
    present = [float(v) for v in values if v is not None]
    return round(sum(present), 4) if present else None


def calc_energy_consumption(
    ren_elec: Optional[float],
    ren_fuel: Optional[float],
    ren_other: Optional[float],
    nonren_elec: Optional[float],
    nonren_fuel: Optional[float],
    nonren_other: Optional[float],
) -> Dict[str, Optional[float]]:
    """
    BRSR P6 EI-1:
      Total Renewable Energy     = A + B + C
      Total Non-Renewable Energy = D + E + F
      Total Electricity          = A + D
      Total Fuel                 = B + E
      Total Other Sources        = C + F
      Grand Total Energy (GJ)    = (A + B + C) + (D + E + F)
    """
    ren_total = sum_optional([ren_elec, ren_fuel, ren_other])
    nonren_total = sum_optional([nonren_elec, nonren_fuel, nonren_other])
    return {
        "renewable_total": ren_total,
        "non_renewable_total": nonren_total,
        "electricity_total": sum_optional([ren_elec, nonren_elec]),
        "fuel_total": sum_optional([ren_fuel, nonren_fuel]),
        "other_total": sum_optional([ren_other, nonren_other]),
        "grand_total": sum_optional([ren_total, nonren_total]),
    }


def calc_water_balance(
    surface: Optional[float],
    groundwater: Optional[float],
    third_party: Optional[float],
    seawater: Optional[float],
    others: Optional[float],
    consumption: Optional[float],
    discharge_volumes: List[Optional[float]],
) -> Dict[str, Optional[float]]:
    """
    BRSR P6 EI-3 & LI-2:
      Total Water Withdrawal (kL) = Surface + Groundwater + Third-Party + Seawater + Others
      Total Water Consumption (kL) = Direct site consumption
      Total Water Discharged (kL) = Sum across 5 destinations x 4 treatment levels
    """
    return {
        "withdrawal_total": sum_optional([surface, groundwater, third_party, seawater, others]),
        "consumption_total": consumption,
        "discharge_total": sum_optional(discharge_volumes),
    }


def calc_ghg_totals(
    scope1_tco2e: Optional[float],
    scope2_tco2e: Optional[float],
    scope3_tco2e: Optional[float] = None,
) -> Dict[str, Optional[float]]:
    """
    BRSR P6 EI-6 & LI-4:
      Total Scope 1 + Scope 2 (tCO2e) = Scope 1 + Scope 2
      Total GHG Footprint (tCO2e)     = Scope 1 + Scope 2 + Scope 3
    """
    s1_s2 = sum_optional([scope1_tco2e, scope2_tco2e])
    return {
        "scope1": scope1_tco2e,
        "scope2": scope2_tco2e,
        "scope1_2_total": s1_s2,
        "scope3": scope3_tco2e,
        "total_ghg": sum_optional([s1_s2, scope3_tco2e]),
    }


def calc_waste_totals(
    generated_streams: List[Optional[float]],
    recovered_streams: List[Optional[float]],
    disposed_streams: List[Optional[float]],
) -> Dict[str, Optional[float]]:
    """
    BRSR P6 EI-8:
      Total Waste Generated (MT) = Plastic + E-waste + Bio-medical + C&D + Battery + Radioactive + Other Haz + Other Non-Haz
      Total Waste Recovered (MT) = Recycled + Re-used + Other Recovery
      Total Waste Disposed  (MT) = Incineration + Landfilling + Other Disposal
    """
    return {
        "generated_total": sum_optional(generated_streams),
        "recovered_total": sum_optional(recovered_streams),
        "disposed_total": sum_optional(disposed_streams),
    }

