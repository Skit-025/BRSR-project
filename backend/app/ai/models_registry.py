"""
app/ai/models_registry.py
Centralized, configurable Model and Capability Registry for AAROHAN ESG AI Layer.
"""
from enum import Enum
from typing import Dict, List, Optional, Set
from pydantic import BaseModel, Field


class AICapability(str, Enum):
    TEXT_GENERATION = "text_generation"
    VISION_EXTRACTION = "vision_extraction"
    STRUCTURED_OUTPUT = "structured_output"
    EMBEDDINGS = "embeddings"


class ModelSpec(BaseModel):
    provider: str
    model_id: str
    capabilities: Set[AICapability]
    max_tokens: int = 4096
    supports_json_schema: bool = True
    embedding_dim: Optional[int] = None
    is_active: bool = True
    description: Optional[str] = None


# Global registry of verified operational and fallback models
DEFAULT_MODEL_REGISTRY: Dict[str, List[ModelSpec]] = {
    "openrouter": [
        ModelSpec(
            provider="openrouter",
            model_id="openai/gpt-oss-120b",
            capabilities={AICapability.TEXT_GENERATION, AICapability.STRUCTURED_OUTPUT},
            max_tokens=4096,
            supports_json_schema=True,
            description="Primary OpenRouter text model"
        ),
        ModelSpec(
            provider="openrouter",
            model_id="google/gemma-3-12b-it",
            capabilities={AICapability.TEXT_GENERATION, AICapability.VISION_EXTRACTION, AICapability.STRUCTURED_OUTPUT},
            max_tokens=4096,
            supports_json_schema=True,
            description="Primary OpenRouter vision model"
        ),
        ModelSpec(
            provider="openrouter",
            model_id="meta-llama/llama-3.3-70b-instruct",
            capabilities={AICapability.TEXT_GENERATION, AICapability.STRUCTURED_OUTPUT},
            max_tokens=4096,
            supports_json_schema=True,
            description="OpenRouter text failover"
        ),
        ModelSpec(
            provider="openrouter",
            model_id="google/gemma-3-27b-it",
            capabilities={AICapability.TEXT_GENERATION, AICapability.VISION_EXTRACTION, AICapability.STRUCTURED_OUTPUT},
            max_tokens=4096,
            supports_json_schema=True,
            description="OpenRouter vision failover"
        ),
    ],
    "gemini": [
        ModelSpec(
            provider="gemini",
            model_id="gemini-3-flash-preview",
            capabilities={AICapability.TEXT_GENERATION, AICapability.VISION_EXTRACTION, AICapability.STRUCTURED_OUTPUT},
            max_tokens=8192,
            supports_json_schema=True,
            description="Verified operational Gemini 3 Flash multimodal model"
        ),
        ModelSpec(
            provider="gemini",
            model_id="gemini-flash-lite-latest",
            capabilities={AICapability.TEXT_GENERATION, AICapability.STRUCTURED_OUTPUT},
            max_tokens=4096,
            supports_json_schema=True,
            description="Gemini fast text model"
        ),
        ModelSpec(
            provider="gemini",
            model_id="gemini-3.1-flash-lite-preview",
            capabilities={AICapability.TEXT_GENERATION, AICapability.STRUCTURED_OUTPUT},
            max_tokens=4096,
            supports_json_schema=True,
            description="Gemini Flash Lite preview"
        ),
        ModelSpec(
            provider="gemini",
            model_id="gemini-embedding-001",
            capabilities={AICapability.EMBEDDINGS},
            embedding_dim=768,
            supports_json_schema=False,
            description="Preferred semantic embedding model (768-dim)"
        ),
    ],
    "huggingface": [
        ModelSpec(
            provider="huggingface",
            model_id="openai/gpt-oss-120b",
            capabilities={AICapability.TEXT_GENERATION, AICapability.STRUCTURED_OUTPUT},
            max_tokens=4096,
            supports_json_schema=True,
            description="HF Router primary text model"
        ),
        ModelSpec(
            provider="huggingface",
            model_id="Qwen/Qwen3-VL-30B-A3B-Instruct",
            capabilities={AICapability.TEXT_GENERATION, AICapability.VISION_EXTRACTION, AICapability.STRUCTURED_OUTPUT},
            max_tokens=4096,
            supports_json_schema=True,
            description="HF Router vision model"
        ),
        ModelSpec(
            provider="huggingface",
            model_id="BAAI/bge-base-en-v1.5",
            capabilities={AICapability.EMBEDDINGS},
            embedding_dim=768,
            supports_json_schema=False,
            description="HF Embedding model (768-dim)"
        ),
    ],
    "mock": [
        ModelSpec(
            provider="mock",
            model_id="deterministic-mock-v1",
            capabilities={AICapability.TEXT_GENERATION, AICapability.VISION_EXTRACTION, AICapability.STRUCTURED_OUTPUT, AICapability.EMBEDDINGS},
            embedding_dim=768,
            supports_json_schema=True,
            description="Emergency deterministic mock fallback"
        )
    ]
}


class ModelRegistry:
    """Manages active models, capabilities, and provider routing metadata."""

    def __init__(self):
        self._registry = DEFAULT_MODEL_REGISTRY

    def get_models_for_capability(self, provider: str, capability: AICapability) -> List[ModelSpec]:
        specs = self._registry.get(provider, [])
        return [m for m in specs if m.is_active and capability in m.capabilities]

    def provider_supports(self, provider: str, capability: AICapability) -> bool:
        return len(self.get_models_for_capability(provider, capability)) > 0


model_registry = ModelRegistry()

