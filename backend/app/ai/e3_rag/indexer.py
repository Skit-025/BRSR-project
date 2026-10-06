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
    Chunks a BRSR PDF guidance note and indexes it into the guidance knowledge base.
    Extracts text from the PDF, chunks into structured sections, and loads into memory / DB.
    Returns: Number of chunks indexed.
    """
    import os
    if not os.path.exists(pdf_path):
        raise FileNotFoundError(f"Guidance PDF not found at {pdf_path}")

    chunks_extracted = 0
    extracted_text = ""

    # 1. Parse PDF using available libraries
    try:
        import pdfplumber
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                text = page.extract_text() or ""
                if text.strip():
                    extracted_text += "\n" + text
    except Exception:
        try:
            import pypdf
            reader = pypdf.PdfReader(pdf_path)
            for page in reader.pages:
                text = page.extract_text() or ""
                if text.strip():
                    extracted_text += "\n" + text
        except Exception as e:
            # Fallback plain text read if not binary PDF
            with open(pdf_path, "r", encoding="utf-8", errors="ignore") as f:
                extracted_text = f.read()

    # 2. Split into semantic chunks
    lines = [line.strip() for line in extracted_text.splitlines() if line.strip()]
    current_chunk = []
    chunk_size = 350
    words_count = 0

    for line in lines:
        current_chunk.append(line)
        words_count += len(line.split())
        if words_count >= chunk_size:
            chunk_content = " ".join(current_chunk)
            key = f"CUSTOM_PDF_CHUNK_{chunks_extracted + 1}"
            BRSR_KNOWLEDGE_BASE[key] = {
                "section": "SEBI BRSR Guidance Note",
                "indicator_code": key,
                "citation": f"{os.path.basename(pdf_path)} - Section {chunks_extracted + 1}",
                "guidance": chunk_content,
                "unit": "N/A",
                "keywords": ["guidance", "pdf", "sebi", "brsr"],
            }
            chunks_extracted += 1
            current_chunk = []
            words_count = 0

    if current_chunk:
        chunk_content = " ".join(current_chunk)
        key = f"CUSTOM_PDF_CHUNK_{chunks_extracted + 1}"
        BRSR_KNOWLEDGE_BASE[key] = {
            "section": "SEBI BRSR Guidance Note",
            "indicator_code": key,
            "citation": f"{os.path.basename(pdf_path)} - Section {chunks_extracted + 1}",
            "guidance": chunk_content,
            "unit": "N/A",
            "keywords": ["guidance", "pdf", "sebi", "brsr"],
        }
        chunks_extracted += 1

    return chunks_extracted

