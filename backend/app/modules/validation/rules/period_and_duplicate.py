"""
app/modules/validation/rules/period_and_duplicate.py
Validation rule: Period status and duplicate entries prevention.
"""
from typing import Optional, Tuple
from sqlalchemy.orm import Session
from app.modules.org.models import ReportingPeriod, PeriodStatus
from app.modules.collection.models import Submission


def validate_period_not_locked(db: Session, period_id: str) -> Tuple[bool, Optional[str]]:
    """Checks if reporting period is open for modifications."""
    period = db.query(ReportingPeriod).filter(ReportingPeriod.id == period_id).first()
    if not period:
        return False, f"Reporting period '{period_id}' does not exist."
    if period.status == PeriodStatus.LOCKED.value:
        return False, f"Reporting period '{period.code}' is LOCKED. No changes allowed."
    return True, None
