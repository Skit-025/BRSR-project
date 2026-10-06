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


def calculate_scope2_grid_electricity(
    grid_mwh: Decimal,
    state_grid: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Computes Scope 2A Market/Location-based emissions for Grid Electricity (ENV-GHG-002A).
    Applies CEA CO2 Baseline Database national/state weighted average factors.
    """
    grid_ef = get_grid_factor(state_grid)
    emissions = grid_mwh * grid_ef
    return {
        "formula_code": "CALC-GHG-SCOPE2-GRID",
        "result_value": emissions.quantize(Decimal("0.0001")),
        "result_unit": "tCO2e",
        "intermediate_steps": {
            "grid_mwh": str(grid_mwh),
            "state_grid": state_grid or "National Weighted Average",
        },
        "factors_applied": {
            "grid_emission_factor": str(grid_ef),
            "factor_unit": "tCO2e/MWh",
            "source": "CEA CO2 Baseline Database Ver. 19/20",
        }
    }


def calculate_scope2_renewable_electricity(
    renewable_mwh: Decimal,
    source_type: str = "Solar PPA",
) -> Dict[str, Any]:
    """
    Computes Scope 2B emissions for Accredited Renewable Electricity (ENV-GHG-002B).
    Zero emissions factor under GHG Protocol Scope 2 Market-based Guidance.
    """
    return {
        "formula_code": "CALC-GHG-SCOPE2-RENEWABLE",
        "result_value": Decimal("0.0000"),
        "result_unit": "tCO2e",
        "intermediate_steps": {
            "renewable_mwh": str(renewable_mwh),
            "source_type": source_type,
            "avoided_emissions_tco2e": str((renewable_mwh * Decimal("0.716")).quantize(Decimal("0.0001"))),
        },
        "factors_applied": {
            "emission_factor": "0.0000",
            "factor_unit": "tCO2e/MWh",
            "source": "GHG Protocol Market-based Zero Rating / CEA Reference 0.716",
        }
    }


def calculate_scope2_purchased_steam(
    quantity_tonnes: Decimal,
    factor_tco2e_per_tonne: Decimal = Decimal("0.280"),
) -> Dict[str, Any]:
    """
    Computes Scope 2C emissions for Purchased Steam / Heat (ENV-GHG-002C).
    Default 0.280 tCO2e/tonne derived from industrial utility boilers.
    """
    emissions = quantity_tonnes * factor_tco2e_per_tonne
    return {
        "formula_code": "CALC-GHG-SCOPE2-STEAM",
        "result_value": emissions.quantize(Decimal("0.0001")),
        "result_unit": "tCO2e",
        "intermediate_steps": {
            "quantity_tonnes": str(quantity_tonnes),
        },
        "factors_applied": {
            "emission_factor": str(factor_tco2e_per_tonne),
            "factor_unit": "tCO2e/tonne",
            "source": "BEE Industrial Steam Boiler Benchmark 2023",
        }
    }
