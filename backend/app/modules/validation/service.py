"""
app/modules/validation/service.py
Service layer for orchestrating data validation, severity assessment, and human justification workflow.
"""
from typing import List, Optional
from sqlalchemy.orm import Session
from app.modules.validation.models import ValidationResult, Severity
from app.modules.validation.schemas import ValidationSummary, ValidationResultRead
from app.modules.validation.engine import validate_submission


class ValidationService:
    def __init__(self, db: Session):
        self.db = db

    def run_validation(self, submission_id: str) -> ValidationSummary:
        return validate_submission(self.db, submission_id)

    def get_results(self, submission_id: str) -> List[ValidationResult]:
        return (
            self.db.query(ValidationResult)
            .filter(ValidationResult.submission_id == submission_id)
            .all()
        )

    def submit_justification(self, result_id: str, justification: str) -> ValidationResult:
        res = self.db.query(ValidationResult).filter(ValidationResult.id == result_id).first()
        if not res:
            raise ValueError(f"Validation result '{result_id}' not found.")
        if res.severity == Severity.ERROR.value:
            raise ValueError("ERROR severity cannot be overridden with justification; data must be corrected.")
        res.justification = justification
        res.resolved = True
        self.db.commit()
        self.db.refresh(res)
        return res
