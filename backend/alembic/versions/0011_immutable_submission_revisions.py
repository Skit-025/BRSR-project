"""Persist immutable report snapshots for every submission revision.

Revision ID: 0011
Revises: 0010
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0011"
down_revision = "0010"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "submission_revisions",
        sa.Column("submission_id", postgresql.UUID(as_uuid=False), sa.ForeignKey("submissions.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("revision_number", sa.Integer(), nullable=False),
        sa.Column("status_at_submission", sa.String(50), nullable=False),
        sa.Column("submitted_by_id", postgresql.UUID(as_uuid=False), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("snapshot", postgresql.JSONB(), nullable=False),
        sa.Column("snapshot_sha256", sa.String(64), nullable=False),
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("submission_id", "revision_number", name="uq_submission_revision_number"),
    )
    op.create_index("ix_submission_revisions_submission_id", "submission_revisions", ["submission_id"])
    op.add_column("reviews", sa.Column("submission_revision_id", postgresql.UUID(as_uuid=False), nullable=True))
    op.create_foreign_key("fk_reviews_submission_revision_id", "reviews", "submission_revisions", ["submission_revision_id"], ["id"], ondelete="RESTRICT")
    op.create_index("ix_reviews_submission_revision_id", "reviews", ["submission_revision_id"])


def downgrade():
    op.drop_index("ix_reviews_submission_revision_id", table_name="reviews")
    op.drop_constraint("fk_reviews_submission_revision_id", "reviews", type_="foreignkey")
    op.drop_column("reviews", "submission_revision_id")
    op.drop_index("ix_submission_revisions_submission_id", table_name="submission_revisions")
    op.drop_table("submission_revisions")
