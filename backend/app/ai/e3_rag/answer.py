"""
E3 Engine: Answer Post-Processor
Handles confidence trimming, refusal detection, and answer quality enforcement
before the response is returned to the caller.
"""
from typing import List
from app.ai.schemas import Citation


NO_ANSWER_PHRASES = [
    "i cannot", "i don't know", "i do not know",
    "no information", "not found", "unable to answer",
    "cannot determine", "not enough information"
]


def is_grounded(answer: str, citations: List[Citation]) -> bool:
    """
    Returns True if the answer is grounded:
    - Has at least one citation
    - Does not contain refusal phrases
    """
    if not citations:
        return False
    answer_lower = answer.lower()
    for phrase in NO_ANSWER_PHRASES:
        if phrase in answer_lower:
            return False
    return True


def trim_answer(answer: str, max_chars: int = 1200) -> str:
    """Trims overly long answers to a readable length at sentence boundary."""
    if len(answer) <= max_chars:
        return answer
    truncated = answer[:max_chars]
    last_period = truncated.rfind(".")
    if last_period > max_chars // 2:
        return truncated[:last_period + 1]
    return truncated + "..."


def enforce_refusal(indicator_code: str) -> str:
    """Returns a standard refusal message when no grounded answer is available."""
    return (
        f"No grounded guidance note passage found for indicator '{indicator_code}'. "
        f"Please refer to the SEBI BRSR Guidance Note (2023) directly "
        f"or consult the SEBI LODR framework for applicable disclosures."
    )
