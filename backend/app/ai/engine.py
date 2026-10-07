"""
app/ai/engine.py
Legacy AI Engine Dispatcher for backward compatibility with tasks_ai.py.
Provides get_ai_engine() supporting complete() and vision() methods.
"""
from typing import Optional, Dict, Any
from app.ai.gateway import ai_gateway


class LegacyAIEngine:
    """Dispatches to the active AI provider cascade via AIGateway."""

    async def complete(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        res, provider_name, is_fallback = ai_gateway._call_provider_cascade(
            "generate_text",
            prompt=prompt,
            system_prompt=system_prompt
        )
        return str(res)

    async def vision(self, prompt: str, image_bytes: Optional[bytes] = None, mime_type: str = "image/jpeg") -> str:
        if image_bytes:
            res, provider_name, is_fallback = ai_gateway._call_provider_cascade(
                "generate_vision_json",
                prompt=prompt,
                image_bytes=image_bytes,
                mime_type=mime_type,
                schema_dict={}
            )
            return str(res)
        res, provider_name, is_fallback = ai_gateway._call_provider_cascade(
            "generate_text",
            prompt=prompt
        )
        return str(res)


_engine_instance = LegacyAIEngine()


def get_ai_engine() -> LegacyAIEngine:
    """Returns singleton instance of the legacy AI engine interface."""
    return _engine_instance
