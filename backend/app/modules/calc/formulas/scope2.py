"""
app/modules/calc/formulas/scope2.py
Scope 2 Indirect GHG Emissions Calculation Engine.
Complies with CEA Baseline Carbon Database for Indian Power Sector & SEBI BRSR P6 Indicator E2.
"""
from decimal import Decimal
from typing import Dict, Any, Optional
from app.modules.calc.factors import get_grid_factor, GRID_EMISSION_FACTOR_RENEWABLE


def calculate_scope2_electricity(
    total_grid_mwh: Decimal,
    renewable_ppa_mwh: Decimal = Decimal("0"),
    state_grid: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Computes Scope 2 location-based emissions in tCO2e.
    Accounts for accredited zero-emission renewable energy power purchase agreements (PPA/wheeling).
    """
    grid_ef = get_grid_factor(state_grid)
    
    # Non-renewable purchased grid power
    fossil_grid_mwh = max(Decimal("0"), total_grid_mwh - renewable_ppa_mwh)
    
    # Location-based emissions
    location_emissions = fossil_grid_mwh * grid_ef

    return {
        "formula_code": "CALC-GHG-SCOPE2",
        "result_value": location_emissions.quantize(Decimal("0.0001")),
        "result_unit": "tCO2e",
        "intermediate_steps": {
            "total_purchased_mwh": str(total_grid_mwh),
            "renewable_ppa_mwh": str(renewable_ppa_mwh),
            "net_grid_mwh": str(fossil_grid_mwh),
            "renewable_share_pct": str(((renewable_ppa_mwh / total_grid_mwh) * 100).quantize(Decimal("0.01"))) if total_grid_mwh > 0 else "0",
        },
        "factors_applied": {
            "grid_emission_factor": str(grid_ef),
            "grid_ef_unit": "tCO2e/MWh",
            "source": "CEA CO2 Baseline Database Ver. 19/20",
        }
    }
