"""
app/pipelines/review/steps/run_validation.py
P2 Stage 1: Runs deterministic validation rules on the submitted pack.
"""
from sqlalchemy.orm import Session
from app.modules.validation.engine import validate_submission
from app.modules.validation.schemas import ValidationSummary


def execute_validation_step(db: Session, submission_id: str) -> ValidationSummary:
    """Executes all business, range, and evidence presence validation checks."""
    return validate_submission(db, submission_id)
