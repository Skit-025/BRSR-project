"""
E3 Engine: Retriever
Searches the knowledge base for the most relevant guidance chunk.
"""
from typing import Optional, Tuple
from app.ai.e3_rag.knowledge import BRSR_KNOWLEDGE_BASE
from app.ai.schemas import Citation


def retrieve(indicator_code: str) -> Tuple[Optional[dict], Optional[Citation]]:
    """
    Retrieves the guidance chunk and Citation for a given indicator code.
    Performs exact match first, then partial match fallback.
    Returns (chunk_dict, Citation) or (None, None).
    """
    code = indicator_code.strip().upper()

    # Exact match
    chunk = BRSR_KNOWLEDGE_BASE.get(code)
    if chunk:
        citation = Citation(
            doc="SEBI BRSR Guidance Note",
            version=chunk["version"],
            section=chunk["section"],
            text=chunk["guidance"]
        )
        return chunk, citation

    # Partial match (e.g. user typed "Principle 6 - Essential Indicator 1")
    for kb_code, data in BRSR_KNOWLEDGE_BASE.items():
        if kb_code in code or code in kb_code or code in data["section"].upper():
            citation = Citation(
                doc="SEBI BRSR Guidance Note",
                version=data["version"],
                section=data["section"],
                text=data["guidance"]
            )
            return data, citation

    return None, None
