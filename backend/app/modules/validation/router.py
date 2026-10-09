"""
app/modules/validation/router.py
Validation & Exception Rules Router.
Requires authentication; project_admin and above can trigger validation checks.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.modules.auth.models import User
from app.modules.auth.router import get_current_active_user
from app.modules.collection.models import Submission
from app.modules.validation.schemas import ValidationSummary, JustifyWarningRequest, ValidationResultRead
from app.modules.validation.engine import validate_submission, justify_warning
from app.security.scope import assert_user_authorized_for_project

router = APIRouter(prefix="/validation", tags=["Validation & Exception Rules"])


@router.post("/check/{submission_id}", response_model=ValidationSummary)
def run_validation_checks(
    submission_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    F13-F14: Evaluates all validation rules on a monthly pack.
    Returns error gate status and open items requiring justification.
    Enforces project-level scope isolation.
    """
    # Scope check: user must be authorized for the project owning this submission
    sub = db.query(Submission).filter(Submission.id == submission_id).first()
    if sub:
        assert_user_authorized_for_project(db, current_user, str(sub.entity_id), "validate submissions for this project")

    try:
        summary = validate_submission(db, submission_id)
        return summary
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/justify", response_model=ValidationResultRead)
def submit_justification(
    req: JustifyWarningRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Submits written justification for an AI anomaly or warning threshold."""
    try:
        result = justify_warning(db, req.validation_id, req.justification)
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
