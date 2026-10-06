from typing import Optional, List
import logging
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status, Response
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.modules.auth.models import User
from app.modules.auth.router import get_current_active_user
from app.security.rbac import Role
from app.security.passwords import verify_password
from app.modules.evidence.models import EvidenceFile, EvidenceLink
from app.modules.evidence.schemas import (
    EvidenceFileRead,
    EvidenceLinkCreate,
    EvidenceLinkRead,
    EvidenceUploadResponse,
    ExtractedFieldSuggestion
)
from app.modules.evidence.service import process_and_store_evidence, link_evidence_to_datapoint
from app.modules.evidence.storage import storage_service

logger = logging.getLogger(__name__)

class EvidenceDeleteRequest(BaseModel):
    password: str

router = APIRouter(prefix="/evidence", tags=["Evidence Vault & AI Pre-fill"])

@router.post("/upload", response_model=EvidenceUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_evidence_file(
    file: UploadFile = File(...),
    sha256: Optional[str] = Form(None),
    doc_type_hint: Optional[str] = Form(None),
    run_ocr: bool = Form(True),
    db: Session = Depends(get_db)
):
    """
    F09-F12 Evidence Vault Ingestion:
    - Verifies client SHA-256 hash
    - Stores file in immutable storage
    - Runs AI Engine E1 to extract numbers for instant form pre-fill.
    """
    file_bytes = await file.read()
    mime_type = file.content_type or "application/octet-stream"

    evidence, suggestions, is_relevant, rejection_reason = process_and_store_evidence(
        db=db,
        filename=file.filename or "uploaded_evidence",
        file_bytes=file_bytes,
        mime_type=mime_type,
        client_sha256=sha256,
        doc_type_hint=doc_type_hint,
        run_ocr=run_ocr
    )

    message = (
        "Evidence verified and stored in immutable vault."
        if is_relevant else
        f"File stored but rejected by AI engine: {rejection_reason or 'Unrelated document.'}"
    )

    return EvidenceUploadResponse(
        evidence=EvidenceFileRead.model_validate(evidence),
        extracted_fields=suggestions,
        is_relevant=is_relevant,
        rejection_reason=rejection_reason,
        message=message
    )

@router.get("", response_model=List[EvidenceFileRead])
def list_evidence_files(db: Session = Depends(get_db)):
    """Lists all stored evidence files in the vault."""
    return db.query(EvidenceFile).order_by(EvidenceFile.created_at.desc()).all()

@router.get("/{evidence_id}", response_model=EvidenceFileRead)
def get_evidence_metadata(evidence_id: str, db: Session = Depends(get_db)):
    """Retrieves file metadata and cryptographic hash for assurance auditing."""
    evidence = db.query(EvidenceFile).filter(EvidenceFile.id == evidence_id).first()
    if not evidence:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidence file not found.")
    return evidence

@router.post("/{evidence_id}/extract", response_model=List[ExtractedFieldSuggestion])
def extract_from_existing_evidence(
    evidence_id: str,
    doc_type_hint: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Re-runs or inspects AI Engine E1 OCR on an existing evidence document."""
    from app.ai.e1_extract.extractor import e1_engine
    from app.ai.schemas import E1ExtractRequest
    evidence = db.query(EvidenceFile).filter(EvidenceFile.id == evidence_id).first()
    if not evidence:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidence file not found.")
    req = E1ExtractRequest(
        evidence_id=evidence.id,
        doc_type_hint=doc_type_hint
    )
    e1_res = e1_engine.extract_from_file(req)
    suggestions = []
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
    return suggestions

@router.get("/{evidence_id}/download")
def download_evidence_file(evidence_id: str, db: Session = Depends(get_db)):
    """Downloads raw evidence document from vault."""
    evidence = db.query(EvidenceFile).filter(EvidenceFile.id == evidence_id).first()
    if not evidence:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidence file not found.")

    file_bytes = storage_service.get_file_bytes(evidence.storage_key)
    if not file_bytes:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File content not found in storage vault.")

    return Response(content=file_bytes, media_type=evidence.mime_type)

@router.post("/link", response_model=EvidenceLinkRead, status_code=status.HTTP_201_CREATED)
def link_evidence(link_req: EvidenceLinkCreate, db: Session = Depends(get_db)):
    """Attaches an evidence file to a reported KPI data point."""
    link = link_evidence_to_datapoint(db, link_req)
    return link

@router.get("/datapoint/{data_point_id}", response_model=List[EvidenceLinkRead])
def get_datapoint_evidence(data_point_id: str, db: Session = Depends(get_db)):
    """Lists all supporting evidence documents linked to a data point (3-click audit trace)."""
    links = db.query(EvidenceLink).filter(EvidenceLink.data_point_id == data_point_id).all()
    return links

@router.get("/{evidence_id}/view")
def view_evidence_file(evidence_id: str, db: Session = Depends(get_db)):
    """Serves raw evidence document inline for in-browser PDF, JPEG, PNG rendering."""
    evidence = db.query(EvidenceFile).filter(EvidenceFile.id == evidence_id).first()
    if not evidence:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidence file not found.")

    file_bytes = storage_service.get_file_bytes(evidence.storage_key)
    if not file_bytes:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File content not found in storage vault.")

    return Response(
        content=file_bytes,
        media_type=evidence.mime_type or "application/octet-stream",
        headers={
            "Content-Disposition": f'inline; filename="{evidence.original_name}"'
        }
    )

@router.delete("/{evidence_id}", status_code=status.HTTP_200_OK)
def delete_evidence_file(
    evidence_id: str,
    del_req: EvidenceDeleteRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Deletes an evidence file and its cryptographic hash record.
    Restricted to system_admin and his 1 level down roles (group_admin, esg_manager).
    Enforces re-entering admin password for audit authorization.
    """
    allowed_roles = [Role.SYSTEM_ADMIN.value, Role.GROUP_ADMIN.value, Role.ESG_MANAGER.value]
    if current_user.role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied. Only {allowed_roles} have authority to delete evidence files."
        )

    # Verify admin password
    if not current_user.password_hash or not verify_password(del_req.password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin password. Evidence deletion aborted."
        )

    evidence = db.query(EvidenceFile).filter(EvidenceFile.id == evidence_id).first()
    if not evidence:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidence file not found.")

    filename = evidence.original_name
    storage_key = evidence.storage_key

    # Delete any datapoint links
    db.query(EvidenceLink).filter(EvidenceLink.evidence_file_id == evidence.id).delete()

    # Delete storage file
    try:
        storage_service.delete_file(storage_key)
    except Exception as e:
        logger.warning(f"Storage file cleanup error: {e}")

    db.delete(evidence)
    db.commit()

    return {"success": True, "message": f"Evidence file '{filename}' was permanently deleted."}

