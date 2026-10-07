"""
app/modules/calc/factors.py
Statutory Emission Factors and Calorific Values.

PRIMARY SOURCES (Indian Regulatory Context — per Director's Brief):
  - CEA: Central Electricity Authority CO₂ Baseline Database for Indian Power Sector (Ver 17/18–19/20)
  - MoPNG: Ministry of Petroleum and Natural Gas / PPAC calorific values
  - BEE: Bureau of Energy Efficiency (PAT Scheme Emission Factors)
  - MoEFCC: Ministry of Environment, Forest and Climate Change (India GWP & IPCC AR4 India Annex)
  - IPCC 2006 Guidelines used ONLY where Indian-specific factors are unavailable.
"""
from decimal import Decimal
from typing import Dict, Any, Optional

# ---------------------------------------------------------------------------
# CEA Grid Emission Factors (tCO2e per MWh)
# CEA CO2 Baseline Database for the Indian Power Sector (Ver. 17/18 & 19/20)
# Used for Scope 2 location-based calculation
# ---------------------------------------------------------------------------
GRID_EMISSION_FACTOR_CEA_WEIGHTED_AVG = Decimal("0.716")   # tCO2e/MWh – national weighted average
GRID_EMISSION_FACTOR_RENEWABLE = Decimal("0.0")            # Solar / Wind / Hydro / REC-backed PPAs

# State-specific grid emission factors (CEA Table 4 — optional granularity)
# Key = State code, Value = tCO2e/MWh
STATE_GRID_FACTORS: Dict[str, Decimal] = {
    "AP":  Decimal("0.813"),   # Andhra Pradesh / Telangana
    "TG":  Decimal("0.813"),
    "KA":  Decimal("0.572"),   # Karnataka (high renewable share)
    "MH":  Decimal("0.751"),   # Maharashtra
    "GJ":  Decimal("0.742"),   # Gujarat
    "RJ":  Decimal("0.677"),   # Rajasthan
    "UP":  Decimal("0.941"),   # Uttar Pradesh (coal-heavy)
    "MP":  Decimal("0.918"),   # Madhya Pradesh
    "OR":  Decimal("0.953"),   # Odisha
    "WB":  Decimal("0.881"),   # West Bengal
    "TN":  Decimal("0.601"),   # Tamil Nadu (high wind/solar)
    "KL":  Decimal("0.481"),   # Kerala (hydro-dominant)
    "HR":  Decimal("0.924"),   # Haryana
    "PB":  Decimal("0.895"),   # Punjab
    "DL":  Decimal("0.785"),   # Delhi
    "JH":  Decimal("0.947"),   # Jharkhand
}

# ---------------------------------------------------------------------------
# Fuel Emission Factors — Indian Primary Sources
# ---------------------------------------------------------------------------
# Legacy dict kept intact (backward compat). Extended below with Indian grades.
FUEL_EMISSION_FACTORS: Dict[str, Dict[str, Any]] = {
    # ── Diesel Grades (MoPNG / PPAC) ─────────────────────────────────────
    # High Speed Diesel (HSD) — standard grade used in DG sets, trucks, JCBs
    "diesel": {
        "unit": "litres",
        "factor": Decimal("0.00268"),            # tCO2e/litre (2.68 kgCO2e/L)
        "net_calorific_value_gj_per_unit": Decimal("0.03576"),
        "source": "BEE PAT Manual 2023 / MoPNG PPAC",
        "indian_grade": "HSD (IS-1460)",
    },
    "hsd": {   # Alias — same as diesel
        "unit": "litres",
        "factor": Decimal("0.00268"),
        "net_calorific_value_gj_per_unit": Decimal("0.03576"),
        "source": "BEE PAT Manual 2023 / MoPNG PPAC",
        "indian_grade": "HSD (IS-1460)",
    },
    # Light Diesel Oil (LDO) — used in industrial furnaces
    "ldo": {
        "unit": "litres",
        "factor": Decimal("0.00291"),            # tCO2e/litre
        "net_calorific_value_gj_per_unit": Decimal("0.03624"),
        "source": "BEE PAT Manual 2023",
        "indian_grade": "LDO (IS-15770)",
    },
    # ── Petrol / Gasoline ─────────────────────────────────────────────────
    "petrol": {
        "unit": "litres",
        "factor": Decimal("0.00231"),            # tCO2e/litre
        "net_calorific_value_gj_per_unit": Decimal("0.03276"),
        "source": "BEE PAT Manual 2023 / MoPNG PPAC",
        "indian_grade": "MS (Motor Spirit IS-2796)",
    },
    # ── Liquefied Petroleum Gas ───────────────────────────────────────────
    "lpg": {
        "unit": "kg",
        "factor": Decimal("0.00298"),            # tCO2e/kg
        "net_calorific_value_gj_per_unit": Decimal("0.04731"),
        "source": "BEE PAT Manual 2023 / MoPNG PPAC",
        "indian_grade": "LPG (IS-4576)",
    },
    # ── Natural Gas Variants (MoPNG/PPAC) ─────────────────────────────────
    "natural_gas": {
        "unit": "scm",                           # Standard Cubic Metres
        "factor": Decimal("0.00193"),            # tCO2e/SCM
        "net_calorific_value_gj_per_unit": Decimal("0.03850"),
        "source": "MoPNG PPAC / CEA 2023",
        "indian_grade": "PNG (R-LNG/APM gas mix)",
    },
    "png": {   # Alias for piped natural gas
        "unit": "scm",
        "factor": Decimal("0.00193"),
        "net_calorific_value_gj_per_unit": Decimal("0.03850"),
        "source": "MoPNG PPAC / CEA 2023",
        "indian_grade": "PNG",
    },
    "cng": {
        "unit": "kg",
        "factor": Decimal("0.00221"),            # tCO2e/kg — MoPNG updated (not DEFRA)
        "net_calorific_value_gj_per_unit": Decimal("0.04800"),
        "source": "MoPNG PPAC 2023 / MoEFCC",
        "indian_grade": "CNG (IS-15989)",
    },
    "gas_cng": {
        "unit": "kg",
        "factor": Decimal("0.00221"),
        "net_calorific_value_gj_per_unit": Decimal("0.04800"),
        "source": "MoPNG PPAC 2023 / MoEFCC",
        "indian_grade": "CNG (IS-15989)",
    },
    "gas_png": {
        "unit": "scm",
        "factor": Decimal("0.00203"),
        "net_calorific_value_gj_per_unit": Decimal("0.03850"),
        "source": "MoPNG PPAC 2023 / CEA",
        "indian_grade": "PNG (R-LNG/APM)",
    },
    "gas_lpg": {
        "unit": "kg",
        "factor": Decimal("0.00298"),
        "net_calorific_value_gj_per_unit": Decimal("0.04731"),
        "source": "BEE PAT Manual 2023 / MoPNG PPAC",
        "indian_grade": "LPG (IS-4576)",
    },
    "diesel_hsd": {
        "unit": "litres",
        "factor": Decimal("0.00268"),
        "net_calorific_value_gj_per_unit": Decimal("0.03576"),
        "source": "BEE PAT Manual 2023 / MoPNG PPAC",
        "indian_grade": "HSD (IS-1460)",
    },
    "diesel_ldo": {
        "unit": "litres",
        "factor": Decimal("0.00260"),
        "net_calorific_value_gj_per_unit": Decimal("0.03624"),
        "source": "BEE PAT Manual 2023",
        "indian_grade": "LDO (IS-15770)",
    },
    # ── Coal Grades (CEA / Ministry of Coal / MoEFCC) ────────────────────
    "coal": {
        "unit": "mt",
        "factor": Decimal("1.85"),               # Bituminous default (backward compat)
        "net_calorific_value_gj_per_unit": Decimal("18.8"),
        "source": "CEA / Ministry of Coal 2023",
        "indian_grade": "Bituminous (Grade D/E)",
    },
    "coal_ant": {
        "unit": "mt",
        "factor": Decimal("2.62"),               # tCO2e/MT (2.62 kgCO2e/kg)
        "net_calorific_value_gj_per_unit": Decimal("28.00"),
        "source": "MoEFCC / IPCC AR4 India — Anthracite",
        "indian_grade": "Anthracite Coal (High Rank)",
    },
    "anthracite": {
        "unit": "mt",
        "factor": Decimal("2.62"),
        "net_calorific_value_gj_per_unit": Decimal("28.00"),
        "source": "MoEFCC / IPCC AR4 India — Anthracite",
        "indian_grade": "Anthracite Coal (High Rank)",
    },
    "coal_bit": {
        "unit": "mt",
        "factor": Decimal("2.35"),               # tCO2e/MT (2.35 kgCO2e/kg)
        "net_calorific_value_gj_per_unit": Decimal("20.50"),
        "source": "MoEFCC / CEA 2023 — Bituminous",
        "indian_grade": "Bituminous Coal (IS-11893)",
    },
    "coal_bituminous": {
        "unit": "mt",
        "factor": Decimal("2.35"),               # tCO2e/MT
        "net_calorific_value_gj_per_unit": Decimal("20.50"),
        "source": "MoEFCC / CEA 2023 — Bituminous",
        "indian_grade": "Bituminous Coal (IS-11893)",
    },
    "coal_grade_a": {                            # Premium grade (rare in Indian power sector)
        "unit": "mt",
        "factor": Decimal("2.12"),
        "net_calorific_value_gj_per_unit": Decimal("24.00"),
        "source": "CEA / Ministry of Coal 2023 — Grade A",
        "indian_grade": "Bituminous Coal Grade A (>6700 kcal/kg)",
    },
    "coal_grade_e": {
        "unit": "mt",
        "factor": Decimal("1.66"),               # Lower CV = lower EF per tonne
        "net_calorific_value_gj_per_unit": Decimal("14.50"),
        "source": "CEA / Ministry of Coal 2023 — Grade E",
        "indian_grade": "Non-Coking Coal Grade E (3400–4200 kcal/kg)",
    },
    "coal_grade_f": {
        "unit": "mt",
        "factor": Decimal("1.48"),
        "net_calorific_value_gj_per_unit": Decimal("12.50"),
        "source": "CEA / Ministry of Coal 2023 — Grade F",
        "indian_grade": "Non-Coking Coal Grade F (2400–3400 kcal/kg)",
    },
    "coal_lig": {
        "unit": "mt",
        "factor": Decimal("1.55"),               # tCO2e/MT (1.55 kgCO2e/kg)
        "net_calorific_value_gj_per_unit": Decimal("11.50"),
        "source": "CEA / NLC India / MoEFCC 2023",
        "indian_grade": "Lignite / Brown Coal",
    },
    "lignite": {
        "unit": "mt",
        "factor": Decimal("1.55"),               # tCO2e/MT
        "net_calorific_value_gj_per_unit": Decimal("11.50"),
        "source": "CEA / NLC India / MoEFCC 2023",
        "indian_grade": "Lignite (Tamil Nadu / Rajasthan deposits)",
    },
    # ── Heavy / Industrial Fuels ─────────────────────────────────────────
    "furnace_oil": {
        "unit": "litres",
        "factor": Decimal("0.00318"),            # tCO2e/litre
        "net_calorific_value_gj_per_unit": Decimal("0.04037"),
        "source": "BEE PAT Manual 2023 / IPCC 2006",
        "indian_grade": "Furnace Oil / Residual Fuel Oil",
    },
    "lshs": {                                    # Low Sulphur Heavy Stock
        "unit": "litres",
        "factor": Decimal("0.00314"),
        "net_calorific_value_gj_per_unit": Decimal("0.04000"),
        "source": "BEE PAT Manual 2023",
        "indian_grade": "LSHS (Low Sulphur Heavy Stock)",
    },
    "atf": {                                     # Aviation Turbine Fuel (Scope 1 air travel owned aircraft)
        "unit": "litres",
        "factor": Decimal("0.00251"),
        "net_calorific_value_gj_per_unit": Decimal("0.03490"),
        "source": "IPCC 2006 / DGCA India",
        "indian_grade": "ATF (IS-1571)",
    },
    "coal_anthracite": {
        "unit": "mt",
        "factor": Decimal("2.62"),
        "net_calorific_value_gj_per_unit": Decimal("28.00"),
        "source": "MoEFCC / IPCC AR4 India — Anthracite Coal",
        "indian_grade": "Anthracite Coal (High Rank)",
    },
    "coal_noncoking": {
        "unit": "mt",
        "factor": Decimal("1.66"),
        "net_calorific_value_gj_per_unit": Decimal("14.50"),
        "source": "CEA / Ministry of Coal 2023 — Non-Coking Grade E",
        "indian_grade": "Non-Coking Coal Grade E / Pit-Grade",
    },
    "coal_pit_grade": {
        "unit": "mt",
        "factor": Decimal("1.66"),
        "net_calorific_value_gj_per_unit": Decimal("14.50"),
        "source": "CEA / Ministry of Coal 2023 — Non-Coking Pit-Grade",
        "indian_grade": "Non-Coking Coal Grade E / Pit-Grade",
    },
    # ── Fugitive Emission Factors (AR4 GWP — MoEFCC India uses IPCC AR4) ─
    "r22": {
        "unit": "kg",
        "factor": Decimal("1.810"),
        "net_calorific_value_gj_per_unit": Decimal("0"),
        "source": "IPCC AR4 — GWP 100yr (1810) / MoEFCC India",
        "indian_grade": "HCFC-22 (Refrigerant)",
    },
    "r22_refrigerant": {
        "unit": "kg",
        "factor": Decimal("1.810"),              # tCO2e/kg (GWP: 1810)
        "net_calorific_value_gj_per_unit": Decimal("0"),
        "source": "IPCC AR4 — GWP 100yr / MoEFCC India",
        "indian_grade": "HCFC-22 (Refrigerant)",
    },
    "r32": {
        "unit": "kg",
        "factor": Decimal("0.675"),
        "net_calorific_value_gj_per_unit": Decimal("0"),
        "source": "IPCC AR4 — GWP 100yr (675) / MoEFCC India",
        "indian_grade": "HFC-32 (Refrigerant)",
    },
    "r32_refrigerant": {
        "unit": "kg",
        "factor": Decimal("0.675"),              # tCO2e/kg (GWP: 675)
        "net_calorific_value_gj_per_unit": Decimal("0"),
        "source": "IPCC AR4 / MoEFCC India",
        "indian_grade": "HFC-32 (Refrigerant)",
    },
    "r410a": {
        "unit": "kg",
        "factor": Decimal("2.088"),
        "net_calorific_value_gj_per_unit": Decimal("0"),
        "source": "IPCC AR4 — GWP 100yr (2088) / MoEFCC India",
        "indian_grade": "HFC-410A (AC Refrigerant)",
    },
    "r410a_refrigerant": {
        "unit": "kg",
        "factor": Decimal("2.088"),              # tCO2e/kg (GWP: 2088)
        "net_calorific_value_gj_per_unit": Decimal("0"),
        "source": "IPCC AR4 / MoEFCC India",
        "indian_grade": "HFC-410A (AC Refrigerant)",
    },
    "sf6": {                                     # Electrical switchgear (substations)
        "unit": "kg",
        "factor": Decimal("22.800"),             # tCO2e/kg (GWP: 22,800)
        "net_calorific_value_gj_per_unit": Decimal("0"),
        "source": "IPCC AR4 — GWP 100yr (22800) / MoEFCC India",
        "indian_grade": "SF6 (Sulphur Hexafluoride — HV Switchgear)",
    },
    "sf6_switchgear": {
        "unit": "kg",
        "factor": Decimal("22.800"),
        "net_calorific_value_gj_per_unit": Decimal("0"),
        "source": "IPCC AR4 — GWP 100yr (22800) / MoEFCC India",
        "indian_grade": "SF6 (Sulphur Hexafluoride — HV Switchgear)",
    },
}

# ---------------------------------------------------------------------------
# Scope 3 Activity-Based Emission Factors (MoEFCC / IPCC AR4 India defaults)
# ---------------------------------------------------------------------------
# Transport emission factors: tCO2e per passenger-km or tonne-km
SCOPE3_TRANSPORT_FACTORS: Dict[str, Dict[str, Any]] = {
    "air_domestic_economy": {
        "unit": "passenger-km",
        "factor": Decimal("0.000255"),           # tCO2e/pkm — DEFRA/DGCA India equivalent
        "source": "IPCC 2006 / DGCA India / DEFRA 2023",
    },
    "air_international_economy": {
        "unit": "passenger-km",
        "factor": Decimal("0.000195"),
        "source": "IPCC 2006 / ICAO",
    },
    "rail_passenger": {
        "unit": "passenger-km",
        "factor": Decimal("0.0000145"),          # Indian Railways traction factor (CEA-based)
        "source": "Indian Railways Sustainability Report 2022–23",
    },
    "road_car_diesel": {
        "unit": "passenger-km",
        "factor": Decimal("0.000171"),           # Diesel car, India average fleet
        "source": "MoPNG / IPCC 2006",
    },
    "road_bus_diesel": {
        "unit": "passenger-km",
        "factor": Decimal("0.0000275"),          # Diesel bus
        "source": "MoPNG / IPCC 2006",
    },
    "road_freight_diesel": {
        "unit": "tonne-km",
        "factor": Decimal("0.0000675"),          # Road freight (HCV diesel)
        "source": "MoPNG / IPCC 2006 / CPCB",
    },
    "rail_freight": {
        "unit": "tonne-km",
        "factor": Decimal("0.0000098"),          # Indian Railways freight
        "source": "Indian Railways 2022–23",
    },
}

# Purchased goods/materials spend-based factors (tCO2e per INR lakh)
# Per SEBI BRSR guidance: spend-based acceptable where measured data unavailable
SCOPE3_SPEND_FACTORS: Dict[str, Dict[str, Any]] = {
    "steel": {
        "unit": "tonne",
        "factor": Decimal("1.85"),               # tCO2e/tonne — Indian steel sector average
        "source": "Steel Authority of India / worldsteel 2023",
    },
    "cement": {
        "unit": "tonne",
        "factor": Decimal("0.82"),               # tCO2e/tonne clinker-adjusted
        "source": "CMA India / worldcement 2023",
    },
    "aluminium": {
        "unit": "tonne",
        "factor": Decimal("8.24"),               # tCO2e/tonne primary aluminium
        "source": "IAI / NALCO India 2023",
    },
    "copper": {
        "unit": "tonne",
        "factor": Decimal("2.50"),
        "source": "ICF / Hindalco 2023",
    },
}


def get_grid_factor(state: str = None) -> Decimal:
    """
    Returns grid emission factor in tCO2e/MWh.
    Uses state-specific CEA factor if available; falls back to national weighted average.
    """
    if state:
        state_code = state.strip().upper()[:2]
        if state_code in STATE_GRID_FACTORS:
            return STATE_GRID_FACTORS[state_code]
    return GRID_EMISSION_FACTOR_CEA_WEIGHTED_AVG


def get_fuel_factor(fuel_type: str) -> Dict[str, Any]:
    """Returns emission factor and unit metadata for fuel combustion (all Indian grades)."""
    key = fuel_type.strip().lower().replace(" ", "_").replace("-", "_")
    if key not in FUEL_EMISSION_FACTORS:
        raise ValueError(
            f"Unknown fuel type '{fuel_type}'. "
            f"Supported Indian fuel grades: {sorted(FUEL_EMISSION_FACTORS.keys())}"
        )
    return FUEL_EMISSION_FACTORS[key]


def get_scope3_transport_factor(mode: str) -> Optional[Dict[str, Any]]:
    """Returns tCO2e factor for a Scope 3 transport mode."""
    key = mode.strip().lower().replace(" ", "_").replace("-", "_")
    return SCOPE3_TRANSPORT_FACTORS.get(key)


def get_scope3_material_factor(material: str) -> Optional[Dict[str, Any]]:
    """Returns tCO2e/tonne factor for a purchased material (Scope 3 upstream)."""
    key = material.strip().lower()
    return SCOPE3_SPEND_FACTORS.get(key)


# ---------------------------------------------------------------------------
# Scope 3 — Capital Goods Emission Factors  (GHG Protocol Cat 2)
# ---------------------------------------------------------------------------
# Sources:
#   - worldsteel Association: steel-intensive machinery (EAF/BOF route average)
#   - IPCC 2006 Tier 1: embodied energy of manufactured goods
#   - BEE / Make-in-India data: Indian-manufactured electrical equipment
#   - SEBI BRSR spend-based fallback: tCO2e per INR Lakh of CAPEX
#     (derived from India's capital goods sector average carbon intensity)
SCOPE3_CAPITAL_GOODS_FACTORS: Dict[str, Dict[str, Any]] = {
    # ── Heavy Construction Equipment ──────────────────────────────────────
    "excavator": {
        "unit": "tonne",
        "factor_per_tonne": Decimal("2.89"),        # tCO2e/t — steel-heavy, IPCC Tier 1
        "factor_per_inr_lakh": Decimal("0.0185"),   # tCO2e/INR Lakh — spend-based fallback
        "source": "worldsteel 2023 / IPCC 2006 Tier 1",
        "description": "Hydraulic excavators, backhoe loaders",
    },
    "crane_mobile": {
        "unit": "tonne",
        "factor_per_tonne": Decimal("2.75"),
        "factor_per_inr_lakh": Decimal("0.0170"),
        "source": "worldsteel 2023 / IPCC 2006 Tier 1",
        "description": "Mobile cranes, tower cranes",
    },
    "compactor": {
        "unit": "tonne",
        "factor_per_tonne": Decimal("2.60"),
        "factor_per_inr_lakh": Decimal("0.0158"),
        "source": "worldsteel 2023 / IPCC 2006 Tier 1",
        "description": "Vibratory compactors, soil compactors",
    },
    "paver": {
        "unit": "tonne",
        "factor_per_tonne": Decimal("2.65"),
        "factor_per_inr_lakh": Decimal("0.0162"),
        "source": "worldsteel 2023 / IPCC 2006 Tier 1",
        "description": "Asphalt pavers, concrete pavers",
    },
    "bulldozer": {
        "unit": "tonne",
        "factor_per_tonne": Decimal("2.80"),
        "factor_per_inr_lakh": Decimal("0.0175"),
        "source": "worldsteel 2023 / IPCC 2006 Tier 1",
        "description": "Track-type tractors, dozers",
    },
    # ── Pipeline & Drilling Equipment ─────────────────────────────────────
    "pipe_layer": {
        "unit": "tonne",
        "factor_per_tonne": Decimal("2.75"),
        "factor_per_inr_lakh": Decimal("0.0170"),
        "source": "worldsteel 2023 / IPCC 2006 Tier 1",
        "description": "Crawler pipe-layers for pipeline installation",
    },
    "boring_rig": {
        "unit": "tonne",
        "factor_per_tonne": Decimal("3.10"),        # Higher — alloy steels & precision parts
        "factor_per_inr_lakh": Decimal("0.0200"),
        "source": "worldsteel 2023 / IPCC 2006 Tier 1",
        "description": "Horizontal directional drilling rigs, rock boring",
    },
    # ── Electrical & Instrumentation ──────────────────────────────────────
    "hv_transformer": {
        "unit": "tonne",
        "factor_per_tonne": Decimal("3.50"),        # Copper windings + silicon steel core
        "factor_per_inr_lakh": Decimal("0.0220"),
        "source": "BEE / IEC 60076 embodied energy estimates",
        "description": "HV/MV transformers (33kV, 11kV)",
    },
    "dg_set": {
        "unit": "tonne",
        "factor_per_tonne": Decimal("3.20"),
        "factor_per_inr_lakh": Decimal("0.0195"),
        "source": "IPCC 2006 Tier 1 / BEE",
        "description": "Diesel generator sets",
    },
    # ── Generic fallback ──────────────────────────────────────────────────
    "general_plant": {
        "unit": "tonne",
        "factor_per_tonne": Decimal("2.70"),        # Conservative average for unclassified plant
        "factor_per_inr_lakh": Decimal("0.0160"),
        "source": "IPCC 2006 Tier 1 / India capital goods sector average",
        "description": "General plant and machinery (unclassified)",
    },
}


# ---------------------------------------------------------------------------
# Scope 3 — Waste in Operations Emission Factors  (GHG Protocol Cat 5)
# ---------------------------------------------------------------------------
# Sources:
#   - CPCB Solid Waste Management Status Report 2022–23
#   - MoEFCC Construction & Demolition Waste Management Rules 2016
#   - IPCC 2006 Guidelines for National GHG Inventories — Waste Chapter
#     (Tier 1 default methane correction factors for India)
#   - CPCB Hazardous & Other Wastes Rules 2016 (HW treatment factors)
SCOPE3_WASTE_FACTORS: Dict[str, Dict[str, Any]] = {
    # ── Construction & Demolition Debris ──────────────────────────────────
    "cd_debris_landfill": {
        "unit": "tonne",
        "factor": Decimal("0.0058"),     # tCO2e/tonne — inert but transport+landfill gas
        "disposal_method": "landfill",
        "source": "MoEFCC C&D Waste Rules 2016 / IPCC 2006 Waste Ch",
        "description": "C&D debris, concrete rubble, masonry waste to landfill",
    },
    "cd_debris_recycled": {
        "unit": "tonne",
        "factor": Decimal("0.0012"),     # tCO2e/tonne — transport to recycler only
        "disposal_method": "recycling",
        "source": "MoEFCC C&D Waste Rules 2016",
        "description": "C&D debris diverted to recycling/processing",
    },
    # ── Municipal Solid Waste (Site Camps & Offices) ──────────────────────
    "msw_landfill": {
        "unit": "tonne",
        "factor": Decimal("0.4760"),     # tCO2e/tonne — Indian landfill, Tier 1 IPCC
        "disposal_method": "landfill",
        "source": "CPCB SWM Report 2022–23 / IPCC 2006 Waste Ch Tier 1",
        "description": "Mixed MSW from site camps, offices to landfill",
    },
    "msw_composted": {
        "unit": "tonne",
        "factor": Decimal("0.0380"),     # tCO2e/tonne — aerobic composting N2O only
        "disposal_method": "composting",
        "source": "IPCC 2006 / CPCB",
        "description": "Organic / food waste composted on-site or sent to CPCB-registered composter",
    },
    "msw_incinerated": {
        "unit": "tonne",
        "factor": Decimal("0.3780"),     # tCO2e/tonne
        "disposal_method": "incineration",
        "source": "CPCB / IPCC 2006 Waste Chapter",
        "description": "Waste incinerated at CPCB-authorised facility",
    },
    # ── Hazardous Waste ───────────────────────────────────────────────────
    "hazardous_landfill": {
        "unit": "tonne",
        "factor": Decimal("0.8540"),     # tCO2e/tonne — captive/secured landfill
        "disposal_method": "secured landfill",
        "source": "CPCB HW Rules 2016 / IPCC 2006 Tier 1",
        "description": "Oily rags, spent lubricants, contaminated soil to secured landfill",
    },
    "hazardous_incinerated": {
        "unit": "tonne",
        "factor": Decimal("0.5600"),
        "disposal_method": "incineration (high-temp)",
        "source": "CPCB HW Rules 2016",
        "description": "Organic hazardous waste incinerated at CPCB-authorised TSDF",
    },
    "hazardous_recycled": {
        "unit": "tonne",
        "factor": Decimal("0.0450"),
        "disposal_method": "recycling/reclamation",
        "source": "CPCB HW Rules 2016",
        "description": "Used oil, metal scrap recovered via authorised recycler",
    },
    # ── E-Waste ───────────────────────────────────────────────────────────
    "ewaste": {
        "unit": "tonne",
        "factor": Decimal("0.0200"),     # tCO2e/tonne — recycler transport + dismantling
        "disposal_method": "authorised e-waste recycler",
        "source": "MoEFCC E-Waste Management Rules 2022",
        "description": "Cables, switchgear, PCBs, electrical scrap — sent to CPCB-registered recycler",
    },
    # ── Wastewater / Sludge ───────────────────────────────────────────────
    "wastewater_treated": {
        "unit": "tonne",
        "factor": Decimal("0.0023"),     # tCO2e/tonne — STP anaerobic fraction
        "disposal_method": "sewage treatment plant",
        "source": "IPCC 2006 Waste Chapter / CPCB",
        "description": "Wastewater treated on-site or at municipality STP",
    },
}


def get_scope3_capital_goods_factor(asset_type: str) -> Optional[Dict[str, Any]]:
    """Returns embodied carbon factors for a capital goods asset type."""
    key = asset_type.strip().lower().replace(" ", "_").replace("-", "_")
    return SCOPE3_CAPITAL_GOODS_FACTORS.get(key)


def get_scope3_waste_factor(waste_type: str) -> Optional[Dict[str, Any]]:
    """Returns tCO2e/tonne factor for a waste stream disposal route."""
    key = waste_type.strip().lower().replace(" ", "_").replace("-", "_")
    return SCOPE3_WASTE_FACTORS.get(key)


