"""
app/modules/calc/formulas/__init__.py
Formulas package exporting all ESG & BRSR calculation formulas.
"""
from app.modules.calc.formulas.scope1 import calculate_scope1_stationary_combustion
from app.modules.calc.formulas.scope2 import calculate_scope2_electricity
from app.modules.calc.formulas.energy import calculate_total_energy
from app.modules.calc.formulas.intensity import calculate_energy_intensity, calculate_ghg_intensity
from app.modules.calc.formulas.safety import calculate_ltifr, calculate_fatality_rate

__all__ = [
    "calculate_scope1_stationary_combustion",
    "calculate_scope2_electricity",
    "calculate_total_energy",
    "calculate_energy_intensity",
    "calculate_ghg_intensity",
    "calculate_ltifr",
    "calculate_fatality_rate",
]
