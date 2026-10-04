"""
app/core/hashing.py
Cryptographic hashing utilities used across Evidence Vault and Reporting seals.
All hashes use SHA-256 (FIPS 180-4 compliant).
"""
import hashlib
import json
from pathlib import Path
from typing import Any, Union


HASH_ALGO = "sha256"


def sha256_bytes(data: bytes) -> str:
    """Compute SHA-256 of raw bytes. Returns hex digest string."""
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Union[str, Path]) -> str:
    """
    Stream-hash a file at `path` using SHA-256.
    Memory-efficient: reads in 64 KB chunks.
    """
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def sha256_file_object(file_obj) -> str:
    """
    Hash an open file-like object (e.g. UploadFile.file) in place.
    Rewinds to position 0 before hashing and leaves pointer at 0 after.
    """
    file_obj.seek(0)
    h = hashlib.sha256()
    for chunk in iter(lambda: file_obj.read(65536), b""):
        h.update(chunk)
    file_obj.seek(0)
    return h.hexdigest()


def sha256_json(obj: Any) -> str:
    """
    Deterministically hash a JSON-serialisable Python object.
    Keys are sorted for canonical form; ensures reproducible hashes.
    """
    canonical = json.dumps(obj, sort_keys=True, ensure_ascii=True, default=str)
    return sha256_bytes(canonical.encode("utf-8"))


def sha256_string(text: str) -> str:
    """Hash a UTF-8 string."""
    return sha256_bytes(text.encode("utf-8"))


def verify_hash(data: bytes, expected_hash: str) -> bool:
    """Return True if SHA-256 of `data` matches `expected_hash`."""
    return sha256_bytes(data) == expected_hash.lower()
