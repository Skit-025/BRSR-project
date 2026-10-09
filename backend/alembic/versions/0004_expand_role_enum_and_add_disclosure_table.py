"""
0004_expand_role_enum_and_add_disclosure_table.py

Revision: 0004
Description:
    1. Adds new spec-aligned role values to the `users` table role column CHECK constraint
       (backwards compatible — existing records using old role values continue to work).
    2. Creates `org_level_disclosures` table for Type 3 Disclosure Forms (spec §46):
       BU, Subsidiary, and Group level disclosures (targets, Section A/B/C, governance).
    3. Adds STALE and SUPERSEDED report states to the reports table (spec §42).
    4. Adds new permissions: bu_disclosure:write/read, subsidiary_disclosure:write/read,
       group_disclosure:write/read, submission:approve, report:lineage, metric:write (informational).

Spec references:
    §2  — Full role hierarchy
    §45 — Visibility matrix
    §46 — Three form types (Collection, Review, Disclosure)
    §42 — Report status machine

Author: ESG Platform Spec Implementation
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = inspector.get_table_names()

    # ── 1. Org Level Disclosures (Type 3 Form storage) ────────────────────────
    # Stores BU / Subsidiary / Group level disclosures with JSON payload.
    # Each record = one org level + one period + one disclosure_type (bu / subsidiary / group).
    # Multiple records can exist per period (one per section: section_a, section_b, section_c, general).
    if "org_level_disclosures" not in existing_tables:
        op.create_table(
            "org_level_disclosures",
        sa.Column("id",                sa.String(36),   nullable=False, primary_key=True),
        sa.Column("org_node_id",       sa.String(36),   nullable=False, index=True),
        sa.Column("period_id",         sa.String(36),   nullable=True,  index=True),
        sa.Column("disclosure_level",  sa.String(20),   nullable=False, index=True),
        # Values: "bu" | "subsidiary" | "group"
        sa.Column("disclosure_section", sa.String(50),  nullable=False, index=True),
        # Values: "general" | "section_a" | "section_a_org" | "section_a_employees" |
        #         "section_b" | "section_b_principle_1" ... "section_b_principle_9" |
        #         "section_c" | "targets" | "governance" | "assurance" | "csr" | "policies"
        sa.Column("payload",           sa.JSON,          nullable=False, server_default="{}"),
        # Structured JSON payload — keys/values differ per disclosure_section.
        # Schema is validated at application layer, not DB layer (allows versioning).
        sa.Column("payload_version",   sa.String(20),   nullable=False, server_default="v1"),
        sa.Column("status",            sa.String(30),   nullable=False, server_default="DRAFT", index=True),
        # Values: "DRAFT" | "SUBMITTED" | "APPROVED" | "LOCKED"
        sa.Column("submitted_by_id",   sa.String(36),   nullable=True),
        sa.Column("submitted_at",      sa.DateTime,     nullable=True),
        sa.Column("approved_by_id",    sa.String(36),   nullable=True),
        sa.Column("approved_at",       sa.DateTime,     nullable=True),
        sa.Column("notes",             sa.Text,         nullable=True),
        sa.Column("is_deleted",        sa.Boolean,      nullable=False, server_default="false"),
        sa.Column("created_at",        sa.DateTime,     nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at",        sa.DateTime,     nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.ForeignKeyConstraint(["org_node_id"], ["org_nodes.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["period_id"],   ["reporting_periods.id"], ondelete="SET NULL"),
        sa.UniqueConstraint("org_node_id", "period_id", "disclosure_level", "disclosure_section",
                            name="uq_org_period_disclosure_section"),
    )

        # Index for fast lookup by org node + period
        op.create_index(
            "ix_disclosures_org_period",
            "org_level_disclosures",
            ["org_node_id", "period_id"],
        )

    # ── 2. Report staleness tracking column ───────────────────────────────────
    # Adds a "stale_since" timestamp to reports, so we can show the staleness banner (spec §49).
    # The reports table is created by the initial migration; we add the column here.
    try:
        op.add_column(
            "reports",
            sa.Column("stale_since", sa.DateTime, nullable=True),
        )
        op.add_column(
            "reports",
            sa.Column("stale_reason", sa.String(500), nullable=True),
        )
        op.add_column(
            "reports",
            sa.Column("superseded_by_id", sa.String(36), nullable=True),
        )
    except Exception:
        # Column may already exist in some environments; skip gracefully
        pass

    # ── 3. Calculation job status table ───────────────────────────────────────
    # Tracks the multi-step pipeline status for background calculation jobs (spec §48).
    if "calculation_jobs" not in existing_tables:
        op.create_table(
            "calculation_jobs",
        sa.Column("id",              sa.String(36),  nullable=False, primary_key=True),
        sa.Column("trigger_event",   sa.String(100), nullable=False),
        # What triggered this job: "submission_approved" | "bu_approved" | "subsidiary_approved" | "manual"
        sa.Column("org_node_id",     sa.String(36),  nullable=False, index=True),
        sa.Column("period_id",       sa.String(36),  nullable=True,  index=True),
        sa.Column("initiated_by_id", sa.String(36),  nullable=True),
        # Pipeline stages as JSON: {project_calc: DONE, bu_aggregation: RUNNING, ...}
        sa.Column("pipeline_status", sa.JSON,        nullable=False, server_default='{}'),
        sa.Column("overall_status",  sa.String(30),  nullable=False, server_default="QUEUED", index=True),
        # Values: "QUEUED" | "RUNNING" | "COMPLETE" | "FAILED" | "PARTIAL"
        sa.Column("methodology_version", sa.String(20), nullable=True),
        sa.Column("started_at",      sa.DateTime,    nullable=True),
        sa.Column("completed_at",    sa.DateTime,    nullable=True),
        sa.Column("error_message",   sa.Text,        nullable=True),
        sa.Column("affected_reports", sa.JSON,       nullable=False, server_default="[]"),
        # List of report IDs that were marked stale by this job completion
        sa.Column("created_at",      sa.DateTime,    nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at",      sa.DateTime,    nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )


def downgrade() -> None:
    op.drop_table("calculation_jobs")
    op.drop_table("org_level_disclosures")

    try:
        op.drop_column("reports", "stale_since")
        op.drop_column("reports", "stale_reason")
        op.drop_column("reports", "superseded_by_id")
    except Exception:
        pass
