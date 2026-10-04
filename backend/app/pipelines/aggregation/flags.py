"""
app/pipelines/aggregation/flags.py
Aggregation control flags and configuration parameters.
"""
from pydantic import BaseModel


class AggregationFlags(BaseModel):
    apply_operational_boundary: bool = True
    normalize_units_strictly: bool = True
    run_derived_calculations: bool = True
    persist_audit_lineage: bool = True
    refresh_dashboard_views: bool = True
    allow_partial_period_rollup: bool = False
