"""
app/modules/notifications/channels/in_app.py
In-App notification channel dispatcher.
"""
from sqlalchemy.orm import Session
from app.modules.notifications.models import Notification, NotificationChannel


def send_in_app_notification(
    db: Session,
    recipient_id: str,
    title: str,
    message: str,
    link_url: str = None,
) -> Notification:
    notif = Notification(
        recipient_user_id=recipient_id,
        title=title,
        message=message,
        channel=NotificationChannel.IN_APP.value,
        link_url=link_url,
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)
    return notif
