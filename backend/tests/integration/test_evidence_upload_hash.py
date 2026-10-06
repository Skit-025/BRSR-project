import io
import uuid
import hashlib
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import init_db

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_database():
    init_db()

def test_evidence_upload_with_sha256_verification_and_ocr():
    # 1. Create test file content (Sample utility bill text)
    bill_content = b"DISCOM ELECTRICITY INVOICE\nBilling Period: April 2025\nTotal Units Consumed: 52000 kWh\nAmount: INR 416,000"
    true_hash = hashlib.sha256(bill_content).hexdigest()

    # 2. Upload file with matching client SHA-256
    files = {"file": ("electricity_bill_apr2025.txt", io.BytesIO(bill_content), "text/plain")}
    data = {
        "sha256": true_hash,
        "doc_type_hint": "electricity_bill",
        "run_ocr": "true"
    }
    res = client.post("/api/v1/evidence/upload", files=files, data=data)
    assert res.status_code == 201
    res_data = res.json()
    assert res_data["evidence"]["sha256"] == true_hash
    assert res_data["evidence"]["original_name"] == "electricity_bill_apr2025.txt"
    evidence_id = res_data["evidence"]["id"]

    # Verify AI Engine E1 extracted suggestions
    assert len(res_data["extracted_fields"]) > 0
    first_field = res_data["extracted_fields"][0]
    assert first_field["metric"] == "ENV-ENERGY-001"
    assert first_field["value"] == 52000.0

    # 3. Test Download byte-for-byte fidelity
    res_dl = client.get(f"/api/v1/evidence/{evidence_id}/download")
    assert res_dl.status_code == 200
    assert res_dl.content == bill_content

    # 4. Test Evidence Linking to a DataPoint (Audit Lineage Trace)
    from app.db.session import SessionLocal
    from app.modules.org.models import OrgNode, ReportingPeriod
    from app.modules.collection.models import Submission, DataPoint

    db = SessionLocal()
    dp = db.query(DataPoint).first()
    if not dp:
        node = db.query(OrgNode).first()
        period = db.query(ReportingPeriod).first()
        sub = db.query(Submission).filter(Submission.entity_id == node.id, Submission.period_id == period.id).first()
        if not sub:
            sub = Submission(entity_id=node.id, period_id=period.id, status="DRAFT", version=1)
            db.add(sub)
            db.flush()
        dp = DataPoint(
            submission_id=sub.id,
            metric_code="ENV-ENERGY-001",
            value_numeric=52000.0,
            unit="kWh",
            status="ACTUAL",
            entry_method="manual_form"
        )
        db.add(dp)
        db.commit()
    real_dp_id = str(dp.id)
    db.close()


    link_payload = {
        "evidence_id": evidence_id,
        "data_point_id": real_dp_id,
        "page_ref": "Page 1, Total Units Row",
        "notes": "Verified against DISCOM online portal"
    }
    res_link = client.post("/api/v1/evidence/link", json=link_payload)
    assert res_link.status_code == 201

    # 5. Query Audit Lineage for the DataPoint
    res_trace = client.get(f"/api/v1/evidence/datapoint/{real_dp_id}")
    assert res_trace.status_code == 200
    links = res_trace.json()
    assert len(links) >= 1
    matched = [l for l in links if l["evidence_id"] == evidence_id]
    assert len(matched) == 1
    assert matched[0]["page_ref"] == "Page 1, Total Units Row"

def test_tampered_evidence_rejected_by_sha256():
    bill_content = b"GENUINE DIESEL LOGBOOK - 1200 LITRES"
    tampered_hash = "0000000000000000000000000000000000000000000000000000000000000000"

    files = {"file": ("diesel_logbook.txt", io.BytesIO(bill_content), "text/plain")}
    data = {"sha256": tampered_hash}

    res = client.post("/api/v1/evidence/upload", files=files, data=data)
    assert res.status_code == 400
    assert "SHA-256 integrity verification failed" in res.json()["detail"]
