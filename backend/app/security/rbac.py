"""
app/security/rbac.py
Role-Based Access Control — permission matrix and enforcement helpers.
Roles follow the principle of least privilege.
Spec: §2 (roles), §3 (permission model), §45 (visibility matrix), §46 (form types).

Critical principle (spec §1):
  Permissions → what a user can see
  Applicability rules → what a user needs to enter
  Reporting rules → what appears in their report
These three are SEPARATE concerns.
"""
from enum import Enum
from typing import Set


class Role(str, Enum):
    # ── System level ──────────────────────────────────────────────────────────
    SYSTEM_ADMIN     = "system_admin"
    SUPER_ADMIN      = "super_admin"               # Alias for system_admin

    # ── Group level ───────────────────────────────────────────────────────────
    GROUP_ADMIN       = "group_admin"              # Org mgmt, user provisioning, period locking
    GROUP_ESG_MANAGER = "group_esg_manager"        # Enterprise ESG reporting, no technical config

    # ── Subsidiary level ──────────────────────────────────────────────────────
    SUBSIDIARY_ADMIN       = "subsidiary_admin"         # Subsidiary org mgmt
    SUBSIDIARY_ESG_MANAGER = "subsidiary_esg_manager"   # BU review, subsidiary disclosures, subsidiary report

    # ── BU level ─────────────────────────────────────────────────────────────
    BU_ADMIN     = "bu_admin"            # BU org mgmt, assign reviewers
    BU_ESG_MANAGER = "bu_esg_manager"   # BU ESG oversight, BU disclosures, BU report
    BU_REVIEWER  = "bu_reviewer"        # Project submission review (primary operational role)

    # ── Project level ─────────────────────────────────────────────────────────
    PROJECT_ADMIN           = "project_admin"            # Project user management, status visibility
    PROJECT_DATA_ENTRY_USER = "project_data_entry_user"  # Raw operational data + evidence, submit only

    # ── Legacy aliases (backwards compatibility) ──────────────────────────────
    ESG_MANAGER  = "esg_manager"   # Treated as group_esg_manager
    MAKER        = "maker"         # Treated as project_data_entry_user
    CHECKER      = "checker"       # Treated as bu_reviewer

    # ── Cross-cutting ─────────────────────────────────────────────────────────
    AUDITOR          = "auditor"
    READ_ONLY_VIEWER = "read_only_viewer"
    VIEWER           = "viewer"    # Legacy alias for read_only_viewer


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
    # "Disclosure" = information that genuinely belongs to that org level
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
    EVIDENCE_UPLOAD = "evidence:upload"
    EVIDENCE_READ   = "evidence:read"
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
    USER_MANAGE        = "user:manage"          # Full user CRUD (system_admin only)
    USER_CREATE        = "user:create"
    USER_DELETE        = "user:delete"
    USERS_MANAGE_SCOPED = "users:manage_scoped" # Manage users within own scope

    # ── Governance & Assurance ────────────────────────────────────────────────
    PERIOD_LOCK     = "period:lock"
    AUDIT_READ      = "audit:read"
    ASSURANCE_WRITE = "assurance:write"


# ── Role → set of allowed permissions ────────────────────────────────────────
# Spec §45 visibility matrix is the authoritative reference.
# Key principle: permissions are SCOPE + ROLE + ACTION — enforced by backend, not just hidden in UI.

ROLE_PERMISSIONS: dict[Role, Set[Permission]] = {

    # ── System Admin: full access ─────────────────────────────────────────────
    Role.SYSTEM_ADMIN: set(Permission),
    Role.SUPER_ADMIN:  set(Permission),

    # ── Group Admin (spec §4): broadest org visibility, technical config ──────
    Role.GROUP_ADMIN: {
        Permission.AI_E1_USE, Permission.AI_E2_USE, Permission.AI_E3_USE, Permission.AI_E4_USE,
        Permission.AI_E5_USE, Permission.AI_E6_USE, Permission.AI_E7_USE, Permission.AI_APPROVE,
        Permission.ORG_READ, Permission.ORG_WRITE,
        Permission.METRIC_READ, Permission.FORM_MASTER,
        Permission.SUBMISSION_READ,
        Permission.EVIDENCE_READ,
        Permission.CONSOLIDATION_READ,
        Permission.BU_DISCLOSURE_READ,
        Permission.SUBSIDIARY_DISCLOSURE_READ,
        Permission.GROUP_DISCLOSURE_WRITE, Permission.GROUP_DISCLOSURE_READ,
        Permission.REPORT_READ, Permission.REPORT_LINEAGE,
        Permission.REPORT_COMPILE,
        Permission.PERIOD_LOCK, Permission.AUDIT_READ,
        Permission.USERS_MANAGE_SCOPED,
        Permission.USER_MANAGE, Permission.USER_CREATE, Permission.USER_DELETE,
    },

    # ── Group ESG Manager (spec §5): enterprise ESG, NO technical config ──────
    Role.GROUP_ESG_MANAGER: {
        Permission.AI_E3_USE, Permission.AI_E4_USE, Permission.AI_E5_USE, Permission.AI_E6_USE,
        Permission.ORG_READ,
        Permission.METRIC_READ,
        Permission.SUBMISSION_READ, Permission.SUBMISSION_REVIEW,
        Permission.EVIDENCE_READ,
        Permission.CONSOLIDATION_RUN, Permission.CONSOLIDATION_READ,
        Permission.CALC_RUN,
        Permission.BU_DISCLOSURE_READ,
        Permission.SUBSIDIARY_DISCLOSURE_READ,
        Permission.GROUP_DISCLOSURE_WRITE, Permission.GROUP_DISCLOSURE_READ,
        Permission.REPORT_COMPILE, Permission.REPORT_READ, Permission.REPORT_LINEAGE,
        Permission.AUDIT_READ,
    },

    # ── Legacy esg_manager: maps to group_esg_manager ─────────────────────────
    Role.ESG_MANAGER: {
        Permission.ORG_READ, Permission.ORG_WRITE,
        Permission.METRIC_READ, Permission.METRIC_WRITE,
        Permission.FORM_MASTER,
        Permission.SUBMISSION_CREATE, Permission.SUBMISSION_READ,
        Permission.SUBMISSION_SUBMIT, Permission.SUBMISSION_REVIEW, Permission.SUBMISSION_APPROVE,
        Permission.EVIDENCE_UPLOAD, Permission.EVIDENCE_READ,
        Permission.SPREADSHEET_UPLOAD,
        Permission.CONSOLIDATION_RUN, Permission.CONSOLIDATION_READ,
        Permission.CALC_RUN,
        Permission.BU_DISCLOSURE_READ,
        Permission.SUBSIDIARY_DISCLOSURE_READ,
        Permission.GROUP_DISCLOSURE_WRITE, Permission.GROUP_DISCLOSURE_READ,
        Permission.REPORT_COMPILE, Permission.REPORT_READ, Permission.REPORT_LINEAGE,
        Permission.PERIOD_LOCK, Permission.AUDIT_READ,
    },

    # ── Subsidiary Admin (spec §6): scoped to ONE subsidiary ─────────────────
    Role.SUBSIDIARY_ADMIN: {
        Permission.AI_E1_USE, Permission.AI_E2_USE, Permission.AI_E3_USE, Permission.AI_E4_USE,
        Permission.AI_E5_USE, Permission.AI_E6_USE, Permission.AI_E7_USE, Permission.AI_APPROVE,
        Permission.ORG_READ,
        Permission.METRIC_READ,
        Permission.SUBMISSION_READ, Permission.SUBMISSION_REVIEW,
        Permission.EVIDENCE_READ,
        Permission.CONSOLIDATION_READ,
        Permission.BU_DISCLOSURE_READ,
        Permission.SUBSIDIARY_DISCLOSURE_WRITE, Permission.SUBSIDIARY_DISCLOSURE_READ,
        Permission.REPORT_READ, Permission.REPORT_LINEAGE,
        Permission.AUDIT_READ,
        Permission.USERS_MANAGE_SCOPED,
    },

    # ── Subsidiary ESG Manager (spec §7): BU review + subsidiary disclosures ──
    Role.SUBSIDIARY_ESG_MANAGER: {
        Permission.AI_E3_USE, Permission.AI_E4_USE, Permission.AI_E5_USE, Permission.AI_E6_USE,
        Permission.ORG_READ,
        Permission.METRIC_READ,
        Permission.SUBMISSION_READ, Permission.SUBMISSION_REVIEW, Permission.SUBMISSION_APPROVE,
        Permission.EVIDENCE_READ,
        Permission.CONSOLIDATION_READ,
        Permission.BU_DISCLOSURE_READ,
        Permission.SUBSIDIARY_DISCLOSURE_WRITE, Permission.SUBSIDIARY_DISCLOSURE_READ,
        Permission.REPORT_READ, Permission.REPORT_LINEAGE,
        Permission.AUDIT_READ,
    },

    # ── BU Admin (spec §8): scoped to ONE BU ─────────────────────────────────
    Role.BU_ADMIN: {
        Permission.AI_E1_USE, Permission.AI_E2_USE, Permission.AI_E3_USE,
        Permission.AI_E6_USE, Permission.AI_E7_USE, Permission.AI_APPROVE,
        Permission.ORG_READ,
        Permission.METRIC_READ,
        Permission.SUBMISSION_READ, Permission.SUBMISSION_REVIEW,
        Permission.EVIDENCE_READ,
        Permission.FORM_REVIEW,
        Permission.CONSOLIDATION_READ,
        Permission.BU_DISCLOSURE_WRITE, Permission.BU_DISCLOSURE_READ,
        Permission.REPORT_READ,
        Permission.AUDIT_READ,
        Permission.USERS_MANAGE_SCOPED,
    },

    # ── BU ESG Manager: BU disclosures + applicability ────────────────────────
    Role.BU_ESG_MANAGER: {
        Permission.AI_E2_USE, Permission.AI_E7_USE, Permission.AI_APPROVE,
        Permission.ORG_READ,
        Permission.METRIC_READ,
        Permission.SUBMISSION_READ, Permission.SUBMISSION_REVIEW, Permission.SUBMISSION_APPROVE,
        Permission.EVIDENCE_READ,
        Permission.FORM_REVIEW,
        Permission.CONSOLIDATION_READ,
        Permission.BU_DISCLOSURE_WRITE, Permission.BU_DISCLOSURE_READ,
        Permission.REPORT_READ, Permission.REPORT_LINEAGE,
        Permission.CALC_RUN,
        Permission.AUDIT_READ,
    },

    # ── BU Reviewer (spec §9): receive submissions, check evidence, approve/return ──
    # Must NOT re-enter project data. PRIMARY operational review role.
    Role.BU_REVIEWER: {
        Permission.AI_E2_USE, Permission.AI_E7_USE, Permission.AI_APPROVE,
        Permission.ORG_READ,
        Permission.METRIC_READ,
        Permission.FORM_REVIEW,
        Permission.SUBMISSION_READ, Permission.SUBMISSION_REVIEW, Permission.SUBMISSION_APPROVE,
        Permission.EVIDENCE_READ,
        Permission.CONSOLIDATION_READ,
        Permission.BU_DISCLOSURE_READ,
        Permission.REPORT_READ,
        Permission.AUDIT_READ,
    },

    # ── Legacy checker: maps to bu_reviewer ──────────────────────────────────
    Role.CHECKER: {
        Permission.ORG_READ,
        Permission.METRIC_READ,
        Permission.FORM_REVIEW,
        Permission.SUBMISSION_READ, Permission.SUBMISSION_REVIEW, Permission.SUBMISSION_APPROVE,
        Permission.EVIDENCE_READ,
        Permission.CONSOLIDATION_READ,
        Permission.BU_DISCLOSURE_READ,
        Permission.REPORT_READ,
        Permission.AUDIT_READ,
    },

    # ── Project Admin (spec §10): project mgmt, NOT ESG methodology ──────────
    Role.PROJECT_ADMIN: {
        Permission.ORG_READ,
        Permission.METRIC_READ,
        Permission.FORM_SUBMIT,
        Permission.SUBMISSION_CREATE, Permission.SUBMISSION_READ, Permission.SUBMISSION_SUBMIT,
        Permission.EVIDENCE_UPLOAD, Permission.EVIDENCE_READ,
        Permission.SPREADSHEET_UPLOAD,
        Permission.REPORT_READ,
        Permission.USERS_MANAGE_SCOPED,
    },

    # ── Project Data Entry User (spec §11): raw facts + evidence + submit ─────
    # Interface MUST be extremely simple. Must NOT see group/BU/subsidiary data.
    Role.PROJECT_DATA_ENTRY_USER: {
        Permission.AI_E1_USE, Permission.AI_E2_USE, Permission.AI_E6_USE,
        Permission.ORG_READ,
        Permission.METRIC_READ,
        Permission.FORM_SUBMIT,
        Permission.SUBMISSION_CREATE, Permission.SUBMISSION_READ, Permission.SUBMISSION_SUBMIT,
        Permission.EVIDENCE_UPLOAD, Permission.EVIDENCE_READ,
        Permission.SPREADSHEET_UPLOAD,
        Permission.REPORT_READ,       # Only own project summary, not full BRSR (enforced by scope)
    },

    # ── Legacy maker: maps to project_data_entry_user ────────────────────────
    Role.MAKER: {
        Permission.ORG_READ,
        Permission.METRIC_READ,
        Permission.FORM_SUBMIT,
        Permission.SUBMISSION_CREATE, Permission.SUBMISSION_READ, Permission.SUBMISSION_SUBMIT,
        Permission.EVIDENCE_UPLOAD, Permission.EVIDENCE_READ,
        Permission.SPREADSHEET_UPLOAD,
        Permission.REPORT_READ,
    },

    # ── Auditor: read-only across all levels ──────────────────────────────────
    Role.AUDITOR: {
        Permission.ORG_READ,
        Permission.METRIC_READ,
        Permission.SUBMISSION_READ,
        Permission.EVIDENCE_READ,
        Permission.CONSOLIDATION_READ,
        Permission.BU_DISCLOSURE_READ,
        Permission.SUBSIDIARY_DISCLOSURE_READ,
        Permission.GROUP_DISCLOSURE_READ,
        Permission.REPORT_READ, Permission.REPORT_LINEAGE,
        Permission.AUDIT_READ,
        Permission.ASSURANCE_WRITE,
    },

    # ── Read-only Viewer ──────────────────────────────────────────────────────
    Role.READ_ONLY_VIEWER: {
        Permission.ORG_READ,
        Permission.METRIC_READ,
        Permission.SUBMISSION_READ,
        Permission.REPORT_READ,
    },

    # ── Legacy viewer ────────────────────────────────────────────────────────
    Role.VIEWER: {
        Permission.ORG_READ,
        Permission.METRIC_READ,
        Permission.SUBMISSION_READ,
        Permission.REPORT_READ,
    },
}


# ── Scope-tier helpers ────────────────────────────────────────────────────────
# Maps each role to the organizational tier it governs.
# Used by backend middleware to enforce org-scoped data filtering.
ROLE_SCOPE_TIER: dict[Role, str] = {
    Role.SYSTEM_ADMIN:     "system",
    Role.SUPER_ADMIN:      "system",
    Role.GROUP_ADMIN:      "group",
    Role.GROUP_ESG_MANAGER: "group",
    Role.ESG_MANAGER:      "group",
    Role.SUBSIDIARY_ADMIN:      "subsidiary",
    Role.SUBSIDIARY_ESG_MANAGER: "subsidiary",
    Role.BU_ADMIN:      "bu",
    Role.BU_ESG_MANAGER: "bu",
    Role.BU_REVIEWER:   "bu",
    Role.CHECKER:       "bu",
    Role.PROJECT_ADMIN:           "project",
    Role.PROJECT_DATA_ENTRY_USER: "project",
    Role.MAKER:         "project",
    Role.AUDITOR:       "group",   # Auditors have cross-org read access
    Role.READ_ONLY_VIEWER: "group",
    Role.VIEWER:        "group",
}

# Roles that can MANAGE USERS within their scope
ROLES_THAT_CAN_MANAGE_USERS_SCOPED: set[str] = {
    "system_admin", "super_admin",
    "group_admin",
    "group_esg_manager",
    "subsidiary_admin",
    "bu_admin",
    "project_admin",
}

# Roles each admin tier can create/assign (spec §2)
MANAGEABLE_ROLES_BY_ROLE: dict[str, list[str]] = {
    "system_admin":  [r.value for r in Role],
    "super_admin":   [r.value for r in Role],
    "group_admin":   [
        "group_esg_manager",
        "subsidiary_admin", "subsidiary_esg_manager",
        "bu_admin", "bu_esg_manager", "bu_reviewer",
        "project_admin", "project_data_entry_user",
        "auditor", "read_only_viewer", "viewer",
    ],
    "group_esg_manager": [
        "subsidiary_esg_manager",
        "bu_esg_manager", "bu_reviewer",
        "project_admin", "project_data_entry_user",
        "read_only_viewer",
    ],
    "subsidiary_admin": [
        "subsidiary_esg_manager",
        "bu_admin", "bu_esg_manager", "bu_reviewer",
        "project_admin", "project_data_entry_user",
        "read_only_viewer",
    ],
    "subsidiary_esg_manager": [
        "bu_reviewer", "project_admin", "project_data_entry_user",
    ],
    "bu_admin": [
        "bu_esg_manager", "bu_reviewer",
        "project_admin", "project_data_entry_user",
    ],
    "bu_esg_manager": [
        "bu_reviewer", "project_admin", "project_data_entry_user",
    ],
    "project_admin": [
        "project_data_entry_user",
    ],
    # Legacy aliases
    "esg_manager":    ["maker", "checker", "viewer"],
    "maker":          [],
    "checker":        ["maker"],
}


def has_permission(role: str, permission: Permission) -> bool:
    """Return True if `role` is granted `permission`. System Admin has full super-admin access."""
    if role in (Role.SYSTEM_ADMIN.value, Role.SUPER_ADMIN.value):
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


