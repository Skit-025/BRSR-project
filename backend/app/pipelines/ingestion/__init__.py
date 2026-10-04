"""
app/pipelines/ingestion/__init__.py
P1 Ingestion Pipeline: Authorization, Evidence persistence, Draft creation, and AI OCR dispatch.
"""
from app.pipelines.ingestion.pipeline import run_ingestion_pipeline

__all__ = ["run_ingestion_pipeline"]
