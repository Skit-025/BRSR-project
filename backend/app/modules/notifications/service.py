"""
app/modules/notifications/service.py
Service layer for notifying users across In-App, Email, and WhatsApp channels.
"""
from typing import List, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.modules.notifications.models import Notification
from app.modules.notifications.channels.in_app import send_in_app_notification
from app.modules.notifications.channels.email import send_email_notification
from app.modules.notifications.channels.whatsapp import send_whatsapp_notification
from app.config.feature_flags import feature_flags


class NotificationService:
    def __init__(self, db: Session):
        self.db = db

    def notify_user(
        self,
        recipient_id: str,
        title: str,
        message: str,
        link_url: Optional[str] = None,
        recipient_email: Optional[str] = None,
        recipient_phone: Optional[str] = None,
    ) -> Notification:
        # Always persist in-app notification
        notif = send_in_app_notification(self.db, recipient_id, title, message, link_url)

        # Optional Email channel
        if feature_flags.ENABLE_EMAIL_NOTIFICATIONS and recipient_email:
            send_email_notification(recipient_email, title, message)

        # Optional WhatsApp channel
        if feature_flags.ENABLE_WHATSAPP_NOTIFICATIONS and recipient_phone:
            send_whatsapp_notification(recipient_phone, "submission_alert", {"title": title, "message": message})

        return notif

    def list_user_notifications(self, user_id: str, unread_only: bool = False) -> List[Notification]:
        query = self.db.query(Notification).filter(Notification.recipient_user_id == user_id)
        if unread_only:
            query = query.filter(Notification.is_read == False)
        return query.order_by(Notification.created_at.desc()).all()

    def mark_as_read(self, notification_id: str) -> Notification:
        notif = self.db.query(Notification).filter(Notification.id == notification_id).first()
        if not notif:
            raise ValueError(f"Notification '{notification_id}' not found.")
        notif.is_read = True
        notif.read_at = datetime.now(timezone.utc)
        self.db.commit()
        self.db.refresh(notif)
        return notif
