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


# ── Scope 3 Schemas ────────────────────────────────────────────────────────────

class TripEntry(BaseModel):
    mode: str                                # e.g. "air_domestic_economy", "rail_passenger"
    distance_km: Decimal
    passengers: int = 1
    round_trip: bool = False


class CommuteEntry(BaseModel):
    mode: str                                # e.g. "road_car_diesel", "two_wheeler"
    employees: int
    avg_distance_km: Decimal


class MaterialEntry(BaseModel):
    material: str                            # e.g. "steel", "cement", "aluminium"
    quantity_t: Decimal


class ShipmentEntry(BaseModel):
    mode: str                                # e.g. "road_freight_diesel", "rail_freight"
    weight_t: Decimal
    distance_km: Decimal


class AssetEntry(BaseModel):
    asset_type: str                          # e.g. "excavator", "crane_mobile"
    weight_t: Optional[Decimal] = None
    spend_inr_lakh: Optional[Decimal] = None


class WasteEntry(BaseModel):
    waste_type: str                          # e.g. "cd_debris_landfill", "msw_landfill"
    quantity_t: Decimal


class Scope3CalcRequest(BaseModel):
    """Request body for Scope 3 calculation. All sub-categories are optional."""
    org_node_id: Optional[str] = None
    period_id: Optional[str] = None
    working_days_per_month: int = 25

    # Sub-category A: Business Travel
    business_travel: Optional[List[TripEntry]] = None
    # Sub-category B: Employee Commuting
    employee_commuting: Optional[List[CommuteEntry]] = None
    # Sub-category C: Purchased Goods & Materials
    purchased_goods: Optional[List[MaterialEntry]] = None
    # Sub-category D: Upstream Logistics
    upstream_logistics: Optional[List[ShipmentEntry]] = None
    # Sub-category E: Capital Goods
    capital_goods: Optional[List[AssetEntry]] = None
    # Sub-category F: Waste in Operations
    waste_operations: Optional[List[WasteEntry]] = None


class Scope3CategoryResult(BaseModel):
    formula_code: str
    category: str
    result_value: Decimal
    result_unit: str = "tCO2e"
    intermediate_steps: Dict[str, Any] = {}


class Scope3CalcResult(BaseModel):
    total_scope3_tco2e: Decimal
    result_unit: str = "tCO2e"
    timestamp: str
    categories: List[Scope3CategoryResult]
