import logging
from typing import Optional, List, Tuple
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.modules.evidence.models import EvidenceFile, EvidenceLink, ScanStatus
from app.modules.evidence.integrity import compute_sha256, verify_sha256
from app.modules.evidence.storage import storage_service
from app.modules.evidence.schemas import ExtractedFieldSuggestion, EvidenceLinkCreate
from app.ai.e1_extract.extractor import e1_engine
from app.ai.schemas import E1ExtractRequest

logger = logging.getLogger(__name__)

def process_and_store_evidence(
    db: Session,
    filename: str,
    file_bytes: bytes,
    mime_type: str,
    client_sha256: Optional[str] = None,
    uploader_id: Optional[str] = None,
    doc_type_hint: Optional[str] = None,
    run_ocr: bool = True
) -> Tuple[EvidenceFile, List[ExtractedFieldSuggestion], bool, Optional[str]]:
    """
    Core Evidence Vault ingestion pipeline (P1 / F09-F12):
    1. Cryptographic SHA-256 verification (rejects tampering/corruption)
    2. Secure immutable object storage
    3. AI Engine E1 OCR extraction for form pre-fill
    4. Database record creation.

    Returns:
        (evidence_file, suggestions, is_relevant, rejection_reason)
    """
    server_sha256 = compute_sha256(file_bytes)

    # 1. SHA-256 Verification
    if client_sha256:
        if not verify_sha256(file_bytes, client_sha256):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"SHA-256 integrity verification failed! Expected '{client_sha256}', calculated '{server_sha256}'."
            )

    # 2. Store in vault
    storage_key = storage_service.store_file(file_bytes, filename, mime_type)

    # 3. Create Evidence record
    evidence = EvidenceFile(
        storage_key=storage_key,
        original_name=filename,
        mime_type=mime_type,
        size_bytes=len(file_bytes),
        sha256=server_sha256,
        uploader_id=uploader_id,
        doc_type=doc_type_hint or "OTHER",
        scan_status=ScanStatus.CLEAN.value
    )
    db.add(evidence)
    db.commit()
    db.refresh(evidence)

    # 4. AI Engine E1 OCR extraction (optional pre-fill assist)
    suggestions: List[ExtractedFieldSuggestion] = []
    is_relevant: bool = True
    rejection_reason: Optional[str] = None

    if run_ocr:
        try:
            req = E1ExtractRequest(
                evidence_id=evidence.id,
                file_bytes=file_bytes,
                filename=filename,
                mime_type=mime_type,
                doc_type_hint=doc_type_hint  # Pass as-is, None means auto-classify
            )
            e1_res = e1_engine.extract_from_file(req)
            is_relevant = e1_res.is_relevant
            rejection_reason = e1_res.rejection_reason

            if is_relevant:
                for f in e1_res.fields:
                    val = float(f.value) if isinstance(f.value, (int, float)) else 0.0
                    suggestions.append(
                        ExtractedFieldSuggestion(
                            metric=f.metric,
                            value=val,
                            unit=f.unit,
                            confidence=f.confidence,
                            page=f.page,
                            bounding_box=f.bbox,
                            metadata=f.metadata or {},
                            doc_type=e1_res.doc_type,
                            run_id=e1_res.run_id
                        )
                    )
        except Exception as e:
            logger.warning(f"AI E1 extraction notice: {e}. Entry can still proceed manually.")

    return evidence, suggestions, is_relevant, rejection_reason


def link_evidence_to_datapoint(
    db: Session,
    link_req: EvidenceLinkCreate
) -> EvidenceLink:
    """Attaches an evidence file to a specific data point measurement."""
    # Check duplicate
    existing = db.query(EvidenceLink).filter(
        EvidenceLink.evidence_id == link_req.evidence_id,
        EvidenceLink.data_point_id == link_req.data_point_id
    ).first()

    if existing:
        return existing

    link = EvidenceLink(
        evidence_id=link_req.evidence_id,
        data_point_id=link_req.data_point_id,
        page_ref=link_req.page_ref,
        notes=link_req.notes
    )
    db.add(link)
    db.commit()
    db.refresh(link)
    return link
