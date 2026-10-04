"""
app/db/rls.py
PostgreSQL Row-Level Security (RLS) context management and policy helpers.

Allows setting transaction-scoped session parameters:
  - app.current_user_id
  - app.current_entity_id
  - app.current_role
  - app.is_super_admin
"""
import logging
from contextlib import contextmanager
from typing import Optional
from sqlalchemy import text
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


def set_tenant_context(
    db: Session,
    user_id: Optional[str] = None,
    entity_id: Optional[str] = None,
    role: Optional[str] = None,
    is_super_admin: bool = False,
) -> None:
    """
    Set PostgreSQL transaction-local configuration parameters for RLS policies.
    Parameters expire automatically at the end of the current transaction.
    """
    try:
        if user_id:
            db.execute(text("SELECT set_config('app.current_user_id', :uid, true)"), {"uid": str(user_id)})
        if entity_id:
            db.execute(text("SELECT set_config('app.current_entity_id', :eid, true)"), {"eid": str(entity_id)})
        if role:
            db.execute(text("SELECT set_config('app.current_role', :role, true)"), {"role": str(role)})
        db.execute(
            text("SELECT set_config('app.is_super_admin', :is_admin, true)"),
            {"is_admin": "true" if is_super_admin else "false"},
        )
    except Exception as exc:
        logger.warning("Could not set PostgreSQL RLS context: %s", exc)


@contextmanager
def rls_scope(
    db: Session,
    user_id: Optional[str] = None,
    entity_id: Optional[str] = None,
    role: Optional[str] = None,
    is_super_admin: bool = False,
):
    """Context manager to run a block with specific RLS parameters in PostgreSQL."""
    set_tenant_context(
        db,
        user_id=user_id,
        entity_id=entity_id,
        role=role,
        is_super_admin=is_super_admin,
    )
    try:
        yield db
    finally:
        # Reset local config at end of block
        try:
            db.execute(text("SELECT set_config('app.current_user_id', '', true)"))
            db.execute(text("SELECT set_config('app.current_entity_id', '', true)"))
            db.execute(text("SELECT set_config('app.current_role', '', true)"))
            db.execute(text("SELECT set_config('app.is_super_admin', 'false', true)"))
        except Exception:
            pass
