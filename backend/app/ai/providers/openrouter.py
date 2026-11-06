import json
import base64
import logging
from typing import Dict, Any, Optional, List
import httpx
from app.ai.providers.base import BaseAIProvider
from app.ai.providers.json_util import parse_json_robust as _parse_json_robust
from app.config.settings import settings

logger = logging.getLogger(__name__)


class OpenRouterProvider(BaseAIProvider):
    """
    OpenRouter Provider supporting open-source models with OpenAI-compatible endpoints,
    automatic multi-model fallback, and robust JSON output extraction.
    """
    BASE_URL = "https://openrouter.ai/api/v1"

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.OPENROUTER_API_KEY
        self.last_model_used: Optional[str] = None

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

        # NOTE: Hugging Face is PRIMARY; OpenRouter is a failover. Paid/budgeted
        # models are preferred over ":free" ones because free-tier endpoints
        # rate-limit aggressively (429/502/503).
        models_to_try = [
            settings.OPENROUTER_MODEL_TEXT,                    # from .env
            "meta-llama/llama-3.3-70b-instruct",
            "mistralai/mistral-small-3.2-24b-instruct",
            "meta-llama/llama-3.1-8b-instruct",
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
                    parsed = _parse_json_robust(content)
                    self.last_model_used = model
                    return parsed
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

        # OpenRouter vision model cascade — verified live multimodal models.
        # NOTE: Hugging Face handles vision as PRIMARY; OpenRouter is a failover.
        models_to_try = [
            settings.OPENROUTER_MODEL_VISION,                   # from .env
            "google/gemma-3-27b-it",
            "inclusionai/ling-3.0-flash-vl",
            "qwen/qwen2.5-vl-72b-instruct",
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
                    self.last_model_used = model
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

        last_error = None
        for model in [
            settings.OPENROUTER_MODEL_TEXT,
            "meta-llama/llama-3.1-8b-instruct",
            "mistralai/mistral-nemo",
        ]:
            if not model:
                continue
            payload = {
                "model": model,
                "messages": messages,
                "temperature": 0.2,
                "max_tokens": 4096,
            }
            try:
                with httpx.Client(timeout=90.0) as client:
                    resp = client.post(
                        f"{self.BASE_URL}/chat/completions", headers=self._headers(), json=payload
                    )
                    resp.raise_for_status()
                    data = resp.json()
                    content = data["choices"][0]["message"].get("content")
                    if content:
                        self.last_model_used = model
                        return content
                    last_error = "empty content"
            except Exception as e:
                logger.warning(f"OpenRouter text model '{model}' failed: {e}. Trying fallback...")
                last_error = e

        raise RuntimeError(f"All OpenRouter text models failed. Last error: {last_error}")
