"""
AI Governance: Prompt Injection Guard
Detects and neutralizes prompt injection attempts in user-submitted text
before it is embedded into LLM prompts.

A prompt injection attack occurs when a user submits document text containing
instructions like "Ignore all previous instructions" designed to hijack
the AI model's behavior.
"""
import re
from typing import Tuple

# Common prompt injection attack patterns
_INJECTION_PATTERNS = [
    r"ignore\s+(all\s+)?(previous|prior|above|earlier)\s+instructions?",
    r"disregard\s+(all\s+)?(previous|prior|above)\s+",
    r"forget\s+(everything|all)\s+(you\s+)?(were\s+)?(told|instructed)",
    r"you\s+are\s+now\s+(?:a|an)\s+",
    r"act\s+as\s+(?:a|an)\s+(?:different|new|evil|unrestricted)",
    r"reveal\s+(your\s+)?(system\s+)?prompt",
    r"print\s+(your\s+)?(system\s+)?instructions",
    r"output\s+(your\s+)?(api\s+)?key",
    r"jailbreak",
    r"dan\s+mode",
]

_COMPILED = [re.compile(p, re.IGNORECASE | re.DOTALL) for p in _INJECTION_PATTERNS]


def scan(text: str) -> Tuple[bool, list]:
    """
    Scans text for prompt injection patterns.
    Returns (is_suspicious: bool, matched_patterns: list).
    """
    matched = []
    for pattern in _COMPILED:
        if pattern.search(text):
            matched.append(pattern.pattern)
    return len(matched) > 0, matched


def sanitize(text: str) -> str:
    """
    Removes or neutralizes detected injection patterns.
    Replaces matched phrases with [REDACTED] to preserve document length.
    """
    result = text
    for pattern in _COMPILED:
        result = pattern.sub("[REDACTED]", result)
    return result


def enforce(text: str) -> str:
    """
    Full enforcement: scan and sanitize in one call.
    Logs a warning if injection was detected.
    """
    import logging
    logger = logging.getLogger(__name__)

    is_suspicious, matched = scan(text)
    if is_suspicious:
        logger.warning(
            f"Prompt injection attempt detected ({len(matched)} pattern(s) matched). "
            f"Content has been sanitized before API submission."
        )
        return sanitize(text)
    return text
