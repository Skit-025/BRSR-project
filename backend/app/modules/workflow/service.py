import json
import hashlib
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.modules.org.models import OrgNode, ReportingPeriod, PeriodStatus
from app.modules.collection.models import Submission, SubmissionRevision, DataPoint, SubmissionStatus
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
    F16-F19 Four-Eye Workflow Transition Engine — Eight-Role Hierarchical Architecture:
    Handles APPROVE and RETURN decisions with SoD enforcement and audit recording.
    - Project Admin: SUBMITTED → PROJECT_APPROVED
    - BU Admin: UNDER_BU_REVIEW (or PROJECT_APPROVED) → BU_APPROVED
    - Subsidiary Admin: UNDER_SUBSIDIARY_REVIEW (or BU_APPROVED) → SUBSIDIARY_APPROVED
    - Group Admin: UNDER_GROUP_REVIEW (or SUBSIDIARY_APPROVED) → LOCKED
    Dispatches notifications and triggers calculations.
    """
    submission = db.query(Submission).filter(Submission.id == submission_id).first()
    if not submission:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission pack not found.")

    # 1. Enforce Segregation of Duties (maker != reviewer)
    enforce_segregation_of_duties(submission, action.reviewer_id)

    # 2. Check current state and transitions
    current_stage = submission.status
    from app.modules.auth.models import User
    from app.security.rbac import Role
    reviewer = db.query(User).filter(User.id == action.reviewer_id).first()
    reviewer_role = reviewer.role if reviewer else None
    entity = db.query(OrgNode).filter(OrgNode.id == submission.entity_id).first()
    entity_type = (entity.type if entity else "").lower()

    event = "PROJECT_APPROVED"

    if action.decision == ReviewDecision.RETURN:
        # Mandatory comment on return
        if not action.comment or not action.comment.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Mandatory return comment required explaining why data was rejected."
            )
        submission.status = SubmissionStatus.RETURNED.value
        submission.version += 1

        if current_stage == SubmissionStatus.SUBMITTED.value:
            event = "PROJECT_REJECTED"
        elif current_stage == SubmissionStatus.PROJECT_APPROVED.value:
            event = "BU_PROJECT_REJECTED"
        elif current_stage in (SubmissionStatus.UNDER_BU_REVIEW.value, SubmissionStatus.BU_APPROVED.value):
            event = "BU_REJECTED"
        elif current_stage == SubmissionStatus.UNDER_SUBSIDIARY_REVIEW.value and entity_type in ("business_unit", "bu"):
            event = "SUBSIDIARY_BU_REJECTED"
        elif current_stage == SubmissionStatus.UNDER_SUBSIDIARY_REVIEW.value:
            event = "SUBSIDIARY_REJECTED"
        elif current_stage == SubmissionStatus.SUBSIDIARY_APPROVED.value:
            event = "GROUP_SUBSIDIARY_REJECTED"
        elif current_stage in (SubmissionStatus.UNDER_GROUP_REVIEW.value, SubmissionStatus.CONSOLIDATED.value):
            event = "GROUP_REJECTED"
        else:
            event = "PROJECT_REJECTED"

    elif action.decision == ReviewDecision.APPROVE:
        # Enforce data quality and evidence gates
        enforce_approval_gates(submission, db)

        if reviewer_role == Role.PROJECT_ADMIN.value and current_stage == SubmissionStatus.SUBMITTED.value:
            submission.status = SubmissionStatus.PROJECT_APPROVED.value
            event = "PROJECT_APPROVED"
        elif reviewer_role in (Role.BU_ESG_MANAGER.value, Role.BU_SUPERVISOR.value) and entity_type in ("project", "site") and current_stage == SubmissionStatus.PROJECT_APPROVED.value:
            submission.status = SubmissionStatus.BU_PROJECT_ACCEPTED.value
            event = "BU_PROJECT_ACCEPTED"
        elif reviewer_role == Role.BU_ADMIN.value and entity_type in ("business_unit", "bu") and current_stage == SubmissionStatus.UNDER_BU_REVIEW.value:
            submission.status = SubmissionStatus.BU_APPROVED.value
            event = "BU_APPROVED"
        elif reviewer_role in (Role.SUBSIDIARY_ESG_MANAGER.value, Role.SUBSIDIARY_SUPERVISOR.value) and entity_type in ("business_unit", "bu") and current_stage == SubmissionStatus.UNDER_SUBSIDIARY_REVIEW.value:
            submission.status = SubmissionStatus.SUBSIDIARY_BU_ACCEPTED.value
            event = "SUBSIDIARY_BU_ACCEPTED"
        elif reviewer_role == Role.SUBSIDIARY_ADMIN.value and entity_type in ("subsidiary", "company") and current_stage == SubmissionStatus.UNDER_SUBSIDIARY_REVIEW.value:
            submission.status = SubmissionStatus.SUBSIDIARY_APPROVED.value
            event = "SUBSIDIARY_APPROVED"
        elif reviewer_role in (Role.GROUP_ESG_MANAGER.value, Role.GROUP_SUPERVISOR.value) and entity_type in ("subsidiary", "company") and current_stage == SubmissionStatus.SUBSIDIARY_APPROVED.value:
            submission.status = SubmissionStatus.GROUP_SUBSIDIARY_ACCEPTED.value
            event = "GROUP_SUBSIDIARY_ACCEPTED"
        elif reviewer_role == Role.GROUP_ADMIN.value and entity_type == "group" and current_stage in (SubmissionStatus.UNDER_GROUP_REVIEW.value, SubmissionStatus.CONSOLIDATED.value):
            submission.status = SubmissionStatus.LOCKED.value
            event = "GROUP_APPROVED"
        elif reviewer_role == Role.SYSTEM_ADMIN.value:
            raise HTTPException(status_code=403, detail="System Admin cannot bypass the assigned review stage.")
        else:
            raise HTTPException(status_code=409, detail="This role or report stage is not authorized for this review decision.")

        submission.version += 1

    # 3. Record Review Audit Entry
    review = Review(
        submission_id=submission.id,
        stage=current_stage,
        reviewer_id=action.reviewer_id,
        submission_revision_id=(db.query(SubmissionRevision.id)
            .filter(SubmissionRevision.submission_id == submission.id)
            .order_by(SubmissionRevision.revision_number.desc()).limit(1).scalar()),
        decision=action.decision.value,
        comment=action.comment,
        decided_at=datetime.now(timezone.utc)
    )
    db.add(review)
    db.commit()
    db.refresh(review)

    # 4. Send In-App Notifications across all 12 events
    try:
        from app.modules.workflow.notifications import dispatch_workflow_notification
        dispatch_workflow_notification(
            db,
            event=event,
            submission=submission,
            comment=action.comment,
            actor_id=action.reviewer_id
        )
    except Exception as exc:
        import logging
        logging.getLogger(__name__).warning("Notification dispatch failed (non-critical): %s", exc)

    # 5. Auto-trigger background calculation on approval
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


def derive_and_persist_calculated_kpis(db: Session, submission: Submission) -> None:
    """
    Computes GHG emissions (Scope 1 and Scope 2) and Gross Energy from raw activity data points
    using SEBI BRSR and CEA/IPCC statutory formulas, and persists them into the submission pack.
    """
    from app.modules.collection.models import DataPoint, ValueStatus, EntryMethod
    dps = db.query(DataPoint).filter(
        DataPoint.submission_id == submission.id,
        DataPoint.is_deleted == False
    ).all()
    if not dps:
        return

    grid_kwh = 0.0
    diesel_litres = 0.0
    for dp in dps:
        val = float(dp.value_numeric or 0.0)
        code = (dp.metric_code or "").upper()
        if code == "ENV-ENERGY-001":
            grid_kwh += val
        elif code in ("ENV-ENERGY-002", "ENV-ENERGY-003", "ENV-DIESEL-001"):
            diesel_litres += val

    if grid_kwh <= 0 and diesel_litres <= 0:
        return

    # 1. Gross Energy Consumption (GJ)
    gross_energy_gj = round((grid_kwh * 0.0036) + (diesel_litres * 0.03596), 2)
    # 2. Scope 1: Diesel combustion * 0.00268 tCO2e / L
    scope1_tco2e = round(diesel_litres * 0.00268, 2)
    # 3. Scope 2: Grid electricity * 0.000716 tCO2e / kWh (CEA Baseline v20.0)
    scope2_tco2e = round(grid_kwh * 0.000716, 2)
    # 4. Total GHG
    total_ghg_tco2e = round(scope1_tco2e + scope2_tco2e, 2)

    derived = [
        ("ENV-GHG-001", scope1_tco2e, "tCO2e", "Derived Scope 1 from fuel combustion (IPCC 2006)"),
        ("ENV-GHG-002", scope2_tco2e, "tCO2e", "Derived Scope 2 from grid electricity (CEA v20.0)"),
        ("ENV-GHG", total_ghg_tco2e, "tCO2e", "Derived Gross GHG Footprint (Scope 1 + Scope 2)"),
        ("ENV-ENERGY-TOTAL", gross_energy_gj, "GJ", "Derived Gross Energy Consumption (Grid + Diesel)"),
    ]

    dp_map = {(dp.metric_code or "").upper(): dp for dp in dps}
    for m_code, m_val, m_unit, m_notes in derived:
        if m_code in dp_map:
            dp_map[m_code].value_numeric = m_val
            dp_map[m_code].unit = m_unit
            dp_map[m_code].notes = m_notes
        else:
            new_dp = DataPoint(
                submission_id=submission.id,
                metric_code=m_code,
                value_numeric=m_val,
                unit=m_unit,
                status=ValueStatus.ACTUAL.value,
                entry_method=EntryMethod.MANUAL_FORM.value,
                notes=m_notes,
                version=1
            )
            db.add(new_dp)

    db.commit()


def _trigger_calculation_pipeline(db: Session, submission: Submission) -> None:
    """
    Derives GHG and energy metrics, and dispatches consolidation for the entity's root tree,
    scoped to the submission's reporting period.
    """
    try:
        derive_and_persist_calculated_kpis(db, submission)
    except Exception as d_exc:
        import logging
        logging.getLogger(__name__).warning("Derived calculation failed: %s", d_exc)

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
    Retrieves submissions awaiting review — Eight-Role Hierarchical Architecture.
    - Project Admin: SUBMITTED project packs
    - BU Admin: UNDER_BU_REVIEW & PROJECT_APPROVED packs in their BU
    - Subsidiary Admin: UNDER_SUBSIDIARY_REVIEW & BU_APPROVED packs in their Subsidiary
    - Group Admin: UNDER_GROUP_REVIEW & SUBSIDIARY_APPROVED packs in their Group
    - System Admin: all pending packs
    """
    from app.security.rbac import Role
    from app.security.scope import get_user_assigned_project_ids

    role = getattr(reviewer_user, "role", None)

    review_config = {
        Role.PROJECT_ADMIN.value: ([SubmissionStatus.SUBMITTED.value], {"project", "site"}, True),
        Role.BU_ESG_MANAGER.value: ([SubmissionStatus.PROJECT_APPROVED.value], {"project", "site"}, False),
        Role.BU_SUPERVISOR.value: ([SubmissionStatus.PROJECT_APPROVED.value], {"project", "site"}, False),
        Role.BU_ADMIN.value: ([SubmissionStatus.UNDER_BU_REVIEW.value], {"business_unit", "bu"}, True),
        Role.SUBSIDIARY_ESG_MANAGER.value: ([SubmissionStatus.UNDER_SUBSIDIARY_REVIEW.value], {"business_unit", "bu"}, False),
        Role.SUBSIDIARY_SUPERVISOR.value: ([SubmissionStatus.UNDER_SUBSIDIARY_REVIEW.value], {"business_unit", "bu"}, False),
        Role.SUBSIDIARY_ADMIN.value: ([SubmissionStatus.UNDER_SUBSIDIARY_REVIEW.value], {"subsidiary", "company"}, True),
        Role.GROUP_ESG_MANAGER.value: ([SubmissionStatus.SUBSIDIARY_APPROVED.value], {"subsidiary", "company"}, False),
        Role.GROUP_SUPERVISOR.value: ([SubmissionStatus.SUBSIDIARY_APPROVED.value], {"subsidiary", "company"}, False),
        Role.GROUP_ADMIN.value: ([SubmissionStatus.UNDER_GROUP_REVIEW.value], {"group"}, True),
    }
    if role in review_config:
        pending_statuses, entity_types, exact_entity = review_config[role]
    elif role == Role.SYSTEM_ADMIN.value or role is None:
        pending_statuses = [SubmissionStatus.SUBMITTED.value]
        pending_statuses = [
            SubmissionStatus.SUBMITTED.value,
            SubmissionStatus.PROJECT_APPROVED.value,
            SubmissionStatus.UNDER_BU_REVIEW.value,
            SubmissionStatus.UNDER_SUBSIDIARY_REVIEW.value,
            SubmissionStatus.SUBSIDIARY_APPROVED.value,
            SubmissionStatus.UNDER_GROUP_REVIEW.value,
        ]
        entity_types = None
        exact_entity = False
    else:
        # Supervisors do not have an approval queue
        return []

    pending_query = db.query(Submission).filter(
        Submission.status.in_(pending_statuses)
    )
    if entity_types:
        matching_nodes = db.query(OrgNode.id).filter(OrgNode.type.in_(entity_types), OrgNode.is_deleted == False).subquery()
        pending_query = pending_query.filter(Submission.entity_id.in_(matching_nodes))

    # Scoped isolation
    if reviewer_user:
        if exact_entity and reviewer_user.org_node_id:
            pending_query = pending_query.filter(Submission.entity_id == str(reviewer_user.org_node_id))
        elif reviewer_user.role == Role.PROJECT_ADMIN.value:
            assigned_ids = get_user_assigned_project_ids(db, reviewer_user)
            if assigned_ids:
                pending_query = pending_query.filter(Submission.entity_id.in_(list(assigned_ids)))
            elif reviewer_user.org_node_id:
                pending_query = pending_query.filter(Submission.entity_id == str(reviewer_user.org_node_id))
        elif reviewer_user.org_node_id:
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
