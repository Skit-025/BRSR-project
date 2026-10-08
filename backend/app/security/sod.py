"""
app/security/sod.py
Segregation of Duties (SoD) enforcement utilities.

BRSR audit rules:
  - The Maker who submitted data CANNOT review/approve that same submission.
  - Checker cannot create submissions they are expected to review.
  - Period locks require ESG Manager role (not Maker or Checker).
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
    """Only MAKER and ESG_MANAGER roles may submit data entries."""
    allowed = {Role.MAKER.value, Role.ESG_MANAGER.value, Role.SYSTEM_ADMIN.value}
    if role not in allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Role '{role}' is not permitted to submit data. Must be 'maker' or 'esg_manager'.",
        )


def assert_can_review(role: str) -> None:
    """Only CHECKER, ESG_MANAGER, and SYSTEM_ADMIN may approve/reject submissions."""
    allowed = {Role.CHECKER.value, Role.ESG_MANAGER.value, Role.SYSTEM_ADMIN.value}
    if role not in allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Role '{role}' is not permitted to review submissions. Must be 'checker' or 'esg_manager'.",
        )


def assert_can_lock_period(role: str) -> None:
    """Only ESG_MANAGER and SYSTEM_ADMIN may lock reporting periods."""
    allowed = {Role.ESG_MANAGER.value, Role.SYSTEM_ADMIN.value}
    if role not in allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Role '{role}' is not permitted to lock reporting periods.",
        )


def assert_can_run_consolidation(role: str) -> None:
    """Only ESG_MANAGER and SYSTEM_ADMIN may trigger consolidation runs."""
    allowed = {Role.ESG_MANAGER.value, Role.SYSTEM_ADMIN.value}
    if role not in allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Role '{role}' is not permitted to run consolidation.",
        )


def assert_can_compile_report(role: str) -> None:
    """Only ESG_MANAGER and SYSTEM_ADMIN may compile BRSR reports."""
    allowed = {Role.ESG_MANAGER.value, Role.SYSTEM_ADMIN.value}
    if role not in allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Role '{role}' is not permitted to compile reports.",
        )
