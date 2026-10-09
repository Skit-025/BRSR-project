from typing import Optional, List
import logging
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
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
    reason: str

router = APIRouter(prefix="/evidence", tags=["Evidence Vault & AI Pre-fill"])

security = HTTPBearer(auto_error=False)

@router.post("/upload", response_model=EvidenceUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_evidence_file(
    file: UploadFile = File(...),
    sha256: Optional[str] = Form(None),
    doc_type_hint: Optional[str] = Form(None),
    run_ocr: bool = Form(True),
    doc_category: Optional[str] = Form(None),
    bill_type: Optional[str] = Form(None),
    project_id: Optional[str] = Form(None),
    esg_indicator: Optional[str] = Form(None),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
):
    """
    F09-F12 Evidence Vault Ingestion:
    - Verifies client SHA-256 hash
    - Stores file in immutable storage
    - Assigns unique server-generated Evidence ID (EVD-XXXXXXXX)
    - Records metadata: doc_category (Bill/Report), bill_type, attached_by_role, project_id, esg_indicator
    - Runs AI Engine E1 to extract numbers for instant form pre-fill (when run_ocr=True).
    """
    file_bytes = await file.read()
    mime_type = file.content_type or "application/octet-stream"

    uploader_id = None
    attached_by_role = "project_admin"
    if credentials and credentials.credentials:
        from app.security.jwt import decode_access_token
        payload = decode_access_token(credentials.credentials)
        if payload:
            uploader_id = payload.get("sub")
            token_role = payload.get("role")
            if uploader_id:
                user = db.query(User).filter(User.id == uploader_id).first()
                if user and user.role:
                    attached_by_role = user.role.value if hasattr(user.role, "value") else str(user.role)
                elif token_role:
                    attached_by_role = token_role
            elif token_role:
                attached_by_role = token_role

    try:
        evidence, suggestions, is_relevant, rejection_reason, esg_impact = process_and_store_evidence(
            db=db,
            filename=file.filename or "uploaded_evidence",
            file_bytes=file_bytes,
            mime_type=mime_type,
            client_sha256=sha256,
            uploader_id=uploader_id,
            doc_type_hint=doc_type_hint,
            run_ocr=run_ocr,
            doc_category=doc_category,
            bill_type=bill_type,
            attached_by_role=attached_by_role,
            project_id=project_id,
            esg_indicator=esg_indicator,
        )

        message = (
            "Evidence verified and stored in immutable vault."
            if is_relevant else
            f"File stored but rejected by AI engine: {rejection_reason or 'This document does not appear to be relevant to this ESG field.'}"
        )

        return EvidenceUploadResponse(
            evidence=EvidenceFileRead.model_validate(evidence),
            extracted_fields=suggestions,
            is_relevant=is_relevant,
            rejection_reason=rejection_reason,
            message=message,
            esg_impact=esg_impact
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Evidence processing failed: {exc}"
        ) from exc

@router.get("", response_model=List[EvidenceFileRead])
def list_evidence_files(db: Session = Depends(get_db)):
    """Lists all stored evidence files in the vault."""
    return db.query(EvidenceFile).order_by(EvidenceFile.created_at.desc()).all()

@router.get("/by-sha/{sha256_hex}", response_model=EvidenceFileRead)
def get_evidence_by_sha256(sha256_hex: str, db: Session = Depends(get_db)):
    """Resolves a full SHA-256 hex string to an evidence record. Used by Ask AAROHAN AI to load a document directly by its cryptographic ID."""
    evidence = db.query(EvidenceFile).filter(EvidenceFile.sha256 == sha256_hex).first()
    if not evidence:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No evidence document with that SHA-256 hash found in the vault.")
    return evidence

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
    file_bytes = storage_service.get_file_bytes(evidence.storage_key)
    if not file_bytes:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File content not found in storage vault.")
    effective_hint = doc_type_hint or (evidence.bill_type if evidence.doc_category == "Bill" else evidence.doc_type)
    req = E1ExtractRequest(
        evidence_id=evidence.id,
        file_bytes=file_bytes,
        filename=evidence.original_name,
        mime_type=evidence.mime_type,
        doc_type_hint=effective_hint
    )
    e1_res = e1_engine.extract_from_file(req, db_session=db)
    if not e1_res.is_relevant:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=e1_res.rejection_reason or "Document is not relevant to this ESG field."
        )
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
    Soft-deletes an evidence file, preserving historical records.
    Restricted by role and scope. Requires password and reason.
    """
    if not del_req.reason or not del_req.reason.strip() or del_req.reason.strip().lower() == "n/a":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="A mandatory, descriptive reason must be provided for deletion."
        )

    allowed_roles = [
        Role.SYSTEM_ADMIN.value, Role.SUPER_ADMIN.value,
        Role.GROUP_ADMIN.value, Role.SUBSIDIARY_ADMIN.value,
        Role.BU_ADMIN.value, Role.PROJECT_ADMIN.value
    ]
    if current_user.role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied. Role '{current_user.role}' is not authorized to delete evidence."
        )

    # Verify admin password
    if not current_user.hashed_password or not verify_password(del_req.password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid password. Deletion aborted."
        )

    evidence = db.query(EvidenceFile).filter(EvidenceFile.id == evidence_id, EvidenceFile.is_deleted == False).first()
    if not evidence:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidence file not found.")

    # Scope Authorization
    if current_user.role not in (Role.SYSTEM_ADMIN.value, Role.SUPER_ADMIN.value):
        from app.modules.org.models import OrgNode
        from app.modules.auth.service import is_node_descendant
        if not current_user.org_node_id:
            if current_user.role != Role.GROUP_ADMIN.value:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Missing organizational scope for your role.")
        else:
            # Resolve evidence's project_id (code) to OrgNode
            ev_node = db.query(OrgNode).filter(OrgNode.code == evidence.project_id).first()
            if not ev_node or not is_node_descendant(db, str(current_user.org_node_id), str(ev_node.id)):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Evidence belongs to a project outside your authorized scope."
                )

    filename = evidence.original_name
    
    # Soft delete instead of hard delete to preserve audit history
    evidence.is_deleted = True
    evidence.scan_status = "deleted"
    
    # Delete any datapoint links
    db.query(EvidenceLink).filter(EvidenceLink.evidence_id == evidence.id).delete()

    # Create detailed audit log
    from app.modules.audit.service import AuditService
    from app.modules.audit.schemas import AuditLogCreate
    audit_svc = AuditService(db)
    
    details = {
        "reason": del_req.reason.strip(),
        "evidence_id": evidence.evidence_display_id,
        "sha_hash": evidence.sha256,
        "document_name": evidence.original_name,
        "document_type": evidence.doc_type,
        "bill_type": evidence.bill_type,
        "esg_indicator": evidence.esg_indicator,
        "project_id": evidence.project_id,
        "attached_by_role": evidence.attached_by_role,
        "deleted_by_role": current_user.role,
        "deleted_by_name": current_user.full_name,
        "result": "SUCCESS"
    }
    
    audit_svc.log_event(
        AuditLogCreate(
            action="DELETE",
            target_type="EVIDENCE",
            target_id=str(evidence.id),
            actor_id=str(current_user.id),
            actor_email=current_user.email,
            actor_role=current_user.role,
            changes={"is_deleted": True},
            details=details,
            ip_address="0.0.0.0"
        )
    )

    db.commit()

    return {"success": True, "message": f"Evidence file '{filename}' was safely deleted."}

