from abc import ABC, abstractmethod
from typing import Dict, Any, Optional

class BaseAIProvider(ABC):
    """Abstract interface for LLM / Vision AI Providers."""

    @abstractmethod
    def generate_json(self, prompt: str, schema_dict: Dict[str, Any], system_prompt: Optional[str] = None) -> Dict[str, Any]:
        """Generate structured JSON conforming to the given schema."""
        pass

    @abstractmethod
    def generate_vision_json(self, prompt: str, image_bytes: bytes, mime_type: str, schema_dict: Dict[str, Any]) -> Dict[str, Any]:
        """Generate structured JSON from an image/document."""
        pass

    @abstractmethod
    def generate_text(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        """Generate conversational or analytical plain text."""
        pass
