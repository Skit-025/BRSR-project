"""
app/pipelines/aggregation/methods/__init__.py
Consolidation rollup arithmetic methods package.
"""
from app.pipelines.aggregation.methods.sum_method import aggregate_sum
from app.pipelines.aggregation.methods.ratio_method import aggregate_ratio
from app.pipelines.aggregation.methods.weighted_pct_method import aggregate_weighted_pct
from app.pipelines.aggregation.methods.latest_method import aggregate_latest
from app.pipelines.aggregation.methods.non_aggregable import format_non_aggregable

__all__ = [
    "aggregate_sum",
    "aggregate_ratio",
    "aggregate_weighted_pct",
    "aggregate_latest",
    "format_non_aggregable",
]
