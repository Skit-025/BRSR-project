"""
app/security/jwt.py
JWT token creation and verification utilities.
Wraps python-jose; all token operations go through this module.
"""
from datetime import datetime, timedelta, timezone
from typing import Optional
import uuid
from jose import jwt, JWTError
from app.config.settings import settings

# Ephemeral server boot instance ID: generated once when backend process starts.
# If backend is closed, restarted, or broken, this ID changes, immediately
# invalidating all JWT tokens issued during any previous server session.
SERVER_BOOT_ID: str = uuid.uuid4().hex


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
        "sub":     str(subject),
        "role":    role,
        "org":     str(org_node_id) if org_node_id else None,
        "exp":     expire,
        "iat":     _utcnow(),
        "type":    "access",
        "boot_id": SERVER_BOOT_ID,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(subject: str) -> str:
    """Create a refresh token strictly tied to the 45-minute session window and current server boot."""
    expire = _utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub":     str(subject),
        "exp":     expire,
        "iat":     _utcnow(),
        "type":    "refresh",
        "boot_id": SERVER_BOOT_ID,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> Optional[dict]:
    """
    Decode and validate a JWT access token.

    Returns:
        Decoded payload dict on success, None on any failure or if issued before server reboot.
    """
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
        if payload.get("type") != "access":
            return None
        if payload.get("boot_id") != SERVER_BOOT_ID:
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
        if payload.get("boot_id") != SERVER_BOOT_ID:
            return None
        return payload.get("sub")
    except JWTError:
        return None
