"""
0007_firebase_and_invitation_lifecycle.py

Revision: 0007
Revises: 0006
Create Date: 2026-10-10
Description:
    Adds Firebase Authentication and automated email invitation lifecycle fields:
    1. users.firebase_uid (VARCHAR(128))
    2. user_invitations.firebase_uid (VARCHAR(128))
    3. user_invitations.setup_link (TEXT)
    4. user_invitations.delivery_status (VARCHAR(50))
    5. user_invitations.delivery_error (TEXT)
"""
from alembic import op
import sqlalchemy as sa

revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    if "users" in tables:
        cols = [c["name"] for c in inspector.get_columns("users")]
        if "firebase_uid" not in cols:
            op.add_column("users", sa.Column("firebase_uid", sa.String(128), nullable=True))
        indexes = [i["name"] for i in inspector.get_indexes("users")]
        if "ix_users_firebase_uid" not in indexes:
            try:
                op.create_index("ix_users_firebase_uid", "users", ["firebase_uid"], unique=True)
            except Exception:
                pass

    if "user_invitations" in tables:
        cols = [c["name"] for c in inspector.get_columns("user_invitations")]
        if "firebase_uid" not in cols:
            op.add_column("user_invitations", sa.Column("firebase_uid", sa.String(128), nullable=True))
        if "setup_link" not in cols:
            op.add_column("user_invitations", sa.Column("setup_link", sa.Text(), nullable=True))
        if "delivery_status" not in cols:
            op.add_column("user_invitations", sa.Column("delivery_status", sa.String(50), server_default="PENDING", nullable=False))
        if "delivery_error" not in cols:
            op.add_column("user_invitations", sa.Column("delivery_error", sa.Text(), nullable=True))

        indexes = [i["name"] for i in inspector.get_indexes("user_invitations")]
        if "ix_user_invitations_firebase_uid" not in indexes:
            try:
                op.create_index("ix_user_invitations_firebase_uid", "user_invitations", ["firebase_uid"])
            except Exception:
                pass


def downgrade() -> None:
    pass
