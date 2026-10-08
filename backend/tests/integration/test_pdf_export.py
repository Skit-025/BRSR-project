import io
import pytest
from pypdf import PdfReader
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import SessionLocal
from app.modules.org.models import OrgNode, ReportingPeriod

client = TestClient(app)

def test_pdf_export_endpoint_and_selectable_text():
    # 1. Fetch any existing entity and period from DB
    with SessionLocal() as db:
        node = db.query(OrgNode).filter(OrgNode.type.in_(["group", "subsidiary", "company"])).first()
        period = db.query(ReportingPeriod).first()
        assert node is not None, "Need at least one Group or Subsidiary node in DB to test PDF export"
        assert period is not None, "Need at least one reporting period in DB to test PDF export"
        entity_id = str(node.id)
        period_id = str(period.id)

    # 2. Call PDF export endpoint
    res = client.get(f"/api/v1/reports/export/pdf/{entity_id}/{period_id}")
    assert res.status_code == 200, f"PDF export failed with status {res.status_code}: {res.text}"
    assert res.headers["content-type"] == "application/pdf"
    assert "attachment;" in res.headers.get("content-disposition", "")
    assert len(res.content) > 1000, "PDF content should be non-empty"

    # 3. Verify PDF is valid, opens, has correct page count >= 1, and contains selectable text
    pdf_reader = PdfReader(io.BytesIO(res.content))
    assert len(pdf_reader.pages) >= 1, "PDF should have at least 1 page"

    # Extract text from page 1
    page1_text = pdf_reader.pages[0].extract_text()
    assert page1_text is not None and len(page1_text) > 0, "PDF must have selectable text"
    assert "BRSR" in page1_text or "SEBI" in page1_text or "REPORT" in page1_text.upper(), (
        f"Expected BRSR/SEBI text in PDF, got: {page1_text[:200]}"
    )
