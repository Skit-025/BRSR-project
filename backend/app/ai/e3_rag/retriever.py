"""Rank local guidance snippets against indicator codes and question terms."""
from typing import Optional, Tuple, Dict, List
import re
from app.ai.e3_rag.knowledge import BRSR_KNOWLEDGE_BASE
from app.ai.schemas import Citation

TOPIC_KEYWORDS: Dict[str, List[str]] = {
    "ENV-ENERGY-001": ["electricity", "power", "grid", "discom", "renewable", "non-renewable", "megawatt", "kilowatt", "kwh", "mwh", "gj", "gigajoule", "energy consumption", "electricity bill", "energy boundary"],
    "ENV-ENERGY-002": ["fuel", "diesel", "petrol", "coal", "natural gas", "lpg", "png", "combustion", "furnace oil", "fuel consumption", "hsd"],
    "ENV-GHG-001": ["scope 1", "direct emission", "stationary combustion", "mobile combustion", "ghg protocol", "tco2e", "flaring"],
    "ENV-GHG-002": ["scope 2", "indirect emission", "purchased electricity", "grid emission", "grid factor", "cea", "tco2e"],
    "ENV-WATER-001": ["water", "groundwater", "withdrawal", "discharge", "consumption", "kl", "kilolitre", "cubic meter", "sewerage"],
    "ENV-WASTE-001": ["waste", "hazardous", "non-hazardous", "plastic", "e-waste", "manifest", "recycling", "landfill", "incineration"],
    "SOC-SAFE-001": ["safety", "ltifr", "lost time injury", "incident", "man-hour", "frequency rate", "injury", "fatality rate"],
    "SOC-SAFE-002": ["fatalities", "fatality", "workplace death"],
    "SOC-EMP-001": ["employee", "worker", "headcount", "gender", "diversity", "disability", "attrition"],
    "SOC-WELF-001": ["training", "skill", "upskilling", "development"],
    "GOV-ETH-001": ["anti-corruption", "anti-bribery", "ethics", "code of conduct", "whistleblower", "governance", "bribery", "corruption", "grievance", "human rights", "child labour", "forced labour"],
}

ALIASES = {"P6-EI-1": "ENV-ENERGY-001", "P6-EI-2": "ENV-ENERGY-002", "P6-EI-3": "ENV-WATER-001", "P6-EI-8": "ENV-WASTE-001"}

def _citation(chunk: dict, code: str, score: float = 1.0) -> Citation:
    return Citation(doc="Local BRSR guidance library", version=chunk.get("version", "BRSR-2023"), section=chunk.get("section", code), text=chunk.get("guidance", ""), score=score)

def retrieve(indicator_code: Optional[str] = None, question: Optional[str] = None) -> Tuple[Optional[dict], Optional[Citation]]:
    code = (indicator_code or "").strip().upper()
    code = ALIASES.get(code, code)
    if code in BRSR_KNOWLEDGE_BASE:
        chunk = BRSR_KNOWLEDGE_BASE[code]
        return chunk, _citation(chunk, code)
    # Resolve only complete identifiers/aliases; substring matches can map unrelated codes.
    if code and code not in {"GENERAL", "ANY", "NONE", "ALL"}:
        for kb_code, chunk in BRSR_KNOWLEDGE_BASE.items():
            if code == str(chunk.get("section", "")).upper():
                return chunk, _citation(chunk, kb_code)
    tokens = set(re.findall(r"[a-z0-9]+", (question or "").lower()))
    scored = []
    for kb_code, phrases in TOPIC_KEYWORDS.items():
        chunk = BRSR_KNOWLEDGE_BASE.get(kb_code)
        if not chunk:
            continue
        score = sum(3 if " " in phrase and phrase in (question or "").lower() else 0 for phrase in phrases)
        score += sum(1 for phrase in phrases if " " not in phrase and phrase in tokens)
        if score:
            scored.append((score, kb_code, chunk))
    if not scored:
        return None, None
    scored.sort(key=lambda item: (item[0], item[1]), reverse=True)
    score, kb_code, chunk = scored[0]
    # Require unambiguous evidence to ground a response.
    if score < 2 or (len(scored) > 1 and scored[0][0] == scored[1][0]):
        return None, None
    return chunk, _citation(chunk, kb_code, float(score))
