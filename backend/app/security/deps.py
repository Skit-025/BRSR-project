"""
app/security/deps.py
FastAPI dependency functions for authentication and authorization.

Usage:
    @router.get("/sensitive")
    def sensitive_endpoint(user: CurrentUser = Depends(get_current_user)):
        ...

    @router.post("/admin-only")
    def admin_endpoint(user: CurrentUser = Depends(require_roles("system_admin", "group_admin"))):
        ...
"""
from typing import Optional, Annotated
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.security.jwt import decode_access_token
from app.security.rbac import Role, Permission, has_permission

# OAuth2-compatible Bearer extractor
_bearer = HTTPBearer(auto_error=False)


# ── Token payload dataclass ──────────────────────────────────────
class TokenData:
    def __init__(self, user_id: str, role: str, org_node_id: Optional[str]):
        self.user_id     = user_id
        self.role        = role
        self.org_node_id = org_node_id


# ── Core dependency ──────────────────────────────────────────────
def get_current_user(
    credentials: Annotated[Optional[HTTPAuthorizationCredentials], Depends(_bearer)],
    db: Session = Depends(get_db),
) -> TokenData:
    """
    Extract and validate the JWT Bearer token from Authorization header.
    Returns a TokenData with user_id, role, org_node_id.
    Raises HTTP 401 on missing/invalid/expired token.
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated. Provide 'Authorization: Bearer <token>'.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(credentials.credentials)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Lazy DB lookup omitted for performance (stateless JWT);
    # add db.query(User) here if revocation list is needed.
    return TokenData(
        user_id     = payload["sub"],
        role        = payload.get("role", "project_admin"),
        org_node_id = payload.get("org"),
    )


# ── Optional current user (for public+auth mixed endpoints) ──────
def get_optional_user(
    credentials: Annotated[Optional[HTTPAuthorizationCredentials], Depends(_bearer)],
) -> Optional[TokenData]:
    if credentials is None:
        return None
    payload = decode_access_token(credentials.credentials)
    if payload is None:
        return None
    return TokenData(
        user_id     = payload["sub"],
        role        = payload.get("role", "project_admin"),
        org_node_id = payload.get("org"),
    )


# ── Role-gating factory ──────────────────────────────────────────
def require_roles(*allowed_roles: str):
    """
    Factory that returns a FastAPI dependency enforcing role membership.

    Example:
        @router.post("/lock")
        def lock(user = Depends(require_roles("system_admin", "group_admin"))):
            ...
    """
    def _check(user: TokenData = Depends(get_current_user)) -> TokenData:
        if user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{user.role}' is not authorised. Required: {list(allowed_roles)}",
            )
        return user
    return _check


# ── Permission-gating factory ────────────────────────────────────
def require_permission(permission: Permission):
    """
    Factory that returns a dependency enforcing a fine-grained permission.

    Example:
        @router.post("/compile")
        def compile(user = Depends(require_permission(Permission.REPORT_COMPILE))):
            ...
    """
    def _check(user: TokenData = Depends(get_current_user)) -> TokenData:
        if not has_permission(user.role, permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission '{permission.value}' required.",
            )
        return user
    return _check


# ── Convenience type aliases ─────────────────────────────────────
CurrentUser         = Annotated[TokenData, Depends(get_current_user)]
OptionalCurrentUser = Annotated[Optional[TokenData], Depends(get_optional_user)]
