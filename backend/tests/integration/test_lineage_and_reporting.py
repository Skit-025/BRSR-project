import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import init_db

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_database():
    init_db()

def test_lineage_trace_and_sebi_reporting():
    suffix = uuid.uuid4().hex[:6].upper()

    # 1. Create Group Root Node
    grp_res = client.post("/api/v1/org/nodes", json={
        "code": f"GRP-{suffix}",
        "name": "MEIL Group Consolidated",
        "type": "group",
        "ownership_pct": 100.0,
        "control_type": "operational_control",
        "boundary": True,
        "project_type": "corporate",
        "location_country": "India"
    })
    group_node = grp_res.json()

    # 2. Create Site under Group
    site_res = client.post("/api/v1/org/nodes", json={
        "code": f"SITE-RPT-{suffix}",
        "name": "Kaleshwaram Lift Irrigation Site",
        "type": "project",
        "parent_id": group_node["id"],
        "ownership_pct": 100.0,
        "control_type": "operational_control",
        "boundary": True,
        "project_type": "irrigation",
        "location_country": "India"
    })
    site = site_res.json()

    # 3. Create Period
    period_res = client.post("/api/v1/org/periods", json={
        "code": f"FY2025-26-RPT-{suffix}",
        "financial_year": "2025-2026",
        "period_type": "month",
        "start_date": "2025-08-01",
        "end_date": "2025-08-31",
        "status": "OPEN"
    })
    period = period_res.json()

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
    })
    submission = save_res.json()
    dp_id = submission["data_points"][0]["id"]

    # 5. Upload Evidence and Link to DataPoint
    bill_bytes = b"DISCOM HIGH TENSION POWER BILL 80 MWh - KLIS SITE"
    up_res = client.post(
        "/api/v1/evidence/upload",
        files={"file": ("ht_power_bill.txt", bill_bytes, "text/plain")}
    )
    assert up_res.status_code == 201
    ev_id = up_res.json()["evidence"]["id"]

    client.post("/api/v1/evidence/link", json={
        "evidence_id": ev_id,
        "data_point_id": dp_id,
        "page_ref": "Page 1 - Tariff HT-1"
    })

    # 6. Submit pack & run Consolidation
    client.post(f"/api/v1/collection/submit/{submission['id']}")
    cons_res = client.post("/api/v1/consolidation/run", json={"period_id": period["id"]})
    assert cons_res.status_code == 200

    # 7. Test 3-Click Lineage Explorer (F25)
    lineage_res = client.get(f"/api/v1/lineage/ENV-ENERGY-001/{period['id']}?entity_id={group_node['id']}")
    assert lineage_res.status_code == 200
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
    report_res = client.get(f"/api/v1/reports/brsr/{group_node['id']}/{period['id']}")
    assert report_res.status_code == 200
    report = report_res.json()
    assert report["entity_name"] == "MEIL Group Consolidated"
    assert len(report["snapshot_hash"]) == 64
    assert report["section_a"]["corporate_name"] == "Megha Engineering & Infrastructures Ltd (MEIL)"
    
    # Check Section C indicators
    energy_entry = next(i for i in report["section_c"] if i["metric_code"] == "ENV-ENERGY-001")
    assert energy_entry["disclosed_value"] == 80.0
    assert energy_entry["unit"] == "MWh"
    assert energy_entry["assurance_ready"] is True
    assert energy_entry["evidence_verified"] is True

    # 9. Test HTML Export
    html_res = client.get(f"/api/v1/reports/export/html/{group_node['id']}/{period['id']}")
    assert html_res.status_code == 200
    assert "text/html" in html_res.headers["content-type"]
    assert "MEIL ESG-BRSR Reporting Portal" in html_res.text
    assert "CRYPTOGRAPHIC ASSURANCE SEAL" in html_res.text
    assert "ENV-ENERGY-001" in html_res.text
