"""
app/modules/calc/service.py
Service layer for running calculation formulas, logging execution in DB, and returning structured results.
"""
from typing import Dict, Any, Optional
from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy.orm import Session
from app.modules.calc.models import CalculationLog
from app.modules.calc.schemas import CalculationResult
from app.modules.calc.formulas import (
    calculate_scope1_stationary_combustion,
    calculate_scope2_electricity,
    calculate_total_energy,
    calculate_energy_intensity,
    calculate_ghg_intensity,
    calculate_ltifr,
)


class CalculationService:
    def __init__(self, db: Session):
        self.db = db

    def _persist_log(
        self,
        formula_code: str,
        org_node_id: Optional[str],
        period_id: Optional[str],
        inputs: Dict[str, Any],
        output: Dict[str, Any],
        factors: Dict[str, Any],
        executed_by: Optional[str] = None,
    ):
        try:
            log_entry = CalculationLog(
                formula_code=formula_code,
                org_node_id=org_node_id or "default",
                period_id=period_id or "default",
                input_parameters=inputs,
                output_result=output,
                factors_applied=factors,
                status="SUCCESS",
                executed_by=executed_by,
            )
            self.db.add(log_entry)
            self.db.commit()
        except Exception:
            self.db.rollback()

    def run_scope1(
        self,
        fuel_type: str,
        quantity: Decimal,
        unit: str,
        org_node_id: Optional[str] = None,
        period_id: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> CalculationResult:
        result = calculate_scope1_stationary_combustion(fuel_type, quantity, unit)
        now_iso = datetime.now(timezone.utc).isoformat()
        self._persist_log(
            formula_code="CALC-GHG-SCOPE1",
            org_node_id=org_node_id,
            period_id=period_id,
            inputs={"fuel_type": fuel_type, "quantity": str(quantity), "unit": unit},
            output={"result_value": str(result["result_value"]), "result_unit": result["result_unit"]},
            factors=result["factors_applied"],
            executed_by=user_id,
        )
        return CalculationResult(
            formula_code=result["formula_code"],
            result_value=result["result_value"],
            result_unit=result["result_unit"],
            intermediate_steps=result["intermediate_steps"],
            factors_applied=result["factors_applied"],
            timestamp=now_iso,
        )

    def run_scope2(
        self,
        electricity_mwh: Decimal,
        renewable_ppa_mwh: Decimal = Decimal("0"),
        state_grid: Optional[str] = None,
        org_node_id: Optional[str] = None,
        period_id: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> CalculationResult:
        result = calculate_scope2_electricity(electricity_mwh, renewable_ppa_mwh, state_grid)
        now_iso = datetime.now(timezone.utc).isoformat()
        self._persist_log(
            formula_code="CALC-GHG-SCOPE2",
            org_node_id=org_node_id,
            period_id=period_id,
            inputs={"electricity_mwh": str(electricity_mwh), "renewable_ppa_mwh": str(renewable_ppa_mwh)},
            output={"result_value": str(result["result_value"]), "result_unit": result["result_unit"]},
            factors=result["factors_applied"],
            executed_by=user_id,
        )
        return CalculationResult(
            formula_code=result["formula_code"],
            result_value=result["result_value"],
            result_unit=result["result_unit"],
            intermediate_steps=result["intermediate_steps"],
            factors_applied=result["factors_applied"],
            timestamp=now_iso,
        )

    def run_energy_intensity(
        self,
        total_energy_gj: Decimal,
        turnover_inr_crores: Decimal,
        org_node_id: Optional[str] = None,
        period_id: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> CalculationResult:
        result = calculate_energy_intensity(total_energy_gj, turnover_inr_crores)
        now_iso = datetime.now(timezone.utc).isoformat()
        self._persist_log(
            formula_code="CALC-INTENSITY-ENERGY",
            org_node_id=org_node_id,
            period_id=period_id,
            inputs={"total_energy_gj": str(total_energy_gj), "turnover_inr_crores": str(turnover_inr_crores)},
            output={"result_value": str(result["result_value"]), "result_unit": result["result_unit"]},
            factors=result["factors_applied"],
            executed_by=user_id,
        )
        return CalculationResult(
            formula_code=result["formula_code"],
            result_value=result["result_value"],
            result_unit=result["result_unit"],
            intermediate_steps=result["intermediate_steps"],
            factors_applied=result["factors_applied"],
            timestamp=now_iso,
        )

    def run_safety_ltifr(
        self,
        lost_time_injuries: int,
        total_man_hours_worked: Decimal,
        org_node_id: Optional[str] = None,
        period_id: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> CalculationResult:
        result = calculate_ltifr(lost_time_injuries, total_man_hours_worked)
        now_iso = datetime.now(timezone.utc).isoformat()
        self._persist_log(
            formula_code="CALC-SAFETY-LTIFR",
            org_node_id=org_node_id,
            period_id=period_id,
            inputs={"lost_time_injuries": lost_time_injuries, "total_man_hours_worked": str(total_man_hours_worked)},
            output={"result_value": str(result["result_value"]), "result_unit": result["result_unit"]},
            factors=result["factors_applied"],
            executed_by=user_id,
        )
        return CalculationResult(
            formula_code=result["formula_code"],
            result_value=result["result_value"],
            result_unit=result["result_unit"],
            intermediate_steps=result["intermediate_steps"],
            factors_applied=result["factors_applied"],
            timestamp=now_iso,
        )

    def run_scope3(
        self,
        business_travel=None,
        employee_commuting=None,
        purchased_goods=None,
        upstream_logistics=None,
        capital_goods=None,
        waste_operations=None,
        working_days: int = 25,
        org_node_id: Optional[str] = None,
        period_id: Optional[str] = None,
        user_id: Optional[str] = None,
    ):
        """
        Runs all selected Scope 3 sub-categories and returns aggregated tCO2e totals.
        Returns a dict compatible with Scope3CalcResult schema.
        """
        from datetime import datetime, timezone
        from decimal import Decimal
        from app.modules.calc.formulas.scope3 import (
            calculate_scope3_business_travel,
            calculate_scope3_employee_commuting,
            calculate_scope3_purchased_goods,
            calculate_scope3_upstream_logistics,
            calculate_scope3_capital_goods,
            calculate_scope3_waste,
        )

        now_iso = datetime.now(timezone.utc).isoformat()
        categories = []
        grand_total = Decimal("0")

        def _run_cat(fn, args, code, label, **kwargs):
            nonlocal grand_total
            try:
                res = fn(*args, **kwargs) if not kwargs else fn(*args)
                val = Decimal(str(res["result_value"]))
                grand_total += val
                categories.append({
                    "formula_code": code,
                    "category": label,
                    "result_value": val,
                    "result_unit": "tCO2e",
                    "intermediate_steps": res.get("intermediate_steps", {}),
                })
            except Exception as exc:
                categories.append({
                    "formula_code": code,
                    "category": label,
                    "result_value": Decimal("0"),
                    "result_unit": "tCO2e",
                    "intermediate_steps": {"error": str(exc)},
                })

        if business_travel:
            _run_cat(calculate_scope3_business_travel, [business_travel],
                     "CALC-GHG-SCOPE3-TRAVEL", "A: Business Travel")

        if employee_commuting:
            result_commute = calculate_scope3_employee_commuting(employee_commuting, working_days)
            val_c = Decimal(str(result_commute["result_value"]))
            grand_total += val_c
            categories.append({
                "formula_code": "CALC-GHG-SCOPE3-COMMUTE",
                "category": "B: Employee Commuting",
                "result_value": val_c,
                "result_unit": "tCO2e",
                "intermediate_steps": result_commute.get("intermediate_steps", {}),
            })

        if purchased_goods:
            _run_cat(calculate_scope3_purchased_goods, [purchased_goods],
                     "CALC-GHG-SCOPE3-PURCHASED-GOODS", "C: Purchased Goods & Materials")

        if upstream_logistics:
            _run_cat(calculate_scope3_upstream_logistics, [upstream_logistics],
                     "CALC-GHG-SCOPE3-LOGISTICS", "D: Upstream Transportation & Logistics")

        if capital_goods:
            _run_cat(calculate_scope3_capital_goods, [capital_goods],
                     "CALC-GHG-SCOPE3-CAPITAL-GOODS", "E: Capital Goods")

        if waste_operations:
            _run_cat(calculate_scope3_waste, [waste_operations],
                     "CALC-GHG-SCOPE3-WASTE", "F: Waste in Operations")

        self._persist_log(
            formula_code="CALC-GHG-SCOPE3-TOTAL",
            org_node_id=org_node_id,
            period_id=period_id,
            inputs={"categories_calculated": len(categories)},
            output={"total_scope3_tco2e": str(grand_total)},
            factors={},
            executed_by=user_id,
        )

        return {
            "total_scope3_tco2e": grand_total.quantize(Decimal("0.0001")),
            "result_unit": "tCO2e",
            "timestamp": now_iso,
            "categories": categories,
        }


def seed_emission_factors(db: Session):
    """Seeds statutory Indian government emission factors into the database."""
    from app.modules.calc.models import EmissionFactor
    # Fast check: skip if factors are already seeded
    if db.query(EmissionFactor.id).first() is not None:
        return

    INITIAL_FACTORS = [
        {"code": "COAL-ANT", "category": "Coal", "subtype": "Anthracite", "unit": "kg", "co2e_factor": Decimal("2.62000000"), "source": "MoEFCC / IPCC AR4 India", "effective_year": "2023-24"},
        {"code": "COAL-BIT", "category": "Coal", "subtype": "Bituminous", "unit": "kg", "co2e_factor": Decimal("2.35000000"), "source": "MoEFCC / CEA 2023", "effective_year": "2023-24"},
        {"code": "COAL-LIG", "category": "Coal", "subtype": "Lignite / Brown Coal", "unit": "kg", "co2e_factor": Decimal("1.55000000"), "source": "CEA / NLC India", "effective_year": "2023-24"},
        {"code": "DIESEL-HSD", "category": "Diesel", "subtype": "High Speed Diesel", "unit": "L", "co2e_factor": Decimal("2.68000000"), "source": "BEE PAT Manual 2023 / MoPNG", "effective_year": "2023-24"},
        {"code": "DIESEL-LDO", "category": "Diesel", "subtype": "Light Diesel Oil", "unit": "L", "co2e_factor": Decimal("2.60000000"), "source": "BEE PAT Manual 2023", "effective_year": "2023-24"},
        {"code": "GAS-CNG", "category": "Gas", "subtype": "Compressed Natural Gas", "unit": "kg", "co2e_factor": Decimal("2.21000000"), "source": "MoPNG PPAC 2023 / MoEFCC", "effective_year": "2023-24"},
        {"code": "GAS-PNG", "category": "Gas", "subtype": "Piped Natural Gas", "unit": "kg", "co2e_factor": Decimal("2.03000000"), "source": "MoPNG PPAC 2023 / CEA", "effective_year": "2023-24"},
        {"code": "GAS-LPG", "category": "Gas", "subtype": "Liquefied Petroleum Gas", "unit": "kg", "co2e_factor": Decimal("2.98000000"), "source": "BEE PAT Manual 2023 / MoPNG", "effective_year": "2023-24"},
        {"code": "PETROL", "category": "Petrol", "subtype": "Regular Motor Spirit", "unit": "L", "co2e_factor": Decimal("2.31000000"), "source": "BEE PAT Manual 2023 / MoPNG", "effective_year": "2023-24"},
        {"code": "GRID-CEA", "category": "Electricity", "subtype": "National Grid Average", "unit": "kWh", "co2e_factor": Decimal("0.71600000"), "source": "CEA CO2 Baseline Database Ver. 19/20", "effective_year": "2023-24"},
        {"code": "TRAVEL-FLIGHT", "category": "Travel", "subtype": "Domestic Air Travel", "unit": "passenger-km", "co2e_factor": Decimal("0.13000000"), "source": "ICAO Carbon Calculator / DEFRA India", "effective_year": "2023-24"},
    ]
    for f in INITIAL_FACTORS:
        existing = db.query(EmissionFactor).filter(EmissionFactor.code == f["code"]).first()
        if not existing:
            factor = EmissionFactor(**f)
            db.add(factor)
    db.commit()
