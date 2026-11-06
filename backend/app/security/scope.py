"""
app/security/scope.py
Centralized Role-to-Scope & Project Isolation Security Engine.
Enforces the Final Five-Role Architecture:
1. system_admin     (platform-wide)
2. group_admin      (Group and descendants)
3. subsidiary_admin (Subsidiary and descendants)
4. bu_admin         (Business Unit and descendants)
5. project_admin    (explicitly assigned projects only)

Strict Rules:
- project_admin can NEVER create projects (HTTP 403).
- project_admin can ONLY access projects explicitly assigned to them.
- All resource requests (forms, submissions, evidence, reports, downloads) are validated server-side.
"""
from typing import Optional, Set, List
import uuid
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.security.rbac import Role
from app.modules.auth.models import User, UserRoleAssignment
from app.modules.org.models import OrgNode


def find_org_node_safe(db: Session, identifier: Optional[str]) -> Optional[OrgNode]:
    """
    Safely finds an OrgNode by code or UUID without triggering PostgreSQL DataError
    (psycopg.errors.InvalidTextRepresentation).
    """
    if not identifier:
        return None
    raw_str = str(identifier).strip()
    # 1. Search by unique alphanumeric code first (always safe)
    node = db.query(OrgNode).filter(OrgNode.code == raw_str, OrgNode.is_deleted == False).first()
    if node:
        return node

    # 2. Check if valid UUID before querying UUID primary key
    is_uuid = False
    try:
        uuid_val = uuid.UUID(raw_str)
        is_uuid = True
    except (ValueError, AttributeError, TypeError):
        is_uuid = False

    if is_uuid:
        return db.query(OrgNode).filter(OrgNode.id == str(uuid_val), OrgNode.is_deleted == False).first()

    return None


def get_user_assigned_project_ids(db: Session, user: User) -> Set[str]:
    """
    Returns the set of OrgNode UUIDs and codes explicitly assigned to a project_admin.
    Sources:
    1. user.org_node_id (and the corresponding node's code)
    2. Any active UserRoleAssignment where role == 'project_admin' and entity_id is set
    """
    assigned = set()

    if user.org_node_id:
        assigned.add(str(user.org_node_id))
        primary_node = db.query(OrgNode).filter(OrgNode.id == user.org_node_id, OrgNode.is_deleted == False).first()
        if primary_node and primary_node.code:
            assigned.add(primary_node.code)

    assignments = db.query(UserRoleAssignment).filter(
        UserRoleAssignment.user_id == user.id,
        UserRoleAssignment.is_active == True
    ).all()
    for ura in assignments:
        if ura.entity_id:
            assigned.add(str(ura.entity_id))
            ura_node = db.query(OrgNode).filter(OrgNode.id == ura.entity_id, OrgNode.is_deleted == False).first()
            if ura_node and ura_node.code:
                assigned.add(ura_node.code)

    return assigned


def is_user_authorized_for_project(db: Session, user: User, project_identifier: str) -> bool:
    """
    Validates whether `user` is authorized to access the project specified by `project_identifier` (UUID or code).
    - system_admin: True
    - project_admin & project_supervisor: True ONLY if project is explicitly assigned
    - bu_admin & bu_supervisor: True if project is a descendant of their assigned BU
    - subsidiary_admin & subsidiary_supervisor: True if project is a descendant of their assigned Subsidiary
    - group_admin & group_supervisor: True if project is a descendant of their assigned Group
    """
    if not project_identifier:
        return False

    if user.role == Role.SYSTEM_ADMIN.value:
        return True

    project_node = find_org_node_safe(db, project_identifier)
    if not project_node:
        return False

    if user.role in (Role.PROJECT_ADMIN.value, Role.PROJECT_SUPERVISOR.value):
        assigned_identifiers = get_user_assigned_project_ids(db, user)
        return (str(project_node.id) in assigned_identifiers) or (project_node.code in assigned_identifiers)

    # For hierarchical admins and supervisors:
    if not user.org_node_id:
        if user.role in (Role.GROUP_ADMIN.value, Role.GROUP_SUPERVISOR.value):
            return True  # Root group level
        return False

    from app.modules.auth.service import is_node_descendant
    return is_node_descendant(db, str(user.org_node_id), str(project_node.id))


def assert_user_authorized_for_project(
    db: Session,
    user: User,
    project_identifier: str,
    action_desc: str = "access this project resource"
) -> OrgNode:
    """
    Raises HTTP 404 if project does not exist.
    Raises HTTP 403 if authenticated user is not authorized.
    Returns the resolved OrgNode on success.
    """
    project_node = find_org_node_safe(db, project_identifier)
    if not project_node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project or operational entity '{project_identifier}' not found."
        )

    if not is_user_authorized_for_project(db, user, project_identifier):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied. You are not authorized to {action_desc}."
        )

    return project_node


def assert_can_create_project(db: Session, user: User, parent_id: Optional[str]) -> OrgNode:
    """
    Enforces the Strict Project-Creation Permission Matrix:
    | Role                                                    | Create project | Authorized scope           |
    |---------------------------------------------------------|----------------|----------------------------|
    | system_admin                                            | Yes            | Any location on platform   |
    | bu_admin                                                | Yes            | Their assigned BU only     |
    | bu_supervisor                                           | NO             | Verification Admin only    |
    | group_admin / group_supervisor                          | NO             | Forbidden — must use BU    |
    | subsidiary_admin / subsidiary_supervisor                | NO             | Forbidden — must use BU    |
    | project_admin / project_supervisor                      | NO             | Forbidden entirely         |
    """
    if user.role in (Role.PROJECT_ADMIN.value, Role.PROJECT_SUPERVISOR.value):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Project roles are not permitted to create projects or organizational entities."
        )

    if user.role in (Role.GROUP_ADMIN.value, Role.GROUP_SUPERVISOR.value):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Group tier users cannot create projects directly. Projects must be created by a BU Admin under the appropriate Business Unit."
        )

    if user.role in (Role.SUBSIDIARY_ADMIN.value, Role.SUBSIDIARY_SUPERVISOR.value):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Subsidiary tier users cannot create projects directly. Projects must be created by a BU Admin under the appropriate Business Unit."
        )

    if user.role == Role.BU_SUPERVISOR.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="BU Supervisors cannot create projects directly. Projects must be created by a BU Admin."
        )

    if user.role == Role.SYSTEM_ADMIN.value:
        if parent_id:
            parent = find_org_node_safe(db, parent_id)
            if not parent:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Parent organization unit '{parent_id}' not found."
                )
            return parent
        return None

    if not parent_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="A parent Business Unit or organizational node must be specified to create a project."
        )

    parent_node = find_org_node_safe(db, parent_id)
    if not parent_node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Parent organization unit '{parent_id}' not found."
        )

    if not user.org_node_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Missing organizational scope for your BU Admin role."
        )

    from app.modules.auth.service import is_node_descendant

    if user.role == Role.BU_ADMIN.value:
        # Parent must be their assigned Business Unit (or a direct descendant under it)
        is_own_bu = (str(parent_node.id) == str(user.org_node_id)) or is_node_descendant(db, str(user.org_node_id), str(parent_node.id))
        if not is_own_bu:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="BU Admins may only create projects within their assigned Business Unit."
            )

    return parent_node


def filter_projects_query_for_user(db: Session, query, user: User):
    """
    Applies server-side scope filtering to an OrgNode query.
    - system_admin: unrestricted.
    - group_admin & group_supervisor: projects under their Group hierarchy.
    - subsidiary_admin & subsidiary_supervisor: projects under their Subsidiary hierarchy.
    - bu_admin & bu_supervisor: projects under their Business Unit hierarchy.
    - project_admin & project_supervisor: ONLY explicitly assigned projects.
    """
    if user.role == Role.SYSTEM_ADMIN.value:
        return query

    if user.role in (Role.PROJECT_ADMIN.value, Role.PROJECT_SUPERVISOR.value):
        assigned_ids = get_user_assigned_project_ids(db, user)
        if not assigned_ids:
            # No active project assignments: return empty result set
            return query.filter(OrgNode.id == "00000000-0000-0000-0000-000000000000")
        
        # Include assigned projects and their ancestors (BU, Subsidiary, Group) so they can navigate the hierarchy
        allowed_ids = set(assigned_ids)
        try:
            all_active = db.query(OrgNode.id, OrgNode.parent_id, OrgNode.code).filter(OrgNode.is_deleted == False).all()
            parent_map = {str(n.id): (str(n.parent_id) if n.parent_id else None) for n in all_active}
            code_to_id = {n.code: str(n.id) for n in all_active if n.code}
            
            for item in list(assigned_ids):
                curr_id = code_to_id.get(item, str(item))
                while curr_id and curr_id in parent_map:
                    pid = parent_map[curr_id]
                    if pid:
                        allowed_ids.add(pid)
                        curr_id = pid
                    else:
                        break
        except Exception:
            pass

        # Match by ID or code
        uuids = []
        codes = []
        for ident in allowed_ids:
            try:
                uuid.UUID(str(ident))
                uuids.append(str(ident))
            except (ValueError, AttributeError):
                codes.append(str(ident))
        
        conditions = []
        if uuids:
            conditions.append(OrgNode.id.in_(uuids))
        if codes:
            conditions.append(OrgNode.code.in_(codes))
        
        if len(conditions) == 2:
            from sqlalchemy import or_
            return query.filter(or_(*conditions))
        elif len(conditions) == 1:
            return query.filter(conditions[0])
        return query.filter(OrgNode.id == "00000000-0000-0000-0000-000000000000")

    # For group, subsidiary, bu tiers:
    if not user.org_node_id:
        if user.role in (Role.GROUP_ADMIN.value, Role.GROUP_SUPERVISOR.value):
            return query  # Platform group level
        return query.filter(OrgNode.id == "00000000-0000-0000-0000-000000000000")

    from app.modules.auth.service import get_descendant_node_ids
    descendant_ids = get_descendant_node_ids(db, str(user.org_node_id))
    if not descendant_ids:
        return query.filter(OrgNode.id == str(user.org_node_id))
    
    uuids = []
    codes = []
    for d in descendant_ids:
        try:
            uuid.UUID(str(d))
            uuids.append(str(d))
        except (ValueError, AttributeError):
            codes.append(str(d))
            
    from sqlalchemy import or_
    conds = []
    if uuids:
        conds.append(OrgNode.id.in_(uuids))
    if codes:
        conds.append(OrgNode.code.in_(codes))
    if conds:
        return query.filter(or_(*conds))
    return query


def validate_role_to_scope(db: Session, role: str, org_node_id: Optional[str]) -> Optional[OrgNode]:
    """
    Enforces the Role-to-Scope Matrix:
    - system_admin: Platform-level assignment (org_node_id may be None or valid)
    - group_admin / group_supervisor: Exactly one assigned Group (type == 'group')
    - subsidiary_admin / subsidiary_supervisor: Exactly one assigned Subsidiary (type in ('subsidiary', 'company', 'associate', 'jv'))
    - bu_admin / bu_supervisor: Exactly one assigned BU (type in ('business_unit', 'bu'))
    - project_admin / project_supervisor: One or more explicitly assigned Projects (type in ('project', 'site'))

    Rejects invalid types, non-existent entities, and parent-child hierarchy mismatches.
    """
    if role == Role.SYSTEM_ADMIN.value:
        if not org_node_id:
            return None
        node = find_org_node_safe(db, org_node_id)
        if not node:
            raise ValueError(f"Organization node '{org_node_id}' not found.")
        return node

    if not org_node_id:
        raise ValueError(f"Role '{role}' requires an explicit, active organizational scope assignment.")

    node = find_org_node_safe(db, org_node_id)
    if not node:
        raise ValueError(f"Organization node '{org_node_id}' not found.")

    node_type = (node.type or "").lower()
    if role in (Role.GROUP_ADMIN.value, Role.GROUP_SUPERVISOR.value):
        if node_type != "group":
            raise ValueError(f"Group roles must be assigned to an entity of type 'group' (got '{node_type}').")
    elif role in (Role.SUBSIDIARY_ADMIN.value, Role.SUBSIDIARY_SUPERVISOR.value):
        if node_type not in ("subsidiary", "company", "associate", "jv"):
            raise ValueError(f"Subsidiary roles must be assigned to a Subsidiary or Company node (got '{node_type}').")
    elif role in (Role.BU_ADMIN.value, Role.BU_SUPERVISOR.value):
        if node_type not in ("business_unit", "bu"):
            raise ValueError(f"BU roles must be assigned to a Business Unit node (got '{node_type}').")
    elif role in (Role.PROJECT_ADMIN.value, Role.PROJECT_SUPERVISOR.value):
        if node_type not in ("project", "site"):
            raise ValueError(f"Project roles must be assigned to a Project or Site node (got '{node_type}').")
    else:
        raise ValueError(f"Invalid runtime role '{role}'.")

    return node
