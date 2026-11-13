from __future__ import annotations

import os
import shutil
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.auth.models import User
from app.modules.auth.router import get_current_active_user
from app.modules.org.models import OrgNode
from app.data.p6_registry import (
    P6_REGISTRY,
    REGISTRY_BY_ID,
    ROLE_FORM_TITLES,
    ROLE_NODE_TYPES,
    SECTION_ORDER,
    get_fields_for_role,
    normalize_p6_role,
)
from app.data import esg_store

router = APIRouter(prefix="/p6-forms", tags=["Principle 6 Role Forms & Data Store"])


class P6SaveRequest(BaseModel):
    node_id: Optional[str] = None
    entries: Dict[str, Dict[str, Any]] = Field(default_factory=dict)


class P6ReviewRequest(BaseModel):
    node_id: str
    target_role: str
    decision: str  # "accepted" | "rejected"
    reason: Optional[str] = None


def _role_str(user: User) -> str:
    r = user.role
    raw = r.value if hasattr(r, "value") else str(r)
    return normalize_p6_role(raw)


def _resolve_caller_node(db: Session, user: User) -> Dict[str, Any]:
    role = _role_str(user)
    all_nodes = esg_store.get_nodes()
    allowed_types = ROLE_NODE_TYPES.get(role, [])
    references = []
    raw_ref = getattr(user, "assigned_project_id", None) or getattr(user, "org_node_id", None)
    if raw_ref:
        references.append(str(raw_ref))
    try:
        from app.security.scope import get_user_effective_scope_node_ids
        references.extend(sorted(
            str(value) for value in get_user_effective_scope_node_ids(db, user)
            if str(value) not in references
        ))
    except Exception:
        pass

    # Resolve every direct or audited assignment. Choosing the first node of a
    # matching role can silently route a user to the wrong project.
    for reference in references:
        node = esg_store.resolve_node(str(reference), fallback_role=None, strict=True)
        if node:
            return node
        db_node = db.query(OrgNode).filter(
            OrgNode.code == str(reference),
            OrgNode.is_deleted == False,
        ).first()
        if not db_node:
            try:
                db_node = db.query(OrgNode).filter(
                    OrgNode.id == str(uuid.UUID(str(reference))),
                    OrgNode.is_deleted == False,
                ).first()
            except (ValueError, TypeError, AttributeError):
                db_node = None
        if db_node:
            # Synchronize the assigned relational project and its ancestors into
            # the P6 mock-data hierarchy when a newly created project is first
            # opened. That lets its submitted P6 report appear in its dashboard.
            chain = []
            current = db_node
            while current:
                chain.append(current)
                current = db.query(OrgNode).filter(
                    OrgNode.id == current.parent_id,
                    OrgNode.is_deleted == False,
                ).first() if current.parent_id else None
            mapped_ids = {}
            for org_node in reversed(chain):
                match = None
                for candidate_ref in (org_node.code, org_node.name):
                    if candidate_ref:
                        match = esg_store.resolve_node(candidate_ref, fallback_role=None, strict=True)
                        if match:
                            break
                if not match and (org_node.type or "").lower() == "group":
                    match = next((n for n in all_nodes if (n.get("type") or "").lower() == "group"), None)
                if match:
                    mapped_ids[str(org_node.id)] = str(match["id"])
                    continue
                parent_p6_id = mapped_ids.get(str(org_node.parent_id)) if org_node.parent_id else None
                if org_node.parent_id and not parent_p6_id:
                    continue
                p6_id = str(org_node.code or org_node.id)
                mapped = esg_store.ensure_node({
                    "id": p6_id,
                    "name": org_node.name or p6_id,
                    "type": (org_node.type or "project").lower(),
                    "parentId": parent_p6_id,
                })
                mapped_ids[str(org_node.id)] = str(mapped["id"])
            mapped_ref = mapped_ids.get(str(db_node.id))
            if mapped_ref:
                node = esg_store.resolve_node(mapped_ref, fallback_role=None, strict=True)
                if node:
                    return node

    if role in ("system_admin", "group_admin", "group_esg_manager", "group_supervisor"):
        return esg_store.resolve_node(None, fallback_role=role) or {"id": "MEIL-GROUP", "name": "Group", "type": "group", "parentId": None}
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="No organizational node assigned for your role scope.",
    )


def _assert_downward_access(caller_node: Dict[str, Any], target_node_id: str) -> None:
    if not esg_store.is_descendant_or_self(caller_node["id"], target_node_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: you may only view your own node or its descendants.",
        )


def _ensure_report_editable(node_id: str, role: str) -> None:
    report_status = esg_store.get_status(node_id, role).get("status", "draft")
    if report_status not in ("draft", "rejected"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"This report is locked while its status is '{report_status}'. It can only be edited after it is returned for correction.",
        )


def _validate_and_normalize_payload(
    role: str,
    node_type: str,
    payload_entries: Dict[str, Dict[str, Any]],
) -> Dict[str, Dict[str, Any]]:
    cleaned: Dict[str, Dict[str, Any]] = {}
    allowed_ids = {f["id"] for f in get_fields_for_role(role, node_type)}
    for fid, val_obj in (payload_entries or {}).items():
        if fid not in REGISTRY_BY_ID:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Field '{fid}' is not in the Principle 6 registry.",
            )
        reg = REGISTRY_BY_ID[fid]
        if reg["ownerRole"] != role or fid not in allowed_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{role}' is not authorized to edit field '{fid}' (owned by '{reg['ownerRole']}').",
            )
        if not isinstance(val_obj, dict):
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Invalid entry format for '{fid}'.")

        cur_val = val_obj.get("current")
        prev_val = val_obj.get("previous")
        ftype = reg["type"]
        if ftype in ("number", "percent"):
            for lbl, raw in (("current", cur_val), ("previous", prev_val)):
                if raw is None or raw == "":
                    continue
                try:
                    num = float(raw)
                except (TypeError, ValueError):
                    raise HTTPException(status_code=422, detail=f"'{fid}' ({lbl}) must be a valid number.")
                if num < 0:
                    raise HTTPException(status_code=422, detail=f"'{fid}' ({lbl}) must be >= 0.")
                if ftype == "percent" and num > 100:
                    raise HTTPException(status_code=422, detail=f"'{fid}' ({lbl}) percentage cannot exceed 100.")
                if lbl == "current":
                    cur_val = num
                else:
                    prev_val = num
            if cur_val == "":
                cur_val = None
            if prev_val == "":
                prev_val = None
        cleaned[fid] = {"current": cur_val, "previous": prev_val}
    return cleaned


@router.get("/schema")
def get_role_form_schema(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Part 3.1: Returns ONLY the blocks/fields whose ownerRole == caller's role on caller's node."""
    role = _role_str(current_user)
    if role not in ROLE_FORM_TITLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Role '{role}' does not have an assigned Principle 6 data-entry form.",
        )
    caller_node = _resolve_caller_node(db, current_user)
    fields = get_fields_for_role(role, caller_node.get("type"))
    fy = esg_store.get_fy()

    sections_map: Dict[str, Dict[str, Any]] = {}
    for sec in SECTION_ORDER:
        sec_fields = [f for f in fields if f["section"] == sec["id"]]
        if sec_fields:
            sections_map[sec["id"]] = {
                "id": sec["id"],
                "indicator": sec["indicator"],
                "title": sec["title"],
                "fields": sec_fields,
            }

    return {
        "role": role,
        "form_title": ROLE_FORM_TITLES[role],
        "node": caller_node,
        "fy": fy,
        "sections": [sections_map[s["id"]] for s in SECTION_ORDER if s["id"] in sections_map],
        "fields": fields,
    }


@router.get("/entries")
def get_my_entries(
    node_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    role = _role_str(current_user)
    caller_node = _resolve_caller_node(db, current_user)
    target_id = node_id or caller_node["id"]
    _assert_downward_access(caller_node, target_id)

    if target_id != caller_node["id"] and role in ("project_supervisor", "project_admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    entries = esg_store.get_role_entries(target_id, role)
    st = esg_store.get_status(target_id, role)
    fy = esg_store.get_fy()

    totals = {}
    if role == "project_supervisor":
        totals = {
            "energy": {
                "current": esg_store.compute_energy_totals(entries, "current"),
                "previous": esg_store.compute_energy_totals(entries, "previous"),
            },
            "water": {
                "current": esg_store.compute_water_totals(entries, "current"),
                "previous": esg_store.compute_water_totals(entries, "previous"),
            },
            "waste": {
                "current": esg_store.compute_waste_totals(entries, "current"),
                "previous": esg_store.compute_waste_totals(entries, "previous"),
            },
        }

    return {
        "node": esg_store.resolve_node(target_id) or caller_node,
        "role": role,
        "fy": fy,
        "status": st,
        "entries": entries,
        "totals": totals,
    }


@router.get("/descendants")
def get_descendant_blocks(
    node_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Part 3.2: Read access flows DOWN only. Returns descendant nodes' blocks read-only."""
    caller_node = _resolve_caller_node(db, current_user)
    target_id = node_id or caller_node["id"]
    _assert_downward_access(caller_node, target_id)

    role = _role_str(current_user)
    desc_ids = esg_store.get_descendant_ids(target_id, include_self=True)
    # Project supervisor cannot inspect sibling or other roles; project_admin can inspect project_supervisor on own project
    data = esg_store.load_data()
    nodes_by_id = {n["id"]: n for n in data.get("nodes", [])}
    blocks = []

    for nid in desc_ids:
        node_entries = data.get("entries", {}).get(nid, {})
        node_statuses = data.get("statuses", {}).get(nid, {})
        for owner_role, r_entries in node_entries.items():
            # On own node, project_supervisor sees only own role; project_admin sees project_supervisor + own
            if nid == caller_node["id"] and role == "project_supervisor" and owner_role != "project_supervisor":
                continue
            if nid == caller_node["id"] and role != owner_role:
                # Allow reviewer on same node to see supervisor at same level
                is_same_level_checker = (
                    (role == "project_admin" and owner_role == "project_supervisor")
                    or (role == "bu_admin" and owner_role == "bu_supervisor")
                    or (role == "subsidiary_admin" and owner_role == "subsidiary_supervisor")
                    or (role == "group_admin" and owner_role == "group_supervisor")
                )
                if not is_same_level_checker:
                    continue
            form_status = dict(node_statuses.get(owner_role, {"status": "draft", "reason": None}))
            form_status["history"] = [
                event for event in data.get("audit_log", [])
                if event.get("node_id") == nid and event.get("owner_role") == owner_role
            ]
            blocks.append({
                "node": nodes_by_id.get(nid, {"id": nid, "name": nid}),
                "ownerRole": owner_role,
                "formTitle": ROLE_FORM_TITLES.get(owner_role, owner_role),
                "status": form_status,
                "entries": r_entries,
            })

    return {"fy": data.get("fy"), "root_node": caller_node, "blocks": blocks}


@router.post("/save")
def save_draft(
    body: P6SaveRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    role = _role_str(current_user)
    caller_node = _resolve_caller_node(db, current_user)
    if body.node_id and body.node_id != caller_node["id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot save entries for another node.")
    _ensure_report_editable(caller_node["id"], role)
    cleaned = _validate_and_normalize_payload(role, caller_node.get("type", ""), body.entries)
    saved = esg_store.save_role_entries(caller_node["id"], role, cleaned, new_status="draft", actor_id=str(current_user.id), actor_name=current_user.full_name)
    return {"status": "draft", "node_id": caller_node["id"], "role": role, "entries": saved}


@router.post("/submit")
def submit_form(
    body: P6SaveRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    role = _role_str(current_user)
    caller_node = _resolve_caller_node(db, current_user)
    if body.node_id and body.node_id != caller_node["id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot submit entries for another node.")
    _ensure_report_editable(caller_node["id"], role)
    cleaned = _validate_and_normalize_payload(role, caller_node.get("type", ""), body.entries)
    saved = esg_store.save_role_entries(caller_node["id"], role, cleaned, new_status="submitted", actor_id=str(current_user.id), actor_name=current_user.full_name)
    return {"status": "submitted", "node_id": caller_node["id"], "role": role, "entries": saved}


_REVIEWABLE_TARGET_ROLES: Dict[str, set] = {
    "project_admin": {"project_supervisor"},
    "bu_esg_manager": {"project_supervisor", "project_admin"},
    "bu_supervisor": {"project_supervisor", "project_admin"},
    "bu_admin": {"bu_supervisor", "bu_esg_manager", "project_supervisor", "project_admin"},
    "subsidiary_esg_manager": {
        "bu_supervisor", "bu_esg_manager", "bu_admin",
        "project_supervisor", "project_admin",
    },
    "subsidiary_admin": {
        "subsidiary_supervisor", "subsidiary_esg_manager",
        "bu_supervisor", "bu_esg_manager", "bu_admin",
        "project_supervisor", "project_admin",
    },
    "group_esg_manager": {
        "subsidiary_supervisor", "subsidiary_esg_manager", "subsidiary_admin",
        "bu_supervisor", "bu_esg_manager", "bu_admin",
        "project_supervisor", "project_admin",
    },
    "group_supervisor": {
        "subsidiary_supervisor", "subsidiary_esg_manager", "subsidiary_admin",
        "bu_supervisor", "bu_esg_manager", "bu_admin",
        "project_supervisor", "project_admin",
    },
    "group_admin": {
        "group_supervisor", "group_esg_manager",
        "subsidiary_supervisor", "subsidiary_esg_manager", "subsidiary_admin",
        "bu_supervisor", "bu_esg_manager", "bu_admin",
        "project_supervisor", "project_admin",
    },
    "system_admin": {
        "group_supervisor", "group_esg_manager", "group_admin",
        "subsidiary_supervisor", "subsidiary_esg_manager", "subsidiary_admin",
        "bu_supervisor", "bu_esg_manager", "bu_admin",
        "project_supervisor", "project_admin",
    },
}


@router.post("/review")
def review_submission(
    body: P6ReviewRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    role = _role_str(current_user)
    if role not in _REVIEWABLE_TARGET_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Reviewer role required.")
    if body.target_role not in _REVIEWABLE_TARGET_ROLES[role]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Role '{role}' is not authorized to review submissions for '{body.target_role}'.",
        )
    caller_node = _resolve_caller_node(db, current_user)
    _assert_downward_access(caller_node, body.node_id)
    # Prevent same-node self-approval (e.g. bu_admin reviewing bu_admin, or bu_admin reviewing own node's project_admin)
    if body.node_id == caller_node["id"] and body.target_role == role and role != "system_admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot review your own role's submission.")
    if body.decision not in ("accepted", "rejected"):
        raise HTTPException(status_code=422, detail="Decision must be 'accepted' or 'rejected'.")
    if body.decision == "rejected" and not (body.reason or "").strip():
        raise HTTPException(status_code=422, detail="Rejection reason is required.")
    current_status = esg_store.get_status(body.node_id, body.target_role).get("status", "draft")
    if current_status != "submitted":
        raise HTTPException(status_code=409, detail=f"This report is no longer awaiting review (status: {current_status}).")
    data = esg_store.load_data()
    latest_submitter = next((
        event.get("actor_id") for event in reversed(data.get("audit_log", []))
        if event.get("node_id") == body.node_id
        and event.get("owner_role") == body.target_role
        and event.get("event") == "submitted"
    ), None)
    if latest_submitter and str(latest_submitter) == str(current_user.id):
        raise HTTPException(status_code=409, detail="Segregation of Duties violation: you cannot review your own submission.")
    st = esg_store.set_status(body.node_id, body.target_role, body.decision, body.reason, actor_id=str(current_user.id), actor_name=current_user.full_name)
    return {"node_id": body.node_id, "target_role": body.target_role, **st}


_ALLOWED_VISIBLE_TYPES_BY_ROLE: Dict[str, set] = {
    "system_admin": {"group", "root", "subsidiary", "company", "bu", "business_unit", "project", "site", "plant", "manufacturing"},
    "group_admin": {"group", "root", "subsidiary", "company", "bu", "business_unit", "project", "site", "plant", "manufacturing"},
    "group_supervisor": {"group", "root", "subsidiary", "company", "bu", "business_unit", "project", "site", "plant", "manufacturing"},
    "group_esg_manager": {"group", "root", "subsidiary", "company", "bu", "business_unit", "project", "site", "plant", "manufacturing"},
    "subsidiary_admin": {"subsidiary", "company", "bu", "business_unit", "project", "site", "plant", "manufacturing"},
    "subsidiary_supervisor": {"subsidiary", "company", "bu", "business_unit", "project", "site", "plant", "manufacturing"},
    "subsidiary_esg_manager": {"subsidiary", "company", "bu", "business_unit", "project", "site", "plant", "manufacturing"},
    "bu_admin": {"bu", "business_unit", "project", "site", "plant", "manufacturing"},
    "bu_supervisor": {"bu", "business_unit", "project", "site", "plant", "manufacturing"},
    "bu_esg_manager": {"bu", "business_unit", "project", "site", "plant", "manufacturing"},
    "project_admin": {"project", "site", "plant", "manufacturing"},
    "project_supervisor": {"project", "site", "plant", "manufacturing"},
}


@router.get("/dashboard")
def get_p6_dashboard(
    node_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    role = _role_str(current_user)
    caller_node = _resolve_caller_node(db, current_user)
    target_id = node_id or caller_node["id"]
    _assert_downward_access(caller_node, target_id)
    nodes = esg_store.get_nodes()
    desc_set = set(esg_store.get_descendant_ids(caller_node["id"], include_self=True))
    allowed_types = _ALLOWED_VISIBLE_TYPES_BY_ROLE.get(role, set())
    db_code_map = {n.code: str(n.id) for n in db.query(OrgNode.code, OrgNode.id).all() if n.code}
    scoped_nodes = [
        {**n, "db_id": db_code_map.get(n["id"], n["id"])}
        for n in nodes
        if n["id"] in desc_set and (not allowed_types or n.get("type", "").lower() in allowed_types)
    ]
    include_local_data = (
        role in (
            "project_supervisor", "project_admin",
            "bu_supervisor", "bu_esg_manager", "bu_admin",
            "subsidiary_supervisor", "subsidiary_esg_manager", "subsidiary_admin",
            "group_supervisor", "group_esg_manager", "group_admin",
        )
        and target_id == caller_node["id"]
    )
    summary = esg_store.get_dashboard_data(
        target_id,
        include_node_data_id=target_id if include_local_data else None,
        local_owner_role=role,
    )
    summary["accessible_nodes"] = scoped_nodes
    return summary


@router.get("/lineage")
def get_p6_lineage(
    kpi: str = Query("energy"),
    node_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    caller_node = _resolve_caller_node(db, current_user)
    target_id = node_id or caller_node["id"]
    _assert_downward_access(caller_node, target_id)
    role = _role_str(current_user)
    include_local_data = (
        role in (
            "project_supervisor", "project_admin",
            "bu_supervisor", "bu_esg_manager", "bu_admin",
            "subsidiary_supervisor", "subsidiary_esg_manager", "subsidiary_admin",
            "group_supervisor", "group_esg_manager", "group_admin",
        )
        and target_id == caller_node["id"]
    )
    return esg_store.get_lineage_breakdown(
        target_id,
        kpi,
        include_node_data_id=target_id if include_local_data else None,
    )


@router.get("/rollup")
def get_p6_rollup(
    node_id: Optional[str] = Query(None),
    only_accepted: bool = Query(True),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    caller_node = _resolve_caller_node(db, current_user)
    target_id = node_id or caller_node["id"]
    _assert_downward_access(caller_node, target_id)
    return esg_store.rollup_node(target_id, only_accepted=only_accepted)


# ── Evidence upload & retrieval ───────────────────────────────────────────────

_ALLOWED_MIME_PREFIXES = (
    "application/pdf",
    "image/",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml",
    "text/csv",
    "text/plain",
)
_MAX_FILE_BYTES = 20 * 1024 * 1024  # 20 MB


def _allowed_mime(mime: str) -> bool:
    return any(mime.startswith(p) for p in _ALLOWED_MIME_PREFIXES)


@router.post("/upload-evidence")
async def upload_field_evidence(
    node_id: str = Form(...),
    field_id: str = Form(...),
    fy_key: str = Form(default="current"),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Upload an evidence document for a specific ESG field and persist metadata in esgData.json."""
    role = _role_str(current_user)
    caller_node = _resolve_caller_node(db, current_user)

    # Only allow uploading for the caller's own node
    if node_id and node_id != caller_node["id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot upload evidence for another node.")
    _ensure_report_editable(caller_node["id"], role)

    # Validate field ownership
    if field_id not in REGISTRY_BY_ID:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"Field '{field_id}' not in registry.")
    reg = REGISTRY_BY_ID[field_id]
    if reg["ownerRole"] != role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Role '{role}' cannot attach evidence to field '{field_id}' (owned by '{reg['ownerRole']}').",
        )

    # Validate MIME type
    mime = file.content_type or "application/octet-stream"
    if not _allowed_mime(mime):
        raise HTTPException(status_code=422, detail=f"File type '{mime}' not allowed. Upload PDF, Excel, CSV, or image.")

    # Read and size-check
    content = await file.read()
    if len(content) > _MAX_FILE_BYTES:
        raise HTTPException(status_code=422, detail="File exceeds 20 MB limit.")
    from app.modules.evidence.service import process_and_store_evidence
    from app.modules.evidence.integrity import compute_sha256
    vault_project_id = db.query(OrgNode.id).filter(OrgNode.code == caller_node["id"]).scalar() or caller_node["id"]
    vault_record, _, _, _, _ = process_and_store_evidence(
        db=db,
        filename=file.filename or "evidence",
        file_bytes=content,
        mime_type=mime,
        client_sha256=compute_sha256(content),
        uploader_id=str(current_user.id),
        run_ocr=False,
        doc_category="Report",
        attached_by_role=role,
        project_id=str(vault_project_id),
        esg_indicator=field_id,
    )
    record = esg_store.save_field_evidence(
        node_id=caller_node["id"],
        role=role,
        field_id=field_id,
        fy_key=fy_key,
        file_name=file.filename or "evidence",
        file_path=None,
        mime_type=mime,
        uploaded_by=getattr(current_user, "email", None) or getattr(current_user, "full_name", str(current_user.id)),
        vault_evidence_id=str(vault_record.id),
        evidence_display_id=vault_record.evidence_display_id,
        sha256=vault_record.sha256,
        storage_key=vault_record.storage_key,
    )
    return {"success": True, **record}


@router.delete("/evidence/{node_id}/{field_id}/{fy_key}/{evidence_id}")
def detach_field_evidence(
    node_id: str, field_id: str, fy_key: str, evidence_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    caller_node = _resolve_caller_node(db, current_user)
    if node_id != caller_node["id"]:
        raise HTTPException(status_code=403, detail="Can only detach evidence from your own node.")
    _ensure_report_editable(node_id, _role_str(current_user))
    if field_id not in REGISTRY_BY_ID or REGISTRY_BY_ID[field_id]["ownerRole"] != _role_str(current_user):
        raise HTTPException(status_code=403, detail="Cannot detach evidence from this field.")
    removed = esg_store.remove_field_evidence(node_id, _role_str(current_user), field_id, fy_key, evidence_id)
    if not removed:
        raise HTTPException(status_code=404, detail="Evidence attachment not found.")
    return {"success": True, "detached": True}


@router.get("/evidence/{node_id}/{field_id}")
def get_evidence_for_field(
    node_id: str,
    field_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Return evidence records for a given node + field (all fy_keys)."""
    caller_node = _resolve_caller_node(db, current_user)
    _assert_downward_access(caller_node, node_id)
    role = _role_str(current_user)
    # Determine whose evidence to look up: for reviewers checking a child's evidence, use the field's ownerRole
    lookup_role = REGISTRY_BY_ID.get(field_id, {}).get("ownerRole", role)
    return {
        "node_id": node_id,
        "field_id": field_id,
        "role": lookup_role,
        "evidence": esg_store.get_field_evidence(node_id, lookup_role, field_id),
    }


@router.get("/evidence/{node_id}")
def get_all_evidence_for_node(
    node_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Return all evidence records for a given node (all fields, all fy_keys)."""
    caller_node = _resolve_caller_node(db, current_user)
    _assert_downward_access(caller_node, node_id)
    role = _role_str(current_user)
    return {
        "node_id": node_id,
        "role": role,
        "evidence": esg_store.get_node_evidence(node_id, role),
    }


@router.get("/evidence-download/{node_id}/{field_id}/{evidence_id}")
def download_p6_evidence(
    node_id: str,
    field_id: str,
    evidence_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Download a P6 evidence file after enforcing the caller's hierarchy scope."""
    caller_node = _resolve_caller_node(db, current_user)
    _assert_downward_access(caller_node, node_id)
    field = REGISTRY_BY_ID.get(field_id)
    if not field:
        raise HTTPException(status_code=404, detail="Evidence field not found.")
    evidence = esg_store.get_field_evidence(node_id, field["ownerRole"], field_id)
    record = next(
        (item for records in evidence.values() for item in records if item.get("evidence_id") == evidence_id),
        None,
    )
    if not record:
        raise HTTPException(status_code=404, detail="Evidence file not found.")
    if record.get("storage_key"):
        from app.modules.evidence.storage import storage_service
        payload = storage_service.get_file_bytes(record["storage_key"])
        if payload is None:
            raise HTTPException(status_code=404, detail="Evidence file is unavailable.")
        return Response(payload, media_type=record.get("mime_type") or "application/octet-stream", headers={"Content-Disposition": f'attachment; filename="{record.get("file_name") or "evidence"}"'})
    evidence_root = esg_store.EVIDENCE_DIR.resolve()
    file_path = Path(record.get("file_path") or "").resolve()
    if not file_path.is_relative_to(evidence_root) or not file_path.is_file():
        raise HTTPException(status_code=404, detail="Evidence file is unavailable.")
    return FileResponse(file_path, filename=record.get("file_name") or file_path.name, media_type=record.get("mime_type") or "application/octet-stream")

