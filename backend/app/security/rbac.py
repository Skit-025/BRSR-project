"""
app/security/rbac.py
Role-Based Access Control — 6-Role consolidated architecture.
Runtime roles:
  1. system_admin
  2. group_admin
  3. subsidiary_admin
  4. bu_admin
  5. project_admin
  6. project_data_entry_user  (Data-Entry / Maker level)
"""
from enum import Enum
from typing import Set


class Role(str, Enum):
    # ── Level 1: System ───────────────────────────────────────────────────────
    SYSTEM_ADMIN = "system_admin"

    # ── Level 2: Group ────────────────────────────────────────────────────────
    GROUP_ADMIN = "group_admin"

    # ── Level 3: Subsidiary ───────────────────────────────────────────────────
    SUBSIDIARY_ADMIN = "subsidiary_admin"

    # ── Level 4: Business Unit ────────────────────────────────────────────────
    BU_ADMIN = "bu_admin"

    # ── Level 5: Project ──────────────────────────────────────────────────────
    PROJECT_ADMIN            = "project_admin"

    # ── Level 6: Data Entry / Maker ───────────────────────────────────────────
    PROJECT_DATA_ENTRY_USER  = "project_data_entry_user"


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
    FORM_SUBMIT  = "form:submit"        # Fill & submit project data collection form (TYPE 1)
    FORM_REVIEW  = "form:review"        # Review project submissions (TYPE 2)

    # ── Disclosure Forms (TYPE 3) ─────────────────────────────────────────────
    BU_DISCLOSURE_WRITE         = "bu_disclosure:write"          # Enter BU-level data (targets, initiatives)
    BU_DISCLOSURE_READ          = "bu_disclosure:read"
    SUBSIDIARY_DISCLOSURE_WRITE = "subsidiary_disclosure:write"  # Enter Section A/B/C, subsidiary info
    SUBSIDIARY_DISCLOSURE_READ  = "subsidiary_disclosure:read"
    GROUP_DISCLOSURE_WRITE      = "group_disclosure:write"       # Enter group policies, governance, assurance
    GROUP_DISCLOSURE_READ       = "group_disclosure:read"

    # ── Collection / Submission ───────────────────────────────────────────────
    SUBMISSION_CREATE  = "submission:create"
    SUBMISSION_READ    = "submission:read"
    SUBMISSION_SUBMIT  = "submission:submit"
    SUBMISSION_REVIEW  = "submission:review"
    SUBMISSION_APPROVE = "submission:approve"   # Final approval at each level

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
    REPORT_LINEAGE = "report:lineage"   # Drill-down source lineage

    # ── User & System Admin ───────────────────────────────────────────────────
    USER_MANAGE         = "user:manage"          # Full user CRUD (system_admin only)
    USER_CREATE         = "user:create"
    USER_DELETE         = "user:delete"
    USERS_MANAGE_SCOPED = "users:manage_scoped"  # Manage users within own scope

    # ── Governance & Assurance ────────────────────────────────────────────────
    PERIOD_LOCK     = "period:lock"
    AUDIT_READ      = "audit:read"
    ASSURANCE_WRITE = "assurance:write"


# ── Role → set of allowed permissions (Consolidated 5-Role Model) ──────────────

ROLE_PERMISSIONS: dict[Role, Set[Permission]] = {

    # ── 1. System Admin: Unrestricted Platform Super-Admin ────────────────────
    Role.SYSTEM_ADMIN: set(Permission),

    # ── 2. Group Admin: Group Admin + Group ESG Manager Consolidated ──────────
    Role.GROUP_ADMIN: {
        Permission.AI_E1_USE, Permission.AI_E2_USE, Permission.AI_E3_USE, Permission.AI_E4_USE,
        Permission.AI_E5_USE, Permission.AI_E6_USE, Permission.AI_E7_USE, Permission.AI_APPROVE,
        Permission.ORG_READ, Permission.ORG_WRITE,
        Permission.METRIC_READ, Permission.METRIC_WRITE, Permission.FORM_MASTER,
        Permission.SUBMISSION_CREATE, Permission.SUBMISSION_READ, Permission.SUBMISSION_SUBMIT,
        Permission.SUBMISSION_REVIEW, Permission.SUBMISSION_APPROVE,
        Permission.EVIDENCE_UPLOAD, Permission.EVIDENCE_READ, Permission.SPREADSHEET_UPLOAD,
        Permission.CONSOLIDATION_RUN, Permission.CONSOLIDATION_READ,
        Permission.CALC_RUN,
        Permission.BU_DISCLOSURE_READ,
        Permission.SUBSIDIARY_DISCLOSURE_READ,
        Permission.GROUP_DISCLOSURE_WRITE, Permission.GROUP_DISCLOSURE_READ,
        Permission.REPORT_COMPILE, Permission.REPORT_READ, Permission.REPORT_LINEAGE,
        Permission.PERIOD_LOCK, Permission.AUDIT_READ, Permission.ASSURANCE_WRITE,
        Permission.USERS_MANAGE_SCOPED,
    },

    # ── 3. Subsidiary Admin: Subsidiary Admin + Subsidiary ESG Manager ────────
    Role.SUBSIDIARY_ADMIN: {
        Permission.AI_E1_USE, Permission.AI_E2_USE, Permission.AI_E3_USE, Permission.AI_E4_USE,
        Permission.AI_E5_USE, Permission.AI_E6_USE, Permission.AI_E7_USE, Permission.AI_APPROVE,
        Permission.ORG_READ, Permission.ORG_WRITE,
        Permission.METRIC_READ,
        Permission.SUBMISSION_READ, Permission.SUBMISSION_REVIEW, Permission.SUBMISSION_APPROVE,
        Permission.EVIDENCE_READ,
        Permission.CONSOLIDATION_READ,
        Permission.BU_DISCLOSURE_READ,
        Permission.SUBSIDIARY_DISCLOSURE_WRITE, Permission.SUBSIDIARY_DISCLOSURE_READ,
        Permission.REPORT_READ, Permission.REPORT_LINEAGE,
        Permission.AUDIT_READ,
        Permission.USERS_MANAGE_SCOPED,
    },

    # ── 4. BU Admin: BU Admin + BU ESG Manager + BU Reviewer Consolidated ─────
    Role.BU_ADMIN: {
        Permission.AI_E1_USE, Permission.AI_E2_USE, Permission.AI_E3_USE,
        Permission.AI_E6_USE, Permission.AI_E7_USE, Permission.AI_APPROVE,
        Permission.ORG_READ, Permission.ORG_WRITE,
        Permission.METRIC_READ,
        Permission.FORM_REVIEW,
        Permission.SUBMISSION_READ, Permission.SUBMISSION_REVIEW, Permission.SUBMISSION_APPROVE,
        Permission.EVIDENCE_READ,
        Permission.CONSOLIDATION_READ,
        Permission.CALC_RUN,
        Permission.BU_DISCLOSURE_WRITE, Permission.BU_DISCLOSURE_READ,
        Permission.REPORT_READ, Permission.REPORT_LINEAGE,
        Permission.AUDIT_READ,
        Permission.USERS_MANAGE_SCOPED,
    },

    # ── 5. Project Admin: Project Admin + Project Data Entry / Maker ──────────
    Role.PROJECT_ADMIN: {
        Permission.AI_E1_USE, Permission.AI_E2_USE, Permission.AI_E3_USE, Permission.AI_E6_USE,
        Permission.ORG_READ,
        Permission.METRIC_READ,
        Permission.FORM_SUBMIT,
        Permission.SUBMISSION_CREATE, Permission.SUBMISSION_READ, Permission.SUBMISSION_SUBMIT,
        Permission.EVIDENCE_UPLOAD, Permission.EVIDENCE_READ,
        Permission.SPREADSHEET_UPLOAD,
        Permission.REPORT_READ,
        Permission.USERS_MANAGE_SCOPED,
    },

    # ── 6. Project Data Entry User: Field data-entry / maker with AI assistance ─
    Role.PROJECT_DATA_ENTRY_USER: {
        Permission.AI_E1_USE, Permission.AI_E3_USE, Permission.AI_E6_USE,
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
    Role.SYSTEM_ADMIN:            "system",
    Role.GROUP_ADMIN:             "group",
    Role.SUBSIDIARY_ADMIN:        "subsidiary",
    Role.BU_ADMIN:                "bu",
    Role.PROJECT_ADMIN:           "project",
    Role.PROJECT_DATA_ENTRY_USER: "project",
}

# Roles that can MANAGE USERS within their scope
ROLES_THAT_CAN_MANAGE_USERS_SCOPED: set[str] = {
    "system_admin",
    "group_admin",
    "subsidiary_admin",
    "bu_admin",
    "project_admin",
}

# Subordinate roles each admin tier can create/assign
MANAGEABLE_ROLES_BY_ROLE: dict[str, list[str]] = {
    "system_admin": [r.value for r in Role],
    "group_admin": [
        "group_admin",
        "subsidiary_admin",
        "bu_admin",
        "project_admin",
        "project_data_entry_user",
    ],
    "subsidiary_admin": [
        "subsidiary_admin",
        "bu_admin",
        "project_admin",
        "project_data_entry_user",
    ],
    "bu_admin": [
        "bu_admin",
        "project_admin",
        "project_data_entry_user",
    ],
    "project_admin": [
        "project_admin",
        "project_data_entry_user",
    ],
    "project_data_entry_user": [],
}


def has_permission(role: str, permission: Permission) -> bool:
    """Return True if `role` is granted `permission`. System Admin has full super-admin access."""
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
