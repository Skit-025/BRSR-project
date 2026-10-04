"""
app/pipelines/review/steps/route_to_reviewer.py
P2 Stage 4: Transitions pack to review status and dispatches reviewer notification.
"""
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.modules.collection.models import Submission, SubmissionStatus
from app.modules.notifications.service import NotificationService


def execute_route_step(db: Session, submission_id: str, reviewer_user_id: str = None) -> Submission:
    """Transitions submission status to UNDER_BU_REVIEW and notifies reviewer."""
    sub = db.query(Submission).filter(Submission.id == submission_id).first()
    if not sub:
        raise ValueError(f"Submission '{submission_id}' not found.")

    sub.status = SubmissionStatus.UNDER_BU_REVIEW.value
    db.commit()
    db.refresh(sub)

    if reviewer_user_id:
        notif_service = NotificationService(db)
        notif_service.notify_user(
            recipient_id=reviewer_user_id,
            title="New Submission Pending Review",
            message=f"Submission pack {submission_id} is awaiting your review and approval.",
            link_url=f"/workflow/review/{submission_id}",
        )

    return sub
