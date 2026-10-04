"""
app/pipelines/reporting/__init__.py
Reporting generation pipeline package.
"""
from app.pipelines.reporting.pipeline import run_reporting_pipeline

__all__ = ["run_reporting_pipeline"]
