"""
app/ai/providers/embeddings.py
Capability-aware vector embedding generator for RAG (Engine 3) and ESG standard retrieval.

Hierarchy:
1. Google Gemini Embeddings (Primary operational embedding provider)
2. Hugging Face Inference Providers (Secondary operational embedding provider)
3. Deterministic Hash Vector (Isolated local offline fallback - explicitly marked is_fallback=True)
"""
from typing import List, Tuple
import hashlib
import logging

from app.config.settings import settings

logger = logging.getLogger(__name__)


class EmbeddingProvider:
    """
    Manages vector generation ensuring fixed 768 dimensions and strict separation
    between true semantic vectors and local deterministic hash fallbacks.
    """
    TARGET_DIM = 768

    def __init__(self):
        self.gemini_model_name = settings.AI_EMBEDDING_MODEL
        self.hf_model_name = settings.HF_EMBEDDING_MODEL

    def _gemini_embedding(self, text: str) -> List[float]:
        """Generates semantic embedding via Google GenAI."""
        if not (settings.GEMINI_API_KEY and not settings.GEMINI_API_KEY.startswith("mock_")):
            raise RuntimeError("Gemini API key is not configured.")

        from google import genai
        from google.genai import types

        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        try:
            resp = client.models.embed_content(
                model=self.gemini_model_name,
                contents=text,
                config=types.EmbedContentConfig(output_dimensionality=self.TARGET_DIM),
            )
        except Exception:
            # Fall back without dimensionality if model has intrinsic width
            resp = client.models.embed_content(model=self.gemini_model_name, contents=text)

        if hasattr(resp, "embedding") and resp.embedding and hasattr(resp.embedding, "values"):
            return list(resp.embedding.values)
        if hasattr(resp, "embeddings") and resp.embeddings and len(resp.embeddings) > 0:
            return list(resp.embeddings[0].values)
        raise RuntimeError("Gemini returned no embedding values.")

    def _hf_embedding(self, text: str) -> List[float]:
        """Generates semantic embedding via Hugging Face Inference Providers."""
        from app.ai.providers.huggingface import huggingface_provider
        if not huggingface_provider.is_available():
            raise RuntimeError("Hugging Face API key is not configured.")
        return huggingface_provider.generate_embedding(text, model=self.hf_model_name)

    def _deterministic_hash_vector(self, text: str) -> List[float]:
        """
        Deterministic pseudo-embedding for testing or offline environments only.
        Warning: Not a semantic embedding model.
        """
        h = hashlib.sha256(text.encode("utf-8")).digest()
        vec = []
        for i in range(self.TARGET_DIM):
            byte_val = h[i % len(h)]
            # normalize to [-1.0, 1.0]
            val = (byte_val / 127.5) - 1.0
            vec.append(round(val, 6))
        return vec

    def get_embedding_with_meta(self, text: str) -> Tuple[List[float], str, bool]:
        """
        Generates an embedding vector returning (vector, provider_name, is_fallback).
        Prioritizes verified operational Gemini embeddings, then Hugging Face,
        and finally local deterministic pseudo-embedding as last resort.
        """
        # 1. Primary: Gemini Embeddings
        try:
            vec = self._gemini_embedding(text)
            if len(vec) == self.TARGET_DIM:
                return vec, "gemini", False
            logger.warning(f"Gemini embedding returned dimension {len(vec)} != {self.TARGET_DIM}")
        except Exception as e:
            logger.debug(f"EmbeddingProvider: Gemini embeddings unavailable ({e})")

        # 2. Secondary: Hugging Face Embeddings
        try:
            vec = self._hf_embedding(text)
            if len(vec) == self.TARGET_DIM:
                return vec, "huggingface", False
            logger.warning(f"HF embedding returned dimension {len(vec)} != {self.TARGET_DIM}")
        except Exception as e:
            logger.debug(f"EmbeddingProvider: Hugging Face embeddings unavailable ({e})")

        # 3. Last Resort: Deterministic Hash (offline fallback)
        logger.info("EmbeddingProvider: Using deterministic offline hash vector.")
        return self._deterministic_hash_vector(text), "deterministic_hash", True

    def get_embedding(self, text: str) -> List[float]:
        """Convenience method returning vector only."""
        vec, _, _ = self.get_embedding_with_meta(text)
        return vec


embedding_provider = EmbeddingProvider()
