"""
E1 Engine: Internal Schemas
Defines intermediate data structures used during the extraction pipeline
before normalization to the public ExtractedField schema.
"""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class RawOCRResult(BaseModel):
    """Raw text blocks extracted by OCR before AI field mapping."""
    page: int
    text: str
    bbox: Optional[List[float]] = None
    confidence: float = 1.0


class RawExtractionOutput(BaseModel):
    """
    Intermediate AI output structure before validation and normalization.
    The AI gateway maps this to the public E1ExtractResponse.
    """
    doc_type: str = "unknown_document"
    raw_fields: List[Dict[str, Any]] = Field(default_factory=list)
    ocr_blocks: List[RawOCRResult] = Field(default_factory=list)
    extraction_notes: Optional[str] = None
