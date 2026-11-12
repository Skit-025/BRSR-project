import pytest
from app.security.rbac import Role, Permission, ROLE_PERMISSIONS, MANAGEABLE_ROLES_BY_ROLE, has_permission


def test_permission_matrix_has_all_eight_roles_and_system_admin():
    expected = {
        Role.SYSTEM_ADMIN,
        Role.GROUP_ADMIN,
        Role.GROUP_ESG_MANAGER,
        Role.GROUP_SUPERVISOR,
        Role.SUBSIDIARY_ADMIN,
        Role.SUBSIDIARY_ESG_MANAGER,
        Role.SUBSIDIARY_SUPERVISOR,
        Role.BU_ADMIN,
        Role.BU_ESG_MANAGER,
        Role.BU_SUPERVISOR,
        Role.PROJECT_ADMIN,
        Role.PROJECT_SUPERVISOR,
    }
    assert set(ROLE_PERMISSIONS.keys()) == expected


def test_project_supervisor_permissions():
    perms = ROLE_PERMISSIONS[Role.PROJECT_SUPERVISOR]

    # Operational Maker Capabilities
    assert Permission.SUBMISSION_CREATE in perms
    assert Permission.SUBMISSION_SUBMIT in perms
    assert Permission.EVIDENCE_UPLOAD in perms
    assert Permission.SPREADSHEET_UPLOAD in perms
    assert Permission.FORM_SUBMIT in perms

    # Forbidden: No review, no approve, no user management
    assert Permission.FORM_REVIEW not in perms
    assert Permission.SUBMISSION_REVIEW not in perms
    assert Permission.SUBMISSION_APPROVE not in perms
    assert Permission.USERS_MANAGE_SCOPED not in perms
    assert Permission.PERIOD_LOCK not in perms


def test_project_admin_permissions():
    perms = ROLE_PERMISSIONS[Role.PROJECT_ADMIN]

    # Verification / Checker Capabilities
    assert Permission.FORM_REVIEW in perms
    assert Permission.SUBMISSION_REVIEW in perms
    assert Permission.SUBMISSION_APPROVE in perms
    assert Permission.EVIDENCE_READ in perms

    # Forbidden: No routine operational data entry or report compile
    assert Permission.SUBMISSION_CREATE not in perms
    assert Permission.SUBMISSION_SUBMIT not in perms
    assert Permission.EVIDENCE_UPLOAD not in perms
    assert Permission.CONSOLIDATION_RUN not in perms
    assert Permission.PERIOD_LOCK not in perms
    assert Permission.ORG_WRITE not in perms


def test_bu_supervisor_permissions():
    perms = ROLE_PERMISSIONS[Role.BU_SUPERVISOR]

    # Operational BU Capabilities
    assert Permission.SUBMISSION_CREATE in perms
    assert Permission.SUBMISSION_SUBMIT in perms
    assert Permission.BU_DISCLOSURE_WRITE in perms
    assert Permission.BU_DISCLOSURE_READ in perms
    assert Permission.CONSOLIDATION_RUN in perms
    assert Permission.CALC_RUN in perms

    # Forbidden: Cannot review or approve submissions, cannot lock period
    assert Permission.SUBMISSION_REVIEW not in perms
    assert Permission.SUBMISSION_APPROVE not in perms
    assert Permission.PERIOD_LOCK not in perms
    assert Permission.USERS_MANAGE_SCOPED not in perms


def test_bu_admin_permissions():
    perms = ROLE_PERMISSIONS[Role.BU_ADMIN]

    # Verification BU Capabilities
    assert Permission.SUBMISSION_REVIEW in perms
    assert Permission.SUBMISSION_APPROVE in perms
    assert Permission.FORM_REVIEW in perms
    assert Permission.BU_DISCLOSURE_READ in perms
    assert Permission.USERS_MANAGE_SCOPED in perms

    # Forbidden: Cannot write disclosures or run consolidations directly
    assert Permission.BU_DISCLOSURE_WRITE not in perms
    assert Permission.SUBSIDIARY_DISCLOSURE_WRITE not in perms
    assert Permission.GROUP_DISCLOSURE_WRITE not in perms
    assert Permission.PERIOD_LOCK not in perms
    assert Permission.REPORT_COMPILE not in perms


def test_subsidiary_supervisor_permissions():
    perms = ROLE_PERMISSIONS[Role.SUBSIDIARY_SUPERVISOR]

    # Operational Subsidiary Capabilities
    assert Permission.SUBSIDIARY_DISCLOSURE_WRITE in perms
    assert Permission.SUBSIDIARY_DISCLOSURE_READ in perms
    assert Permission.BU_DISCLOSURE_READ in perms
    assert Permission.CONSOLIDATION_RUN in perms
    assert Permission.CALC_RUN in perms

    # Forbidden: Cannot review or approve submissions, cannot manage users
    assert Permission.SUBMISSION_REVIEW not in perms
    assert Permission.SUBMISSION_APPROVE not in perms
    assert Permission.PERIOD_LOCK not in perms
    assert Permission.USERS_MANAGE_SCOPED not in perms


def test_subsidiary_admin_permissions():
    perms = ROLE_PERMISSIONS[Role.SUBSIDIARY_ADMIN]

    # Verification Subsidiary Capabilities
    assert Permission.SUBMISSION_REVIEW in perms
    assert Permission.SUBMISSION_APPROVE in perms
    assert Permission.SUBSIDIARY_DISCLOSURE_READ in perms
    assert Permission.BU_DISCLOSURE_READ in perms
    assert Permission.USERS_MANAGE_SCOPED in perms

    # Forbidden: Cannot write disclosures or lock period
    assert Permission.SUBSIDIARY_DISCLOSURE_WRITE not in perms
    assert Permission.GROUP_DISCLOSURE_WRITE not in perms
    assert Permission.PERIOD_LOCK not in perms
    assert Permission.CONSOLIDATION_RUN not in perms


def test_group_supervisor_permissions():
    perms = ROLE_PERMISSIONS[Role.GROUP_ESG_MANAGER]

    # Operational Group Compilation Capabilities + User Management & Appointment Authority
    assert Permission.GROUP_DISCLOSURE_WRITE in perms
    assert Permission.GROUP_DISCLOSURE_READ in perms
    assert Permission.SUBSIDIARY_DISCLOSURE_READ in perms
    assert Permission.BU_DISCLOSURE_READ in perms
    assert Permission.CONSOLIDATION_RUN in perms
    assert Permission.REPORT_COMPILE in perms
    assert Permission.USERS_MANAGE_SCOPED in perms
    assert Permission.USER_CREATE in perms
    assert Permission.USER_MANAGE in perms

    # Forbidden: Cannot lock period or approve submissions
    assert Permission.PERIOD_LOCK not in perms
    assert Permission.SUBMISSION_REVIEW not in perms
    assert Permission.SUBMISSION_APPROVE not in perms


def test_group_admin_permissions():
    perms = ROLE_PERMISSIONS[Role.GROUP_ADMIN]

    # Verification and Platform Governance Capabilities (User appointment removed)
    assert Permission.SUBMISSION_REVIEW in perms
    assert Permission.SUBMISSION_APPROVE in perms
    assert Permission.GROUP_DISCLOSURE_READ in perms
    assert Permission.SUBSIDIARY_DISCLOSURE_READ in perms
    assert Permission.BU_DISCLOSURE_READ in perms
    assert Permission.PERIOD_LOCK in perms
    assert Permission.ORG_WRITE in perms

    # Forbidden: User creation & appointment (reserved for Group ESG Manager), routine data entry
    assert Permission.USER_MANAGE not in perms
    assert Permission.USERS_MANAGE_SCOPED not in perms
    assert Permission.USER_CREATE not in perms
    assert Permission.GROUP_DISCLOSURE_WRITE not in perms
    assert Permission.REPORT_COMPILE not in perms


def test_system_admin_full_access():
    # system_admin has_permission always returns True
    for perm in Permission:
        assert has_permission("system_admin", perm) is True


def test_manageable_roles_hierarchy():
    # system_admin manages all platform roles
    assert len(MANAGEABLE_ROLES_BY_ROLE["system_admin"]) >= 9

    # group_admin has user creation and appointment removed
    assert MANAGEABLE_ROLES_BY_ROLE["group_admin"] == []

    # group_esg_manager has user creation and appointment for subsidiary tier
    assert "subsidiary_admin" in MANAGEABLE_ROLES_BY_ROLE["group_esg_manager"]
    assert "subsidiary_esg_manager" in MANAGEABLE_ROLES_BY_ROLE["group_esg_manager"]

    # subsidiary_admin can manage subsidiary ESG managers and BU tier
    assert "bu_admin" in MANAGEABLE_ROLES_BY_ROLE["subsidiary_admin"]
    assert "bu_esg_manager" in MANAGEABLE_ROLES_BY_ROLE["subsidiary_admin"]

    # bu_admin can manage bu ESG managers and project tier
    assert "project_admin" in MANAGEABLE_ROLES_BY_ROLE["bu_admin"]
    assert "project_supervisor" in MANAGEABLE_ROLES_BY_ROLE["bu_admin"]

    # project_admin can manage project_supervisor
    assert set(MANAGEABLE_ROLES_BY_ROLE["project_admin"]) == {"project_supervisor"}

    # operational roles cannot manage roles
    assert MANAGEABLE_ROLES_BY_ROLE["project_supervisor"] == []
    assert MANAGEABLE_ROLES_BY_ROLE["bu_supervisor"] == []
    assert MANAGEABLE_ROLES_BY_ROLE["subsidiary_supervisor"] == []
