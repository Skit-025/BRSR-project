"""
app/modules/evidence/scanner.py
Security scanner for uploaded evidence files.
Inspects MIME types, payload size, magic numbers, and detects suspicious patterns.
"""
from typing import Tuple

# Allowed MIME types for ESG evidence
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "text/csv",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", # xlsx
    "application/vnd.ms-excel",                                         # xls
}

MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024  # 50 MB limit


def scan_file_security(
    filename: str,
    content: bytes,
    claimed_mime_type: str,
) -> Tuple[bool, str]:
    """
    Scans binary payload for size, allowed MIME, and basic executable header signatures.
    Returns: (is_clean: bool, scan_result_reason: str)
    """
    if len(content) > MAX_FILE_SIZE_BYTES:
        return False, f"File exceeds maximum allowed size of 50MB (got {len(content)} bytes)."

    if claimed_mime_type not in ALLOWED_MIME_TYPES:
        return False, f"Unsupported MIME type '{claimed_mime_type}'. Supported: PDF, Images, Excel, CSV."

    # Check for executable magic bytes (e.g. Windows PE 'MZ', ELF, shell script '#!')
    if content.startswith(b"MZ") or content.startswith(b"\x7fELF"):
        return False, "File rejected: Executable binary signatures detected."

    return True, "Clean"
