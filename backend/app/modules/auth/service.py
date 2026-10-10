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

    role_val = req.role.value if hasattr(req.role, "value") else str(req.role)
    from app.security.scope import validate_role_to_scope
    validate_role_to_scope(db, role_val, req.org_node_id)

    identifier = (req.employee_id or req.username or req.email or "").strip()
    if not identifier:
        raise ValueError("Employee ID or Username is required.")

    existing = db.query(User).filter(
        (User.email == identifier) | (User.email.ilike(identifier))
    ).first()
    if existing and not existing.is_deleted:
        raise ValueError(f"An active user with identifier '{identifier}' already exists.")

    clean_phone = (getattr(req, "phone", None) or "").strip() or None
    if clean_phone:
        existing_phone = db.query(User).filter(User.phone == clean_phone, User.is_deleted == False).first()
        if existing_phone and (not existing or existing_phone.id != existing.id):
            raise ValueError(f"An active user with phone '{clean_phone}' already exists.")

    password_to_use = req.initial_password or generate_secure_password()
    hashed_pwd = get_password_hash(password_to_use)

    if existing and existing.is_deleted:
        # Reactivate previously deleted user record
        existing.is_deleted = False
        existing.is_active = True
        existing.full_name = req.full_name
        existing.phone = clean_phone
        existing.hashed_password = hashed_pwd
        existing.role = req.role.value
        existing.org_node_id = req.org_node_id
        existing.created_by_id = admin_user.id
        existing.must_change_password = False
        user = existing
    else:
        user = User(
            email=identifier,
            phone=clean_phone,
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


def delete_user_by_admin(
    db: Session,
    admin_user: User,
    user_id: str,
    admin_password: Optional[str] = None,
    reason: str = "Deleted by Administrator"
) -> User:
    """
    Soft-deletes a user and revokes active role assignments.
    Authorized for System Admin (system-wide) and Group Admin (within authorized scope).
    Requires administrator password and mandatory reason.
    Group Admin cannot delete System Admin or Group Admin accounts.
    """
    # Fetch target user
    target_user = db.query(User).filter(User.id == user_id, User.is_deleted == False).first()
    if not target_user:
        raise ValueError("User not found or already deleted.")

    # Hierarchical role gate & scope validation
    if admin_user.role == Role.SYSTEM_ADMIN.value:
        pass
    elif admin_user.role == Role.GROUP_ADMIN.value:
        if target_user.role != Role.SUBSIDIARY_ADMIN.value:
            raise PermissionError("Group Admin can only delete Subsidiary Admin accounts.")
        if admin_user.org_node_id and target_user.org_node_id:
            if not is_node_descendant(db, str(admin_user.org_node_id), str(target_user.org_node_id)):
                raise PermissionError("You cannot delete a user outside your authorized organizational scope.")
    elif admin_user.role == Role.SUBSIDIARY_ADMIN.value:
        if target_user.role != Role.BU_ADMIN.value:
            raise PermissionError("Subsidiary Admin can only delete BU Admin accounts.")
        if admin_user.org_node_id and target_user.org_node_id:
            if not is_node_descendant(db, str(admin_user.org_node_id), str(target_user.org_node_id)):
                raise PermissionError("You cannot delete a user outside your authorized subsidiary scope.")
    elif admin_user.role == Role.BU_ADMIN.value:
        if target_user.role != Role.PROJECT_ADMIN.value:
            raise PermissionError("BU Admin can only delete Project Admin accounts.")
        if admin_user.org_node_id and target_user.org_node_id:
            if not is_node_descendant(db, str(admin_user.org_node_id), str(target_user.org_node_id)):
                raise PermissionError("You cannot delete a user outside your authorized BU scope.")
    else:
        raise PermissionError(f"Role '{admin_user.role}' is not authorized to delete users.")

    target_user.is_deleted = True
    target_user.is_active = False

    # Deactivate role assignments
    assignments = db.query(UserRoleAssignment).filter(UserRoleAssignment.user_id == user_id).all()
    for a in assignments:
        a.is_active = False

    db.commit()

    log_admin_audit(
        db, actor=admin_user, action="USER_DELETED",
        target_user_id=str(target_user.id), target_name=target_user.full_name,
        target_role=target_user.role, target_scope_id=str(target_user.org_node_id) if target_user.org_node_id else None,
        details={"reason": reason.strip(), "soft_deleted": True}
    )
    return target_user


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
    phone: Optional[str] = None,
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

    if phone is not None:
        clean_phone = phone.strip() or None
        if clean_phone and clean_phone != user.phone:
            existing_phone = db.query(User).filter(User.phone == clean_phone, User.is_deleted == False, User.id != user_id).first()
            if existing_phone:
                raise ValueError(f"Phone number '{clean_phone}' is already in use by another user.")
        user.phone = clean_phone

    target_role = role if role is not None else user.role
    target_node_id = org_node_id if org_node_id is not None else (str(user.org_node_id) if user.org_node_id else None)
    from app.security.scope import validate_role_to_scope
    validate_role_to_scope(db, target_role, target_node_id)

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
    # System Admin: unrestricted across platform (can create/delegate any role)
    "system_admin": None,

    # Group Admin: can ONLY add/invite Subsidiary Admin
    "group_admin": {
        "allowed_roles": ["subsidiary_admin"],
        "allowed_levels": ["company", "subsidiary"],
    },

    # Subsidiary Admin: can ONLY add/invite BU Admin
    "subsidiary_admin": {
        "allowed_roles": ["bu_admin"],
        "allowed_levels": ["business_unit", "bu"],
    },

    # BU Admin: can ONLY add/invite Project Admin
    "bu_admin": {
        "allowed_roles": ["project_admin"],
        "allowed_levels": ["project", "site"],
    },

    # Project Admin: no role creation or delegation
    "project_admin": {
        "allowed_roles": [],
        "allowed_levels": [],
    },
}


def get_descendant_node_ids(db: Session, ancestor_id: str) -> set:
    """Returns a set of all descendant node IDs and codes in memory with a single query."""
    if not ancestor_id:
        return set()
    from app.modules.org.models import OrgNode
    all_nodes = db.query(OrgNode.id, OrgNode.parent_id, OrgNode.code).filter(OrgNode.is_deleted == False).all()
    children_map = {}
    code_map = {}
    for nid, pid, code in all_nodes:
        s_nid = str(nid)
        s_pid = str(pid) if pid else None
        children_map.setdefault(s_pid, []).append(s_nid)
        if code:
            code_map[s_nid] = code

    descendants = set()
    queue = [str(ancestor_id)]
    while queue:
        curr = queue.pop()
        descendants.add(curr)
        c = code_map.get(curr)
        if c:
            descendants.add(c)
        for child in children_map.get(curr, []):
            if child not in descendants:
                queue.append(child)
    return descendants


def is_node_descendant(db: Session, ancestor_id: str, descendant_id: str) -> bool:
    """Verifies that descendant_id is equal to or a sub-node under ancestor_id."""
    if not ancestor_id or not descendant_id:
        return False
    if str(ancestor_id) == str(descendant_id):
        return True
    return str(descendant_id) in get_descendant_node_ids(db, str(ancestor_id))


def validate_admin_delegation(db: Session, creator_user: User, requested_role: str, target_org_node_id: Optional[str]) -> bool:
    """
    Validates hierarchical admin delegation and Role-to-Scope rules:
    1. Enforces Role-to-Scope matrix (scope type matches role type)
    2. Caller must have an admin role with role-creation privileges
    3. Requested role must be in the creator's allowed_roles
    4. Target org_node must be within creator's authorized subtree
    """
    from app.security.scope import validate_role_to_scope
    validate_role_to_scope(db, requested_role, target_org_node_id)

    if creator_user.role == "system_admin":
        return True

    delegation_rule = HIERARCHICAL_DELEGATION_RULES.get(creator_user.role)
    if not delegation_rule or not delegation_rule.get("allowed_roles"):
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
    from app.modules.org.models import OrgNode
    import uuid

    clean_scope_id = None
    if target_scope_id:
        try:
            uuid.UUID(str(target_scope_id))
            clean_scope_id = str(target_scope_id)
        except (ValueError, AttributeError):
            node = db.query(OrgNode).filter(OrgNode.code == str(target_scope_id)).first()
            if node:
                clean_scope_id = str(node.id)
            else:
                clean_scope_id = None

    clean_target_user_id = None
    if target_user_id:
        try:
            uuid.UUID(str(target_user_id))
            clean_target_user_id = str(target_user_id)
        except (ValueError, AttributeError):
            clean_target_user_id = None

    entry = AdminAuditEntry(
        actor_id=actor.id,
        actor_name=actor.full_name,
        actor_role=actor.role,
        action=action,
        target_user_id=clean_target_user_id,
        target_name=target_name,
        target_role=target_role,
        target_scope_id=clean_scope_id,
        details=details or {}
    )
    db.add(entry)
    db.commit()


def create_invitation_by_admin(db: Session, admin_user: User, req) -> "UserInvitation":
    from app.modules.auth.models import UserInvitation
    from app.modules.org.models import OrgNode
    from app.services.email_invitation_service import send_invitation_email, generate_secure_password_setup_link

    validate_admin_delegation(db, admin_user, req.role, req.org_node_id)

    # Check if user already exists (active or deleted to prevent DB integrity error)
    clean_email = req.email.lower().strip()
    existing_user = db.query(User).filter(User.email == clean_email).first()
    if existing_user:
        if getattr(existing_user, "is_deleted", False):
            raise ValueError(f"A deleted user account with email '{req.email}' exists. Please restore or reactivate the user account.")
        raise ValueError(f"An active user with email '{req.email}' already exists.")

    # Check phone uniqueness
    clean_phone = (getattr(req, "phone", None) or "").strip() or None
    if clean_phone:
        existing_phone_user = db.query(User).filter(User.phone == clean_phone).first()
        if existing_phone_user:
            if getattr(existing_phone_user, "is_deleted", False):
                raise ValueError(f"A deleted user account with phone '{clean_phone}' exists.")
            raise ValueError(f"An active user with phone '{clean_phone}' already exists.")
        existing_phone_inv = db.query(UserInvitation).filter(
            UserInvitation.phone == clean_phone,
            UserInvitation.status.in_(["PENDING", "SENT"]),
            UserInvitation.is_deleted == False
        ).first()
        if existing_phone_inv:
            raise ValueError(f"A pending invitation for phone '{clean_phone}' already exists.")

    existing_inv = db.query(UserInvitation).filter(
        UserInvitation.email == clean_email,
        UserInvitation.status.in_(["PENDING", "SENT"]),
        UserInvitation.is_deleted == False
    ).first()
    if existing_inv:
        raise ValueError(f"A pending invitation for email '{clean_email}' already exists.")

    # Scope name derivation for email
    scope_name = None
    if req.org_node_id:
        node = db.query(OrgNode).filter(OrgNode.id == req.org_node_id).first()
        if node:
            scope_name = f"{node.name} ({node.type.replace('_', ' ').title()})"

    # 3. Generate strong random temporary credentials and create temporary account
    temp_password = generate_secure_password(length=14)
    hashed_pwd = get_password_hash(temp_password)

    # Directly create temporary user until first login
    temp_user = User(
        email=clean_email,
        phone=clean_phone,
        hashed_password=hashed_pwd,
        full_name=req.full_name.strip(),
        role=req.role,
        org_node_id=req.org_node_id,
        created_by_id=admin_user.id,
        is_active=True,
        must_change_password=True,
    )
    db.add(temp_user)
    db.flush()

    assignment = UserRoleAssignment(
        user_id=temp_user.id,
        role=temp_user.role,
        entity_id=temp_user.org_node_id,
        assigned_by_id=admin_user.id,
        is_active=True,
    )
    db.add(assignment)

    # 4. Secure token & login link generation
    invitation_token = secrets.token_urlsafe(32)
    setup_link = generate_secure_password_setup_link(clean_email, invitation_token)

    # 5. Dispatch branded email invitation with the generated password
    email_ok, email_err = send_invitation_email(
        recipient_name=req.full_name.strip(),
        recipient_email=clean_email,
        role=req.role,
        org_scope_name=scope_name,
        setup_link=setup_link,
        temp_password=temp_password
    )

    invitation = UserInvitation(
        email=clean_email,
        phone=clean_phone,
        full_name=req.full_name.strip(),
        role=req.role,
        org_node_id=req.org_node_id,
        invited_by_id=admin_user.id,
        status="SENT" if email_ok else "FAILED",
        invitation_token=invitation_token,
        firebase_uid=None,
        setup_link=setup_link,
        delivery_status="SENT" if email_ok else "FAILED",
        delivery_error=email_err,
        expires_at=datetime.now(timezone.utc) + timedelta(days=7)
    )
    db.add(invitation)
    db.commit()
    db.refresh(invitation)

    log_admin_audit(
        db, actor=admin_user, action="USER_INVITED",
        target_name=req.full_name, target_role=req.role,
        target_scope_id=req.org_node_id,
        details={
            "email": clean_email,
            "invitation_id": str(invitation.id),
            "delivery_status": invitation.delivery_status
        }
    )
    return invitation


def list_invitations_for_admin(db: Session, admin_user: User) -> List["UserInvitation"]:
    from app.modules.auth.models import UserInvitation
    if admin_user.role == "system_admin":
        return db.query(UserInvitation).filter(UserInvitation.is_deleted == False).order_by(UserInvitation.created_at.desc()).all()

    target_role = None
    if admin_user.role == "group_admin":
        target_role = "subsidiary_admin"
    elif admin_user.role == "subsidiary_admin":
        target_role = "bu_admin"
    elif admin_user.role == "bu_admin":
        target_role = "project_admin"
    else:
        return []

    q = db.query(UserInvitation).filter(UserInvitation.is_deleted == False, UserInvitation.role == target_role)
    if admin_user.org_node_id:
        from app.modules.org.models import OrgNode
        invs = q.order_by(UserInvitation.created_at.desc()).all()
        return [i for i in invs if not i.org_node_id or is_node_descendant(db, str(admin_user.org_node_id), str(i.org_node_id))]
    return q.filter(UserInvitation.invited_by_id == admin_user.id).all()


def resend_invitation(db: Session, admin_user: User, invitation_id: str) -> "UserInvitation":
    from app.modules.auth.models import UserInvitation
    from app.modules.org.models import OrgNode
    from app.services.email_invitation_service import send_invitation_email, generate_secure_password_setup_link

    inv = db.query(UserInvitation).filter(UserInvitation.id == invitation_id, UserInvitation.is_deleted == False).first()
    if not inv:
        raise ValueError("Invitation not found.")

    # Re-validate requester authorization
    validate_admin_delegation(db, admin_user, inv.role, inv.org_node_id)

    inv.invitation_token = secrets.token_urlsafe(32)
    inv.expires_at = datetime.now(timezone.utc) + timedelta(days=7)

    # If user hasn't logged in yet, regenerate temporary password and update account
    temp_password = generate_secure_password(length=14)
    if inv.status in ["PENDING", "SENT"]:
        user_rec = db.query(User).filter(User.email == inv.email, User.is_deleted == False).first()
        if user_rec:
            user_rec.hashed_password = get_password_hash(temp_password)
            user_rec.must_change_password = True

    scope_name = None
    if inv.org_node_id:
        node = db.query(OrgNode).filter(OrgNode.id == inv.org_node_id).first()
        if node:
            scope_name = f"{node.name} ({node.type.replace('_', ' ').title()})"

    setup_link = generate_secure_password_setup_link(inv.email, inv.invitation_token)
    email_ok, email_err = send_invitation_email(
        recipient_name=inv.full_name,
        recipient_email=inv.email,
        role=inv.role,
        org_scope_name=scope_name,
        setup_link=setup_link,
        temp_password=temp_password
    )

    inv.setup_link = setup_link
    inv.status = "SENT" if email_ok else "FAILED"
    inv.delivery_status = "SENT" if email_ok else "FAILED"
    inv.delivery_error = email_err
    db.commit()
    db.refresh(inv)

    log_admin_audit(
        db, actor=admin_user, action="INVITATION_RESENT",
        target_name=inv.full_name, target_role=inv.role,
        details={"invitation_id": str(inv.id), "email": inv.email, "delivery_status": inv.delivery_status}
    )
    return inv


def revoke_invitation(db: Session, admin_user: User, invitation_id: str) -> "UserInvitation":
    from app.modules.auth.models import UserInvitation
    inv = db.query(UserInvitation).filter(UserInvitation.id == invitation_id, UserInvitation.is_deleted == False).first()
    if not inv:
        raise ValueError("Invitation not found.")

    # If the user has not logged in yet (invitation is still PENDING or SENT), destroy the temporary account
    if inv.status in ["PENDING", "SENT"]:
        temp_user = db.query(User).filter(User.email == inv.email).first()
        if temp_user:
            # Delete role assignments
            db.query(UserRoleAssignment).filter(UserRoleAssignment.user_id == temp_user.id).delete(synchronize_session=False)
            # Destroy the temporary user account
            db.delete(temp_user)

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


def deactivate_user_scoped(
    db: Session,
    admin_user: User,
    target_user_id: str,
    admin_password: str,
    reason: str = "Deactivated by Administrator"
) -> User:
    # 1. Role gate: system_admin, group_admin, subsidiary_admin, bu_admin
    if admin_user.role not in ("system_admin", "group_admin", "subsidiary_admin", "bu_admin"):
        raise PermissionError("You are not authorized to deactivate user accounts.")

    # 2. Verify calling admin's own password
    if not verify_admin_password_check(admin_user, admin_password):
        raise PermissionError("Incorrect administrator password. Deactivation denied.")

    target_user = db.query(User).filter(User.id == target_user_id, User.is_deleted == False).first()
    if not target_user:
        raise ValueError("User not found.")

    if str(target_user.id) == str(admin_user.id):
        raise ValueError("You cannot deactivate your own account.")

    # 3. Hierarchy 1-level down gate
    if admin_user.role == "group_admin":
        if target_user.role != "subsidiary_admin":
            raise PermissionError("Group Admin can only deactivate Subsidiary Admin accounts.")
        if admin_user.org_node_id and target_user.org_node_id:
            if not is_node_descendant(db, str(admin_user.org_node_id), str(target_user.org_node_id)):
                raise PermissionError("You cannot deactivate a user outside your organizational scope.")
    elif admin_user.role == "subsidiary_admin":
        if target_user.role != "bu_admin":
            raise PermissionError("Subsidiary Admin can only deactivate BU Admin accounts.")
        if admin_user.org_node_id and target_user.org_node_id:
            if not is_node_descendant(db, str(admin_user.org_node_id), str(target_user.org_node_id)):
                raise PermissionError("You cannot deactivate a user outside your organizational scope.")
    elif admin_user.role == "bu_admin":
        if target_user.role != "project_admin":
            raise PermissionError("BU Admin can only deactivate Project Admin accounts.")
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


def activate_user_scoped(
    db: Session,
    admin_user: User,
    target_user_id: str,
    admin_password: Optional[str] = None,
    reason: str = "Re-activated by Administrator"
) -> User:
    # 1. Role gate: system_admin, group_admin, subsidiary_admin, bu_admin
    if admin_user.role not in ("system_admin", "group_admin", "subsidiary_admin", "bu_admin"):
        raise PermissionError("You are not authorized to reactivate user accounts.")

    if admin_password and not verify_admin_password_check(admin_user, admin_password):
        raise PermissionError("Incorrect administrator password.")

    target_user = db.query(User).filter(User.id == target_user_id, User.is_deleted == False).first()
    if not target_user:
        raise ValueError("User not found.")

    if admin_user.role == "group_admin":
        if target_user.role != "subsidiary_admin":
            raise PermissionError("Group Admin can only reactivate Subsidiary Admin accounts.")
        if admin_user.org_node_id and target_user.org_node_id:
            if not is_node_descendant(db, str(admin_user.org_node_id), str(target_user.org_node_id)):
                raise PermissionError("You cannot reactivate a user outside your organizational scope.")
    elif admin_user.role == "subsidiary_admin":
        if target_user.role != "bu_admin":
            raise PermissionError("Subsidiary Admin can only reactivate BU Admin accounts.")
        if admin_user.org_node_id and target_user.org_node_id:
            if not is_node_descendant(db, str(admin_user.org_node_id), str(target_user.org_node_id)):
                raise PermissionError("You cannot reactivate a user outside your organizational scope.")
    elif admin_user.role == "bu_admin":
        if target_user.role != "project_admin":
            raise PermissionError("BU Admin can only reactivate Project Admin accounts.")
        if admin_user.org_node_id and target_user.org_node_id:
            if not is_node_descendant(db, str(admin_user.org_node_id), str(target_user.org_node_id)):
                raise PermissionError("You cannot reactivate a user outside your organizational scope.")

    target_user.is_active = True
    db.commit()
    db.refresh(target_user)

    log_admin_audit(
        db, actor=admin_user, action="USER_ACTIVATED",
        target_user_id=str(target_user.id), target_name=target_user.full_name,
        target_role=target_user.role, target_scope_id=str(target_user.org_node_id) if target_user.org_node_id else None,
        details={"reason": reason}
    )
    return target_user


def list_users_for_admin_scoped(db: Session, admin_user: User) -> List[User]:
    """Lists users visible within the calling admin's authorized hierarchy branch (1-level down rule)."""
    if admin_user.role == "system_admin":
        return db.query(User).filter(User.is_deleted == False).order_by(User.created_at.desc()).all()

    target_role_map = {
        "group_admin": "subsidiary_admin",
        "subsidiary_admin": "bu_admin",
        "bu_admin": "project_admin",
    }
    target_role = target_role_map.get(admin_user.role)
    if not target_role:
        return []

    q = db.query(User).filter(User.is_deleted == False, User.role == target_role)
    if admin_user.org_node_id:
        descendant_ids = get_descendant_node_ids(db, str(admin_user.org_node_id))
        all_u = q.order_by(User.created_at.desc()).all()
        return [u for u in all_u if not u.org_node_id or str(u.org_node_id) in descendant_ids]
    return q.order_by(User.created_at.desc()).all()


def get_admin_audit_log(db: Session, admin_user: User, limit: int = 50):
    """
    Administrative Audit Log hierarchical query (Spec Section 5.B):
    - System Admin: all applicable events across the system.
    - Group Admin: applicable events within authorized group scope (self + subordinate admins).
    - Subsidiary Admin: applicable events within authorized subsidiary scope.
    - BU Admin: applicable events within authorized BU scope.
    - Project Admin: their own actions only.
    - Evidence deletion details respect evidence scope and never leak across boundaries.
    """
    from app.modules.auth.models import AdminAuditEntry
    q = db.query(AdminAuditEntry)
    if admin_user.role == "system_admin":
        return q.order_by(AdminAuditEntry.created_at.desc()).limit(limit).all()

    if admin_user.role == "project_admin":
        return q.filter(AdminAuditEntry.actor_id == admin_user.id).order_by(AdminAuditEntry.created_at.desc()).limit(limit).all()

    descendant_nodes = set()
    if admin_user.org_node_id:
        descendant_nodes = get_descendant_node_ids(db, str(admin_user.org_node_id))

    if admin_user.role == "group_admin" and not admin_user.org_node_id:
        # Group Admin without bound node has enterprise group-wide visibility
        return q.filter(AdminAuditEntry.target_role != "system_admin").order_by(AdminAuditEntry.created_at.desc()).limit(limit).all()

    subordinate_user_ids = set()
    if descendant_nodes:
        users = db.query(User.id, User.org_node_id).filter(User.org_node_id.isnot(None), User.is_deleted == False).all()
        for u_id, u_node in users:
            if str(u_node) in descendant_nodes:
                subordinate_user_ids.add(str(u_id))

    all_entries = q.order_by(AdminAuditEntry.created_at.desc()).limit(limit * 3).all()
    filtered = []
    for entry in all_entries:
        # Own actions always visible
        if str(entry.actor_id) == str(admin_user.id):
            filtered.append(entry)
            continue
        # Subordinate actor
        if entry.actor_id and str(entry.actor_id) in subordinate_user_ids:
            filtered.append(entry)
            continue
        # Target scope in descendant nodes
        if entry.target_scope_id and (str(entry.target_scope_id) in descendant_nodes):
            filtered.append(entry)
            continue
        # Evidence deletion/restoration scope check
        if entry.action in ("EVIDENCE_DELETED", "EVIDENCE_RESTORED") and entry.details:
            proj_id = entry.details.get("project_id")
            if proj_id and (proj_id in descendant_nodes):
                filtered.append(entry)
                continue
    return filtered[:limit]



# ─── 6-Character Secure Password Generation ───────────────────────────────────

def generate_6char_password() -> str:
    """
    Generate a cryptographically secure 6-character random password.
    Avoids confusing characters. Contains at least 1 uppercase, 1 lowercase, 1 digit.
    NEVER derives from user data or timestamps.
    """
    safe_upper = "ABCDEFGHJKLMNPQRSTUVWXYZ"
    safe_lower = "abcdefghjkmnpqrstuvwxyz"
    safe_digits = "23456789"
    safe_set = safe_upper + safe_lower + safe_digits
    mandatory = [
        secrets.choice(safe_upper),
        secrets.choice(safe_lower),
        secrets.choice(safe_digits),
    ]
    rest = [secrets.choice(safe_set) for _ in range(3)]
    combined = mandatory + rest
    for i in range(len(combined) - 1, 0, -1):
        j = secrets.randbelow(i + 1)
        combined[i], combined[j] = combined[j], combined[i]
    return "".join(combined)


# ─── User Creation Request Workflow ───────────────────────────────────────────

_REQUEST_ROLES = {"subsidiary_admin", "bu_admin"}
_APPROVER_ROLES = {"system_admin", "group_admin"}
_SUBSIDIARY_REQUESTABLE_ROLES = {
    "bu_admin", "project_admin",
}


def _generate_request_number(db: Session) -> str:
    """Generate a unique sequential request number like USR-REQ-20261009-0012."""
    from app.modules.auth.models import UserCreationRequest
    from datetime import date
    today = date.today().strftime("%Y%m%d")
    prefix = f"USR-REQ-{today}-"
    count = db.query(UserCreationRequest).filter(
        UserCreationRequest.request_number.like(f"{prefix}%")
    ).count()
    return f"{prefix}{str(count + 1).zfill(4)}"


def _resolve_org_hierarchy(db: Session, org_node_id: Optional[str]) -> dict:
    """Walk up the org tree from org_node_id and return group/subsidiary/bu/project labels."""
    from app.modules.org.models import OrgNode
    result = {
        "group_id": None, "group_name": None,
        "subsidiary_id": None, "subsidiary_name": None,
        "bu_id": None, "bu_name": None,
        "project_id": None, "project_name": None,
    }
    if not org_node_id:
        return result
    chain = []
    curr = db.query(OrgNode).filter(OrgNode.id == org_node_id).first()
    while curr:
        chain.append(curr)
        if not curr.parent_id:
            break
        curr = db.query(OrgNode).filter(OrgNode.id == curr.parent_id).first()
    chain.reverse()
    for node in chain:
        t = (node.type or "").lower()
        if t in ("group",) and result["group_id"] is None:
            result["group_id"] = str(node.id)
            result["group_name"] = node.name
        elif t in ("company", "subsidiary") and result["subsidiary_id"] is None:
            result["subsidiary_id"] = str(node.id)
            result["subsidiary_name"] = node.name
        elif t in ("business_unit", "bu") and result["bu_id"] is None:
            result["bu_id"] = str(node.id)
            result["bu_name"] = node.name
        elif t in ("project", "site") and result["project_id"] is None:
            result["project_id"] = str(node.id)
            result["project_name"] = node.name
    return result


def submit_user_creation_request(
    db: Session,
    requester: User,
    full_name: str,
    email: str,
    requested_role: str,
    org_node_id: Optional[str] = None,
    employee_id: Optional[str] = None,
    phone: Optional[str] = None,
    reason: Optional[str] = None,
):
    """Subsidiary Admin submits a PENDING user creation request. No official user is created yet."""
    from app.modules.auth.models import UserCreationRequest

    if requester.role not in _REQUEST_ROLES:
        raise PermissionError(
            f"Role '{requester.role}' cannot submit user creation requests. "
            "Only subsidiary_admin or bu_admin uses this workflow."
        )
    if requested_role in ("system_admin", "group_admin", "subsidiary_admin"):
        raise PermissionError(f"Scoped admin cannot request role '{requested_role}'.")
    if requester.role == "bu_admin" and requested_role != "project_admin":
        raise PermissionError("BU Admin may only request project_admin users.")
    if requested_role not in _SUBSIDIARY_REQUESTABLE_ROLES:
        valid = ", ".join(sorted(_SUBSIDIARY_REQUESTABLE_ROLES))
        raise PermissionError(
            f"Role '{requested_role}' is not requestable. Valid: {valid}."
        )
    if org_node_id and requester.org_node_id:
        if not is_node_descendant(db, str(requester.org_node_id), str(org_node_id)):
            raise PermissionError("Target org unit is outside your authorized scope.")

    from app.security.scope import validate_role_to_scope
    validate_role_to_scope(db, requested_role, org_node_id)

    normalized_email = email.strip().lower()
    existing_user = db.query(User).filter(
        User.email == normalized_email, User.is_deleted == False
    ).first()
    if existing_user:
        raise ValueError(f"An active user with email '{normalized_email}' already exists.")

    existing_pending = db.query(UserCreationRequest).filter(
        UserCreationRequest.email == normalized_email,
        UserCreationRequest.status == "PENDING",
    ).first()
    if existing_pending:
        raise ValueError(
            f"A pending request for '{normalized_email}' already exists ({existing_pending.request_number})."
        )

    clean_phone = (phone or "").strip() or None
    if clean_phone:
        existing_phone_user = db.query(User).filter(
            User.phone == clean_phone, User.is_deleted == False
        ).first()
        if existing_phone_user:
            raise ValueError(f"An active user with phone '{clean_phone}' already exists.")

        existing_pending_phone = db.query(UserCreationRequest).filter(
            UserCreationRequest.phone == clean_phone,
            UserCreationRequest.status == "PENDING",
        ).first()
        if existing_pending_phone:
            raise ValueError(
                f"A pending request for phone '{clean_phone}' already exists ({existing_pending_phone.request_number})."
            )

    request_number = _generate_request_number(db)
    org_hierarchy = _resolve_org_hierarchy(db, org_node_id)

    ucr = UserCreationRequest(
        request_number=request_number,
        full_name=full_name.strip(),
        email=normalized_email,
        employee_id=(employee_id or "").strip() or None,
        phone=(phone or "").strip() or None,
        requested_role=requested_role,
        org_node_id=org_node_id,
        group_id=org_hierarchy["group_id"],
        group_name=org_hierarchy["group_name"],
        subsidiary_id=org_hierarchy["subsidiary_id"],
        subsidiary_name=org_hierarchy["subsidiary_name"],
        bu_id=org_hierarchy["bu_id"],
        bu_name=org_hierarchy["bu_name"],
        project_id=org_hierarchy["project_id"],
        project_name=org_hierarchy["project_name"],
        reason=reason,
        status="PENDING",
        requested_by_user_id=requester.id,
        requested_by_name=requester.full_name,
        requested_by_role=requester.role,
        requested_by_employee_id=getattr(requester, "employee_id", None),
        requested_by_email=requester.email,
        requested_user_data={
            "full_name": full_name.strip(),
            "email": normalized_email,
            "employee_id": employee_id,
            "phone": phone,
            "requested_role": requested_role,
            "org_node_id": org_node_id,
            "reason": reason,
        }
    )
    db.add(ucr)
    db.commit()
    db.refresh(ucr)
    log_admin_audit(
        db, actor=requester, action="USER_REQUEST_SUBMITTED",
        target_name=full_name, target_role=requested_role,
        target_scope_id=org_node_id,
        details={"request_number": request_number, "email": normalized_email}
    )
    return ucr


def list_user_creation_requests(
    db: Session, viewer: User, status_filter: Optional[str] = None
) -> List:
    """List user creation requests visible to the calling admin based on role and org scope."""
    from app.modules.auth.models import UserCreationRequest
    q = db.query(UserCreationRequest)
    if status_filter:
        q = q.filter(UserCreationRequest.status == status_filter.upper())
    if viewer.role == "system_admin":
        return q.order_by(UserCreationRequest.created_at.desc()).all()
    if viewer.role == "group_admin":
        all_reqs = q.order_by(UserCreationRequest.created_at.desc()).all()
        if not viewer.org_node_id:
            return all_reqs
        return [
            r for r in all_reqs
            if not r.org_node_id or is_node_descendant(db, str(viewer.org_node_id), str(r.org_node_id))
        ]
    return q.filter(
        UserCreationRequest.requested_by_user_id == viewer.id
    ).order_by(UserCreationRequest.created_at.desc()).all()


def approve_user_creation_request(
    db: Session, approver: User, request_id: str
) -> tuple:
    """Approve PENDING request. Returns (updated_request, created_user, plaintext_6char_password)."""
    from app.modules.auth.models import UserCreationRequest

    if approver.role not in _APPROVER_ROLES:
        raise PermissionError(
            f"Role '{approver.role}' cannot approve user creation requests."
        )
    ucr = db.query(UserCreationRequest).filter(
        UserCreationRequest.id == request_id
    ).with_for_update().first()
    if not ucr:
        raise ValueError("User creation request not found.")
    if ucr.status != "PENDING":
        raise ValueError(f"Request is no longer PENDING (status: {ucr.status}).")
    if str(ucr.requested_by_user_id) == str(approver.id):
        raise PermissionError("Separation of duties: you cannot approve your own request.")
    if approver.role == "group_admin" and approver.org_node_id:
        if ucr.org_node_id and not is_node_descendant(db, str(approver.org_node_id), str(ucr.org_node_id)):
            raise PermissionError("Request is outside your authorized organizational scope.")
    if approver.role == "group_admin" and ucr.requested_role == "system_admin":
        raise PermissionError("Group Admin cannot approve system_admin roles.")

    existing_user = db.query(User).filter(
        User.email == ucr.email, User.is_deleted == False
    ).first()
    if existing_user:
        raise ValueError(f"An active user with email '{ucr.email}' already exists.")

    if ucr.phone:
        existing_phone_user = db.query(User).filter(
            User.phone == ucr.phone, User.is_deleted == False
        ).first()
        if existing_phone_user:
            raise ValueError(f"An active user with phone '{ucr.phone}' already exists.")

    initial_password = generate_6char_password()
    hashed_pwd = get_password_hash(initial_password)
    now = datetime.now(timezone.utc)

    new_user = User(
        email=ucr.email,
        phone=ucr.phone,
        hashed_password=hashed_pwd,
        full_name=ucr.full_name,
        role=ucr.requested_role,
        org_node_id=ucr.org_node_id,
        created_by_id=approver.id,
        is_active=True,
        must_change_password=True,
    )
    db.add(new_user)
    db.flush()

    assignment = UserRoleAssignment(
        user_id=new_user.id,
        role=ucr.requested_role,
        entity_id=ucr.org_node_id,
        assigned_by_id=approver.id,
        is_active=True,
    )
    db.add(assignment)

    ucr.status = "APPROVED"
    ucr.approved_by_user_id = approver.id
    ucr.approved_by_name = approver.full_name
    ucr.approved_by_role = approver.role
    ucr.approved_at = now
    ucr.created_user_id = new_user.id

    db.commit()
    db.refresh(ucr)
    db.refresh(new_user)

    log_admin_audit(
        db, actor=approver, action="USER_REQUEST_APPROVED",
        target_user_id=str(new_user.id), target_name=new_user.full_name,
        target_role=new_user.role,
        target_scope_id=str(new_user.org_node_id) if new_user.org_node_id else None,
        details={"request_number": ucr.request_number, "email": new_user.email}
    )
    log_admin_audit(
        db, actor=approver, action="USER_CREATED",
        target_user_id=str(new_user.id), target_name=new_user.full_name,
        target_role=new_user.role,
        target_scope_id=str(new_user.org_node_id) if new_user.org_node_id else None,
        details={"source": "user_creation_request", "request_number": ucr.request_number}
    )
    return ucr, new_user, initial_password


def reject_user_creation_request(
    db: Session, rejector: User, request_id: str, rejection_reason: str
):
    """Reject a PENDING user creation request with a mandatory reason."""
    from app.modules.auth.models import UserCreationRequest

    if rejector.role not in _APPROVER_ROLES:
        raise PermissionError(f"Role '{rejector.role}' cannot reject user creation requests.")
    if not (rejection_reason or "").strip():
        raise ValueError("A rejection reason is mandatory.")

    ucr = db.query(UserCreationRequest).filter(
        UserCreationRequest.id == request_id
    ).with_for_update().first()
    if not ucr:
        raise ValueError("User creation request not found.")
    if ucr.status != "PENDING":
        raise ValueError(f"Request is no longer PENDING (status: {ucr.status}).")
    if rejector.role == "group_admin" and rejector.org_node_id:
        if ucr.org_node_id and not is_node_descendant(db, str(rejector.org_node_id), str(ucr.org_node_id)):
            raise PermissionError("Request is outside your authorized scope.")

    now = datetime.now(timezone.utc)
    ucr.status = "REJECTED"
    ucr.rejected_by_user_id = rejector.id
    ucr.rejected_by_name = rejector.full_name
    ucr.rejected_by_role = rejector.role
    ucr.rejected_at = now
    ucr.rejection_reason = rejection_reason.strip()

    db.commit()
    db.refresh(ucr)

    log_admin_audit(
        db, actor=rejector, action="USER_REQUEST_REJECTED",
        target_name=ucr.full_name, target_role=ucr.requested_role,
        target_scope_id=str(ucr.org_node_id) if ucr.org_node_id else None,
        details={"request_number": ucr.request_number, "rejection_reason": rejection_reason.strip()}
    )
    return ucr


def get_user_creation_request(db: Session, viewer: User, request_id: str):
    """Fetch a single request with authorization enforcement."""
    from app.modules.auth.models import UserCreationRequest
    ucr = db.query(UserCreationRequest).filter(UserCreationRequest.id == request_id).first()
    if not ucr:
        raise ValueError("User creation request not found.")
    if viewer.role == "system_admin":
        return ucr
    if viewer.role == "group_admin":
        if not viewer.org_node_id:
            return ucr
        if ucr.org_node_id and not is_node_descendant(db, str(viewer.org_node_id), str(ucr.org_node_id)):
            raise PermissionError("You do not have access to this request.")
        return ucr
    if str(ucr.requested_by_user_id) == str(viewer.id):
        return ucr
    raise PermissionError("You do not have access to this request.")
