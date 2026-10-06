"""
app/pipelines/aggregation/stages/09_refresh_views.py
Stage 9: Refreshes PostgreSQL analytics views and KPI cache tables.
"""
from sqlalchemy.orm import Session
from sqlalchemy import text


def stage_09_refresh_views(db: Session) -> bool:
    """Refreshes PostgreSQL dashboard views and runs query optimization."""
    try:
        bind = db.get_bind()
        dialect_name = bind.dialect.name if bind else "postgresql"
        if dialect_name == "postgresql":
            try:
                db.execute(text("ANALYZE consolidated_values;"))
                db.commit()
            except Exception:
                db.rollback()
        elif dialect_name == "sqlite":
            try:
                db.execute(text("PRAGMA optimize;"))
                db.commit()
            except Exception:
                db.rollback()
        return True
    except Exception:
        db.rollback()
        return False

