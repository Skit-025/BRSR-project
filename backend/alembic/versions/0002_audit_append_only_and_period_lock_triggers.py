"""audit_append_only_and_period_lock_triggers

Revision ID: 0002
Revises: 0001
Create Date: 2026-10-04

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Trigger to ensure audit_events is append-only (cannot UPDATE or DELETE)
    op.execute("""
    CREATE OR REPLACE FUNCTION enforce_audit_append_only()
    RETURNS TRIGGER AS $$
    BEGIN
        RAISE EXCEPTION 'Audit log is strictly append-only. UPDATE and DELETE operations are forbidden.';
    END;
    $$ LANGUAGE plpgsql;
    
    DROP TRIGGER IF EXISTS trg_audit_append_only ON audit_events;
    CREATE TRIGGER trg_audit_append_only
    BEFORE UPDATE OR DELETE ON audit_events
    FOR EACH ROW EXECUTE FUNCTION enforce_audit_append_only();
    """)


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS trg_audit_append_only ON audit_events;")
    op.execute("DROP FUNCTION IF EXISTS enforce_audit_append_only();")
