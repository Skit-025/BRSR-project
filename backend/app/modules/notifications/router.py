"""
app/modules/notifications/router.py
FastAPI router for user notifications and alert management.
Users may only access their own notifications; admins may access any user's.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime
from app.db.session import get_db
from app.modules.auth.models import User
from app.modules.auth.router import get_current_active_user
from app.modules.notifications.service import NotificationService
from app.security.rbac import Role

router = APIRouter(prefix="/notifications", tags=["Notifications & Alerts"])

_ADMIN_ROLES = {
    Role.SYSTEM_ADMIN.value,
    Role.GROUP_ADMIN.value,
    Role.SUBSIDIARY_ADMIN.value,
}


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
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Fetches notifications for a specific user.
    Users may only access their own notifications.
    Admins (system_admin, group_admin, subsidiary_admin) may access any user's.
    """
    # Only the owning user or an admin may read notifications
    if str(current_user.id) != user_id and current_user.role not in _ADMIN_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You may only access your own notifications.",
        )
    service = NotificationService(db)
    return service.list_user_notifications(user_id, unread_only=unread_only)


@router.get("/me", response_model=List[NotificationRead])
def get_my_notifications(
    unread_only: bool = Query(False),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Fetches the authenticated user's own notifications."""
    service = NotificationService(db)
    return service.list_user_notifications(str(current_user.id), unread_only=unread_only)


@router.post("/{notification_id}/read", response_model=NotificationRead)
def mark_notification_read(
    notification_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Marks a notification as read. Users may only mark their own notifications."""
    service = NotificationService(db)
    try:
        notif = service.mark_as_read(notification_id)
        # Verify ownership
        if str(notif.recipient_user_id) != str(current_user.id) and current_user.role not in _ADMIN_ROLES:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You may only mark your own notifications as read.")
        return notif
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.post("/user/{user_id}/mark-all-read")
def mark_all_notifications_read(
    user_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Marks ALL notifications for a user as read."""
    if str(current_user.id) != user_id and current_user.role not in _ADMIN_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You may only manage your own notifications.",
        )
    service = NotificationService(db)
    updated = service.mark_all_read_for_user(user_id)
    return {"marked_read": updated}
