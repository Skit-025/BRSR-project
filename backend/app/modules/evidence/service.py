import logging
from typing import Optional, List, Tuple
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.modules.evidence.models import EvidenceFile, EvidenceLink, ScanStatus, _generate_display_id
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
    run_ocr: bool = True,
    doc_category: Optional[str] = None,
    bill_type: Optional[str] = None,
    attached_by_role: Optional[str] = None,
    project_id: Optional[str] = None,
    esg_indicator: Optional[str] = None,
) -> Tuple[EvidenceFile, List[ExtractedFieldSuggestion], bool, Optional[str], Optional[dict]]:
    """
    Core Evidence Vault ingestion pipeline (P1 / F09-F12):
    1. Cryptographic SHA-256 verification (rejects tampering/corruption)
    2. Secure immutable object storage
    3. AI Engine E1 OCR extraction for form pre-fill (when run_ocr=True)
    4. Database record creation with authoritative metadata and unique EVD-XXXXXXXX display ID.

    Returns:
        (evidence_file, suggestions, is_relevant, rejection_reason, esg_impact)
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

    # Clean category & bill type
    clean_category = "Bill"
    if doc_category:
        if doc_category.strip().lower() == "report":
            clean_category = "Report"
        elif doc_category.strip().lower() == "bill":
            clean_category = "Bill"
        else:
            clean_category = doc_category
    elif doc_type_hint and "report" in doc_type_hint.lower():
        clean_category = "Report"

    if clean_category == "Report":
        clean_bill_type = "Unknown"
    else:
        clean_bill_type = bill_type or doc_type_hint or "Unknown"

    # Derive doc_type enum/code
    derived_doc_type = doc_type_hint or "OTHER"
    if clean_category == "Bill":
        bt_lower = clean_bill_type.lower()
        if "electr" in bt_lower:
            derived_doc_type = "ELECTRICITY_BILL"
        elif "fuel" in bt_lower or "diesel" in bt_lower or "petrol" in bt_lower:
            derived_doc_type = "FUEL_BILL"
        elif "water" in bt_lower:
            derived_doc_type = "METER_READING"
        elif "waste" in bt_lower:
            derived_doc_type = "WEIGH_BRIDGE_SLIP"
        else:
            derived_doc_type = "OTHER"
    elif clean_category == "Report":
        derived_doc_type = "LAB_REPORT"

    # 3. Create Evidence record with unique authoritative display ID
    evidence = EvidenceFile(
        storage_key=storage_key,
        original_name=filename,
        mime_type=mime_type,
        size_bytes=len(file_bytes),
        sha256=server_sha256,
        uploader_id=uploader_id,
        doc_type=derived_doc_type,
        scan_status=ScanStatus.CLEAN.value,
        evidence_display_id=_generate_display_id(),
        doc_category=clean_category,
        bill_type=clean_bill_type,
        attached_by_role=attached_by_role or "project_admin",
        project_id=project_id or None,
        esg_indicator=esg_indicator or None,
    )
    db.add(evidence)
    db.commit()
    db.refresh(evidence)

    # 4. AI Engine E1 OCR extraction (optional pre-fill assist)
    suggestions: List[ExtractedFieldSuggestion] = []
    is_relevant: bool = True
    rejection_reason: Optional[str] = None
    esg_impact: Optional[dict] = None

    if run_ocr:
        try:
            # Map bill type or esg indicator to E1 doc_type_hint
            effective_hint = doc_type_hint
            if clean_category == "Bill" and (not effective_hint or effective_hint in ("OTHER", "Unknown")):
                bt_lower = clean_bill_type.lower()
                if "electr" in bt_lower or esg_indicator == "ENV-ENERGY-001":
                    effective_hint = "electricity_bill"
                elif "fuel" in bt_lower or "diesel" in bt_lower or esg_indicator in ("ENV-ENERGY-002", "ENV-ENERGY-003"):
                    effective_hint = "fuel_receipt"
                elif "water" in bt_lower or esg_indicator == "ENV-WATER-001":
                    effective_hint = "water_manifest"
                elif "waste" in bt_lower or esg_indicator == "ENV-WASTE-001":
                    effective_hint = "waste_manifest"
                elif "safety" in bt_lower or esg_indicator == "SOC-SAFE-001":
                    effective_hint = "safety_log"

            req = E1ExtractRequest(
                evidence_id=evidence.id,
                file_bytes=file_bytes,
                filename=filename,
                mime_type=mime_type,
                doc_type_hint=effective_hint
            )

            if clean_category == "Report":
                # For reports, check if document is unrelated (e.g. code, resume, unrelated text)
                from app.ai.e1_extract.pipeline import UNRELATED_STRONG_SIGNALS
                text_preview = ""
                try:
                    from app.ai.e1_extract.pipeline import _extract_pdf_text, _extract_image_text
                    if mime_type.startswith("image/"):
                        text_preview = _extract_image_text(file_bytes)
                    else:
                        text_preview = _extract_pdf_text(file_bytes)
                except Exception:
                    pass
                
                text_lower = (filename + " " + text_preview).lower()
                is_unrelated = False
                for sig, label in UNRELATED_STRONG_SIGNALS:
                    if sig in text_lower:
                        is_unrelated = True
                        rejection_reason = f"This document does not appear to be relevant to this ESG field ({label}). Please upload a relevant supporting document."
                        break

                if is_unrelated:
                    is_relevant = False
                else:
                    is_relevant = True
                    rejection_reason = None
            else:
                # Bill processing through real E1 engine
                e1_res = e1_engine.extract_from_file(req, db_session=db)
                is_relevant = e1_res.is_relevant
                rejection_reason = e1_res.rejection_reason
                esg_impact = getattr(e1_res, "esg_impact", None)

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

    return evidence, suggestions, is_relevant, rejection_reason, esg_impact


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
