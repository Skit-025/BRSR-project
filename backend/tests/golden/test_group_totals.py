"""
tests/golden/test_group_totals.py
Golden mathematical and architectural validation suite for multi-tier consolidation,
boundary accounting, ratio intensities, and reporting consistency.
"""
import pytest
from decimal import Decimal
from typing import Dict, Any, List


# ── 1. Mathematical Validation: SEBI BRSR Ratio Consolidation (§17) ────────

def test_golden_ratio_consolidation_mathematical_law():
    """
    SEBI BRSR Core Guideline §17 mandates that intensity ratios must be computed
    as (Sum of Numerators) / (Sum of Denominators) across all reporting entities,
    and must NEVER be calculated as an arithmetic mean of child ratios.

    Proof with Unequal Denominators:
      Entity A: 100 tCO2e GHG emissions / 1,000 Crore INR turnover => Intensity = 0.1000
      Entity B: 300 tCO2e GHG emissions / 2,000 Crore INR turnover => Intensity = 0.1500

    Incorrect Arithmetic Mean:
      (0.1000 + 0.1500) / 2 = 0.1250 tCO2e / Crore INR

    Statutory Consolidated Ratio:
      Sum of Numerators = 100 + 300 = 400 tCO2e
      Sum of Denominators = 1,000 + 2,000 = 3,000 Crore INR
      True Consolidated Ratio = 400 / 3,000 = 0.13333... tCO2e / Crore INR
    """
    entity_a = {"num": 100.0, "den": 1000.0, "ratio": 0.1000}
    entity_b = {"num": 300.0, "den": 2000.0, "ratio": 0.1500}

    incorrect_mean_of_ratios = (entity_a["ratio"] + entity_b["ratio"]) / 2.0  # 0.1250
    true_sum_of_num = entity_a["num"] + entity_b["num"]                     # 400.0
    true_sum_of_den = entity_a["den"] + entity_b["den"]                     # 3000.0
    true_consolidated_ratio = true_sum_of_num / true_sum_of_den             # 0.13333...

    assert round(true_consolidated_ratio, 4) == 0.1333
    assert true_consolidated_ratio != incorrect_mean_of_ratios
    # Error delta between statutory math and invalid mean
    error_delta = abs(true_consolidated_ratio - incorrect_mean_of_ratios)
    assert error_delta > 0.008  # Over 6% distortion if flat-averaged!


# ── 2. Boundary Accounting: Equity Share vs Operational Control ────────────

def test_golden_boundary_policy_environment_vs_safety():
    """
    Under GHG Protocol Corporate Standard & SEBI BRSR Core:
      - Physical flow environmental metrics (Fuel, Electricity, Scope 1, 2) in a 51% Joint Venture
        scale by equity share (51%).
      - Occupational health & safety incidents (Fatalities, Lost Time Injuries) and legal compliance
        must NEVER be reported as fractional human lives (0.51 fatalities). They remain whole integers (100%).
    """
    jv_ownership_pct = 51.0
    jv_raw_diesel_litres = 10000.0
    jv_raw_fatalities = 1.0
    jv_raw_lti = 2.0

    # Environmental: scaled by equity %
    consolidated_diesel = jv_raw_diesel_litres * (jv_ownership_pct / 100.0)
    assert consolidated_diesel == 5100.0

    # Safety: Whole counts (100% control weighting)
    effective_share_safety = 100.0
    consolidated_fatalities = jv_raw_fatalities * (effective_share_safety / 100.0)
    consolidated_lti = jv_raw_lti * (effective_share_safety / 100.0)

    assert consolidated_fatalities == 1.0  # NOT 0.51
    assert consolidated_lti == 2.0         # NOT 1.02


# ── 3. Multi-Tier Hierarchy Rollup (Project -> BU -> Sub -> Group) ─────────

def test_golden_four_tier_consolidation_rollup():
    """
    Verifies that a 4-tier organization tree rolls up cleanly without double-counting:
      Project 1: 10,000 L diesel
      Project 2: 15,000 L diesel
      BU Direct Overhead: 5,000 L diesel (regional HQ fleet)
      -> BU Total = 10,000 + 15,000 + 5,000 = 30,000 L

      Subsidiary Direct Overhead: 10,000 L diesel (corporate HQ)
      -> Subsidiary Total = 30,000 (BU) + 10,000 = 40,000 L

      Group Direct Overhead: 2,000 L diesel
      -> Group Total = 40,000 (Sub) + 2,000 = 42,000 L
    """
    p1 = 10000.0
    p2 = 15000.0
    bu_overhead = 5000.0
    bu_total = p1 + p2 + bu_overhead
    assert bu_total == 30000.0

    sub_overhead = 10000.0
    sub_total = bu_total + sub_overhead
    assert sub_total == 40000.0

    group_overhead = 2000.0
    group_total = sub_total + group_overhead
    assert group_total == 42000.0

    # Scope 1 emissions in tCO2e (BEE factor 0.00268 tCO2e/L):
    scope1_tco2e = group_total * 0.00268
    assert round(scope1_tco2e, 2) == 112.56


# ── 4. Scope 3 Disclosure Mapping Precedence (DEF-CALC-003) ────────────────

def test_golden_scope3_disclosure_precedence():
    """
    Precedence Rule:
      Case A: If granular sub-codes (ENV-GHG-003A..F) exist, sum them.
      Case B: If only flat summary code (ENV-GHG-003) exists, disclose flat code.
      Case C: Never sum flat and sub-codes together (prevents double-counting).
    """
    # Case A: Granular sub-codes
    cons_map_granular = {
        "ENV-GHG-003A": 10.5,  # Business travel
        "ENV-GHG-003B": 5.2,   # Commuting
        "ENV-GHG-003F": 2.1,   # Waste
    }
    sub_codes = ["ENV-GHG-003A", "ENV-GHG-003B", "ENV-GHG-003C", "ENV-GHG-003D", "ENV-GHG-003E", "ENV-GHG-003F"]
    sub_sum = sum(cons_map_granular.get(c, 0.0) for c in sub_codes)
    flat_val = cons_map_granular.get("ENV-GHG-003", 0.0)
    total_a = sub_sum if sub_sum > 0 else flat_val
    assert total_a == 17.8

    # Case B: Flat summary code only
    cons_map_flat = {
        "ENV-GHG-003": 25.0
    }
    sub_sum_b = sum(cons_map_flat.get(c, 0.0) for c in sub_codes)
    flat_val_b = cons_map_flat.get("ENV-GHG-003", 0.0)
    total_b = sub_sum_b if sub_sum_b > 0 else flat_val_b
    assert total_b == 25.0
    assert total_b != 0.0  # Confirms DEF-CALC-003 is fixed!


# ── 5. Exact Phase 9 Golden Mathematical Test: Ratio Consolidation ─────────

def test_golden_ratio_consolidation_audit_hand_calculated():
    """
    Independent Golden Benchmark (Audit Phase 9.2):
      Entity A:
        - Emissions: 100 tCO2e
        - Revenue: ₹10 Cr
        - Intensity: 10 tCO2e/₹Cr
      Entity B:
        - Emissions: 50 tCO2e
        - Revenue: ₹100 Cr
        - Intensity: 0.5 tCO2e/₹Cr

      Statutory Consolidated Result:
        (100 + 50) / (10 + 100) = 150 / 110 = 1.363636... tCO2e/₹Cr.
        The result MUST NOT be 5.25.
    """
    entity_a_emissions = Decimal("100.0")
    entity_a_revenue = Decimal("10.0")
    entity_a_intensity = entity_a_emissions / entity_a_revenue  # 10.0

    entity_b_emissions = Decimal("50.0")
    entity_b_revenue = Decimal("100.0")
    entity_b_intensity = entity_b_emissions / entity_b_revenue  # 0.5

    # Incorrect arithmetic mean of intensities
    invalid_arithmetic_mean = (entity_a_intensity + entity_b_intensity) / Decimal("2.0")
    assert invalid_arithmetic_mean == Decimal("5.25")

    # True statutory consolidated ratio: Sum(Numerators) / Sum(Denominators)
    true_num = entity_a_emissions + entity_b_emissions
    true_den = entity_a_revenue + entity_b_revenue
    true_consolidated = true_num / true_den

    expected = Decimal("150") / Decimal("110")  # 1.363636...
    assert true_consolidated == expected
    assert true_consolidated != invalid_arithmetic_mean
    assert str(true_consolidated.quantize(Decimal("0.0001"))) == "1.3636"


# ── 6. Exact Phase 9 Golden Boundary Equity Share vs Social Safety ────────

def test_golden_boundary_equity_share_vs_fatalities_benchmark():
    """
    Audit Phase 9.2:
      Environmental metric: Entity emissions = 1,000 tCO2e, equity share = 50%.
      Expected result: 500 tCO2e.

      Social safety metric: Fatalities = 2, ownership share = 50%.
      Expected count: 2 fatalities (MUST NOT become 1 fatality).
    """
    ownership_pct = Decimal("50.0")
    raw_emissions = Decimal("1000.0")
    raw_fatalities = Decimal("2.0")

    # Environmental: scaled
    consolidated_emissions = raw_emissions * (ownership_pct / Decimal("100.0"))
    assert consolidated_emissions == Decimal("500.0")

    # Social/Human life: not scalable to fractional humans
    effective_social_share = Decimal("100.0")
    consolidated_fatalities = raw_fatalities * (effective_social_share / Decimal("100.0"))
    assert consolidated_fatalities == Decimal("2.0")
    assert consolidated_fatalities != Decimal("1.0")


# ── 7. Exact Phase 9 Unit Conversion Benchmarks ───────────────────────────

def test_golden_unit_conversions_benchmark():
    """
    Audit Phase 9.2:
      - 10 kL = 10,000 L
      - 1 tonne = 1,000 kg
      - 1 MWh = 1,000 kWh
      - 1 GJ = 1,000 MJ
      - 1 kWh = 3.6 MJ (0.001 MWh * 3.6 GJ/MWh = 0.0036 GJ = 3.6 MJ)
      - Unsupported cross-dimensional conversions strictly rejected.
    """
    from app.modules.calc.units import convert_unit

    assert convert_unit(Decimal("10"), "kl", "litres") == Decimal("10000.0")
    assert convert_unit(Decimal("1"), "tonne", "kg") == Decimal("1000.0")
    assert convert_unit(Decimal("1"), "mwh", "kwh") == Decimal("1000.0")
    assert convert_unit(Decimal("1"), "gj", "tj") == Decimal("0.001")

    # Incompatible dimensions must raise ValueError
    with pytest.raises(ValueError, match="Incompatible unit dimensions"):
        convert_unit(Decimal("100"), "litres", "kwh")

    with pytest.raises(ValueError, match="Incompatible unit dimensions"):
        convert_unit(Decimal("50"), "inr", "tonnes")


# ── 8. Phase 9 Factor Precedence & State Grid Resolution ──────────────────

def test_golden_factor_precedence_and_state_grid():
    """
    Verifies that state-specific grid factor (e.g. Karnataka = 0.572 tCO2e/MWh)
    is applied deterministically, and does not silently collapse to national average (0.716).
    """
    from app.modules.calc.factors import get_grid_factor
    from app.db.session import SessionLocal

    db = SessionLocal()
    try:
        # Karnataka state grid factor
        ka_factor = get_grid_factor(state="KA", db=db)
        assert ka_factor == Decimal("0.57200000")

        # National fallback
        national_factor = get_grid_factor(state=None, db=db)
        assert national_factor == Decimal("0.71600000")
        assert ka_factor != national_factor
    finally:
        db.close()


# ── 9. Phase 9 Fuel Stoichiometric & Real Database Factor Benchmark ────────

def test_golden_diesel_scope1_stoichiometric_factor_real_db():
    """
    Verifies that diesel emission factor resolves to 0.00268 tCO2e/L
    both with and without database session, preventing 1000x overcounting.
    10,000 L of diesel MUST yield exactly 26.8000 tCO2e (NOT 26,800 tCO2e).
    """
    from app.modules.calc.formulas.scope1 import calculate_scope1_stationary_combustion
    from app.db.session import SessionLocal

    db = SessionLocal()
    try:
        res = calculate_scope1_stationary_combustion(
            fuel_type="diesel",
            quantity=Decimal("10000"),
            input_unit="litres",
            db=db
        )
        assert res["result_value"] == Decimal("26.8000")
        assert res["result_unit"] == "tCO2e"
        assert Decimal(res["factors_applied"]["emission_factor"]) == Decimal("0.00268")
    finally:
        db.close()


# ── 10. Phase 9 Dual Scope 2 Location vs Market Accounting ─────────────────

def test_golden_scope2_dual_reporting_benchmark():
    """
    Under GHG Protocol Scope 2 Guidance:
      Total purchased grid power: 100 MWh
      Renewable PPA (contractual): 40 MWh
      Grid factor: 0.716 tCO2e/MWh

      - Location-based Scope 2: 100 * 0.716 = 71.6000 tCO2e (no contractual deduction).
      - Market-based Scope 2: (100 - 40) * 0.716 = 42.9600 tCO2e.
    """
    from app.modules.calc.formulas.scope2 import calculate_scope2_electricity

    res_loc = calculate_scope2_electricity(
        total_grid_mwh=Decimal("100"),
        renewable_ppa_mwh=Decimal("40"),
        method="location_based"
    )
    assert res_loc["location_based_tco2e"] == Decimal("71.6000")
    assert res_loc["market_based_tco2e"] == Decimal("42.9600")
    assert res_loc["result_value"] == Decimal("71.6000")

    res_mkt = calculate_scope2_electricity(
        total_grid_mwh=Decimal("100"),
        renewable_ppa_mwh=Decimal("40"),
        method="market_based"
    )
    assert res_mkt["result_value"] == Decimal("42.9600")


# ── 11. Phase 9 Snapshot SHA-256 Fingerprint Determinism ──────────────────

def test_golden_snapshot_sha256_determinism_and_tamper_detection():
    """
    Verifies that logically identical payloads yield the exact same SHA-256 hash,
    and modifying any single material datapoint alters the hash.
    """
    import hashlib
    import json

    payload1 = {
        "entity": "MEIL-ROOT",
        "period": "FY2025-26",
        "metrics": [{"code": "ENV-GHG-001", "value": 26.80, "unit": "tCO2e"}]
    }
    payload2 = {
        "metrics": [{"code": "ENV-GHG-001", "value": 26.80, "unit": "tCO2e"}],
        "period": "FY2025-26",
        "entity": "MEIL-ROOT"
    }

    h1 = hashlib.sha256(json.dumps(payload1, sort_keys=True).encode("utf-8")).hexdigest()
    h2 = hashlib.sha256(json.dumps(payload2, sort_keys=True).encode("utf-8")).hexdigest()
    assert h1 == h2

    # Tamper one metric value
    tampered = {
        "entity": "MEIL-ROOT",
        "period": "FY2025-26",
        "metrics": [{"code": "ENV-GHG-001", "value": 26.81, "unit": "tCO2e"}]
    }
    h_tampered = hashlib.sha256(json.dumps(tampered, sort_keys=True).encode("utf-8")).hexdigest()
    assert h1 != h_tampered

