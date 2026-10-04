"""
app/pipelines/aggregation/__init__.py
Boundary aggregation pipeline package.
"""
from app.pipelines.aggregation.pipeline import run_aggregation_pipeline
from app.pipelines.aggregation.incremental import run_incremental_aggregation

__all__ = ["run_aggregation_pipeline", "run_incremental_aggregation"]
