"""
app/ai/e1_extract/__init__.py
Engine 1: Vision OCR & Evidence Extraction package.
"""
from app.ai.e1_extract.extractor import e1_engine

# backward-compat alias
e1_extractor = e1_engine

__all__ = ["e1_engine", "e1_extractor"]
