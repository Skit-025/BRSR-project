import uuid
import pytest
from fastapi import HTTPException
from app.db.session import SessionLocal
from app.security.rbac import Role
from app.modules.auth.models import User, UserRoleAssignment
from app.modules.org.models import OrgNode
from app.security.scope import (
    assert_can_create_project,
    is_user_authorized_for_project,
    assert_user_authorized_for_project,
    filter_projects_query_for_user,
    validate_role_to_scope,
)


@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


def test_five_runtime_roles_enum():
    """Verify that Role enum contains the canonical platform roles and backward-compatible aliases."""
    canonical_roles = {
        "system_admin",
        "group_admin",
        "group_esg_manager",
        "subsidiary_admin",
        "subsidiary_esg_manager",
        "bu_admin",
        "bu_esg_manager",
        "project_admin",
        "project_supervisor",
    }
    actual_roles = {r.value for r in Role}
    assert canonical_roles.issubset(actual_roles), f"Missing canonical roles: {canonical_roles - actual_roles}"


def test_project_admin_cannot_create_project(db):
    user = User(
        id=str(uuid.uuid4()),
        email="proj.admin@test.com",
        hashed_password="test_hash_password",
        role=Role.PROJECT_ADMIN.value,
        full_name="Project Admin Test",
        is_active=True
    )
    with pytest.raises(HTTPException) as exc_info:
        assert_can_create_project(db, user, parent_id=str(uuid.uuid4()))
    assert exc_info.value.status_code == 403
    assert "not permitted to create projects" in exc_info.value.detail


def test_non_bu_roles_cannot_create_project(db):
    for role_val in (
        Role.SYSTEM_ADMIN.value,
        Role.GROUP_ADMIN.value,
        Role.SUBSIDIARY_ADMIN.value,
        Role.PROJECT_ADMIN.value,
        Role.PROJECT_SUPERVISOR.value,
    ):
        user = User(
            id=str(uuid.uuid4()),
            email=f"{role_val}@test.com",
            hashed_password="test_hash_password",
            role=role_val,
            full_name=f"{role_val} Test",
            is_active=True
        )
        with pytest.raises(HTTPException) as exc_info:
            assert_can_create_project(db, user, parent_id=None)
        assert exc_info.value.status_code == 403


def test_bu_supervisor_can_create_project_auto_assigned_to_own_bu(db):
    suffix = uuid.uuid4().hex[:6]
    bu_node = OrgNode(
        id=str(uuid.uuid4()),
        code=f"BU-SUP-{suffix}",
        name=f"BU Sup {suffix}",
        type="business_unit",
        path=f"BUSUP{suffix}",
        is_active=True
    )
    db.add(bu_node)
    db.flush()

    user = User(
        id=str(uuid.uuid4()),
        email=f"bu.sup.{suffix}@test.com",
        hashed_password="test_hash_password",
        role=Role.BU_SUPERVISOR.value,
        org_node_id=bu_node.id,
        full_name="BU Supervisor Test",
        is_active=True
    )

    # Automatically places project under assigned BU when parent_id is omitted
    res = assert_can_create_project(db, user, parent_id=None)
    assert str(res.id) == str(bu_node.id)


def test_bu_admin_can_create_project_only_under_own_bu(db):
    suffix = uuid.uuid4().hex[:6]
    bu_node = OrgNode(
        id=str(uuid.uuid4()),
        code=f"BU-{suffix}",
        name=f"BU {suffix}",
        type="business_unit",
        path=f"BU{suffix}",
        is_active=True
    )
    other_bu_node = OrgNode(
        id=str(uuid.uuid4()),
        code=f"BU-OTHER-{suffix}",
        name=f"BU Other {suffix}",
        type="business_unit",
        path=f"BUOTHER{suffix}",
        is_active=True
    )
    db.add(bu_node)
    db.add(other_bu_node)
    db.flush()

    user = User(
        id=str(uuid.uuid4()),
        email="bu.admin@test.com",
        hashed_password="test_hash_password",
        role=Role.BU_ADMIN.value,
        org_node_id=bu_node.id,
        full_name="BU Admin Test",
        is_active=True
    )

    # Allowed under own BU
    res = assert_can_create_project(db, user, parent_id=str(bu_node.id))
    assert str(res.id) == str(bu_node.id)

    # Denied under other BU
    with pytest.raises(HTTPException) as exc_info:
        assert_can_create_project(db, user, parent_id=str(other_bu_node.id))
    assert exc_info.value.status_code == 403


def test_project_admin_data_isolation(db):
    suffix = uuid.uuid4().hex[:6]
    p1 = OrgNode(id=str(uuid.uuid4()), code=f"PRJ1-{suffix}", name="Project 1", type="project", path=f"PRJ1{suffix}", is_active=True)
    p2 = OrgNode(id=str(uuid.uuid4()), code=f"PRJ2-{suffix}", name="Project 2", type="project", path=f"PRJ2{suffix}", is_active=True)
    db.add(p1)
    db.add(p2)
    db.flush()

    # User assigned only to p1
    user = User(
        id=str(uuid.uuid4()),
        email="isolated.maker@test.com",
        hashed_password="test_hash_password",
        role=Role.PROJECT_ADMIN.value,
        org_node_id=p1.id,
        full_name="Isolated Maker",
        is_active=True
    )
    db.add(user)
    assignment = UserRoleAssignment(
        id=str(uuid.uuid4()),
        user_id=user.id,
        role=Role.PROJECT_ADMIN.value,
        entity_id=str(p1.id),
        assigned_by_id=user.id,
        is_active=True
    )
    db.add(assignment)
    db.flush()

    # Authorized for p1
    assert is_user_authorized_for_project(db, user, str(p1.id)) is True
    assert_user_authorized_for_project(db, user, str(p1.id))

    # Unauthorized for p2
    assert is_user_authorized_for_project(db, user, str(p2.id)) is False
    with pytest.raises(HTTPException) as exc_info:
        assert_user_authorized_for_project(db, user, str(p2.id))
    assert exc_info.value.status_code == 403


def test_filter_projects_query_for_user(db):
    suffix = uuid.uuid4().hex[:6]
    p1 = OrgNode(id=str(uuid.uuid4()), code=f"FA-{suffix}", name="Filter A", type="project", path=f"FA{suffix}", is_active=True)
    p2 = OrgNode(id=str(uuid.uuid4()), code=f"FB-{suffix}", name="Filter B", type="project", path=f"FB{suffix}", is_active=True)
    db.add(p1)
    db.add(p2)
    db.flush()

    proj_user = User(
        id=str(uuid.uuid4()),
        email="filter.user@test.com",
        hashed_password="test_hash_password",
        full_name="Filter User",
        role=Role.PROJECT_ADMIN.value,
        org_node_id=p1.id,
        is_active=True
    )
    db.add(proj_user)
    assignment = UserRoleAssignment(
        id=str(uuid.uuid4()),
        user_id=proj_user.id,
        role=Role.PROJECT_ADMIN.value,
        entity_id=str(p1.id),
        assigned_by_id=proj_user.id,
        is_active=True
    )
    db.add(assignment)
    db.flush()

    # Query filtered for project_admin must only return p1
    q = db.query(OrgNode).filter(OrgNode.id.in_([p1.id, p2.id]))
    filtered_q = filter_projects_query_for_user(db, q, proj_user)
    results = filtered_q.all()
    assert len(results) == 1
    assert results[0].id == p1.id

    # Query for system_admin returns both
    sys_user = User(id=str(uuid.uuid4()), email="sys@test.com", hashed_password="test_hash_password", full_name="System Admin", role=Role.SYSTEM_ADMIN.value, is_active=True)
    sys_q = filter_projects_query_for_user(db, q, sys_user)
    assert len(sys_q.all()) == 2
