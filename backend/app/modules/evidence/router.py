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
from app.modules.evidence.models import EvidenceFile, EvidenceLink, ScanStatus
from app.modules.evidence.schemas import (
    EvidenceFileRead,
    EvidenceLinkCreate,
    EvidenceLinkRead,
    EvidenceUploadResponse,
    ExtractedFieldSuggestion,
    EvidenceDeleteRequest,
    EvidenceRestoreRequest,
    TrashEvidenceRead
)
from app.modules.evidence.service import process_and_store_evidence, link_evidence_to_datapoint
from app.modules.evidence.storage import storage_service

logger = logging.getLogger(__name__)

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
    current_user = None
    if credentials and credentials.credentials:
        from app.security.jwt import decode_access_token
        payload = decode_access_token(credentials.credentials)
        if payload:
            uploader_id = payload.get("sub")
            token_role = payload.get("role")
            if uploader_id:
                current_user = db.query(User).filter(User.id == uploader_id).first()
                if current_user and current_user.role:
                    attached_by_role = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
                elif token_role:
                    attached_by_role = token_role
            elif token_role:
                attached_by_role = token_role

    if project_id and current_user:
        from app.security.scope import assert_user_authorized_for_project
        assert_user_authorized_for_project(db, current_user, project_id, "upload evidence to this project")

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
def list_evidence_files(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
):
    """Lists stored active evidence files in the vault, filtered to authenticated user's authorized scope."""
    from app.security.jwt import decode_access_token
    from app.security.rbac import Role
    from app.security.scope import get_user_assigned_project_ids

    current_user = None
    if credentials and credentials.credentials:
        payload = decode_access_token(credentials.credentials)
        if payload and payload.get("sub"):
            current_user = db.query(User).filter(User.id == payload["sub"], User.is_deleted == False).first()

    query = db.query(EvidenceFile).filter(EvidenceFile.is_deleted == False)

    if current_user:
        if current_user.role == Role.PROJECT_ADMIN.value:
            assigned_ids = get_user_assigned_project_ids(db, current_user)
            # Can see files attached to assigned projects or uploaded by themselves
            from sqlalchemy import or_
            query = query.filter(
                or_(
                    EvidenceFile.project_id.in_(list(assigned_ids)) if assigned_ids else False,
                    EvidenceFile.uploader_id == current_user.id
                )
            )
        elif current_user.role != Role.SYSTEM_ADMIN.value:
            if current_user.org_node_id:
                from app.modules.auth.service import get_descendant_node_ids
                desc_ids = get_descendant_node_ids(db, str(current_user.org_node_id))
                from sqlalchemy import or_
                query = query.filter(
                    or_(
                        EvidenceFile.project_id.in_(list(desc_ids)),
                        EvidenceFile.uploader_id == current_user.id
                    )
                )

    return query.order_by(EvidenceFile.created_at.desc()).all()

@router.get("/by-sha/{sha256_hex}", response_model=EvidenceFileRead)
def get_evidence_by_sha256(sha256_hex: str, db: Session = Depends(get_db)):
    """Resolves a full SHA-256 hex string to an evidence record. Used by Ask AAROHAN AI to load a document directly by its cryptographic ID."""
    evidence = db.query(EvidenceFile).filter(EvidenceFile.sha256 == sha256_hex, EvidenceFile.is_deleted == False).first()
    if not evidence:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No active evidence document with that SHA-256 hash found in the vault.")
    return evidence


@router.get("/trash", response_model=List[TrashEvidenceRead])
def get_evidence_trash(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Hierarchical Trash Can for deleted evidence records (Section 4).
    - System Admin: All evidence deletions across the system.
    - Group Admin: Evidence deletions within their authorized group scope.
    - Subsidiary Admin: Evidence deletions within their authorized subsidiary scope.
    - BU Admin: Evidence deletions within their authorized BU scope.
    - Project Admin: Only their own evidence deletion records.
    """
    from app.modules.org.models import OrgNode
    from app.modules.auth.service import is_node_descendant, _resolve_org_hierarchy

    query = db.query(EvidenceFile).filter(EvidenceFile.is_deleted == True)

    if current_user.role == Role.SYSTEM_ADMIN.value:
        raw_items = query.order_by(EvidenceFile.deleted_at.desc().nullslast(), EvidenceFile.updated_at.desc()).all()
    elif current_user.role == Role.PROJECT_ADMIN.value:
        raw_items = query.filter(
            EvidenceFile.deleted_by_id == current_user.id
        ).order_by(EvidenceFile.deleted_at.desc().nullslast(), EvidenceFile.updated_at.desc()).all()
    else:
        # group_admin, subsidiary_admin, bu_admin
        all_deleted = query.order_by(EvidenceFile.deleted_at.desc().nullslast(), EvidenceFile.updated_at.desc()).all()
        if not current_user.org_node_id and current_user.role == Role.GROUP_ADMIN.value:
            raw_items = all_deleted
        else:
            from app.modules.auth.service import get_descendant_node_ids
            descendant_nodes = get_descendant_node_ids(db, str(current_user.org_node_id)) if current_user.org_node_id else set()

            filtered = []
            for ev in all_deleted:
                # Own records
                if str(ev.deleted_by_id) == str(current_user.id) or str(ev.uploader_id) == str(current_user.id):
                    filtered.append(ev)
                    continue
                # Scope check by project_id
                if ev.project_id and (ev.project_id in descendant_nodes):
                    filtered.append(ev)
                    continue
                # Scope check by deleting user's org node
                if ev.deleted_by and ev.deleted_by.org_node_id and (str(ev.deleted_by.org_node_id) in descendant_nodes):
                    filtered.append(ev)
                    continue
                # Scope check by uploader's org node
                if ev.uploader and ev.uploader.org_node_id and (str(ev.uploader_id) in descendant_nodes or (ev.uploader.org_node_id and str(ev.uploader.org_node_id) in descendant_nodes)):
                    filtered.append(ev)
                    continue
            raw_items = filtered

    results = []
    node_cache = {str(n.id): n for n in db.query(OrgNode).all()}
    code_to_node = {n.code: n for n in node_cache.values() if n.code}

    for ev in raw_items:
        target_node = None
        if ev.project_id:
            target_node = code_to_node.get(ev.project_id) or node_cache.get(ev.project_id)

        org_h = _resolve_org_hierarchy(db, str(target_node.id) if target_node else None)

        uploader_name = ev.uploader.full_name if ev.uploader else None
        uploader_email = ev.uploader.email if ev.uploader else None
        deleted_by_name = (ev.deleted_by.full_name or ev.deleted_by.email) if ev.deleted_by else None

        results.append(
            TrashEvidenceRead(
                id=str(ev.id),
                evidence_display_id=ev.evidence_display_id,
                original_name=ev.original_name,
                mime_type=ev.mime_type,
                size_bytes=ev.size_bytes,
                sha256=ev.sha256,
                doc_type=ev.doc_type,
                doc_category=ev.doc_category,
                bill_type=ev.bill_type,
                esg_indicator=ev.esg_indicator,
                project_id=ev.project_id,
                project_name=org_h.get("project_name") or (target_node.name if target_node else ev.project_id),
                group_name=org_h.get("group_name"),
                subsidiary_name=org_h.get("subsidiary_name"),
                bu_name=org_h.get("bu_name"),
                uploader_id=str(ev.uploader_id) if ev.uploader_id else None,
                uploader_name=uploader_name,
                uploader_email=uploader_email,
                attached_by_role=ev.attached_by_role,
                uploaded_at=ev.uploaded_at,
                is_deleted=ev.is_deleted,
                deleted_at=ev.deleted_at or ev.updated_at,
                deleted_by_id=str(ev.deleted_by_id) if ev.deleted_by_id else None,
                deleted_by_name=deleted_by_name,
                deleted_by_role=ev.deleted_by_role,
                deletion_reason=ev.deletion_reason or "Controlled administrative deletion",
                scan_status=ev.scan_status,
            )
        )
    return results


@router.get("/{evidence_id}", response_model=EvidenceFileRead)
def get_evidence_metadata(
    evidence_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Retrieves file metadata and cryptographic hash for assurance auditing."""
    evidence = db.query(EvidenceFile).filter(EvidenceFile.id == evidence_id, EvidenceFile.is_deleted == False).first()
    if not evidence:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidence file not found or has been deleted.")

    if evidence.project_id:
        from app.security.scope import assert_user_authorized_for_project
        assert_user_authorized_for_project(db, current_user, evidence.project_id, "view this evidence file metadata")

    return evidence

@router.post("/{evidence_id}/extract", response_model=List[ExtractedFieldSuggestion])
def extract_from_existing_evidence(
    evidence_id: str,
    doc_type_hint: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Re-runs or inspects AI Engine E1 OCR on an existing evidence document."""
    from app.ai.e1_extract.extractor import e1_engine
    from app.ai.schemas import E1ExtractRequest
    evidence = db.query(EvidenceFile).filter(EvidenceFile.id == evidence_id, EvidenceFile.is_deleted == False).first()
    if not evidence:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidence file not found.")

    if evidence.project_id:
        from app.security.scope import assert_user_authorized_for_project
        assert_user_authorized_for_project(db, current_user, evidence.project_id, "run extraction on this evidence file")

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
def download_evidence_file(
    evidence_id: str,
    token: Optional[str] = None,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
):
    """Downloads raw evidence document from vault."""
    evidence = db.query(EvidenceFile).filter(EvidenceFile.id == evidence_id).first()
    if not evidence:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidence file not found.")
    if evidence.is_deleted:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Evidence file has been deleted and cannot be downloaded directly."
        )

    auth_token = credentials.credentials if (credentials and credentials.credentials) else token
    if auth_token:
        from app.security.jwt import decode_access_token
        payload = decode_access_token(auth_token)
        if payload and payload.get("sub"):
            current_user = db.query(User).filter(User.id == payload["sub"], User.is_deleted == False).first()
            if current_user and evidence.project_id:
                from app.security.scope import assert_user_authorized_for_project
                try:
                    assert_user_authorized_for_project(db, current_user, evidence.project_id, "download this evidence file")
                except Exception as e:
                    logger.warning(f"Scope check on download evidence: {e}")

    file_bytes = storage_service.get_file_bytes(evidence.storage_key)
    if not file_bytes:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File content not found in storage vault.")

    return Response(
        content=file_bytes,
        media_type=evidence.mime_type or "application/octet-stream",
        headers={
            "Content-Disposition": f'attachment; filename="{evidence.original_name}"'
        }
    )

@router.post("/link", response_model=EvidenceLinkRead, status_code=status.HTTP_201_CREATED)
def link_evidence(link_req: EvidenceLinkCreate, db: Session = Depends(get_db)):
    """Attaches an evidence file to a reported KPI data point."""
    link = link_evidence_to_datapoint(db, link_req)
    return link

@router.get("/datapoint/{data_point_id}", response_model=List[EvidenceLinkRead])
def get_datapoint_evidence(data_point_id: str, db: Session = Depends(get_db)):
    """Lists all supporting evidence documents linked to a data point (3-click audit trace)."""
    links = db.query(EvidenceLink).filter(EvidenceLink.data_point_id == data_point_id, EvidenceLink.is_deleted == False).all()
    return links

@router.get("/{evidence_id}/view")
def view_evidence_file(
    evidence_id: str,
    token: Optional[str] = None,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
):
    """Serves raw evidence document inline for in-browser PDF, JPEG, PNG rendering."""
    evidence = db.query(EvidenceFile).filter(EvidenceFile.id == evidence_id).first()
    if not evidence:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidence file not found.")
    if evidence.is_deleted:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Evidence file has been deleted and cannot be viewed directly."
        )

    auth_token = credentials.credentials if (credentials and credentials.credentials) else token
    if auth_token:
        from app.security.jwt import decode_access_token
        payload = decode_access_token(auth_token)
        if payload and payload.get("sub"):
            current_user = db.query(User).filter(User.id == payload["sub"], User.is_deleted == False).first()
            if current_user and evidence.project_id:
                from app.security.scope import assert_user_authorized_for_project
                try:
                    assert_user_authorized_for_project(db, current_user, evidence.project_id, "view this evidence file")
                except Exception as e:
                    logger.warning(f"Scope check on view evidence: {e}")

    file_bytes = storage_service.get_file_bytes(evidence.storage_key)
    if not file_bytes:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File content not found in storage vault.")

    return Response(
        content=file_bytes,
        media_type=evidence.mime_type or "application/octet-stream",
        headers={
            "Content-Disposition": f'inline; filename="{evidence.original_name}"',
            "Cache-Control": "public, max-age=3600"
        }
    )

def _find_org_node(db: Session, identifier: Optional[str]):
    if not identifier:
        return None
    import uuid
    from app.modules.org.models import OrgNode
    is_uuid = False
    try:
        uuid.UUID(str(identifier))
        is_uuid = True
    except (ValueError, AttributeError, TypeError):
        is_uuid = False
    if is_uuid:
        return db.query(OrgNode).filter((OrgNode.code == str(identifier)) | (OrgNode.id == str(identifier))).first()
    return db.query(OrgNode).filter(OrgNode.code == str(identifier)).first()


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
    from datetime import datetime, timezone
    from app.modules.auth.service import log_admin_audit, verify_admin_password_check

    if not del_req.reason or not del_req.reason.strip() or del_req.reason.strip().lower() == "n/a":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="A mandatory, descriptive reason must be provided for deletion."
        )

    allowed_roles = [
        Role.SYSTEM_ADMIN.value,
        Role.GROUP_ADMIN.value,
        Role.SUBSIDIARY_ADMIN.value,
        Role.BU_ADMIN.value,
        Role.PROJECT_ADMIN.value
    ]
    if current_user.role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied. Role '{current_user.role}' is not authorized to delete evidence."
        )

    # Verify user's own password with Argon2id / bcrypt support
    if not verify_admin_password_check(current_user, del_req.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid password. Deletion aborted."
        )

    evidence = db.query(EvidenceFile).filter(EvidenceFile.id == evidence_id, EvidenceFile.is_deleted == False).first()
    if not evidence:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidence file not found or already deleted.")

    # Scope Authorization
    if current_user.role == Role.PROJECT_ADMIN.value:
        is_owner = str(evidence.uploader_id) == str(current_user.id)
        is_node_match = False
        if current_user.org_node_id and evidence.project_id:
            from app.modules.org.models import OrgNode
            node = db.query(OrgNode).filter(OrgNode.id == current_user.org_node_id).first()
            if node and (node.code == evidence.project_id or str(node.id) == evidence.project_id):
                is_node_match = True
        if not is_owner and not is_node_match:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Project Admins can only delete evidence uploaded by themselves or within their assigned project."
            )
    elif current_user.role != Role.SYSTEM_ADMIN.value:
        from app.modules.auth.service import is_node_descendant
        if not current_user.org_node_id:
            if current_user.role != Role.GROUP_ADMIN.value:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Missing organizational scope for your role.")
        else:
            authorized = False
            if evidence.project_id:
                ev_node = _find_org_node(db, evidence.project_id)
                if ev_node and is_node_descendant(db, str(current_user.org_node_id), str(ev_node.id)):
                    authorized = True
            if not authorized and evidence.uploader_id:
                uploader_user = db.query(User).filter(User.id == evidence.uploader_id).first()
                if uploader_user and uploader_user.org_node_id and is_node_descendant(db, str(current_user.org_node_id), str(uploader_user.org_node_id)):
                    authorized = True
            if not authorized and str(evidence.uploader_id) == str(current_user.id):
                authorized = True
            if not authorized:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Evidence belongs to an organizational unit outside your authorized scope."
                )

    filename = evidence.original_name
    now = datetime.now(timezone.utc)

    # Soft delete
    evidence.is_deleted = True
    evidence.scan_status = "deleted"
    evidence.deleted_at = now
    evidence.deleted_by_id = current_user.id
    evidence.deleted_by_role = current_user.role
    evidence.deletion_reason = del_req.reason.strip()

    # Soft-delete associated datapoint links to preserve calculations lineage
    links = db.query(EvidenceLink).filter(EvidenceLink.evidence_id == evidence.id).all()
    for l in links:
        l.is_deleted = True

    # Audit logging
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

    log_admin_audit(
        db,
        actor=current_user,
        action="EVIDENCE_DELETED",
        target_name=evidence.original_name,
        target_role=current_user.role,
        target_scope_id=evidence.project_id,
        details=details
    )

    db.commit()

    return {"success": True, "message": f"Evidence file '{filename}' was safely deleted and moved to Trash Can."}

@router.post("/{evidence_id}/restore")
def restore_evidence_file(
    evidence_id: str,
    req: Optional[EvidenceRestoreRequest] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Restores a soft-deleted evidence file back to active vault.
    Authorized within scope. Audited.
    """
    from app.modules.audit.service import AuditService
    from app.modules.audit.schemas import AuditLogCreate
    from app.modules.auth.service import log_admin_audit

    evidence = db.query(EvidenceFile).filter(EvidenceFile.id == evidence_id, EvidenceFile.is_deleted == True).first()
    if not evidence:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Deleted evidence file not found.")

    # Scope check
    if current_user.role != Role.SYSTEM_ADMIN.value:
        if current_user.role == Role.PROJECT_ADMIN.value:
            if str(evidence.deleted_by_id) != str(current_user.id):
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only restore your own evidence records.")
        else:
            if current_user.org_node_id:
                from app.modules.auth.service import is_node_descendant
                ev_node = _find_org_node(db, evidence.project_id)
                if ev_node and not is_node_descendant(db, str(current_user.org_node_id), str(ev_node.id)):
                    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Evidence is outside your authorized scope.")

    evidence.is_deleted = False
    evidence.scan_status = ScanStatus.CLEAN.value
    # Restore links
    for link in db.query(EvidenceLink).filter(EvidenceLink.evidence_id == evidence.id).all():
        link.is_deleted = False

    reason = req.reason if (req and req.reason) else "Restored by Administrator"

    AuditService(db).log_event(
        AuditLogCreate(
            action="RESTORE",
            target_type="EVIDENCE",
            target_id=str(evidence.id),
            actor_id=str(current_user.id),
            actor_email=current_user.email,
            actor_role=current_user.role,
            changes={"is_deleted": False},
            details={"evidence_id": evidence.evidence_display_id, "document_name": evidence.original_name, "reason": reason},
            ip_address="0.0.0.0"
        )
    )
    log_admin_audit(
        db, actor=current_user, action="EVIDENCE_RESTORED",
        target_name=evidence.original_name, target_role=current_user.role,
        target_scope_id=evidence.project_id,
        details={"evidence_id": evidence.evidence_display_id, "reason": reason}
    )
    db.commit()
    return {"success": True, "message": f"Evidence file '{evidence.original_name}' restored successfully."}


class CleanTrashRequest(BaseModel):
    admin_password: str


@router.post("/trash/clean", status_code=status.HTTP_200_OK)
def clean_evidence_trash(
    req: CleanTrashRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Permanently purges all soft-deleted evidence records.
    Restricted to System Admin. Requires password confirmation, no comment needed.
    """
    from app.modules.auth.service import verify_admin_password_check, log_admin_audit
    from app.modules.audit.service import AuditService
    from app.modules.audit.schemas import AuditLogCreate

    if current_user.role != Role.SYSTEM_ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only System Administrator can empty/clean the Trash Can."
        )

    if not verify_admin_password_check(current_user, req.admin_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid administrator password. Trash cleaning unauthorized."
        )

    deleted_files = db.query(EvidenceFile).filter(EvidenceFile.is_deleted == True).all()
    count = len(deleted_files)

    for ev in deleted_files:
        db.query(EvidenceLink).filter(EvidenceLink.evidence_id == ev.id).delete(synchronize_session=False)
        try:
            storage_service.delete_file(ev.storage_key)
        except Exception:
            pass
        db.delete(ev)

    AuditService(db).log_event(
        AuditLogCreate(
            action="PURGE",
            target_type="EVIDENCE_TRASH",
            target_id="ALL",
            actor_id=str(current_user.id),
            actor_email=current_user.email,
            actor_role=current_user.role,
            changes={"purged_count": count},
            details={"action": "clean_trash", "items_purged": count},
            ip_address="0.0.0.0"
        )
    )

    log_admin_audit(
        db, actor=current_user, action="EVIDENCE_TRASH_CLEANED",
        target_name=f"{count} files", target_role=current_user.role,
        target_scope_id="GLOBAL",
        details={"purged_count": count}
    )

    db.commit()
    return {"success": True, "message": f"Successfully cleaned Evidence Trash Can ({count} records purged).", "count": count}


