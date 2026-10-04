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


def delete_user_by_admin(db: Session, admin_user: User, user_id: str) -> None:
    """
    Sole method to delete a user. System Admin soft-deletes and revokes all active role assignments.
    """
    if admin_user.role != Role.SYSTEM_ADMIN.value:
        raise PermissionError("Only System Admin is authorized to delete users.")

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
