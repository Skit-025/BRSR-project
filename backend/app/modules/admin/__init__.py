"""
app/modules/admin/__init__.py
Administration, background jobs, and diagnostic module.
"""
from app.modules.admin.service import AdminService
from app.modules.admin.router import router

__all__ = ["AdminService", "router"]
