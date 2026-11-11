"""
tests/unit/modules/test_calc_formulas.py
Comprehensive mathematical and dimensional unit tests for all ESG calculation formulas
compliant with SEBI BRSR Core, GHG Protocol, CEA, and BEE PAT standards.
"""
import pytest
from decimal import Decimal
from app.modules.calc.units import convert_unit, normalize_unit, Dimension, get_unit_dimension
from app.modules.calc.formulas.scope1 import (
    calculate_scope1_stationary_combustion,
    calculate_scope1_mobile_combustion,
)
from app.modules.calc.formulas.scope2 import (
    calculate_scope2_electricity,
    calculate_scope2_grid_electricity,
    calculate_scope2_renewable_electricity,
)
from app.modules.calc.formulas.scope3 import (
    calculate_scope3_business_travel,
    calculate_scope3_employee_commuting,
    calculate_scope3_waste,
)
from app.modules.calc.formulas.energy import calculate_total_energy
from app.modules.calc.formulas.intensity import (
    calculate_energy_intensity,
    calculate_ghg_intensity,
)
from app.modules.calc.formulas.safety import (
    calculate_ltifr,
    calculate_fatality_rate,
)


# ── 1. Unit Normalization & Conversion Engine ──────────────────────────────

def test_unit_normalization():
    assert normalize_unit("kL") == "kl"
    assert normalize_unit("  Litres ") == "litres"
    assert normalize_unit("Metric Tonnes") == "t"
    assert normalize_unit("passenger-km") == "passenger-km"


def test_volume_conversions():
    # 1 kL = 1000 Litres
    assert convert_unit(Decimal("1.5"), "kl", "litres") == Decimal("1500.0")
    # Reverse: 1000 Litres = 1 kL
    assert convert_unit(Decimal("1000"), "litres", "kl") == Decimal("1.0")
    # 1 m3 = 1000 Litres
    assert convert_unit(Decimal("2.0"), "m3", "litres") == Decimal("2000.0")


def test_energy_conversions():
    # 1 MWh = 1000 kWh
    assert convert_unit(Decimal("5"), "mwh", "kwh") == Decimal("5000.0")
    assert convert_unit(Decimal("5000"), "kwh", "mwh") == Decimal("5.0")
    # 1 MWh = 3.6 GJ
    assert convert_unit(Decimal("10"), "mwh", "gj") == Decimal("36.0")


def test_mass_conversions():
    # 1 MT = 1000 kg
    assert convert_unit(Decimal("2.5"), "mt", "kg") == Decimal("2500.0")
    assert convert_unit(Decimal("3000"), "kg", "t") == Decimal("3.0")


def test_incompatible_unit_dimension_rejected():
    # Volume to Energy without fuel context must fail explicitly
    with pytest.raises(ValueError, match="Incompatible unit dimensions"):
        convert_unit(Decimal("100"), "litres", "mwh")


# ── 2. Scope 1 Stationary & Mobile Combustion ──────────────────────────────

def test_scope1_diesel_stationary_combustion():
    # BEE PAT / MoPNG: HSD diesel factor = 0.00268 tCO2e/L, NCV = 0.03576 GJ/L
    res = calculate_scope1_stationary_combustion(
        fuel_type="diesel",
        quantity=Decimal("10000"),
        input_unit="litres",
    )
    assert res["formula_code"] == "CALC-GHG-SCOPE1"
    # 10,000 L * 0.00268 = 26.8 tCO2e
    assert res["result_value"] == Decimal("26.8000")
    assert res["result_unit"] == "tCO2e"
    assert res["intermediate_steps"]["normalized_quantity"] == "10000"


def test_scope1_diesel_input_in_kl():
    # Testing unit normalization: 10 kL should automatically normalize to 10,000 L
    res = calculate_scope1_stationary_combustion(
        fuel_type="diesel",
        quantity=Decimal("10"),
        input_unit="kl",
    )
    assert res["result_value"] == Decimal("26.8000")


def test_scope1_unknown_fuel_raises_error():
    with pytest.raises(ValueError, match="Unknown fuel type"):
        calculate_scope1_stationary_combustion(
            fuel_type="unobtainium_fuel",
            quantity=Decimal("100"),
            input_unit="litres",
        )


def test_scope1_mobile_combustion():
    res = calculate_scope1_mobile_combustion(
        fuel_type="hsd",
        quantity=Decimal("5000"),
        input_unit="litres",
        vehicle_category="excavators",
    )
    assert res["formula_code"] == "CALC-GHG-SCOPE1-MOBILE"
    # 5,000 L * 0.00268 = 13.4 tCO2e
    assert res["result_value"] == Decimal("13.4000")


# ── 3. Scope 2 Grid & Renewable Electricity ────────────────────────────────

def test_scope2_location_based_electricity():
    # CEA Baseline weighted avg: 0.716 tCO2e/MWh
    # Under GHG Protocol Scope 2 Guidance:
    # Location-based: 100 MWh * 0.716 = 71.6000 tCO2e (contractual PPA is NOT deducted)
    # Market-based: (100 - 20) MWh * 0.716 = 57.2800 tCO2e (with accredited PPA deduction)
    res_loc = calculate_scope2_electricity(
        total_grid_mwh=Decimal("100"),
        renewable_ppa_mwh=Decimal("20"),
        method="location_based",
    )
    assert res_loc["formula_code"] == "CALC-GHG-SCOPE2"
    assert res_loc["location_based_tco2e"] == Decimal("71.6000")
    assert res_loc["market_based_tco2e"] == Decimal("57.2800")
    assert res_loc["result_value"] == Decimal("71.6000")
    assert res_loc["intermediate_steps"]["net_grid_mwh"] == "80"
    assert res_loc["intermediate_steps"]["renewable_share_pct"] == "20.00"

    res_mkt = calculate_scope2_electricity(
        total_grid_mwh=Decimal("100"),
        renewable_ppa_mwh=Decimal("20"),
        method="market_based",
    )
    assert res_mkt["result_value"] == Decimal("57.2800")


def test_scope2_state_specific_grid():
    # Karnataka (KA) factor: 0.572 tCO2e/MWh (high renewable penetration)
    res = calculate_scope2_grid_electricity(
        grid_mwh=Decimal("50"),
        state_grid="KA",
    )
    # 50 MWh * 0.572 = 28.6 tCO2e
    assert res["result_value"] == Decimal("28.6000")


def test_scope2_renewable_electricity_zero_rated():
    res = calculate_scope2_renewable_electricity(
        renewable_mwh=Decimal("150"),
        source_type="Solar Wheeling PPA",
    )
    assert res["result_value"] == Decimal("0.0000")
    # Avoided emissions: 150 * 0.716 = 107.4 tCO2e
    assert res["intermediate_steps"]["avoided_emissions_tco2e"] == "107.4000"


# ── 4. Energy Accounting & Aggregation ─────────────────────────────────────

def test_total_energy_aggregation():
    # 100 MWh electricity = 360 GJ
    # 10,000 L diesel * 0.03576 GJ/L = 357.6 GJ
    # Total = 717.6 GJ
    fuels = [
        {"fuel_type": "diesel", "quantity": Decimal("10000"), "unit": "litres"}
    ]
    res = calculate_total_energy(
        electricity_mwh=Decimal("100"),
        fuels=fuels,
        renewable_mwh=Decimal("25"),  # 25 MWh = 90 GJ renewable
    )
    assert res["formula_code"] == "CALC-ENERGY-TOTAL"
    assert res["result_value"] == Decimal("717.60")
    assert res["result_unit"] == "GJ"
    # Renewable share: 90 / 717.6 = 12.54%
    assert res["intermediate_steps"]["renewable_energy_share_pct"] == "12.54"


# ── 5. SEBI BRSR Core Intensity Metrics ────────────────────────────────────

def test_energy_intensity_calculation():
    # 10,000 GJ / 500 Crore INR = 20.0 GJ / Crore INR
    res = calculate_energy_intensity(
        total_energy_gj=Decimal("10000"),
        turnover_inr_crores=Decimal("500"),
    )
    assert res["formula_code"] == "CALC-INTENSITY-ENERGY"
    assert res["result_value"] == Decimal("20.0000")
    assert res["result_unit"] == "GJ/Crore INR"


def test_intensity_zero_or_negative_denominator_rejected():
    with pytest.raises(ValueError, match="Turnover must be strictly positive"):
        calculate_energy_intensity(
            total_energy_gj=Decimal("10000"),
            turnover_inr_crores=Decimal("0"),
        )
    with pytest.raises(ValueError, match="Turnover must be strictly positive"):
        calculate_ghg_intensity(
            total_emissions_tco2e=Decimal("250"),
            turnover_inr_crores=Decimal("-10"),
        )


# ── 6. Health & Safety Indicators (SEBI Principle 3 E10) ───────────────────

def test_ltifr_calculation():
    # 2 lost time injuries, 2,000,000 man hours worked
    # LTIFR = (2 * 1,000,000) / 2,000,000 = 1.0000 per million hours
    res = calculate_ltifr(
        lost_time_injuries=2,
        total_man_hours_worked=Decimal("2000000"),
    )
    assert res["formula_code"] == "CALC-SAFETY-LTIFR"
    assert res["result_value"] == Decimal("1.0000")
    assert res["result_unit"] == "per million hours"


def test_ltifr_zero_man_hours_rejected():
    with pytest.raises(ValueError, match="Total man-hours worked must be strictly positive"):
        calculate_ltifr(lost_time_injuries=1, total_man_hours_worked=Decimal("0"))


# ── 7. Scope 3 Categories ──────────────────────────────────────────────────

def test_scope3_business_travel_calculation():
    # DGCA / IPCC domestic flight: 0.000255 tCO2e/p-km
    # 2 travellers * 1000 km * 0.000255 = 0.51 tCO2e
    trips = [
        {"mode": "air_domestic_economy", "distance_km": Decimal("1000"), "passengers": 2, "round_trip": False}
    ]
    res = calculate_scope3_business_travel(trips)
    assert res["formula_code"] == "CALC-GHG-SCOPE3-TRAVEL"
    assert res["result_value"] == Decimal("0.5100")


def test_scope3_operational_waste_calculation():
    # CPCB MSW Landfill: 0.4760 tCO2e/tonne
    # 10 tonnes * 0.4760 = 4.76 tCO2e
    waste = [
        {"waste_type": "msw_landfill", "tonnes": Decimal("10")}
    ]
    res = calculate_scope3_waste(waste)
    assert res["formula_code"] == "CALC-GHG-SCOPE3-WASTE"
    assert res["result_value"] == Decimal("4.7600")

