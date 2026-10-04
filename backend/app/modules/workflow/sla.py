"""
app/modules/workflow/sla.py
SLA tracking and escalation engine for review stages.
"""
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional

STAGE_SLA_DAYS: Dict[str, int] = {
    "SUBMITTED": 2,
    "UNDER_BU_REVIEW": 3,
    "BU_APPROVED": 4,
    "SUBSIDIARY_APPROVED": 5,
}


def calculate_sla_status(
    status: str,
    stage_entered_at: Optional[datetime],
) -> Dict[str, Any]:
    """
    Evaluates whether a submission is within SLA or overdue.
    """
    if not stage_entered_at or status not in STAGE_SLA_DAYS:
        return {
            "status": status,
            "sla_days_allowed": None,
            "days_elapsed": 0,
            "is_breached": False,
            "urgency": "NORMAL",
        }

    now = datetime.now(timezone.utc)
    if stage_entered_at.tzinfo is None:
        stage_entered_at = stage_entered_at.replace(tzinfo=timezone.utc)

    elapsed = (now - stage_entered_at).total_seconds() / 86400.0
    allowed = STAGE_SLA_DAYS[status]

    is_breached = elapsed > allowed
    urgency = "CRITICAL" if is_breached else ("WARNING" if elapsed > (allowed * 0.75) else "NORMAL")

    return {
        "status": status,
        "sla_days_allowed": allowed,
        "days_elapsed": round(elapsed, 1),
        "is_breached": is_breached,
        "urgency": urgency,
    }
