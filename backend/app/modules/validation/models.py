import enum
from sqlalchemy import Column, String, Boolean, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from app.db.base import Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin

class Severity(str, enum.Enum):
    ERROR = "ERROR"       # Blocks submission until fixed
    WARNING = "WARNING"   # Allowed with written justification
    INFO = "INFO"         # Informational, logged for trends

class ValidationResult(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    """
    F13-F14 Validation Results table:
    Tracks rule violations, severity, and required human justifications.
    """
    __tablename__ = "validation_results"

    submission_id = Column(PG_UUID(as_uuid=False), ForeignKey("submissions.id"), nullable=False, index=True)
    data_point_id = Column(String(36), nullable=True, index=True)
    metric_code = Column(String(50), nullable=False, index=True)
    rule_id = Column(String(50), nullable=False, index=True)
    severity = Column(String(20), default=Severity.ERROR.value, nullable=False, index=True)
    message = Column(Text, nullable=False)
    justification = Column(Text, nullable=True)  # Required for WARNING severity
    resolved = Column(Boolean, default=False, nullable=False)
