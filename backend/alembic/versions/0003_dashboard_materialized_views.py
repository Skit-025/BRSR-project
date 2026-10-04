"""dashboard_materialized_views

Revision ID: 0003
Revises: 0002
Create Date: 2026-10-04

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Materialized view for instantaneous reporting summary by entity and period
    op.execute("""
    CREATE OR REPLACE VIEW v_entity_submission_summary AS
    SELECT 
        s.id AS submission_id,
        s.entity_id,
        o.code AS entity_code,
        o.name AS entity_name,
        s.period_id,
        rp.code AS period_code,
        s.status,
        s.version,
        s.submitted_at,
        COUNT(dp.id) AS total_data_points,
        COUNT(CASE WHEN dp.value_numeric IS NOT NULL THEN 1 END) AS reported_numeric_points
    FROM submissions s
    JOIN org_nodes o ON s.entity_id = o.id
    JOIN reporting_periods rp ON s.period_id = rp.id
    LEFT JOIN data_points dp ON dp.submission_id = s.id
    GROUP BY s.id, s.entity_id, o.code, o.name, s.period_id, rp.code, s.status, s.version, s.submitted_at;
    """)


def downgrade() -> None:
    op.execute("DROP VIEW IF EXISTS v_entity_submission_summary;")
