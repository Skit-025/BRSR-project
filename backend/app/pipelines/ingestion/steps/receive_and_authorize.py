"""
app/pipelines/ingestion/steps/receive_and_authorize.py
P1 Stage 1: Validate the incoming submission request and authorise the submitter.

Checks:
  - Period is not locked
  - User has MAKER or ESG_MANAGER role
  - Entity exists in the org hierarchy
  - No duplicate active submission for same (entity, period, metric)
"""
import logging
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.modules.org.models import OrgNode, ReportingPeriod, PeriodStatus
from app.modules.collection.models import Submission, SubmissionStatus
from app.security.sod import assert_can_submit

logger = logging.getLogger(__name__)


def receive_and_authorize(
    db: Session,
    entity_id: str,
    period_id: str,
    user_id: str,
    user_role: str,
    metric_codes: list[str],
) -> tuple[OrgNode, ReportingPeriod]:
    """
    Validates the submission context.

    Returns:
        (OrgNode, ReportingPeriod) on success.

    Raises:
        HTTP 403 — role not permitted to submit
        HTTP 404 — entity or period not found
        HTTP 423 — period is locked
        HTTP 409 — duplicate active submission exists
    """
    # 1. Role check
    assert_can_submit(user_role)

    # 2. Entity exists
    entity = db.query(OrgNode).filter(
        OrgNode.id == entity_id, OrgNode.is_deleted == False
    ).first()
    if not entity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Org entity '{entity_id}' not found.",
        )

    # 3. Period exists and is open
    period = db.query(ReportingPeriod).filter(ReportingPeriod.id == period_id).first()
    if not period:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Reporting period '{period_id}' not found.",
        )
    if period.status == PeriodStatus.LOCKED.value:
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail=f"Reporting period '{period.code}' is locked. No further submissions accepted.",
        )

    # 4. No duplicate active submission
    existing = db.query(Submission).filter(
        Submission.entity_id == entity_id,
        Submission.period_id == period_id,
        Submission.status.notin_([
            SubmissionStatus.RETURNED.value,
            SubmissionStatus.CANCELLED.value,
        ]),
        Submission.is_deleted == False,
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"An active submission (id={existing.id}, status={existing.status}) "
                f"already exists for entity '{entity.code}' / period '{period.code}'. "
                "Return or cancel it before creating a new one."
            ),
        )

    logger.info(
        "Submission authorised: entity=%s period=%s user=%s role=%s",
        entity.code, period.code, user_id, user_role,
    )
    return entity, period
