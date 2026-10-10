"""
app/services/email_invitation_service.py
Enterprise Email Invitation Dispatch Service (Phase 9).
Delivers MEIL AAROHAN branded invitation emails with secure password-setup links.
Supports Resend API and development fallback logging.
"""
import os
import logging
from typing import Optional, Tuple
from urllib.parse import quote
from app.config.settings import settings

logger = logging.getLogger("aarohan.email")

def generate_secure_password_setup_link(
    email: str,
    invitation_token: str,
    redirect_url: Optional[str] = None
) -> str:
    """
    Generates a secure password-setup onboarding link for SMTP email invitation.
    """
    clean_email = email.lower().strip()
    frontend_base = getattr(settings, "FRONTEND_BASE_URL", "http://localhost:5173").rstrip("/")
    setup_link = f"{frontend_base}/setup-password?token={invitation_token}&email={quote(clean_email)}"
    logger.info("Generated secure application onboarding link for %s", clean_email)
    return setup_link


ROLE_DISPLAY_NAMES = {
    "system_admin": "System Administrator",
    "group_admin": "Group Administrator",
    "subsidiary_admin": "Subsidiary Administrator",
    "bu_admin": "Business Unit Administrator",
    "project_admin": "Project Administrator",
}


def build_invitation_html(
    recipient_name: str,
    recipient_email: str,
    temp_password: str,
    role: str,
    org_scope_name: Optional[str],
    login_url: str = "http://localhost:5173/login"
) -> str:
    role_label = ROLE_DISPLAY_NAMES.get(role, role.replace("_", " ").title())
    scope_display = org_scope_name if org_scope_name else "Enterprise Group Scope"

    return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to MEIL AAROHAN</title>
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 0; line-height: 1.6; }}
    .container {{ max-width: 600px; margin: 30px auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }}
    .header {{ background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); padding: 32px 24px; text-align: center; color: #ffffff; }}
    .logo-title {{ font-size: 22px; font-weight: 800; letter-spacing: 0.5px; margin: 0; color: #ffffff; }}
    .logo-subtitle {{ font-size: 13px; color: #93c5fd; margin-top: 6px; font-weight: 500; text-transform: uppercase; letter-spacing: 1px; }}
    .content {{ padding: 32px 28px; }}
    .greeting {{ font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 16px; }}
    .card {{ background-color: #f1f5f9; border-radius: 8px; padding: 20px; margin: 24px 0; border-left: 4px solid #2563eb; }}
    .cred-card {{ background-color: #0f172a; color: #f8fafc; border-radius: 8px; padding: 18px 20px; margin: 20px 0; border: 1px solid #334155; }}
    .cred-title {{ font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8; font-weight: 700; margin-bottom: 8px; }}
    .cred-row {{ display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; font-size: 13px; }}
    .cred-val {{ font-family: ui-monospace, Menlo, Monaco, Consolas, monospace; font-weight: 700; color: #60a5fa; font-size: 14px; background: rgba(255,255,255,0.08); padding: 2px 8px; border-radius: 4px; }}
    .cta-container {{ text-align: center; margin: 32px 0; }}
    .btn {{ display: inline-block; background-color: #2563eb; color: #ffffff !important; text-decoration: none; font-weight: 700; font-size: 15px; padding: 14px 32px; border-radius: 8px; box-shadow: 0 2px 4px rgba(37,99,235,0.25); }}
    .instructions {{ font-size: 13px; color: #64748b; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 20px; }}
    .notice-box {{ background-color: #fef3c7; border: 1px solid #fde68a; color: #92400e; padding: 12px 16px; border-radius: 6px; font-size: 13px; margin: 16px 0; font-weight: 500; }}
    .footer {{ background-color: #f8fafc; padding: 20px 28px; font-size: 12px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo-title">MEIL AAROHAN</div>
      <div class="logo-subtitle">Enterprise ESG & Statutory Compliance Platform</div>
    </div>
    <div class="content">
      <div class="greeting">Hello {recipient_name},</div>
      <p>You have been officially invited to join the <strong>MEIL AAROHAN Enterprise ESG Platform</strong>. Your administrator has provisioned your account with operational administrative privileges.</p>
      
      <div class="card">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 6px 0; color: #475569; font-weight: 600; width: 140px;">Account Email:</td>
            <td style="padding: 6px 0; color: #0f172a; font-weight: 700;">{recipient_email}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #475569; font-weight: 600;">Assigned Role:</td>
            <td style="padding: 6px 0; color: #2563eb; font-weight: 700;">{role_label}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #475569; font-weight: 600;">Organizational Scope:</td>
            <td style="padding: 6px 0; color: #0f172a; font-weight: 700;">{scope_display}</td>
          </tr>
        </table>
      </div>

      <div class="cred-card">
        <div class="cred-title">Your Login Credentials</div>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr>
            <td style="padding: 4px 0; color: #cbd5e1;">Username / Email:</td>
            <td style="padding: 4px 0; text-align: right;"><span class="cred-val">{recipient_email}</span></td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #cbd5e1;">Temporary Password:</td>
            <td style="padding: 4px 0; text-align: right;"><span class="cred-val">{temp_password}</span></td>
          </tr>
        </table>
      </div>

      <div class="notice-box">
        <strong>Notice:</strong> This invitation email and temporary access credentials will expire in 7 days. Please log in promptly to activate your account.
      </div>

      <div class="cta-container">
        <a href="{login_url}" class="btn" target="_blank">Log In to MEIL AAROHAN</a>
      </div>

      <div class="instructions">
        <p>Upon your first login, your account will be fully activated. You will be prompted to replace this temporary password with your permanent password of choice.</p>
      </div>
    </div>
    <div class="footer">
      &copy; 2026 MEIL AAROHAN. Confidential Enterprise Statutory Reporting System.<br>
      Automated administrative notification &bull; Do not reply to this email.
    </div>
  </div>
</body>
</html>"""


def build_invitation_text(
    recipient_name: str,
    recipient_email: str,
    temp_password: str,
    role: str,
    org_scope_name: Optional[str],
    login_url: str = "http://localhost:5173/login"
) -> str:
    role_label = ROLE_DISPLAY_NAMES.get(role, role.replace("_", " ").title())
    scope_display = org_scope_name if org_scope_name else "Enterprise Group Scope"

    return f"""MEIL AAROHAN — Enterprise ESG & Statutory Compliance Platform
============================================================

Hello {recipient_name},

You have been invited to join the MEIL AAROHAN platform as an administrator.

Account Credentials:
- Email Address: {recipient_email}
- Temporary Password: {temp_password}
- Assigned Role: {role_label}
- Scope: {scope_display}

Login Portal:
{login_url}

Notice: This invitation email and temporary access credentials will expire in 7 days.
Upon your initial login, your account will be activated and you will be prompted to set your permanent password.

MEIL AAROHAN Enterprise Compliance System
"""


def send_invitation_email(
    recipient_name: str,
    recipient_email: str,
    role: str,
    org_scope_name: Optional[str],
    setup_link: str,
    temp_password: str = ""
) -> Tuple[bool, Optional[str]]:
    """
    Sends the branded MEIL AAROHAN invitation email with strong generated credentials via SMTP,
    or safely simulates delivery in development/placeholder mode.
    Returns: (success: bool, error_message: Optional[str])
    """
    clean_email = recipient_email.lower().strip()
    login_url = "http://localhost:5173/login"
    html_content = build_invitation_html(recipient_name, clean_email, temp_password, role, org_scope_name, login_url)
    text_content = build_invitation_text(recipient_name, clean_email, temp_password, role, org_scope_name, login_url)
    subject = "Welcome to MEIL AAROHAN — Your Account Credentials"

    from app.services.smtp_email_service import send_smtp_email
    return send_smtp_email(
        to_email=clean_email,
        subject=subject,
        html_content=html_content,
        text_content=text_content
    )

