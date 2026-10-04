"""
app/security/passwords.py
Centralised password hashing utilities used by auth and security layers.
Uses passlib with bcrypt as the primary scheme.
"""
from passlib.context import CryptContext

# Primary scheme: bcrypt; fallback: pbkdf2_sha256 for legacy hashes
pwd_context = CryptContext(schemes=["bcrypt", "pbkdf2_sha256"], deprecated="auto")


def get_password_hash(password: str) -> str:
    """Return a bcrypt-hashed version of `password`."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify `plain_password` against a stored `hashed_password`."""
    return pwd_context.verify(plain_password, hashed_password)


def is_strong_password(password: str) -> bool:
    """
    Enforce minimum password policy:
    - At least 8 characters
    - At least one uppercase letter
    - At least one digit
    """
    if len(password) < 8:
        return False
    if not any(c.isupper() for c in password):
        return False
    if not any(c.isdigit() for c in password):
        return False
    return True
