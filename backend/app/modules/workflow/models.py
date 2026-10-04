import enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from app.db.base import Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin

class ReviewDecision(str, enum.Enum):
    APPROVE = "APPROVE"
    RETURN = "RETURN"
    LOCK = "LOCK"

class Review(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    """
    F16-F19 Maker-Checker Review Audit Log:
    Tracks every approval and return decision with timestamps, reviewer ID, stage, and comments.
    """
    __tablename__ = "reviews"

    submission_id = Column(PG_UUID(as_uuid=False), ForeignKey("submissions.id"), nullable=False, index=True)
    stage = Column(String(50), nullable=False)
    reviewer_id = Column(PG_UUID(as_uuid=False), ForeignKey("users.id"), nullable=False, index=True)
    decision = Column(String(20), nullable=False)
    comment = Column(Text, nullable=True)  # Mandatory on RETURN
    decided_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
