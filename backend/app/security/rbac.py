"""
app/security/rbac.py
Role-Based Access Control — FINAL FIVE-ROLE architecture.
Roles: system_admin, group_admin, subsidiary_admin, bu_admin, project_admin

Critical principle (spec §1):
  Permissions → what a user can see
  Applicability rules → what a user needs to enter
  Reporting rules → what appears in their report
These three are SEPARATE concerns.
"""
from enum import Enum
from typing import Set


class Role(str, Enum):
    # ── Platform Administrator ────────────────────────────────────────────────
    SYSTEM_ADMIN          = "system_admin"          # Sole authority: platform mgmt, all access

    # ── Group Tier ────────────────────────────────────────────────────────────
    GROUP_ADMIN           = "group_admin"           # Verification, approval, governance, period lock
    GROUP_SUPERVISOR      = "group_supervisor"      # Group operational, consolidation, disclosures, compilation

    # ── Subsidiary Tier ───────────────────────────────────────────────────────
    SUBSIDIARY_ADMIN      = "subsidiary_admin"      # Verification, approval, BU oversight, scoped governance
    SUBSIDIARY_SUPERVISOR = "subsidiary_supervisor" # Subsidiary operational, disclosures, consolidation

    # ── Business Unit Tier ────────────────────────────────────────────────────
    BU_ADMIN              = "bu_admin"              # Verification, approval, project creation, scoped governance
    BU_SUPERVISOR         = "bu_supervisor"         # BU operational, BU disclosures, consolidation

    # ── Project Tier ──────────────────────────────────────────────────────────
    PROJECT_ADMIN         = "project_admin"         # Verification, approval of project submissions, scoped governance
    PROJECT_SUPERVISOR    = "project_supervisor"    # Data entry (Maker), evidence upload, project submission


class Permission(str, Enum):
    # ── Org / Hierarchy ───────────────────────────────────────────────────────
    ORG_READ    = "org:read"
    ORG_WRITE   = "org:write"

    # ── AI / Ask AAROHAN ───────────────────────────────────────────────────────
    AI_E1_USE = "ai:e1:use"
    AI_E2_USE = "ai:e2:use"
    AI_E3_USE = "ai:e3:use"
    AI_E4_USE = "ai:e4:use"
    AI_E5_USE = "ai:e5:use"
    AI_E6_USE = "ai:e6:use"
    AI_E7_USE = "ai:e7:use"
    AI_APPROVE = "ai:approve"

    # ── Metrics & Forms ───────────────────────────────────────────────────────
    METRIC_READ  = "metric:read"
    METRIC_WRITE = "metric:write"
    FORM_MASTER  = "form:master"        # View master digital form (admin)
    FORM_SUBMIT  = "form:submit"        # Fill & submit project data collection form
    FORM_REVIEW  = "form:review"        # Review project submissions

    # ── Disclosure Forms ─────────────────────────────────────────────────────
    BU_DISCLOSURE_WRITE         = "bu_disclosure:write"
    BU_DISCLOSURE_READ          = "bu_disclosure:read"
    SUBSIDIARY_DISCLOSURE_WRITE = "subsidiary_disclosure:write"
    SUBSIDIARY_DISCLOSURE_READ  = "subsidiary_disclosure:read"
    GROUP_DISCLOSURE_WRITE      = "group_disclosure:write"
    GROUP_DISCLOSURE_READ       = "group_disclosure:read"

    # ── Collection / Submission ───────────────────────────────────────────────
    SUBMISSION_CREATE  = "submission:create"
    SUBMISSION_READ    = "submission:read"
    SUBMISSION_SUBMIT  = "submission:submit"
    SUBMISSION_REVIEW  = "submission:review"
    SUBMISSION_APPROVE = "submission:approve"

    # ── Evidence ─────────────────────────────────────────────────────────────
    EVIDENCE_UPLOAD    = "evidence:upload"
    EVIDENCE_READ      = "evidence:read"
    SPREADSHEET_UPLOAD = "spreadsheet:upload"

    # ── Consolidation & Calculations ──────────────────────────────────────────
    CONSOLIDATION_RUN  = "consolidation:run"
    CONSOLIDATION_READ = "consolidation:read"
    CALC_RUN           = "calc:run"

    # ── Reporting ────────────────────────────────────────────────────────────
    REPORT_COMPILE = "report:compile"
    REPORT_READ    = "report:read"
    REPORT_LINEAGE = "report:lineage"

    # ── User & System Admin ───────────────────────────────────────────────────
    USER_MANAGE         = "user:manage"
    USER_CREATE         = "user:create"
    USER_DELETE         = "user:delete"
    USERS_MANAGE_SCOPED = "users:manage_scoped"

    # ── Governance & Assurance ────────────────────────────────────────────────
    PERIOD_LOCK     = "period:lock"
    AUDIT_READ      = "audit:read"
    ASSURANCE_WRITE = "assurance:write"


# ── Role → set of allowed permissions ────────────────────────────────────────
ROLE_PERMISSIONS: dict[Role, Set[Permission]] = {

    # ── System Admin: full access (all permissions) ───────────────────────────
    Role.SYSTEM_ADMIN: set(Permission),

    # ── Group Admin: verification, governance, approvals, period lock ────────
    Role.GROUP_ADMIN: {
        Permission.AI_E1_USE, Permission.AI_E2_USE, Permission.AI_E3_USE,
        Permission.AI_E4_USE, Permission.AI_E5_USE, Permission.AI_E6_USE,
        Permission.AI_E7_USE, Permission.AI_APPROVE,
        Permission.ORG_READ, Permission.ORG_WRITE,
        Permission.METRIC_READ, Permission.FORM_MASTER,
        Permission.SUBMISSION_READ, Permission.SUBMISSION_REVIEW, Permission.SUBMISSION_APPROVE,
        Permission.EVIDENCE_READ,
        Permission.CONSOLIDATION_READ,
        Permission.BU_DISCLOSURE_READ,
        Permission.SUBSIDIARY_DISCLOSURE_READ,
        Permission.GROUP_DISCLOSURE_READ,
        Permission.REPORT_READ, Permission.REPORT_LINEAGE,
        Permission.PERIOD_LOCK, Permission.AUDIT_READ, Permission.ASSURANCE_WRITE,
        Permission.USERS_MANAGE_SCOPED,
        Permission.USER_MANAGE, Permission.USER_CREATE, Permission.USER_DELETE,
    },

    # ── Group Supervisor: group operational, consolidation, disclosures, compile
    Role.GROUP_SUPERVISOR: {
        Permission.AI_E1_USE, Permission.AI_E2_USE, Permission.AI_E3_USE,
        Permission.AI_E4_USE, Permission.AI_E5_USE, Permission.AI_E6_USE,
        Permission.AI_E7_USE,
        Permission.ORG_READ,
        Permission.METRIC_READ, Permission.FORM_MASTER,
        Permission.SUBMISSION_READ,
        Permission.EVIDENCE_READ,
        Permission.CONSOLIDATION_RUN, Permission.CONSOLIDATION_READ,
        Permission.CALC_RUN,
        Permission.BU_DISCLOSURE_READ,
        Permission.SUBSIDIARY_DISCLOSURE_READ,
        Permission.GROUP_DISCLOSURE_WRITE, Permission.GROUP_DISCLOSURE_READ,
        Permission.REPORT_COMPILE, Permission.REPORT_READ, Permission.REPORT_LINEAGE,
        Permission.AUDIT_READ,
    },

    # ── Subsidiary Admin: verification, BU oversight, approvals, scoped user mgmt
    Role.SUBSIDIARY_ADMIN: {
        Permission.AI_E1_USE, Permission.AI_E2_USE, Permission.AI_E3_USE,
        Permission.AI_E4_USE, Permission.AI_E5_USE, Permission.AI_E6_USE,
        Permission.AI_E7_USE, Permission.AI_APPROVE,
        Permission.ORG_READ,
        Permission.METRIC_READ,
        Permission.SUBMISSION_READ, Permission.SUBMISSION_REVIEW, Permission.SUBMISSION_APPROVE,
        Permission.EVIDENCE_READ,
        Permission.CONSOLIDATION_READ,
        Permission.BU_DISCLOSURE_READ,
        Permission.SUBSIDIARY_DISCLOSURE_READ,
        Permission.REPORT_READ, Permission.REPORT_LINEAGE,
        Permission.AUDIT_READ,
        Permission.USERS_MANAGE_SCOPED,
    },

    # ── Subsidiary Supervisor: subsidiary operational, disclosures, consolidation
    Role.SUBSIDIARY_SUPERVISOR: {
        Permission.AI_E1_USE, Permission.AI_E2_USE, Permission.AI_E3_USE,
        Permission.AI_E4_USE, Permission.AI_E5_USE, Permission.AI_E6_USE,
        Permission.AI_E7_USE,
        Permission.ORG_READ,
        Permission.METRIC_READ,
        Permission.SUBMISSION_READ,
        Permission.EVIDENCE_READ,
        Permission.CONSOLIDATION_RUN, Permission.CONSOLIDATION_READ,
        Permission.CALC_RUN,
        Permission.BU_DISCLOSURE_READ,
        Permission.SUBSIDIARY_DISCLOSURE_WRITE, Permission.SUBSIDIARY_DISCLOSURE_READ,
        Permission.REPORT_READ, Permission.REPORT_LINEAGE,
        Permission.AUDIT_READ,
    },

    # ── BU Admin: verification, review/approve submissions, create projects, scoped user mgmt
    Role.BU_ADMIN: {
        Permission.AI_E1_USE, Permission.AI_E2_USE, Permission.AI_E3_USE,
        Permission.AI_E6_USE, Permission.AI_E7_USE, Permission.AI_APPROVE,
        Permission.ORG_READ, Permission.ORG_WRITE,
        Permission.METRIC_READ,
        Permission.FORM_REVIEW,
        Permission.SUBMISSION_READ, Permission.SUBMISSION_REVIEW, Permission.SUBMISSION_APPROVE,
        Permission.EVIDENCE_READ,
        Permission.CONSOLIDATION_READ,
        Permission.BU_DISCLOSURE_READ,
        Permission.REPORT_READ, Permission.REPORT_LINEAGE,
        Permission.AUDIT_READ,
        Permission.USERS_MANAGE_SCOPED,
    },

    # ── BU Supervisor: BU operational, BU disclosures, consolidation, calc
    Role.BU_SUPERVISOR: {
        Permission.AI_E1_USE, Permission.AI_E2_USE, Permission.AI_E3_USE,
        Permission.AI_E6_USE, Permission.AI_E7_USE,
        Permission.ORG_READ,
        Permission.METRIC_READ,
        Permission.FORM_SUBMIT,
        Permission.SUBMISSION_CREATE, Permission.SUBMISSION_READ, Permission.SUBMISSION_SUBMIT,
        Permission.EVIDENCE_UPLOAD, Permission.EVIDENCE_READ, Permission.SPREADSHEET_UPLOAD,
        Permission.CONSOLIDATION_READ, Permission.CONSOLIDATION_RUN,
        Permission.CALC_RUN,
        Permission.BU_DISCLOSURE_WRITE, Permission.BU_DISCLOSURE_READ,
        Permission.REPORT_READ, Permission.REPORT_LINEAGE,
        Permission.AUDIT_READ,
    },

    # ── Project Admin: verification, evidence inspection, review/approve project submissions
    Role.PROJECT_ADMIN: {
        Permission.AI_E1_USE, Permission.AI_E2_USE, Permission.AI_E3_USE, Permission.AI_E6_USE,
        Permission.AI_APPROVE,
        Permission.ORG_READ,
        Permission.METRIC_READ,
        Permission.FORM_REVIEW,
        Permission.SUBMISSION_READ, Permission.SUBMISSION_REVIEW, Permission.SUBMISSION_APPROVE,
        Permission.EVIDENCE_READ,
        Permission.REPORT_READ, Permission.REPORT_LINEAGE,
        Permission.AUDIT_READ,
        Permission.USERS_MANAGE_SCOPED,
    },

    # ── Project Supervisor: data entry (Maker), evidence upload, project submission
    Role.PROJECT_SUPERVISOR: {
        Permission.AI_E1_USE, Permission.AI_E2_USE, Permission.AI_E3_USE, Permission.AI_E6_USE,
        Permission.ORG_READ,
        Permission.METRIC_READ,
        Permission.FORM_SUBMIT,
        Permission.SUBMISSION_CREATE, Permission.SUBMISSION_READ, Permission.SUBMISSION_SUBMIT,
        Permission.EVIDENCE_UPLOAD, Permission.EVIDENCE_READ,
        Permission.SPREADSHEET_UPLOAD,
        Permission.REPORT_READ,
    },
}


# ── Scope-tier helpers ────────────────────────────────────────────────────────
ROLE_SCOPE_TIER: dict[Role, str] = {
    Role.SYSTEM_ADMIN:          "system",
    Role.GROUP_ADMIN:           "group",
    Role.GROUP_SUPERVISOR:      "group",
    Role.SUBSIDIARY_ADMIN:      "subsidiary",
    Role.SUBSIDIARY_SUPERVISOR: "subsidiary",
    Role.BU_ADMIN:              "bu",
    Role.BU_SUPERVISOR:         "bu",
    Role.PROJECT_ADMIN:         "project",
    Role.PROJECT_SUPERVISOR:    "project",
}

# Roles that can MANAGE USERS within their scope (Admins only)
ROLES_THAT_CAN_MANAGE_USERS_SCOPED: set[str] = {
    "system_admin",
    "group_admin",
    "subsidiary_admin",
    "bu_admin",
    "project_admin",
}

# Roles each admin tier can create/assign (strict one-level-down hierarchy)
# system_admin → all roles
# group_admin → group_supervisor, subsidiary_admin, subsidiary_supervisor
# subsidiary_admin → subsidiary_supervisor, bu_admin, bu_supervisor
# bu_admin → bu_supervisor, project_admin, project_supervisor
# project_admin → project_supervisor
# supervisors cannot create users
MANAGEABLE_ROLES_BY_ROLE: dict[str, list[str]] = {
    "system_admin":          [r.value for r in Role],
    "group_admin":           ["group_supervisor", "subsidiary_admin", "subsidiary_supervisor"],
    "subsidiary_admin":      ["subsidiary_supervisor", "bu_admin", "bu_supervisor"],
    "bu_admin":              ["bu_supervisor", "project_admin", "project_supervisor"],
    "project_admin":         ["project_supervisor"],
    "group_supervisor":      [],
    "subsidiary_supervisor": [],
    "bu_supervisor":         [],
    "project_supervisor":    [],
}


def has_permission(role: str, permission: Permission) -> bool:
    """Return True if `role` is granted `permission`. System Admin has full access."""
    if role == Role.SYSTEM_ADMIN.value:
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


def get_scope_tier(role: str) -> str:
    """Return the organizational scope tier for a role string."""
    try:
        r = Role(role)
        return ROLE_SCOPE_TIER.get(r, "group")
    except ValueError:
        return "group"


def get_manageable_roles(role: str) -> list[str]:
    """Return the list of roles this role is allowed to create/assign."""
    return MANAGEABLE_ROLES_BY_ROLE.get(role, [])
