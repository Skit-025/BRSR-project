"""
E3 Engine: Retriever
Searches the knowledge base for the most relevant guidance chunk.
"""
from typing import Optional, Tuple
from app.ai.e3_rag.knowledge import BRSR_KNOWLEDGE_BASE
from app.ai.schemas import Citation


def retrieve(indicator_code: str) -> Tuple[Optional[dict], Optional[Citation]]:
    """
    Retrieves the guidance chunk and Citation for a given indicator code or query.
    Performs exact match first, then partial match, and finally keyword search score.
    Returns (chunk_dict, Citation) or (None, None).
    """
    if not indicator_code:
        return None, None

    code = indicator_code.strip().upper()

    # 1. Exact match
    chunk = BRSR_KNOWLEDGE_BASE.get(code)
    if chunk:
        citation = Citation(
            doc="SEBI BRSR Guidance Note",
            version=chunk.get("version", "BRSR-2023"),
            section=chunk.get("section", code),
            text=chunk.get("guidance", "")
        )
        return chunk, citation

    # 2. Direct partial match on indicator code or section
    for kb_code, data in BRSR_KNOWLEDGE_BASE.items():
        if kb_code in code or code in kb_code or code in data.get("section", "").upper():
            citation = Citation(
                doc="SEBI BRSR Guidance Note",
                version=data.get("version", "BRSR-2023"),
                section=data.get("section", kb_code),
                text=data.get("guidance", "")
            )
            return data, citation

    # 3. Intelligent keyword matching
    query_tokens = set(code.lower().replace("-", " ").replace("_", " ").split())
    # remove very common stop words
    stop_words = {"the", "a", "an", "in", "of", "and", "or", "to", "for", "on", "is", "by", "what", "how", "guidance"}
    meaningful_tokens = query_tokens - stop_words

    if meaningful_tokens:
        best_match = None
        highest_score = 0

        for kb_code, data in BRSR_KNOWLEDGE_BASE.items():
            score = 0
            keywords = [kw.lower() for kw in data.get("keywords", [])]
            guidance_lower = data.get("guidance", "").lower()
            section_lower = data.get("section", "").lower()
            
            for token in meaningful_tokens:
                if any(token in kw for kw in keywords):
                    score += 3
                if token in section_lower:
                    score += 2
                if token in guidance_lower:
                    score += 1

            if score > highest_score and score >= 2:
                highest_score = score
                best_match = (kb_code, data)

        if best_match:
            kb_code, data = best_match
            citation = Citation(
                doc="SEBI BRSR Guidance Note",
                version=data.get("version", "BRSR-2023"),
                section=data.get("section", kb_code),
                text=data.get("guidance", "")
            )
            return data, citation

    return None, None

