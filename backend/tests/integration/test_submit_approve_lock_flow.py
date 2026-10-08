import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import init_db

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_database():
    init_db()

def test_full_maker_checker_approval_and_sod_flow():
    suffix = uuid.uuid4().hex[:6].upper()

    # 1. Create Organization Node & Reporting Period
    site_res = client.post("/api/v1/org/nodes", json={
        "code": f"PRJ-FLOW-{suffix}",
        "name": "Kaleshwaram Pump House Unit 2",
        "type": "project",
        "ownership_pct": 100.0,
        "control_type": "operational_control",
        "boundary": True,
        "project_type": "irrigation",
        "location_country": "India"
    })
    site = site_res.json()

    period_res = client.post("/api/v1/org/periods", json={
        "code": f"FY2025-26-M{suffix[:3]}",
        "financial_year": "2025-2026",
        "period_type": "month",
        "start_date": "2025-05-01",
        "end_date": "2025-05-31",
        "status": "OPEN"
    })
    period = period_res.json()

    # 2. Register distinct Maker and Reviewer
    maker_res = client.post("/api/v1/auth/register", json={
        "email": f"maker.{suffix}@meil.in",
        "password": "Password123!",
        "full_name": "Maker Engineer",
        "role": "project_admin",
        "org_node_id": site["id"]
    })
    maker = maker_res.json()

    reviewer_res = client.post("/api/v1/auth/register", json={
        "email": f"reviewer.{suffix}@meil.in",
        "password": "Password123!",
        "full_name": "BU Review Lead",
        "role": "bu_admin"
    })
    reviewer = reviewer_res.json()

    # 3. Enter data point
    save_res = client.post("/api/v1/collection/save", json={
        "entity_id": site["id"],
        "period_id": period["id"],
        "data_points": [
            {
                "metric_code": "ENV-ENERGY-001",
                "value_numeric": 45000.0,
                "unit": "kWh",
                "status": "ACTUAL"
            }
        ]
    })
    submission = save_res.json()
    dp_id = submission["data_points"][0]["id"]

    # 4. Check validation rule gate: Missing evidence should block approval
    val_res = client.post(f"/api/v1/validation/check/{submission['id']}")
    assert val_res.status_code == 200
    val_data = val_res.json()
    assert val_data["can_submit"] is False
    assert val_data["error_count"] >= 1
    assert any("evidence" in r["message"].lower() for r in val_data["results"])

    # 5. Upload evidence and link it
    file_bytes = b"POWER BILL 45000 kWh - SITE VERIFIED"
    up_res = client.post(
        "/api/v1/evidence/upload",
        files={"file": ("bill.txt", file_bytes, "text/plain")}
    )
    assert up_res.status_code == 201
    evidence_id = up_res.json()["evidence"]["id"]

    link_res = client.post("/api/v1/evidence/link", json={
        "evidence_id": evidence_id,
        "data_point_id": dp_id,
        "page_ref": "Page 1"
    })
    assert link_res.status_code == 201

    # 6. Re-check validation: now errors should be cleared
    val_res2 = client.post(f"/api/v1/validation/check/{submission['id']}")
    assert val_res2.status_code == 200
    assert val_res2.json()["can_submit"] is True

    # 7. Submit pack by maker
    sub_res = client.post(f"/api/v1/collection/submit/{submission['id']}")
    assert sub_res.status_code == 200
    assert sub_res.json()["status"] == "SUBMITTED"

    # Associate maker_id to submission for SoD test
    from app.db.session import SessionLocal
    from app.modules.collection.models import Submission
    with SessionLocal() as db:
        s_obj = db.query(Submission).filter(Submission.id == submission["id"]).first()
        s_obj.maker_id = maker["id"]
        db.commit()

    # 8. Segregation of Duties Violation Check: Maker tries to approve own submission
    sod_attempt = client.post(f"/api/v1/workflow/review/{submission['id']}", json={
        "decision": "APPROVE",
        "reviewer_id": maker["id"]
    })
    assert sod_attempt.status_code == 403
    assert "Segregation of Duties" in sod_attempt.json()["detail"]

    # 9. Legitimate Reviewer approves submission: advances SUBMITTED -> BU_APPROVED
    review_res = client.post(f"/api/v1/workflow/review/{submission['id']}", json={
        "decision": "APPROVE",
        "reviewer_id": reviewer["id"],
        "comment": "All meter readings cross-verified with substation logbook."
    })
    assert review_res.status_code == 200
    assert review_res.json()["decision"] == "APPROVE"

    # Verify status changed
    sub_view = client.get(f"/api/v1/collection/pack/{site['id']}/{period['id']}").json()
    assert sub_view["status"] == "BU_APPROVED"

    # 10. Test Return with Mandatory Comment
    return_res = client.post(f"/api/v1/workflow/review/{submission['id']}", json={
        "decision": "RETURN",
        "reviewer_id": reviewer["id"],
        "comment": "Substation serial number missing; please re-upload invoice with annexure."
    })
    assert return_res.status_code == 200
    assert return_res.json()["decision"] == "RETURN"

    # Verify status reverted to RETURNED
    sub_view2 = client.get(f"/api/v1/collection/pack/{site['id']}/{period['id']}").json()
    assert sub_view2["status"] == "RETURNED"
