"""
app/ai/providers/claude.py
Anthropic Claude AI Provider implementation with structured JSON output and Vision support.
"""
import json
import base64
import logging
import os
from typing import Dict, Any, Optional
from app.ai.providers.base import BaseAIProvider

logger = logging.getLogger(__name__)


class ClaudeProvider(BaseAIProvider):
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("ANTHROPIC_API_KEY")
        self._client = None
        if self.api_key and not self.api_key.startswith("mock_"):
            try:
                import anthropic
                self._client = anthropic.Anthropic(api_key=self.api_key)
                logger.info("ClaudeProvider initialized.")
            except ImportError:
                logger.warning("anthropic package not installed.")
            except Exception as e:
                logger.error("Failed to initialize Claude: %s", e)

    def is_available(self) -> bool:
        return bool(self._client and self.api_key and not self.api_key.startswith("mock_"))

    def generate_json(self, prompt: str, schema_dict: Dict[str, Any], system_prompt: Optional[str] = None) -> Dict[str, Any]:
        if not self.is_available():
            raise RuntimeError("Claude API is not configured.")

        sys = system_prompt or "You are an expert ESG auditing AI. Return strictly valid JSON conforming to the requested schema."
        user_msg = f"Schema:\n{json.dumps(schema_dict, indent=2)}\n\nPrompt:\n{prompt}\n\nRespond ONLY with valid JSON."
        
        response = self._client.messages.create(
            model="claude-3-7-sonnet-20250219",
            max_tokens=4096,
            system=sys,
            messages=[{"role": "user", "content": user_msg}]
        )
        text = response.content[0].text.strip()
        if text.startswith("```"):
            lines = text.split("\n", 1)
            text = lines[1] if len(lines) > 1 else ""
            if "```" in text:
                text = text.rsplit("```", 1)[0]
        return json.loads(text.strip())

    def generate_vision_json(self, prompt: str, image_bytes: bytes, mime_type: str, schema_dict: Dict[str, Any]) -> Dict[str, Any]:
        if not self.is_available():
            raise RuntimeError("Claude API is not configured.")

        b64_data = base64.b64encode(image_bytes).decode("utf-8")
        user_msg = [
            {
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": mime_type if mime_type.startswith("image/") else "image/jpeg",
                    "data": b64_data,
                }
            },
            {
                "type": "text",
                "text": f"Extract data into strictly valid JSON matching this schema:\n{json.dumps(schema_dict)}\n\nPrompt:\n{prompt}"
            }
        ]
        response = self._client.messages.create(
            model="claude-3-7-sonnet-20250219",
            max_tokens=4096,
            messages=[{"role": "user", "content": user_msg}]
        )
        text = response.content[0].text.strip()
        if text.startswith("```"):
            lines = text.split("\n", 1)
            text = lines[1] if len(lines) > 1 else ""
            if "```" in text:
                text = text.rsplit("```", 1)[0]
        return json.loads(text.strip())

    def generate_text(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        if not self.is_available():
            raise RuntimeError("Claude API is not configured.")
        response = self._client.messages.create(
            model="claude-3-7-sonnet-20250219",
            max_tokens=4096,
            system=system_prompt or "You are an ESG analyst assistant.",
            messages=[{"role": "user", "content": prompt}]
        )
        return response.content[0].text
