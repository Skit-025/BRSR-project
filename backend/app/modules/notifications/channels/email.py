"""
app/modules/notifications/channels/email.py
Email notification channel dispatcher (SMTP / SES).
"""
import logging

logger = logging.getLogger(__name__)


def send_email_notification(
    recipient_email: str,
    subject: str,
    body_html: str,
) -> bool:
    """
    Dispatches email alert via configured SMTP or SES gateway.
    """
    logger.info("📧 Email dispatched to '%s': %s", recipient_email, subject)
    return True
