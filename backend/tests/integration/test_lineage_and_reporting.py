import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import init_db, SessionLocal
from app.modules.auth.models import User
from app.security.jwt import create_access_token

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_database():
    init_db()

def get_auth_headers():
    session = SessionLocal()
    try:
        admin = session.query(User).filter(User.role.in_(["system_admin", "group_admin"])).first()
        if not admin:
            # Create a temporary group admin if not seeded
            admin = User(
                username=f"admin_{uuid.uuid4().hex[:6]}",
                email=f"admin_{uuid.uuid4().hex[:6]}@example.com",
                role="group_admin",
                is_active=True,
                hashed_password="dummy_hash"
            )
            session.add(admin)
            session.commit()
            session.refresh(admin)

        token = create_access_token(
            subject=str(admin.id),
            role=admin.role,
            org_node_id=str(admin.org_node_id) if admin.org_node_id else None
        )
        return {"Authorization": f"Bearer {token}"}
    finally:
        session.close()

def test_lineage_trace_and_sebi_reporting():
    suffix = uuid.uuid4().hex[:6].upper()
    headers = get_auth_headers()

    # 1. Create Group Root Node
    grp_res = client.post("/api/v1/org/nodes", json={
        "code": f"GRP-{suffix}",
        "name": f"MEIL Group Consolidated {suffix}",
        "type": "group",
        "ownership_pct": 100.0,
        "control_type": "operational_control",
        "boundary": True,
        "project_type": "corporate",
        "location_country": "India"
    }, headers=headers)
    assert grp_res.status_code in (200, 201), f"Failed creating group node: {grp_res.text}"
    group_node = grp_res.json()

    # 2. Create Site under Group
    site_res = client.post("/api/v1/org/nodes", json={
        "code": f"SITE-RPT-{suffix}",
        "name": f"Kaleshwaram Lift Irrigation Site {suffix}",
        "type": "project",
        "parent_id": group_node["id"],
        "ownership_pct": 100.0,
        "control_type": "operational_control",
        "boundary": True,
        "project_type": "irrigation",
        "location_country": "India"
    }, headers=headers)
    assert site_res.status_code in (200, 201), f"Failed creating site node: {site_res.text}"
    site = site_res.json()

    # 3. Create Period
    period_res = client.post("/api/v1/org/periods", json={
        "code": f"FY2025-26-RPT-{suffix}",
        "financial_year": "2025-2026",
        "period_type": "month",
        "start_date": "2025-08-01",
        "end_date": "2025-08-31",
        "status": "OPEN",
        "create_monthly_periods": False
    }, headers=headers)
    assert period_res.status_code in (200, 201), f"Failed creating period: {period_res.text}"
    periods_resp = period_res.json()
    period = periods_resp[0] if isinstance(periods_resp, list) else periods_resp

    # 4. Enter Data Point (80 MWh electricity)
    save_res = client.post("/api/v1/collection/save", json={
        "entity_id": site["id"],
        "period_id": period["id"],
        "data_points": [
            {
                "metric_code": "ENV-ENERGY-001",
                "value_numeric": 80.0,
                "unit": "MWh",
                "status": "ACTUAL"
            }
        ]
    }, headers=headers)
    assert save_res.status_code == 200, f"Failed saving data points: {save_res.text}"
    submission = save_res.json()
    dp_id = submission["data_points"][0]["id"]

    # 5. Upload Evidence and Link to DataPoint
    bill_bytes = b"DISCOM HIGH TENSION POWER BILL 80 MWh - KLIS SITE"
    up_res = client.post(
        "/api/v1/evidence/upload",
        files={"file": ("ht_power_bill.txt", bill_bytes, "text/plain")},
        headers=headers
    )
    assert up_res.status_code == 201, f"Failed uploading evidence: {up_res.text}"
    ev_id = up_res.json()["evidence"]["id"]

    link_res = client.post("/api/v1/evidence/link", json={
        "evidence_id": ev_id,
        "data_point_id": dp_id,
        "page_ref": "Page 1 - Tariff HT-1"
    }, headers=headers)
    assert link_res.status_code in (200, 201)

    # 6. Submit pack & run Consolidation
    sub_res = client.post(f"/api/v1/collection/submit/{submission['id']}", headers=headers)
    assert sub_res.status_code == 200, f"Failed submitting pack: {sub_res.text}"

    cons_res = client.post("/api/v1/consolidation/run", json={"period_id": period["id"]}, headers=headers)
    assert cons_res.status_code == 200, f"Failed running consolidation: {cons_res.text}"

    # 7. Test 3-Click Lineage Explorer (F25)
    lineage_res = client.get(f"/api/v1/lineage/ENV-ENERGY-001/{period['id']}?entity_id={group_node['id']}", headers=headers)
    assert lineage_res.status_code == 200, f"Failed getting lineage: {lineage_res.text}"
    lineage_data = lineage_res.json()
    assert lineage_data["consolidated_group_value"] == 80.0
    assert lineage_data["unit"] == "MWh"

    # Walk lineage tree down to site and evidence
    tree = lineage_data["lineage_tree"]
    assert tree["node_code"] == f"GRP-{suffix}"
    assert len(tree["children"]) == 1
    child_site = tree["children"][0]
    assert child_site["node_code"] == f"SITE-RPT-{suffix}"
    assert len(child_site["site_datapoints"]) == 1
    dp_trace = child_site["site_datapoints"][0]
    assert dp_trace["raw_value"] == 80.0
    assert len(dp_trace["evidence"]) == 1
    assert dp_trace["evidence"][0]["evidence_id"] == ev_id

    # 8. Test SEBI BRSR Full Report Generation (F26-F29)
    report_res = client.get(f"/api/v1/reports/brsr/{group_node['id']}/{period['id']}", headers=headers)
    assert report_res.status_code == 200, f"Failed generating report: {report_res.text}"
    report = report_res.json()
    assert report["entity_name"] == f"MEIL Group Consolidated {suffix}"
    assert len(report["snapshot_hash"]) == 64
    assert report["section_a"]["corporate_name"] == "Megha Engineering & Infrastructures Ltd (MEIL)"
    
    # Check Section C indicators
    energy_entry = next(i for i in report["section_c"] if i["metric_code"] == "ENV-ENERGY-001")
    assert energy_entry["disclosed_value"] == 80.0
    assert energy_entry["unit"] == "MWh"
    assert energy_entry["assurance_ready"] is True
    assert energy_entry["evidence_verified"] is True

    # 9. Test HTML Export
    html_res = client.get(f"/api/v1/reports/export/html/{group_node['id']}/{period['id']}", headers=headers)
    assert html_res.status_code == 200, f"Failed export html: {html_res.text}"
    assert "text/html" in html_res.headers["content-type"]
    assert "ENV-ENERGY-001" in html_res.text
