"""
app/modules/calc/formulas/energy.py
Total Energy Consumption Calculation Engine.
Aggregates electrical, fuel, and renewable sources into standard Joules (Gigajoules - GJ).
Complies with SEBI BRSR Principle 6 Indicator E1 (Energy breakdown).
"""
from decimal import Decimal
from typing import Dict, Any, List
from app.modules.calc.units import convert_unit
from app.modules.calc.factors import get_fuel_factor


def calculate_total_energy(
    electricity_mwh: Decimal,
    fuels: List[Dict[str, Any]],     # List of {"fuel_type": "diesel", "quantity": Decimal, "unit": "litres"}
    renewable_mwh: Decimal = Decimal("0"),
) -> Dict[str, Any]:
    """
    Computes total energy in GJ and renewable share %:
    1 MWh electricity = 3.6 GJ
    Fuel quantity * NCV (Net Calorific Value in GJ/unit)
    """
    # 1. Electricity to GJ
    electricity_gj = convert_unit(electricity_mwh, "mwh", "gj")
    renewable_gj = convert_unit(renewable_mwh, "mwh", "gj")

    # 2. Fuel energy to GJ
    total_fuel_gj = Decimal("0")
    fuel_breakdown = []
    for item in fuels:
        ftype = item["fuel_type"]
        qty = Decimal(str(item["quantity"]))
        unit = item.get("unit", "litres")
        
        factor_meta = get_fuel_factor(ftype)
        normalized_qty = convert_unit(qty, unit, factor_meta["unit"])
        ncv = factor_meta.get("net_calorific_value_gj_per_unit", Decimal("0"))
        item_gj = normalized_qty * ncv
        total_fuel_gj += item_gj

        fuel_breakdown.append({
            "fuel_type": ftype,
            "quantity": str(qty),
            "unit": unit,
            "energy_gj": str(item_gj.quantize(Decimal("0.01"))),
        })

    total_energy_gj = electricity_gj + total_fuel_gj
    renewable_pct = (renewable_gj / total_energy_gj * Decimal("100")) if total_energy_gj > 0 else Decimal("0")

    return {
        "formula_code": "CALC-ENERGY-TOTAL",
        "result_value": total_energy_gj.quantize(Decimal("0.01")),
        "result_unit": "GJ",
        "intermediate_steps": {
            "electricity_gj": str(electricity_gj.quantize(Decimal("0.01"))),
            "fuel_gj": str(total_fuel_gj.quantize(Decimal("0.01"))),
            "renewable_gj": str(renewable_gj.quantize(Decimal("0.01"))),
            "renewable_energy_share_pct": str(renewable_pct.quantize(Decimal("0.01"))),
            "fuel_breakdown": fuel_breakdown,
        },
        "factors_applied": {
            "electricity_conversion": "1 MWh = 3.6 GJ",
        }
    }
