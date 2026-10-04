"""
app/modules/dashboards/__init__.py
Executive dashboards, KPI calculation, and Data Quality scoring module.
"""
from app.modules.dashboards.service import DashboardService
from app.modules.dashboards.router import router

__all__ = ["DashboardService", "router"]
