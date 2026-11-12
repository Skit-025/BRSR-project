"""
Unit tests verifying the official SEBI Annexure I BRSR disclosure report template rendering.
"""
from app.modules.reporting.renderers.pdf import render_brsr_html, render_brsr_pdf_bytes


def test_render_brsr_html_contains_full_annexure_i_structure():
    report_data = {
        "report_id": "rpt-test-001",
        "report_type": "BRSR_FULL",
        "entity_code": "MEIL-GROUP",
        "entity_name": "Megha Engineering & Infrastructures Ltd (MEIL)",
        "financial_year": "FY2025-26",
        "period_code": "FY2025-26-M03",
        "snapshot_hash": "a" * 64,
        "total_scope_1_tco2e": 124.5,
        "total_scope_2_tco2e": 80.25,
        "total_scope_3_tco2e": 310.75,
        "section_a": {
            "corporate_name": "Megha Engineering & Infrastructures Ltd (MEIL)",
            "cin": "U45200TG2006PLC050277",
            "financial_year": "FY2025-26",
            "total_employees": 1200,
            "operating_plants_and_sites_count": 8,
            "reporting_boundary": "Consolidated (Subsidiaries, JVs, and Operating Sites)",
            "holding_subsidiaries": [
                {
                    "name": "Megha Road Transport Projects",
                    "relation": "Subsidiary",
                    "ownership_pct": "100.0%",
                    "participates_br": "Yes",
                }
            ],
        },
        "section_b": {
            "board_oversight_committee": "MEIL ESG & Risk Management Committee",
            "principles_matrix": {
                "P1": {"policy_covered": "Yes", "board_approved": "Yes"},
                "P6": {"policy_covered": "Yes", "board_approved": "Yes"},
            },
        },
        "section_c": [
            {
                "metric_code": "ENV-ENERGY-001",
                "indicator_name": "Total electricity consumption",
                "principle": 6,
                "brsr_core": True,
                "disclosed_value": 80.0,
                "unit": "MWh",
                "aggregation_method": "sum",
                "evidence_verified": True,
                "status": "CALCULATED",
            },
            {
                "metric_code": "SOC-SAFE-001",
                "indicator_name": "Lost Time Injury Frequency Rate (LTIFR)",
                "principle": 3,
                "brsr_core": True,
                "disclosed_value": 0.42,
                "unit": "per 1,000,000 h",
                "aggregation_method": "weighted_avg",
                "evidence_verified": False,
                "status": "CALCULATED",
            },
        ],
    }

    html = render_brsr_html(report_data)

    # Annexure header & Sections
    assert "Annexure I" in html
    assert "BUSINESS RESPONSIBILITY &amp; SUSTAINABILITY REPORTING FORMAT" in html
    assert "SECTION A: GENERAL DISCLOSURES" in html
    assert "SECTION B: MANAGEMENT AND PROCESS DISCLOSURES" in html
    assert "SECTION C: PRINCIPLE WISE PERFORMANCE DISCLOSURE" in html

    # All Section A sub-parts I-VII and key questions
    assert "I. &nbsp; Details of the listed entity" in html
    assert "Details of business activities" in html
    assert "Differently abled Employees and workers:" in html
    assert "Participation/Inclusion/Representation of women" in html
    assert "Turnover rate for permanent employees and workers" in html
    assert "Holding, Subsidiary and Associate Companies" in html
    assert "Megha Road Transport Projects" in html
    assert "CSR Details" in html
    assert "Complaints/Grievances on any of the principles" in html
    assert "material responsible business conduct issues" in html

    # Section B matrix & Q10-12
    assert "Details of Review of NGRBCs by the Company:" in html
    assert "If answer to question (1) above is" in html

    # All 9 Principles in Section C (Essential + Leadership)
    for p in range(1, 10):
        assert f"PRINCIPLE {p}" in html
    assert "Essential Indicators" in html
    assert "Leadership Indicators" in html

    # Real metric values & register populated
    assert "ENV-ENERGY-001" in html
    assert "80.00 MWh" in html
    assert "124.50" in html
    assert "80.25" in html
    assert "310.75" in html
    assert "0.42" in html

    # Bytes renderer fallback returns non-empty UTF-8 document
    pdf_or_html = render_brsr_pdf_bytes(report_data)
    assert isinstance(pdf_or_html, (bytes, bytearray))
    assert len(pdf_or_html) > 5000

