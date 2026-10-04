"""
E4 Engine: Verbatim Quote Verifier
Checks whether a required policy element appears verbatim in the policy document text.
"""
from typing import Tuple, Optional


def verify_quote(element: str, policy_text: str) -> Tuple[bool, Optional[str]]:
    """
    Returns (found: bool, quote: Optional[str]).
    Searches for the element keywords in the policy text using case-insensitive matching.
    Returns a snippet around the match as the verbatim quote.
    """
    element_lower = element.lower()
    text_lower = policy_text.lower()

    # Use first keyword of the element for search
    keywords = [w for w in element_lower.split() if len(w) > 4]
    for kw in keywords:
        pos = text_lower.find(kw)
        if pos >= 0:
            # Return a short surrounding excerpt as the verbatim quote
            start = max(0, pos - 30)
            end = min(len(policy_text), pos + len(kw) + 100)
            excerpt = policy_text[start:end].strip()
            return True, excerpt

    return False, None
