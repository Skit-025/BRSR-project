"""
E5 Engine: Narrative Guardrail — Number Lock
Scans a narrative text and flags any numerals NOT present in the approved KPI set.
"""
import re
from typing import Dict, Any, List, Tuple

ALLOWED_PERIOD_TOKENS = {
    "2024", "2025", "2026", "2027",
    "24", "25", "26", "27",
    "0", "1", "2", "3", "4", "5", "6", "7", "8", "9"
}


def build_approved_set(approved_kpis: Dict[str, Any]) -> set:
    """Builds a normalized set of approved number strings from the KPI dict."""
    approved = set()
    for v in approved_kpis.values():
        approved.add(str(v))
        if isinstance(v, (int, float)):
            approved.add(str(int(v)))
            approved.add(f"{v:,.0f}")
            approved.add(f"{v:,.2f}")
    return approved


def check_number_lock(draft: str, approved_kpis: Dict[str, Any]) -> Tuple[List[str], List[str], bool]:
    """
    Scans the draft text for numerals and checks against approved_kpis.
    Returns (all_found_numbers, unapproved_numbers, passed: bool)
    """
    approved = build_approved_set(approved_kpis)
    raw_numbers = re.findall(r'\b\d+(?:,\d+)*(?:\.\d+)?\b', draft)

    unapproved = []
    for n in raw_numbers:
        if n in ALLOWED_PERIOD_TOKENS:
            continue
        cleaned = n.replace(",", "")
        is_valid = any(cleaned in str(v).replace(",", "") for v in approved)
        if not is_valid:
            unapproved.append(n)

    return raw_numbers, unapproved, len(unapproved) == 0
