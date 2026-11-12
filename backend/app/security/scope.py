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


def get_user_effective_scope_node_ids(db: Session, user: User) -> Set[str]:
    """
    Resolves the set of assigned OrgNode IDs (UUID strings) and codes directly bound to a user across all sources:
    1. Direct assignment: user.org_node_id (and its node code)
    2. Explicit role assignments in user_role_assignments table: UserRoleAssignment.entity_id (and node code)
    3. Hierarchy fallback for Group tier (group_admin, group_esg_manager, group_supervisor):
       If neither (1) nor (2) is set, resolves to the root Group node in org_nodes
    4. Auto-healing: if user.org_node_id is None but an active assignment exists, syncs user.org_node_id
       in the current database session so downstream consumers remain consistent.
    """
    assigned = set()

    if user.org_node_id:
        assigned.add(str(user.org_node_id))
        primary_node = db.query(OrgNode).filter(OrgNode.id == user.org_node_id, OrgNode.is_deleted == False).first()
        if primary_node and primary_node.code:
            assigned.add(primary_node.code)

    try:
        assignments = db.query(UserRoleAssignment).filter(
            UserRoleAssignment.user_id == user.id,
            UserRoleAssignment.is_active == True,
            UserRoleAssignment.entity_id.isnot(None)
        ).all()
        for ura in assignments:
            assigned.add(str(ura.entity_id))
            ura_node = db.query(OrgNode).filter(OrgNode.id == ura.entity_id, OrgNode.is_deleted == False).first()
            if ura_node and ura_node.code:
                assigned.add(ura_node.code)
    except Exception:
        pass

    if not assigned and user.role in (
        Role.GROUP_ADMIN.value,
        Role.GROUP_ESG_MANAGER.value,
        Role.GROUP_SUPERVISOR.value,
    ):
        root_group = db.query(OrgNode).filter(OrgNode.type == "group", OrgNode.is_deleted == False).first()
        if root_group:
            assigned.add(str(root_group.id))
            if root_group.code:
                assigned.add(root_group.code)

    # Auto-heal in-session user.org_node_id if missing
    if not user.org_node_id and assigned:
        for item in assigned:
            try:
                val = uuid.UUID(str(item))
                user.org_node_id = str(val)
                db.flush()
                break
            except (ValueError, AttributeError, TypeError):
                continue

    return assigned


def get_user_assigned_project_ids(db: Session, user: User) -> Set[str]:
    """
    Returns the set of OrgNode UUIDs and codes explicitly assigned to a project user (admin or supervisor).
    Sources:
    1. user.org_node_id (and the corresponding node's code)
    2. Any active UserRoleAssignment where entity_id is set
    """
    return get_user_effective_scope_node_ids(db, user)


def is_user_authorized_for_project(db: Session, user: User, project_identifier: str) -> bool:
    """
    Validates whether `user` is authorized to access the entity or project specified by `project_identifier` (UUID or code).
    - system_admin: True
    - project_admin & project_supervisor: True if project is explicitly assigned, or an ancestor of assigned project
    - bu_admin & bu_esg_manager / bu_supervisor: True if entity is equal to or a descendant of any assigned BU
    - subsidiary_admin & subsidiary_esg_manager / subsidiary_supervisor: True if entity is equal to or a descendant of any assigned Subsidiary
    - group_admin & group_esg_manager / group_supervisor: True if entity is equal to or a descendant of any assigned Group
    """
    if not project_identifier:
        return False

    if user.role == Role.SYSTEM_ADMIN.value:
        return True

    target_node = find_org_node_safe(db, project_identifier)
    if not target_node:
        return False

    from app.modules.auth.service import is_node_descendant

    # Project Tier: explicitly assigned projects + ancestors for breadcrumb navigation
    if user.role in (Role.PROJECT_ADMIN.value, Role.PROJECT_SUPERVISOR.value):
        assigned_identifiers = get_user_effective_scope_node_ids(db, user)
        if (str(target_node.id) in assigned_identifiers) or (target_node.code in assigned_identifiers):
            return True
        try:
            all_active = db.query(OrgNode.id, OrgNode.parent_id, OrgNode.code).filter(OrgNode.is_deleted == False).all()
            parent_map = {str(n.id): (str(n.parent_id) if n.parent_id else None) for n in all_active}
            code_to_id = {n.code: str(n.id) for n in all_active if n.code}
            for item in list(assigned_identifiers):
                curr_id = code_to_id.get(item, str(item))
                while curr_id and curr_id in parent_map:
                    pid = parent_map.get(curr_id)
                    if pid:
                        if pid == str(target_node.id):
                            return True
                        curr_id = pid
                    else:
                        break
        except Exception:
            pass
        return False

    # Hierarchical Tiers (BU, Subsidiary, Group)
    assigned_scope_ids = get_user_effective_scope_node_ids(db, user)
    if not assigned_scope_ids:
        if user.role in (Role.GROUP_ADMIN.value, Role.GROUP_ESG_MANAGER.value, Role.GROUP_SUPERVISOR.value):
            return True  # Platform root group level
        return False

    # Check if target_node matches or is a descendant of ANY assigned scope node
    for scope_id in assigned_scope_ids:
        if str(target_node.id) == str(scope_id) or target_node.code == str(scope_id):
            return True
        try:
            scope_uuid = str(uuid.UUID(str(scope_id)))
            if is_node_descendant(db, scope_uuid, str(target_node.id)):
                return True
        except (ValueError, AttributeError, TypeError):
            node_by_code = find_org_node_safe(db, scope_id)
            if node_by_code and is_node_descendant(db, str(node_by_code.id), str(target_node.id)):
                return True

    return False


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

    if user.role in (Role.GROUP_ADMIN.value, Role.GROUP_ESG_MANAGER.value, Role.GROUP_SUPERVISOR.value):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Group tier users cannot create projects directly. Projects must be created by a BU Admin under the appropriate Business Unit."
        )

    if user.role in (Role.SUBSIDIARY_ADMIN.value, Role.SUBSIDIARY_ESG_MANAGER.value, Role.SUBSIDIARY_SUPERVISOR.value):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Subsidiary tier users cannot create projects directly. Projects must be created by a BU Admin under the appropriate Business Unit."
        )

    if user.role in (Role.BU_ESG_MANAGER.value, Role.BU_SUPERVISOR.value):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="BU ESG Managers cannot create projects directly. Projects must be created by a BU Admin."
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

    if user.role != Role.BU_ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Business Unit Admins are permitted to create projects."
        )

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

    effective_scope = get_user_effective_scope_node_ids(db, user)
    if not effective_scope:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Missing organizational scope for your BU Admin role."
        )

    from app.modules.auth.service import is_node_descendant

    if user.role == Role.BU_ADMIN.value:
        # Parent must be their assigned Business Unit (or a direct descendant under it)
        is_own_bu = (str(parent_node.id) in effective_scope) or (parent_node.code in effective_scope)
        if not is_own_bu:
            for s_id in effective_scope:
                try:
                    s_uuid = str(uuid.UUID(str(s_id)))
                    if is_node_descendant(db, s_uuid, str(parent_node.id)):
                        is_own_bu = True
                        break
                except (ValueError, AttributeError, TypeError):
                    node_by_code = find_org_node_safe(db, s_id)
                    if node_by_code and is_node_descendant(db, str(node_by_code.id), str(parent_node.id)):
                        is_own_bu = True
                        break

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
    - group_admin & group_esg_manager / group_supervisor: projects/entities under their Group hierarchy.
    - subsidiary_admin & subsidiary_esg_manager / subsidiary_supervisor: projects/entities under their Subsidiary hierarchy.
    - bu_admin & bu_esg_manager / bu_supervisor: projects/entities under their Business Unit hierarchy.
    - project_admin & project_supervisor: explicitly assigned projects + ancestors for navigation.
    """
    if user.role == Role.SYSTEM_ADMIN.value:
        return query

    if user.role in (Role.PROJECT_ADMIN.value, Role.PROJECT_SUPERVISOR.value):
        assigned_ids = get_user_effective_scope_node_ids(db, user)
        if not assigned_ids:
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
                    pid = parent_map.get(curr_id)
                    if pid:
                        allowed_ids.add(pid)
                        curr_id = pid
                    else:
                        break
        except Exception:
            pass

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

    # Hierarchical tiers: Group, Subsidiary, BU
    assigned_scope_ids = get_user_effective_scope_node_ids(db, user)
    if not assigned_scope_ids:
        if user.role in (Role.GROUP_ADMIN.value, Role.GROUP_ESG_MANAGER.value, Role.GROUP_SUPERVISOR.value):
            return query  # Platform group level
        return query.filter(OrgNode.id == "00000000-0000-0000-0000-000000000000")

    from app.modules.auth.service import get_descendant_node_ids
    all_allowed_ids = set()
    for scope_id in assigned_scope_ids:
        all_allowed_ids.add(str(scope_id))
        try:
            scope_uuid = str(uuid.UUID(str(scope_id)))
            descendants = get_descendant_node_ids(db, scope_uuid)
            all_allowed_ids.update(descendants)
        except (ValueError, AttributeError, TypeError):
            node_by_code = find_org_node_safe(db, scope_id)
            if node_by_code:
                all_allowed_ids.add(str(node_by_code.id))
                descendants = get_descendant_node_ids(db, str(node_by_code.id))
                all_allowed_ids.update(descendants)

    if not all_allowed_ids:
        return query.filter(OrgNode.id == "00000000-0000-0000-0000-000000000000")

    uuids = []
    codes = []
    for d in all_allowed_ids:
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
    if role in (Role.GROUP_ADMIN.value, Role.GROUP_ESG_MANAGER.value, Role.GROUP_SUPERVISOR.value):
        if node_type != "group":
            raise ValueError(f"Group roles must be assigned to an entity of type 'group' (got '{node_type}').")
    elif role in (Role.SUBSIDIARY_ADMIN.value, Role.SUBSIDIARY_ESG_MANAGER.value, Role.SUBSIDIARY_SUPERVISOR.value):
        if node_type not in ("subsidiary", "company", "associate", "jv"):
            raise ValueError(f"Subsidiary roles must be assigned to a Subsidiary or Company node (got '{node_type}').")
    elif role in (Role.BU_ADMIN.value, Role.BU_ESG_MANAGER.value, Role.BU_SUPERVISOR.value):
        if node_type not in ("business_unit", "bu"):
            raise ValueError(f"BU roles must be assigned to a Business Unit node (got '{node_type}').")
    elif role in (Role.PROJECT_ADMIN.value, Role.PROJECT_SUPERVISOR.value):
        if node_type not in ("project", "site"):
            raise ValueError(f"Project roles must be assigned to a Project or Site node (got '{node_type}').")
    else:
        raise ValueError(f"Invalid runtime role '{role}'.")

    return node
