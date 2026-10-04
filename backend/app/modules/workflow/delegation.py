"""
app/modules/workflow/delegation.py
Authority delegation management for approvers and reviewers.
"""
from typing import Optional, Dict, Any, List
from datetime import date


class ReviewDelegation:
    def __init__(
        self,
        delegator_user_id: str,
        delegate_user_id: str,
        start_date: date,
        end_date: date,
        reason: str,
    ):
        self.delegator_user_id = delegator_user_id
        self.delegate_user_id = delegate_user_id
        self.start_date = start_date
        self.end_date = end_date
        self.reason = reason

    def is_active_on(self, check_date: date) -> bool:
        return self.start_date <= check_date <= self.end_date


# In-memory delegation store for session/instance lookup
_active_delegations: List[ReviewDelegation] = []


def register_delegation(
    delegator_id: str,
    delegate_id: str,
    start_date: date,
    end_date: date,
    reason: str,
) -> ReviewDelegation:
    delegation = ReviewDelegation(
        delegator_user_id=delegator_id,
        delegate_user_id=delegate_id,
        start_date=start_date,
        end_date=end_date,
        reason=reason,
    )
    _active_delegations.append(delegation)
    return delegation


def get_effective_reviewer(reviewer_id: str, for_date: Optional[date] = None) -> str:
    """If reviewer has an active delegation, returns the designated delegate ID."""
    target_date = for_date or date.today()
    for d in _active_delegations:
        if d.delegator_user_id == reviewer_id and d.is_active_on(target_date):
            return d.delegate_user_id
    return reviewer_id
