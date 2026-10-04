"""
app/pipelines/closing/__init__.py
Period-closing pipeline package.
"""
from app.pipelines.closing.pipeline import run_closing_pipeline

__all__ = ["run_closing_pipeline"]
