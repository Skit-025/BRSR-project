import json
import base64
import re
import logging
from typing import Dict, Any, Optional, List
import httpx
from app.ai.providers.base import BaseAIProvider
from app.config.settings import settings

logger = logging.getLogger(__name__)


def _parse_json_robust(content: str) -> Dict[str, Any]:
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
                fixed = re.sub(r':\s*([0-9.]+)\s*\*\s*([0-9.]+)', lambda match: f': {round(float(match.group(1)) * float(match.group(2)), 6)}', cleaned)
                return json.loads(fixed, strict=False)
            except Exception:
                pass

    raise ValueError(f"Could not parse valid JSON from LLM response: {text[:200]}")


class OpenRouterProvider(BaseAIProvider):
    """
    OpenRouter Provider supporting open-source models with OpenAI-compatible endpoints,
    automatic multi-model fallback, and robust JSON output extraction.
    """
    BASE_URL = "https://openrouter.ai/api/v1"

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.OPENROUTER_API_KEY

    def is_available(self) -> bool:
        return bool(self.api_key and self.api_key.strip() and not self.api_key.startswith("mock_"))

    def _headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "HTTP-Referer": "https://meil-brsr-portal.local",
            "X-Title": "MEIL BRSR Reporting Portal",
            "Content-Type": "application/json"
        }

    def generate_json(self, prompt: str, schema_dict: Dict[str, Any], system_prompt: Optional[str] = None) -> Dict[str, Any]:
        if not self.is_available():
            raise RuntimeError("OpenRouter API key is not configured.")

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})

        user_message = (
            f"You MUST return a valid JSON object populated with actual values according to this schema:\n"
            f"{json.dumps(schema_dict)}\n\n"
            f"CRITICAL: Do NOT echo schema types or math formulas like (0.082 * 20.0). All numbers must be evaluated literal numbers (e.g. 1.64).\n"
            f"Output strictly valid JSON with no conversational text or markdown code fences outside the JSON.\n\n"
            f"Input Task:\n{prompt}"
        )
        messages.append({"role": "user", "content": user_message})

        # NOTE: Gemini is PRIMARY. OpenRouter text models are only reached if Gemini fails.
        models_to_try = [
            settings.OPENROUTER_MODEL_TEXT,                         # from .env
            "nvidia/nemotron-3.5-lightning:free",                   # active free-tier text model
            "google/gemma-4-26b-a4b-it:free",                       # active free-tier instruction model
            "google/gemma-4-31b-it:free",                           # active free-tier instruction model
            "liquid/lfm-2.5-2.6b:free",                             # active free-tier lightweight model
        ]
        models_to_try = list(dict.fromkeys([m for m in models_to_try if m]))

        last_error = None
        for model in models_to_try:
            payload = {
                "model": model,
                "messages": messages,
                "temperature": 0.1,
                "max_tokens": 4096
            }
            try:
                with httpx.Client(timeout=90.0) as client:
                    resp = client.post(f"{self.BASE_URL}/chat/completions", headers=self._headers(), json=payload)
                    resp.raise_for_status()
                    data = resp.json()
                    content = data["choices"][0]["message"]["content"]
                    return _parse_json_robust(content)
            except Exception as e:
                logger.warning(f"OpenRouter text model '{model}' failed: {e}. Trying fallback...")
                last_error = e

        raise RuntimeError(f"All OpenRouter text models failed. Last error: {last_error}")

    def generate_vision_json(self, prompt: str, image_bytes: bytes, mime_type: str, schema_dict: Dict[str, Any]) -> Dict[str, Any]:
        if not self.is_available():
            raise RuntimeError("OpenRouter API key is not configured.")

        b64_image = base64.b64encode(image_bytes).decode("utf-8")
        data_uri = f"data:{mime_type};base64,{b64_image}"

        messages = [
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": (
                            f"You are an ESG document reader. Extract data matching this JSON schema:\n"
                            f"{json.dumps(schema_dict)}\n\n"
                            f"Prompt:\n{prompt}\n\n"
                            f"Return valid JSON only."
                        )
                    },
                    {
                        "type": "image_url",
                        "image_url": {"url": data_uri}
                    }
                ]
            }
        ]

        # OpenRouter vision model cascade — ordered by reliability on free tier
        # NOTE: Gemini handles vision as PRIMARY. OpenRouter is only reached if Gemini fails.
        models_to_try = [
            settings.OPENROUTER_MODEL_VISION,                      # from .env
            "nvidia/nemotron-3.5-super-vl:free",                   # active free-tier vision model
            "google/gemma-4-26b-a4b-it:free",                       # active free-tier multimodal
            "google/gemma-4-31b-it:free",                           # active free-tier multimodal
        ]
        models_to_try = list(dict.fromkeys([m for m in models_to_try if m]))

        last_error = None
        for model in models_to_try:
            payload = {
                "model": model,
                "messages": messages,
                "temperature": 0.1,
                "max_tokens": 4096  # was: 1500 (too low, caused JSON truncation mid-response)
            }
            try:
                logger.info(f"Calling OpenRouter vision model '{model}'...")
                with httpx.Client(timeout=90.0) as client:
                    resp = client.post(f"{self.BASE_URL}/chat/completions", headers=self._headers(), json=payload)
                    resp.raise_for_status()
                    data = resp.json()
                    content = data["choices"][0]["message"]["content"]
                    parsed = _parse_json_robust(content)
                    logger.info(f"OpenRouter vision model '{model}' succeeded: extracted {list(parsed.keys())}")
                    return parsed
            except Exception as e:
                logger.warning(f"OpenRouter vision model '{model}' failed: {e}. Trying fallback...")
                last_error = e

        raise RuntimeError(f"All OpenRouter vision models failed. Last error: {last_error}")

    def generate_text(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        if not self.is_available():
            raise RuntimeError("OpenRouter API key is not configured.")

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": settings.OPENROUTER_MODEL_TEXT,
            "messages": messages,
            "temperature": 0.2
        }

        with httpx.Client(timeout=90.0) as client:
            resp = client.post(f"{self.BASE_URL}/chat/completions", headers=self._headers(), json=payload)
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"]
