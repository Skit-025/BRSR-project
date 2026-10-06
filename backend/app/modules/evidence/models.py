import enum
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Date
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

class EvidenceFile(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    """
    Evidence Vault file record matching F09-F10 specification.
    Preserves SHA-256 cryptographic hash, MIME type, object storage key, and audit lineage.
    """
    __tablename__ = "evidence_files"

    storage_key = Column(String(500), unique=True, index=True, nullable=False)
    original_name = Column(String(255), nullable=False)
    mime_type = Column(String(100), nullable=False)
    size_bytes = Column(Integer, nullable=False)
    sha256 = Column(String(64), index=True, nullable=False)  # Cryptographic proof
    uploader_id = Column(PG_UUID(as_uuid=False), ForeignKey("users.id"), nullable=True)
    uploaded_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    doc_type = Column(String(50), default=DocumentType.OTHER.value, nullable=False, index=True)
    page_ref = Column(String(100), nullable=True)
    doc_date = Column(Date, nullable=True)
    expiry_date = Column(Date, nullable=True)
    version = Column(Integer, default=1, nullable=False)
    scan_status = Column(String(50), default=ScanStatus.CLEAN.value, nullable=False)

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
