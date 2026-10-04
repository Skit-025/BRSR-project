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
