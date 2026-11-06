"""
app/ai/providers/embeddings.py
Vector embedding generator for RAG (Engine 3) and ESG standard retrieval.

Order: Hugging Face Inference Providers -> Gemini -> deterministic hash vector.
"""
from typing import List
import hashlib
import logging

from app.config.settings import settings
from app.ai.providers.huggingface import huggingface_provider

logger = logging.getLogger(__name__)


class EmbeddingProvider:
    def __init__(self):
        self.model_name = settings.AI_EMBEDDING_MODEL

    def _hf_embedding(self, text: str) -> List[float]:
        if not huggingface_provider.is_available():
            raise RuntimeError("Hugging Face API key is not configured.")
        return huggingface_provider.generate_embedding(text, model=settings.HF_EMBEDDING_MODEL)

    # Keep Gemini vectors the same width as the HF/hash vectors (768) so callers can
    # swap providers without changing their similarity maths.
    TARGET_DIM = 768

    def _gemini_embedding(self, text: str) -> List[float]:
        if not (settings.GEMINI_API_KEY and not settings.GEMINI_API_KEY.startswith("mock_")):
            raise RuntimeError("Gemini API key is not configured.")

        from google import genai
        from google.genai import types

        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        try:
            resp = client.models.embed_content(
                model=self.model_name,
                contents=text,
                config=types.EmbedContentConfig(output_dimensionality=self.TARGET_DIM),
            )
        except Exception:
            # Not every Gemini embedding model accepts output_dimensionality.
            resp = client.models.embed_content(model=self.model_name, contents=text)
        if hasattr(resp, "embedding") and resp.embedding:
            return resp.embedding.values
        if hasattr(resp, "embeddings") and resp.embeddings:
            return resp.embeddings[0].values
        raise RuntimeError("Gemini returned no embedding values.")

    def get_embedding(self, text: str) -> List[float]:
        """
        Generates a float embedding vector.
        Uses Hugging Face first, then Gemini, then a deterministic hash-projected vector.
        """
        try:
            return self._hf_embedding(text)
        except Exception as e:
            logger.debug(f"EmbeddingProvider: Hugging Face embeddings unavailable ({e}).")

        try:
            return self._gemini_embedding(text)
        except Exception as e:
            logger.debug(f"EmbeddingProvider: Gemini embeddings unavailable ({e}).")

        # Deterministic pseudo-embedding for testing/offline environments
        dim = 768
        h = hashlib.sha256(text.encode("utf-8")).digest()
        vec = []
        for i in range(dim):
            byte_val = h[i % len(h)]
            # normalize to range [-1.0, 1.0]
            val = (byte_val / 127.5) - 1.0
            vec.append(round(val, 6))
        return vec


embedding_provider = EmbeddingProvider()
