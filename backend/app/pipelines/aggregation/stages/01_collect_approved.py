"""
app/pipelines/aggregation/stages/01_collect_approved.py
Stage 1: Collects all approved submissions for the specified reporting period.
"""
from typing import List
from sqlalchemy.orm import Session
from app.modules.collection.models import Submission, SubmissionStatus


def stage_01_collect_approved(db: Session, period_id: str) -> List[Submission]:
    """
    Fetches submissions that have passed maker-checker gates:
    BU_APPROVED, SUBSIDIARY_APPROVED, or CONSOLIDATED.
    """
    valid_statuses = [
        SubmissionStatus.BU_APPROVED.value,
        SubmissionStatus.SUBSIDIARY_APPROVED.value,
        SubmissionStatus.CONSOLIDATED.value,
    ]
    return (
        db.query(Submission)
        .filter(
            Submission.period_id == period_id,
            Submission.status.in_(valid_statuses),
            Submission.is_deleted == False,
        )
        .all()
    )
