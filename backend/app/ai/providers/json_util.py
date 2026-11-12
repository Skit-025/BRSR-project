"""
app/ai/providers/json_util.py
Shared robust JSON extraction for LLM responses.

LLMs frequently wrap JSON in markdown fences, prepend reasoning commentary, or
emit unquoted arithmetic expressions. Every provider funnels responses through
this helper so the gateway always receives a dict.
"""
import json
import re
from typing import Any, Dict


def parse_json_robust(content: str) -> Dict[str, Any]:
    """
    Parses JSON from LLM responses even if wrapped in markdown blocks
    (```json ... ```) or preceded/followed by reasoning commentary.
    """
    text = (content or "").strip()
    if not text:
        raise ValueError("Empty LLM response")

    # 1. Strip markdown fences
    if "```json" in text:
        parts = text.split("```json")
        if len(parts) > 1:
            candidate = parts[1].split("```")[0].strip()
            try:
                return json.loads(candidate, strict=False)
            except Exception:
                pass
    elif "```" in text:
        parts = text.split("```")
        if len(parts) > 1:
            candidate = parts[1].split("```")[0].strip()
            try:
                return json.loads(candidate, strict=False)
            except Exception:
                pass

    # 2. Try direct load
    try:
        return json.loads(text, strict=False)
    except Exception:
        pass

    # 3. Extract outermost { ... }
    m = re.search(r"(\{.*\})", text, re.DOTALL)
    if m:
        cleaned = m.group(1)
        try:
            return json.loads(cleaned, strict=False)
        except Exception:
            # Fix unquoted arithmetic expressions like "key": 0.082 * 20.0
            try:
                fixed = re.sub(
                    r":\s*([0-9.]+)\s*\*\s*([0-9.]+)",
                    lambda match: f": {round(float(match.group(1)) * float(match.group(2)), 6)}",
                    cleaned,
                )
                return json.loads(fixed, strict=False)
            except Exception:
                pass

    raise ValueError(f"Could not parse valid JSON from LLM response: {text[:200]}")
