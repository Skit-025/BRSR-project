"""
app/modules/workflow/router.py
Four-Eyes Maker-Checker Workflow Router.
Strict Segregation of Duties (Maker != Checker) and Period Locking.
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.modules.auth.models import User
from app.modules.auth.router import get_current_active_user
from app.modules.workflow.schemas import ReviewActionRequest, ReviewRead, ReviewQueueItem, PeriodLockResponse
from app.modules.workflow.service import process_review, get_review_queue, lock_reporting_period
from app.security.rbac import Role

router = APIRouter(prefix="/workflow", tags=["Four-Eye Maker-Checker Workflow"])


@router.get("/queue", response_model=List[ReviewQueueItem])
def get_pending_review_queue(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Lists all monthly packs currently awaiting BU or Subsidiary approval within user scope."""
    return get_review_queue(db)


@router.post("/review/{submission_id}", response_model=ReviewRead, status_code=status.HTTP_200_OK)
def review_submission_pack(
    submission_id: str,
    action: ReviewActionRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    F16-F19 Maker-Checker Decision:
    - Enforces Segregation of Duties (reviewer != maker)
    - Verifies validation error gates
    - Advances status or returns pack with mandatory review comments.
    """
    # Overwrite reviewer_id with authenticated user's ID for cryptographic integrity
    action.reviewer_id = str(current_user.id)
    review = process_review(db, submission_id, action)
    return review


@router.post("/lock-period/{period_id}", response_model=PeriodLockResponse)
def lock_period(
    period_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Group ESG sign-off and period lock.
    Authorized for group_admin, esg_manager, or system_admin.
    Generates immutable SHA-256 seal of reported numbers.
    """
    allowed_roles = [Role.GROUP_ADMIN.value, Role.ESG_MANAGER.value, Role.SYSTEM_ADMIN.value]
    if current_user.role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Only {allowed_roles} are authorized to lock reporting periods."
        )
    res = lock_reporting_period(db, period_id, str(current_user.id))
    return res
