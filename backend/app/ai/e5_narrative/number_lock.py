"""
E5 Engine: Narrative Guardrail — Number Lock
Scans a narrative text and flags any numerals NOT present in the approved KPI set.
Correctly accounts for metric identifiers (e.g. ENV-ENERGY-001, ENV-GHG-002)
to avoid false-positive flagging of code digits.
"""
import re
from typing import Dict, Any, List, Tuple

ALLOWED_PERIOD_TOKENS = {
    "2023", "2024", "2025", "2026", "2027", "2028", "2030",
    "23", "24", "25", "26", "27", "28", "30",
    "0", "1", "2", "3", "4", "5", "6", "7", "8", "9"
}

# Regex to identify metric / indicator identifiers, e.g. ENV-ENERGY-001, Principle 6, GHG-S1, etc.
METRIC_IDENTIFIER_PATTERN = re.compile(r'\b[A-Za-z0-9]+(?:-[A-Za-z0-9]+)+\b')


def build_approved_set(approved_kpis: Dict[str, Any]) -> set:
    """Builds a normalized set of approved number strings from the KPI dict."""
    approved = set()
    for k, v in approved_kpis.items():
        # Add value representations
        approved.add(str(v))
        if isinstance(v, (int, float)):
            approved.add(str(int(v)))
            approved.add(f"{v:,.0f}")
            approved.add(f"{v:,.1f}")
            approved.add(f"{v:,.2f}")
            approved.add(f"{v:g}")
        # Also whitelist numbers that explicitly appear within the metric code/key itself
        key_numbers = re.findall(r'\b\d+\b', str(k))
        for kn in key_numbers:
            approved.add(kn)
    return approved


def check_number_lock(draft: str, approved_kpis: Dict[str, Any]) -> Tuple[List[str], List[str], bool]:
    """
    Scans the draft text for numerals and checks against approved_kpis.
    Ignores digits embedded within structured metric identifiers (e.g. ENV-ENERGY-001).
    Returns (all_found_numbers, unapproved_numbers, passed: bool)
    """
    approved = build_approved_set(approved_kpis)

    # First, mask out hyphenated metric identifiers so their digits aren't treated as standalone claims
    def mask_identifier(match):
        token = match.group(0)
        # If token contains both letters and hyphens (like ENV-ENERGY-001 or SCOPE-1), mask digits
        if any(c.isalpha() for c in token) and "-" in token:
            return re.sub(r'\d', '#', token)
        return token

    sanitized_draft = METRIC_IDENTIFIER_PATTERN.sub(mask_identifier, draft)

    # Find standalone numbers (integers, floats, currency/commas)
    raw_numbers = re.findall(r'(?<![#A-Za-z])\b\d+(?:,\d+)*(?:\.\d+)?\b(?![#A-Za-z])', sanitized_draft)

    unapproved = []
    for n in raw_numbers:
        if n in ALLOWED_PERIOD_TOKENS:
            continue
        cleaned = n.replace(",", "")
        
        # Check if the number matches any approved KPI value (or numeric part of approved KPI)
        is_valid = False
        for v in approved:
            v_clean = str(v).replace(",", "")
            if cleaned == v_clean:
                is_valid = True
                break
            # Tolerate float equivalence (e.g. "1420" vs "1420.0")
            try:
                if abs(float(cleaned) - float(v_clean)) < 1e-6:
                    is_valid = True
                    break
            except (ValueError, TypeError):
                pass

        if not is_valid:
            unapproved.append(n)

    return raw_numbers, unapproved, len(unapproved) == 0
