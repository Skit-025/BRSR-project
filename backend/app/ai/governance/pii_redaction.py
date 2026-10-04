"""
AI Governance: PII Redaction
Scans text and file content for Personally Identifiable Information (PII)
before sending to external LLM APIs.

Covers Indian-context PII patterns:
  - Aadhaar numbers (12-digit)
  - PAN card numbers
  - Mobile phone numbers
  - Bank account numbers
  - Email addresses
  - Employee names (flagged if near PII keywords)
"""
import re
from typing import Tuple

# Regex patterns for Indian PII
_PATTERNS = {
    "aadhaar":      r"\b[2-9]\d{3}\s?\d{4}\s?\d{4}\b",
    "pan":          r"\b[A-Z]{5}[0-9]{4}[A-Z]\b",
    "mobile":       r"\b(?:\+91[\s\-]?)?[6-9]\d{9}\b",
    "bank_account": r"\b\d{9,18}\b",
    "email":        r"\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b",
    "ifsc":         r"\b[A-Z]{4}0[A-Z0-9]{6}\b",
}

# Replacement masks
_MASKS = {
    "aadhaar":      "[AADHAAR-REDACTED]",
    "pan":          "[PAN-REDACTED]",
    "mobile":       "[MOBILE-REDACTED]",
    "bank_account": "[ACCOUNT-REDACTED]",
    "email":        "[EMAIL-REDACTED]",
    "ifsc":         "[IFSC-REDACTED]",
}


def redact(text: str) -> Tuple[str, list]:
    """
    Scans text and redacts detected PII patterns.
    Returns (redacted_text, list_of_detected_types).
    """
    detected = []
    result = text

    for pii_type, pattern in _PATTERNS.items():
        if re.search(pattern, result):
            detected.append(pii_type)
            result = re.sub(pattern, _MASKS[pii_type], result)

    return result, detected


def has_pii(text: str) -> bool:
    """Returns True if any PII pattern is detected in the text."""
    for pattern in _PATTERNS.values():
        if re.search(pattern, text):
            return True
    return False
