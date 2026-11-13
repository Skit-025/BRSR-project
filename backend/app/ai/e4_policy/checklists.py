"""
E4 Engine: Policy Checklists
Defines the mandatory BRSR policy disclosure requirements per policy type.
"""

POLICY_CHECKLISTS = {
    "anti-corruption": [
        "Anti-Bribery and Corruption Prohibition",
        "Whistleblower Protection Mechanism",
        "Board Oversight and Annual Review",
        "Third-Party Due Diligence Requirement",
    ],
    "human_rights": [
        "Prohibition of Child and Forced Labour",
        "Non-Discrimination and Equal Opportunity",
        "Grievance Redressal Mechanism",
        "Supplier Human Rights Code of Conduct",
    ],
    "environmental": [
        "Commitment to Reduce GHG Emissions",
        "Biodiversity and Land Use Policy",
        "Waste Management and Circular Economy Plan",
        "Annual Environmental Audit Requirement",
    ],
}

def get_checklist(policy_type: str) -> list:
    key = policy_type.lower().replace(" ", "_").replace("-", "_")
    aliases = {"anti_corruption": "anti-corruption", "anti_bribery": "anti-corruption", "human_rights": "human_rights", "environmental": "environmental", "environmental_policy": "environmental"}
    canonical = aliases.get(key)
    if canonical is None:
        raise ValueError(f"Unsupported policy type: {policy_type}")
    return POLICY_CHECKLISTS[canonical]
