"""
app/pipelines/aggregation/stages/03_calculate.py
Stage 3: Computes derived indicators (Scope 1, Scope 2, Total Energy) for each reporting unit.
"""
from decimal import Decimal
from typing import List
from sqlalchemy.orm import Session
from app.modules.collection.models import Submission, DataPoint, EntryMethod
from app.modules.calc.formulas import calculate_scope1_stationary_combustion, calculate_scope2_electricity


def stage_03_calculate(db: Session, submissions: List[Submission]) -> int:
    """
    Computes deterministic emissions from raw activity data if missing.
    """
    calc_count = 0
    for sub in submissions:
        points = {dp.metric_code: dp for dp in sub.data_points}

        # Auto-compute Scope 2 if Electricity is present but Scope 2 isn't
        if "ENV-ENERGY-001" in points and "ENV-GHG-002" not in points:
            elec_dp = points["ENV-ENERGY-001"]
            if elec_dp.normalized_value:
                res = calculate_scope2_electricity(Decimal(str(elec_dp.normalized_value)))
                scope2_dp = DataPoint(
                    submission_id=sub.id,
                    metric_code="ENV-GHG-002",
                    value_numeric=float(res["result_value"]),
                    unit="tCO2e",
                    normalized_value=float(res["result_value"]),
                    entry_method=EntryMethod.API_FEED.value,
                    notes="Auto-derived by Stage 3 Calculation from ENV-ENERGY-001",
                )
                db.add(scope2_dp)
                calc_count += 1

    db.commit()
    return calc_count
