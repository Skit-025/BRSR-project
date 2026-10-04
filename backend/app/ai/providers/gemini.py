import json
import base64
import logging
from typing import Dict, Any, Optional
from app.ai.providers.base import BaseAIProvider
from app.config.settings import settings

logger = logging.getLogger(__name__)

class GeminiProvider(BaseAIProvider):
    """
    Google Gemini Provider using the new google-genai SDK.
    Supports native high-resolution vision parsing, long context, and forced JSON output.
    """
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.GEMINI_API_KEY
        self._client = None
        if self.api_key and not self.api_key.startswith("mock_"):
            try:
                from google import genai
                # pyrefly: ignore [missing-import]
                from google.genai import types
                self._genai = genai
                self._types = types
                self._client = genai.Client(api_key=self.api_key)
                logger.info("GeminiProvider initialized with google-genai SDK.")
            except ImportError:
                logger.warning("google-genai package not installed.")
            except Exception as e:
                logger.error(f"Error configuring Gemini: {e}")

    def is_available(self) -> bool:
        return bool(self._client and self.api_key and not self.api_key.startswith("mock_"))

    def _clean_json_text(self, text: Optional[str]) -> str:
        if not text:
            raise ValueError("Empty or blocked response received from Gemini.")
        cleaned = text.strip()
        if cleaned.startswith("```"):
            # Strip markdown code block markers
            lines = cleaned.split("\n", 1)
            cleaned = lines[1] if len(lines) > 1 else ""
            if "```" in cleaned:
                cleaned = cleaned.rsplit("```", 1)[0]
        return cleaned.strip()

    def generate_json(self, prompt: str, schema_dict: Dict[str, Any], system_prompt: Optional[str] = None) -> Dict[str, Any]:
        if not self.is_available():
            raise RuntimeError("Gemini API key is not configured or client failed to initialize.")

        full_prompt = (
            f"You MUST return strictly valid JSON matching this schema:\n{json.dumps(schema_dict)}\n\n"
            f"Prompt:\n{prompt}"
        )
        response = self._client.models.generate_content(
            model=settings.AI_MODEL_TEXT,
            contents=full_prompt,
            config=self._types.GenerateContentConfig(
                response_mime_type="application/json",
                system_instruction=system_prompt if system_prompt else None,
                automatic_function_calling=self._types.AutomaticFunctionCallingConfig(disable=True)
            )
        )
        raw_text = getattr(response, "text", None)
        cleaned = self._clean_json_text(raw_text)
        return json.loads(cleaned)

    def generate_vision_json(self, prompt: str, image_bytes: bytes, mime_type: str, schema_dict: Dict[str, Any]) -> Dict[str, Any]:
        if not self.is_available():
            raise RuntimeError("Gemini API key is not configured or client failed to initialize.")

        parts = []
        if image_bytes:
            parts.append(self._types.Part.from_bytes(data=image_bytes, mime_type=mime_type))
        parts.append(
            f"Extract strictly matching this schema:\n{json.dumps(schema_dict)}\n\n{prompt}"
        )

        response = self._client.models.generate_content(
            model=settings.AI_MODEL_VISION,
            contents=parts,
            config=self._types.GenerateContentConfig(
                response_mime_type="application/json",
                automatic_function_calling=self._types.AutomaticFunctionCallingConfig(disable=True)
            )
        )
        raw_text = getattr(response, "text", None)
        cleaned = self._clean_json_text(raw_text)
        return json.loads(cleaned)

    def generate_text(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        if not self.is_available():
            raise RuntimeError("Gemini API key is not configured or client failed to initialize.")

        config = None
        if system_prompt:
            config = self._types.GenerateContentConfig(
                system_instruction=system_prompt,
                automatic_function_calling=self._types.AutomaticFunctionCallingConfig(disable=True)
            )
        else:
            config = self._types.GenerateContentConfig(
                automatic_function_calling=self._types.AutomaticFunctionCallingConfig(disable=True)
            )

        response = self._client.models.generate_content(
            model=settings.AI_MODEL_TEXT,
            contents=prompt,
            config=config
        )
        raw_text = getattr(response, "text", None)
        if raw_text is None:
            raise ValueError("Gemini returned an empty response or was filtered by safety policies.")
        return raw_text
