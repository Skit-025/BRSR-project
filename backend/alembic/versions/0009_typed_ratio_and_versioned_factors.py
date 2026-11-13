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

    # 2. Emission factors: use the active canonical model name on fresh installs,
    # while retaining compatibility with older databases that used emission_factors.
    tables = insp.get_table_names()
    factor_table = "emission_factors" if "emission_factors" in tables else "statutory_factors"
    if factor_table in tables:
        ef_cols = [c["name"] for c in insp.get_columns(factor_table)]
    else:
        ef_cols = []
    
    if "version" not in ef_cols:
        op.add_column(
            factor_table,
            sa.Column("version", sa.String(20), nullable=False, server_default="1.0"),
        )
    if "effective_from" not in ef_cols:
        op.add_column(
            factor_table,
            sa.Column("effective_from", sa.Date(), nullable=True),
        )
    if "effective_to" not in ef_cols:
        op.add_column(
            factor_table,
            sa.Column("effective_to", sa.Date(), nullable=True),
        )
    if "superseded_by" not in ef_cols:
        op.add_column(
            factor_table,
            sa.Column("superseded_by", sa.String(50), nullable=True),
        )
    if "change_reason" not in ef_cols:
        op.add_column(
            factor_table,
            sa.Column("change_reason", sa.Text(), nullable=True),
        )

    # Replace unique index on code with composite on (code, version)
    if factor_table in tables:
        op.execute(f"DROP INDEX IF EXISTS ix_{factor_table}_code;")
        op.execute(f"CREATE UNIQUE INDEX IF NOT EXISTS ix_{factor_table}_code_version ON {factor_table}(code, version);")

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
    
    conn = op.get_bind()
    tables = sa.inspect(conn).get_table_names()
    factor_table = "emission_factors" if "emission_factors" in tables else "statutory_factors"
    if factor_table in tables:
        op.execute(f"DROP INDEX IF EXISTS ix_{factor_table}_code_version;")
        op.execute(f"CREATE UNIQUE INDEX IF NOT EXISTS ix_{factor_table}_code ON {factor_table}(code);")
        for column in ("change_reason", "superseded_by", "effective_to", "effective_from", "version"):
            op.drop_column(factor_table, column)

    op.drop_column("consolidated_values", "status_reason")
    op.drop_column("consolidated_values", "status")
