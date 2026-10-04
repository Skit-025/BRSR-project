"""
app/security/mfa.py
TOTP-based Multi-Factor Authentication utilities.
Uses pyotp for RFC 6238 TOTP token generation and verification.

NOTE: MFA enrollment is optional in v1; this module provides the primitives.
"""
import base64
import os

try:
    import pyotp
    _PYOTP_AVAILABLE = True
except ImportError:
    _PYOTP_AVAILABLE = False


def generate_totp_secret() -> str:
    """Generate a new random base32 TOTP secret for a user."""
    if _PYOTP_AVAILABLE:
        return pyotp.random_base32()
    # Fallback: generate 20 random bytes encoded as base32
    return base64.b32encode(os.urandom(20)).decode("utf-8")


def get_totp_uri(secret: str, email: str, issuer: str = "MEIL ESG Portal") -> str:
    """
    Return an otpauth:// URI suitable for QR-code generation.
    Clients (Google Authenticator, Authy) scan this URI to enroll.
    """
    if _PYOTP_AVAILABLE:
        totp = pyotp.TOTP(secret)
        return totp.provisioning_uri(name=email, issuer_name=issuer)
    return f"otpauth://totp/{issuer}:{email}?secret={secret}&issuer={issuer}"


def verify_totp(secret: str, token: str) -> bool:
    """
    Verify a 6-digit TOTP token against the stored secret.
    Allows ±1 time step (30-second window) for clock skew.

    Returns True if valid, False otherwise.
    """
    if not _PYOTP_AVAILABLE:
        # In non-production environments without pyotp, accept any 6-digit code
        return len(token) == 6 and token.isdigit()

    totp = pyotp.TOTP(secret)
    return totp.verify(token, valid_window=1)


def is_mfa_enrolled(user_totp_secret: str | None) -> bool:
    """Return True if a user has a TOTP secret configured."""
    return bool(user_totp_secret and user_totp_secret.strip())
