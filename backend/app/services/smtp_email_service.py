"""
app/services/smtp_email_service.py
Enterprise SMTP Email Dispatch Service for Google Mail (Gmail) and Generic SMTP Providers.
Supports:
1. Google Mail SMTP (smtp.gmail.com:587 STARTTLS / 465 SSL).
2. Development & local placeholder fallback (simulates send and logs token/link without throwing error).
3. Automatic live delivery once credentials in .env are configured.
"""
import smtplib
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr
from typing import Optional, Tuple, List

from app.config.settings import settings

logger = logging.getLogger("aarohan.smtp")

PLACEHOLDER_INDICATORS = {
    "placeholder@gmail.com",
    "placeholder_app_password",
    "your_email@gmail.com",
    "your_app_password",
    "none",
    "",
}


def is_smtp_configured() -> bool:
    """
    Checks if SMTP has real credentials or is currently using placeholders.
    """
    user = (getattr(settings, "SMTP_USER", "") or "").strip().lower()
    pwd = (getattr(settings, "SMTP_PASSWORD", "") or "").strip()

    if not user or not pwd:
        return False
    if user in PLACEHOLDER_INDICATORS or pwd in PLACEHOLDER_INDICATORS:
        return False
    if "placeholder" in user or "placeholder" in pwd:
        return False
    return True


def send_smtp_email(
    to_email: str,
    subject: str,
    html_content: str,
    text_content: Optional[str] = None,
    cc: Optional[List[str]] = None,
) -> Tuple[bool, Optional[str]]:
    """
    Sends an email using standard SMTP (Google Mail provider).
    
    If SMTP credentials are placeholders or not configured, safely logs the dispatch
    in development mode and returns (True, None) so local user workflows succeed.
    
    Once valid Google Mail credentials are provided in .env, connects and transmits
    the email directly to the recipient mailbox.
    
    Returns: (success: bool, error_message: Optional[str])
    """
    clean_to = to_email.strip().lower()
    host = getattr(settings, "SMTP_HOST", "smtp.gmail.com")
    port = int(getattr(settings, "SMTP_PORT", 587))
    user = (getattr(settings, "SMTP_USER", "") or "").strip()
    password = (getattr(settings, "SMTP_PASSWORD", "") or "").strip()
    from_email = (getattr(settings, "SMTP_FROM_EMAIL", "") or user or "noreply@meil-aarohan.com").strip()
    from_name = getattr(settings, "SMTP_FROM_NAME", "MEIL AAROHAN Platform")
    use_tls = bool(getattr(settings, "SMTP_USE_TLS", True))
    use_ssl = bool(getattr(settings, "SMTP_USE_SSL", False)) or port == 465

    # 1. Development placeholder check
    if not is_smtp_configured():
        logger.info(
            "📧 [SMTP DEV MODE - PLACEHOLDER DETECTED] Simulated dispatch to: %s | Subject: '%s' | "
            "Host: %s:%d. Configure real SMTP_USER and SMTP_PASSWORD in .env for live transmission.",
            clean_to, subject, host, port
        )
        return True, None

    # 2. Live SMTP dispatch via Google Mail
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = formataddr((from_name, from_email))
        msg["To"] = clean_to

        recipients = [clean_to]
        if cc:
            msg["Cc"] = ", ".join(cc)
            recipients.extend(c.strip().lower() for c in cc)

        # Attach text version
        if text_content:
            msg.attach(MIMEText(text_content, "plain", "utf-8"))
        
        # Attach HTML version
        if html_content:
            msg.attach(MIMEText(html_content, "html", "utf-8"))

        # Connect and authenticate
        if use_ssl:
            server = smtplib.SMTP_SSL(host, port, timeout=15)
        else:
            server = smtplib.SMTP(host, port, timeout=15)

        with server:
            if use_tls and not use_ssl:
                server.ehlo()
                server.starttls()
                server.ehlo()

            if user and password:
                server.login(user, password)

            server.sendmail(from_email, recipients, msg.as_string())

        logger.info("✅ [SMTP LIVE] Email successfully delivered to %s via %s:%d", clean_to, host, port)
        return True, None

    except smtplib.SMTPAuthenticationError as e:
        err = f"SMTP Authentication failed for user '{user}': {e.smtp_error.decode('utf-8', errors='ignore') if hasattr(e, 'smtp_error') else str(e)}"
        logger.error("❌ %s", err)
        return False, err
    except Exception as e:
        err = f"SMTP Transmission failed to {clean_to}: {str(e)}"
        logger.error("❌ %s", err)
        return False, err
