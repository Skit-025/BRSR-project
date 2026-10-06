"""
app/modules/calc/formulas/scope3.py
Scope 3 Indirect GHG Emissions Calculation Engine.

Covers the 4 material Scope 3 categories for MEIL's business
(infrastructure and construction sector):
  A. Business Travel
  B. Employee Commuting
  C. Purchased Goods and Materials (upstream)
  D. Upstream Transportation and Logistics

Sources:
  - Indian Railways Sustainability Report 2022–23 (rail factors)
  - DGCA / IPCC 2006 (air travel factors)
  - MoPNG PPAC / IPCC 2006 (road transport)
  - SAIL / worldsteel / CMA India / NALCO (material factors)
  - SEBI BRSR Core guidance: spend-based estimation acceptable where measured data unavailable
"""
from decimal import Decimal
from typing import Dict, Any, List, Optional

from app.modules.calc.factors import (
    SCOPE3_TRANSPORT_FACTORS,
    SCOPE3_SPEND_FACTORS,
    get_scope3_transport_factor,
    get_scope3_material_factor,
)


# ---------------------------------------------------------------------------
# A. Business Travel
# ---------------------------------------------------------------------------

def calculate_scope3_business_travel(
    trips: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Computes Scope 3 Category — Business Travel (ENV-GHG-003A).

    Each trip entry in `trips` must have:
      - mode:     str  — one of SCOPE3_TRANSPORT_FACTORS keys
                         e.g. "air_domestic_economy", "rail_passenger", "road_car_diesel"
      - distance_km: Decimal — total one-way km (will be doubled for return trips if round_trip=True)
      - passengers: int    — number of travellers (default 1)
      - round_trip: bool   — if True, double the distance

    Returns total tCO2e across all trips.
    """
    total_tco2e = Decimal("0")
    trip_details = []

    for trip in trips:
        mode = trip.get("mode", "")
        factor_meta = get_scope3_transport_factor(mode)
        if not factor_meta:
            trip_details.append({
                "mode": mode,
                "error": f"Unknown travel mode '{mode}'. Available: {list(SCOPE3_TRANSPORT_FACTORS.keys())}",
                "tco2e": "0",
            })
            continue

        distance_km = Decimal(str(trip.get("distance_km", 0)))
        passengers = int(trip.get("passengers", 1))
        if trip.get("round_trip", False):
            distance_km *= 2

        factor_val = factor_meta["factor"]                   # tCO2e per passenger-km
        trip_tco2e = distance_km * Decimal(str(passengers)) * factor_val

        total_tco2e += trip_tco2e
        trip_details.append({
            "mode": mode,
            "distance_km": str(distance_km),
            "passengers": passengers,
            "factor": str(factor_val),
            "source": factor_meta["source"],
            "tco2e": str(trip_tco2e.quantize(Decimal("0.0001"))),
        })

    return {
        "formula_code": "CALC-GHG-SCOPE3-TRAVEL",
        "result_value": total_tco2e.quantize(Decimal("0.0001")),
        "result_unit": "tCO2e",
        "intermediate_steps": {"trips": trip_details},
        "factors_applied": {"source": "Indian Railways / DGCA / MoPNG / IPCC 2006"},
    }


# ---------------------------------------------------------------------------
# B. Employee Commuting
# ---------------------------------------------------------------------------

def calculate_scope3_employee_commuting(
    modes: List[Dict[str, Any]],
    working_days: int = 25,
) -> Dict[str, Any]:
    """
    Computes Scope 3 Category — Employee Commuting (ENV-GHG-003B).

    Each mode entry must have:
      - mode:            str     — transport mode key
      - employees:       int     — number of employees using this mode
      - avg_distance_km: Decimal — average one-way distance per employee per day

    working_days: number of working days in the month (default 25).
    """
    total_tco2e = Decimal("0")
    mode_details = []

    for m in modes:
        mode = m.get("mode", "")
        factor_meta = get_scope3_transport_factor(mode)
        if not factor_meta:
            mode_details.append({
                "mode": mode,
                "error": f"Unknown mode '{mode}'",
                "tco2e": "0",
            })
            continue

        employees = int(m.get("employees", 0))
        avg_distance_km = Decimal(str(m.get("avg_distance_km", 0)))
        # Round trip (home → site → home) × working days
        total_pkm = avg_distance_km * 2 * employees * working_days
        factor_val = factor_meta["factor"]
        mode_tco2e = total_pkm * factor_val

        total_tco2e += mode_tco2e
        mode_details.append({
            "mode": mode,
            "employees": employees,
            "avg_distance_km": str(avg_distance_km),
            "working_days": working_days,
            "total_passenger_km": str(total_pkm.quantize(Decimal("0.01"))),
            "factor": str(factor_val),
            "source": factor_meta["source"],
            "tco2e": str(mode_tco2e.quantize(Decimal("0.0001"))),
        })

    return {
        "formula_code": "CALC-GHG-SCOPE3-COMMUTE",
        "result_value": total_tco2e.quantize(Decimal("0.0001")),
        "result_unit": "tCO2e",
        "intermediate_steps": {"modes": mode_details, "working_days": working_days},
        "factors_applied": {"source": "MoPNG PPAC / IPCC 2006"},
    }


# ---------------------------------------------------------------------------
# C. Purchased Goods and Materials
# ---------------------------------------------------------------------------

def calculate_scope3_purchased_goods(
    materials: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Computes Scope 3 Category — Purchased Goods & Materials (ENV-GHG-003C).

    Each material entry must have:
      - material:   str     — material key e.g. "steel", "cement", "aluminium"
      - quantity_t: Decimal — quantity in metric tonnes
    """
    total_tco2e = Decimal("0")
    material_details = []

    for mat in materials:
        material = mat.get("material", "").lower()
        factor_meta = get_scope3_material_factor(material)
        if not factor_meta:
            material_details.append({
                "material": material,
                "error": f"No Indian emission factor for '{material}'. Available: {list(SCOPE3_SPEND_FACTORS.keys())}",
                "tco2e": "0",
            })
            continue

        qty_t = Decimal(str(mat.get("quantity_t", 0)))
        factor_val = factor_meta["factor"]      # tCO2e per tonne
        mat_tco2e = qty_t * factor_val

        total_tco2e += mat_tco2e
        material_details.append({
            "material": material,
            "quantity_t": str(qty_t),
            "factor_tco2e_per_t": str(factor_val),
            "source": factor_meta["source"],
            "tco2e": str(mat_tco2e.quantize(Decimal("0.0001"))),
        })

    return {
        "formula_code": "CALC-GHG-SCOPE3-PURCHASED-GOODS",
        "result_value": total_tco2e.quantize(Decimal("0.0001")),
        "result_unit": "tCO2e",
        "intermediate_steps": {"materials": material_details},
        "factors_applied": {"source": "SAIL / worldsteel / CMA India / NALCO 2023"},
    }


# ---------------------------------------------------------------------------
# D. Upstream Transportation and Logistics
# ---------------------------------------------------------------------------

def calculate_scope3_upstream_logistics(
    shipments: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Computes Scope 3 Category — Upstream Transportation & Logistics (ENV-GHG-003D).

    Each shipment entry must have:
      - mode:       str     — freight mode key e.g. "road_freight_diesel", "rail_freight"
      - weight_t:   Decimal — cargo weight in metric tonnes
      - distance_km: Decimal — shipping distance in km
    """
    total_tco2e = Decimal("0")
    shipment_details = []

    for s in shipments:
        mode = s.get("mode", "")
        factor_meta = get_scope3_transport_factor(mode)
        if not factor_meta:
            shipment_details.append({
                "mode": mode,
                "error": f"Unknown freight mode '{mode}'",
                "tco2e": "0",
            })
            continue

        weight_t = Decimal(str(s.get("weight_t", 0)))
        distance_km = Decimal(str(s.get("distance_km", 0)))
        tonne_km = weight_t * distance_km
        factor_val = factor_meta["factor"]      # tCO2e per tonne-km
        ship_tco2e = tonne_km * factor_val

        total_tco2e += ship_tco2e
        shipment_details.append({
            "mode": mode,
            "weight_t": str(weight_t),
            "distance_km": str(distance_km),
            "tonne_km": str(tonne_km.quantize(Decimal("0.01"))),
            "factor_tco2e_per_tkm": str(factor_val),
            "source": factor_meta["source"],
            "tco2e": str(ship_tco2e.quantize(Decimal("0.0001"))),
        })

    return {
        "formula_code": "CALC-GHG-SCOPE3-LOGISTICS",
        "result_value": total_tco2e.quantize(Decimal("0.0001")),
        "result_unit": "tCO2e",
        "intermediate_steps": {"shipments": shipment_details},
        "factors_applied": {"source": "CPCB / MoPNG / Indian Railways 2022–23"},
    }


# ---------------------------------------------------------------------------
# E. Capital Goods  (GHG Protocol Cat 2)
# ---------------------------------------------------------------------------

def calculate_scope3_capital_goods(
    assets: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Computes Scope 3 Category 2 — Capital Goods (ENV-GHG-003E).

    Covers embodied carbon in heavy plant, equipment and infrastructure
    procured by MEIL during the reporting period:
      - Construction equipment (excavators, cranes, compactors, rollers, pavers)
      - Pipeline machinery (pipe-layers, boring rigs)
      - Electrical & instrumentation equipment

    Each asset entry must have:
      - asset_type:  str     — key from SCOPE3_CAPITAL_GOODS_FACTORS
                               e.g. "excavator", "crane_mobile", "hv_transformer"
      - weight_t:    Decimal — total equipment weight in metric tonnes
                               (use manufacturer's dry/shipping weight)
      OR
      - spend_inr_lakh: Decimal — capital expenditure in INR Lakh
                                  (spend-based fallback per SEBI BRSR guidance)

    Emission factors sourced from:
      - IPCC 2006 Tier 1 (embodied energy of manufactured goods)
      - European Environment Agency / worldsteel for steel-intensive equipment
      - SEBI BRSR guidance: spend-based estimation (INR lakh × EF) acceptable
        where weight data unavailable.
    """
    from app.modules.calc.factors import SCOPE3_CAPITAL_GOODS_FACTORS, get_scope3_capital_goods_factor

    total_tco2e = Decimal("0")
    asset_details = []

    for asset in assets:
        asset_type = asset.get("asset_type", "").lower().replace(" ", "_")
        factor_meta = get_scope3_capital_goods_factor(asset_type)

        if not factor_meta:
            asset_details.append({
                "asset_type": asset_type,
                "error": f"Unknown asset type '{asset_type}'. Available: {list(SCOPE3_CAPITAL_GOODS_FACTORS.keys())}",
                "tco2e": "0",
            })
            continue

        # Prefer weight-based; fall back to spend-based
        if "weight_t" in asset and asset["weight_t"]:
            qty = Decimal(str(asset["weight_t"]))
            qty_unit = "tonne"
            factor_val = factor_meta["factor_per_tonne"]
            source_method = "weight-based"
        elif "spend_inr_lakh" in asset and asset["spend_inr_lakh"]:
            qty = Decimal(str(asset["spend_inr_lakh"]))
            qty_unit = "INR Lakh"
            factor_val = factor_meta["factor_per_inr_lakh"]
            source_method = "spend-based (SEBI BRSR fallback)"
        else:
            asset_details.append({
                "asset_type": asset_type,
                "error": "Must supply either weight_t or spend_inr_lakh.",
                "tco2e": "0",
            })
            continue

        asset_tco2e = qty * factor_val
        total_tco2e += asset_tco2e
        asset_details.append({
            "asset_type": asset_type,
            "quantity": str(qty),
            "quantity_unit": qty_unit,
            "factor": str(factor_val),
            "method": source_method,
            "source": factor_meta["source"],
            "tco2e": str(asset_tco2e.quantize(Decimal("0.0001"))),
        })

    return {
        "formula_code": "CALC-GHG-SCOPE3-CAPITAL-GOODS",
        "result_value": total_tco2e.quantize(Decimal("0.0001")),
        "result_unit": "tCO2e",
        "intermediate_steps": {"assets": asset_details},
        "factors_applied": {
            "source": "IPCC 2006 Tier 1 / worldsteel / EEA / SEBI BRSR spend-based",
        },
    }


# ---------------------------------------------------------------------------
# F. Waste Generated in Operations  (GHG Protocol Cat 5)
# ---------------------------------------------------------------------------

def calculate_scope3_waste(
    waste_streams: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Computes Scope 3 Category 5 — Waste Generated in Operations (ENV-GHG-003F).

    Covers GHG emissions from disposal and treatment of waste generated at
    MEIL's construction sites and facilities:
      - Construction & Demolition (C&D) debris
      - Hazardous waste (oily rags, spent solvents, contaminated soil)
      - Municipal solid waste from camps / site offices
      - E-waste (cables, electrical scrap)

    Each waste stream entry must have:
      - waste_type:    str     — key from SCOPE3_WASTE_FACTORS
                                 e.g. "cd_debris", "hazardous_landfill",
                                      "msw_landfill", "msw_composted", "ewaste"
      - quantity_t:   Decimal — waste quantity in metric tonnes

    Emission factors sourced from:
      - CPCB Solid Waste Management Report 2022–23
      - MoEFCC C&D Waste Management Rules 2016
      - IPCC 2006 Waste Chapter (methane correction factor, India Tier 1)
    """
    from app.modules.calc.factors import SCOPE3_WASTE_FACTORS, get_scope3_waste_factor

    total_tco2e = Decimal("0")
    stream_details = []

    for ws in waste_streams:
        waste_type = ws.get("waste_type", "").lower().replace(" ", "_").replace("-", "_")
        factor_meta = get_scope3_waste_factor(waste_type)

        if not factor_meta:
            stream_details.append({
                "waste_type": waste_type,
                "error": f"Unknown waste type '{waste_type}'. Available: {list(SCOPE3_WASTE_FACTORS.keys())}",
                "tco2e": "0",
            })
            continue

        qty_t = Decimal(str(ws.get("quantity_t", 0)))
        factor_val = factor_meta["factor"]          # tCO2e per tonne
        ws_tco2e = qty_t * factor_val

        total_tco2e += ws_tco2e
        stream_details.append({
            "waste_type": waste_type,
            "quantity_t": str(qty_t),
            "factor_tco2e_per_t": str(factor_val),
            "disposal_method": factor_meta.get("disposal_method", ""),
            "source": factor_meta["source"],
            "tco2e": str(ws_tco2e.quantize(Decimal("0.0001"))),
        })

    return {
        "formula_code": "CALC-GHG-SCOPE3-WASTE",
        "result_value": total_tco2e.quantize(Decimal("0.0001")),
        "result_unit": "tCO2e",
        "intermediate_steps": {"waste_streams": stream_details},
        "factors_applied": {
            "source": "CPCB 2022–23 / MoEFCC C&D Waste Rules / IPCC 2006 Waste Chapter",
        },
    }

