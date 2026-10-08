import json
import os
import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import SessionLocal
from app.modules.org.models import OrgNode, ReportingPeriod, PeriodStatus
from app.modules.collection.models import Submission, DataPoint, SubmissionStatus

client = TestClient(app)

FIXTURE_PATH = os.path.join(
    os.path.dirname(__file__), "..", "..", "demo_data", "11_offline_sync_sample_batch.json"
)

def test_offline_sync_service_and_fixture():
    # 1. Load the test fixture
    with open(FIXTURE_PATH, "r", encoding="utf-8") as f:
        fixture_data = json.load(f)

    suffix = uuid.uuid4().hex[:6].upper()

    # 2. Setup DB entities: OrgNode, Open ReportingPeriod, and Submission
    with SessionLocal() as db:
        node = OrgNode(
            code=f"PRJ-OFFLINE-{suffix}",
            name=f"Offline Test Site {suffix}",
            type="project",
            path=f"GRP.PRJ-OFFLINE-{suffix}",
            boundary=True,
            ownership_pct=100.0,
            control_type="operational_control",
        )
        period = ReportingPeriod(
            code=f"FY2025-26-SYNC-{suffix}",
            financial_year="2025-2026",
            period_type="month",
            start_date="2026-03-01",
            end_date="2026-03-31",
            status=PeriodStatus.OPEN.value,
        )
        db.add_all([node, period])
        db.flush()

        submission = Submission(
            entity_id=node.id,
            period_id=period.id,
            status=SubmissionStatus.DRAFT.value,
            version=1,
        )
        db.add(submission)
        db.commit()
        sub_id = str(submission.id)
        period_id = str(period.id)

    # Update fixture submission_id
    fixture_data["submission_id"] = sub_id

    # 3. First Sync: apply the batch
    # Items include 2 distinct items + 1 duplicate re-transmission of item 1
    res = client.post("/api/v1/sync/batch", json=fixture_data)
    assert res.status_code == 200, f"Sync failed: {res.text}"
    body = res.json()
    assert body["status"] == "completed"
    assert body["total_items"] == 3
    assert body["applied_count"] == 2
    assert body["already_synced_count"] == 1, "Duplicate item in batch should be marked already_synced"
    assert len(body["results"]) == 3

    # Check results array
    results = body["results"]
    assert results[0]["status"] == "applied"
    assert results[1]["status"] == "applied"
    assert results[2]["status"] == "already_synced"

    # 4. Replay Attack / Re-transmission Test:
    # Sending the exact same batch again should NOT re-apply, all 3 items marked already_synced
    res_repeat = client.post("/api/v1/sync/batch", json=fixture_data)
    assert res_repeat.status_code == 200
    body_repeat = res_repeat.json()
    assert body_repeat["applied_count"] == 0
    assert body_repeat["already_synced_count"] == 3

    # 5. Conflict Policy Test (Server Wins):
    # Server advances to version 5 with a newer approved value. Client sends version 1.
    with SessionLocal() as db:
        dp = db.query(DataPoint).filter(
            DataPoint.submission_id == sub_id,
            DataPoint.metric_code == "ENV-ENERGY-001"
        ).first()
        dp.version = 5
        dp.value_numeric = 60000.0
        db.commit()

    conflict_payload = {
        "submission_id": sub_id,
        "items": [
            {
                "idempotency_key": f"offline-energy-conflict-{suffix}",
                "metric_code": "ENV-ENERGY-001",
                "value_numeric": 51000.0,
                "unit": "kWh",
                "version": 2,  # client is behind server version 5
            }
        ]
    }
    res_conflict = client.post("/api/v1/sync/batch", json=conflict_payload)
    assert res_conflict.status_code == 200
    body_conflict = res_conflict.json()
    assert body_conflict["conflicts_count"] == 1
    assert body_conflict["results"][0]["status"] == "conflict_server_newer"

    # Verify server value was not overwritten
    with SessionLocal() as db:
        dp_check = db.query(DataPoint).filter(
            DataPoint.submission_id == sub_id,
            DataPoint.metric_code == "ENV-ENERGY-001"
        ).first()
        assert dp_check.value_numeric == 60000.0

    # 6. Locked-Period Rejection Test:
    # Lock the reporting period. Any sync request must be rejected.
    with SessionLocal() as db:
        p_obj = db.query(ReportingPeriod).filter(ReportingPeriod.id == period_id).first()
        p_obj.status = PeriodStatus.LOCKED.value
        db.commit()

    locked_payload = {
        "submission_id": sub_id,
        "items": [
            {
                "idempotency_key": f"offline-locked-{suffix}",
                "metric_code": "ENV-WATER-001",
                "value_numeric": 9999.0,
                "unit": "kL",
                "version": 1,
            }
        ]
    }
    res_locked = client.post("/api/v1/sync/batch", json=locked_payload)
    assert res_locked.status_code == 200
    body_locked = res_locked.json()
    assert body_locked["status"] == "rejected_period_locked"
