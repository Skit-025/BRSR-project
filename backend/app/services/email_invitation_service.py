"""
app/services/email_invitation_service.py
Enterprise Email Invitation Dispatch Service (Phase 9).
Delivers MEIL AAROHAN branded invitation emails with secure password-setup links.
Supports Resend API and development fallback logging.
"""
import os
import logging
from typing import Optional, Tuple
from app.config.settings import settings

logger = logging.getLogger("aarohan.email")

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
    role: str,
    org_scope_name: Optional[str],
    setup_link: str
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
    .card-row {{ display: flex; margin-bottom: 8px; font-size: 14px; }}
    .card-label {{ font-weight: 600; width: 140px; color: #475569; }}
    .card-value {{ font-weight: 700; color: #0f172a; }}
    .cta-container {{ text-align: center; margin: 32px 0; }}
    .btn {{ display: inline-block; background-color: #2563eb; color: #ffffff !important; text-decoration: none; font-weight: 700; font-size: 15px; padding: 14px 32px; border-radius: 8px; box-shadow: 0 2px 4px rgba(37,99,235,0.25); }}
    .instructions {{ font-size: 14px; color: #64748b; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 20px; }}
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

      <p>To complete your account setup and activate your access, please click the secure button below to set your permanent password. For security reasons, temporary or plaintext passwords are never issued.</p>

      <div class="cta-container">
        <a href="{setup_link}" class="btn" target="_blank">Activate Account & Set Password</a>
      </div>

      <div class="instructions">
        <p><strong>Security Notice:</strong> This invitation link is valid for 7 days. If you did not anticipate this invitation or believe it was sent in error, please contact your organization's System Administrator immediately.</p>
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
    role: str,
    org_scope_name: Optional[str],
    setup_link: str
) -> str:
    role_label = ROLE_DISPLAY_NAMES.get(role, role.replace("_", " ").title())
    scope_display = org_scope_name if org_scope_name else "Enterprise Group Scope"

    return f"""MEIL AAROHAN — Enterprise ESG & Statutory Compliance Platform
============================================================

Hello {recipient_name},

You have been invited to join the MEIL AAROHAN platform as an administrator.

Account Details:
- Email Address: {recipient_email}
- Assigned Role: {role_label}
- Scope: {scope_display}

To activate your account and configure your secure permanent password, open the following link:
{setup_link}

This setup link is cryptographically generated and will expire in 7 days.
If you did not expect this invitation, please notify your administrator.

MEIL AAROHAN Enterprise Compliance System
"""


def send_invitation_email(
    recipient_name: str,
    recipient_email: str,
    role: str,
    org_scope_name: Optional[str],
    setup_link: str
) -> Tuple[bool, Optional[str]]:
    """
    Sends the branded MEIL AAROHAN invitation email via SMTP (Google Mail provider),
    or safely simulates delivery in development/placeholder mode.
    Returns: (success: bool, error_message: Optional[str])
    """
    clean_email = recipient_email.lower().strip()
    html_content = build_invitation_html(recipient_name, clean_email, role, org_scope_name, setup_link)
    text_content = build_invitation_text(recipient_name, clean_email, role, org_scope_name, setup_link)
    subject = "Invitation to join MEIL AAROHAN Platform"

    from app.services.smtp_email_service import send_smtp_email
    return send_smtp_email(
        to_email=clean_email,
        subject=subject,
        html_content=html_content,
        text_content=text_content
    )

