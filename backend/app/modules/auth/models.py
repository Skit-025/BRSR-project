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
    SYSTEM_ADMIN     = "system_admin"      # Sole authority to create/delete users & credentials, master form view
    GROUP_ADMIN      = "group_admin"       # MEIL Group executive oversight
    ESG_MANAGER      = "esg_manager"       # ESG policy, metric applicability, consolidation, calculations
    SUBSIDIARY_ADMIN = "subsidiary_admin"  # Admin for one of the 5 MEIL subsidiaries
    MAKER            = "maker"             # Enters data, submits monthly digital form, uploads spreadsheets
    CHECKER          = "checker"           # Reviews & approves/rejects submissions (Maker != Checker enforced)
    AUDITOR          = "auditor"           # Independent assurance, read-only data, audit trails & findings
    VIEWER           = "viewer"            # Read-only dashboards and analytics


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
