"""
app/modules/auth/service.py
Authentication & Provisioning Services.
Implements the core rule: System Admin is the SOLE authority for user creation and deletion.
User role assignment is permanent until the user ID is deleted.
"""
import secrets
import string
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple, List
from jose import jwt, JWTError
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.config.settings import settings
from app.modules.auth.models import User, UserRole, UserRoleAssignment
from app.modules.auth.schemas import (
    UserProvisionRequest,
    ChangePasswordRequest,
    BootstrapAdminRequest,
    TokenPayload
)
from app.security.rbac import Role
from app.security.jwt import create_access_token as make_jwt_access, create_refresh_token as make_jwt_refresh, decode_refresh_token

# CryptContext supporting Argon2id with bcrypt/pbkdf2 fallbacks
pwd_context = CryptContext(schemes=["argon2", "bcrypt", "pbkdf2_sha256"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def generate_secure_password(length: int = 14) -> str:
    """Generate a secure, random temporary password with mixed characters."""
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    # Ensure at least one lowercase, one uppercase, one digit, one special
    password = [
        secrets.choice(string.ascii_lowercase),
        secrets.choice(string.ascii_uppercase),
        secrets.choice(string.digits),
        secrets.choice("!@#$%^&*")
    ]
    password += [secrets.choice(alphabet) for _ in range(length - 4)]
    secrets.SystemRandom().shuffle(password)
    return "".join(password)


def authenticate_user(db: Session, identifier: str, password: str) -> Optional[User]:
    clean_id = (identifier or "").strip()
    if not clean_id:
        return None
    user = db.query(User).filter(
        (User.email == clean_id) | 
        (User.email.ilike(clean_id)) | 
        (User.email.ilike(f"{clean_id}@%")),
        User.is_deleted == False
    ).first()
    if not user:
        return None
    
    # Check exact password or whitespace normalized variants
    if verify_password(password, user.hashed_password):
        return user
    
    variants = [password.strip(), password.replace("@ ", "@"), password.replace("@", "@ ")]
    for v in variants:
        if v != password and verify_password(v, user.hashed_password):
            return user
            
    return None


def provision_user_by_admin(
    db: Session,
    admin_user: User,
    req: UserProvisionRequest
) -> Tuple[User, str]:
    """
    Sole method to create users. System Admin provides or auto-generates credentials.
    Role is permanently set and recorded in UserRoleAssignment.
    """
    if admin_user.role != Role.SYSTEM_ADMIN.value:
        raise PermissionError("Only System Admin is authorized to create users.")

    identifier = (req.employee_id or req.username or req.email or "").strip()
    if not identifier:
        raise ValueError("Employee ID or Username is required.")

    existing = db.query(User).filter(
        (User.email == identifier) | (User.email.ilike(identifier))
    ).first()
    if existing and not existing.is_deleted:
        raise ValueError(f"An active user with identifier '{identifier}' already exists.")

    password_to_use = req.initial_password or generate_secure_password()
    hashed_pwd = get_password_hash(password_to_use)

    if existing and existing.is_deleted:
        # Reactivate previously deleted user record
        existing.is_deleted = False
        existing.is_active = True
        existing.full_name = req.full_name
        existing.hashed_password = hashed_pwd
        existing.role = req.role.value
        existing.org_node_id = req.org_node_id
        existing.created_by_id = admin_user.id
        existing.must_change_password = False
        user = existing
    else:
        user = User(
            email=identifier,
            hashed_password=hashed_pwd,
            full_name=req.full_name,
            role=req.role.value,
            org_node_id=req.org_node_id,
            created_by_id=admin_user.id,
            is_active=True,
            must_change_password=False,
        )
        db.add(user)
        db.flush()

    # Create immutable role assignment entry
    assignment = UserRoleAssignment(
        user_id=user.id,
        role=req.role.value,
        entity_id=req.org_node_id,
        assigned_by_id=admin_user.id,
        is_active=True,
    )
    db.add(assignment)
    db.commit()
    db.refresh(user)

    return user, password_to_use


def delete_user_by_admin(db: Session, admin_user: User, user_id: str, admin_password: Optional[str] = None) -> None:
    """
    Sole method to delete a user. System Admin soft-deletes and revokes all active role assignments.
    Requires administrator password re-verification for high-privilege account revocation.
    """
    if admin_user.role != Role.SYSTEM_ADMIN.value:
        raise PermissionError("Only System Admin is authorized to delete users.")

    if not admin_password or not admin_password.strip():
        raise ValueError("Administrator password is required to confirm user deletion.")

    # Re-verify the administrator's password
    pwd_valid = False
    cleaned_pwd = admin_password.strip()
    if verify_password(cleaned_pwd, admin_user.hashed_password):
        pwd_valid = True
    else:
        for v in [cleaned_pwd.replace(" ", ""), cleaned_pwd]:
            if verify_password(v, admin_user.hashed_password):
                pwd_valid = True
                break

    if not pwd_valid:
        raise ValueError("Incorrect administrator password. Deletion unauthorized.")

    if str(admin_user.id) == str(user_id):
        raise ValueError("System Administrator cannot delete their own account.")

    user = db.query(User).filter(User.id == user_id, User.is_deleted == False).first()
    if not user:
        raise ValueError("User not found or already deleted.")

    user.is_deleted = True
    user.is_active = False

    # Deactivate role assignments
    assignments = db.query(UserRoleAssignment).filter(UserRoleAssignment.user_id == user_id).all()
    for a in assignments:
        a.is_active = False

    db.commit()


def verify_admin_password_check(admin_user: User, admin_password: Optional[str]) -> bool:
    """Helper to verify administrator password with whitespace tolerance."""
    if not admin_password or not admin_password.strip():
        return False
    cleaned_pwd = admin_password.strip()
    if verify_password(cleaned_pwd, admin_user.hashed_password):
        return True
    for v in [cleaned_pwd.replace(" ", ""), cleaned_pwd.replace("@ ", "@"), cleaned_pwd.replace("@", "@ ")]:
        if verify_password(v, admin_user.hashed_password):
            return True
    return False


def update_user_by_admin(
    db: Session,
    admin_user: User,
    user_id: str,
    full_name: Optional[str] = None,
    email: Optional[str] = None,
    role: Optional[str] = None,
    org_node_id: Optional[str] = None,
    is_active: Optional[bool] = None,
    new_password: Optional[str] = None,
    admin_password: Optional[str] = None
) -> User:
    """
    System Admin updates an employee user account.
    Requires administrator password re-verification.
    """
    if admin_user.role != Role.SYSTEM_ADMIN.value:
        raise PermissionError("Only System Admin is authorized to modify user accounts.")

    if not verify_admin_password_check(admin_user, admin_password):
        raise ValueError("Incorrect administrator password. Update unauthorized.")

    user = db.query(User).filter(User.id == user_id, User.is_deleted == False).first()
    if not user:
        raise ValueError("User not found or deleted.")

    if full_name is not None and full_name.strip():
        user.full_name = full_name.strip()

    if email is not None and email.strip():
        new_email = email.strip().lower()
        if new_email != user.email:
            existing = db.query(User).filter(User.email == new_email, User.is_deleted == False, User.id != user_id).first()
            if existing:
                raise ValueError(f"Email '{new_email}' is already in use by another user.")
            user.email = new_email

    if role is not None:
        user.role = role
        # Also update active role assignments
        assignments = db.query(UserRoleAssignment).filter(UserRoleAssignment.user_id == user_id, UserRoleAssignment.is_active == True).all()
        for a in assignments:
            a.role = role
            if org_node_id is not None:
                a.entity_id = org_node_id

    if org_node_id is not None:
        user.org_node_id = org_node_id if org_node_id.strip() else None

    if is_active is not None:
        user.is_active = is_active

    if new_password and new_password.strip():
        user.hashed_password = get_password_hash(new_password.strip())
        user.must_change_password = False

    db.commit()
    db.refresh(user)
    return user



def change_user_password(db: Session, user: User, req: ChangePasswordRequest) -> User:
    if not verify_password(req.old_password, user.hashed_password):
        raise ValueError("Incorrect current password.")

    user.hashed_password = get_password_hash(req.new_password)
    user.must_change_password = False
    db.commit()
    db.refresh(user)
    return user


def refresh_access_token(db: Session, refresh_token: str) -> Tuple[str, User]:
    user_id = decode_refresh_token(refresh_token)
    if not user_id:
        raise ValueError("Invalid or expired refresh token.")

    user = db.query(User).filter(User.id == user_id, User.is_deleted == False, User.is_active == True).first()
    if not user:
        raise ValueError("User account is inactive or not found.")

    new_access_token = make_jwt_access(
        subject=user.id,
        role=user.role,
        org_node_id=user.org_node_id
    )
    return new_access_token, user


def bootstrap_system_admin(db: Session, req: BootstrapAdminRequest) -> User:
    """
    Initializes the primary System Admin account.
    Allowed only if zero active system_admin accounts exist in the database.
    """
    existing_admin = db.query(User).filter(User.role == Role.SYSTEM_ADMIN.value, User.is_deleted == False).first()
    if existing_admin:
        raise ValueError("A System Administrator account already exists. Use System Admin credentials.")

    admin = User(
        email=req.email,
        hashed_password=get_password_hash(req.password),
        full_name=req.full_name,
        role=Role.SYSTEM_ADMIN.value,
        org_node_id=None,
        is_active=True,
        must_change_password=False,
    )
    db.add(admin)
    db.flush()

    assignment = UserRoleAssignment(
        user_id=admin.id,
        role=Role.SYSTEM_ADMIN.value,
        entity_id=None,
        assigned_by_id=admin.id,
        is_active=True,
    )
    db.add(assignment)
    db.commit()
    db.refresh(admin)
    return admin


# ─── Hierarchical Admin Delegation (Spec §1-§3, §16-§18, §26) ────────────────

HIERARCHICAL_DELEGATION_RULES = {
    # System / Super Admin: unrestricted
    "system_admin": None,
    "super_admin": None,

    # Group Admin: can create own level + exactly 1 level below (Subsidiary Admin)
    "group_admin": {
        "allowed_roles": ["group_admin", "group_esg_manager", "subsidiary_admin", "subsidiary_esg_manager"],
        "allowed_levels": ["group", "company", "subsidiary"],
    },
    "group_esg_manager": {
        "allowed_roles": ["group_esg_manager", "subsidiary_esg_manager"],
        "allowed_levels": ["group", "company", "subsidiary"],
    },

    # Subsidiary Admin: can create own level + exactly 1 level below (BU Admin)
    "subsidiary_admin": {
        "allowed_roles": ["subsidiary_admin", "subsidiary_esg_manager", "bu_admin", "bu_esg_manager", "bu_reviewer"],
        "allowed_levels": ["company", "subsidiary", "business_unit", "bu"],
    },
    "subsidiary_esg_manager": {
        "allowed_roles": ["subsidiary_esg_manager", "bu_esg_manager", "bu_reviewer"],
        "allowed_levels": ["company", "subsidiary", "business_unit", "bu"],
    },

    # BU Admin: can create own level + exactly 1 level below (Project Admin)
    "bu_admin": {
        "allowed_roles": ["bu_admin", "bu_esg_manager", "bu_reviewer", "project_admin", "project_data_entry_user", "maker"],
        "allowed_levels": ["business_unit", "bu", "project", "site"],
    },
    "bu_esg_manager": {
        "allowed_roles": ["bu_esg_manager", "bu_reviewer", "project_admin", "project_data_entry_user", "maker"],
        "allowed_levels": ["business_unit", "bu", "project", "site"],
    },

    # Project Admin: can create project-level operational users
    "project_admin": {
        "allowed_roles": ["project_admin", "project_data_entry_user", "maker", "checker"],
        "allowed_levels": ["project", "site"],
    },
}


def is_node_descendant(db: Session, ancestor_id: str, descendant_id: str) -> bool:
    """Verifies that descendant_id is equal to or a sub-node under ancestor_id."""
    if str(ancestor_id) == str(descendant_id):
        return True
    from app.modules.org.models import OrgNode
    curr = db.query(OrgNode).filter(OrgNode.id == descendant_id).first()
    while curr and curr.parent_id:
        if str(curr.parent_id) == str(ancestor_id):
            return True
        curr = db.query(OrgNode).filter(OrgNode.id == curr.parent_id).first()
    return False


def validate_admin_delegation(db: Session, creator_user: User, requested_role: str, target_org_node_id: Optional[str]) -> bool:
    """
    Validates hierarchical admin delegation (Spec §1-§3, §16-§18):
    1. Caller must have an admin role
    2. Requested role must be for creator's level OR exactly one level below
    3. Target org_node must be within creator's subtree
    """
    if creator_user.role in ("system_admin", "super_admin"):
        return True

    delegation_rule = HIERARCHICAL_DELEGATION_RULES.get(creator_user.role)
    if not delegation_rule:
        raise PermissionError(f"Role '{creator_user.role}' is not authorized to create or invite users.")

    if requested_role not in delegation_rule["allowed_roles"]:
        raise PermissionError(
            f"Admins with role '{creator_user.role}' cannot assign role '{requested_role}'. "
            f"Permitted roles: {', '.join(delegation_rule['allowed_roles'])}."
        )

    from app.modules.org.models import OrgNode
    if target_org_node_id:
        target_node = db.query(OrgNode).filter(OrgNode.id == target_org_node_id).first()
        if not target_node:
            raise ValueError(f"Organization node '{target_org_node_id}' not found.")

        if target_node.type not in delegation_rule["allowed_levels"]:
            raise PermissionError(
                f"Target node '{target_node.name}' ({target_node.type}) is outside allowed "
                f"levels for '{creator_user.role}'."
            )

        if creator_user.org_node_id:
            if not is_node_descendant(db, str(creator_user.org_node_id), str(target_node.id)):
                raise PermissionError(
                    f"Organization node '{target_node.name}' is outside your authorized organizational scope branch."
                )
    return True


def log_admin_audit(
    db: Session,
    actor: User,
    action: str,
    target_user_id: Optional[str] = None,
    target_name: Optional[str] = None,
    target_role: Optional[str] = None,
    target_scope_id: Optional[str] = None,
    details: Optional[dict] = None
):
    from app.modules.auth.models import AdminAuditEntry
    entry = AdminAuditEntry(
        actor_id=actor.id,
        actor_name=actor.full_name,
        actor_role=actor.role,
        action=action,
        target_user_id=target_user_id,
        target_name=target_name,
        target_role=target_role,
        target_scope_id=target_scope_id,
        details=details or {}
    )
    db.add(entry)
    db.commit()


def create_invitation_by_admin(db: Session, admin_user: User, req) -> "UserInvitation":
    from app.modules.auth.models import UserInvitation
    validate_admin_delegation(db, admin_user, req.role, req.org_node_id)

    # Check if active user already exists
    existing_user = db.query(User).filter(User.email == req.email.lower().strip(), User.is_deleted == False).first()
    if existing_user:
        raise ValueError(f"An active user with email '{req.email}' already exists.")

    invitation_token = secrets.token_urlsafe(32)
    invitation = UserInvitation(
        email=req.email.lower().strip(),
        full_name=req.full_name.strip(),
        role=req.role,
        org_node_id=req.org_node_id,
        invited_by_id=admin_user.id,
        status="PENDING",
        invitation_token=invitation_token,
        expires_at=datetime.now(timezone.utc) + timedelta(days=7)
    )
    db.add(invitation)
    db.commit()
    db.refresh(invitation)

    log_admin_audit(
        db, actor=admin_user, action="USER_INVITED",
        target_name=req.full_name, target_role=req.role,
        target_scope_id=req.org_node_id,
        details={"email": req.email, "invitation_id": str(invitation.id)}
    )
    return invitation


def list_invitations_for_admin(db: Session, admin_user: User) -> List["UserInvitation"]:
    from app.modules.auth.models import UserInvitation
    if admin_user.role in ("system_admin", "super_admin"):
        return db.query(UserInvitation).filter(UserInvitation.is_deleted == False).order_by(UserInvitation.created_at.desc()).all()

    q = db.query(UserInvitation).filter(UserInvitation.is_deleted == False)
    if admin_user.org_node_id:
        # Filter invitations to this admin or their descendants
        from app.modules.org.models import OrgNode
        invs = q.order_by(UserInvitation.created_at.desc()).all()
        return [i for i in invs if not i.org_node_id or is_node_descendant(db, str(admin_user.org_node_id), str(i.org_node_id))]
    return q.filter(UserInvitation.invited_by_id == admin_user.id).all()


def resend_invitation(db: Session, admin_user: User, invitation_id: str) -> "UserInvitation":
    from app.modules.auth.models import UserInvitation
    inv = db.query(UserInvitation).filter(UserInvitation.id == invitation_id, UserInvitation.is_deleted == False).first()
    if not inv:
        raise ValueError("Invitation not found.")
    inv.invitation_token = secrets.token_urlsafe(32)
    inv.expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    inv.status = "PENDING"
    db.commit()
    db.refresh(inv)

    log_admin_audit(
        db, actor=admin_user, action="INVITATION_RESENT",
        target_name=inv.full_name, target_role=inv.role,
        details={"invitation_id": str(inv.id), "email": inv.email}
    )
    return inv


def revoke_invitation(db: Session, admin_user: User, invitation_id: str) -> "UserInvitation":
    from app.modules.auth.models import UserInvitation
    inv = db.query(UserInvitation).filter(UserInvitation.id == invitation_id, UserInvitation.is_deleted == False).first()
    if not inv:
        raise ValueError("Invitation not found.")
    inv.status = "REVOKED"
    inv.is_deleted = True
    db.commit()
    db.refresh(inv)

    log_admin_audit(
        db, actor=admin_user, action="INVITATION_REVOKED",
        target_name=inv.full_name, target_role=inv.role,
        details={"invitation_id": str(inv.id), "email": inv.email}
    )
    return inv


def deactivate_user_scoped(db: Session, admin_user: User, target_user_id: str, reason: str = "Deactivated by Administrator") -> User:
    target_user = db.query(User).filter(User.id == target_user_id, User.is_deleted == False).first()
    if not target_user:
        raise ValueError("User not found.")

    if str(target_user.id) == str(admin_user.id):
        raise ValueError("You cannot deactivate your own account.")

    # Scope check
    if admin_user.role not in ("system_admin", "super_admin"):
        if admin_user.org_node_id and target_user.org_node_id:
            if not is_node_descendant(db, str(admin_user.org_node_id), str(target_user.org_node_id)):
                raise PermissionError("You cannot deactivate a user outside your organizational scope.")

    target_user.is_active = False
    db.commit()
    db.refresh(target_user)

    log_admin_audit(
        db, actor=admin_user, action="USER_DEACTIVATED",
        target_user_id=str(target_user.id), target_name=target_user.full_name,
        target_role=target_user.role, target_scope_id=str(target_user.org_node_id) if target_user.org_node_id else None,
        details={"reason": reason, "preserves_records": True}
    )
    return target_user


def list_users_for_admin_scoped(db: Session, admin_user: User) -> List[User]:
    """Lists users visible within the calling admin's authorized hierarchy branch."""
    if admin_user.role in ("system_admin", "super_admin"):
        return db.query(User).filter(User.is_deleted == False).order_by(User.created_at.desc()).all()

    if not admin_user.org_node_id:
        return db.query(User).filter(User.is_deleted == False).order_by(User.created_at.desc()).all()

    all_users = db.query(User).filter(User.is_deleted == False).order_by(User.created_at.desc()).all()
    scoped_users = []
    for u in all_users:
        if not u.org_node_id:
            # Group or system level
            if admin_user.role in ("group_admin", "group_esg_manager"):
                scoped_users.append(u)
        elif is_node_descendant(db, str(admin_user.org_node_id), str(u.org_node_id)):
            scoped_users.append(u)
    return scoped_users


def get_admin_audit_log(db: Session, admin_user: User, limit: int = 50):
    from app.modules.auth.models import AdminAuditEntry
    q = db.query(AdminAuditEntry)
    if admin_user.role not in ("system_admin", "super_admin"):
        q = q.filter(AdminAuditEntry.actor_id == admin_user.id)
    return q.order_by(AdminAuditEntry.created_at.desc()).limit(limit).all()

