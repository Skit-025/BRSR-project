from app.ai.e1_extract.pipeline import (
    _extract_deterministic,
    _parse_llm_fields_response,
    _select_relevant_text,
    run_extraction_pipeline,
)
from app.ai.schemas import E1ExtractRequest


def test_electricity_bill_avoids_rupee_and_uses_meter_diff():
    bill_text = """
    TSSPDCL ELECTRICITY BILL
    Invoice No: 998811
    Sanctioned Load: 50 kWh
    Tariff Rate: Rs 7.50 per kWh
    Previous Reading: 12000
    Current Reading: 12450
    Total Charges Payable: Rs. 3375.00
    """
    fields = _extract_deterministic(bill_text, "electricity_bill")
    assert len(fields) == 1
    assert fields[0].value == 450.0
    assert fields[0].unit == "kWh"
    assert fields[0].metadata.get("bill_amount_inr") == 3375.0


def test_electricity_bill_targets_solar_ppa_when_requested():
    bill_text = """
    DISCOM & OPEN ACCESS SUMMARY
    Grid Electricity Consumed: 18500 kWh
    Captive Solar PPA Energy Consumed: 6400 kWh
    Total Payable: Rs. 145000
    """
    fields = _extract_deterministic(
        bill_text,
        "electricity_bill",
        target_metric="ENV-ENERGY-004",
        metric_name="Captive/PPA renewable electricity consumed",
    )
    assert any(f.value == 6400.0 for f in fields)


def test_water_and_air_targeted_extraction():
    report_text = """
    SPCB NABL LAB & WATER MONITORING REPORT
    Surface Water Withdrawal: 420 kL
    Groundwater / Borewell: 185 kL
    Third-party Municipal Water: 60 kL
    Stack 1 Monitoring Results:
    NOx: 42.5 mg/m3
    SOx: 18.2 mg/m3
    Particulate Matter (PM10): 64.0 mg/m3
    """
    gw = _extract_deterministic(
        report_text,
        "water_manifest",
        target_metric="ENV-WATER-003",
        metric_name="Groundwater / Borewell",
    )
    assert any(f.value == 185.0 and f.unit.lower() == "kl" for f in gw)

    air_fields = _extract_deterministic(report_text, "air_monitoring")
    metrics = {f.metric: f.value for f in air_fields}
    assert metrics["ENV-AIR-001"] == 42.5
    assert metrics["ENV-AIR-002"] == 18.2
    assert metrics["ENV-AIR-003"] == 64.0


def test_waste_kg_to_tonnes_and_no_random_number_grab():
    waste_text = """
    FORM-10 HAZARDOUS WASTE MANIFEST
    Manifest No: 20260045
    Date: 14-03-2026
    Net Weight: 2500 kg
    """
    fields = _extract_deterministic(waste_text, "waste_manifest")
    assert len(fields) == 1
    assert fields[0].value == 2.5
    assert fields[0].unit == "tonnes"

    # Unrelated text with only invoice/date numbers should NOT grab random numbers in other_bill
    noise_text = "Document Ref: 10452\nDate: 12/05/2025\nAddress: Plot 45, Hyderabad 500032"
    other_fields = _extract_deterministic(noise_text, "other_bill")
    assert other_fields == []


def test_parse_llm_rejects_currency_confusion_and_supports_multi_field():
    raw = {
        "metric": "ENV-ENERGY-001",
        "value": 3375,
        "bill_amount": 3375,
        "meter_reading_previous": 12000,
        "meter_reading_current": 12450,
        "unit": "kWh",
        "confidence": 0.91,
        "fields": [
            {"field_name": "Grid Electricity", "metric": "ENV-ENERGY-001", "value": 450, "unit": "kWh", "confidence": 0.95}
        ],
    }
    parsed = _parse_llm_fields_response(
        raw,
        default_metric="ENV-ENERGY-001",
        default_unit="kWh",
        provider_used="test",
        source_text="Previous 12000 Current 12450 Units 450 Rs 3375",
    )
    assert parsed[0].value == 450.0


def test_select_relevant_text_keeps_late_page_target():
    filler = "Header line\n" + ("Unrelated boiler plate text without numbers.\n" * 400)
    target_line = "\nGroundwater Borewell Withdrawal: 312.5 kL\n"
    long_doc = filler + target_line
    selected = _select_relevant_text(long_doc, "water_manifest", "ENV-WATER-003", "Groundwater Borewell", max_chars=4000)
    assert "312.5" in selected
    assert len(selected) <= 4100


def test_pipeline_end_to_end_txt_target_metric():
    content = b"ELECTRICITY STATEMENT\nGrid Consumed: 1200 kWh\nSolar PPA Consumed: 350 kWh\nTotal Bill: Rs. 9600"
    req = E1ExtractRequest(
        file_bytes=content,
        filename="power_log.txt",
        mime_type="text/plain",
        doc_type_hint="electricity_bill",
        target_metric="ENV-ENERGY-004",
        metric_name="Solar PPA renewable electricity",
    )
    res = run_extraction_pipeline(req)
    assert res.is_relevant is True
    assert any(float(f.value) == 350.0 for f in res.fields)

