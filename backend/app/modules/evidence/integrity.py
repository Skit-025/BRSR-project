import hashlib
from typing import Optional

def compute_sha256(data: bytes) -> str:
    """Computes the lowercase hexadecimal SHA-256 hash of byte contents."""
    hasher = hashlib.sha256()
    hasher.update(data)
    return hasher.hexdigest().lower()

def verify_sha256(data: bytes, expected_sha256: str) -> bool:
    """
    Verifies that the provided SHA-256 matches the cryptographic hash of the content.
    Returns True if valid, False otherwise.
    """
    actual = compute_sha256(data)
    return actual == expected_sha256.strip().lower()
