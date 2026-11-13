"""Explicit activity categories and compatible units for E6 proxy estimates."""
PROXY_FACTORS = {
    "earthmoving": {"factor": 0.082, "unit": "tCO2e / machine-hr", "accepted_units": {"machine-hr": 1, "machine-hrs": 1, "machine-hour": 1, "machine-hours": 1, "hr": 1, "hours": 1}, "keywords": ["earth", "excavat", "grading", "dozer", "excavator"]},
    "diesel_hauling": {"factor": 2.68, "unit": "tCO2e / kL", "accepted_units": {"kl": 1, "kiloliter": 1, "kilolitre": 1, "litre": .001, "liter": .001, "litres": .001, "liters": .001}, "keywords": ["diesel", "fuel", "haul", "transport", "truck"]},
    "concrete": {"factor": 0.00013, "unit": "tCO2e / kg cement", "accepted_units": {"kg": 1, "kilogram": 1, "kilograms": 1, "tonne": 1000, "tonnes": 1000, "mt": 1000}, "keywords": ["concrete", "cement", "rcc", "pcc"]},
    "steel": {"factor": 0.00185, "unit": "tCO2e / kg steel", "accepted_units": {"kg": 1, "kilogram": 1, "kilograms": 1, "tonne": 1000, "tonnes": 1000, "mt": 1000}, "keywords": ["steel", "rebar", "reinforcement", "structural"]},
    "civil_works": {"factor": 0.015, "unit": "tCO2e / INR Lakh", "accepted_units": {"inr lakh": 1, "inr lakhs": 1, "lakh": 1, "lakhs": 1, "inr crore": 100, "crore": 100, "inr": .00001, "rupees": .00001}, "keywords": ["civil", "construction", "subcontract"]},
}

def classify_work_category(work_category: str) -> dict | None:
    text = (work_category or "").lower()
    matches = [(category, data) for category, data in PROXY_FACTORS.items() if any(keyword in text for keyword in data["keywords"])]
    if not matches:
        return None
    # Prefer the most specific matching keyword to prevent generic "transport" beating diesel.
    category, data = max(matches, key=lambda pair: max(len(k) for k in pair[1]["keywords"] if k in text))
    return {**data, "category": category}
