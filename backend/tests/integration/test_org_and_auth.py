import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import init_db

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_database():
    init_db()

def test_auth_workflow():
    # 1. Register user
    reg_payload = {
        "email": "collector.site1@meil.in",
        "password": "SecurePassword123!",
        "full_name": "Ramesh Kumar",
        "role": "project_admin"
    }
    res = client.post("/api/v1/auth/register", json=reg_payload)
    assert res.status_code in [201, 400]  # 400 if rerun with same email

    # 2. Login
    login_payload = {
        "email": "collector.site1@meil.in",
        "password": "SecurePassword123!"
    }
    res_login = client.post("/api/v1/auth/login", json=login_payload)
    assert res_login.status_code == 200
    data = res_login.json()
    assert "access_token" in data
    assert data["user"]["email"] == "collector.site1@meil.in"

    # 3. Access protected /me endpoint
    token = data["access_token"]
    res_me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res_me.status_code == 200
    assert res_me.json()["full_name"] == "Ramesh Kumar"

def test_org_hierarchy_and_applicability():
    import uuid
    suffix = uuid.uuid4().hex[:6].upper()
    group_code = f"MEIL-{suffix}"
    sub_code = f"SUB-HYDRO-{suffix}"
    site_code = f"PRJ-LNG-{suffix}"

    # 1. Create Group Root Node
    group_payload = {
        "code": group_code,
        "name": "Megha Engineering & Infrastructures Ltd",
        "type": "group",
        "ownership_pct": 100.0,
        "control_type": "operational_control",
        "boundary": True,
        "project_type": "corporate",
        "location_country": "India"
    }
    res_group = client.post("/api/v1/org/nodes", json=group_payload)
    assert res_group.status_code == 201
    group_node = res_group.json()
    assert group_node["path"] == group_code

    # 2. Create Subsidiary Node under Group
    sub_payload = {
        "code": sub_code,
        "name": "MEIL Hydrocarbons & Energy Ltd",
        "type": "subsidiary",
        "parent_id": group_node["id"],
        "ownership_pct": 100.0,
        "control_type": "operational_control",
        "boundary": True,
        "project_type": "hydrocarbon",
        "location_country": "India"
    }
    res_sub = client.post("/api/v1/org/nodes", json=sub_payload)
    assert res_sub.status_code == 201
    sub_node = res_sub.json()

    # 3. Create Water-Stressed Project Site under Subsidiary
    site_payload = {
        "code": site_code,
        "name": "Dhamra LNG Terminal Project",
        "type": "project",
        "parent_id": sub_node["id"],
        "ownership_pct": 100.0,
        "control_type": "operational_control",
        "boundary": True,
        "project_type": "hydrocarbon",
        "location_state": "Odisha",
        "is_water_stressed": True
    }
    res_site = client.post("/api/v1/org/nodes", json=site_payload)
    assert res_site.status_code == 201
    site_node = res_site.json()
    assert site_node["path"] == f"{group_code}.{sub_code}.{site_code}"

    # 4. Check nested tree API
    res_tree = client.get("/api/v1/org/tree")
    assert res_tree.status_code == 200
    tree = res_tree.json()
    assert len(tree) > 0

    # 5. Check Applicability Engine derivation for this site
    res_app = client.get(f"/api/v1/org/applicability/{site_node['id']}")
    assert res_app.status_code == 200
    apps = res_app.json()
    assert len(apps) >= 10
    
    # Check that water metric is applicable due to water stress
    water_rule = next(a for a in apps if a["metric_code"] == "ENV-WATER-001")
    assert water_rule["is_applicable"] is True
    assert "RULE-WAT-01" in water_rule["rule_id"]

    # 6. Test audited exception override
    override_payload = {
        "metric_code": "ENV-WATER-001",
        "is_applicable": False,
        "reason": "Water supply piped by municipal authority; no direct ground withdrawal.",
        "approved_by": "Dr. Ananya Rao (Head of ESG Assurance)"
    }
    res_override = client.post(f"/api/v1/org/applicability/{site_node['id']}/override", json=override_payload)
    assert res_override.status_code == 200
    overridden = res_override.json()
    assert overridden["is_applicable"] is False
    assert overridden["is_exception"] is True
    assert overridden["approved_by"] == "Dr. Ananya Rao (Head of ESG Assurance)"
