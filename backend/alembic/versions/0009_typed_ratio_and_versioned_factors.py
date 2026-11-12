"""
0009_typed_ratio_and_versioned_factors.py

Revision: 0009
Revises: 0008
Create Date: 2026-11-09
Description:
    1. Adds typed calculation result columns (status, status_reason) to consolidated_values,
       and allows NULL values for undefined mathematical ratios.
    2. Adds versioning columns to emission_factors (version, effective_from, effective_to,
       superseded_by, change_reason) with composite unique index (code, version).
    3. Creates factor_change_audit_logs table to track full provenance of all statutory factors.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0009"
down_revision = "0008"
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    insp = sa.inspect(conn)

    # 1. Consolidated values: allow NULL value and add status tracking
    op.alter_column("consolidated_values", "value", nullable=True)
    
    cv_cols = [c["name"] for c in insp.get_columns("consolidated_values")]
    if "status" not in cv_cols:
        op.add_column(
            "consolidated_values",
            sa.Column("status", sa.String(50), nullable=False, server_default="CALCULATED"),
        )
    if "status_reason" not in cv_cols:
        op.add_column(
            "consolidated_values",
            sa.Column("status_reason", sa.Text(), nullable=True),
        )

    # 2. Emission factors: versioning and lifecycle columns
    ef_cols = [c["name"] for c in insp.get_columns("emission_factors")]
    
    if "version" not in ef_cols:
        op.add_column(
            "emission_factors",
            sa.Column("version", sa.String(20), nullable=False, server_default="1.0"),
        )
    if "effective_from" not in ef_cols:
        op.add_column(
            "emission_factors",
            sa.Column("effective_from", sa.Date(), nullable=True),
        )
    if "effective_to" not in ef_cols:
        op.add_column(
            "emission_factors",
            sa.Column("effective_to", sa.Date(), nullable=True),
        )
    if "superseded_by" not in ef_cols:
        op.add_column(
            "emission_factors",
            sa.Column("superseded_by", sa.String(50), nullable=True),
        )
    if "change_reason" not in ef_cols:
        op.add_column(
            "emission_factors",
            sa.Column("change_reason", sa.Text(), nullable=True),
        )

    # Replace unique index on code with composite on (code, version)
    op.execute("DROP INDEX IF EXISTS ix_emission_factors_code;")
    op.execute("CREATE UNIQUE INDEX IF NOT EXISTS ix_emission_factors_code_version ON emission_factors(code, version);")

    # 3. Factor change audit log table
    tables = insp.get_table_names()
    if "factor_change_audit_logs" not in tables:
        op.create_table(
            "factor_change_audit_logs",
            sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
            sa.Column("factor_code", sa.String(50), nullable=False, index=True),
            sa.Column("factor_version", sa.String(20), nullable=False),
            sa.Column("old_value", sa.Numeric(20, 8), nullable=True),
            sa.Column("new_value", sa.Numeric(20, 8), nullable=False),
            sa.Column("unit", sa.String(50), nullable=False),
            sa.Column("source", sa.String(255), nullable=False),
            sa.Column("effective_year", sa.String(20), nullable=False),
            sa.Column("reason_for_change", sa.Text(), nullable=False),
            sa.Column("changed_by", sa.String(100), nullable=False, server_default="SYSTEM_AUDITOR"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        )


def downgrade():
    conn = op.get_bind()
    insp = sa.inspect(conn)
    tables = insp.get_table_names()
    if "factor_change_audit_logs" in tables:
        op.drop_table("factor_change_audit_logs")
    
    op.execute("DROP INDEX IF EXISTS ix_emission_factors_code_version;")
    op.execute("CREATE UNIQUE INDEX IF NOT EXISTS ix_emission_factors_code ON emission_factors(code);")

    op.drop_column("emission_factors", "change_reason")
    op.drop_column("emission_factors", "superseded_by")
    op.drop_column("emission_factors", "effective_to")
    op.drop_column("emission_factors", "effective_from")
    op.drop_column("emission_factors", "version")

    op.drop_column("consolidated_values", "status_reason")
    op.drop_column("consolidated_values", "status")
