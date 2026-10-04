import json
import base64
import logging
from typing import Dict, Any, Optional
import httpx
from app.ai.providers.base import BaseAIProvider
from app.config.settings import settings

logger = logging.getLogger(__name__)

class OpenRouterProvider(BaseAIProvider):
    """
    OpenRouter Provider supporting open-source models (Llama 3.3, Mistral, Qwen, etc.)
    with OpenAI-compatible endpoints.
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

        payload = {
            "model": settings.OPENROUTER_MODEL_TEXT,
            "messages": messages,
            "response_format": {"type": "json_object"},
            "temperature": 0.1
        }

        with httpx.Client(timeout=30.0) as client:
            resp = client.post(f"{self.BASE_URL}/chat/completions", headers=self._headers(), json=payload)
            resp.raise_for_status()
            data = resp.json()
            content = data["choices"][0]["message"]["content"]
            return json.loads(content)

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
                        "text": f"Extract data strictly matching this JSON schema: {json.dumps(schema_dict)}\n\nPrompt: {prompt}"
                    },
                    {
                        "type": "image_url",
                        "image_url": {"url": data_uri}
                    }
                ]
            }
        ]

        payload = {
            "model": settings.OPENROUTER_MODEL_VISION,
            "messages": messages,
            "response_format": {"type": "json_object"},
            "temperature": 0.1
        }

        with httpx.Client(timeout=45.0) as client:
            resp = client.post(f"{self.BASE_URL}/chat/completions", headers=self._headers(), json=payload)
            resp.raise_for_status()
            data = resp.json()
            content = data["choices"][0]["message"]["content"]
            return json.loads(content)

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

        with httpx.Client(timeout=30.0) as client:
            resp = client.post(f"{self.BASE_URL}/chat/completions", headers=self._headers(), json=payload)
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"]
