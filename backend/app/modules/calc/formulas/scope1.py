"""
app/modules/calc/formulas/scope1.py
Scope 1 Direct GHG Emissions Calculation Engine.
Compliant with GHG Protocol Corporate Standard and SEBI BRSR Principle 6 Indicator E1.
"""
from decimal import Decimal
from typing import Dict, Any
from app.modules.calc.factors import get_fuel_factor
from app.modules.calc.units import convert_unit


def calculate_scope1_stationary_combustion(
    fuel_type: str,
    quantity: Decimal,
    input_unit: str,
) -> Dict[str, Any]:
    """
    Computes Scope 1 emissions in tCO2e for fuel combustion.
    Automatically standardizes input quantity to canonical factor fuel unit.
    """
    factor_meta = get_fuel_factor(fuel_type)
    expected_unit = factor_meta["unit"]
    factor_val = factor_meta["factor"]

    # Convert quantity to factor's expected unit if needed
    normalized_qty = convert_unit(quantity, input_unit, expected_unit)
    emissions_tco2e = normalized_qty * factor_val

    # Also compute energy content in GJ
    ncv_gj = factor_meta.get("net_calorific_value_gj_per_unit", Decimal("0"))
    energy_gj = normalized_qty * ncv_gj

    return {
        "formula_code": "CALC-GHG-SCOPE1",
        "result_value": emissions_tco2e.quantize(Decimal("0.0001")),
        "result_unit": "tCO2e",
        "intermediate_steps": {
            "fuel_type": fuel_type,
            "raw_quantity": str(quantity),
            "raw_unit": input_unit,
            "normalized_quantity": str(normalized_qty),
            "normalized_unit": expected_unit,
            "energy_content_gj": str(energy_gj.quantize(Decimal("0.01"))),
        },
        "factors_applied": {
            "emission_factor": str(factor_val),
            "factor_unit": f"tCO2e/{expected_unit}",
            "source": factor_meta["source"],
        }
    }
