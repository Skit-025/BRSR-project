"""
app/security/sod.py
Segregation of Duties (SoD) enforcement — Eight-Role Hierarchical Architecture.

SoD is enforced using USER IDENTITY, not role names.
The key principle: the person who creates/submits data cannot approve that same data.
This is enforced via maker_id != reviewer_id checks in workflow state.
"""
from fastapi import HTTPException, status
from app.security.rbac import Role


# ── Submission creator ≠ Approver constraint ─────────────────────────────────
def enforce_maker_checker(maker_id: str, checker_id: str, context: str = "") -> None:
    """
    Raises HTTP 409 Conflict if the submission creator and the approver are the same person.
    This is identity-based SoD, independent of role names.

    Args:
        maker_id:   ID of the user who created/submitted the data (Supervisor).
        checker_id: ID of the user attempting to review/approve (Admin).
        context:    Optional description for error message.
    """
    if str(maker_id) == str(checker_id):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Segregation of Duties violation{' (' + context + ')' if context else ''}: "
                "The data submitter and the approver must be different users. "
                "A user cannot approve their own submission."
            ),
        )


# ── Role-based SoD checks ─────────────────────────────────────────────────────
def assert_can_submit(role: str) -> None:
    """Supervisors and ESG Managers (and system_admin / project_admin for compatibility) may submit operational data entries."""
    allowed = {
        Role.PROJECT_SUPERVISOR.value,
        Role.BU_ESG_MANAGER.value,
        Role.BU_SUPERVISOR.value,
        Role.SUBSIDIARY_ESG_MANAGER.value,
        Role.SUBSIDIARY_SUPERVISOR.value,
        Role.GROUP_ESG_MANAGER.value,
        Role.GROUP_SUPERVISOR.value,
        Role.PROJECT_ADMIN.value,
        Role.BU_ADMIN.value,
        Role.SUBSIDIARY_ADMIN.value,
        Role.SYSTEM_ADMIN.value,
    }
    if role not in allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Role '{role}' is not permitted to submit data. Operational submissions are performed by Supervisors and ESG Managers.",
        )


def assert_can_review(role: str) -> None:
    """Only Admins (PROJECT_ADMIN, BU_ADMIN, SUBSIDIARY_ADMIN, GROUP_ADMIN, SYSTEM_ADMIN) may review and approve submissions."""
    allowed = {
        Role.PROJECT_ADMIN.value,
        Role.BU_ADMIN.value,
        Role.SUBSIDIARY_ADMIN.value,
        Role.GROUP_ADMIN.value,
        Role.SYSTEM_ADMIN.value,
    }
    if role not in allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Role '{role}' is not permitted to review submissions. Only verification Admins may approve or reject.",
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
    """Group ESG Manager, Group Admin, Subsidiary ESG Manager, BU ESG Manager, and System Admin may trigger consolidation runs."""
    allowed = {
        Role.GROUP_ESG_MANAGER.value,
        Role.GROUP_SUPERVISOR.value,
        Role.GROUP_ADMIN.value,
        Role.SUBSIDIARY_ESG_MANAGER.value,
        Role.SUBSIDIARY_SUPERVISOR.value,
        Role.BU_ESG_MANAGER.value,
        Role.BU_SUPERVISOR.value,
        Role.SYSTEM_ADMIN.value,
    }
    if role not in allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Role '{role}' is not permitted to run consolidation.",
        )


def assert_can_compile_report(role: str) -> None:
    """Only Group Admin, Group ESG Manager (Group Supervisor), and System Admin may compile and generate BRSR reports."""
    allowed = {
        Role.GROUP_ESG_MANAGER.value,
        Role.GROUP_SUPERVISOR.value,
        Role.GROUP_ADMIN.value,
        Role.SYSTEM_ADMIN.value,
    }
    if role not in allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Role '{role}' is not permitted to generate or compile BRSR reports. BRSR disclosures are reserved exclusively for Group Admin and Group ESG Manager.",
        )
