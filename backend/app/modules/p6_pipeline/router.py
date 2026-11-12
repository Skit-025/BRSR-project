from __future__ import annotations

import os
import shutil
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
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
    SECTION_ORDER,
    get_fields_for_role,
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
    return r.value if hasattr(r, "value") else str(r)


def _resolve_caller_node(db: Session, user: User) -> Dict[str, Any]:
    role = _role_str(user)
    raw_ref = getattr(user, "assigned_project_id", None) or getattr(user, "org_node_id", None)
    if raw_ref:
        # Try direct match in esgData.json
        node = esg_store.resolve_node(str(raw_ref), fallback_role=None)
        if node and (str(node["id"]) == str(raw_ref) or node["name"].lower() == str(raw_ref).lower()):
            return node
        # Try resolving DB OrgNode UUID -> code/name -> esgData.json node
        db_node = db.query(OrgNode).filter(OrgNode.id == str(raw_ref)).first()
        if db_node:
            by_code = esg_store.resolve_node(db_node.code, fallback_role=None)
            if by_code and str(by_code["id"]).lower() == str(db_node.code).lower():
                return by_code
            by_name = esg_store.resolve_node(db_node.name, fallback_role=None)
            if by_name:
                return by_name
    # Fallback by role level
    return esg_store.resolve_node(None, fallback_role=role) or {"id": "MEIL-GROUP", "name": "Group", "type": "group", "parentId": None}


def _assert_downward_access(caller_node: Dict[str, Any], target_node_id: str) -> None:
    if not esg_store.is_descendant_or_self(caller_node["id"], target_node_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: you may only view your own node or its descendants.",
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
            blocks.append({
                "node": nodes_by_id.get(nid, {"id": nid, "name": nid}),
                "ownerRole": owner_role,
                "formTitle": ROLE_FORM_TITLES.get(owner_role, owner_role),
                "status": node_statuses.get(owner_role, {"status": "draft", "reason": None}),
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
    cur_st = esg_store.get_status(caller_node["id"], role)
    if cur_st.get("status") == "submitted":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Submitted revisions are read-only.")
    cleaned = _validate_and_normalize_payload(role, caller_node.get("type", ""), body.entries)
    saved = esg_store.save_role_entries(caller_node["id"], role, cleaned, new_status="draft")
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
    cleaned = _validate_and_normalize_payload(role, caller_node.get("type", ""), body.entries)
    saved = esg_store.save_role_entries(caller_node["id"], role, cleaned, new_status="submitted")
    return {"status": "submitted", "node_id": caller_node["id"], "role": role, "entries": saved}


@router.post("/review")
def review_submission(
    body: P6ReviewRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    role = _role_str(current_user)
    if role not in ("project_admin", "bu_admin", "subsidiary_admin", "group_admin", "system_admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Reviewer role required.")
    caller_node = _resolve_caller_node(db, current_user)
    _assert_downward_access(caller_node, body.node_id)
    if body.decision not in ("accepted", "rejected"):
        raise HTTPException(status_code=422, detail="Decision must be 'accepted' or 'rejected'.")
    if body.decision == "rejected" and not (body.reason or "").strip():
        raise HTTPException(status_code=422, detail="Rejection reason is required.")
    st = esg_store.set_status(body.node_id, body.target_role, body.decision, body.reason)
    return {"node_id": body.node_id, "target_role": body.target_role, **st}


@router.get("/dashboard")
def get_p6_dashboard(
    node_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    caller_node = _resolve_caller_node(db, current_user)
    target_id = node_id or caller_node["id"]
    _assert_downward_access(caller_node, target_id)
    nodes = esg_store.get_nodes()
    desc_set = set(esg_store.get_descendant_ids(caller_node["id"], include_self=True))
    scoped_nodes = [n for n in nodes if n["id"] in desc_set]
    summary = esg_store.get_dashboard_data(target_id)
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
    return esg_store.get_lineage_breakdown(target_id, kpi)


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

    # Store file on disk
    dest_dir = esg_store.EVIDENCE_DIR / caller_node["id"] / role / field_id
    dest_dir.mkdir(parents=True, exist_ok=True)
    safe_stem = Path(file.filename or "evidence").stem[:80]
    dest_name = f"{uuid.uuid4().hex}_{safe_stem}{Path(file.filename or 'file').suffix or '.bin'}"
    dest_path = dest_dir / dest_name
    dest_path.write_bytes(content)

    record = esg_store.save_field_evidence(
        node_id=caller_node["id"],
        role=role,
        field_id=field_id,
        fy_key=fy_key,
        file_name=file.filename or dest_name,
        file_path=str(dest_path),
        mime_type=mime,
        uploaded_by=getattr(current_user, "email", None) or getattr(current_user, "full_name", str(current_user.id)),
    )
    return {"success": True, **record}


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

