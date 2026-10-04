"""
app/pipelines/review/steps/score_anomalies.py
P2 Stage 2: Runs AI Engine 2 anomaly scoring across all submitted datapoints.
"""
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.modules.collection.models import DataPoint
from app.ai.e2_anomaly.engine import e2_engine
from app.ai.schemas import E2AnomalyRequest


def execute_anomaly_scoring_step(db: Session, submission_id: str) -> List[Dict[str, Any]]:
    """Runs statistical anomaly scoring on submitted data points."""
    points = db.query(DataPoint).filter(DataPoint.submission_id == submission_id).all()
    anomalies = []

    for dp in points:
        if dp.value_numeric is not None:
            res = e2_engine.detect_anomalies(
                E2AnomalyRequest(
                    metric_code=dp.metric_code,
                    current_value=dp.value_numeric,
                    historical_values=[],
                )
            )
            if res.is_anomaly:
                anomalies.append({
                    "data_point_id": dp.id,
                    "metric_code": dp.metric_code,
                    "score": res.anomaly_score,
                    "explanation": res.explanation,
                })
    return anomalies
