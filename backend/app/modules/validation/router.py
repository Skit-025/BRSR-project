from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.modules.validation.schemas import ValidationSummary, JustifyWarningRequest, ValidationResultRead
from app.modules.validation.engine import validate_submission, justify_warning

router = APIRouter(prefix="/validation", tags=["Validation & Exception Rules"])

@router.post("/check/{submission_id}", response_model=ValidationSummary)
def run_validation_checks(submission_id: str, db: Session = Depends(get_db)):
    """
    F13-F14: Evaluates all validation rules on a monthly pack.
    Returns error gate status and open items requiring justification.
    """
    try:
        summary = validate_submission(db, submission_id)
        return summary
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

@router.post("/justify", response_model=ValidationResultRead)
def submit_justification(req: JustifyWarningRequest, db: Session = Depends(get_db)):
    """Submits written justification for an AI anomaly or warning threshold."""
    try:
        result = justify_warning(db, req.validation_id, req.justification)
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
