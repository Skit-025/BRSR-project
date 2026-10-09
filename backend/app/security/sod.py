"""
app/security/sod.py
Segregation of Duties (SoD) enforcement — Five-Role Architecture.

SoD is enforced using USER IDENTITY, not role names.
The key principle: the person who creates/submits data cannot approve that same data.
This is enforced via maker_id != reviewer_id checks in workflow state.
"""
from fastapi import HTTPException, status
from app.security.rbac import Role


# ── Submission creator ≠ Approver constraint ─────────────────────────────────
def enforce_maker_checker(maker_id: str, checker_id: str, context: str = "") -> None:
    """
    Raises HTTP 409 if the submission creator and the approver are the same person.
    This is identity-based SoD, independent of role names.

    Args:
        maker_id:   ID of the user who created/submitted the data (project_admin).
        checker_id: ID of the user attempting to review/approve (bu_admin).
        context:    Optional description for error message.
    """
    if str(maker_id) == str(checker_id):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Segregation of Duties violation{' (' + context + ')' if context else ''}: "
                "The data submitter and the approver must be different users. "
                "A Project Admin cannot approve their own submission."
            ),
        )


# ── Role-based SoD checks ─────────────────────────────────────────────────────
def assert_can_submit(role: str) -> None:
    """Only PROJECT_ADMIN and SYSTEM_ADMIN may submit data entries."""
    allowed = {Role.PROJECT_ADMIN.value, Role.SYSTEM_ADMIN.value}
    if role not in allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Role '{role}' is not permitted to submit data. Must be 'project_admin'.",
        )


def assert_can_review(role: str) -> None:
    """Only BU_ADMIN, SUBSIDIARY_ADMIN, GROUP_ADMIN, and SYSTEM_ADMIN may approve/reject submissions."""
    allowed = {
        Role.BU_ADMIN.value,
        Role.SUBSIDIARY_ADMIN.value,
        Role.GROUP_ADMIN.value,
        Role.SYSTEM_ADMIN.value,
    }
    if role not in allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Role '{role}' is not permitted to review submissions. Must be 'bu_admin' or higher.",
        )


def assert_can_lock_period(role: str) -> None:
    """Only GROUP_ADMIN and SYSTEM_ADMIN may lock reporting periods."""
    allowed = {Role.GROUP_ADMIN.value, Role.SYSTEM_ADMIN.value}
    if role not in allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Role '{role}' is not permitted to lock reporting periods.",
        )


def assert_can_run_consolidation(role: str) -> None:
    """Only GROUP_ADMIN and SYSTEM_ADMIN may trigger consolidation runs."""
    allowed = {Role.GROUP_ADMIN.value, Role.SYSTEM_ADMIN.value}
    if role not in allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Role '{role}' is not permitted to run consolidation.",
        )


def assert_can_compile_report(role: str) -> None:
    """Only GROUP_ADMIN and SYSTEM_ADMIN may compile BRSR reports."""
    allowed = {Role.GROUP_ADMIN.value, Role.SYSTEM_ADMIN.value}
    if role not in allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Role '{role}' is not permitted to compile reports.",
        )
