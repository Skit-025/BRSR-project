"""
app/modules/calc/schemas.py
Pydantic schemas for calculation engine requests, results, and formula metadata.
"""
from typing import Optional, Dict, Any, List
from decimal import Decimal
from pydantic import BaseModel, ConfigDict


class Scope1CalcRequest(BaseModel):
    fuel_type: str                     # e.g. "diesel", "petrol", "natural_gas"
    quantity: Decimal
    unit: str                          # e.g. "litres", "scm", "kg"
    org_node_id: Optional[str] = None
    period_id: Optional[str] = None


class Scope2CalcRequest(BaseModel):
    electricity_mwh: Decimal
    renewable_ppa_mwh: Optional[Decimal] = Decimal("0")
    state_grid: Optional[str] = None
    org_node_id: Optional[str] = None
    period_id: Optional[str] = None


class EnergyIntensityRequest(BaseModel):
    total_energy_gj: Decimal
    turnover_inr_crores: Decimal
    org_node_id: Optional[str] = None
    period_id: Optional[str] = None


class SafetyCalcRequest(BaseModel):
    lost_time_injuries_count: int
    total_man_hours_worked: Decimal
    org_node_id: Optional[str] = None
    period_id: Optional[str] = None


class CalculationResult(BaseModel):
    formula_code: str
    result_value: Decimal
    result_unit: str
    intermediate_steps: Dict[str, Any] = {}
    factors_applied: Dict[str, Any] = {}
    timestamp: str


class FormulaInfo(BaseModel):
    code: str
    name: str
    description: str
    category: str
    required_inputs: List[str]
    output_unit: str
