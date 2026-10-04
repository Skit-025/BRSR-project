"""
app/modules/calc/units.py
Deterministic Unit Conversion Engine for ESG & BRSR Reporting.
Supports energy, GHG emissions, water volumes, mass, and monetary scales.
"""
from decimal import Decimal
from typing import Dict, Tuple

# Conversion factors to canonical base units:
# Base Energy: MWh
# Base Water: kL (kilolitres)
# Base Mass / GHG: tCO2e or Metric Tonne (MT)
# Base Currency: INR

UNIT_CONVERSIONS: Dict[Tuple[str, str], Decimal] = {
    # Energy to MWh
    ("kwh", "mwh"): Decimal("0.001"),
    ("mwh", "mwh"): Decimal("1.0"),
    ("gj", "mwh"): Decimal("1") / Decimal("3.6"),          # 1 MWh = 3.6 GJ
    ("tj", "mwh"): Decimal("1000") / Decimal("3.6"),       # 1 TJ = 1000 GJ
    ("btu", "mwh"): Decimal("0.000000293071"),
    ("mmbtu", "mwh"): Decimal("0.293071"),
    ("toe", "mwh"): Decimal("11.63"),

    # MWh to other energy units
    ("mwh", "kwh"): Decimal("1000.0"),
    ("mwh", "gj"): Decimal("3.6"),
    ("mwh", "tj"): Decimal("0.0036"),

    # Water Volume to kL (Kilolitres)
    ("litres", "kl"): Decimal("0.001"),
    ("l", "kl"): Decimal("0.001"),
    ("kl", "kl"): Decimal("1.0"),
    ("m3", "kl"): Decimal("1.0"),                          # 1 cubic metre = 1 kL = 1000 L
    ("ml", "kl"): Decimal("1000.0"),                       # 1 Megalitre = 1000 kL
    ("gallons", "kl"): Decimal("0.00378541"),

    # Mass / GHG to Metric Tonnes (t / MT / tCO2e)
    ("kg", "mt"): Decimal("0.001"),
    ("kg", "t"): Decimal("0.001"),
    ("kgco2e", "tco2e"): Decimal("0.001"),
    ("t", "mt"): Decimal("1.0"),
    ("mt", "mt"): Decimal("1.0"),
    ("tco2e", "tco2e"): Decimal("1.0"),
    ("pounds", "mt"): Decimal("0.000453592"),

    # Monetary scales (to INR)
    ("inr", "inr"): Decimal("1.0"),
    ("lakhs", "inr"): Decimal("100000.0"),
    ("crores", "inr"): Decimal("10000000.0"),
    ("million_inr", "inr"): Decimal("1000000.0"),
}


def normalize_unit(unit_str: str) -> str:
    """Strip whitespace and lowercase unit identifier."""
    if not unit_str:
        return ""
    return unit_str.strip().lower().replace(" ", "_")


def convert_unit(value: Decimal, from_unit: str, to_unit: str) -> Decimal:
    """
    Deterministically converts value from from_unit to to_unit.
    If units are identical, returns value unchanged.
    Raises ValueError if conversion path is unsupported.
    """
    src = normalize_unit(from_unit)
    dst = normalize_unit(to_unit)

    if src == dst:
        return value

    pair = (src, dst)
    if pair in UNIT_CONVERSIONS:
        return value * UNIT_CONVERSIONS[pair]

    # Try 2-step hop through common base unit if available
    for (s, mid), f1 in UNIT_CONVERSIONS.items():
        if s == src:
            if (mid, dst) in UNIT_CONVERSIONS:
                f2 = UNIT_CONVERSIONS[(mid, dst)]
                return value * f1 * f2

    raise ValueError(f"Unsupported unit conversion from '{from_unit}' to '{to_unit}'.")
