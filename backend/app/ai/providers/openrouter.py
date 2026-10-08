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
    Handles models that output lengthy chain-of-thought before the final JSON.
    """
    text = (content or "").strip()
    if not text:
        raise ValueError("Empty LLM response")

    # 1. Strip markdown fences - handle ```json ... ``` blocks
    if "```json" in text:
        parts = text.split("```json")
        if len(parts) > 1:
            candidate = parts[-1].split("```")[0].strip()  # use LAST block
            try:
                return json.loads(candidate)
            except Exception:
                pass
    elif "```" in text:
        parts = text.split("```")
        if len(parts) > 1:
            candidate = parts[-2].strip() if len(parts) > 2 else parts[1].split("```")[0].strip()
            try:
                return json.loads(candidate)
            except Exception:
                pass

    # 2. Try direct load
    try:
        return json.loads(text)
    except Exception:
        pass

    # 3. Find the LAST JSON object in the text (handles reasoning-before-answer models)
    # Strategy: scan backwards from end for last closing brace, then find its opening brace
    last_close = text.rfind("}")
    if last_close != -1:
        # Find the matching opening brace by counting
        depth = 0
        start_idx = -1
        for i in range(last_close, -1, -1):
            if text[i] == "}":
                depth += 1
            elif text[i] == "{":
                depth -= 1
                if depth == 0:
                    start_idx = i
                    break
        if start_idx != -1:
            candidate = text[start_idx:last_close + 1]
            try:
                return json.loads(candidate)
            except Exception:
                pass

    # 4. Fallback: search for any { ... } block
    m = re.search(r"(\{.*\})", text, re.DOTALL)
    if m:
        try:
            return json.loads(m.group(1))
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
            f"You MUST return strictly valid JSON matching this schema: {json.dumps(schema_dict)}\n"
            f"Do not include any explanation or markdown formatting outside the JSON block.\n\n"
            f"Prompt: {prompt}"
        )
        messages.append({"role": "user", "content": user_message})

        models_to_try = [
            settings.OPENROUTER_MODEL_TEXT,
            "openrouter/auto",
            "openrouter/free",
        ]
        models_to_try = list(dict.fromkeys([m for m in models_to_try if m]))

        last_error = None
        for model in models_to_try:
            payload = {
                "model": model,
                "messages": messages,
                "temperature": 0.1,
                "max_tokens": 1500
            }
            try:
                with httpx.Client(timeout=25.0) as client:
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

        # Prioritized free & working vision models on OpenRouter
        models_to_try = [
            settings.OPENROUTER_MODEL_VISION,            # Primary from settings (inclusionai/ling-3.0-flash-vl)
            "inclusionai/ling-3.0-flash-vl",             # Verified working 2026-10
            "qwen/qwen2.5-vl-72b-instruct",              # Qwen Vision 72B
            "openrouter/auto",                           # Auto-router last resort
        ]
        models_to_try = list(dict.fromkeys([m for m in models_to_try if m]))

        last_error = None
        for model in models_to_try:
            payload = {
                "model": model,
                "messages": messages,
                "temperature": 0.1,
                "max_tokens": 1500
            }
            # Retry up to 2 times for primary model on transient errors (422/503)
            max_attempts = 2 if model in (settings.OPENROUTER_MODEL_VISION, "inclusionai/ling-3.0-flash-vl") else 1
            for attempt in range(max_attempts):
                try:
                    logger.info(f"Calling OpenRouter vision model '{model}' (attempt {attempt + 1})...")
                    with httpx.Client(timeout=30.0) as client:
                        resp = client.post(f"{self.BASE_URL}/chat/completions", headers=self._headers(), json=payload)
                        if resp.status_code in (422, 503) and attempt < max_attempts - 1:
                            logger.warning(f"OpenRouter vision model '{model}' got {resp.status_code}, retrying...")
                            import time
                            time.sleep(1.5)
                            continue
                        resp.raise_for_status()
                        data = resp.json()
                        content = (data.get("choices") or [{}])[0].get("message", {}).get("content") or ""
                        if not content.strip():
                            raise ValueError("Empty LLM response")
                        parsed = _parse_json_robust(content)
                        logger.info(f"OpenRouter vision model '{model}' succeeded: extracted {list(parsed.keys())}")
                        return parsed
                except Exception as e:
                    last_error = e
                    if attempt == max_attempts - 1:
                        logger.warning(f"OpenRouter vision model '{model}' failed: {e}. Trying fallback...")
                    break

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

        with httpx.Client(timeout=35.0) as client:
            resp = client.post(f"{self.BASE_URL}/chat/completions", headers=self._headers(), json=payload)
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"]
