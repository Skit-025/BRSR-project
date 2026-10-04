"""
app/pipelines/review/pipeline.py
P2 Review & Validation Pipeline Orchestrator:
Chains validation, AI anomaly scoring, exception ticket creation, and reviewer routing.
"""
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from app.pipelines.review.steps.run_validation import execute_validation_step
from app.pipelines.review.steps.score_anomalies import execute_anomaly_scoring_step
from app.pipelines.review.steps.open_exceptions import execute_open_exceptions_step
from app.pipelines.review.steps.route_to_reviewer import execute_route_step


def run_review_pipeline(
    db: Session,
    submission_id: str,
    reviewer_user_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Executes all 4 stages of the P2 Review Pipeline.
    """
    # Stage 1: Deterministic validation
    val_summary = execute_validation_step(db, submission_id)

    # Stage 2: AI Anomaly detection
    anomalies = execute_anomaly_scoring_step(db, submission_id)

    # Stage 3: Exception logging
    exceptions_raised = execute_open_exceptions_step(db, submission_id, val_summary, anomalies)

    # Stage 4: Route to reviewer if errors are resolved
    sub = None
    if val_summary.can_submit:
        sub = execute_route_step(db, submission_id, reviewer_user_id)

    return {
        "pipeline": "P2_REVIEW",
        "submission_id": submission_id,
        "is_valid": val_summary.can_submit,
        "error_count": val_summary.error_count,
        "warning_count": val_summary.warning_count,
        "anomalies_detected": len(anomalies),
        "exceptions_opened": exceptions_raised,
        "status": sub.status if sub else "VALIDATION_FAILED",
    }
