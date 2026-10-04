"""
app/pipelines/aggregation/stages/02_normalize_units.py
Stage 2: Standardizes all datapoint values to their indicator's base unit.
"""
from typing import List, Dict
from decimal import Decimal
from sqlalchemy.orm import Session
from app.modules.collection.models import DataPoint
from app.modules.metrics.models import Metric
from app.modules.calc.units import convert_unit


def stage_02_normalize_units(db: Session, submission_ids: List[str]) -> int:
    """
    Converts and populates normalized_value on every data point.
    """
    points = db.query(DataPoint).filter(DataPoint.submission_id.in_(submission_ids)).all()
    metrics: Dict[str, Metric] = {m.code: m for m in db.query(Metric).all()}
    count = 0

    for dp in points:
        metric = metrics.get(dp.metric_code)
        if metric and dp.value_numeric is not None:
            try:
                norm_dec = convert_unit(Decimal(str(dp.value_numeric)), dp.unit, metric.base_unit)
                dp.normalized_value = float(norm_dec)
                count += 1
            except Exception:
                dp.normalized_value = dp.value_numeric

    db.commit()
    return count
