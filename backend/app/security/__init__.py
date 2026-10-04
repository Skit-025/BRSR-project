"""
app/security/__init__.py
Security layer public API — re-export the most used symbols.
"""
from app.security.deps import (
    get_current_user,
    get_optional_user,
    require_roles,
    require_permission,
    CurrentUser,
    OptionalCurrentUser,
    TokenData,
)
from app.security.rbac import Role, Permission, has_permission
from app.security.sod import (
    enforce_maker_checker,
    assert_can_submit,
    assert_can_review,
    assert_can_lock_period,
    assert_can_run_consolidation,
    assert_can_compile_report,
)
from app.security.jwt import (
    create_access_token,
    create_refresh_token,
    decode_access_token,
    decode_refresh_token,
)
from app.security.passwords import get_password_hash, verify_password
from app.security.rate_limit import (
    auth_rate_limit,
    upload_rate_limit,
    api_rate_limit,
    ai_rate_limit,
)

__all__ = [
    "get_current_user", "get_optional_user", "require_roles", "require_permission",
    "CurrentUser", "OptionalCurrentUser", "TokenData",
    "Role", "Permission", "has_permission",
    "enforce_maker_checker", "assert_can_submit", "assert_can_review",
    "assert_can_lock_period", "assert_can_run_consolidation", "assert_can_compile_report",
    "create_access_token", "create_refresh_token",
    "decode_access_token", "decode_refresh_token",
    "get_password_hash", "verify_password",
    "auth_rate_limit", "upload_rate_limit", "api_rate_limit", "ai_rate_limit",
]
