"""
Unit tests for E5 Narrative Copilot Number-Lock Guardrail.
Verifies:
- Metric identifiers (ENV-ENERGY-001) are not falsely flagged.
- Reporting periods (FY 2024-25, 2026) are permitted.
- Approved numbers (int, float, formatted commas) pass validation.
- Unsupported or hallucinated numbers are strictly flagged.
- Decimal and percentage values are properly checked.
"""
import pytest
from app.ai.e5_narrative.number_lock import check_number_lock, build_approved_set


def test_metric_identifier_number_lock():
    """Verify that ENV-ENERGY-001 does not flag '001' as an unapproved number."""
    approved_kpis = {
        "ENV-ENERGY-001": 1420.0,
        "RENEWABLE_SHARE": 34.2
    }
    draft = (
        "In FY 2025-26, under Principle 6, the company reported ENV-ENERGY-001: 1420.0 kWh. "
        "The renewable share reached 34.2% with zero non-conformances."
    )
    all_numbers, unapproved, passed = check_number_lock(draft, approved_kpis)
    assert passed is True, f"Number-Lock should pass but flagged unapproved numbers: {unapproved}"
    assert "001" not in unapproved


def test_hallucinated_number_is_flagged():
    """Verify that unapproved numbers fabricated by LLM are caught."""
    approved_kpis = {
        "ENV-WATER-001": 5000.0
    }
    # Draft introduces an unapproved 999.0 metric
    draft = "Total water consumed was 5000.0 kL, while untreated discharge was 999.0 kL."
    all_numbers, unapproved, passed = check_number_lock(draft, approved_kpis)
    assert passed is False
    assert "999.0" in unapproved


def test_formatted_commas_and_integers():
    """Verify comma-formatted numbers match integer/float approved KPIs."""
    approved_kpis = {
        "SCOPE1": 1000000
    }
    draft = "Scope 1 emissions were verified at 1,000,000 tCO2e across all plants."
    all_numbers, unapproved, passed = check_number_lock(draft, approved_kpis)
    assert passed is True
    assert len(unapproved) == 0


def test_periods_and_single_digits_permitted():
    """Verify standard period years and single digits (Principle 1-9) do not trigger false alarms."""
    approved_kpis = {"SCOPE2": 250.5}
    draft = "During 2025, operations aligned with Principle 7 and Principle 8, recording 250.5 tCO2e."
    all_numbers, unapproved, passed = check_number_lock(draft, approved_kpis)
    assert passed is True
    assert len(unapproved) == 0

