import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import init_db

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_database():
    init_db()

def test_locked_period_rejects_modifications():
    suffix = uuid.uuid4().hex[:6].upper()

    # 1. Create Site and Period
    site_res = client.post("/api/v1/org/nodes", json={
        "code": f"SITE-LOCK-{suffix}",
        "name": "Hydrocarbon Terminal 3",
        "type": "project",
        "ownership_pct": 100.0,
        "control_type": "operational_control",
        "boundary": True,
        "project_type": "hydrocarbon",
        "location_country": "India"
    })
    site = site_res.json()

    period_res = client.post("/api/v1/org/periods", json={
        "code": f"FY2025-26-LOCK-{suffix}",
        "financial_year": "2025-2026",
        "period_type": "month",
        "start_date": "2025-06-01",
        "end_date": "2025-06-30",
        "status": "OPEN"
    })
    period = period_res.json()

    # 2. Enter and save normal draft data while OPEN
    open_save = client.post("/api/v1/collection/save", json={
        "entity_id": site["id"],
        "period_id": period["id"],
        "data_points": [
            {
                "metric_code": "ENV-ENERGY-001",
                "value_numeric": 30000.0,
                "unit": "kWh",
                "status": "ACTUAL"
            }
        ]
    })
    assert open_save.status_code == 200

    # 3. Group ESG Admin signs off and locks the period
    lock_res = client.post(f"/api/v1/workflow/lock-period/{period['id']}")
    assert lock_res.status_code == 200
    lock_data = lock_res.json()
    assert lock_data["status"] == "LOCKED"
    assert len(lock_data["snapshot_hash"]) == 64  # SHA-256 hash length

    # 4. Attempt to edit or save data in the LOCKED period -> Expect HTTP 400 rejection
    locked_attempt = client.post("/api/v1/collection/save", json={
        "entity_id": site["id"],
        "period_id": period["id"],
        "data_points": [
            {
                "metric_code": "ENV-ENERGY-001",
                "value_numeric": 35000.0,
                "unit": "kWh",
                "status": "ACTUAL"
            }
        ]
    })
    assert locked_attempt.status_code == 400
    assert "LOCKED" in locked_attempt.json()["detail"]
