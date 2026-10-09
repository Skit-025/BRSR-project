"""
0006_hierarchical_deletion_and_audit.py

Revision: 0006
Revises: 0005
Create Date: 2026-10-09
Description:
    Adds evidence deletion metadata and audit indexes:
    1. deleted_at (TIMESTAMPTZ)
    2. deleted_by_id (UUID references users.id)
    3. deleted_by_role (VARCHAR(50))
    4. deletion_reason (TEXT)
    5. Soft-deletion indexes on evidence_files
"""
from alembic import op
import sqlalchemy as sa

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    if "evidence_files" in tables:
        cols = [c["name"] for c in inspector.get_columns("evidence_files")]
        if "deleted_at" not in cols:
            op.add_column("evidence_files", sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))
        if "deleted_by_id" not in cols:
            op.add_column("evidence_files", sa.Column("deleted_by_id", sa.String(36), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True))
        if "deleted_by_role" not in cols:
            op.add_column("evidence_files", sa.Column("deleted_by_role", sa.String(50), nullable=True))
        if "deletion_reason" not in cols:
            op.add_column("evidence_files", sa.Column("deletion_reason", sa.Text(), nullable=True))

        indexes = [i["name"] for i in inspector.get_indexes("evidence_files")]
        if "ix_evidence_files_deleted_by" not in indexes:
            try:
                op.create_index("ix_evidence_files_deleted_by", "evidence_files", ["deleted_by_id"])
            except Exception:
                pass
        if "ix_evidence_files_deleted_at" not in indexes:
            try:
                op.create_index("ix_evidence_files_deleted_at", "evidence_files", ["deleted_at"])
            except Exception:
                pass


def downgrade() -> None:
    pass
