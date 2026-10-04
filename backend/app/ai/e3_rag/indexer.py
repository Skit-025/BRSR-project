"""
E3 Engine: Guidance Indexer
Responsible for chunking and indexing BRSR guidance documents into pgvector
for semantic retrieval. This runs at startup or on demand (admin-triggered).

Current Mode:
  - Phase 1 (Now):   In-memory knowledge base from knowledge.py (no DB needed for MVP).
  - Phase 2 (Later): Chunk PDF guidance notes → embed via Gemini text-embedding-004
                     → store in PostgreSQL pgvector table `guidance_chunks`.
"""
from typing import List, Dict
from app.ai.e3_rag.knowledge import BRSR_KNOWLEDGE_BASE


def list_indexed_indicators() -> List[str]:
    """Returns all indicator codes currently in the knowledge base."""
    return list(BRSR_KNOWLEDGE_BASE.keys())


def get_chunk_count() -> int:
    """Returns the number of guidance chunks currently indexed."""
    return len(BRSR_KNOWLEDGE_BASE)


# -----------------------------------------------------------------------
# Phase 2 stub — will be activated when pgvector DB is seeded
# -----------------------------------------------------------------------

def index_pdf_guidance(pdf_path: str, db_session=None) -> int:
    """
    STUB — Phase 2: Chunks a BRSR PDF guidance note and indexes into pgvector.
    Steps:
      1. Parse PDF into text blocks using pdfplumber.
      2. Split into overlapping 512-token chunks.
      3. Embed each chunk via Gemini text-embedding-004.
      4. INSERT into `guidance_chunks` table with pgvector embedding.
    Returns: Number of chunks indexed.
    """
    raise NotImplementedError(
        "PDF-to-pgvector indexing is a Phase 2 feature. "
        "Currently using in-memory BRSR_KNOWLEDGE_BASE. "
        "Run the seed script `scripts/data_tools/index_guidance.py` to activate."
    )
