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
