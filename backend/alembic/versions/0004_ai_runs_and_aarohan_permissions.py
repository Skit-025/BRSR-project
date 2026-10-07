"""ai_runs_and_aarohan_permissions

Revision ID: 0004
Revises: 0003
Create Date: 2026-10-08
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB

revision: str = "0004"
down_revision: Union[str, None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = inspector.get_table_names()

    # 1. Create ai_runs table if not exists
    if "ai_runs" not in existing_tables:
        op.create_table(
            "ai_runs",
            sa.Column("id", UUID(as_uuid=False), primary_key=True, server_default=sa.text("gen_random_uuid()")),
            sa.Column("engine", sa.String(50), nullable=False),
            sa.Column("model", sa.String(100), nullable=False),
            sa.Column("model_version", sa.String(50), nullable=True),
            sa.Column("prompt_version", sa.String(50), nullable=False, server_default="v1.0"),
            sa.Column("input_ref", sa.String(255), nullable=True),
            sa.Column("output", JSONB, nullable=False),
            sa.Column("confidence", sa.Numeric(precision=5, scale=4), nullable=True),
            sa.Column("citations", JSONB, nullable=True),
            sa.Column("latency_ms", sa.Integer(), nullable=True),
            sa.Column("status", sa.String(50), nullable=False, server_default="proposed"),
            sa.Column("reviewer_id", UUID(as_uuid=False), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("final_ref", sa.String(255), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        )
        op.create_index("ix_ai_runs_engine", "ai_runs", ["engine"])
        op.create_index("ix_ai_runs_status", "ai_runs", ["status"])
        op.create_index("ix_ai_runs_reviewer_id", "ai_runs", ["reviewer_id"])
        op.create_index("ix_ai_runs_created_at", "ai_runs", ["created_at"])

    # 2. Ensure ai_extracted column exists on evidence_files for legacy/adapter updates
    if "evidence_files" in existing_tables:
        ev_cols = [c["name"] for c in inspector.get_columns("evidence_files")]
        if "ai_extracted" not in ev_cols:
            op.add_column("evidence_files", sa.Column("ai_extracted", sa.Text(), nullable=True))

    # 3. Create compatibility view data_entries for legacy Celery tasks
    op.execute("""
        CREATE OR REPLACE VIEW data_entries AS
        SELECT 
            dp.id,
            dp.submission_id,
            s.entity_id,
            s.period_id,
            m.id AS metric_id,
            dp.metric_code,
            dp.value_numeric,
            dp.value_text,
            dp.unit,
            dp.status,
            dp.created_at,
            dp.updated_at,
            dp.is_deleted
        FROM data_points dp
        JOIN submissions s ON s.id = dp.submission_id
        LEFT JOIN metrics m ON m.code = dp.metric_code;
    """)

    # 4. Create role_engine_permissions table to store mapping as data
    if "role_engine_permissions" not in existing_tables:
        op.create_table(
            "role_engine_permissions",
            sa.Column("id", UUID(as_uuid=False), primary_key=True, server_default=sa.text("gen_random_uuid()")),
            sa.Column("role", sa.String(50), nullable=False),
            sa.Column("engine", sa.String(50), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.UniqueConstraint("role", "engine", name="uq_role_engine"),
        )
        op.create_index("ix_role_engine_role", "role_engine_permissions", ["role"])

    # 5. Seed authoritative mapping
    seed_mappings = [
        # Canonical roles in BRSR-project
        ("maker", "E1"),
        ("checker", "E2"),
        ("checker", "E7"),
        ("esg_manager", "E3"),
        ("esg_manager", "E4"),
        ("esg_manager", "E5"),
        ("esg_manager", "E6"),
        # Alias role names supported by specification
        ("project_data_entry_user", "E1"),
        ("bu_reviewer", "E2"),
        ("bu_reviewer", "E7"),
        ("bu_esg_manager", "E2"),
        ("bu_esg_manager", "E7"),
        ("subsidiary_esg_manager", "E3"),
        ("subsidiary_esg_manager", "E4"),
        ("subsidiary_esg_manager", "E5"),
        ("subsidiary_esg_manager", "E6"),
        ("group_esg_manager", "E3"),
        ("group_esg_manager", "E4"),
        ("group_esg_manager", "E5"),
        ("group_esg_manager", "E6"),
    ]
    
    for role_name, engine_name in seed_mappings:
        bind.execute(
            sa.text(
                "INSERT INTO role_engine_permissions (id, role, engine, created_at) "
                "VALUES (gen_random_uuid(), :role, :engine, NOW()) "
                "ON CONFLICT (role, engine) DO NOTHING"
            ),
            {"role": role_name, "engine": engine_name}
        )


def downgrade() -> None:
    op.execute("DROP VIEW IF EXISTS data_entries;")
    op.drop_table("role_engine_permissions")
