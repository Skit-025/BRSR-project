"""
app/modules/notifications/router.py
FastAPI router for user notifications and alert management.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime
from app.db.session import get_db
from app.modules.notifications.service import NotificationService

router = APIRouter(prefix="/notifications", tags=["Notifications & Alerts"])


class NotificationRead(BaseModel):
    id: str
    recipient_user_id: str
    title: str
    message: str
    channel: str
    is_read: bool
    read_at: Optional[datetime] = None
    link_url: Optional[str] = None
    created_at: datetime


@router.get("/user/{user_id}", response_model=List[NotificationRead])
def get_user_notifications(
    user_id: str,
    unread_only: bool = Query(False),
    db: Session = Depends(get_db),
):
    """Fetches notifications for a specific user."""
    service = NotificationService(db)
    return service.list_user_notifications(user_id, unread_only=unread_only)


@router.post("/{notification_id}/read", response_model=NotificationRead)
def mark_notification_read(notification_id: str, db: Session = Depends(get_db)):
    """Marks a notification as read."""
    service = NotificationService(db)
    try:
        return service.mark_as_read(notification_id)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.post("/user/{user_id}/mark-all-read")
def mark_all_notifications_read(user_id: str, db: Session = Depends(get_db)):
    """Marks ALL notifications for a user as read (Spec §32)."""
    service = NotificationService(db)
    updated = service.mark_all_read_for_user(user_id)
    return {"marked_read": updated}
