"""
app/modules/lineage/__init__.py
Audit lineage and 3-click provenance tracing module.
"""
from app.modules.lineage.service import build_metric_lineage
from app.modules.lineage.router import router

__all__ = ["build_metric_lineage", "router"]
