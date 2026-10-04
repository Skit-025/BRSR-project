"""
app/security/jwt.py
JWT token creation and verification utilities.
Wraps python-jose; all token operations go through this module.
"""
from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import jwt, JWTError
from app.config.settings import settings


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def create_access_token(
    subject: str,
    role: str,
    org_node_id: Optional[str] = None,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """
    Create a signed JWT access token.

    Args:
        subject:     User ID (str UUID) → stored in 'sub' claim.
        role:        User role string → stored in 'role' claim.
        org_node_id: Scoped org node, stored in 'org' claim.
        expires_delta: Override the default expiry window.

    Returns:
        Encoded JWT string.
    """
    expire = _utcnow() + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    payload = {
        "sub":  str(subject),
        "role": role,
        "org":  str(org_node_id) if org_node_id else None,
        "exp":  expire,
        "iat":  _utcnow(),
        "type": "access",
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(subject: str) -> str:
    """Create a long-lived refresh token (type='refresh')."""
    expire = _utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    payload = {
        "sub":  str(subject),
        "exp":  expire,
        "iat":  _utcnow(),
        "type": "refresh",
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> Optional[dict]:
    """
    Decode and validate a JWT access token.

    Returns:
        Decoded payload dict on success, None on any failure.
    """
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
        if payload.get("type") != "access":
            return None
        return payload
    except JWTError:
        return None


def decode_refresh_token(token: str) -> Optional[str]:
    """
    Decode a refresh token and return the subject (user_id) or None.
    """
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
        if payload.get("type") != "refresh":
            return None
        return payload.get("sub")
    except JWTError:
        return None
