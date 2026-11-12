"""
Integration tests for end-to-end RBAC enforcement across audit, evidence, collection, and P6 review routers.
"""
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import SessionLocal
from app.modules.auth.models import User
from app.modules.org.models import OrgNode
from app.security.jwt import create_access_token

client = TestClient(app)


def _auth_headers(role: str, org_code: str = "PRJ-ZOJILA-P7") -> dict:
    session = SessionLocal()
    try:
        email = f"rbac_{role}_{org_code.lower()}@meil.com"
        user = session.query(User).filter(User.email == email).first()
        node = session.query(OrgNode).filter(OrgNode.code == org_code).first()
        org_node_id = str(node.id) if node else None
        if not user:
            user = User(
                email=email,
                full_name=f"RBAC Test {role}",
                role=role,
                is_active=True,
                hashed_password="dummy",
                org_node_id=org_node_id,
            )
            session.add(user)
            session.commit()
            session.refresh(user)
        token = create_access_token(subject=str(user.id), role=role, org_node_id=org_node_id)
        return {"Authorization": f"Bearer {token}"}
    finally:
        session.close()


def test_unauthenticated_access_blocked(monkeypatch):
    monkeypatch.delenv("TESTING", raising=False)
    assert client.get("/api/v1/audit/logs").status_code == 401
    assert client.get("/api/v1/audit/verify-chain").status_code == 401
    assert client.post("/api/v1/audit/events", json={"action": "X", "target_type": "X", "target_id": "1"}).status_code == 401
    assert client.get("/api/v1/evidence").status_code == 401
    assert client.post("/api/v1/evidence/upload").status_code == 401


def test_project_supervisor_denied_audit_and_review():
    h = _auth_headers("project_supervisor", "PRJ-ZOJILA-P7")
    assert client.get("/api/v1/audit/logs", headers=h).status_code == 403
    assert client.get("/api/v1/audit/verify-chain", headers=h).status_code == 403
    assert client.post(
        "/api/v1/p6-forms/review",
        headers=h,
        json={"node_id": "PRJ-ZOJILA-P7", "target_role": "project_supervisor", "decision": "accepted"},
    ).status_code == 403


def test_checker_roles_denied_maker_and_self_approval():
    pa = _auth_headers("project_admin", "PRJ-ZOJILA-P7")
    # Project admin cannot create/save maker collection packs or upload maker evidence
    assert client.post(
        "/api/v1/collection/save",
        headers=pa,
        json={"entity_id": "PRJ-ZOJILA-P7", "period_id": "p1", "version": 1, "entries": []},
    ).status_code == 403
    assert client.post(
        "/api/v1/evidence/upload",
        headers=pa,
        files={"file": ("test.pdf", b"%PDF-1.4", "application/pdf")},
    ).status_code == 403
    # Project admin cannot self-approve project_admin P6 form
    assert client.post(
        "/api/v1/p6-forms/review",
        headers=pa,
        json={"node_id": "PRJ-ZOJILA-P7", "target_role": "project_admin", "decision": "accepted"},
    ).status_code == 403

    # BU admin cannot self-approve bu_admin P6 form
    ba = _auth_headers("bu_admin", "BU-TRANS")
    assert client.post(
        "/api/v1/p6-forms/review",
        headers=ba,
        json={"node_id": "BU-TRANS", "target_role": "bu_admin", "decision": "accepted"},
    ).status_code == 403


def test_group_supervisor_denied_period_lock_and_review():
    gs = _auth_headers("group_supervisor", "MEIL-GROUP")
    assert client.post("/api/v1/workflow/lock-period/some-period", headers=gs).status_code == 403
    assert client.post(
        "/api/v1/p6-forms/review",
        headers=gs,
        json={"node_id": "MEIL-GROUP", "target_role": "group_supervisor", "decision": "accepted"},
    ).status_code == 403


def test_bu_esg_manager_cannot_see_group_top_down():
    # 1. BU ESG Manager with BU-TRANS org_node_id
    bu_mgr = _auth_headers("bu_esg_manager", "BU-TRANS")

    # Default dashboard must return BU-TRANS, NEVER MEIL-GROUP
    r_dash = client.get("/api/v1/p6-forms/dashboard", headers=bu_mgr)
    assert r_dash.status_code == 200, r_dash.text
    body = r_dash.json()
    assert body["node"]["id"] == "BU-TRANS"
    accessible_ids = {n["id"] for n in body["accessible_nodes"]}
    assert "MEIL-GROUP" not in accessible_ids
    assert "MEGHA-ROAD-TRANS" not in accessible_ids
    assert "BU-INFRA" not in accessible_ids
    assert "BU-TRANS" in accessible_ids

    # Explicit upward/sibling access must be 403
    for forbidden in ("MEIL-GROUP", "MEGHA-ROAD-TRANS", "MEGHA-POWER-EPC", "BU-INFRA"):
        assert client.get(f"/api/v1/p6-forms/dashboard?node_id={forbidden}", headers=bu_mgr).status_code == 403
        assert client.get(f"/api/v1/p6-forms/rollup?node_id={forbidden}", headers=bu_mgr).status_code == 403
        assert client.get(f"/api/v1/p6-forms/lineage?node_id={forbidden}", headers=bu_mgr).status_code == 403
        assert client.get(f"/api/v1/p6-forms/descendants?node_id={forbidden}", headers=bu_mgr).status_code == 403

    # BU ESG Manager schema must work and return BU Value Chain fields
    r_schema = client.get("/api/v1/p6-forms/schema", headers=bu_mgr)
    assert r_schema.status_code == 200, r_schema.text
    assert r_schema.json()["form_title"] == "BU Value Chain"

    # Org nodes & tree must not expose Group or sibling BUs
    r_nodes = client.get("/api/v1/org/nodes", headers=bu_mgr)
    assert r_nodes.status_code == 200
    node_codes = {n["code"] for n in r_nodes.json()}
    assert "MEIL-GROUP" not in node_codes
    assert "MEGHA-ROAD-TRANS" not in node_codes

    # 2. Even if BU ESG Manager has no DB org_node_id, fallback must still be BU-level, NEVER MEIL-GROUP
    bu_mgr_no_org = _auth_headers("bu_esg_manager", "NONEXISTENT-CODE")
    r_dash2 = client.get("/api/v1/p6-forms/dashboard", headers=bu_mgr_no_org)
    assert r_dash2.status_code == 200
    assert r_dash2.json()["node"]["type"] == "bu"
    assert r_dash2.json()["node"]["id"] != "MEIL-GROUP"

