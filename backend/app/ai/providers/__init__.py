"""
app/ai/providers/__init__.py
AI providers package root.
"""
from app.ai.providers.base import BaseAIProvider
from app.ai.providers.gemini import GeminiProvider
from app.ai.providers.claude import ClaudeProvider
from app.ai.providers.openrouter import OpenRouterProvider
from app.ai.providers.mock import MockAIProvider
from app.ai.providers.embeddings import embedding_provider, EmbeddingProvider
from app.ai.providers.ocr_local import extract_text_from_pdf_bytes, extract_key_values_regex

__all__ = [
    "BaseAIProvider",
    "GeminiProvider",
    "ClaudeProvider",
    "OpenRouterProvider",
    "MockAIProvider",
    "embedding_provider",
    "EmbeddingProvider",
    "extract_text_from_pdf_bytes",
    "extract_key_values_regex",
]
