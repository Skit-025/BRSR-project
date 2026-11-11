"""
tests/integration/test_period_lock_via_is_locked_field.py

Verifies that:
1. PUT /org/periods/{id} with { is_locked: true } locks the period (status → LOCKED).
2. The response includes is_locked=True derived from status.
3. PUT /org/periods/{id} with { is_locked: false } unlocks the period (status → OPEN).
4. A locked period still rejects data submissions (end-to-end guard).
5. The existing { status: "LOCKED" } payload still works (backward compat).
"""
import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import init_db

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_db():
    init_db()


def _make_period(suffix: str):
    res = client.post("/api/v1/org/periods", json={
        "code": f"FY2025-26-LOCKTEST-{suffix}",
        "financial_year": "2025-2026",
        "period_type": "month",
        "start_date": "2025-07-01",
        "end_date": "2025-07-31",
        "status": "OPEN"
    })
    assert res.status_code == 201, res.text
    data = res.json()
    return data[0] if isinstance(data, list) else data


def _make_project(suffix: str):
    res = client.post("/api/v1/org/nodes", json={
        "code": f"PRJ-LOCKTEST-{suffix}",
        "name": f"Lock Test Project {suffix}",
        "type": "project",
        "ownership_pct": 100.0,
        "control_type": "operational_control",
        "boundary": True,
        "project_type": "corporate",
        "location_country": "India"
    })
    assert res.status_code == 201, res.text
    return res.json()


class TestIsLockedField:
    def test_lock_via_is_locked_true(self):
        """PUT { is_locked: true } must set status=LOCKED and return is_locked=True."""
        s = uuid.uuid4().hex[:6].upper()
        period = _make_period(s)

        # Initial state: OPEN, is_locked=False
        assert period["status"] == "OPEN"
        assert period["is_locked"] is False

        # Lock via is_locked convenience field
        res = client.put(f"/api/v1/org/periods/{period['id']}", json={"is_locked": True})
        assert res.status_code == 200, res.text
        updated = res.json()
        assert updated["status"] == "LOCKED", f"Expected LOCKED, got {updated['status']}"
        assert updated["is_locked"] is True, f"Expected is_locked=True, got {updated['is_locked']}"

    def test_unlock_via_is_locked_false(self):
        """PUT { is_locked: false } must set status=OPEN and return is_locked=False."""
        s = uuid.uuid4().hex[:6].upper()
        period = _make_period(s)

        # Lock first
        lock_res = client.put(f"/api/v1/org/periods/{period['id']}", json={"is_locked": True})
        assert lock_res.status_code == 200
        assert lock_res.json()["status"] == "LOCKED"

        # Unlock via is_locked=False
        unlock_res = client.put(f"/api/v1/org/periods/{period['id']}", json={"is_locked": False})
        assert unlock_res.status_code == 200, unlock_res.text
        unlocked = unlock_res.json()
        assert unlocked["status"] == "OPEN", f"Expected OPEN, got {unlocked['status']}"
        assert unlocked["is_locked"] is False, f"Expected is_locked=False, got {unlocked['is_locked']}"

    def test_lock_via_status_field_still_works(self):
        """PUT { status: 'LOCKED' } must still work (backward compatibility)."""
        s = uuid.uuid4().hex[:6].upper()
        period = _make_period(s)

        res = client.put(f"/api/v1/org/periods/{period['id']}", json={"status": "LOCKED"})
        assert res.status_code == 200, res.text
        updated = res.json()
        assert updated["status"] == "LOCKED"
        assert updated["is_locked"] is True

    def test_locked_period_rejects_data_submission(self):
        """A period locked via { is_locked: true } must block POST /collection/save."""
        s = uuid.uuid4().hex[:6].upper()
        period = _make_period(s)
        project = _make_project(s)

        # Submit data while OPEN — must succeed
        save_open = client.post("/api/v1/collection/save", json={
            "entity_id": project["id"],
            "period_id": period["id"],
            "data_points": [{"metric_code": "ENV-ENERGY-001", "value_numeric": 1000.0, "unit": "kWh", "status": "ACTUAL"}]
        })
        assert save_open.status_code == 200, save_open.text

        # Lock the period
        lock_res = client.put(f"/api/v1/org/periods/{period['id']}", json={"is_locked": True})
        assert lock_res.status_code == 200
        assert lock_res.json()["is_locked"] is True

        # Submit data while LOCKED — must be rejected with 400
        save_locked = client.post("/api/v1/collection/save", json={
            "entity_id": project["id"],
            "period_id": period["id"],
            "data_points": [{"metric_code": "ENV-ENERGY-001", "value_numeric": 2000.0, "unit": "kWh", "status": "ACTUAL"}]
        })
        assert save_locked.status_code == 400, f"Expected 400, got {save_locked.status_code}: {save_locked.text}"
        assert "LOCKED" in save_locked.json()["detail"]

    def test_list_periods_returns_is_locked(self):
        """GET /org/periods must include is_locked field on every period."""
        res = client.get("/api/v1/org/periods")
        assert res.status_code == 200
        periods = res.json()
        assert len(periods) > 0, "No periods found — seed data may be missing"
        for p in periods:
            assert "is_locked" in p, f"Period {p.get('code')} missing is_locked field"
            # is_locked must be consistent with status
            expected = (p["status"] == "LOCKED")
            assert p["is_locked"] == expected, (
                f"Period {p.get('code')}: status={p['status']} but is_locked={p['is_locked']}"
            )

    def test_bulk_lock_all_periods_in_fy(self):
        """Simulate frontend bulk-lock: iterate fyPeriods and PUT { is_locked: true } on each."""
        fy = "2025-2026"
        # Get all OPEN periods for the FY
        res = client.get("/api/v1/org/periods", params={"financial_year": fy})
        assert res.status_code == 200
        open_periods = [p for p in res.json() if not p["is_locked"]]

        if not open_periods:
            pytest.skip("No OPEN periods available for bulk lock test")

        # Lock all
        for p in open_periods:
            lock_res = client.put(f"/api/v1/org/periods/{p['id']}", json={"is_locked": True})
            assert lock_res.status_code == 200, f"Failed to lock period {p['code']}: {lock_res.text}"
            assert lock_res.json()["is_locked"] is True

        # Verify all are now locked
        res2 = client.get("/api/v1/org/periods", params={"financial_year": fy})
        for p in res2.json():
            if p["id"] in {op["id"] for op in open_periods}:
                assert p["is_locked"] is True, f"Period {p['code']} not locked after bulk lock"

        # Cleanup: unlock all
        for p in open_periods:
            client.put(f"/api/v1/org/periods/{p['id']}", json={"is_locked": False})

