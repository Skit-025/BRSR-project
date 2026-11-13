"""Conservative clause matcher returning only verbatim source excerpts."""
import re
from typing import Tuple, Optional

TERMS = {
    "Anti-Bribery and Corruption Prohibition": [("anti-bribery", "corruption"), ("anti bribery", "corruption"), ("anti-corruption",), ("anti corruption",)],
    "Whistleblower Protection Mechanism": [("whistleblower",), ("whistle blower",)],
    "Board Oversight and Annual Review": [("board", "oversight"), ("board", "annual review")],
    "Third-Party Due Diligence Requirement": [("third-party", "due diligence"), ("third party", "due diligence"), ("supplier", "due diligence")],
    "Prohibition of Child and Forced Labour": [("child labour",), ("forced labour",), ("child labor",), ("forced labor",)],
    "Non-Discrimination and Equal Opportunity": [("non-discrimination",), ("equal opportunity",), ("non discrimination",)],
    "Grievance Redressal Mechanism": [("grievance", "redress"), ("grievance mechanism",), ("grievance reporting",)],
    "Supplier Human Rights Code of Conduct": [("supplier", "human rights"), ("supplier", "code of conduct")],
    "Commitment to Reduce GHG Emissions": [("reduce", "emissions"), ("emission reduction",), ("ghg reduction",)],
    "Biodiversity and Land Use Policy": [("biodiversity",), ("land use",)],
    "Waste Management and Circular Economy Plan": [("waste management",), ("circular economy",)],
    "Annual Environmental Audit Requirement": [("environmental audit",), ("annual audit", "environment")],
}

def verify_quote(element: str, policy_text: str) -> Tuple[bool, Optional[str]]:
    text = policy_text or ""
    lower = text.lower()
    groups = TERMS.get(element, [(element.lower(),)])
    for group in groups:
        # Match whole phrases: e.g. "audit" must not match "auditorium".
        spans = []
        for term in group:
            match = re.search(rf"(?<!\w){re.escape(term)}(?!\w)", lower)
            if not match:
                spans = []
                break
            spans.append(match.span())
        if not spans:
            continue
        start = min(pos for pos, _ in spans)
        end = max(pos for _, pos in spans)
        # Include the containing sentence while keeping the citation exact.
        sentence_start = max(text.rfind(".", 0, start), text.rfind("\n", 0, start)) + 1
        sentence_end_candidates = [p for p in (text.find(".", end), text.find("\n", end)) if p >= 0]
        sentence_end = min(sentence_end_candidates) + 1 if sentence_end_candidates else len(text)
        quote = text[sentence_start:sentence_end].strip()
        return True, quote or text[start:end]
    return False, None
