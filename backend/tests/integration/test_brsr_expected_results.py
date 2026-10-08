import os
import json
import pytest
from app.db.session import SessionLocal
from app.modules.org.models import OrgNode, ReportingPeriod
from app.modules.reporting.brsr_generator import compile_brsr_full_data, generate_brsr_html, export_brsr_json


@pytest.fixture(scope="module")
def db_session():
    db = SessionLocal()
    yield db
    db.close()


def test_brsr_expected_results_and_structure(db_session):
    # 1. Load expected results
    expected_path = os.path.join(os.path.dirname(__file__), "../../demo_data/07_expected_results.json")
    if not os.path.exists(expected_path):
        pytest.skip("07_expected_results.json not found")

    with open(expected_path, "r", encoding="utf-8") as f:
        expected = json.load(f)

    # 2. Find entity and period
    entity = db_session.query(OrgNode).filter(OrgNode.code == expected["entity_code"]).first()
    assert entity is not None, f"Entity {expected['entity_code']} not found in DB"

    period = db_session.query(ReportingPeriod).filter(
        ReportingPeriod.code.ilike(f"%{expected.get('financial_year', '2025-26')}%")
    ).first()
    if not period:
        period = db_session.query(ReportingPeriod).first()
    assert period is not None, "Reporting period not found in DB"

    # 3. Compile full report data
    report_data = compile_brsr_full_data(db_session, str(entity.id), str(period.id))
    assert report_data is not None
    assert report_data["entity_code"] == expected["entity_code"]
    assert "curr_values" in report_data
    assert "derived" in report_data

    # 4. Check core metrics match expected results
    curr_values = report_data["curr_values"]
    derived = report_data["derived"]

    # Verify that values exist and match within expected precision
    if "energy" in expected and "ENV-ENERGY-001" in curr_values:
        assert abs(curr_values["ENV-ENERGY-001"] - expected["energy"]) < 1e-2, (
            f"Energy mismatch: got {curr_values['ENV-ENERGY-001']}, expected {expected['energy']}"
        )

    if "water" in expected and "ENV-WATER-001" in curr_values:
        assert abs(curr_values["ENV-WATER-001"] - expected["water"]) < 1e-2, (
            f"Water mismatch: got {curr_values['ENV-WATER-001']}, expected {expected['water']}"
        )

    if "waste" in expected and "ENV-WASTE-001" in curr_values:
        assert abs(curr_values["ENV-WASTE-001"] - expected["waste"]) < 1e-2, (
            f"Waste mismatch: got {curr_values['ENV-WASTE-001']}, expected {expected['waste']}"
        )

    if "headcount" in expected and "SOC-EMP-001" in curr_values:
        assert abs(curr_values["SOC-EMP-001"] - expected["headcount"]) < 1e-2, (
            f"Headcount mismatch: got {curr_values['SOC-EMP-001']}, expected {expected['headcount']}"
        )

    if "LTIFR" in expected and derived.get("ltifr_curr") is not None:
        assert abs(derived["ltifr_curr"] - expected["LTIFR"]) < 1e-2, (
            f"LTIFR mismatch: got {derived['ltifr_curr']}, expected {expected['LTIFR']}"
        )

    # 5. Generate HTML and verify full BRSR document structure
    html = generate_brsr_html(report_data)
    assert len(html) > 50000, f"Report HTML seems incomplete, got {len(html)} chars"

    # Verify major headings and section structure
    assert "BUSINESS RESPONSIBILITY & SUSTAINABILITY REPORTING" in html
    assert "SECTION A: GENERAL DISCLOSURES" in html
    assert "SECTION B: MANAGEMENT AND PROCESS DISCLOSURES" in html
    assert "SECTION C: PRINCIPLE-WISE PERFORMANCE DISCLOSURES" in html
    for p in range(1, 10):
        assert f"PRINCIPLE {p}:" in html or f"PRINCIPLE {p}" in html

    assert "INDEPENDENT REASONABLE ASSURANCE STATEMENT" in html or "Independent Reasonable Assurance Statement" in html
    assert "clickable-kpi" in html
    assert "data-metric-code" in html

    # 6. Verify JSON export API
    json_export = export_brsr_json(db_session, str(entity.id), str(period.id))
    assert json_export["entity_code"] == expected["entity_code"]
    assert "boundary_entities" in json_export
    assert "assurance" in json_export
