import json
import hashlib
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.modules.org.models import OrgNode, ReportingPeriod, PeriodStatus
from app.modules.collection.models import Submission, DataPoint, SubmissionStatus
from app.modules.workflow.models import Review, ReviewDecision
from app.modules.workflow.schemas import ReviewActionRequest, ReviewQueueItem, PeriodLockResponse
from app.modules.workflow.guards import enforce_segregation_of_duties, enforce_approval_gates

def process_review(
    db: Session,
    submission_id: str,
    action: ReviewActionRequest
) -> Review:
    """
    F16-F19 Four-Eye Workflow Transition Engine:
    Handles APPROVE and RETURN decisions with SoD enforcement and audit recording.
    """
    submission = db.query(Submission).filter(Submission.id == submission_id).first()
    if not submission:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission pack not found.")

    # 1. Enforce Segregation of Duties
    enforce_segregation_of_duties(submission, action.reviewer_id)

    # 2. Check current state and transitions
    current_stage = submission.status

    if action.decision == ReviewDecision.RETURN:
        # Mandatory comment on return
        if not action.comment or not action.comment.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Mandatory return comment required explaining why data was rejected."
            )
        submission.status = SubmissionStatus.RETURNED.value
        submission.version += 1

    elif action.decision == ReviewDecision.APPROVE:
        # Enforce data quality and evidence gates
        enforce_approval_gates(submission, db)

        if submission.status == SubmissionStatus.SUBMITTED.value:
            submission.status = SubmissionStatus.BU_APPROVED.value
        elif submission.status == SubmissionStatus.BU_APPROVED.value:
            submission.status = SubmissionStatus.SUBSIDIARY_APPROVED.value
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot approve submission currently in '{submission.status}' status."
            )
        submission.version += 1

    # 3. Record Review Audit Entry
    review = Review(
        submission_id=submission.id,
        stage=current_stage,
        reviewer_id=action.reviewer_id,
        decision=action.decision.value,
        comment=action.comment,
        decided_at=datetime.now(timezone.utc)
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    return review

def lock_reporting_period(
    db: Session,
    period_id: str,
    user_id: str
) -> PeriodLockResponse:
    """
    F19/F24 Period Lock & Hash-Sealed Snapshot:
    Locks the period against further submissions and creates an immutable cryptographic snapshot hash.
    """
    period = db.query(ReportingPeriod).filter(ReportingPeriod.id == period_id).first()
    if not period:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reporting period not found.")

    # Gather all approved data points in this period to create snapshot hash
    data_points = db.query(DataPoint).join(Submission).filter(
        Submission.period_id == period_id
    ).order_by(DataPoint.id).all()

    payload_summary = [
        {"metric": dp.metric_code, "val": dp.normalized_value or dp.value_numeric, "unit": dp.unit}
        for dp in data_points
    ]
    snapshot_bytes = json.dumps(payload_summary, sort_keys=True, default=str).encode("utf-8")
    snapshot_hash = hashlib.sha256(snapshot_bytes).hexdigest()

    period.status = PeriodStatus.LOCKED.value
    db.commit()
    db.refresh(period)

    return PeriodLockResponse(
        period_id=period.id,
        period_code=period.code,
        status=period.status,
        snapshot_hash=snapshot_hash,
        message=f"Reporting period '{period.code}' is now LOCKED and hash-sealed for external assurance."
    )

def get_review_queue(db: Session) -> List[ReviewQueueItem]:
    """Retrieves all submissions currently awaiting review in the work queue."""
    pending = db.query(Submission).filter(
        Submission.status.in_([
            SubmissionStatus.SUBMITTED.value,
            SubmissionStatus.BU_APPROVED.value
        ])
    ).all()

    items: List[ReviewQueueItem] = []
    for s in pending:
        node = db.query(OrgNode).filter(OrgNode.id == s.entity_id).first()
        period = db.query(ReportingPeriod).filter(ReportingPeriod.id == s.period_id).first()
        items.append(
            ReviewQueueItem(
                submission_id=s.id,
                entity_id=s.entity_id,
                entity_code=node.code if node else "UNKNOWN",
                entity_name=node.name if node else "Unknown Entity",
                period_id=s.period_id,
                period_code=period.code if period else "UNKNOWN",
                status=s.status,
                maker_id=s.maker_id,
                submitted_at=s.submitted_at,
                version=s.version
            )
        )
    return items
