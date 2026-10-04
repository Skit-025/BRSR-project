"""
app/modules/validation/exceptions/models.py
Validation Exception Case Management models.
Tracks waivers, escalations, manager overrides, and resolution states.
"""
import enum
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from datetime import datetime, timezone
import uuid
from app.db.base import Base, TimestampMixin, SoftDeleteMixin


class ExceptionStatus(str, enum.Enum):
    OPEN = "OPEN"
    UNDER_REVIEW = "UNDER_REVIEW"
    RESOLVED = "RESOLVED"
    WAIVED = "WAIVED"
    REJECTED = "REJECTED"


class ValidationException(Base, TimestampMixin, SoftDeleteMixin):
    """
    Exception ticket raised during automated validation or reviewer check.
    Requires auditable resolution before period closing.
    """
    __tablename__ = "validation_exceptions"

    id = Column(
        PG_UUID(as_uuid=False),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
        default=lambda: str(uuid.uuid4()),
        index=True,
    )
    submission_id = Column(PG_UUID(as_uuid=False), ForeignKey("submissions.id"), nullable=False, index=True)
    metric_code = Column(String(50), nullable=False, index=True)
    rule_id = Column(String(50), nullable=False, index=True)
    severity = Column(String(20), nullable=False)
    description = Column(Text, nullable=False)
    status = Column(String(50), default=ExceptionStatus.OPEN.value, nullable=False, index=True)
    
    raised_by = Column(String(64), nullable=True)          # "SYSTEM_RULE", "AI_E2_ANOMALY", or user id
    assigned_to = Column(String(64), nullable=True)        # Reviewer / ESG Manager ID
    resolution_notes = Column(Text, nullable=True)
    resolved_by = Column(String(64), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
