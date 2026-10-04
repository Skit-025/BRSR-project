from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.modules.collection.models import Submission
from app.modules.validation.engine import validate_submission

def enforce_segregation_of_duties(submission: Submission, reviewer_id: str):
    """
    F16 Segregation of Duties (SoD) Rule:
    The reviewer CANNOT be the same user who created or submitted the data pack.
    """
    if submission.maker_id and submission.maker_id == reviewer_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Segregation of Duties Violation: You cannot review or approve your own submission pack."
        )

def enforce_approval_gates(submission: Submission, db: Session):
    """
    F16 Gate Check:
    All ERROR severity validation rules must be zero and all WARNINGs must be justified before approval.
    """
    summary = validate_submission(db, submission.id)
    if not summary.can_submit:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot approve: Pack has {summary.error_count} error(s) and {summary.unjustified_warning_count} unjustified warning(s)."
        )
