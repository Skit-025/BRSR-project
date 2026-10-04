"""
E5 Engine: Section Templates
Maps BRSR section names to contextual draft guidance for narrative generation.
"""

SECTION_TEMPLATES = {
    "governance": "This section covers Board structure, committee composition, and anti-corruption governance mechanisms.",
    "environmental": "This section covers energy, GHG emissions, water, and waste disclosures under Principle 6.",
    "social": "This section covers workforce data, training, safety metrics, and HR policies under Principle 3.",
    "supply chain": "This section covers Scope 3 and value-chain sustainability disclosures.",
    "default": "Provide a concise factual disclosure based only on the approved KPIs provided."
}


def get_section_template(section: str) -> str:
    section_lower = section.lower()
    for key, template in SECTION_TEMPLATES.items():
        if key in section_lower:
            return template
    return SECTION_TEMPLATES["default"]
