"""
app/modules/auth/__init__.py
Authentication and user identity management module.
"""
from app.modules.auth.models import User, UserRole
from app.modules.auth.router import router

__all__ = ["User", "UserRole", "router"]
