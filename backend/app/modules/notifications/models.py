"""
app/modules/notifications/models.py
Notification models for In-App alerts, Email, and WhatsApp field notifications.
"""
import enum
from sqlalchemy import Column, String, Text, Boolean, DateTime, text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from datetime import datetime, timezone
import uuid
from app.db.base import Base, TimestampMixin


class NotificationChannel(str, enum.Enum):
    IN_APP = "IN_APP"
    EMAIL = "EMAIL"
    WHATSAPP = "WHATSAPP"


class Notification(Base, TimestampMixin):
    """
    User notification record.
    """
    __tablename__ = "notifications"

    id = Column(
        PG_UUID(as_uuid=False),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
        default=lambda: str(uuid.uuid4()),
        index=True,
    )
    recipient_user_id = Column(String(36), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    channel = Column(String(50), default=NotificationChannel.IN_APP.value, nullable=False)
    is_read = Column(Boolean, default=False, nullable=False, index=True)
    read_at = Column(DateTime(timezone=True), nullable=True)
    link_url = Column(String(500), nullable=True)
