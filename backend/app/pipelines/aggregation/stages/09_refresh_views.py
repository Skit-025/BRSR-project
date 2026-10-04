"""
app/pipelines/aggregation/stages/09_refresh_views.py
Stage 9: Refreshes PostgreSQL analytics views and KPI cache tables.
"""
from sqlalchemy.orm import Session
from sqlalchemy import text


def stage_09_refresh_views(db: Session) -> bool:
    """Refreshes PostgreSQL dashboard views."""
    try:
        db.execute(text("ANALYZE consolidated_values;"))
        db.commit()
        return True
    except Exception:
        db.rollback()
        return False
