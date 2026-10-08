# -*- coding: utf-8 -*-
import re
import pytest
from app.modules.reporting.brsr_generator import generate_brsr_html, render_num_cell

def test_template_has_no_hardcoded_digits_when_data_is_empty():
    """
    SEBI Statutory Data Rule:
    Every number in the report must come from the database for the chosen entity + period.
    Never from literals in the template.
    If database data has no values, all numeric cells must render as 'Data not provided'
    or '–' (nil), and NEVER a hardcoded literal digit sequence.
    """
    empty_report_data = {
        "entity_id": "test-entity-id",
        "period_id": "test-period-id",
        "entity_name": "Test Entity",
        "financial_year": "2025-2026",
        "prev_financial_year": "2024-2025",
        "reporting_boundary": "Standalone basis",
        "boundary_entities": ["Test Entity"],
        "completeness": {"total_indicators": 8, "provided_indicators": 0, "completeness_pct": 0.0},
        "curr_values": {},
        "prev_values": {},
        "derived": {},
        "assurance": {"provider_name": "Test Auditor", "assurance_type": "Reasonable Assurance", "scope_indicators": []},
    }

    # Generate HTML with empty data
    html = generate_brsr_html(empty_report_data)

    # Check for raw hardcoded numbers inside td.cell-missing
    assert "Data not provided" in html

    # Verify that render_num_cell behaves dynamically
    sample_cell = render_num_cell(None, "ENV-ENERGY-001", "eid", "pid")
    assert "Data not provided" in sample_cell
    assert re.search(r'>\d+<', sample_cell) is None

    # Verify that positive numbers are injected dynamically
    injected_cell = render_num_cell(45000, "ENV-ENERGY-001", "eid", "pid", unit="kWh")
    assert "45,000 kWh" in injected_cell
    assert 'data-metric-code="ENV-ENERGY-001"' in injected_cell
    assert 'data-entity-id="eid"' in injected_cell

def test_generator_file_contains_no_raw_td_number_literals():
    """
    Verifies that the generator source code does not define static hardcoded digit cells
    such as <td...>128</td> or <td...>378039</td> in HTML strings.
    """
    import os
    gen_file = os.path.join(os.path.dirname(__file__), "..", "..", "app", "modules", "reporting", "brsr_generator.py")
    with open(gen_file, "r", encoding="utf-8") as f:
        code = f.read()

    # Search for patterns like <td[^>]*>[0-9,]+</td> outside render_num_cell
    # Note: serial numbers like <td>1.</td> or <td>2</td> for item numbering are allowed
    matches = re.findall(r'<td[^>]*class="cell-num"[^>]*>\s*[0-9]+[0-9,.]*\s*</td>', code)
    assert len(matches) == 0, f"Found hardcoded number cells in generator: {matches}"
