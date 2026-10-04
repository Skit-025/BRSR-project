"""
app/modules/dashboards/kpis.py
Aggregates top-level Environmental, Social, and Governance key performance metrics.
"""
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.modules.consolidation.models import ConsolidatedValue


def get_executive_kpis(db: Session, period_id: str, entity_id: str) -> Dict[str, Any]:
    """
    Fetches headline ESG indicators for the executive dashboard.
    """
    values = (
        db.query(ConsolidatedValue)
        .filter(
            ConsolidatedValue.entity_id == entity_id,
            ConsolidatedValue.period_id == period_id,
            ConsolidatedValue.is_deleted == False,
        )
        .all()
    )
    metric_map = {v.metric_code: v for v in values}

    # Environmental
    energy_gj = metric_map.get("ENV-ENERGY-001", {}).value if "ENV-ENERGY-001" in metric_map else 0.0
    scope1 = metric_map.get("ENV-GHG-001", {}).value if "ENV-GHG-001" in metric_map else 0.0
    scope2 = metric_map.get("ENV-GHG-002", {}).value if "ENV-GHG-002" in metric_map else 0.0
    water = metric_map.get("ENV-WATER-001", {}).value if "ENV-WATER-001" in metric_map else 0.0
    waste = metric_map.get("ENV-WASTE-001", {}).value if "ENV-WASTE-001" in metric_map else 0.0

    # Social
    ltifr = metric_map.get("SOC-SAFE-001", {}).value if "SOC-SAFE-001" in metric_map else 0.0
    fatalities = int(metric_map.get("SOC-SAFE-002", {}).value) if "SOC-SAFE-002" in metric_map else 0
    total_emp = int(metric_map.get("SOC-EMP-001", {}).value) if "SOC-EMP-001" in metric_map else 0

    return {
        "environmental": {
            "total_energy_gj": energy_gj,
            "scope1_emissions_tco2e": scope1,
            "scope2_emissions_tco2e": scope2,
            "total_ghg_tco2e": round(scope1 + scope2, 2),
            "water_consumption_kl": water,
            "waste_generated_mt": waste,
        },
        "social": {
            "ltifr": ltifr,
            "fatalities": fatalities,
            "total_employees": total_emp,
        }
    }
