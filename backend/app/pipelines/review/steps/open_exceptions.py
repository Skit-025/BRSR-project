"""
app/pipelines/review/steps/open_exceptions.py
P2 Stage 3: Automatically logs exception tickets for critical warnings or anomalies.
"""
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.modules.validation.exceptions.service import ValidationExceptionService
from app.modules.validation.schemas import ValidationSummary


def execute_open_exceptions_step(
    db: Session,
    submission_id: str,
    val_summary: ValidationSummary,
    anomalies: List[Dict[str, Any]],
) -> int:
    """Raises tracking tickets for any severe anomalies or unresolved warnings."""
    service = ValidationExceptionService(db)
    opened = 0

    for a in anomalies:
        service.raise_exception(
            submission_id=submission_id,
            metric_code=a["metric_code"],
            rule_id="AI-E2-ANOMALY",
            severity="WARNING",
            description=f"AI Anomaly Detected (Score: {a['score']}): {a['explanation']}",
            raised_by="AI_E2_ENGINE",
        )
        opened += 1

    return opened
