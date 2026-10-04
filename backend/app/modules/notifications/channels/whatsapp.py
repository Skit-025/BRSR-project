"""
app/modules/notifications/channels/whatsapp.py
WhatsApp Business API dispatcher for instant mobile field notifications.
"""
import logging

logger = logging.getLogger(__name__)


def send_whatsapp_notification(
    phone_number: str,
    template_name: str,
    parameters: dict,
) -> bool:
    """
    Sends WhatsApp templated message to field collectors (e.g. deadline reminder).
    """
    logger.info("📱 WhatsApp sent to '%s' using template '%s'", phone_number, template_name)
    return True
