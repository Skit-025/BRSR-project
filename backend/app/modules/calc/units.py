"""
app/modules/calc/units.py
Deterministic Unit Conversion Engine for ESG & SEBI BRSR Reporting.
Strict dimensional validation across Energy, Mass, Volume, GHG, Currency, and Distance.
"""
from decimal import Decimal
from typing import Dict, Tuple, Optional
from enum import Enum


class Dimension(str, Enum):
    ENERGY = "energy"
    VOLUME = "volume"
    MASS = "mass"
    GHG = "ghg"
    CURRENCY = "currency"
    DISTANCE = "distance"
    TRANSPORT_ACTIVITY = "transport_activity"
    COUNT = "count"


# Canonical Base Units per Dimension:
# Energy: MWh
# Volume: litres
# Mass: metric tonne (mt / t)
# GHG: tCO2e
# Currency: INR
# Distance: km
# Transport Activity: passenger-km or tonne-km

# Unit -> (Dimension, Factor to Canonical Base Unit)
# Canonical unit has factor Decimal("1.0")
UNIT_METADATA: Dict[str, Tuple[Dimension, Decimal]] = {
    # ── Energy (Base: MWh) ─────────────────────────────────────────────────
    "mwh": (Dimension.ENERGY, Decimal("1.0")),
    "kwh": (Dimension.ENERGY, Decimal("0.001")),
    "gwh": (Dimension.ENERGY, Decimal("1000.0")),
    "gj": (Dimension.ENERGY, Decimal("1.0") / Decimal("3.6")),          # 1 MWh = 3.6 GJ
    "tj": (Dimension.ENERGY, Decimal("1000.0") / Decimal("3.6")),       # 1 TJ = 1000 GJ
    "btu": (Dimension.ENERGY, Decimal("0.000000293071")),
    "mmbtu": (Dimension.ENERGY, Decimal("0.293071")),
    "toe": (Dimension.ENERGY, Decimal("11.63")),                        # Tonne of Oil Equivalent

    # ── Volume (Base: litres) ──────────────────────────────────────────────
    "litres": (Dimension.VOLUME, Decimal("1.0")),
    "litre": (Dimension.VOLUME, Decimal("1.0")),
    "l": (Dimension.VOLUME, Dimension.VOLUME and Decimal("1.0")),
    "kl": (Dimension.VOLUME, Decimal("1000.0")),                         # 1 kL = 1000 Litres
    "kilolitres": (Dimension.VOLUME, Decimal("1000.0")),
    "kilolitre": (Dimension.VOLUME, Decimal("1000.0")),
    "m3": (Dimension.VOLUME, Decimal("1000.0")),                         # 1 m³ = 1 kL = 1000 L
    "cubic_meter": (Dimension.VOLUME, Decimal("1000.0")),
    "cubic_metres": (Dimension.VOLUME, Decimal("1000.0")),
    "ml": (Dimension.VOLUME, Decimal("1000000.0")),                      # 1 Megalitre = 1,000,000 L
    "megalitres": (Dimension.VOLUME, Decimal("1000000.0")),
    "gallons": (Dimension.VOLUME, Decimal("3.78541")),
    "gallons_us": (Dimension.VOLUME, Decimal("3.78541")),
    "scm": (Dimension.VOLUME, Decimal("1.0")),                           # Standard Cubic Metre gas volume

    # ── Mass (Base: Metric Tonne - mt / t) ─────────────────────────────────
    "mt": (Dimension.MASS, Decimal("1.0")),
    "t": (Dimension.MASS, Decimal("1.0")),
    "tonne": (Dimension.MASS, Decimal("1.0")),
    "tonnes": (Dimension.MASS, Decimal("1.0")),
    "metric_tonne": (Dimension.MASS, Decimal("1.0")),
    "metric_tonnes": (Dimension.MASS, Decimal("1.0")),
    "kg": (Dimension.MASS, Decimal("0.001")),
    "kilograms": (Dimension.MASS, Decimal("0.001")),
    "g": (Dimension.MASS, Decimal("0.000001")),
    "grams": (Dimension.MASS, Decimal("0.000001")),
    "pounds": (Dimension.MASS, Decimal("0.00045359237")),
    "lbs": (Dimension.MASS, Decimal("0.00045359237")),

    # ── GHG Emissions (Base: tCO2e) ────────────────────────────────────────
    "tco2e": (Dimension.GHG, Decimal("1.0")),
    "mtco2e": (Dimension.GHG, Decimal("1.0")),
    "kgco2e": (Dimension.GHG, Decimal("0.001")),

    # ── Currency (Base: INR) ───────────────────────────────────────────────
    "inr": (Dimension.CURRENCY, Decimal("1.0")),
    "rs": (Dimension.CURRENCY, Decimal("1.0")),
    "rupees": (Dimension.CURRENCY, Decimal("1.0")),
    "lakhs": (Dimension.CURRENCY, Decimal("100000.0")),                  # 1 Lakh = 100,000 INR
    "inr_lakhs": (Dimension.CURRENCY, Decimal("100000.0")),
    "crores": (Dimension.CURRENCY, Decimal("10000000.0")),               # 1 Crore = 10,000,000 INR
    "inr_crores": (Dimension.CURRENCY, Decimal("10000000.0")),
    "crore_inr": (Dimension.CURRENCY, Decimal("10000000.0")),
    "million_inr": (Dimension.CURRENCY, Decimal("1000000.0")),

    # ── Distance (Base: km) ────────────────────────────────────────────────
    "km": (Dimension.DISTANCE, Decimal("1.0")),
    "kilometres": (Dimension.DISTANCE, Decimal("1.0")),
    "kilometers": (Dimension.DISTANCE, Decimal("1.0")),
    "m": (Dimension.DISTANCE, Decimal("0.001")),
    "miles": (Dimension.DISTANCE, Decimal("1.609344")),

    # ── Transport Activity ─────────────────────────────────────────────────
    "passenger-km": (Dimension.TRANSPORT_ACTIVITY, Decimal("1.0")),
    "passenger_km": (Dimension.TRANSPORT_ACTIVITY, Decimal("1.0")),
    "pkm": (Dimension.TRANSPORT_ACTIVITY, Decimal("1.0")),
    "tonne-km": (Dimension.TRANSPORT_ACTIVITY, Decimal("1.0")),
    "tonne_km": (Dimension.TRANSPORT_ACTIVITY, Decimal("1.0")),
    "tkm": (Dimension.TRANSPORT_ACTIVITY, Decimal("1.0")),

    # ── Count / Non-dimensional ────────────────────────────────────────────
    "count": (Dimension.COUNT, Decimal("1.0")),
    "numbers": (Dimension.COUNT, Decimal("1.0")),
    "nos": (Dimension.COUNT, Decimal("1.0")),
    "percentage": (Dimension.COUNT, Decimal("1.0")),
    "%": (Dimension.COUNT, Decimal("1.0")),
}

# Direct pair overrides where specific regulatory or exact constants apply
DIRECT_PAIR_CONVERSIONS: Dict[Tuple[str, str], Decimal] = {
    ("kwh", "mwh"): Decimal("0.001"),
    ("mwh", "kwh"): Decimal("1000.0"),
    ("mwh", "gj"): Decimal("3.6"),
    ("gj", "mwh"): Decimal("1.0") / Decimal("3.6"),
    ("tj", "gj"): Decimal("1000.0"),
    ("gj", "tj"): Decimal("0.001"),
    ("litres", "kl"): Decimal("0.001"),
    ("l", "kl"): Decimal("0.001"),
    ("kl", "litres"): Decimal("1000.0"),
    ("kl", "l"): Decimal("1000.0"),
    ("m3", "litres"): Decimal("1000.0"),
    ("litres", "m3"): Decimal("0.001"),
    ("kg", "mt"): Decimal("0.001"),
    ("mt", "kg"): Decimal("1000.0"),
    ("kg", "t"): Decimal("0.001"),
    ("t", "kg"): Decimal("1000.0"),
    ("kgco2e", "tco2e"): Decimal("0.001"),
    ("tco2e", "kgco2e"): Decimal("1000.0"),
    ("lakhs", "crores"): Decimal("0.01"),
    ("crores", "lakhs"): Decimal("100.0"),
    ("inr", "crores"): Decimal("0.0000001"),
    ("crores", "inr"): Decimal("10000000.0"),
}


def normalize_unit(unit_str: str) -> str:
    """Strip whitespace, replace hyphens and spaces with underscores, and lowercase."""
    if not unit_str:
        return ""
    clean = unit_str.strip().lower()
    # Canonicalize standard aliases
    aliases = {
        "liter": "litres",
        "liters": "litres",
        "ltr": "litres",
        "l": "litres",
        "kl": "kl",
        "kiloliter": "kl",
        "kiloliters": "kl",
        "kilo_litres": "kl",
        "ton": "t",
        "tons": "t",
        "tonne": "t",
        "tonnes": "t",
        "mt": "t",
        "metric_ton": "t",
        "metric_tonne": "t",
        "metric_tonnes": "t",
        "kilogram": "kg",
        "kilograms": "kg",
        "kgs": "kg",
        "rupees": "inr",
        "rs": "inr",
        "inr": "inr",
        "crore": "crores",
        "cr": "crores",
        "lakh": "lakhs",
        "passenger_km": "passenger-km",
        "pkm": "passenger-km",
        "tonne_km": "tonne-km",
        "tkm": "tonne-km",
    }
    normalized = clean.replace(" ", "_").replace("-", "_")
    if clean in aliases:
        return aliases[clean]
    if normalized in aliases:
        return aliases[normalized]
    return clean


def get_unit_dimension(unit_str: str) -> Optional[Dimension]:
    """Returns the physical dimension for a given unit string."""
    norm = normalize_unit(unit_str)
    meta = UNIT_METADATA.get(norm)
    return meta[0] if meta else None


def convert_unit(value: Decimal, from_unit: str, to_unit: str) -> Decimal:
    """
    Deterministically converts value from from_unit to to_unit.
    Guarantees:
      - If units are identical (after normalization), returns value unchanged.
      - Checks physical dimension compatibility; raises ValueError on dimension mismatch.
      - Uses exact direct pair conversion if defined.
      - Otherwise converts via canonical dimension base unit with high precision.
      - Reversible: convert_unit(convert_unit(v, A, B), B, A) == v (within precision).
    """
    if value is None:
        return Decimal("0.0")

    src = normalize_unit(from_unit)
    dst = normalize_unit(to_unit)

    if src == dst or not src or not dst:
        return value

    # Check direct pair table
    pair = (src, dst)
    if pair in DIRECT_PAIR_CONVERSIONS:
        return value * DIRECT_PAIR_CONVERSIONS[pair]

    inv_pair = (dst, src)
    if inv_pair in DIRECT_PAIR_CONVERSIONS:
        inv_f = DIRECT_PAIR_CONVERSIONS[inv_pair]
        if inv_f > Decimal("0"):
            return value / inv_f

    # Dimension validation and base-unit hop
    meta_src = UNIT_METADATA.get(src)
    meta_dst = UNIT_METADATA.get(dst)

    if not meta_src or not meta_dst:
        raise ValueError(
            f"Unsupported unit conversion from '{from_unit}' to '{to_unit}'. "
            f"Known units: {sorted(UNIT_METADATA.keys())}"
        )

    dim_src, factor_src = meta_src
    dim_dst, factor_dst = meta_dst

    if dim_src != dim_dst:
        raise ValueError(
            f"Incompatible unit dimensions: '{from_unit}' ({dim_src.value}) "
            f"cannot be converted to '{to_unit}' ({dim_dst.value}) without an activity-specific conversion factor."
        )

    # Convert: src_val * factor_src -> canonical base -> / factor_dst -> dst_val
    canonical_val = value * factor_src
    converted = canonical_val / factor_dst
    return converted
