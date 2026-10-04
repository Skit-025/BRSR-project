"""
app/modules/audit/models.py
PostgreSQL immutable audit trail model with cryptographic chaining.
"""
from sqlalchemy import Column, String, BigInteger, Text, DateTime, text
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from datetime import datetime, timezone
import uuid
from app.db.base import Base


class AuditLog(Base):
    """
    Immutable audit event record.
    Protected by PostgreSQL BEFORE UPDATE/DELETE trigger to guarantee tamper-resistance.
    Cryptographically chained via SHA-256 prev_hash & record_hash.
    """
    __tablename__ = "audit_events"

    id = Column(
        PG_UUID(as_uuid=False),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
        default=lambda: str(uuid.uuid4()),
        index=True,
    )
    sequence_number = Column(BigInteger, autoincrement=True, unique=True, index=True)
    action = Column(String(100), nullable=False, index=True)
    actor_id = Column(String(64), nullable=True, index=True)
    actor_email = Column(String(255), nullable=True)
    actor_role = Column(String(64), nullable=True)
    target_type = Column(String(100), nullable=False, index=True)
    target_id = Column(String(64), nullable=True, index=True)
    
    changes = Column(JSONB, nullable=True)
    details = Column(JSONB, nullable=True)
    ip_address = Column(String(45), nullable=True)

    # Cryptographic audit chaining
    prev_hash = Column(String(64), nullable=False, default="0" * 64)
    record_hash = Column(String(64), nullable=False, index=True)

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
    )
