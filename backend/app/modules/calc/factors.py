"""
app/modules/calc/factors.py
Statutory Emission Factors and Calorific Values.
Complies with CEA (Central Electricity Authority, India) and IPCC GHG inventory standards.
"""
from decimal import Decimal
from typing import Dict, Any

# CEA Indian Grid Average Emission Factor (tCO2e per MWh)
# CEA CO2 Baseline Database for the Indian Power Sector (Ver. 19/20)
GRID_EMISSION_FACTOR_CEA_WEIGHTED_AVG = Decimal("0.713")  # tCO2 / MWh (Weighted average grid mix)
GRID_EMISSION_FACTOR_RENEWABLE = Decimal("0.0")           # Solar / Wind / Hydro on-site / PPA

# Fuel Emission Factors (tCO2e per unit fuel) - IPCC Guideline Defaults
FUEL_EMISSION_FACTORS: Dict[str, Dict[str, Any]] = {
    # Diesel (HSD) - high speed diesel
    "diesel": {
        "unit": "litres",
        "factor": Decimal("0.00268"),    # tCO2e per litre (2.68 kgCO2e/L)
        "net_calorific_value_gj_per_unit": Decimal("0.0359"),
        "source": "IPCC 2006 / DEFRA 2023",
    },
    # Petrol (Motor Gasoline)
    "petrol": {
        "unit": "litres",
        "factor": Decimal("0.00231"),    # tCO2e per litre (2.31 kgCO2e/L)
        "net_calorific_value_gj_per_unit": Decimal("0.0328"),
        "source": "IPCC 2006 / DEFRA 2023",
    },
    # Liquified Petroleum Gas (LPG)
    "lpg": {
        "unit": "kg",
        "factor": Decimal("0.00298"),    # tCO2e per kg (2.98 kgCO2e/kg)
        "net_calorific_value_gj_per_unit": Decimal("0.0473"),
        "source": "IPCC 2006",
    },
    # Piped Natural Gas (PNG) / Natural Gas
    "natural_gas": {
        "unit": "scm",                   # Standard Cubic Metres
        "factor": Decimal("0.00193"),    # tCO2e per SCM
        "net_calorific_value_gj_per_unit": Decimal("0.0385"),
        "source": "CEA / Petroleum Planning & Analysis Cell",
    },
    # Compressed Natural Gas (CNG)
    "cng": {
        "unit": "kg",
        "factor": Decimal("0.00275"),    # tCO2e per kg
        "net_calorific_value_gj_per_unit": Decimal("0.0480"),
        "source": "PPAC / DEFRA",
    },
    # Heavy Fuel Oil (Furnace Oil)
    "furnace_oil": {
        "unit": "litres",
        "factor": Decimal("0.00318"),    # tCO2e per litre
        "net_calorific_value_gj_per_unit": Decimal("0.0404"),
        "source": "IPCC 2006",
    },
    # Non-Coking Coal
    "coal": {
        "unit": "mt",
        "factor": Decimal("1.85"),       # tCO2e per metric tonne
        "net_calorific_value_gj_per_unit": Decimal("18.8"),
        "source": "CEA / Ministry of Coal",
    }
}


def get_grid_factor(state: str = None) -> Decimal:
    """Returns grid emission factor in tCO2e/MWh for India national/regional grid."""
    return GRID_EMISSION_FACTOR_CEA_WEIGHTED_AVG


def get_fuel_factor(fuel_type: str) -> Dict[str, Any]:
    """Returns emission factor and unit metadata for fuel combustion."""
    key = fuel_type.strip().lower().replace(" ", "_")
    if key not in FUEL_EMISSION_FACTORS:
        raise ValueError(f"Unknown fuel type '{fuel_type}'. Supported fuels: {list(FUEL_EMISSION_FACTORS.keys())}")
    return FUEL_EMISSION_FACTORS[key]
