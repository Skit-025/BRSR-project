import enum
import uuid
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Date, Text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.db.base import Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin

class ScanStatus(str, enum.Enum):
    CLEAN = "clean"
    SUSPICIOUS = "suspicious"
    PENDING = "pending"


class DocumentType(str, enum.Enum):
    FUEL_BILL = "FUEL_BILL"
    ELECTRICITY_BILL = "ELECTRICITY_BILL"
    WEIGH_BRIDGE_SLIP = "WEIGH_BRIDGE_SLIP"
    VEHICLE_LOG = "VEHICLE_LOG"
    FLIGHT_TICKET = "FLIGHT_TICKET"
    TRAVEL_INVOICE = "TRAVEL_INVOICE"
    PURCHASE_ORDER = "PURCHASE_ORDER"
    MATERIAL_INVOICE = "MATERIAL_INVOICE"
    LOGISTICS_WAYBILL = "LOGISTICS_WAYBILL"
    METER_READING = "METER_READING"
    PPA_AGREEMENT = "PPA_AGREEMENT"
    LAB_REPORT = "LAB_REPORT"
    MAINTENANCE_LOG = "MAINTENANCE_LOG"
    OTHER = "OTHER"


class DocCategory(str, enum.Enum):
    """Top-level document category shown to user: Bill or Report."""
    BILL   = "Bill"
    REPORT = "Report"
    UNKNOWN = "Unknown"


def _generate_display_id() -> str:
    """Generate EVD-XXXXXXXX human-readable display ID (server-side, unique)."""
    return "EVD-" + uuid.uuid4().hex[:8].upper()

class EvidenceFile(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    """
    Evidence Vault file record matching F09-F10 specification.
    Preserves SHA-256 cryptographic hash, MIME type, object storage key, and audit lineage.
    Extended with: doc_category (Bill/Report), bill_type, attached_by_role, project_id,
    esg_indicator (field-level context), and evidence_display_id (EVD-XXXXXXXX).
    """
    __tablename__ = "evidence_files"

    # ── Core immutable fields (existing) ────────────────────────────────────────
    storage_key      = Column(String(500), unique=True, index=True, nullable=False)
    original_name    = Column(String(255), nullable=False)
    mime_type        = Column(String(100), nullable=False)
    size_bytes       = Column(Integer, nullable=False)
    sha256           = Column(String(64), index=True, nullable=False)  # Cryptographic proof
    uploader_id      = Column(PG_UUID(as_uuid=False), ForeignKey("users.id"), nullable=True)
    uploaded_at      = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    doc_type         = Column(String(50), default=DocumentType.OTHER.value, nullable=False, index=True)
    page_ref         = Column(String(100), nullable=True)
    doc_date         = Column(Date, nullable=True)
    expiry_date      = Column(Date, nullable=True)
    version          = Column(Integer, default=1, nullable=False)
    scan_status      = Column(String(50), default=ScanStatus.CLEAN.value, nullable=False)

    # ── New metadata fields (nullable — safe for existing records) ──────────────
    # Human-readable Evidence ID: EVD-XXXXXXXX, generated server-side on creation
    evidence_display_id = Column(
        String(20),
        default=_generate_display_id,
        nullable=True,
        index=True,
        unique=True,
    )
    # User-facing document category: Bill | Report | Unknown
    doc_category        = Column(String(20), default=DocCategory.UNKNOWN.value, nullable=True)
    # Bill sub-type (electricity_bill, fuel_receipt, etc.) — meaningful only when doc_category=Bill
    bill_type           = Column(String(50), default="Unknown", nullable=True)
    # Actual runtime role of the user who attached this document (server-derived, never client-supplied)
    attached_by_role    = Column(String(50), nullable=True)
    # Project (org node) the evidence was attached to — validated server-side
    project_id          = Column(String(100), nullable=True, index=True)
    # ESG field / indicator the evidence supports (e.g. ENV-ENERGY-001)
    esg_indicator       = Column(String(100), nullable=True, index=True)

    links = relationship("EvidenceLink", back_populates="evidence_file", cascade="all, delete-orphan")


class EvidenceLink(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    """
    Many-to-Many junction between Evidence Documents and DataPoint measurements (F10).
    A single utility bill or meter log may substantiate multiple metrics (e.g. Electricity + Scope 2).
    """
    __tablename__ = "evidence_links"

    evidence_id = Column(PG_UUID(as_uuid=False), ForeignKey("evidence_files.id"), nullable=False, index=True)
    data_point_id = Column(PG_UUID(as_uuid=False), ForeignKey("data_points.id"), nullable=False, index=True)
    page_ref = Column(String(100), nullable=True)
    notes = Column(String(500), nullable=True)

    evidence_file = relationship("EvidenceFile", back_populates="links")
