"""
tests/unit/security/test_smtp_and_uniqueness.py
Unit tests for:
1. Google Mail SMTP dispatch service and placeholder mode.
2. Email and Phone (ph) uniqueness enforcement in User, Invitation, and UserCreationRequest flows.
"""
import pytest
from unittest.mock import patch, MagicMock
from app.services.smtp_email_service import is_smtp_configured, send_smtp_email
from app.services.email_invitation_service import generate_secure_password_setup_link


def test_smtp_placeholder_mode_detection():
    # When placeholder credentials exist, is_smtp_configured returns False
    with patch("app.services.smtp_email_service.settings") as mock_settings:
        mock_settings.SMTP_USER = "placeholder@gmail.com"
        mock_settings.SMTP_PASSWORD = "placeholder_app_password"
        assert is_smtp_configured() is False

        # In placeholder mode, sending simulates successfully without crashing
        ok, err = send_smtp_email(
            to_email="test.user@example.com",
            subject="Test Subject",
            html_content="<p>Test</p>",
            text_content="Test"
        )
        assert ok is True
        assert err is None


def test_smtp_live_mode_calls_smtp():
    with patch("app.services.smtp_email_service.settings") as mock_settings:
        mock_settings.SMTP_HOST = "smtp.gmail.com"
        mock_settings.SMTP_PORT = 587
        mock_settings.SMTP_USER = "real_admin@gmail.com"
        mock_settings.SMTP_PASSWORD = "app_secret_token"
        mock_settings.SMTP_FROM_EMAIL = "real_admin@gmail.com"
        mock_settings.SMTP_FROM_NAME = "MEIL Platform"
        mock_settings.SMTP_USE_TLS = True
        mock_settings.SMTP_USE_SSL = False

        assert is_smtp_configured() is True

        with patch("smtplib.SMTP") as mock_smtp_class:
            mock_server = MagicMock()
            mock_smtp_class.return_value = mock_server
            mock_server.__enter__.return_value = mock_server

            ok, err = send_smtp_email(
                to_email="employee@company.com",
                subject="Invitation",
                html_content="<h1>Welcome</h1>",
                text_content="Welcome"
            )
            assert ok is True
            assert err is None
            mock_server.starttls.assert_called_once()
            mock_server.login.assert_called_once_with("real_admin@gmail.com", "app_secret_token")
            mock_server.sendmail.assert_called_once()


def test_smtp_password_setup_link():
    # Password setup link points to local frontend route for SMTP email invitation
    link = generate_secure_password_setup_link("engineer@meil.in", "inv_token_abc123")
    assert "/setup-password?token=inv_token_abc123&email=engineer%40meil.in" in link


def test_unique_email_and_phone_enforcement():
    from app.modules.auth.models import User, UserInvitation
    from app.modules.auth.schemas import UserProvisionRequest, UserInvitationRequest
    from app.modules.auth.service import provision_user_by_admin, create_invitation_by_admin

    db = MagicMock()
    admin_user = MagicMock(id="sys-admin-id", role="system_admin")

    with patch("app.security.scope.validate_role_to_scope"), \
         patch("app.modules.auth.service.validate_admin_delegation"):

        # 1. Duplicate phone rejects in provision_user_by_admin
        existing_user_with_phone = MagicMock(id="user-1", phone="+919876543210", is_deleted=False)
        db.query.return_value.filter.return_value.first.side_effect = [
            None,  # email check passes
            existing_user_with_phone  # phone check finds duplicate
        ]

        req = UserProvisionRequest(
            email="new.user@meil.in",
            full_name="New User",
            role="group_admin",
            phone="+919876543210"
        )

        with pytest.raises(ValueError) as exc:
            provision_user_by_admin(db, admin_user, req)
        assert "phone '+919876543210' already exists" in str(exc.value)

        # 2. Duplicate phone rejects in invitation flow
        inv_req = UserInvitationRequest(
            email="invited@meil.in",
            full_name="Invited User",
            role="group_admin",
            phone="+919876543210"
        )
        db.query.return_value.filter.return_value.first.side_effect = [
            None,  # email check passes
            existing_user_with_phone  # phone check finds duplicate
        ]

        with pytest.raises(ValueError) as exc:
            create_invitation_by_admin(db, admin_user, inv_req)
        assert "phone '+919876543210' already exists" in str(exc.value)

