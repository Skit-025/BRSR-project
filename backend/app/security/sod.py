"""
app/security/sod.py
Segregation of Duties (SoD) enforcement utilities for 5-Role architecture.

Core SoD audit rules:
  - The Maker/creator who submitted data CANNOT review/approve that same submission.
  - Creator and Reviewer identities must be distinct (enforce_maker_checker).
  - Period locks require Group Admin or System Admin.
"""
from fastapi import HTTPException, status
from app.security.rbac import Role


# ── Maker ≠ Checker constraint ───────────────────────────────────
def enforce_maker_checker(maker_id: str, checker_id: str, context: str = "") -> None:
    """
    Raises HTTP 409 if the maker and checker are the same person.

    Args:
        maker_id:   ID of the user who created/submitted the data.
        checker_id: ID of the user attempting to review/approve.
        context:    Optional description for error message.
    """
    if str(maker_id) == str(checker_id):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Segregation of Duties violation{' (' + context + ')' if context else ''}: "
                "The maker and checker must be different users. "
                "A user cannot review their own submission."
            ),
        )


# ── Role-based SoD checks ────────────────────────────────────────
def assert_can_submit(role: str) -> None:
    """PROJECT_ADMIN, BU_ADMIN, GROUP_ADMIN, and SYSTEM_ADMIN roles may submit data entries."""
    allowed = {
        Role.PROJECT_ADMIN.value,
        Role.BU_ADMIN.value,
        Role.GROUP_ADMIN.value,
        Role.SYSTEM_ADMIN.value,
    }
    if role not in allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Role '{role}' is not permitted to submit data.",
        )


def assert_can_review(role: str) -> None:
    """BU_ADMIN, SUBSIDIARY_ADMIN, GROUP_ADMIN, and SYSTEM_ADMIN may approve/reject submissions."""
    allowed = {
        Role.BU_ADMIN.value,
        Role.SUBSIDIARY_ADMIN.value,
        Role.GROUP_ADMIN.value,
        Role.SYSTEM_ADMIN.value,
    }
    if role not in allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Role '{role}' is not permitted to review submissions.",
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
