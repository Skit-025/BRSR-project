"""Numeric claim guard for narrative drafts."""
import re
from decimal import Decimal, InvalidOperation
from typing import Dict, Any, List, Tuple

METRIC_IDENTIFIER_PATTERN = re.compile(r'\b[A-Za-z0-9]+(?:-[A-Za-z0-9]+)+\b')
NUMBER_PATTERN = re.compile(r'(?<![#A-Za-z])\b\d+(?:,\d{3})*(?:\.\d+)?%?\b(?![A-Za-z])')

def build_approved_set(approved_kpis: Dict[str, Any]) -> set:
    values = set()
    for value in approved_kpis.values():
        try:
            number = Decimal(str(value).replace(",", ""))
        except (InvalidOperation, ValueError, TypeError):
            continue
        values.update({format(number, "f"), format(number.quantize(Decimal("1")), "f"),
                       format(number.quantize(Decimal("0.1")), "f"), format(number.quantize(Decimal("0.01")), "f")})
    return values

def check_number_lock(draft: str, approved_kpis: Dict[str, Any]) -> Tuple[List[str], List[str], bool]:
    approved = build_approved_set(approved_kpis)
    text = METRIC_IDENTIFIER_PATTERN.sub(lambda m: re.sub(r"\d", "#", m.group(0)), draft or "")
    # Reporting years and BRSR Principle numbers are contextual labels rather than KPI claims.
    text = re.sub(r"\bFY\s*\d{4}-\d{2}\b", "FY YEAR", text, flags=re.I)
    text = re.sub(r"\bPrinciple\s+[1-9]\b", "Principle N", text, flags=re.I)
    raw = NUMBER_PATTERN.findall(text)
    unapproved = []
    for token in raw:
        normalized = token.replace(",", "").rstrip("%")
        try:
            number = Decimal(normalized)
            if number == number.to_integral_value() and 1900 <= int(number) <= 2100:
                continue
            if not any(number == Decimal(value) for value in approved):
                unapproved.append(token)
        except InvalidOperation:
            unapproved.append(token)
    return raw, unapproved, not unapproved
