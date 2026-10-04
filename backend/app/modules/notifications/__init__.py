"""
app/modules/notifications/__init__.py
Multi-channel notification management module.
"""
from app.modules.notifications.models import Notification, NotificationChannel
from app.modules.notifications.service import NotificationService
from app.modules.notifications.router import router

__all__ = ["Notification", "NotificationChannel", "NotificationService", "router"]
