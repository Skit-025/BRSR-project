"""
app/security/rbac.py
Role-Based Access Control â€” permission matrix and enforcement helpers.
Roles follow the principle of least privilege.
"""
from enum import Enum
from typing import Set


from enum import Enum
from typing import Set


class Role(str, Enum):
    SYSTEM_ADMIN     = "system_admin"      # Sole authority to create/delete users, manage access credentials, view master form
    GROUP_ADMIN      = "group_admin"       # MEIL Group executive oversight, group report locking
    ESG_MANAGER      = "esg_manager"       # ESG policy, metric applicability, consolidation, calculations
    SUBSIDIARY_ADMIN = "subsidiary_admin"  # Admin for one of the 5 MEIL subsidiaries
    MAKER            = "maker"             # Enters data, submits monthly digital form, uploads spreadsheets
    CHECKER          = "checker"           # Reviews & approves/rejects submissions (Maker != Checker enforced)
    AUDITOR          = "auditor"           # Independent assurance, read-only data, audit trails & findings
    VIEWER           = "viewer"            # Read-only dashboards and analytics


# Permission identifiers
class Permission(str, Enum):
    # Org
    ORG_READ    = "org:read"
    ORG_WRITE   = "org:write"
    # Metrics & Forms
    METRIC_READ = "metric:read"
    FORM_MASTER = "form:master"            # View master digital form
    FORM_SUBMIT = "form:submit"            # Fill & submit digital form
    FORM_REVIEW = "form:review"            # Review digital form submissions
    # Collection / Submission
    SUBMISSION_CREATE  = "submission:create"
    SUBMISSION_READ    = "submission:read"
    SUBMISSION_SUBMIT  = "submission:submit"
    SUBMISSION_REVIEW  = "submission:review"
    # Evidence & Spreadsheet Upload
    EVIDENCE_UPLOAD = "evidence:upload"
    EVIDENCE_READ   = "evidence:read"
    SPREADSHEET_UPLOAD = "spreadsheet:upload"
    # Consolidation & Calculations
    CONSOLIDATION_RUN  = "consolidation:run"
    CONSOLIDATION_READ = "consolidation:read"
    CALC_RUN           = "calc:run"
    # Reporting
    REPORT_COMPILE = "report:compile"
    REPORT_READ    = "report:read"
    # User & System Admin (Exclusive to system_admin)
    USER_MANAGE    = "user:manage"
    USER_CREATE    = "user:create"
    USER_DELETE    = "user:delete"
    # Governance & Assurance
    PERIOD_LOCK    = "period:lock"
    AUDIT_READ     = "audit:read"
    ASSURANCE_WRITE = "assurance:write"
    AI_REVIEW      = "ai:review"


# Role â†’ set of allowed permissions
ROLE_PERMISSIONS: dict[Role, Set[Permission]] = {
    Role.SYSTEM_ADMIN: set(Permission),  # System Admin has access to all features, writes, overrides, and controls


    Role.GROUP_ADMIN: {
        Permission.ORG_READ,
        Permission.METRIC_READ,
        Permission.FORM_MASTER,
        Permission.SUBMISSION_READ,
        Permission.EVIDENCE_READ,
        Permission.CONSOLIDATION_READ,
        Permission.REPORT_READ,
        Permission.PERIOD_LOCK,
        Permission.AUDIT_READ,
        Permission.AI_REVIEW,
    },

    Role.ESG_MANAGER: {
        Permission.ORG_READ, Permission.ORG_WRITE,
        Permission.METRIC_READ,
        Permission.FORM_MASTER,
        Permission.SUBMISSION_CREATE, Permission.SUBMISSION_READ,
        Permission.SUBMISSION_SUBMIT, Permission.SUBMISSION_REVIEW,
        Permission.EVIDENCE_UPLOAD, Permission.EVIDENCE_READ,
        Permission.SPREADSHEET_UPLOAD,
        Permission.CONSOLIDATION_RUN, Permission.CONSOLIDATION_READ,
        Permission.CALC_RUN,
        Permission.REPORT_COMPILE, Permission.REPORT_READ,
        Permission.PERIOD_LOCK, Permission.AUDIT_READ,
        Permission.AI_REVIEW,
    },

    Role.SUBSIDIARY_ADMIN: {
        Permission.ORG_READ,
        Permission.METRIC_READ,
        Permission.SUBMISSION_READ,
        Permission.EVIDENCE_READ,
        Permission.CONSOLIDATION_READ,
        Permission.REPORT_READ,
        Permission.AUDIT_READ,
    },

    Role.MAKER: {
        Permission.ORG_READ,
        Permission.METRIC_READ,
        Permission.FORM_SUBMIT,
        Permission.SUBMISSION_CREATE, Permission.SUBMISSION_READ, Permission.SUBMISSION_SUBMIT,
        Permission.EVIDENCE_UPLOAD, Permission.EVIDENCE_READ,
        Permission.SPREADSHEET_UPLOAD,
        Permission.REPORT_READ,
    },

    Role.CHECKER: {
        Permission.ORG_READ,
        Permission.METRIC_READ,
        Permission.FORM_REVIEW,
        Permission.SUBMISSION_READ, Permission.SUBMISSION_REVIEW,
        Permission.EVIDENCE_READ,
        Permission.CONSOLIDATION_READ,
        Permission.REPORT_READ,
        Permission.AUDIT_READ,
        Permission.AI_REVIEW,
    },

    Role.AUDITOR: {
        Permission.ORG_READ,
        Permission.METRIC_READ,
        Permission.SUBMISSION_READ,
        Permission.EVIDENCE_READ,
        Permission.CONSOLIDATION_READ,
        Permission.REPORT_READ,
        Permission.AUDIT_READ,
        Permission.ASSURANCE_WRITE,
    },

    Role.VIEWER: {
        Permission.ORG_READ,
        Permission.METRIC_READ,
        Permission.SUBMISSION_READ,
        Permission.REPORT_READ,
    },
}


def has_permission(role: str, permission: Permission) -> bool:
    """Return True if `role` is granted `permission`. System Admin has full super-admin access."""
    if role == Role.SYSTEM_ADMIN.value or role == Role.SYSTEM_ADMIN:
        return True
    try:
        r = Role(role)
    except ValueError:
        return False
    allowed = ROLE_PERMISSIONS.get(r, set())
    return permission in allowed


def assert_permission(role: str, permission: Permission) -> None:
    """Raise PermissionError if `role` is not granted `permission`."""
    if not has_permission(role, permission):
        raise PermissionError(
            f"Role '{role}' does not have permission '{permission.value}'"
        )


