"""
app/pipelines/reporting/steps/map_disclosures.py
Step 2 – Map consolidated metric values to BRSR/SEBI disclosure framework sections.
"""
from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Any, Dict, List

if TYPE_CHECKING:
    from sqlalchemy.orm import Session
    from app.pipelines.reporting.pipeline import ReportingContext

logger = logging.getLogger(__name__)

# BRSR section taxonomy — maps pillar codes to SEBI BRSR section names
BRSR_SECTION_MAP: Dict[str, str] = {
    "A": "Section A: General Disclosures",
    "B": "Section B: Management & Process Disclosures",
    "C_E": "Section C: Principle 1 — Ethics & Transparency",
    "C_P": "Section C: Principle 2 — Products & Sustainability",
    "C_W": "Section C: Principle 3 — Employee Well-being",
    "C_S": "Section C: Principle 4 — Stakeholder Engagement",
    "C_HR": "Section C: Principle 5 — Human Rights",
    "C_ENV": "Section C: Principle 6 — Environment",
    "C_PP": "Section C: Principle 7 — Policy Advocacy",
    "C_IC": "Section C: Principle 8 — Inclusive Growth",
    "C_CG": "Section C: Principle 9 — Customer Value",
    "GHG": "GHG Emissions Inventory",
    "ENERGY": "Energy Consumption Summary",
    "WATER": "Water & Effluents",
    "WASTE": "Waste Management",
    "SOCIAL": "Social Capital Metrics",
    "GOVERNANCE": "Governance & Board Disclosures",
}


def map_disclosures(ctx: "ReportingContext", db: "Session") -> None:
    """
    Group metric entries into BRSR disclosure sections and build the
    structured disclosure tree that renderers will consume.
    """
    sections: Dict[str, Dict[str, Any]] = {}

    for entry in ctx.metric_entries:
        pillar = (entry.get("pillar") or "GENERAL").upper()
        section_label = BRSR_SECTION_MAP.get(pillar, f"Other: {pillar}")

        if section_label not in sections:
            sections[section_label] = {
                "section": section_label,
                "pillar": pillar,
                "disclosures": [],
            }

        sub = entry.get("sub_section") or "General"
        code = entry.get("code") or entry["metric_id"]
        label = entry.get("label") or code

        disclosure = {
            "code": code,
            "label": label,
            "sub_section": sub,
            "value_numeric": entry.get("value_numeric"),
            "value_text": entry.get("value_text"),
            "unit": entry.get("unit"),
            "entity_id": entry["entity_id"],
            "status": entry.get("status"),
        }

        # Determine reporting value: numeric takes precedence over text
        if entry.get("value_numeric") is not None:
            disclosure["reported_value"] = entry["value_numeric"]
            disclosure["value_type"] = "numeric"
        else:
            disclosure["reported_value"] = entry.get("value_text") or ""
            disclosure["value_type"] = "text"

        sections[section_label]["disclosures"].append(disclosure)

    ctx.disclosure_tree = list(sections.values())

    logger.info(
        "Disclosure mapping complete | sections=%d total_disclosures=%d",
        len(sections),
        sum(len(s["disclosures"]) for s in sections.values()),
    )
