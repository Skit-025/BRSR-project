import pytest
from app.ai.schemas import (
    E1ExtractRequest,
    E2AnomalyRequest,
    E3ExplainFieldRequest,
    E4PolicyCheckRequest,
    E5NarrativeRequest,
    E6ValueChainRequest,
    E7ExplainNumberRequest
)
from app.ai.e1_extract.extractor import e1_engine
from app.ai.e2_anomaly.engine import e2_engine
from app.ai.e3_rag.engine import e3_engine
from app.ai.e4_policy.analyzer import e4_engine
from app.ai.e5_narrative.drafter import e5_engine
from app.ai.e6_valuechain.estimator import e6_engine
from app.ai.e7_explainer.explain import e7_engine

def test_e1_evidence_extraction():
    req = E1ExtractRequest(evidence_id="ev_bill_12345", doc_type_hint="electricity_bill")
    res = e1_engine.extract_from_file(req)
    assert res.run_id is not None
    assert len(res.fields) > 0
    assert res.fields[0].metric == "ENV-ENERGY-001"
    assert res.fields[0].value == 52000.0
    assert res.fields[0].confidence >= 0.90

def test_e2_anomaly_detection_rules_and_mad():
    # Test 1: Normal value
    req_normal = E2AnomalyRequest(
        metric_code="ENV-ENERGY-001",
        current_value=51000.0,
        unit="kWh",
        history=[50000.0, 52000.0, 49000.0, 51000.0, 50500.0]
    )
    res_normal = e2_engine.evaluate(req_normal)
    assert res_normal.is_anomaly is False
    assert res_normal.score < 0.40

    # Test 2: Unit slip spike (1000x)
    req_spike = E2AnomalyRequest(
        metric_code="ENV-ENERGY-001",
        current_value=52000000.0,
        unit="kWh",
        history=[50000.0, 52000.0, 49000.0, 51000.0, 50500.0]
    )
    res_spike = e2_engine.evaluate(req_spike)
    assert res_spike.is_anomaly is True
    assert res_spike.score >= 0.65
    assert any("unit_slip" in r.feature for r in res_spike.reasons)

def test_e3_guidance_rag_grounded():
    req = E3ExplainFieldRequest(
        indicator_code="ENV-ENERGY-001",
        question="How to report electricity consumption?"
    )
    res = e3_engine.explain(req)
    assert res.grounded is True
    assert len(res.citations) > 0
    assert "Principle 6" in res.citations[0].section
    assert "Essential Indicator 1" in res.citations[0].section

def test_e4_policy_gap():
    req = E4PolicyCheckRequest(
        evidence_id="doc_pol_01",
        policy_type="Anti-Corruption",
        text_content="We maintain strict prohibition of bribery and whistleblower protection."
    )
    res = e4_engine.analyze(req)
    assert len(res.items) > 0
    assert res.completeness_score > 0.0

def test_e5_narrative_number_lock():
    # Number lock should pass when Scope 1 matches approved KPI
    req = E5NarrativeRequest(
        section="Principle 6 Environmental",
        approved_kpis={"Scope1": 18650},
        period="FY 2025-26"
    )
    res = e5_engine.draft(req)
    assert res.number_lock_passed is True
    assert "18,650" in res.draft or "18650" in res.draft

def test_e6_value_chain_estimation():
    req = E6ValueChainRequest(
        work_category="diesel_hauling",
        billed_quantity=100.0,
        billed_unit="kL"
    )
    res = e6_engine.estimate(req)
    assert res.estimated_emissions_tco2e > 0.0

def test_e7_explain_number():
    req = E7ExplainNumberRequest(
        consolidated_value_id="cv_scope1_group",
        metric_code="ENV-GHG-001",
        period="FY 2025-26",
        question="Why did Scope 1 emissions increase?"
    )
    res = e7_engine.explain(req)
    assert len(res.drivers) > 0
    assert "Hydrocarbon Project H4" in res.summary
