"""
app/modules/auth/models.py
Authentication models: User, UserRoleAssignment, and IdempotencyKey.
Enforces the 8-role security hierarchy with System Admin sole user provisioning.
"""
import enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, Integer, ForeignKey, Date, Text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, JSONB
from sqlalchemy.orm import relationship
from app.db.base import Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin


class UserRole(str, enum.Enum):
    # ── System level ─────────────────────────────────────────────────────────
    SYSTEM_ADMIN     = "system_admin"          # Sole authority: create/delete users, credentials, master form
    SUPER_ADMIN      = "super_admin"           # Alias/synonym for system_admin in multi-instance deployments

    # ── Group level ──────────────────────────────────────────────────────────
    GROUP_ADMIN      = "group_admin"           # Group executive oversight, hierarchy mgmt, user provisioning
    GROUP_ESG_MANAGER = "group_esg_manager"    # Enterprise ESG: review subsidiaries, approve consolidated data, generate group reports

    # ── Subsidiary level ─────────────────────────────────────────────────────
    SUBSIDIARY_ADMIN    = "subsidiary_admin"       # Subsidiary org management, user management within subsidiary
    SUBSIDIARY_ESG_MANAGER = "subsidiary_esg_manager"  # Review BU submissions, approve BU data, subsidiary disclosures, generate subsidiary report

    # ── BU level ─────────────────────────────────────────────────────────────
    BU_ADMIN     = "bu_admin"            # BU org management, assign reviewers, manage project users
    BU_ESG_MANAGER = "bu_esg_manager"   # BU ESG oversight: manage applicability, BU-level disclosures, BU report
    BU_REVIEWER  = "bu_reviewer"        # Primary operational role: receive project submissions, evidence review, approve/return

    # ── Project level ────────────────────────────────────────────────────────
    PROJECT_ADMIN      = "project_admin"           # Project mgmt: manage project users, view submission status
    PROJECT_DATA_ENTRY_USER = "project_data_entry_user"  # Operational data collection: enter raw facts, upload evidence, submit

    # ── Legacy aliases (kept for backwards compatibility with existing records) ──
    ESG_MANAGER      = "esg_manager"           # Legacy: maps to group_esg_manager capabilities
    MAKER            = "maker"                 # Legacy: maps to project_data_entry_user capabilities
    CHECKER          = "checker"               # Legacy: maps to bu_reviewer capabilities

    # ── Cross-cutting ─────────────────────────────────────────────────────────
    AUDITOR = "auditor"     # Independent assurance, read-only data, audit trails & findings
    READ_ONLY_VIEWER = "read_only_viewer"  # Read-only dashboards and analytics
    VIEWER  = "viewer"      # Legacy alias for read_only_viewer


class User(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    """
    User entity. Accounts and credentials can ONLY be provisioned and deleted by System Admin.
    Role is permanently bound to the user record and mirrored in UserRoleAssignment.
    """
    __tablename__ = "users"

    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    
    # Permanent Role (One of the 8 authoritative roles)
    role = Column(String(50), default=UserRole.MAKER.value, nullable=False, index=True)
    
    # Scoped Org Node (Subsidiary, BU, or Project). System Admin and Group Admin have group-wide access (None)
    org_node_id = Column(PG_UUID(as_uuid=False), ForeignKey("org_nodes.id", ondelete="SET NULL"), nullable=True, index=True)
    
    is_active = Column(Boolean, default=True, nullable=False)
    must_change_password = Column(Boolean, default=True, nullable=False)
    
    # Provisioning audit: records which system_admin created this user
    created_by_id = Column(PG_UUID(as_uuid=False), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    # MFA
    mfa_enabled = Column(Boolean, default=False, nullable=False)
    mfa_secret = Column(String(100), nullable=True)

    # Relationships
    role_assignments = relationship("UserRoleAssignment", back_populates="user", cascade="all, delete-orphan", foreign_keys="UserRoleAssignment.user_id")


class UserRoleAssignment(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Audited permanent role assignment for scoped governance.
    Every user creation by System Admin logs an immutable assignment here.
    """
    __tablename__ = "user_role_assignments"

    user_id = Column(PG_UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(50), nullable=False, index=True)
    entity_id = Column(PG_UUID(as_uuid=False), ForeignKey("org_nodes.id", ondelete="SET NULL"), nullable=True, index=True)
    
    valid_from = Column(Date, default=lambda: datetime.now(timezone.utc).date(), nullable=False)
    valid_to = Column(Date, nullable=True)  # Null indicates permanent until user ID is deleted
    
    assigned_by_id = Column(PG_UUID(as_uuid=False), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

    user = relationship("User", back_populates="role_assignments", foreign_keys=[user_id])


class IdempotencyKey(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Idempotency key registry for high-integrity write endpoints (submissions, file uploads).
    Prevents duplicate submissions if client retries network requests.
    """
    __tablename__ = "idempotency_keys"

    key = Column(String(255), unique=True, index=True, nullable=False)
    user_id = Column(PG_UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    endpoint = Column(String(255), nullable=False)
    request_hash = Column(String(64), nullable=False)
    response_code = Column(Integer, nullable=True)
    response_body = Column(JSONB, nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)


class UserInvitation(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    """
    Invitation model for secure email-based admin/user onboarding (Spec §8, §9).
    """
    __tablename__ = "user_invitations"

    email = Column(String(255), index=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, index=True)
    org_node_id = Column(PG_UUID(as_uuid=False), ForeignKey("org_nodes.id", ondelete="SET NULL"), nullable=True, index=True)
    invited_by_id = Column(PG_UUID(as_uuid=False), ForeignKey("users.id", ondelete="SET NULL"), nullable=False)
    status = Column(String(30), default="PENDING", nullable=False, index=True)  # PENDING | ACCEPTED | REVOKED | EXPIRED
    invitation_token = Column(String(255), unique=True, index=True, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    accepted_at = Column(DateTime(timezone=True), nullable=True)


class AdminAuditEntry(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Audit log for administrative and user management actions (Spec §21, §47).
    """
    __tablename__ = "admin_audit_entries"

    actor_id = Column(PG_UUID(as_uuid=False), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    actor_name = Column(String(255), nullable=False)
    actor_role = Column(String(50), nullable=False)
    action = Column(String(100), nullable=False, index=True)
    target_user_id = Column(PG_UUID(as_uuid=False), nullable=True, index=True)
    target_name = Column(String(255), nullable=True)
    target_role = Column(String(50), nullable=True)
    target_scope_id = Column(PG_UUID(as_uuid=False), nullable=True)
    details = Column(JSONB, nullable=False, default=dict)


class UserCreationRequestStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    CANCELLED = "CANCELLED"


class UserCreationRequest(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """
    User creation request initiated by Subsidiary Admin or authorized delegator.
    Requires Group Admin or System Admin approval before official account creation.
    Snapshot data preserves historical identity for auditing regardless of future role changes.
    """
    __tablename__ = "user_creation_requests"

    request_number = Column(String(50), unique=True, index=True, nullable=False)

    # Requested user details
    full_name = Column(String(255), nullable=False)
    email = Column(String(255), index=True, nullable=False)
    employee_id = Column(String(100), nullable=True)
    phone = Column(String(50), nullable=True)
    requested_role = Column(String(50), nullable=False, index=True)

    # Organizational scope hierarchy snapshot
    org_node_id = Column(PG_UUID(as_uuid=False), ForeignKey("org_nodes.id", ondelete="SET NULL"), nullable=True, index=True)
    group_id = Column(PG_UUID(as_uuid=False), nullable=True)
    group_name = Column(String(255), nullable=True)
    subsidiary_id = Column(PG_UUID(as_uuid=False), nullable=True)
    subsidiary_name = Column(String(255), nullable=True)
    bu_id = Column(PG_UUID(as_uuid=False), nullable=True)
    bu_name = Column(String(255), nullable=True)
    project_id = Column(PG_UUID(as_uuid=False), nullable=True)
    project_name = Column(String(255), nullable=True)

    # Lifecycle & status
    reason = Column(Text, nullable=True)
    status = Column(String(30), default="PENDING", nullable=False, index=True)

    # Requester identity snapshot (captured at creation time)
    requested_by_user_id = Column(PG_UUID(as_uuid=False), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    requested_by_name = Column(String(255), nullable=False)
    requested_by_role = Column(String(50), nullable=False)
    requested_by_employee_id = Column(String(100), nullable=True)
    requested_by_email = Column(String(255), nullable=True)

    # Approver identity snapshot (captured at approval time)
    approved_by_user_id = Column(PG_UUID(as_uuid=False), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    approved_by_name = Column(String(255), nullable=True)
    approved_by_role = Column(String(50), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)

    # Rejecter identity snapshot (captured at rejection time)
    rejected_by_user_id = Column(PG_UUID(as_uuid=False), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    rejected_by_name = Column(String(255), nullable=True)
    rejected_by_role = Column(String(50), nullable=True)
    rejected_at = Column(DateTime(timezone=True), nullable=True)
    rejection_reason = Column(Text, nullable=True)

    # Created user binding (populated upon successful approval)
    created_user_id = Column(PG_UUID(as_uuid=False), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Extensible user payload snapshot
    requested_user_data = Column(JSONB, default=dict, nullable=False)


