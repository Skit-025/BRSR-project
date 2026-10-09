"""
app/services/firebase_auth_service.py
Local Authentication & Account Token Service (Replaces Firebase for Local Environment).
Provides:
1. Fast, local user account token & ID generation (no Firebase dependency).
2. Cryptographically secure password-setup / onboarding link generation.
3. 100% offline & local compatibility.
"""
import logging
import hashlib
from typing import Optional, Tuple
from urllib.parse import quote

from app.config.settings import settings

logger = logging.getLogger("aarohan.auth_local")


def get_firebase_auth():
    """
    Firebase is deactivated for the local application in favor of local SMTP & auth tokens.
    Returns None to ensure fully local operation.
    """
    return None


def reconcile_or_create_firebase_user(email: str, full_name: str) -> Tuple[str, bool]:
    """
    Generates a deterministic local account identifier for the user without Firebase.
    Returns: (account_uid, is_newly_created)
    """
    clean_email = email.lower().strip()
    digest = hashlib.sha256(clean_email.encode("utf-8")).hexdigest()[:24]
    local_uid = f"usr_{digest}"
    logger.info("Local account identity generated for %s (UID: %s)", clean_email, local_uid)
    return local_uid, True


def generate_secure_password_setup_link(
    email: str,
    invitation_token: str,
    redirect_url: Optional[str] = None
) -> str:
    """
    Generates a secure password-setup onboarding link using the application token.
    Never issues plaintext or temporary passwords.
    """
    clean_email = email.lower().strip()
    frontend_base = getattr(settings, "FRONTEND_BASE_URL", "http://localhost:5173").rstrip("/")
    setup_link = f"{frontend_base}/setup-password?token={invitation_token}&email={quote(clean_email)}"
    logger.info("Generated secure application onboarding link for %s", clean_email)
    return setup_link
