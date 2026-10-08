"""
E3 Engine: Retriever
Searches the knowledge base for the most relevant guidance chunk.
Performs exact code lookup, partial matching, and keyword-based query matching.
"""
from typing import Optional, Tuple, Dict, List
import re
from app.ai.e3_rag.knowledge import BRSR_KNOWLEDGE_BASE
from app.ai.schemas import Citation

# Semantic keyword triggers mapped to specific BRSR knowledge base entries
TOPIC_KEYWORDS: Dict[str, List[str]] = {
    "ENV-ENERGY-001": [
        "electricity", "power", "grid", "discom", "renewable", "non-renewable",
        "megawatt", "kilowatt", "kwh", "mwh", "gj", "gigajoule", "energy consumption",
        "power consumption", "electricity bill", "energy boundary"
    ],
    "ENV-ENERGY-002": [
        "fuel", "diesel", "petrol", "coal", "natural gas", "lpg", "png", "scm",
        "combustion", "furnace oil", "fuel consumption", "fuel receipt", "hsd"
    ],
    "ENV-GHG-001": [
        "scope 1", "direct emission", "direct emissions", "stationary combustion",
        "mobile combustion", "ghg protocol", "tco2e", "flaring"
    ],
    "ENV-GHG-002": [
        "scope 2", "indirect emission", "indirect emissions", "purchased electricity",
        "grid emission", "grid factor", "cea", "tco2e"
    ],
    "ENV-WATER-001": [
        "water", "groundwater", "water withdrawal", "water discharge", "water consumption",
        "water intensity", "kl", "kilolitre", "cubic meter", "sewerage", "third-party water"
    ],
    "ENV-WASTE-001": [
        "waste", "hazardous", "non-hazardous", "plastic", "e-waste", "manifest",
        "recycling", "landfill", "incineration", "waste disposal", "form 10"
    ],
    "SOC-SAFE-001": [
        "safety", "ltifr", "lost time injury", "incident", "man-hour", "man-hours",
        "frequency rate", "injury", "fatality rate", "health and safety"
    ],
    "SOC-SAFE-002": [
        "fatalities", "fatality", "workplace death", "loss of life"
    ],
    "SOC-EMP-001": [
        "employee", "employees", "worker", "workers", "headcount", "gender",
        "diversity", "disability", "differently abled", "permanent", "turnover"
    ],
    "SOC-WELF-001": [
        "training", "skill", "upskilling", "development", "training hours", "skill upgradation"
    ],
    "GOV-ETH-001": [
        "anti-corruption", "anti-bribery", "ethics", "code of conduct", "whistleblower",
        "governance", "bribery", "corruption", "grievance", "human rights", "child labour",
        "forced labour"
    ],
}


def retrieve(indicator_code: Optional[str] = None, question: Optional[str] = None) -> Tuple[Optional[dict], Optional[Citation]]:
    """
    Retrieves the guidance chunk and Citation for a given indicator code and/or user question.
    1. Exact match on indicator code (if provided and valid).
    2. Partial match on indicator code or section name.
    3. Keyword match on question text against BRSR knowledge base topics.
    Returns (chunk_dict, Citation) or (None, None) if no matching context is found.
    """
    code = (indicator_code or "").strip().upper()
    q_lower = (question or "").lower()

    # Step 1: Exact match on indicator code
    if code and code not in ("GENERAL", "ANY", "NONE", "ALL", ""):
        chunk = BRSR_KNOWLEDGE_BASE.get(code)
        if chunk:
            citation = Citation(
                doc="SEBI BRSR Guidance Note",
                version=chunk.get("version", "BRSR-2023"),
                section=chunk.get("section", code),
                text=chunk.get("guidance", "")
            )
            return chunk, citation

        # Step 2: Partial match on indicator code or section name
        for kb_code, data in BRSR_KNOWLEDGE_BASE.items():
            if kb_code in code or code in kb_code or code in data.get("section", "").upper():
                citation = Citation(
                    doc="SEBI BRSR Guidance Note",
                    version=data.get("version", "BRSR-2023"),
                    section=data.get("section", kb_code),
                    text=data.get("guidance", "")
                )
                return data, citation

    # Step 3: Match based on question text keywords
    if q_lower:
        best_code = None
        best_score = 0

        for kb_code, keywords in TOPIC_KEYWORDS.items():
            score = 0
            for kw in keywords:
                if kw in q_lower:
                    # Multi-word phrase match gives higher confidence
                    score += 3 if " " in kw else 1
            if score > best_score:
                best_score = score
                best_code = kb_code

        # If keyword overlap is sufficiently high (score >= 2), return the matching chunk
        if best_code and best_score >= 2:
            chunk = BRSR_KNOWLEDGE_BASE.get(best_code)
            if chunk:
                citation = Citation(
                    doc="SEBI BRSR Guidance Note",
                    version=chunk.get("version", "BRSR-2023"),
                    section=chunk.get("section", best_code),
                    text=chunk.get("guidance", "")
                )
                return chunk, citation

    return None, None
