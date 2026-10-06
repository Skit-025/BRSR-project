"""
app/modules/calc/formulas/__init__.py
Formulas package exporting all ESG & BRSR calculation formulas.
"""
from app.modules.calc.formulas.scope1 import (
    calculate_scope1_stationary_combustion,
    calculate_scope1_mobile_combustion,
    calculate_scope1_process_emissions,
    calculate_scope1_fugitive_emissions,
    calculate_scope1_mobile_diesel,
    calculate_scope1_mobile_petrol,
    calculate_scope1_mobile_cng,
    calculate_scope1_refrigerant_leakage,
    calculate_scope1_sf6_leakage,
)
from app.modules.calc.formulas.scope2 import calculate_scope2_electricity
from app.modules.calc.formulas.scope3 import (
    calculate_scope3_business_travel,
    calculate_scope3_employee_commuting,
    calculate_scope3_purchased_goods,
    calculate_scope3_upstream_logistics,
    calculate_scope3_capital_goods,
    calculate_scope3_waste,
)
from app.modules.calc.formulas.energy import calculate_total_energy
from app.modules.calc.formulas.intensity import calculate_energy_intensity, calculate_ghg_intensity
from app.modules.calc.formulas.safety import calculate_ltifr, calculate_fatality_rate

__all__ = [
    # Scope 1 — stationary + subcategories
    "calculate_scope1_stationary_combustion",
    "calculate_scope1_mobile_combustion",
    "calculate_scope1_process_emissions",
    "calculate_scope1_fugitive_emissions",
    # Scope 2
    "calculate_scope2_electricity",
    # Scope 3
    "calculate_scope3_business_travel",
    "calculate_scope3_employee_commuting",
    "calculate_scope3_purchased_goods",
    "calculate_scope3_upstream_logistics",
    "calculate_scope3_capital_goods",
    "calculate_scope3_waste",
    # Other
    "calculate_total_energy",
    "calculate_energy_intensity",
    "calculate_ghg_intensity",
    "calculate_ltifr",
    "calculate_fatality_rate",
]
