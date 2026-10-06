"""
app/modules/calc/router.py
FastAPI router for calculation formulas, emission factors, and unit conversion endpoints.
"""
from typing import List, Dict, Any
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.modules.calc.schemas import (
    Scope1CalcRequest,
    Scope2CalcRequest,
    Scope3CalcRequest,
    Scope3CalcResult,
    EnergyIntensityRequest,
    SafetyCalcRequest,
    CalculationResult,
    FormulaInfo,
)
from app.modules.calc.service import CalculationService
from app.modules.calc.registry import FORMULA_METADATA, get_formula_info
from app.modules.calc.units import convert_unit
from app.modules.calc.factors import FUEL_EMISSION_FACTORS, GRID_EMISSION_FACTOR_CEA_WEIGHTED_AVG

router = APIRouter(prefix="/calc", tags=["Calculation Engine & Deterministic Formulas"])


@router.get("/formulas", response_model=List[FormulaInfo])
def list_supported_formulas():
    """Returns list and definitions of all deterministic formulas available."""
    return list(FORMULA_METADATA.values())


@router.get("/factors")
def get_statutory_factors():
    """Returns regulatory emission factors and calorific values (CEA & IPCC)."""
    return {
        "grid_emission_factor_tco2e_per_mwh": str(GRID_EMISSION_FACTOR_CEA_WEIGHTED_AVG),
        "fuel_factors": {
            k: {
                "unit": v["unit"],
                "factor_tco2e_per_unit": str(v["factor"]),
                "net_calorific_value_gj_per_unit": str(v["net_calorific_value_gj_per_unit"]),
                "source": v["source"],
            }
            for k, v in FUEL_EMISSION_FACTORS.items()
        }
    }


@router.get("/fuel-catalog")
def get_fuel_catalog(db: Session = Depends(get_db)):
    """
    Returns the granular fuel sub-types catalog matching Director's table:
    COAL-ANT, COAL-BIT, COAL-LIG, DIESEL-HSD, DIESEL-LDO, GAS-CNG, GAS-PNG, GAS-LPG, PETROL.
    Allows frontend dropdowns to load dynamic fuel options backed by statutory Indian factors.
    """
    catalog = [
        {"code": "COAL-ANT", "category": "Coal", "subtype": "Anthracite", "unit": "kg", "co2e_per_unit": 2.62, "source": "MoEFCC / IPCC AR4 India"},
        {"code": "COAL-BIT", "category": "Coal", "subtype": "Bituminous", "unit": "kg", "co2e_per_unit": 2.35, "source": "MoEFCC / CEA 2023"},
        {"code": "COAL-LIG", "category": "Coal", "subtype": "Lignite / Brown Coal", "unit": "kg", "co2e_per_unit": 1.55, "source": "CEA / NLC India"},
        {"code": "DIESEL-HSD", "category": "Diesel", "subtype": "High Speed Diesel", "unit": "L", "co2e_per_unit": 2.68, "source": "BEE PAT Manual 2023 / MoPNG"},
        {"code": "DIESEL-LDO", "category": "Diesel", "subtype": "Light Diesel Oil", "unit": "L", "co2e_per_unit": 2.60, "source": "BEE PAT Manual 2023"},
        {"code": "GAS-CNG", "category": "Gas", "subtype": "Compressed Natural Gas", "unit": "kg", "co2e_per_unit": 2.21, "source": "MoPNG PPAC 2023 / MoEFCC"},
        {"code": "GAS-PNG", "category": "Gas", "subtype": "Piped Natural Gas", "unit": "kg", "co2e_per_unit": 2.03, "source": "MoPNG PPAC 2023 / CEA"},
        {"code": "GAS-LPG", "category": "Gas", "subtype": "Liquefied Petroleum Gas", "unit": "kg", "co2e_per_unit": 2.98, "source": "BEE PAT Manual 2023 / MoPNG"},
        {"code": "PETROL", "category": "Petrol", "subtype": "Regular Motor Spirit", "unit": "L", "co2e_per_unit": 2.31, "source": "BEE PAT Manual 2023 / MoPNG"},
    ]
    return {"fuel_catalog": catalog}


@router.post("/scope1", response_model=CalculationResult)
def calculate_scope1(req: Scope1CalcRequest, db: Session = Depends(get_db)):
    """Calculate Scope 1 direct emissions from fuel combustion."""
    service = CalculationService(db)
    try:
        return service.run_scope1(
            fuel_type=req.fuel_type,
            quantity=req.quantity,
            unit=req.unit,
            org_node_id=req.org_node_id,
            period_id=req.period_id,
        )
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.post("/scope2", response_model=CalculationResult)
def calculate_scope2(req: Scope2CalcRequest, db: Session = Depends(get_db)):
    """Calculate Scope 2 emissions from grid electricity."""
    service = CalculationService(db)
    try:
        return service.run_scope2(
            electricity_mwh=req.electricity_mwh,
            renewable_ppa_mwh=req.renewable_ppa_mwh or Decimal("0"),
            state_grid=req.state_grid,
            org_node_id=req.org_node_id,
            period_id=req.period_id,
        )
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.post("/scope3", response_model=Scope3CalcResult)
def calculate_scope3(req: Scope3CalcRequest, db: Session = Depends(get_db)):
    """
    Calculate Scope 3 indirect GHG emissions across all 6 sub-categories:
    A. Business Travel, B. Employee Commuting, C. Purchased Goods & Materials,
    D. Upstream Logistics, E. Capital Goods, F. Waste in Operations.
    Returns per-category breakdown + total tCO2e. All sub-categories optional.
    """
    service = CalculationService(db)
    try:
        result = service.run_scope3(
            business_travel=[t.model_dump() for t in req.business_travel] if req.business_travel else None,
            employee_commuting=[c.model_dump() for c in req.employee_commuting] if req.employee_commuting else None,
            purchased_goods=[m.model_dump() for m in req.purchased_goods] if req.purchased_goods else None,
            upstream_logistics=[s.model_dump() for s in req.upstream_logistics] if req.upstream_logistics else None,
            capital_goods=[a.model_dump() for a in req.capital_goods] if req.capital_goods else None,
            waste_operations=[w.model_dump() for w in req.waste_operations] if req.waste_operations else None,
            working_days=req.working_days_per_month,
            org_node_id=req.org_node_id,
            period_id=req.period_id,
        )
        return result
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.get("/scope3-catalog")
def get_scope3_catalog():
    """
    Returns available transport modes, material types, asset types, and waste streams
    for Scope 3 data entry dropdowns.
    """
    from app.modules.calc.factors import (
        SCOPE3_TRANSPORT_FACTORS,
        SCOPE3_SPEND_FACTORS,
        SCOPE3_CAPITAL_GOODS_FACTORS,
        SCOPE3_WASTE_FACTORS,
    )
    return {
        "transport_modes": [
            {"key": k, "unit": v["unit"], "description": k.replace("_", " ").title()}
            for k, v in SCOPE3_TRANSPORT_FACTORS.items()
        ],
        "materials": [
            {"key": k, "unit": v["unit"], "factor_tco2e_per_t": str(v["factor"]), "source": v["source"]}
            for k, v in SCOPE3_SPEND_FACTORS.items()
        ],
        "asset_types": [
            {"key": k, "description": v.get("description", k), "source": v["source"]}
            for k, v in SCOPE3_CAPITAL_GOODS_FACTORS.items()
        ],
        "waste_types": [
            {"key": k, "disposal_method": v.get("disposal_method", ""), "description": v.get("description", k)}
            for k, v in SCOPE3_WASTE_FACTORS.items()
        ],
    }



@router.post("/energy-intensity", response_model=CalculationResult)
def calculate_intensity(req: EnergyIntensityRequest, db: Session = Depends(get_db)):
    """Calculate Energy Intensity (GJ / Crore INR)."""
    service = CalculationService(db)
    try:
        return service.run_energy_intensity(
            total_energy_gj=req.total_energy_gj,
            turnover_inr_crores=req.turnover_inr_crores,
            org_node_id=req.org_node_id,
            period_id=req.period_id,
        )
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.post("/safety-ltifr", response_model=CalculationResult)
def calculate_safety(req: SafetyCalcRequest, db: Session = Depends(get_db)):
    """Calculate Lost Time Injury Frequency Rate (LTIFR)."""
    service = CalculationService(db)
    try:
        return service.run_safety_ltifr(
            lost_time_injuries=req.lost_time_injuries_count,
            total_man_hours_worked=req.total_man_hours_worked,
            org_node_id=req.org_node_id,
            period_id=req.period_id,
        )
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.get("/convert-unit")
def api_convert_unit(value: Decimal, from_unit: str, to_unit: str):
    """Utility endpoint to convert arbitrary ESG units deterministically."""
    try:
        converted = convert_unit(value, from_unit, to_unit)
        return {
            "source_value": value,
            "from_unit": from_unit,
            "to_unit": to_unit,
            "converted_value": converted,
        }
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
