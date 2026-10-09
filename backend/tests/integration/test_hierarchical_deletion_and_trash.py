import io
import uuid
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.db.session import init_db, SessionLocal
from app.security.jwt import create_access_token
from app.security.passwords import get_password_hash
from app.modules.auth.models import User, UserCreationRequest
from app.modules.org.models import OrgNode
from app.modules.evidence.models import EvidenceFile, EvidenceLink
from app.security.rbac import Role

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_db():
    init_db()


def create_test_user(db, email, role, org_node_id=None, password="TestPassword123!"):
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        existing.hashed_password = get_password_hash(password)
        existing.role = role
        existing.org_node_id = org_node_id
        existing.is_active = True
        existing.is_deleted = False
        db.commit()
        db.refresh(existing)
        user = existing
    else:
        user = User(
            id=str(uuid.uuid4()),
            email=email,
            full_name=email.split("@")[0].replace(".", " ").title(),
            role=role,
            org_node_id=org_node_id,
            hashed_password=get_password_hash(password),
            is_active=True,
            is_deleted=False
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    
    token = create_access_token(subject=str(user.id), role=user.role, org_node_id=str(user.org_node_id) if user.org_node_id else None)
    return user, token


def create_test_org_hierarchy(db, suffix):
    group = OrgNode(
        id=str(uuid.uuid4()),
        code=f"GRP-{suffix}",
        name=f"Group {suffix}",
        type="group",
        path=f"GRP_{suffix}",
        is_active=True,
        is_deleted=False
    )
    db.add(group)
    db.flush()

    sub_a = OrgNode(
        id=str(uuid.uuid4()),
        parent_id=group.id,
        code=f"SUB-A-{suffix}",
        name=f"Subsidiary A {suffix}",
        type="subsidiary",
        path=f"GRP_{suffix}.SUB_A_{suffix}",
        is_active=True,
        is_deleted=False
    )
    sub_b = OrgNode(
        id=str(uuid.uuid4()),
        parent_id=group.id,
        code=f"SUB-B-{suffix}",
        name=f"Subsidiary B {suffix}",
        type="subsidiary",
        path=f"GRP_{suffix}.SUB_B_{suffix}",
        is_active=True,
        is_deleted=False
    )
    db.add_all([sub_a, sub_b])
    db.flush()

    bu_a1 = OrgNode(
        id=str(uuid.uuid4()),
        parent_id=sub_a.id,
        code=f"BU-A1-{suffix}",
        name=f"BU A1 {suffix}",
        type="bu",
        path=f"GRP_{suffix}.SUB_A_{suffix}.BU_A1_{suffix}",
        is_active=True,
        is_deleted=False
    )
    db.add(bu_a1)
    db.flush()

    prj_a1_1 = OrgNode(
        id=str(uuid.uuid4()),
        parent_id=bu_a1.id,
        code=f"PRJ-A1-1-{suffix}",
        name=f"Project A1-1 {suffix}",
        type="project",
        path=f"GRP_{suffix}.SUB_A_{suffix}.BU_A1_{suffix}.PRJ_A1_1_{suffix}",
        is_active=True,
        is_deleted=False
    )
    prj_b1_1 = OrgNode(
        id=str(uuid.uuid4()),
        parent_id=sub_b.id,
        code=f"PRJ-B1-1-{suffix}",
        name=f"Project B1-1 {suffix}",
        type="project",
        path=f"GRP_{suffix}.SUB_B_{suffix}.PRJ_B1_1_{suffix}",
        is_active=True,
        is_deleted=False
    )
    db.add_all([prj_a1_1, prj_b1_1])
    db.commit()

    return {
        "group": group,
        "sub_a": sub_a,
        "sub_b": sub_b,
        "bu_a1": bu_a1,
        "prj_a1_1": prj_a1_1,
        "prj_b1_1": prj_b1_1
    }


def create_test_evidence(db, uploader, project_node, name="test_evidence.pdf"):
    ev = EvidenceFile(
        id=str(uuid.uuid4()),
        evidence_display_id=f"EVD-{uuid.uuid4().hex[:8].upper()}",
        storage_key=f"mock_storage_{uuid.uuid4().hex}.pdf",
        original_name=name,
        mime_type="application/pdf",
        size_bytes=1024,
        sha256="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        doc_category="Bill",
        bill_type="Electricity",
        esg_indicator="ENV-ENERGY-001",
        project_id=project_node.code,
        uploader_id=uploader.id,
        attached_by_role=uploader.role,
        scan_status="clean",
        is_deleted=False
    )
    db.add(ev)
    db.commit()
    db.refresh(ev)
    return ev


def test_evidence_deletion_password_and_reason_validation():
    db = SessionLocal()
    suffix = uuid.uuid4().hex[:6].upper()
    nodes = create_test_org_hierarchy(db, suffix)

    proj_admin, proj_token = create_test_user(
        db, f"proj_{suffix}@test.com", Role.PROJECT_ADMIN.value, nodes["prj_a1_1"].id, "ValidPass123!"
    )
    evidence = create_test_evidence(db, proj_admin, nodes["prj_a1_1"], "invoice_electricity.pdf")

    # 1. Missing or blank reason rejected (422)
    res_no_reason = client.request(
        "DELETE",
        f"/api/v1/evidence/{evidence.id}",
        json={"password": "ValidPass123!", "reason": ""},
        headers={"Authorization": f"Bearer {proj_token}"}
    )
    assert res_no_reason.status_code == 422
    assert "mandatory" in res_no_reason.json()["detail"].lower()

    # 2. Invalid password rejected (401)
    res_bad_pw = client.request(
        "DELETE",
        f"/api/v1/evidence/{evidence.id}",
        json={"password": "WrongPassword999!", "reason": "Incorrect meter reading reported"},
        headers={"Authorization": f"Bearer {proj_token}"}
    )
    assert res_bad_pw.status_code == 401
    assert "invalid password" in res_bad_pw.json()["detail"].lower()

    # Verify evidence remains active
    db.refresh(evidence)
    assert evidence.is_deleted is False

    # 3. Valid deletion with password and reason succeeds
    res_delete = client.request(
        "DELETE",
        f"/api/v1/evidence/{evidence.id}",
        json={"password": "ValidPass123!", "reason": "Superseded by verified utility billing"},
        headers={"Authorization": f"Bearer {proj_token}"}
    )
    assert res_delete.status_code == 200
    assert res_delete.json()["success"] is True

    # Check soft-deletion metadata in DB
    db.refresh(evidence)
    assert evidence.is_deleted is True
    assert evidence.scan_status == "deleted"
    assert evidence.deleted_by_id == proj_admin.id
    assert evidence.deleted_by_role == Role.PROJECT_ADMIN.value
    assert evidence.deletion_reason == "Superseded by verified utility billing"
    assert evidence.deleted_at is not None

    # 4. Verify soft-deleted evidence cannot be accessed via direct view or active metadata query
    res_meta = client.get(
        f"/api/v1/evidence/{evidence.id}",
        headers={"Authorization": f"Bearer {proj_token}"}
    )
    assert res_meta.status_code == 404

    res_view = client.get(
        f"/api/v1/evidence/{evidence.id}/view",
        headers={"Authorization": f"Bearer {proj_token}"}
    )
    assert res_view.status_code == 403
    assert "deleted and cannot be viewed directly" in res_view.json()["detail"]

    db.close()


def test_hierarchical_trash_visibility_rules():
    db = SessionLocal()
    suffix = uuid.uuid4().hex[:6].upper()
    nodes = create_test_org_hierarchy(db, suffix)

    # Create admins across hierarchy
    sys_admin, sys_token = create_test_user(
        db, f"sys_{suffix}@test.com", Role.SYSTEM_ADMIN.value, None, "AdminPass123!"
    )
    grp_admin, grp_token = create_test_user(
        db, f"grp_{suffix}@test.com", Role.GROUP_ADMIN.value, nodes["group"].id, "GrpPass123!"
    )
    sub_admin_a, sub_a_token = create_test_user(
        db, f"sub_a_{suffix}@test.com", Role.SUBSIDIARY_ADMIN.value, nodes["sub_a"].id, "SubPass123!"
    )
    bu_admin_a1, bu_a1_token = create_test_user(
        db, f"bu_a1_{suffix}@test.com", Role.BU_ADMIN.value, nodes["bu_a1"].id, "BuPass123!"
    )
    proj_admin_a1, proj_a1_token = create_test_user(
        db, f"proj_a1_{suffix}@test.com", Role.PROJECT_ADMIN.value, nodes["prj_a1_1"].id, "ProjPass123!"
    )
    proj_admin_b1, proj_b1_token = create_test_user(
        db, f"proj_b1_{suffix}@test.com", Role.PROJECT_ADMIN.value, nodes["prj_b1_1"].id, "ProjPass123!"
    )

    # Create Evidence 1 (under PRJ-A1-1) and Evidence 2 (under PRJ-B1-1)
    ev_a = create_test_evidence(db, proj_admin_a1, nodes["prj_a1_1"], "energy_branch_a.pdf")
    ev_b = create_test_evidence(db, proj_admin_b1, nodes["prj_b1_1"], "waste_branch_b.pdf")

    # Soft-delete both records
    client.request(
        "DELETE",
        f"/api/v1/evidence/{ev_a.id}",
        json={"password": "ProjPass123!", "reason": "Archived old branch A record"},
        headers={"Authorization": f"Bearer {proj_a1_token}"}
    )
    client.request(
        "DELETE",
        f"/api/v1/evidence/{ev_b.id}",
        json={"password": "ProjPass123!", "reason": "Archived old branch B record"},
        headers={"Authorization": f"Bearer {proj_b1_token}"}
    )

    # 1. Project Admin A1 queries trash -> sees ONLY their own deleted evidence (ev_a)
    res_trash_proj_a = client.get("/api/v1/evidence/trash", headers={"Authorization": f"Bearer {proj_a1_token}"})
    assert res_trash_proj_a.status_code == 200
    trash_proj_a_ids = [item["id"] for item in res_trash_proj_a.json()]
    assert str(ev_a.id) in trash_proj_a_ids
    assert str(ev_b.id) not in trash_proj_a_ids

    # 2. Project Admin B1 queries trash -> sees ONLY their own deleted evidence (ev_b)
    res_trash_proj_b = client.get("/api/v1/evidence/trash", headers={"Authorization": f"Bearer {proj_b1_token}"})
    assert res_trash_proj_b.status_code == 200
    trash_proj_b_ids = [item["id"] for item in res_trash_proj_b.json()]
    assert str(ev_b.id) in trash_proj_b_ids
    assert str(ev_a.id) not in trash_proj_b_ids

    # 3. BU Admin A1 queries trash -> sees ev_a (within BU A1 branch), but CANNOT see ev_b
    res_trash_bu_a1 = client.get("/api/v1/evidence/trash", headers={"Authorization": f"Bearer {bu_a1_token}"})
    assert res_trash_bu_a1.status_code == 200
    trash_bu_a1_ids = [item["id"] for item in res_trash_bu_a1.json()]
    assert str(ev_a.id) in trash_bu_a1_ids
    assert str(ev_b.id) not in trash_bu_a1_ids

    # 4. Subsidiary Admin A queries trash -> sees ev_a, but CANNOT see ev_b
    res_trash_sub_a = client.get("/api/v1/evidence/trash", headers={"Authorization": f"Bearer {sub_a_token}"})
    assert res_trash_sub_a.status_code == 200
    trash_sub_a_ids = [item["id"] for item in res_trash_sub_a.json()]
    assert str(ev_a.id) in trash_sub_a_ids
    assert str(ev_b.id) not in trash_sub_a_ids

    # 5. Group Admin queries trash -> sees both ev_a and ev_b (both are within Group hierarchy)
    res_trash_grp = client.get("/api/v1/evidence/trash", headers={"Authorization": f"Bearer {grp_token}"})
    assert res_trash_grp.status_code == 200
    trash_grp_ids = [item["id"] for item in res_trash_grp.json()]
    assert str(ev_a.id) in trash_grp_ids
    assert str(ev_b.id) in trash_grp_ids

    # 6. System Admin queries trash -> sees all evidence deletions system-wide
    res_trash_sys = client.get("/api/v1/evidence/trash", headers={"Authorization": f"Bearer {sys_token}"})
    assert res_trash_sys.status_code == 200
    trash_sys_ids = [item["id"] for item in res_trash_sys.json()]
    assert str(ev_a.id) in trash_sys_ids
    assert str(ev_b.id) in trash_sys_ids

    db.close()


def test_evidence_restoration_and_audit():
    db = SessionLocal()
    suffix = uuid.uuid4().hex[:6].upper()
    nodes = create_test_org_hierarchy(db, suffix)

    proj_admin_a1, proj_a1_token = create_test_user(
        db, f"proj_a1_{suffix}@test.com", Role.PROJECT_ADMIN.value, nodes["prj_a1_1"].id, "ProjPass123!"
    )
    proj_admin_b1, proj_b1_token = create_test_user(
        db, f"proj_b1_{suffix}@test.com", Role.PROJECT_ADMIN.value, nodes["prj_b1_1"].id, "ProjPass123!"
    )

    ev = create_test_evidence(db, proj_admin_a1, nodes["prj_a1_1"], "restoration_test.pdf")

    # Delete by Proj Admin A1
    client.request(
        "DELETE",
        f"/api/v1/evidence/{ev.id}",
        json={"password": "ProjPass123!", "reason": "Accidental deletion test"},
        headers={"Authorization": f"Bearer {proj_a1_token}"}
    )

    # 1. Proj Admin B1 attempts to restore -> rejected with 403 Forbidden
    res_bad_restore = client.post(
        f"/api/v1/evidence/{ev.id}/restore",
        json={"reason": "Attempting cross-branch unauthorized restore"},
        headers={"Authorization": f"Bearer {proj_b1_token}"}
    )
    assert res_bad_restore.status_code == 403

    # 2. Authorized user (Proj Admin A1) restores evidence
    res_restore = client.post(
        f"/api/v1/evidence/{ev.id}/restore",
        json={"reason": "Audit verification confirmed file is valid"},
        headers={"Authorization": f"Bearer {proj_a1_token}"}
    )
    assert res_restore.status_code == 200
    assert res_restore.json()["success"] is True

    # 3. Verify evidence is active again
    db.refresh(ev)
    assert ev.is_deleted is False
    assert ev.scan_status == "clean"

    db.close()


def test_org_node_deletion_dependency_check_and_scope():
    db = SessionLocal()
    suffix = uuid.uuid4().hex[:6].upper()
    nodes = create_test_org_hierarchy(db, suffix)

    sub_admin_a, sub_a_token = create_test_user(
        db, f"sub_a_{suffix}@test.com", Role.SUBSIDIARY_ADMIN.value, nodes["sub_a"].id, "SubPass123!"
    )

    # Attempt to delete BU-A1 while PRJ-A1-1 is an active child -> blocked with 400 Bad Request
    res_block = client.request(
        "DELETE",
        f"/api/v1/org/nodes/{nodes['bu_a1'].id}",
        json={"admin_password": "SubPass123!", "reason": "Attempting decommission"},
        headers={"Authorization": f"Bearer {sub_a_token}"}
    )
    assert res_block.status_code == 400
    assert "contains" in res_block.json()["detail"].lower()
    assert "child unit" in res_block.json()["detail"].lower()

    # Attempt with wrong password -> 401
    res_bad_pw = client.request(
        "DELETE",
        f"/api/v1/org/nodes/{nodes['prj_a1_1'].id}",
        json={"admin_password": "WrongPassword!", "reason": "Decommission site"},
        headers={"Authorization": f"Bearer {sub_a_token}"}
    )
    assert res_bad_pw.status_code == 401

    # First delete child unit PRJ-A1-1
    res_del_child = client.request(
        "DELETE",
        f"/api/v1/org/nodes/{nodes['prj_a1_1'].id}",
        json={"admin_password": "SubPass123!", "reason": "Project decommissioned upon completion"},
        headers={"Authorization": f"Bearer {sub_a_token}"}
    )
    assert res_del_child.status_code == 200
    assert res_del_child.json()["success"] is True
    db.refresh(nodes["prj_a1_1"])
    assert nodes["prj_a1_1"].is_deleted is True

    # Now deleting parent BU-A1 succeeds
    res_del_parent = client.request(
        "DELETE",
        f"/api/v1/org/nodes/{nodes['bu_a1'].id}",
        json={"admin_password": "SubPass123!", "reason": "BU decommissioned following site closure"},
        headers={"Authorization": f"Bearer {sub_a_token}"}
    )
    assert res_del_parent.status_code == 200
    assert res_del_parent.json()["success"] is True
    db.refresh(nodes["bu_a1"])
    assert nodes["bu_a1"].is_deleted is True

    db.close()


def test_subsidiary_admin_user_creation_approval_workflow():
    db = SessionLocal()
    suffix = uuid.uuid4().hex[:6].upper()
    nodes = create_test_org_hierarchy(db, suffix)

    grp_admin, grp_token = create_test_user(
        db, f"grp_{suffix}@test.com", Role.GROUP_ADMIN.value, nodes["group"].id, "GrpPass123!"
    )
    sub_admin_a, sub_a_token = create_test_user(
        db, f"sub_a_{suffix}@test.com", Role.SUBSIDIARY_ADMIN.value, nodes["sub_a"].id, "SubPass123!"
    )

    # 1. Subsidiary Admin cannot request an unauthorized superior role (e.g., system_admin) -> 403
    res_forbidden_role = client.post(
        "/api/v1/auth/admin/user-requests",
        json={
            "full_name": "Rogue Superuser",
            "email": f"rogue_{suffix}@test.com",
            "requested_role": "system_admin",
            "org_node_id": str(nodes["sub_a"].id),
            "reason": "Requesting system admin"
        },
        headers={"Authorization": f"Bearer {sub_a_token}"}
    )
    assert res_forbidden_role.status_code in (400, 403)

    # 2. Subsidiary Admin submits valid request for BU Admin under their subsidiary
    target_email = f"candidate_bu_{suffix.lower()}@test.com"
    res_submit = client.post(
        "/api/v1/auth/admin/user-requests",
        json={
            "full_name": "Aakash Verma",
            "email": target_email,
            "requested_role": "bu_admin",
            "org_node_id": str(nodes["bu_a1"].id),
            "reason": "New business unit lead for clean energy division"
        },
        headers={"Authorization": f"Bearer {sub_a_token}"}
    )
    assert res_submit.status_code == 201
    req_data = res_submit.json()
    assert req_data["status"] == "PENDING"
    req_id = req_data["id"]

    # 3. Pending user cannot log in (does not exist in active User table)
    res_login_attempt = client.post(
        "/api/v1/auth/login",
        json={"email": target_email, "password": "AnyPassword123!"}
    )
    assert res_login_attempt.status_code in (400, 401)

    # 4. Requester (Sub Admin) attempts self-approval -> rejected by Separation of Duties
    res_self_approve = client.post(
        f"/api/v1/auth/admin/user-requests/{req_id}/approve",
        headers={"Authorization": f"Bearer {sub_a_token}"}
    )
    assert res_self_approve.status_code in (400, 403)
    assert "cannot approve" in res_self_approve.json()["detail"].lower()

    # 5. Group Admin approves the pending request
    res_approve = client.post(
        f"/api/v1/auth/admin/user-requests/{req_id}/approve",
        headers={"Authorization": f"Bearer {grp_token}"}
    )
    assert res_approve.status_code == 200
    approve_data = res_approve.json()
    assert approve_data["request"]["status"] == "APPROVED"
    assert approve_data["username"] == target_email
    assert approve_data["role"] == "bu_admin"
    initial_pwd = approve_data.get("initial_password")
    assert initial_pwd is not None
    assert len(initial_pwd) == 6

    # 6. Newly approved user can now successfully authenticate with the generated 6-character password
    res_new_login = client.post(
        "/api/v1/auth/login",
        json={"email": target_email, "password": initial_pwd}
    )
    assert res_new_login.status_code == 200
    login_info = res_new_login.json()
    assert "access_token" in login_info
    assert login_info["user"]["email"] == target_email
    assert login_info["user"]["role"] == "bu_admin"
    assert login_info["user"]["must_change_password"] is True

    # 7. Test rejection workflow: submit another request and reject it with a reason
    reject_email = f"rejected_user_{suffix.lower()}@test.com"
    res_submit2 = client.post(
        "/api/v1/auth/admin/user-requests",
        json={
            "full_name": "Rejected Candidate",
            "email": reject_email,
            "requested_role": "project_admin",
            "org_node_id": str(nodes["prj_a1_1"].id),
            "reason": "Duplicate candidate submission"
        },
        headers={"Authorization": f"Bearer {sub_a_token}"}
    )
    assert res_submit2.status_code == 201
    req2_id = res_submit2.json()["id"]

    res_reject = client.post(
        f"/api/v1/auth/admin/user-requests/{req2_id}/reject",
        json={"rejection_reason": "Position already filled by internal transfer."},
        headers={"Authorization": f"Bearer {grp_token}"}
    )
    assert res_reject.status_code == 200
    assert res_reject.json()["status"] == "REJECTED"
    assert res_reject.json()["rejection_reason"] == "Position already filled by internal transfer."

    # User remains non-existent in active table
    rejected_user_record = db.query(User).filter(User.email == reject_email).first()
    assert rejected_user_record is None

    db.close()
