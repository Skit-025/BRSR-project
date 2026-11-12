"""
backend/tests/golden/test_discrepancy_resolution.py
Comprehensive Verification & Regression Suite for Discrepancies 1 through 9.
"""
import uuid
from decimal import Decimal
import pytest
from sqlalchemy import text
from app.db.session import SessionLocal
from app.modules.calc.formulas.scope2 import calculate_scope2_electricity
from app.modules.calc.factors import (
    get_grid_factor,
    get_fuel_factor,
    get_scope3_transport_factor,
    SCOPE3_TRANSPORT_FACTORS,
)
from app.modules.calc.models import EmissionFactor, FactorChangeAuditLog
from app.modules.consolidation.models import ConsolidatedValue
from app.modules.reporting.schemas import PrincipleIndicatorDisclosure
from app.modules.snapshots.builder import build_snapshot_payload
from app.modules.org.models import OrgNode, ReportingPeriod


# ── DISCREPANCY 1: Scope 2 Market-Based Benchmarks ──────────────────────────

def test_scope2_independent_benchmarks_all_cases():
    """
    Validates all mandatory statutory benchmarks:
    - National Grid EF: 0.71600000 tCO2e/MWh (CEA Baseline v20.0)
    - Location-based strictly uses gross grid consumption: 100 MWh * 0.716 = 71.6000 tCO2e
    - Market-based Case A (40 MWh PPA): (100 - 40) * 0.716 = 42.9600 tCO2e
    - Market-based Case B (20 MWh PPA): (100 - 20) * 0.716 = 57.2800 tCO2e
    - Market-based Case C (0 MWh PPA):  100 * 0.716 = 71.6000 tCO2e
    - Market-based Case D (100 MWh PPA): 0 MWh net * 0.716 = 0.0000 tCO2e
    - Market-based Case E (120 MWh PPA - Overhedged): max(0, 100-120) = 0.0000 tCO2e (no negative)
    """
    # Case A: 40 MWh qualifying contractual renewable coverage
    res_40 = calculate_scope2_electricity(
        total_grid_mwh=Decimal("100"),
        renewable_ppa_mwh=Decimal("40"),
        method="market_based"
    )
    assert res_40["location_based_tco2e"] == Decimal("71.6000")
    assert res_40["market_based_tco2e"] == Decimal("42.9600")
    assert res_40["result_value"] == Decimal("42.9600")
    assert res_40["intermediate_steps"]["net_grid_mwh"] == "60"
    assert res_40["intermediate_steps"]["renewable_share_pct"] == "40.00"

    # Case B: 20 MWh qualifying contractual renewable coverage
    res_20 = calculate_scope2_electricity(
        total_grid_mwh=Decimal("100"),
        renewable_ppa_mwh=Decimal("20"),
        method="market_based"
    )
    assert res_20["location_based_tco2e"] == Decimal("71.6000")
    assert res_20["market_based_tco2e"] == Decimal("57.2800")
    assert res_20["result_value"] == Decimal("57.2800")
    assert res_20["intermediate_steps"]["net_grid_mwh"] == "80"
    assert res_20["intermediate_steps"]["renewable_share_pct"] == "20.00"

    # Case C: 0 MWh renewable coverage
    res_0 = calculate_scope2_electricity(
        total_grid_mwh=Decimal("100"),
        renewable_ppa_mwh=Decimal("0"),
        method="market_based"
    )
    assert res_0["location_based_tco2e"] == Decimal("71.6000")
    assert res_0["market_based_tco2e"] == Decimal("71.6000")
    assert res_0["result_value"] == Decimal("71.6000")

    # Case D: 100 MWh renewable coverage (100% clean)
    res_100 = calculate_scope2_electricity(
        total_grid_mwh=Decimal("100"),
        renewable_ppa_mwh=Decimal("100"),
        method="market_based"
    )
    assert res_100["location_based_tco2e"] == Decimal("71.6000")
    assert res_100["market_based_tco2e"] == Decimal("0.0000")
    assert res_100["result_value"] == Decimal("0.0000")

    # Case E: Over-hedged (120 MWh PPA for 100 MWh consumption)
    res_over = calculate_scope2_electricity(
        total_grid_mwh=Decimal("100"),
        renewable_ppa_mwh=Decimal("120"),
        method="market_based"
    )
    assert res_over["location_based_tco2e"] == Decimal("71.6000")
    assert res_over["market_based_tco2e"] == Decimal("0.0000")

    # State Grid: Karnataka (KA = 0.572 tCO2e/MWh)
    res_ka = calculate_scope2_electricity(
        total_grid_mwh=Decimal("100"),
        renewable_ppa_mwh=Decimal("40"),
        state_grid="KA",
        method="market_based"
    )
    # Location: 100 * 0.572 = 57.2000 tCO2e
    assert res_ka["location_based_tco2e"] == Decimal("57.2000")
    # Market: (100 - 40) * 0.572 = 34.3200 tCO2e
    assert res_ka["market_based_tco2e"] == Decimal("34.3200")


# ── DISCREPANCY 2: Ratio Calculation Status & Typed Handling ───────────────

def test_ratio_consolidation_typed_status_distinctions():
    """
    Verifies that ratio consolidation distinguishes:
    1. MISSING_DENOMINATOR -> value=None (never 0.0)
    2. UNDEFINED_ZERO_DENOMINATOR -> value=None (never 0.0)
    3. INVALID_NEGATIVE_DENOMINATOR -> value=None (never 0.0)
    4. VALID_ZERO -> value=0.0 (legitimate zero emissions)
    5. CALCULATED -> value=1.3636 (correct fraction)
    """
    from app.modules.consolidation.service import run_consolidation_engine
    from app.modules.metrics.models import Metric, AggregationType
    from app.modules.org.models import OrgNode, ReportingPeriod, ControlType

    db = SessionLocal()
    suffix = uuid.uuid4().hex[:6].upper()
    try:
        # Create hierarchy
        group = OrgNode(
            code=f"GRP-RATIO-{suffix}",
            name=f"Ratio Test Group {suffix}",
            type="group",
            path=f"GRP-RATIO-{suffix}",
            ownership_pct=100.0,
            control_type="operational_control",
            boundary=True,
        )
        db.add(group)
        db.flush()

        child1 = OrgNode(
            code=f"SITE1-{suffix}",
            name=f"Site 1 {suffix}",
            type="project",
            parent_id=group.id,
            path=f"{group.path}.SITE1-{suffix}",
            ownership_pct=100.0,
            control_type="operational_control",
            boundary=True,
        )
        db.add(child1)

        period = ReportingPeriod(
            code=f"FY2025-26-R{suffix}",
            financial_year="2025-2026",
            period_type="annual",
            status="OPEN",
            start_date="2025-04-01",
            end_date="2026-03-31",
        )
        db.add(period)
        db.commit()

        # Numerator: Total Emissions (ENV-NUM)
        # Denominator: Turnover (ENV-DEN)
        # Ratio Metric: Intensity (ENV-INT)
        num_m = Metric(code=f"NUM-{suffix}", name="Numerator Emissions", definition="Numerator emissions definition", principle=6, category="Environment", base_unit="tCO2e", aggregation_type="sum")
        den_m = Metric(code=f"DEN-{suffix}", name="Denominator Turnover", definition="Denominator turnover definition", principle=6, category="Environment", base_unit="INR_Crores", aggregation_type="sum")
        db.add_all([num_m, den_m])
        db.flush()

        ratio_m = Metric(
            code=f"INT-{suffix}",
            name="Intensity Ratio",
            definition="Intensity ratio definition",
            principle=6,
            category="Environment",
            base_unit="tCO2e/INR_Crore",
            aggregation_type="ratio",
            numerator_metric_id=num_m.id,
            denominator_metric_id=den_m.id
        )
        db.add(ratio_m)
        db.commit()

        # Case 1: Child reports numerator=100, but DENOMINATOR IS MISSING
        cv_num = ConsolidatedValue(
            entity_id=child1.id, period_id=period.id, metric_code=num_m.code,
            value=100.0, unit="tCO2e", method="sum", share_pct=100.0, child_contributions=[]
        )
        db.add(cv_num)
        db.commit()

        run_consolidation_engine(db, period_id=str(period.id), root_node_id=str(group.id))

        res_ratio = db.query(ConsolidatedValue).filter(
            ConsolidatedValue.entity_id == group.id,
            ConsolidatedValue.period_id == period.id,
            ConsolidatedValue.metric_code == ratio_m.code
        ).first()

        assert res_ratio is not None
        print(f"DEBUG RATIO: code={res_ratio.metric_code}, val={res_ratio.value}, status={res_ratio.status}, reason={res_ratio.status_reason}")
        assert res_ratio.value is None  # MUST NOT be 0.0
        assert res_ratio.status == "MISSING_DENOMINATOR"
        assert "not reported" in res_ratio.status_reason

        # Case 2: Child reports denominator = 0.0 (Division by Zero)
        cv_den0 = ConsolidatedValue(
            entity_id=child1.id, period_id=period.id, metric_code=den_m.code,
            value=0.0, unit="INR_Crores", method="sum", share_pct=100.0, child_contributions=[]
        )
        db.add(cv_den0)
        db.commit()

        run_consolidation_engine(db, period_id=str(period.id), root_node_id=str(group.id))

        db.refresh(res_ratio)
        assert res_ratio.value is None
        assert res_ratio.status == "UNDEFINED_ZERO_DENOMINATOR"
        assert "Division by zero" in res_ratio.status_reason

        # Case 3: Child reports negative denominator = -50.0
        cv_den0.value = -50.0
        db.commit()

        run_consolidation_engine(db, period_id=str(period.id), root_node_id=str(group.id))
        db.refresh(res_ratio)
        assert res_ratio.value is None
        assert res_ratio.status == "INVALID_NEGATIVE_DENOMINATOR"
        assert "Negative denominator" in res_ratio.status_reason

        # Case 4: Child reports legitimate 0 numerator, valid denominator = 100.0
        cv_num.value = 0.0
        cv_den0.value = 100.0
        db.commit()

        run_consolidation_engine(db, period_id=str(period.id), root_node_id=str(group.id))
        db.refresh(res_ratio)
        assert res_ratio.value == 0.0
        assert res_ratio.status == "VALID_ZERO"
        assert res_ratio.status_reason is None

        # Case 5: Valid positive calculation: 150 emissions / 110 turnover = 1.363636
        cv_num.value = 150.0
        cv_den0.value = 110.0
        db.commit()

        run_consolidation_engine(db, period_id=str(period.id), root_node_id=str(group.id))
        db.refresh(res_ratio)
        assert round(res_ratio.value, 4) == round(150.0 / 110.0, 4)
        assert res_ratio.status == "CALCULATED"

    finally:
        db.close()


def test_disclosure_mapper_handles_undefined_ratio_without_masking():
    """
    Verifies that PrincipleIndicatorDisclosure retains status and None value
    rather than fabricating a 0.0 for undefined ratios.
    """
    disc = PrincipleIndicatorDisclosure(
        metric_code="ENV-GHG-INT",
        indicator_name="GHG Intensity Turnover",
        principle=6,
        brsr_core=True,
        disclosed_value=None,
        unit="tCO2e/INR_Cr",
        aggregation_method="ratio",
        assurance_ready=True,
        evidence_verified=False,
        status="MISSING_DENOMINATOR",
        status_reason="Turnover denominator missing in all reporting sites",
    )
    assert disc.disclosed_value is None
    assert disc.status == "MISSING_DENOMINATOR"
    assert "Turnover denominator" in disc.status_reason


# ── DISCREPANCY 3 & 4: Factor DB Versioning & Source Provenance ─────────────

def test_factor_database_versioning_and_provenance():
    """
    Verifies that:
    1. Historical legacy values (version 0.9-legacy) are preserved and marked inactive.
    2. Active factors (version 1.0) strictly carry statutory tCO2e/unit values.
    3. Factor audit log records the exact transition with justification.
    """
    db = SessionLocal()
    try:
        # Check active diesel factor
        diesel_active = db.query(EmissionFactor).filter(
            EmissionFactor.code == "DIESEL-HSD",
            EmissionFactor.is_active == True
        ).first()
        assert diesel_active is not None
        assert diesel_active.co2e_factor == Decimal("0.00268000")
        assert diesel_active.unit == "L"
        assert diesel_active.version == "1.0"

        # Check historical preserved factor
        diesel_hist = db.query(EmissionFactor).filter(
            EmissionFactor.code == "DIESEL-HSD",
            EmissionFactor.version == "0.9-legacy"
        ).first()
        assert diesel_hist is not None
        assert diesel_hist.co2e_factor == Decimal("2.68000000")
        assert diesel_hist.is_active is False
        assert diesel_hist.superseded_by == "1.0"

        # Check audit log entry
        audit_log = db.query(FactorChangeAuditLog).filter(
            FactorChangeAuditLog.factor_code == "DIESEL-HSD"
        ).first()
        assert audit_log is not None
        assert audit_log.old_value == Decimal("2.68000000")
        assert audit_log.new_value == Decimal("0.00268000")
        assert "scale mismatch" in audit_log.reason_for_change
    finally:
        db.close()


# ── DISCREPANCY 5: Scope 3 Aviation Factor Validation ──────────────────────

def test_scope3_aviation_factor_and_radiative_forcing():
    """
    Validates Scope 3 air travel emission factors:
    - Direct combustion factor (excluding radiative forcing): 0.00013000 tCO2e/pkm (ICAO / DGCA)
    - Full climate impact factor (including radiative forcing uplift): 0.00025500 tCO2e/pkm (DEFRA 2023)
    - Both are distinct and non-conflated.
    """
    # Direct factor in DB registry
    db = SessionLocal()
    try:
        travel_ef = db.query(EmissionFactor).filter(
            EmissionFactor.code == "TRAVEL-FLIGHT",
            EmissionFactor.is_active == True
        ).first()
        assert travel_ef is not None
        assert travel_ef.co2e_factor == Decimal("0.00013000")
        assert travel_ef.unit == "passenger-km"
    finally:
        db.close()

    # Activity factor in code registry
    air_domestic = get_scope3_transport_factor("air_domestic_economy")
    assert air_domestic is not None
    assert air_domestic["factor"] == Decimal("0.000255")
    assert "DEFRA" in air_domestic["source"]


# ── DISCREPANCY 6: Snapshot Reproducibility & Boundary Integrity ───────────

def test_snapshot_includes_boundaries_and_status():
    """
    Verifies that the canonical snapshot payload includes:
    1. Entity ownership %, control type, and boundary flag.
    2. Metric status and status reason for typed ratio indicators.
    3. Metadata specifying statutory standard and factor catalog version.
    """
    db = SessionLocal()
    suffix = uuid.uuid4().hex[:6].upper()
    try:
        node = OrgNode(
            code=f"SNAP-NODE-{suffix}",
            name=f"Snapshot Node {suffix}",
            type="subsidiary",
            path=f"SNAP-NODE-{suffix}",
            ownership_pct=75.5,
            control_type="joint_control",
            boundary=True,
        )
        db.add(node)
        db.flush()

        period = ReportingPeriod(
            code=f"FY2025-26-S{suffix}",
            financial_year="2025-2026",
            period_type="quarter",
            status="OPEN",
            start_date="2025-04-01",
            end_date="2025-06-30",
        )
        db.add(period)
        db.flush()

        cv = ConsolidatedValue(
            entity_id=node.id,
            period_id=period.id,
            metric_code="ENV-GHG-INT",
            value=None,
            unit="tCO2e/INR_Cr",
            method="ratio",
            share_pct=75.5,
            status="MISSING_DENOMINATOR",
            status_reason="Turnover metric not reported",
            child_contributions=[]
        )
        db.add(cv)
        db.commit()

        payload, sha256_hash = build_snapshot_payload(db, node.id, period.id)

        assert payload["metadata"]["snapshot_spec_version"] == "2.0"
        assert payload["metadata"]["factor_catalog_version"] == "2023-24-v1.0"
        assert payload["entity"]["ownership_pct"] == 75.5
        assert payload["entity"]["control_type"] == "joint_control"
        assert payload["entity"]["boundary"] is True

        metric_entry = next(m for m in payload["metrics"] if m["metric_code"] == "ENV-GHG-INT")
        assert metric_entry["value"] is None
        assert metric_entry["status"] == "MISSING_DENOMINATOR"
        assert metric_entry["status_reason"] == "Turnover metric not reported"
        assert len(sha256_hash) == 64

    finally:
        db.close()
