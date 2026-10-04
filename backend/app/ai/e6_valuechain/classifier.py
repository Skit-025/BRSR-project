"""
E6 Engine: Activity Classifier + Proxy Emission Factors
Classifies subcontractor work categories and maps to standard proxy emission factors.
"""

# Proxy emission factors per activity type
# Source: India GHG Program / IPCC default activity factors
PROXY_FACTORS = {
    "earthmoving": {
        "factor": 0.082,
        "unit": "tCO2e / machine-hr",
        "keywords": ["earth", "excavat", "grading", "dozer", "excavator"]
    },
    "diesel_hauling": {
        "factor": 2.68,
        "unit": "tCO2e / kL",
        "keywords": ["diesel", "fuel", "haul", "transport", "truck"]
    },
    "concrete": {
        "factor": 0.00013,
        "unit": "tCO2e / kg cement",
        "keywords": ["concrete", "cement", "rcc", "pcc"]
    },
    "steel": {
        "factor": 0.00185,
        "unit": "tCO2e / kg steel",
        "keywords": ["steel", "rebar", "reinforcement", "structural"]
    },
    "civil_works": {
        "factor": 0.015,
        "unit": "tCO2e / INR Lakh",
        "keywords": ["civil", "construction", "subcontract"]
    },
}


def classify_work_category(work_category: str) -> dict:
    """
    Maps a work category description to the best matching proxy factor entry.
    Falls back to civil_works if no specific match is found.
    """
    wc_lower = work_category.lower()
    for category, data in PROXY_FACTORS.items():
        for kw in data["keywords"]:
            if kw in wc_lower:
                return {**data, "category": category}
    return {**PROXY_FACTORS["civil_works"], "category": "civil_works"}
