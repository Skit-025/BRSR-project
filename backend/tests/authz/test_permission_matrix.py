import pytest
from app.security.rbac import Role, Permission, ROLE_PERMISSIONS, MANAGEABLE_ROLES_BY_ROLE, has_permission


def test_permission_matrix_has_exactly_five_roles():
    expected = {
        Role.SYSTEM_ADMIN,
        Role.GROUP_ADMIN,
        Role.SUBSIDIARY_ADMIN,
        Role.BU_ADMIN,
        Role.PROJECT_ADMIN,
    }
    assert set(ROLE_PERMISSIONS.keys()) == expected


def test_project_admin_permissions():
    perms = ROLE_PERMISSIONS[Role.PROJECT_ADMIN]
    
    # Must have
    assert Permission.SUBMISSION_CREATE in perms
    assert Permission.SUBMISSION_SUBMIT in perms
    assert Permission.EVIDENCE_UPLOAD in perms
    assert Permission.SPREADSHEET_UPLOAD in perms
    assert Permission.USERS_MANAGE_SCOPED in perms

    # Must NOT have
    assert Permission.FORM_REVIEW not in perms
    assert Permission.SUBMISSION_REVIEW not in perms
    assert Permission.SUBMISSION_APPROVE not in perms
    assert Permission.CONSOLIDATION_RUN not in perms
    assert Permission.PERIOD_LOCK not in perms
    assert Permission.ORG_WRITE not in perms
    assert Permission.REPORT_COMPILE not in perms
    assert Permission.BU_DISCLOSURE_WRITE not in perms
    assert Permission.SUBSIDIARY_DISCLOSURE_WRITE not in perms
    assert Permission.GROUP_DISCLOSURE_WRITE not in perms


def test_bu_admin_permissions():
    perms = ROLE_PERMISSIONS[Role.BU_ADMIN]
    
    # Must have
    assert Permission.SUBMISSION_REVIEW in perms
    assert Permission.SUBMISSION_APPROVE in perms
    assert Permission.FORM_REVIEW in perms
    assert Permission.BU_DISCLOSURE_WRITE in perms
    assert Permission.BU_DISCLOSURE_READ in perms
    assert Permission.CALC_RUN in perms

    # Must NOT have
    assert Permission.SUBSIDIARY_DISCLOSURE_WRITE not in perms
    assert Permission.GROUP_DISCLOSURE_WRITE not in perms
    assert Permission.PERIOD_LOCK not in perms
    assert Permission.REPORT_COMPILE not in perms
    assert Permission.FORM_MASTER not in perms


def test_subsidiary_admin_permissions():
    perms = ROLE_PERMISSIONS[Role.SUBSIDIARY_ADMIN]
    
    # Must have
    assert Permission.SUBSIDIARY_DISCLOSURE_WRITE in perms
    assert Permission.SUBSIDIARY_DISCLOSURE_READ in perms
    assert Permission.BU_DISCLOSURE_READ in perms
    assert Permission.SUBMISSION_REVIEW in perms
    assert Permission.SUBMISSION_APPROVE in perms

    # Must NOT have
    assert Permission.GROUP_DISCLOSURE_WRITE not in perms
    assert Permission.PERIOD_LOCK not in perms
    assert Permission.CONSOLIDATION_RUN not in perms


def test_group_admin_permissions():
    perms = ROLE_PERMISSIONS[Role.GROUP_ADMIN]
    
    # Must have
    assert Permission.GROUP_DISCLOSURE_WRITE in perms
    assert Permission.GROUP_DISCLOSURE_READ in perms
    assert Permission.SUBSIDIARY_DISCLOSURE_READ in perms
    assert Permission.BU_DISCLOSURE_READ in perms
    assert Permission.CONSOLIDATION_RUN in perms
    assert Permission.PERIOD_LOCK in perms
    assert Permission.REPORT_COMPILE in perms
    assert Permission.FORM_MASTER in perms
    assert Permission.ORG_WRITE in perms


def test_system_admin_full_access():
    # system_admin has_permission always returns True
    for perm in Permission:
        assert has_permission("system_admin", perm) is True


def test_manageable_roles_hierarchy():
    # system_admin manages all
    assert len(MANAGEABLE_ROLES_BY_ROLE["system_admin"]) == 5

    # group_admin can manage group_admin, subsidiary_admin, bu_admin, project_admin
    assert set(MANAGEABLE_ROLES_BY_ROLE["group_admin"]) == {
        "group_admin", "subsidiary_admin", "bu_admin", "project_admin"
    }

    # subsidiary_admin can manage subsidiary_admin, bu_admin, project_admin
    assert set(MANAGEABLE_ROLES_BY_ROLE["subsidiary_admin"]) == {
        "subsidiary_admin", "bu_admin", "project_admin"
    }

    # bu_admin can manage bu_admin, project_admin
    assert set(MANAGEABLE_ROLES_BY_ROLE["bu_admin"]) == {
        "bu_admin", "project_admin"
    }

    # project_admin cannot manage/create any roles
    assert MANAGEABLE_ROLES_BY_ROLE["project_admin"] == []
