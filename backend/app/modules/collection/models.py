import enum
from sqlalchemy import Column, String, Numeric, Integer, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import relationship
from app.db.base import Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin

class SubmissionStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    SUBMITTED = "SUBMITTED"
    UNDER_BU_REVIEW = "UNDER_BU_REVIEW"
    BU_APPROVED = "BU_APPROVED"
    SUBSIDIARY_APPROVED = "SUBSIDIARY_APPROVED"
    CONSOLIDATED = "CONSOLIDATED"
    LOCKED = "LOCKED"
    RETURNED = "RETURNED"

class ValueStatus(str, enum.Enum):
    ACTUAL = "ACTUAL"
    ESTIMATED = "ESTIMATED"
    NOT_AVAILABLE = "NOT_AVAILABLE"
    NOT_APPLICABLE = "NOT_APPLICABLE"

class EntryMethod(str, enum.Enum):
    MANUAL_FORM = "manual_form"
    EXCEL_UPLOAD = "excel_upload"
    SPREADSHEET_UPLOAD = "spreadsheet_upload"
    OFFLINE_PWA = "offline_pwa"
    OCR_PREFILL = "ocr_prefill"
    API_FEED = "api_feed"

class Submission(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    """
    Monthly submission pack per reporting unit and period (F08).
    Tracks maker-checker lifecycle, optimistic locking version, and freeze state.
    """
    __tablename__ = "submissions"

    entity_id = Column(PG_UUID(as_uuid=False), ForeignKey("org_nodes.id"), nullable=False, index=True)
    period_id = Column(PG_UUID(as_uuid=False), ForeignKey("reporting_periods.id"), nullable=False, index=True)
    status = Column(String(50), default=SubmissionStatus.DRAFT.value, nullable=False, index=True)
    version = Column(Integer, default=1, nullable=False)  # Integer version for optimistic concurrency
    maker_id = Column(PG_UUID(as_uuid=False), ForeignKey("users.id"), nullable=True)
    submitted_at = Column(DateTime, nullable=True)
    notes = Column(String(500), nullable=True)

    data_points = relationship("DataPoint", back_populates="submission", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("entity_id", "period_id", name="uq_entity_period_submission"),
    )

class DataPoint(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    """
    Individual KPI measurement recorded in a submission pack (F08).
    Includes entered unit, auto-normalized value, and entry method lineage.
    Never uses Float for reported values — strictly NUMERIC(20, 6) for audit precision.
    """
    __tablename__ = "data_points"

    submission_id = Column(PG_UUID(as_uuid=False), ForeignKey("submissions.id"), nullable=False, index=True)
    metric_code = Column(String(50), nullable=False, index=True)
    value_numeric = Column(Numeric(precision=20, scale=6), nullable=True)
    value_text = Column(String(500), nullable=True)
    unit = Column(String(50), nullable=False)
    normalized_value = Column(Numeric(precision=20, scale=6), nullable=True)  # Standardized to base_unit
    status = Column(String(50), default=ValueStatus.ACTUAL.value, nullable=False)
    entry_method = Column(String(50), default=EntryMethod.MANUAL_FORM.value, nullable=False)
    version = Column(Integer, default=1, nullable=False)
    notes = Column(String(500), nullable=True)

    submission = relationship("Submission", back_populates="data_points")

    __table_args__ = (
        UniqueConstraint("submission_id", "metric_code", name="uq_submission_metric"),
    )
