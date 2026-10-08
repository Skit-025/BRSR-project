import io
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.modules.evidence.models import EvidenceFile, _generate_display_id

client = TestClient(app)

def test_evidence_display_id_format():
    display_id = _generate_display_id()
    assert display_id.startswith("EVD-")
    assert len(display_id) == 12  # "EVD-" (4) + 8 hex chars = 12

def test_evidence_upload_bill_with_metadata():
    """Test uploading a Bill with bill_type, project_id, esg_indicator, and verify display ID."""
    file_content = b"%PDF-1.4 electricity bill sample content with 12000 kWh consumption"
    files = {"file": ("electricity_may.pdf", io.BytesIO(file_content), "application/pdf")}
    data = {
        "doc_category": "Bill",
        "bill_type": "Electricity",
        "project_id": "PRJ-SITE-01",
        "esg_indicator": "ENV-ENERGY-001",
        "run_ocr": "false"  # Immediate attachment without waiting
    }

    res = client.post("/api/v1/evidence/upload", files=files, data=data)
    assert res.status_code == 201
    payload = res.json()
    evidence = payload["evidence"]

    assert evidence["doc_category"] == "Bill"
    assert evidence["bill_type"] == "Electricity"
    assert evidence["project_id"] == "PRJ-SITE-01"
    assert evidence["esg_indicator"] == "ENV-ENERGY-001"
    assert evidence["evidence_display_id"].startswith("EVD-")
    assert evidence["original_name"] == "electricity_may.pdf"
    assert payload["is_relevant"] is True

def test_evidence_upload_report_with_metadata():
    """Test uploading a Report: bill_type must fallback to Unknown, never a specific bill."""
    file_content = b"%PDF-1.4 environmental impact audit report sample content"
    files = {"file": ("eia_report_2026.pdf", io.BytesIO(file_content), "application/pdf")}
    data = {
        "doc_category": "Report",
        "bill_type": "Electricity",  # Should be normalized to Unknown for Report
        "project_id": "PRJ-SITE-01",
        "esg_indicator": "ENV-WATER-001",
        "run_ocr": "false"
    }

    res = client.post("/api/v1/evidence/upload", files=files, data=data)
    assert res.status_code == 201
    payload = res.json()
    evidence = payload["evidence"]

    assert evidence["doc_category"] == "Report"
    assert evidence["bill_type"] == "Unknown"
    assert evidence["evidence_display_id"].startswith("EVD-")

def test_evidence_irrelevant_document_rejected():
    """Test that an unrelated document (e.g. resume / code) is rejected by AI."""
    unrelated_content = b"%PDF-1.4 curriculum vitae john doe software engineer resume"
    files = {"file": ("resume_john.pdf", io.BytesIO(unrelated_content), "application/pdf")}
    data = {
        "doc_category": "Report",
        "project_id": "PRJ-SITE-01",
        "esg_indicator": "ENV-ENERGY-001",
        "run_ocr": "true"
    }

    res = client.post("/api/v1/evidence/upload", files=files, data=data)
    assert res.status_code == 201
    payload = res.json()
    assert payload["is_relevant"] is False
    assert "not appear to be relevant" in payload["rejection_reason"].lower() or "unrelated" in payload["rejection_reason"].lower()
    # Evidence must still exist and have valid Evidence ID even if AI rejected
    assert payload["evidence"]["evidence_display_id"].startswith("EVD-")
