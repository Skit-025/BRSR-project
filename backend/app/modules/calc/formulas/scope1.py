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


def calculate_scope1_mobile_combustion(
    fuel_type: str,
    quantity: Decimal,
    input_unit: str,
    vehicle_category: str = "construction_equipment",
) -> Dict[str, Any]:
    """
    Computes Scope 1 emissions (ENV-GHG-001B) in tCO2e for mobile sources:
    company vehicles, construction equipment (excavators, cranes, compactors,
    rollers), trucks, and buses owned or leased by the entity.

    Accepts same fuel types as stationary combustion (HSD/diesel is most common).
    `vehicle_category` is stored for audit lineage only (not used in calculation).
    """
    factor_meta = get_fuel_factor(fuel_type)
    expected_unit = factor_meta["unit"]
    factor_val = factor_meta["factor"]

    normalized_qty = convert_unit(quantity, input_unit, expected_unit)
    emissions_tco2e = normalized_qty * factor_val

    ncv_gj = factor_meta.get("net_calorific_value_gj_per_unit", Decimal("0"))
    energy_gj = normalized_qty * ncv_gj

    return {
        "formula_code": "CALC-GHG-SCOPE1-MOBILE",
        "result_value": emissions_tco2e.quantize(Decimal("0.0001")),
        "result_unit": "tCO2e",
        "intermediate_steps": {
            "fuel_type": fuel_type,
            "vehicle_category": vehicle_category,
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
        },
    }


def calculate_scope1_process_emissions(
    process_type: str,
    quantity: Decimal,
    input_unit: str,
    emission_factor_tco2e_per_unit: Decimal,
    source_reference: str = "IPCC 2006 Tier 2 / MoEFCC",
) -> Dict[str, Any]:
    """
    Computes Scope 1 process emissions (ENV-GHG-001C) in tCO2e.
    These arise from chemical or industrial transformation, not combustion:
    e.g. acetylene consumption in welding, calcination in cement, galvanizing.

    Because process emission factors are highly process-specific,
    the caller must supply the emission_factor_tco2e_per_unit directly
    (sourced from facility-specific process data or IPCC Tier 2 defaults).
    """
    qty_in_unit = convert_unit(quantity, input_unit, input_unit)   # normalise but preserve unit
    emissions_tco2e = qty_in_unit * emission_factor_tco2e_per_unit

    return {
        "formula_code": "CALC-GHG-SCOPE1-PROCESS",
        "result_value": emissions_tco2e.quantize(Decimal("0.0001")),
        "result_unit": "tCO2e",
        "intermediate_steps": {
            "process_type": process_type,
            "quantity": str(quantity),
            "unit": input_unit,
        },
        "factors_applied": {
            "emission_factor": str(emission_factor_tco2e_per_unit),
            "factor_unit": f"tCO2e/{input_unit}",
            "source": source_reference,
        },
    }


def calculate_scope1_fugitive_emissions(
    refrigerant_type: str,
    quantity_kg: Decimal,
) -> Dict[str, Any]:
    """
    Computes Scope 1 fugitive emissions (ENV-GHG-001D) in tCO2e.
    Covers HVAC refrigerant top-ups (HCFC-22, HFC-32, HFC-410A) and
    SF6 from HV electrical switchgear.

    Emission factor = GWP (100-year) as per IPCC AR4, adopted by MoEFCC India.
    `quantity_kg` = refrigerant purchased/refilled (inventory-based method).
    """
    from app.modules.calc.factors import get_fuel_factor as _get_factor
    factor_meta = _get_factor(refrigerant_type)
    factor_val = factor_meta["factor"]          # tCO2e/kg  (= GWP/1000 expressed as tCO2e per kg)
    emissions_tco2e = quantity_kg * factor_val

    return {
        "formula_code": "CALC-GHG-SCOPE1-FUGITIVE",
        "result_value": emissions_tco2e.quantize(Decimal("0.0001")),
        "result_unit": "tCO2e",
        "intermediate_steps": {
            "refrigerant_type": refrigerant_type,
            "quantity_kg": str(quantity_kg),
            "indian_grade": factor_meta.get("indian_grade", refrigerant_type),
        },
        "factors_applied": {
            "gwp_tco2e_per_kg": str(factor_val),
            "factor_unit": "tCO2e/kg",
            "source": factor_meta["source"],
        },
    }


def calculate_scope1_mobile_diesel(
    quantity: Decimal,
    input_unit: str = "litres",
    vehicle_category: str = "heavy_construction_fleet",
) -> Dict[str, Any]:
    """
    Computes Scope 1 mobile emissions for High-Speed Diesel (HSD) fleet/vehicles.
    Formula: Quantity (L) × EF (0.00268 tCO2e/L)
    Source: BEE PAT Manual 2023 / MoPNG PPAC
    """
    res = calculate_scope1_mobile_combustion("hsd", quantity, input_unit, vehicle_category)
    res["formula_code"] = "CALC-GHG-SCOPE1-MOBILE-DIESEL"
    return res


def calculate_scope1_mobile_petrol(
    quantity: Decimal,
    input_unit: str = "litres",
    vehicle_category: str = "passenger_fleet",
) -> Dict[str, Any]:
    """
    Computes Scope 1 mobile emissions for Petrol/Motor Spirit (MS) fleet/vehicles.
    Formula: Quantity (L) × EF (0.00231 tCO2e/L)
    Source: BEE PAT Manual 2023 / MoPNG PPAC
    """
    res = calculate_scope1_mobile_combustion("petrol", quantity, input_unit, vehicle_category)
    res["formula_code"] = "CALC-GHG-SCOPE1-MOBILE-PETROL"
    return res


def calculate_scope1_mobile_cng(
    quantity: Decimal,
    input_unit: str = "kg",
    vehicle_category: str = "cng_commercial_fleet",
) -> Dict[str, Any]:
    """
    Computes Scope 1 mobile emissions for Compressed Natural Gas (CNG) vehicles.
    Formula: Quantity (kg) × EF (0.00221 tCO2e/kg)
    Source: MoPNG PPAC 2023 / MoEFCC
    """
    res = calculate_scope1_mobile_combustion("cng", quantity, input_unit, vehicle_category)
    res["formula_code"] = "CALC-GHG-SCOPE1-MOBILE-CNG"
    return res


def calculate_scope1_refrigerant_leakage(
    refrigerant_type: str,
    quantity_kg: Decimal,
) -> Dict[str, Any]:
    """
    Computes Scope 1 fugitive emissions from HVAC/AC refrigerant top-up/leakage (HCFC-22, HFC-32, HFC-410A).
    Formula: Quantity (kg) × GWP (tCO2e/kg)
    Source: IPCC AR4 GWP 100yr / MoEFCC India
    """
    res = calculate_scope1_fugitive_emissions(refrigerant_type, quantity_kg)
    res["formula_code"] = "CALC-GHG-SCOPE1-FUGITIVE-REFRIGERANT"
    return res


def calculate_scope1_sf6_leakage(
    quantity_kg: Decimal,
) -> Dict[str, Any]:
    """
    Computes Scope 1 fugitive emissions from SF6 gas leakage in Gas-Insulated Switchgear (GIS).
    Formula: Quantity (kg) × GWP (22.800 tCO2e/kg)
    Source: IPCC AR4 GWP 100yr (22,800) / MoEFCC India
    """
    res = calculate_scope1_fugitive_emissions("sf6", quantity_kg)
    res["formula_code"] = "CALC-GHG-SCOPE1-FUGITIVE-SF6"
    return res

