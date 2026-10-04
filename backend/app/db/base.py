"""
app/db/base.py
SQLAlchemy declarative base and shared column mixins.
Optimised for PostgreSQL — uses native UUID type and TIMESTAMPTZ.
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, Boolean, text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class UUIDPrimaryKeyMixin:
    """
    Native PostgreSQL UUID primary key.
    Default generated server-side by uuid-ossp extension for maximum
    consistency; Python-side fallback via uuid4() for tests.
    """
    id = Column(
        PG_UUID(as_uuid=False),          # store as str for JSON serialisation
        primary_key=True,
        server_default=text("gen_random_uuid()"),
        default=lambda: str(uuid.uuid4()),
        index=True,
    )


class TimestampMixin:
    """UTC-aware created_at / updated_at columns (TIMESTAMPTZ)."""
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )


class SoftDeleteMixin:
    """Audit-compliant soft delete — rows are never physically removed."""
    is_deleted = Column(Boolean, default=False, nullable=False, index=True)


class AuditMixin(UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    """Convenience mixin combining all three audit columns."""
    pass
