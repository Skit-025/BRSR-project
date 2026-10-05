"""
app/modules/auth/router.py
Authentication & Provisioning Router.
Enforces the mandatory architecture: System Admin is the SOLE authority for user creation/deletion.
All logins return JWT access and refresh tokens.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.auth.models import User, UserRoleAssignment
from app.modules.auth.schemas import (
    UserLogin,
    UserRead,
    UserProvisionRequest,
    UserProvisionResponse,
    UserRoleAssignmentRead,
    ChangePasswordRequest,
    RefreshTokenRequest,
    TokenResponse,
    BootstrapAdminRequest,
    AdminDeleteUserRequest,
)
from app.modules.auth.service import (
    authenticate_user,
    provision_user_by_admin,
    delete_user_by_admin,
    change_user_password,
    refresh_access_token,
    bootstrap_system_admin,
)
from app.security.jwt import create_access_token, create_refresh_token, decode_access_token
from app.security.rbac import Role
from app.security.rate_limit import auth_rate_limit

router = APIRouter(prefix="/auth", tags=["Authentication & Access Governance"])
security = HTTPBearer()


def get_current_active_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Dependency ensuring caller has valid Bearer token and active user record."""
    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == user_id, User.is_deleted == False).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is deactivated or not found."
        )
    return user


def require_system_admin(
    current_user: User = Depends(get_current_active_user)
) -> User:
    """Strict authorization gate: ONLY system_admin role is permitted."""
    if current_user.role != Role.SYSTEM_ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied. Only '{Role.SYSTEM_ADMIN.value}' can perform this operation."
        )
    return current_user


# ── Public / Auth Endpoints ──────────────────────────────────────────

@router.post("/login", response_model=TokenResponse, dependencies=[Depends(auth_rate_limit)])
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    """
    Authenticates user credentials and returns JWT access + refresh tokens.
    Protected by anti-brute-force rate limiting.
    """
    identifier = login_data.username or login_data.email
    if not identifier:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Employee ID or Email is required."
        )
    user = authenticate_user(db, identifier, login_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/employee ID or password.",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    access_token = create_access_token(
        subject=user.id,
        role=user.role,
        org_node_id=user.org_node_id
    )
    refresh_tok = create_refresh_token(subject=user.id)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_tok,
        token_type="bearer",
        user=UserRead.model_validate(user)
    )


@router.post("/refresh", response_model=TokenResponse)
def refresh_token(req: RefreshTokenRequest, db: Session = Depends(get_db)):
    """Exchange a valid refresh token for a newly signed access token."""
    try:
        new_token, user = refresh_access_token(db, req.refresh_token)
        return TokenResponse(
            access_token=new_token,
            refresh_token=req.refresh_token,
            token_type="bearer",
            user=UserRead.model_validate(user)
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))


@router.post("/change-password", response_model=UserRead)
def change_password(
    req: ChangePasswordRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Allows authenticated employee to change their password on first login or rotation."""
    try:
        updated = change_user_password(db, current_user, req)
        return updated
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/me", response_model=UserRead)
def read_current_user(current_user: User = Depends(get_current_active_user)):
    """Returns the authenticated user's profile and active permanent role."""
    return current_user


@router.post("/bootstrap-system-admin", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def bootstrap_admin(req: BootstrapAdminRequest, db: Session = Depends(get_db)):
    """
    One-time bootstrap for the primary System Admin.
    Blocked once any System Admin account exists in the database.
    """
    try:
        admin = bootstrap_system_admin(db, req)
        return admin
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# ── System Admin User Provisioning & Deletion (Sole Authority) ───────

@router.post(
    "/admin/users",
    response_model=UserProvisionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Provision a new employee user account (System Admin ONLY)"
)
def admin_provision_user(
    req: UserProvisionRequest,
    admin_user: User = Depends(require_system_admin),
    db: Session = Depends(get_db)
):
    """
    System Admin creates an employee account and assigns permanent role & entity scope.
    Returns the initial credentials to hand directly to the employee.
    """
    try:
        user, initial_password = provision_user_by_admin(db, admin_user, req)
        return UserProvisionResponse(
            id=str(user.id),
            email=user.email,
            full_name=user.full_name,
            role=user.role,
            org_node_id=str(user.org_node_id) if user.org_node_id else None,
            initial_password=initial_password,
            message="User created with permanent role. Share these credentials with the employee."
        )
    except (ValueError, PermissionError) as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get(
    "/admin/users",
    response_model=List[UserRead],
    summary="List all active user accounts (System Admin ONLY)"
)
def admin_list_users(
    admin_user: User = Depends(require_system_admin),
    db: Session = Depends(get_db)
):
    """System Admin reviews all users across MEIL Group and subsidiaries."""
    users = db.query(User).filter(User.is_deleted == False).order_by(User.created_at.desc()).all()
    return users


@router.post(
    "/admin/users/{user_id}/delete",
    status_code=status.HTTP_200_OK,
    summary="Delete / deactivate a user account with admin password verification (System Admin ONLY)"
)
def admin_delete_user_post(
    user_id: str,
    payload: AdminDeleteUserRequest,
    admin_user: User = Depends(require_system_admin),
    db: Session = Depends(get_db)
):
    """
    System Admin deletes a user account after verifying their administrator password.
    """
    try:
        delete_user_by_admin(db, admin_user, user_id, admin_password=payload.admin_password)
        return {"status": "success", "message": f"User {user_id} successfully deleted."}
    except (ValueError, PermissionError) as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete(
    "/admin/users/{user_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete / deactivate a user account (System Admin ONLY)"
)
def admin_delete_user(
    user_id: str,
    admin_password: Optional[str] = None,
    admin_user: User = Depends(require_system_admin),
    db: Session = Depends(get_db)
):
    """
    System Admin deletes a user account with admin password verification.
    """
    try:
        delete_user_by_admin(db, admin_user, user_id, admin_password=admin_password)
        return {"status": "success", "message": f"User {user_id} successfully deleted."}
    except (ValueError, PermissionError) as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

