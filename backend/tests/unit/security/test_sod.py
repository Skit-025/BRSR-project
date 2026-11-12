import pytest
from fastapi import HTTPException
from app.security.rbac import Role
from app.security.sod import (
    enforce_maker_checker,
    assert_can_submit,
    assert_can_review,
    assert_can_lock_period,
    assert_can_run_consolidation,
    assert_can_compile_report,
)


def test_enforce_maker_checker_same_user_raises_409():
    with pytest.raises(HTTPException) as exc_info:
        enforce_maker_checker("user-123", "user-123", context="Self-approval test")
    assert exc_info.value.status_code == 409
    assert "Segregation of Duties" in exc_info.value.detail


def test_enforce_maker_checker_different_users_passes():
    # Should not raise any exception
    enforce_maker_checker("user-maker-1", "user-checker-2")


def test_assert_can_submit_roles():
    # Supervisors and system_admin can submit
    for allowed in [
        Role.PROJECT_SUPERVISOR.value,
        Role.BU_SUPERVISOR.value,
        Role.SUBSIDIARY_SUPERVISOR.value,
        Role.GROUP_SUPERVISOR.value,
        Role.SYSTEM_ADMIN.value,
    ]:
        assert_can_submit(allowed)

    # Admins cannot submit operational data
    for forbidden in [
        Role.GROUP_ADMIN.value,
        Role.SUBSIDIARY_ADMIN.value,
        Role.BU_ADMIN.value,
    ]:
        with pytest.raises(HTTPException) as exc_info:
            assert_can_submit(forbidden)
        assert exc_info.value.status_code == 403


def test_assert_can_review_roles():
    # Admins can review/verify
    for allowed in [
        Role.PROJECT_ADMIN.value,
        Role.BU_ADMIN.value,
        Role.SUBSIDIARY_ADMIN.value,
        Role.GROUP_ADMIN.value,
        Role.SYSTEM_ADMIN.value,
    ]:
        assert_can_review(allowed)

    # Supervisors cannot review/verify
    for forbidden in [
        Role.PROJECT_SUPERVISOR.value,
        Role.BU_SUPERVISOR.value,
        Role.SUBSIDIARY_SUPERVISOR.value,
        Role.GROUP_SUPERVISOR.value,
    ]:
        with pytest.raises(HTTPException) as exc_info:
            assert_can_review(forbidden)
        assert exc_info.value.status_code == 403


def test_assert_can_lock_period_roles():
    assert_can_lock_period(Role.GROUP_ADMIN.value)
    assert_can_lock_period(Role.SYSTEM_ADMIN.value)

    for forbidden in [
        Role.SUBSIDIARY_ADMIN.value,
        Role.BU_ADMIN.value,
        Role.PROJECT_ADMIN.value,
        Role.GROUP_SUPERVISOR.value,
        Role.SUBSIDIARY_SUPERVISOR.value,
        Role.BU_SUPERVISOR.value,
        Role.PROJECT_SUPERVISOR.value,
    ]:
        with pytest.raises(HTTPException) as exc_info:
            assert_can_lock_period(forbidden)
        assert exc_info.value.status_code == 403


def test_assert_can_run_consolidation_roles():
    for allowed in [
        Role.GROUP_SUPERVISOR.value,
        Role.GROUP_ADMIN.value,
        Role.SUBSIDIARY_SUPERVISOR.value,
        Role.BU_SUPERVISOR.value,
        Role.SYSTEM_ADMIN.value,
    ]:
        assert_can_run_consolidation(allowed)

    for forbidden in [
        Role.SUBSIDIARY_ADMIN.value,
        Role.BU_ADMIN.value,
        Role.PROJECT_ADMIN.value,
        Role.PROJECT_SUPERVISOR.value,
    ]:
        with pytest.raises(HTTPException) as exc_info:
            assert_can_run_consolidation(forbidden)
        assert exc_info.value.status_code == 403


def test_assert_can_compile_report_roles():
    for allowed in [
        Role.GROUP_SUPERVISOR.value,
        Role.GROUP_ADMIN.value,
        Role.SYSTEM_ADMIN.value,
    ]:
        assert_can_compile_report(allowed)

    for forbidden in [
        Role.SUBSIDIARY_ADMIN.value,
        Role.SUBSIDIARY_SUPERVISOR.value,
        Role.BU_ADMIN.value,
        Role.BU_SUPERVISOR.value,
        Role.PROJECT_ADMIN.value,
        Role.PROJECT_SUPERVISOR.value,
    ]:
        with pytest.raises(HTTPException) as exc_info:
            assert_can_compile_report(forbidden)
        assert exc_info.value.status_code == 403
