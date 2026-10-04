"""
app/modules/calc/registry.py
Central registry of all supported mathematical and regulatory formulas in the calculation engine.
"""
from typing import Dict, Any, Callable
from app.modules.calc.schemas import FormulaInfo
from app.modules.calc.formulas import (
    calculate_scope1_stationary_combustion,
    calculate_scope2_electricity,
    calculate_total_energy,
    calculate_energy_intensity,
    calculate_ghg_intensity,
    calculate_ltifr,
    calculate_fatality_rate,
)

FORMULA_METADATA: Dict[str, FormulaInfo] = {
    "CALC-GHG-SCOPE1": FormulaInfo(
        code="CALC-GHG-SCOPE1",
        name="Scope 1 Direct GHG Emissions",
        description="Calculates direct GHG emissions from stationary combustion based on fuel type, quantity, and IPCC emission factors.",
        category="GHG",
        required_inputs=["fuel_type", "quantity", "unit"],
        output_unit="tCO2e",
    ),
    "CALC-GHG-SCOPE2": FormulaInfo(
        code="CALC-GHG-SCOPE2",
        name="Scope 2 Indirect GHG Emissions",
        description="Calculates indirect GHG emissions from purchased grid electricity using CEA national baseline emission factors.",
        category="GHG",
        required_inputs=["electricity_mwh", "renewable_ppa_mwh"],
        output_unit="tCO2e",
    ),
    "CALC-ENERGY-TOTAL": FormulaInfo(
        code="CALC-ENERGY-TOTAL",
        name="Total Energy Consumption",
        description="Aggregates electrical, fuel, and renewable sources into standard Gigajoules (GJ).",
        category="Energy",
        required_inputs=["electricity_mwh", "fuels"],
        output_unit="GJ",
    ),
    "CALC-INTENSITY-ENERGY": FormulaInfo(
        code="CALC-INTENSITY-ENERGY",
        name="Energy Intensity Ratio",
        description="Calculates Energy Consumption (GJ) per Crore INR turnover.",
        category="Intensity",
        required_inputs=["total_energy_gj", "turnover_inr_crores"],
        output_unit="GJ/Crore INR",
    ),
    "CALC-INTENSITY-GHG": FormulaInfo(
        code="CALC-INTENSITY-GHG",
        name="GHG Emissions Intensity Ratio",
        description="Calculates Total GHG Emissions (tCO2e) per Crore INR turnover.",
        category="Intensity",
        required_inputs=["total_emissions_tco2e", "turnover_inr_crores"],
        output_unit="tCO2e/Crore INR",
    ),
    "CALC-SAFETY-LTIFR": FormulaInfo(
        code="CALC-SAFETY-LTIFR",
        name="Lost Time Injury Frequency Rate",
        description="Calculates LTIFR per million man-hours worked as mandated by OSHA/SEBI.",
        category="Safety",
        required_inputs=["lost_time_injuries", "total_man_hours_worked"],
        output_unit="per million hours",
    ),
}


def get_formula_info(code: str) -> FormulaInfo:
    if code not in FORMULA_METADATA:
        raise ValueError(f"Unknown formula code '{code}'.")
    return FORMULA_METADATA[code]
