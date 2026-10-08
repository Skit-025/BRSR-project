from typing import Optional, List
from datetime import datetime, date
from pydantic import BaseModel, ConfigDict

class ExtractedFieldSuggestion(BaseModel):
    metric: str
    value: float
    unit: str
    confidence: float
    page: int
    bounding_box: Optional[List[float]] = None
    metadata: Optional[dict] = None
    doc_type: Optional[str] = None
    run_id: Optional[str] = None

class EvidenceFileRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    storage_key: str
    original_name: str
    mime_type: str
    size_bytes: int
    sha256: str
    uploader_id: Optional[str] = None
    uploaded_at: datetime
    doc_type: str = "OTHER"
    page_ref: Optional[str] = None
    doc_date: Optional[date] = None
    version: int
    scan_status: str
    # ── New metadata fields ────────────────────────────────────────────────────
    evidence_display_id: Optional[str] = None
    doc_category:        Optional[str] = None
    bill_type:           Optional[str] = None
    attached_by_role:    Optional[str] = None
    project_id:          Optional[str] = None
    esg_indicator:       Optional[str] = None

class EvidenceLinkCreate(BaseModel):
    evidence_id: str
    data_point_id: str
    page_ref: Optional[str] = None
    notes: Optional[str] = None

class EvidenceLinkRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    evidence_id: str
    data_point_id: str
    page_ref: Optional[str] = None
    notes: Optional[str] = None

class EvidenceUploadResponse(BaseModel):
    evidence: EvidenceFileRead
    extracted_fields: List[ExtractedFieldSuggestion] = []
    is_relevant: bool = True
    rejection_reason: Optional[str] = None
    message: str
    esg_impact: Optional[dict] = None
