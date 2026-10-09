"""
app/modules/audit/router.py
FastAPI router for querying immutable audit logs and running cryptographic chain verification.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.modules.audit.schemas import AuditLogRead, AuditLogCreate, ChainVerificationResult
from app.modules.audit.service import AuditService
from app.modules.auth.router import get_current_active_user
from app.modules.auth.models import User
from app.security.rbac import Role

router = APIRouter(prefix="/audit", tags=["Immutable Audit Trail"])


from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
security = HTTPBearer(auto_error=False)


@router.get("/logs", response_model=List[AuditLogRead])
def list_audit_logs(
    target_type: Optional[str] = Query(None, description="Filter by target type e.g. submission"),
    target_id: Optional[str] = Query(None, description="Filter by target resource UUID"),
    actor_id: Optional[str] = Query(None, description="Filter by actor UUID"),
    action: Optional[str] = Query(None, description="Filter by action code"),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db),
):
    """Retrieve immutable audit events with scope-aware hierarchical filtering and evidence protection."""
    from app.modules.audit.models import AuditLog
    from app.modules.org.models import OrgNode
    from app.modules.auth.service import is_node_descendant
    from app.security.jwt import decode_access_token

    current_user = None
    if credentials and credentials.credentials:
        payload = decode_access_token(credentials.credentials)
        if payload and payload.get("sub"):
            current_user = db.query(User).filter(User.id == payload["sub"], User.is_deleted == False).first()

    query = db.query(AuditLog)
    if target_type:
        query = query.filter(AuditLog.target_type == target_type)
    if target_id:
        query = query.filter(AuditLog.target_id == target_id)
    if actor_id:
        query = query.filter(AuditLog.actor_id == actor_id)
    if action:
        query = query.filter(AuditLog.action == action)

    # Scoping rules based on caller's role
    if not current_user or current_user.role != Role.SYSTEM_ADMIN.value:
        if not current_user:
            # Anonymous / unauthenticated: protect evidence deletion records from public exposure
            query = query.filter(
                ~((AuditLog.target_type == "EVIDENCE") & (AuditLog.action == "DELETE"))
            )
        elif current_user.role == Role.PROJECT_ADMIN.value:
            # Project Admin: own actions and project scope only
            query = query.filter(
                (AuditLog.actor_id == str(current_user.id)) |
                (AuditLog.details['project_id'].astext == str(current_user.org_node_id))
            )
        else:
            # group_admin, subsidiary_admin, bu_admin
            if current_user.org_node_id:
                descendants = db.query(OrgNode).all()
                allowed_codes = []
                for n in descendants:
                    if is_node_descendant(db, str(current_user.org_node_id), str(n.id)):
                        allowed_codes.append(n.code)
                        allowed_codes.append(str(n.id))

                sub_users = [str(u.id) for u in db.query(User).filter(User.org_node_id.in_([n.id for n in descendants if is_node_descendant(db, str(current_user.org_node_id), str(n.id))])).all()]

                query = query.filter(
                    (AuditLog.actor_id == str(current_user.id)) |
                    (AuditLog.actor_id.in_(sub_users)) |
                    (AuditLog.details['project_id'].astext.in_(allowed_codes))
                )

    return query.order_by(AuditLog.sequence_number.desc()).offset(offset).limit(limit).all()


@router.get("/verify-chain", response_model=ChainVerificationResult)
def verify_audit_chain(db: Session = Depends(get_db)):
    """
    Cryptographic verification endpoint:
    Verifies that the entire audit log SHA-256 hash chain is unbroken and unmodified.
    """
    service = AuditService(db)
    return service.verify_ledger()


@router.post("/events", response_model=AuditLogRead, status_code=status.HTTP_201_CREATED)
def record_audit_event(
    event_in: AuditLogCreate,
    db: Session = Depends(get_db),
):
    """Manually record a structured audit event into the ledger."""
    service = AuditService(db)
    return service.log_event(event_in)

@router.get("/trash", response_model=List[AuditLogRead])
def list_trash(
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Returns deletion audit logs (Trash) according to hierarchical visibility.
    - system_admin sees all.
    - project_admin sees only their own deletions.
    - others see only deletions within their authorized organizational scope.
    """
    from app.modules.audit.models import AuditLog
    from app.modules.org.models import OrgNode
    from app.modules.auth.service import is_node_descendant

    query = db.query(AuditLog).filter(AuditLog.action == "DELETE").order_by(AuditLog.sequence_number.desc())

    if current_user.role != Role.SYSTEM_ADMIN.value:
        if current_user.role == Role.PROJECT_ADMIN.value:
            query = query.filter(AuditLog.actor_id == str(current_user.id))
        elif not current_user.org_node_id:
            if current_user.role != Role.GROUP_ADMIN.value:
                return []
        else:
            descendants = db.query(OrgNode).all()
            allowed_codes = []
            for n in descendants:
                if is_node_descendant(db, str(current_user.org_node_id), str(n.id)):
                    if n.code:
                        allowed_codes.append(n.code)
                    allowed_codes.append(str(n.id))

            sub_users = [str(u.id) for u in db.query(User).filter(User.org_node_id.in_([n.id for n in descendants if is_node_descendant(db, str(current_user.org_node_id), str(n.id))])).all()]

            query = query.filter(
                (AuditLog.actor_id == str(current_user.id)) |
                (AuditLog.actor_id.in_(sub_users)) |
                (AuditLog.details['project_id'].astext.in_(allowed_codes))
            )

    return query.offset(offset).limit(limit).all()

@router.get("/trash/{deletion_id}", response_model=AuditLogRead)
def get_trash_details(
    deletion_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Detailed view for a specific deletion record."""
    from app.modules.audit.models import AuditLog
    from fastapi import HTTPException

    log = db.query(AuditLog).filter(AuditLog.id == deletion_id, AuditLog.action == "DELETE").first()
    if not log:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Deletion record not found.")

    if current_user.role != Role.SYSTEM_ADMIN.value:
        if current_user.role == Role.PROJECT_ADMIN.value:
            if str(log.actor_id) != str(current_user.id):
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
        elif not current_user.org_node_id:
            if current_user.role != Role.GROUP_ADMIN.value:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
        else:
            from app.modules.org.models import OrgNode
            from app.modules.auth.service import is_node_descendant
            project_code = log.details.get("project_id") if log.details else None
            is_actor_self = str(log.actor_id) == str(current_user.id)
            if not is_actor_self and project_code:
                import uuid
                is_uuid = False
                try:
                    uuid.UUID(str(project_code))
                    is_uuid = True
                except (ValueError, AttributeError, TypeError):
                    is_uuid = False
                if is_uuid:
                    ev_node = db.query(OrgNode).filter((OrgNode.code == str(project_code)) | (OrgNode.id == str(project_code))).first()
                else:
                    ev_node = db.query(OrgNode).filter(OrgNode.code == str(project_code)).first()

                if not ev_node or not is_node_descendant(db, str(current_user.org_node_id), str(ev_node.id)):
                    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Outside authorized scope.")

    return log

