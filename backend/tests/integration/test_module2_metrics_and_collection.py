import pytest
import uuid
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import init_db

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_database():
    init_db()

def test_metric_catalogue():
    # 1. Fetch metric catalogue
    res = client.get("/api/v1/metrics")
    assert res.status_code == 200
    metrics = res.json()
    assert len(metrics) >= 12

    # Check key indicators
    codes = [m["code"] for m in metrics]
    assert "ENV-ENERGY-001" in codes
    assert "ENV-GHG-001" in codes
    assert "ENV-WATER-001" in codes
    assert "SOC-SAFE-001" in codes
    assert "GOV-COMP-001" in codes

    # 2. Check metric filter by brsr_core
    res_core = client.get("/api/v1/metrics?brsr_core=true")
    assert res_core.status_code == 200
    core_metrics = res_core.json()
    assert all(m["brsr_core"] is True for m in core_metrics)

def test_dynamic_form_generation_and_collection():
    suffix = uuid.uuid4().hex[:6].upper()

    # 1. Create site node
    node_payload = {
        "code": f"SITE-TEST-{suffix}",
        "name": "Solar Park Phase 1",
        "type": "project",
        "ownership_pct": 100.0,
        "control_type": "operational_control",
        "boundary": True,
        "project_type": "solar",
        "location_country": "India"
    }
    res_node = client.post("/api/v1/org/nodes", json=node_payload)
    assert res_node.status_code == 201
    site = res_node.json()

    # 2. Create reporting period
    period_payload = {
        "code": f"FY2025-26-M{suffix[:2]}",
        "financial_year": "2025-2026",
        "period_type": "month",
        "start_date": "2025-04-01",
        "end_date": "2025-04-30",
        "status": "OPEN"
    }
    res_period = client.post("/api/v1/org/periods", json=period_payload)
    assert res_period.status_code == 201
    period = res_period.json()

    # 3. Dynamic Form Engine (F06)
    res_form = client.get(f"/api/v1/forms/{site['id']}/{period['id']}")
    assert res_form.status_code == 200
    form_data = res_form.json()
    assert len(form_data["sections"]) > 0
    assert form_data["submission_status"] == "DRAFT"

    # Verify fields inside sections
    all_fields = [f for s in form_data["sections"] for f in s["fields"]]
    energy_field = next(f for f in all_fields if f["metric_code"] == "ENV-ENERGY-001")
    assert energy_field["base_unit"] == "MWh"
    assert "kWh" in energy_field["allowed_units"]

    # 4. Autosave draft numbers with unit normalization (F08)
    save_payload = {
        "entity_id": site["id"],
        "period_id": period["id"],
        "expected_version": 1,
        "data_points": [
            {
                "metric_code": "ENV-ENERGY-001",
                "value_numeric": 75000.0,  # 75,000 kWh
                "unit": "kWh",
                "status": "ACTUAL",
                "entry_method": "manual_form"
            },
            {
                "metric_code": "SOC-SAFE-002",
                "value_numeric": 0.0,
                "unit": "count",
                "status": "ACTUAL",
                "entry_method": "manual_form"
            }
        ]
    }
    res_save = client.post("/api/v1/collection/save", json=save_payload)
    assert res_save.status_code == 200
    sub_data = res_save.json()
    assert sub_data["status"] == "DRAFT"
    assert sub_data["version"] == 2

    # Verify unit normalization (75,000 kWh -> 75.0 MWh)
    dp_energy = next(dp for dp in sub_data["data_points"] if dp["metric_code"] == "ENV-ENERGY-001")
    assert dp_energy["normalized_value"] == 75.0

    # 5. Test Optimistic Concurrency Lock (Stale version rejected with 409 Conflict)
    stale_payload = {
        "entity_id": site["id"],
        "period_id": period["id"],
        "expected_version": 1,  # Server is already at version 2
        "data_points": [
            {
                "metric_code": "SOC-SAFE-002",
                "value_numeric": 0.0,
                "unit": "count",
                "status": "ACTUAL",
                "entry_method": "manual_form"
            }
        ]
    }
    res_conflict = client.post("/api/v1/collection/save", json=stale_payload)
    assert res_conflict.status_code == 409

    # 6. Submit pack (Freeze to SUBMITTED state)
    res_submit = client.post(f"/api/v1/collection/submit/{sub_data['id']}")
    assert res_submit.status_code == 200
    assert res_submit.json()["status"] == "SUBMITTED"

    # 7. Verify submitted pack rejects edits
    edit_payload = {
        "entity_id": site["id"],
        "period_id": period["id"],
        "data_points": [
            {
                "metric_code": "ENV-ENERGY-001",
                "value_numeric": 90000.0,
                "unit": "kWh",
                "status": "ACTUAL"
            }
        ]
    }
    res_bad_edit = client.post("/api/v1/collection/save", json=edit_payload)
    assert res_bad_edit.status_code == 400
    assert "Submitted" in res_bad_edit.json()["detail"]
