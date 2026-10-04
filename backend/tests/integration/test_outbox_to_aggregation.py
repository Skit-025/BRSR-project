import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import init_db

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_database():
    init_db()

def test_hierarchical_consolidation_and_jv_boundary_math():
    suffix = uuid.uuid4().hex[:6].upper()

    # 1. Create Subsidiary Parent Node
    sub_res = client.post("/api/v1/org/nodes", json={
        "code": f"SUB-INFRA-{suffix}",
        "name": "MEIL Infrastructure Holdings",
        "type": "subsidiary",
        "ownership_pct": 100.0,
        "control_type": "operational_control",
        "boundary": True,
        "project_type": "corporate",
        "location_country": "India"
    })
    sub_node = sub_res.json()

    # 2. Create Child 1: Wholly owned Project (100% operational control)
    p1_res = client.post("/api/v1/org/nodes", json={
        "code": f"PRJ-A-{suffix}",
        "name": "Highway Corridor Unit A",
        "type": "project",
        "parent_id": sub_node["id"],
        "ownership_pct": 100.0,
        "control_type": "operational_control",
        "boundary": True,
        "project_type": "road",
        "location_country": "India"
    })
    p1 = p1_res.json()

    # 3. Create Child 2: Joint Venture Project (51% equity share)
    p2_res = client.post("/api/v1/org/nodes", json={
        "code": f"PRJ-B-JV-{suffix}",
        "name": "Tunnel JV Consortium B",
        "type": "project",
        "parent_id": sub_node["id"],
        "ownership_pct": 51.0,
        "control_type": "equity_share",  # Boundary rule: only 51% counts
        "boundary": True,
        "project_type": "tunnel",
        "location_country": "India"
    })
    p2 = p2_res.json()

    # 4. Create Reporting Period
    period_res = client.post("/api/v1/org/periods", json={
        "code": f"FY2025-26-CONS-{suffix}",
        "financial_year": "2025-2026",
        "period_type": "month",
        "start_date": "2025-07-01",
        "end_date": "2025-07-31",
        "status": "OPEN"
    })
    period = period_res.json()

    # 5. Enter & Submit data for Project A (120 MWh)
    s1_res = client.post("/api/v1/collection/save", json={
        "entity_id": p1["id"],
        "period_id": period["id"],
        "data_points": [
            {
                "metric_code": "ENV-ENERGY-001",
                "value_numeric": 120.0,
                "unit": "MWh",
                "status": "ACTUAL"
            }
        ]
    })
    sub1_id = s1_res.json()["id"]
    client.post(f"/api/v1/collection/submit/{sub1_id}")

    # 6. Enter & Submit data for Project B (1000 MWh)
    s2_res = client.post("/api/v1/collection/save", json={
        "entity_id": p2["id"],
        "period_id": period["id"],
        "data_points": [
            {
                "metric_code": "ENV-ENERGY-001",
                "value_numeric": 1000.0,
                "unit": "MWh",
                "status": "ACTUAL"
            }
        ]
    })
    sub2_id = s2_res.json()["id"]
    client.post(f"/api/v1/collection/submit/{sub2_id}")

    # 7. Trigger Consolidation Engine (F22-F23)
    cons_res = client.post("/api/v1/consolidation/run", json={"period_id": period["id"]})
    assert cons_res.status_code == 200
    assert cons_res.json()["consolidated_nodes_count"] >= 1

    # 8. Fetch Subsidiary Consolidated Figure
    res_figures = client.get(f"/api/v1/consolidation/{sub_node['id']}/{period['id']}")
    assert res_figures.status_code == 200
    figures = res_figures.json()
    assert len(figures) > 0

    energy_cons = next(f for f in figures if f["metric_code"] == "ENV-ENERGY-001")
    
    # Boundary Math Verification:
    # Child 1: 120 MWh * 100% = 120.0 MWh
    # Child 2: 1000 MWh * 51% = 510.0 MWh
    # Total = 630.0 MWh
    assert pytest.approx(energy_cons["value"], 0.01) == 630.0
    assert energy_cons["unit"] == "MWh"
    assert energy_cons["method"] == "sum"

    # Lineage Audit Trace Verification
    contributions = energy_cons["child_contributions"]
    assert len(contributions) == 2
    
    c1 = next(c for c in contributions if c["child_code"] == f"PRJ-A-{suffix}")
    assert c1["raw_value"] == 120.0
    assert c1["share_pct"] == 100.0
    assert c1["weighted_value"] == 120.0

    c2 = next(c for c in contributions if c["child_code"] == f"PRJ-B-JV-{suffix}")
    assert c2["raw_value"] == 1000.0
    assert c2["share_pct"] == 51.0
    assert pytest.approx(c2["weighted_value"], 0.01) == 510.0
