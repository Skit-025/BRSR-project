"""
app/pipelines/ingestion/steps/persist_draft.py
P1 Stage 3: Create the Submission record in DRAFT status with its DataPoints.
"""
import logging
from decimal import Decimal
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from app.modules.collection.models import Submission, DataPoint, SubmissionStatus
from app.modules.collection.unit_converter import normalize_value

logger = logging.getLogger(__name__)


def persist_draft(
    db: Session,
    entity_id: str,
    period_id: str,
    maker_id: str,
    data_points: list[dict],   # [{"metric_code": "E01", "value": 42850, "unit": "GJ", "notes": ""}]
    mutation_id: str | None = None,
) -> Submission:
    """
    Create a Submission in DRAFT status with all its DataPoints.
    Unit normalisation is applied immediately.

    Args:
        data_points: List of raw data point dicts from the API request.
        mutation_id: Optional idempotency key (stored on the submission).

    Returns:
        Newly created Submission ORM object.
    """
    submission = Submission(
        entity_id   = entity_id,
        period_id   = period_id,
        maker_id    = maker_id,
        status      = SubmissionStatus.DRAFT.value,
        mutation_id = mutation_id,
        version     = 1,
    )
    db.add(submission)
    db.flush()   # get submission.id without committing

    for dp_raw in data_points:
        metric_code = dp_raw["metric_code"]
        raw_value   = dp_raw.get("value")
        unit        = dp_raw.get("unit", "")
        notes       = dp_raw.get("notes", "")

        # Normalize to SI base unit
        norm_value, norm_unit = normalize_value(raw_value, unit, metric_code)

        dp = DataPoint(
            submission_id    = submission.id,
            metric_code      = metric_code,
            value_numeric    = float(raw_value) if raw_value is not None else None,
            unit             = unit,
            normalized_value = float(norm_value) if norm_value is not None else None,
            normalized_unit  = norm_unit,
            notes            = notes,
        )
        db.add(dp)

    db.commit()
    db.refresh(submission)

    logger.info(
        "Draft submission created: id=%s entity=%s period=%s points=%d",
        submission.id, entity_id, period_id, len(data_points),
    )
    return submission
