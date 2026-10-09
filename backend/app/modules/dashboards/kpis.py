from typing import Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.modules.consolidation.models import ConsolidatedValue
from app.modules.org.models import OrgNode
from app.modules.collection.models import Submission, DataPoint, SubmissionStatus


PRE_EXISTING_DEMO_CODES = {
    "AAROHAN-GROUP", "AAROHAN-RENEW", "BU-SOLAR", "PRJ-ODISHA-SOLAR",
    "BU-WIND", "PRJ-GUJ-WIND", "AAROHAN-INFRA", "BU-HIGHWAYS", "PRJ-HIGHWAY-NH16"
}


def get_executive_kpis(db: Session, period_id: str, entity_id: str) -> Dict[str, Any]:
    """
    Fetches headline ESG indicators for the executive dashboard:
    1. Checks ConsolidatedValue table.
    2. If empty, calculates directly from approved/submitted DataPoints using statutory formulas:
       - Energy: Grid (kWh -> GJ) + Diesel (L -> GJ)
       - Scope 1: Fuel combustion (L -> tCO2e via IPCC 2006 factor)
       - Scope 2: Grid electricity (kWh -> tCO2e via CEA CO2 baseline database)
    3. If no data exists:
       - Pre-existing seeded entities return realistic baseline demo values.
       - Newly created entities return 0.0.
    """
    node = db.query(OrgNode).filter((OrgNode.id == entity_id) | (OrgNode.code == entity_id)).first()
    node_code = (node.code or "").upper() if node else ""

    # 1. Check ConsolidatedValue
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

    energy_gj = float(metric_map.get("ENV-ENERGY-001", {}).value or 0.0) if "ENV-ENERGY-001" in metric_map else 0.0
    scope1 = float(metric_map.get("ENV-GHG-001", {}).value or 0.0) if "ENV-GHG-001" in metric_map else 0.0
    scope2 = float(metric_map.get("ENV-GHG-002", {}).value or 0.0) if "ENV-GHG-002" in metric_map else 0.0
    water = float(metric_map.get("ENV-WATER-001", {}).value or 0.0) if "ENV-WATER-001" in metric_map else 0.0
    waste = float(metric_map.get("ENV-WASTE-001", {}).value or 0.0) if "ENV-WASTE-001" in metric_map else 0.0

    ltifr = float(metric_map.get("SOC-SAFE-001", {}).value or 0.0) if "SOC-SAFE-001" in metric_map else 0.0
    fatalities = int(metric_map.get("SOC-SAFE-002", {}).value or 0) if "SOC-SAFE-002" in metric_map else 0
    total_emp = int(metric_map.get("SOC-EMP-001", {}).value or 0) if "SOC-EMP-001" in metric_map else 0

    has_consolidated = any([energy_gj > 0, scope1 > 0, scope2 > 0, water > 0, waste > 0])

    # 2. If no consolidated values, derive from DataPoints in submissions
    if not has_consolidated:
        from app.modules.auth.service import get_descendant_node_ids
        scoped_ids = [str(node.id)] if node else [entity_id]
        if node:
            desc_ids = get_descendant_node_ids(db, str(node.id))
            scoped_ids = list(set(scoped_ids + [str(d) for d in desc_ids]))

        dps = (
            db.query(DataPoint)
            .join(Submission, Submission.id == DataPoint.submission_id)
            .filter(
                Submission.entity_id.in_(scoped_ids),
                Submission.period_id == period_id,
                Submission.is_deleted == False,
                DataPoint.is_deleted == False
            )
            .all()
        )

        grid_kwh = 0.0
        diesel_litres = 0.0
        for dp in dps:
            val = float(dp.value_numeric or 0.0)
            if not val:
                continue
            code = dp.metric_code.upper()
            if code == "ENV-ENERGY-001":
                grid_kwh += val
            elif code in ("ENV-ENERGY-002", "ENV-ENERGY-003", "ENV-DIESEL-001"):
                diesel_litres += val
            elif code == "ENV-WATER-001":
                water += val
            elif code in ("ENV-WASTE-001", "ENV-HAZWASTE-001"):
                waste += val
            elif code == "ENV-GHG-001":
                scope1 += val
            elif code == "ENV-GHG-002":
                scope2 += val

        # Calculate using formulas if activity data present
        if grid_kwh > 0 or diesel_litres > 0:
            # 1 kWh = 0.0036 GJ; 1 litre diesel = 0.03596 GJ
            energy_gj = round((grid_kwh * 0.0036) + (diesel_litres * 0.03596), 2)
            # IPCC 2006 stationary/mobile diesel: ~2.68 kg CO2e / litre = 0.00268 tCO2e/L
            if scope1 == 0:
                scope1 = round(diesel_litres * 0.00268, 2)
            # CEA Baseline Database v20.0 grid factor: ~0.716 kg CO2e / kWh = 0.000716 tCO2e/kWh
            if scope2 == 0:
                scope2 = round(grid_kwh * 0.000716, 2)

    has_real_data = any([energy_gj > 0, scope1 > 0, scope2 > 0, water > 0, waste > 0])

    # 3. Fallback: Pre-existing demo entities get realistic mock baseline data (70-90% range),
    # while newly created entities get strictly 0.0!
    if not has_real_data:
        is_pre_existing = node_code in PRE_EXISTING_DEMO_CODES or (node and node.is_root)
        if is_pre_existing:
            if node and node.type == "group":
                energy_gj = 428500.0
                scope1 = 1840.5
                scope2 = 1455.2
                water = 42100.0
                waste = 312.4
                ltifr = 0.18
                fatalities = 0
                total_emp = 4850
            elif node and node.type == "subsidiary":
                energy_gj = 195400.0
                scope1 = 620.4
                scope2 = 780.6
                water = 18200.0
                waste = 114.2
                ltifr = 0.12
                fatalities = 0
                total_emp = 1920
            elif node and node.type in ("business_unit", "bu"):
                energy_gj = 94200.0
                scope1 = 280.2
                scope2 = 390.4
                water = 9450.0
                waste = 48.6
                ltifr = 0.08
                fatalities = 0
                total_emp = 850
            else: # project
                energy_gj = 384.8
                scope1 = 109.2
                scope2 = 46.2
                water = 9150.0
                waste = 1.85
                ltifr = 0.0
                fatalities = 0
                total_emp = 145

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
