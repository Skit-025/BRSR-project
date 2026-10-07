import json
import hashlib
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.modules.org.models import OrgNode, ReportingPeriod, PeriodStatus
from app.modules.collection.models import Submission, DataPoint, SubmissionStatus
from app.modules.workflow.models import Review, ReviewDecision
from app.modules.workflow.schemas import ReviewActionRequest, ReviewQueueItem, PeriodLockResponse
from app.modules.workflow.guards import enforce_segregation_of_duties, enforce_approval_gates
from app.modules.evidence.models import EvidenceLink


def process_review(
    db: Session,
    submission_id: str,
    action: ReviewActionRequest
) -> Review:
    """
    F16-F19 Four-Eye Workflow Transition Engine:
    Handles APPROVE and RETURN decisions with SoD enforcement and audit recording.
    On BU approval, automatically dispatches Celery aggregation job (Spec §22).
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

    # 4. Send In-App Notifications (Spec §32)
    try:
        _send_review_notification(db, submission, action, current_stage)
    except Exception as exc:
        import logging
        logging.getLogger(__name__).warning("Notification dispatch failed (non-critical): %s", exc)

    # 5. Auto-trigger background calculation on approval (Spec §22)
    if action.decision == ReviewDecision.APPROVE:
        try:
            _trigger_calculation_pipeline(db, submission)
        except Exception as exc:
            import logging
            logging.getLogger(__name__).warning(
                "Calculation job dispatch failed (non-critical): %s", exc
            )

    return review


def _send_review_notification(db: Session, submission: Submission, action, stage: str) -> None:
    """
    Sends an in-app notification to the maker when their submission is acted upon (Spec §32).
    - On RETURN: notifies the maker their pack needs correction.
    - On APPROVE: notifies the maker their pack advanced to the next stage.
    """
    from app.modules.notifications.service import NotificationService
    from app.modules.workflow.models import ReviewDecision

    notif_svc = NotificationService(db)
    recipient_id = submission.maker_id
    if not recipient_id:
        return

    if action.decision == ReviewDecision.RETURN:
        notif_svc.notify_user(
            recipient_id=recipient_id,
            title="Submission Returned — Action Required",
            message=(
                f"Your ESG data submission has been returned by the reviewer. "
                f"Reason: {action.comment or 'See review comments.'} "
                f"Please correct and resubmit."
            ),
            link_url="/collection",
        )
    elif action.decision == ReviewDecision.APPROVE:
        next_stage = {
            "SUBMITTED": "BU Approved",
            "BU_APPROVED": "Subsidiary Approved",
        }.get(stage, "Approved")
        notif_svc.notify_user(
            recipient_id=recipient_id,
            title=f"Submission {next_stage} ✓",
            message=(
                f"Your ESG data submission has been approved and moved to '{next_stage}'. "
                f"The calculation engine will now derive GHG/emission values automatically."
            ),
            link_url="/collection",
        )


def _trigger_calculation_pipeline(db: Session, submission: Submission) -> None:
    """
    Dispatch a Celery incremental aggregation job for the entity's root tree,
    scoped to the submission's reporting period.
    """
    try:
        from app.workers.tasks_pipelines import run_incremental_aggregation

        # Walk up to find root entity
        entity = db.query(OrgNode).filter(OrgNode.id == submission.entity_id).first()
        root_entity_id = submission.entity_id
        if entity:
            current = entity
            while current.parent_id:
                parent = db.query(OrgNode).filter(OrgNode.id == current.parent_id).first()
                if parent:
                    current = parent
                else:
                    break
            root_entity_id = current.id

        run_incremental_aggregation.delay(
            period_id=submission.period_id,
            root_entity_id=root_entity_id
        )
    except Exception as exc:
        # Celery/Redis not available — run consolidation synchronously as fallback
        import logging
        logger = logging.getLogger(__name__)
        logger.info(
            "Celery dispatch failed (%s), running synchronous consolidation engine fallback for period %s...",
            exc, submission.period_id
        )
        try:
            from app.modules.consolidation.service import run_consolidation_engine
            run_consolidation_engine(db, str(submission.period_id))
            logger.info("Synchronous consolidation completed successfully for period %s.", submission.period_id)
        except Exception as sync_exc:
            logger.warning("Synchronous consolidation fallback failed: %s", sync_exc)



def lock_reporting_period(
    db: Session,
    period_id: str,
    user_id: str
) -> PeriodLockResponse:
    """
    F19/F24 Period Lock & Hash-Sealed Snapshot.
    """
    period = db.query(ReportingPeriod).filter(ReportingPeriod.id == period_id).first()
    if not period:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reporting period not found.")

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


def get_review_queue(db: Session, reviewer_user=None) -> List[ReviewQueueItem]:
    """
    Retrieves submissions awaiting review.
    Org-scoped: if reviewer_user has org_node_id, filters to their subtree (Spec §36).
    """
    pending_query = db.query(Submission).filter(
        Submission.status.in_([
            SubmissionStatus.SUBMITTED.value,
            SubmissionStatus.BU_APPROVED.value
        ])
    )

    # Subsidiary isolation — filter by ltree subtree of reviewer's scoped node
    if reviewer_user and reviewer_user.org_node_id:
        scoped_node = db.query(OrgNode).filter(OrgNode.id == reviewer_user.org_node_id).first()
        if scoped_node and scoped_node.path:
            try:
                from sqlalchemy import text
                subtree_rows = db.execute(
                    text("SELECT id::text FROM org_nodes WHERE path <@ :path AND is_deleted = false"),
                    {"path": scoped_node.path}
                ).fetchall()
                allowed_ids = [row[0] for row in subtree_rows]
                if allowed_ids:
                    pending_query = pending_query.filter(Submission.entity_id.in_(allowed_ids))
            except Exception:
                pass

    pending = pending_query.all()
    items: List[ReviewQueueItem] = []
    for s in pending:
        node = db.query(OrgNode).filter(OrgNode.id == s.entity_id).first()
        period = db.query(ReportingPeriod).filter(ReportingPeriod.id == s.period_id).first()
        hierarchy_path = _build_hierarchy_path(db, node) if node else ""
        
        # Calculate data point and evidence voucher counts
        dp_ids = [dp.id for dp in s.data_points]
        dp_count = len(dp_ids)
        ev_count = (
            db.query(EvidenceLink).filter(EvidenceLink.data_point_id.in_(dp_ids)).count()
            if dp_ids else 0
        )

        items.append(
            ReviewQueueItem(
                submission_id=s.id,
                entity_id=s.entity_id,
                entity_code=node.code if node else "UNKNOWN",
                entity_name=node.name if node else "Unknown Entity",
                entity_type=node.type if node else "project",
                hierarchy_path=hierarchy_path,
                period_id=s.period_id,
                period_code=period.code if period else "UNKNOWN",
                status=s.status,
                maker_id=s.maker_id,
                submitted_at=s.submitted_at,
                version=s.version,
                data_point_count=dp_count,
                evidence_count=ev_count
            )
        )
    return items


def _build_hierarchy_path(db: Session, node: OrgNode) -> str:
    """Builds e.g. 'MEIL Group > Infrastructure BU > Highway P-001'"""
    path_parts = []
    current = node
    while current:
        path_parts.insert(0, current.name)
        if current.parent_id:
            current = db.query(OrgNode).filter(OrgNode.id == current.parent_id).first()
        else:
            break
    return " > ".join(path_parts)
