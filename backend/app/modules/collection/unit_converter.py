from typing import Optional

def normalize_to_base_unit(metric_code: str, value: Optional[float], entered_unit: str, base_unit: str) -> Optional[float]:
    """
    Standardizes entered quantities into the official BRSR base unit (F08).
    Prevents unit-slip errors (e.g. entering kWh where MWh is expected).
    """
    if value is None:
        return None

    entered = entered_unit.strip().lower()
    base = base_unit.strip().lower()

    if entered == base:
        return float(value)

    # Energy conversions
    if entered == "kwh" and base == "mwh":
        return value / 1000.0
    if entered == "mwh" and base == "kwh":
        return value * 1000.0
    if entered == "gj" and base == "mwh":
        return value / 3.6
    if entered == "mwh" and base == "gj":
        return value * 3.6
    if entered == "kwh" and base == "gj":
        return (value / 1000.0) * 3.6

    # Fuel / Liquid volume
    if entered in ["litres", "l", "liter", "liters"] and base == "kl":
        return value / 1000.0
    if entered == "kl" and base in ["litres", "l"]:
        return value * 1000.0
    if entered in ["litres", "l"] and base == "m3":
        return value / 1000.0
    if entered == "kl" and base == "m3":
        return float(value)

    # Emissions
    if entered == "kgco2e" and base == "tco2e":
        return value / 1000.0
    if entered == "tco2e" and base == "kgco2e":
        return value * 1000.0

    # Weight / Waste
    if entered in ["kg", "kilograms"] and base == "tonnes":
        return value / 1000.0
    if entered == "tonnes" and base in ["kg", "kilograms"]:
        return value * 1000.0

    # Fallback to direct value if no explicit conversion applies
    return float(value)
