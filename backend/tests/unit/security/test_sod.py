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
    # project_admin and system_admin can submit
    assert_can_submit(Role.PROJECT_ADMIN.value)
    assert_can_submit(Role.SYSTEM_ADMIN.value)

    # other roles cannot submit
    for forbidden in [Role.GROUP_ADMIN.value, Role.SUBSIDIARY_ADMIN.value, Role.BU_ADMIN.value]:
        with pytest.raises(HTTPException) as exc_info:
            assert_can_submit(forbidden)
        assert exc_info.value.status_code == 403


def test_assert_can_review_roles():
    # bu_admin, subsidiary_admin, group_admin, system_admin can review
    assert_can_review(Role.BU_ADMIN.value)
    assert_can_review(Role.SUBSIDIARY_ADMIN.value)
    assert_can_review(Role.GROUP_ADMIN.value)
    assert_can_review(Role.SYSTEM_ADMIN.value)

    # project_admin CANNOT review
    with pytest.raises(HTTPException) as exc_info:
        assert_can_review(Role.PROJECT_ADMIN.value)
    assert exc_info.value.status_code == 403


def test_assert_can_lock_period_roles():
    assert_can_lock_period(Role.GROUP_ADMIN.value)
    assert_can_lock_period(Role.SYSTEM_ADMIN.value)

    for forbidden in [Role.SUBSIDIARY_ADMIN.value, Role.BU_ADMIN.value, Role.PROJECT_ADMIN.value]:
        with pytest.raises(HTTPException) as exc_info:
            assert_can_lock_period(forbidden)
        assert exc_info.value.status_code == 403


def test_assert_can_run_consolidation_roles():
    assert_can_run_consolidation(Role.GROUP_ADMIN.value)
    assert_can_run_consolidation(Role.SYSTEM_ADMIN.value)

    for forbidden in [Role.SUBSIDIARY_ADMIN.value, Role.BU_ADMIN.value, Role.PROJECT_ADMIN.value]:
        with pytest.raises(HTTPException) as exc_info:
            assert_can_run_consolidation(forbidden)
        assert exc_info.value.status_code == 403


def test_assert_can_compile_report_roles():
    assert_can_compile_report(Role.GROUP_ADMIN.value)
    assert_can_compile_report(Role.SYSTEM_ADMIN.value)

    for forbidden in [Role.SUBSIDIARY_ADMIN.value, Role.BU_ADMIN.value, Role.PROJECT_ADMIN.value]:
        with pytest.raises(HTTPException) as exc_info:
            assert_can_compile_report(forbidden)
        assert exc_info.value.status_code == 403
