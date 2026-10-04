"""
app/ai/providers/embeddings.py
Vector embedding generator for RAG (Engine 3) and ESG standard retrieval.
"""
from typing import List
import hashlib
from app.config.settings import settings


class EmbeddingProvider:
    def __init__(self):
        self.model_name = settings.AI_EMBEDDING_MODEL

    def get_embedding(self, text: str) -> List[float]:
        """
        Generates 768-dimensional float embedding vector.
        Uses Gemini embeddings if available; otherwise uses deterministic hash-projected vector.
        """
        if settings.GEMINI_API_KEY and not settings.GEMINI_API_KEY.startswith("mock_"):
            try:
                from google import genai
                client = genai.Client(api_key=settings.GEMINI_API_KEY)
                resp = client.models.embed_content(
                    model=self.model_name,
                    contents=text,
                )
                if hasattr(resp, "embedding") and resp.embedding:
                    return resp.embedding.values
                if hasattr(resp, "embeddings") and resp.embeddings:
                    return resp.embeddings[0].values
            except Exception:
                pass

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
