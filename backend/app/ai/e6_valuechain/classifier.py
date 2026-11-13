"""Recognize the value-chain activities exposed by the UI and validate their units."""
import re


_SPEND_UNITS = {
    "inr lakh": 1, "inr lakhs": 1, "lakh": 1, "lakhs": 1,
    "inr crore": 100, "inr crores": 100, "crore": 100, "crores": 100,
    "inr": 0.00001, "rupee": 0.00001, "rupees": 0.00001,
}
_MASS_UNITS = {"kg": 1, "kgs": 1, "kilogram": 1, "kilograms": 1, "tonne": 1000, "tonnes": 1000, "mt": 1000}


def _spend_factor(factor, keywords):
    return {"factor": factor, "unit": "tCO2e / INR Lakh", "accepted_units": _SPEND_UNITS, "keywords": keywords}


PROXY_FACTORS = {
    "civil_works": _spend_factor(0.015, ["civil", "structural", "construction", "subcontract"]),
    "electrical_works": _spend_factor(0.013, ["electrical", "electricity installation", "wiring"]),
    "solar_epc": _spend_factor(0.008, ["solar epc", "solar contract", "photovoltaic", "solar"]),
    "wind_turbine": _spend_factor(0.009, ["wind turbine", "wind installation"]),
    "hvac_mep": _spend_factor(0.012, ["hvac", "mep", "heating ventilation", "air conditioning"]),
    "it_services": _spend_factor(0.006, ["it", "technology", "software", "information technology"]),
    "logistics_transport": _spend_factor(0.016, ["logistics", "transportation", "transport", "freight"]),
    "catering_facility": _spend_factor(0.011, ["catering", "facility management", "facilities management"]),
    "waste_management": _spend_factor(0.007, ["waste management", "waste disposal", "recycling"]),
    "security_services": _spend_factor(0.004, ["security", "guarding"]),
    "professional_services": _spend_factor(0.005, ["professional services", "legal", "audit", "consultancy", "consulting"]),
    "equipment_supply": _spend_factor(0.020, ["equipment supply", "manufacturing", "machinery", "equipment"]),
    "raw_material_supply": _spend_factor(0.025, ["raw material", "materials supply", "material supply"]),
    "earthmoving": {"factor": 0.082, "unit": "tCO2e / machine-hr", "accepted_units": {"machine-hr": 1, "machine-hrs": 1, "machine-hour": 1, "machine-hours": 1, "hr": 1, "hrs": 1, "hour": 1, "hours": 1}, "keywords": ["earthmoving", "earth moving", "excavating", "excavation", "grading", "dozer", "excavator"]},
    "diesel_hauling": {"factor": 2.68, "unit": "tCO2e / kL", "accepted_units": {"kl": 1, "kiloliter": 1, "kilolitre": 1, "litre": 0.001, "liter": 0.001, "litres": 0.001, "liters": 0.001}, "keywords": ["diesel", "fuel hauling", "fuel transport", "truck haul"]},
    "concrete": {"factor": 0.00013, "unit": "tCO2e / kg cement", "accepted_units": _MASS_UNITS, "keywords": ["concrete", "cement", "rcc", "pcc"]},
    "steel": {"factor": 0.00185, "unit": "tCO2e / kg steel", "accepted_units": _MASS_UNITS, "keywords": ["steel", "rebar", "reinforcement"]},
}


def _normalize(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", (value or "").casefold()).strip()


def classify_work_category(work_category: str) -> dict | None:
    text = _normalize(work_category)
    if not text:
        return None
    matches = []
    for category, data in PROXY_FACTORS.items():
        for keyword in data["keywords"]:
            phrase = _normalize(keyword)
            if re.search(rf"\b{re.escape(phrase)}\b", text):
                matches.append((len(phrase), category, data))
    if not matches:
        return None
    _, category, data = max(matches, key=lambda item: (item[0], item[1]))
    return {**data, "category": category}
