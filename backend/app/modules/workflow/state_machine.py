"""
app/modules/workflow/state_machine.py
State machine managing permissible transitions for Submission packs.
"""
from typing import Set, Dict
from app.modules.collection.models import SubmissionStatus

VALID_TRANSITIONS: Dict[str, Set[str]] = {
    SubmissionStatus.DRAFT.value: {
        SubmissionStatus.SUBMITTED.value
    },
    SubmissionStatus.SUBMITTED.value: {
        SubmissionStatus.UNDER_BU_REVIEW.value,
        SubmissionStatus.RETURNED.value
    },
    SubmissionStatus.UNDER_BU_REVIEW.value: {
        SubmissionStatus.BU_APPROVED.value,
        SubmissionStatus.RETURNED.value
    },
    SubmissionStatus.BU_APPROVED.value: {
        SubmissionStatus.SUBSIDIARY_APPROVED.value,
        SubmissionStatus.RETURNED.value
    },
    SubmissionStatus.SUBSIDIARY_APPROVED.value: {
        SubmissionStatus.CONSOLIDATED.value,
        SubmissionStatus.RETURNED.value
    },
    SubmissionStatus.CONSOLIDATED.value: {
        SubmissionStatus.LOCKED.value
    },
    SubmissionStatus.RETURNED.value: {
        SubmissionStatus.DRAFT.value,
        SubmissionStatus.SUBMITTED.value
    },
    SubmissionStatus.LOCKED.value: set()  # Terminal state (immutable)
}


def can_transition(current_status: str, target_status: str) -> bool:
    """Checks whether the requested status transition is legally permitted."""
    allowed = VALID_TRANSITIONS.get(current_status, set())
    return target_status in allowed


def transition_submission(current_status: str, target_status: str) -> str:
    """Validates and executes state transition; raises ValueError on violation."""
    if not can_transition(current_status, target_status):
        raise ValueError(
            f"Illegal state transition from '{current_status}' to '{target_status}'. "
            f"Allowed next states: {list(VALID_TRANSITIONS.get(current_status, []))}"
        )
    return target_status
