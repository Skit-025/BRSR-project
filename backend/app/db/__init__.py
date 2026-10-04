"""
app/db/__init__.py
Database session, declarative base, and registry.
"""
from app.db.base import Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin, AuditMixin
from app.db.session import engine, SessionLocal, get_db, init_db

__all__ = [
    "Base",
    "UUIDPrimaryKeyMixin",
    "TimestampMixin",
    "SoftDeleteMixin",
    "AuditMixin",
    "engine",
    "SessionLocal",
    "get_db",
    "init_db",
]
