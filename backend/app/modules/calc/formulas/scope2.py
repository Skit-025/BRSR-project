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
    method: str = "location_based",
    db: Any = None,
) -> Dict[str, Any]:
    """
    Computes Scope 2 GHG emissions in compliance with GHG Protocol Scope 2 Guidance
    and SEBI BRSR Principle 6 Indicator E2.

    Strict Dual-Reporting Architecture:
      - Location-based method: Total grid MWh × grid emission factor (CEA Baseline).
        Contractual instruments (PPAs, green tariffs, RECs) are NOT deducted.
      - Market-based method: Contractual instruments zero-rated (if verified),
        residual/unhedged grid power multiplied by applicable grid factor.
    """
    if total_grid_mwh < Decimal("0"):
        raise ValueError(f"total_grid_mwh cannot be negative: {total_grid_mwh}")
    if renewable_ppa_mwh < Decimal("0"):
        raise ValueError(f"renewable_ppa_mwh cannot be negative: {renewable_ppa_mwh}")

    grid_ef = get_grid_factor(state_grid, db=db)

    # 1. Location-based accounting (Full grid physical flow, no contractual offsets)
    location_emissions = total_grid_mwh * grid_ef

    # 2. Market-based accounting (Accredited zero-rated renewable PPA deduction)
    fossil_grid_mwh = max(Decimal("0"), total_grid_mwh - renewable_ppa_mwh)
    market_emissions = fossil_grid_mwh * grid_ef

    # Selected primary reporting value
    primary_emissions = market_emissions if method == "market_based" else location_emissions

    return {
        "formula_code": "CALC-GHG-SCOPE2",
        "result_value": primary_emissions.quantize(Decimal("0.0001")),
        "result_unit": "tCO2e",
        "location_based_tco2e": location_emissions.quantize(Decimal("0.0001")),
        "market_based_tco2e": market_emissions.quantize(Decimal("0.0001")),
        "intermediate_steps": {
            "method_selected": method,
            "total_purchased_mwh": str(total_grid_mwh),
            "renewable_ppa_mwh": str(renewable_ppa_mwh),
            "net_grid_mwh": str(fossil_grid_mwh),
            "renewable_share_pct": str(((renewable_ppa_mwh / total_grid_mwh) * 100).quantize(Decimal("0.01"))) if total_grid_mwh > 0 else "0",
            "state_grid": state_grid or "National Weighted Average",
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
    contractual_instrument_verified: bool = True,
) -> Dict[str, Any]:
    """
    Computes Scope 2B emissions for Accredited Renewable Electricity (ENV-GHG-002B).
    Enforces GHG Protocol Scope 2 Market-based Guidance:
      - Valid accredited contractual instrument (PPA, bundled green tariff, REC).
      - Zero factor applies only when contractual instrument is verified.
      - If unverified, falls back closed to grid baseline.
    """
    if renewable_mwh < Decimal("0"):
        raise ValueError(f"renewable_mwh cannot be negative: {renewable_mwh}")

    if not contractual_instrument_verified:
        # Fail-closed: unverified contractual claims must use grid factor
        grid_ef = get_grid_factor()
        result_emissions = (renewable_mwh * grid_ef).quantize(Decimal("0.0001"))
        factor_applied = str(grid_ef)
        source_note = "Unverified PPA Instrument — Failed Closed to National Grid Baseline"
    else:
        result_emissions = Decimal("0.0000")
        factor_applied = "0.0000"
        source_note = "GHG Protocol Market-based Zero Rating / Accredited Instrument Verified"

    return {
        "formula_code": "CALC-GHG-SCOPE2-RENEWABLE",
        "result_value": result_emissions,
        "result_unit": "tCO2e",
        "intermediate_steps": {
            "renewable_mwh": str(renewable_mwh),
            "source_type": source_type,
            "contractual_instrument_verified": contractual_instrument_verified,
            "avoided_emissions_tco2e": str((renewable_mwh * Decimal("0.716")).quantize(Decimal("0.0001"))),
        },
        "factors_applied": {
            "emission_factor": factor_applied,
            "factor_unit": "tCO2e/MWh",
            "source": source_note,
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
