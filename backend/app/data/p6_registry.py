"""
Single Source of Truth: BRSR Annexure I (Principle 6) Field Registry.
Drives role-specific forms, validation, roll-up, dashboard, lineage, and BRSR report.

Each field entry has:
  id, indicator, section, label, unit, type, ownerRole, nodeTypes, aggregation
"""
from __future__ import annotations
from typing import Dict, List, Any, Optional

ROLE_FORM_TITLES: Dict[str, str] = {
    "project_supervisor": "Site Operations Data",
    "project_admin": "Site Compliance",
    "bu_supervisor": "BU Value Chain",
    "bu_esg_manager": "BU Value Chain",
    "bu_admin": "BU Environmental Management",
    "subsidiary_supervisor": "Subsidiary Initiatives",
    "subsidiary_esg_manager": "Subsidiary Initiatives",
    "subsidiary_admin": "Subsidiary Compliance",
    "group_supervisor": "Group Policy & Targets",
    "group_esg_manager": "Group Policy & Targets",
    "group_admin": "Group Disclosures & Assurance",
}

ROLE_NODE_TYPES: Dict[str, List[str]] = {
    "project_supervisor": ["project", "site", "plant", "manufacturing"],
    "project_admin": ["project", "site", "plant", "manufacturing"],
    "bu_supervisor": ["bu", "business_unit"],
    "bu_esg_manager": ["bu", "business_unit"],
    "bu_admin": ["bu", "business_unit"],
    "subsidiary_supervisor": ["subsidiary", "company"],
    "subsidiary_esg_manager": ["subsidiary", "company"],
    "subsidiary_admin": ["subsidiary", "company"],
    "group_supervisor": ["group", "root"],
    "group_esg_manager": ["group", "root"],
    "group_admin": ["group", "root"],
}

_P6_ROLE_ALIASES: Dict[str, str] = {
    "bu_esg_manager": "bu_supervisor",
    "subsidiary_esg_manager": "subsidiary_supervisor",
    "group_esg_manager": "group_supervisor",
}


def normalize_p6_role(role: str) -> str:
    """Normalize *_esg_manager roles to their canonical P6 registry ownerRole."""
    return _P6_ROLE_ALIASES.get(role, role)

# Section metadata in template order
SECTION_ORDER: List[Dict[str, str]] = [
    {"id": "ei1_energy", "indicator": "P6-EI-1 / LI-1", "title": "EI-1 & LI-1: Total Energy Consumption (GJ)"},
    {"id": "ei3_water", "indicator": "P6-EI-3", "title": "EI-3: Water Withdrawal & Consumption (kL)"},
    {"id": "li2_discharge", "indicator": "P6-LI-2", "title": "LI-2: Water Discharge by Destination & Treatment (kL)"},
    {"id": "li3_water_stress", "indicator": "P6-LI-3", "title": "LI-3: Water-Stressed Area Declaration"},
    {"id": "ei5_air", "indicator": "P6-EI-5", "title": "EI-5: Air Emissions (Other than GHG)"},
    {"id": "ei6_ghg", "indicator": "P6-EI-6", "title": "EI-6: Greenhouse Gas Emissions (Scope 1 & Scope 2)"},
    {"id": "ei8_waste", "indicator": "P6-EI-8", "title": "EI-8: Waste Generated, Recovered & Disposed (MT)"},
    {"id": "ei7_reduction", "indicator": "P6-EI-7", "title": "EI-7: GHG Reduction Projects"},
    {"id": "ei10_eco", "indicator": "P6-EI-10", "title": "EI-10: Operations in Ecologically Sensitive Areas"},
    {"id": "ei11_eia", "indicator": "P6-EI-11", "title": "EI-11: Environmental Impact Assessments (EIA)"},
    {"id": "ei12_compliance", "indicator": "P6-EI-12", "title": "EI-12: Compliance with Environmental Laws"},
    {"id": "li5_biodiversity", "indicator": "P6-LI-5", "title": "LI-5: Biodiversity Impact & Mitigation"},
    {"id": "li6_efficiency", "indicator": "P6-LI-6", "title": "LI-6: Resource Efficiency & Waste Reduction Initiatives"},
    {"id": "li4_scope3", "indicator": "P6-LI-4", "title": "LI-4: Total Scope 3 Emissions (tCO2e)"},
    {"id": "li8_vc_impact", "indicator": "P6-LI-8", "title": "LI-8: Significant Adverse Environmental Impacts in Value Chain"},
    {"id": "li9_vc_assessed", "indicator": "P6-LI-9", "title": "LI-9: Value Chain Partners Assessed for Environmental Impacts (%)"},
    {"id": "ei2_pat", "indicator": "P6-EI-2", "title": "EI-2: Perform, Achieve and Trade (PAT) Scheme"},
    {"id": "ei4_zld", "indicator": "P6-EI-4", "title": "EI-4: Zero Liquid Discharge (ZLD) Mechanism"},
    {"id": "ei9_waste_strategy", "indicator": "P6-EI-9", "title": "EI-9: Waste Management & Hazardous Chemical Reduction Strategy"},
    {"id": "li7_bcp", "indicator": "P6-LI-7", "title": "LI-7: Business Continuity & Disaster Management Plan"},
    {"id": "sec_b_policy", "indicator": "SEC-B (1-6, 10)", "title": "Section B: Policy & Management Processes (P6 Column)"},
    {"id": "sec_a_profile", "indicator": "SEC-A (1-24)", "title": "Section A: General Disclosures (Items 1-24)"},
    {"id": "sec_b_gov", "indicator": "SEC-B (7-9, 11)", "title": "Section B: Governance, Leadership & External Assessment"},
    {"id": "p6_assurance", "indicator": "P6-ASSURANCE", "title": "External Assurance Note (EI-1, 3, 5, 6, 8 & LI-1..4)"},
]


def _f(
    id: str,
    indicator: str,
    section: str,
    label: str,
    unit: str,
    type: str,
    ownerRole: str,
    nodeTypes: List[str],
    aggregation: str,
    **extra: Any,
) -> Dict[str, Any]:
    d: Dict[str, Any] = {
        "id": id,
        "indicator": indicator,
        "section": section,
        "label": label,
        "unit": unit,
        "type": type,
        "ownerRole": ownerRole,
        "nodeTypes": nodeTypes,
        "aggregation": aggregation,
    }
    d.update(extra)
    return d


PROJ_TYPES = ["project", "site", "plant", "manufacturing"]
PLANT_TYPES = ["plant", "manufacturing"]
BU_TYPES = ["bu", "business_unit"]
SUB_TYPES = ["subsidiary", "company"]
GRP_TYPES = ["group", "root"]

P6_REGISTRY: List[Dict[str, Any]] = [
    # -----------------------------------------------------------------------
    # 1. PROJECT SUPERVISOR — "Site Operations Data"
    # -----------------------------------------------------------------------
    # EI-1 / LI-1 Energy (GJ)
    _f("ei1_ren_elec", "P6-EI-1", "ei1_energy", "From renewable sources — Total electricity consumption (A)", "GJ", "number", "project_supervisor", PROJ_TYPES, "SUM"),
    _f("ei1_ren_fuel", "P6-EI-1", "ei1_energy", "From renewable sources — Total fuel consumption (B)", "GJ", "number", "project_supervisor", PROJ_TYPES, "SUM"),
    _f("ei1_ren_other", "P6-EI-1", "ei1_energy", "From renewable sources — Energy consumption through other sources (C)", "GJ", "number", "project_supervisor", PROJ_TYPES, "SUM"),
    _f("ei1_nonren_elec", "P6-EI-1", "ei1_energy", "From non-renewable sources — Total electricity consumption (D)", "GJ", "number", "project_supervisor", PROJ_TYPES, "SUM"),
    _f("ei1_nonren_fuel", "P6-EI-1", "ei1_energy", "From non-renewable sources — Total fuel consumption (E)", "GJ", "number", "project_supervisor", PROJ_TYPES, "SUM"),
    _f("ei1_nonren_other", "P6-EI-1", "ei1_energy", "From non-renewable sources — Energy consumption through other sources (F)", "GJ", "number", "project_supervisor", PROJ_TYPES, "SUM"),

    # EI-3 Water withdrawal & consumption (kL)
    _f("ei3_surface", "P6-EI-3", "ei3_water", "Water withdrawal by source — (i) Surface water", "kL", "number", "project_supervisor", PROJ_TYPES, "SUM"),
    _f("ei3_groundwater", "P6-EI-3", "ei3_water", "Water withdrawal by source — (ii) Groundwater", "kL", "number", "project_supervisor", PROJ_TYPES, "SUM"),
    _f("ei3_third_party", "P6-EI-3", "ei3_water", "Water withdrawal by source — (iii) Third party water", "kL", "number", "project_supervisor", PROJ_TYPES, "SUM"),
    _f("ei3_seawater", "P6-EI-3", "ei3_water", "Water withdrawal by source — (iv) Seawater / desalinated water", "kL", "number", "project_supervisor", PROJ_TYPES, "SUM"),
    _f("ei3_others", "P6-EI-3", "ei3_water", "Water withdrawal by source — (v) Others", "kL", "number", "project_supervisor", PROJ_TYPES, "SUM"),
    _f("ei3_water_consumption", "P6-EI-3", "ei3_water", "Total volume of water consumption (in kilolitres)", "kL", "number", "project_supervisor", PROJ_TYPES, "SUM"),

    # LI-2 Water discharge (kL): 5 destinations × 4 treatment levels
    _f("li2_surface_no", "P6-LI-2", "li2_discharge", "To Surface water — No treatment", "kL", "number", "project_supervisor", PROJ_TYPES, "SUM"),
    _f("li2_surface_primary", "P6-LI-2", "li2_discharge", "To Surface water — Primary treatment", "kL", "number", "project_supervisor", PROJ_TYPES, "SUM"),
    _f("li2_surface_secondary", "P6-LI-2", "li2_discharge", "To Surface water — Secondary treatment", "kL", "number", "project_supervisor", PROJ_TYPES, "SUM"),
    _f("li2_surface_tertiary", "P6-LI-2", "li2_discharge", "To Surface water — Tertiary treatment", "kL", "number", "project_supervisor", PROJ_TYPES, "SUM"),

    _f("li2_ground_no", "P6-LI-2", "li2_discharge", "To Groundwater — No treatment", "kL", "number", "project_supervisor", PROJ_TYPES, "SUM"),
    _f("li2_ground_primary", "P6-LI-2", "li2_discharge", "To Groundwater — Primary treatment", "kL", "number", "project_supervisor", PROJ_TYPES, "SUM"),
    _f("li2_ground_secondary", "P6-LI-2", "li2_discharge", "To Groundwater — Secondary treatment", "kL", "number", "project_supervisor", PROJ_TYPES, "SUM"),
    _f("li2_ground_tertiary", "P6-LI-2", "li2_discharge", "To Groundwater — Tertiary treatment", "kL", "number", "project_supervisor", PROJ_TYPES, "SUM"),

    _f("li2_sea_no", "P6-LI-2", "li2_discharge", "To Seawater — No treatment", "kL", "number", "project_supervisor", PROJ_TYPES, "SUM"),
    _f("li2_sea_primary", "P6-LI-2", "li2_discharge", "To Seawater — Primary treatment", "kL", "number", "project_supervisor", PROJ_TYPES, "SUM"),
    _f("li2_sea_secondary", "P6-LI-2", "li2_discharge", "To Seawater — Secondary treatment", "kL", "number", "project_supervisor", PROJ_TYPES, "SUM"),
    _f("li2_sea_tertiary", "P6-LI-2", "li2_discharge", "To Seawater — Tertiary treatment", "kL", "number", "project_supervisor", PROJ_TYPES, "SUM"),

    _f("li2_third_no", "P6-LI-2", "li2_discharge", "Sent to third-parties — No treatment", "kL", "number", "project_supervisor", PROJ_TYPES, "SUM"),
    _f("li2_third_primary", "P6-LI-2", "li2_discharge", "Sent to third-parties — Primary treatment", "kL", "number", "project_supervisor", PROJ_TYPES, "SUM"),
    _f("li2_third_secondary", "P6-LI-2", "li2_discharge", "Sent to third-parties — Secondary treatment", "kL", "number", "project_supervisor", PROJ_TYPES, "SUM"),
    _f("li2_third_tertiary", "P6-LI-2", "li2_discharge", "Sent to third-parties — Tertiary treatment", "kL", "number", "project_supervisor", PROJ_TYPES, "SUM"),

    _f("li2_other_no", "P6-LI-2", "li2_discharge", "Others — No treatment", "kL", "number", "project_supervisor", PROJ_TYPES, "SUM"),
    _f("li2_other_primary", "P6-LI-2", "li2_discharge", "Others — Primary treatment", "kL", "number", "project_supervisor", PROJ_TYPES, "SUM"),
    _f("li2_other_secondary", "P6-LI-2", "li2_discharge", "Others — Secondary treatment", "kL", "number", "project_supervisor", PROJ_TYPES, "SUM"),
    _f("li2_other_tertiary", "P6-LI-2", "li2_discharge", "Others — Tertiary treatment", "kL", "number", "project_supervisor", PROJ_TYPES, "SUM"),

    # LI-3 Water-stressed area
    _f("li3_water_stressed", "P6-LI-3", "li3_water_stress", "Site in a water-stressed area?", "", "yesno", "project_supervisor", PROJ_TYPES, "NONE"),
    _f("li3_area_name", "P6-LI-3", "li3_water_stress", "Name of water-stressed area / basin", "", "text", "project_supervisor", PROJ_TYPES, "NONE"),

    # EI-5 Air emissions (manufacturing/plant projects only; per-facility rows, never summed)
    _f(
        "ei5_air_rows",
        "P6-EI-5",
        "ei5_air",
        "Air emissions (other than GHG): NOx, SOx, Particulate matter (PM), Persistent organic pollutants (POP), Volatile organic compounds (VOC), Hazardous air pollutants (HAP), Others",
        "per parameter",
        "table-rows",
        "project_supervisor",
        PLANT_TYPES,
        "NONE",
        columns=[
            {"key": "parameter", "label": "Parameter (NOx / SOx / PM / POP / VOC / HAP / Others)", "type": "select", "options": ["NOx", "SOx", "Particulate matter (PM)", "Persistent organic pollutants (POP)", "Volatile organic compounds (VOC)", "Hazardous air pollutants (HAP)", "Others"]},
            {"key": "unit", "label": "Unit", "type": "text"},
            {"key": "current", "label": "Current FY", "type": "number"},
            {"key": "previous", "label": "Previous FY", "type": "number"},
        ],
    ),

    # EI-6 GHG (tCO2e)
    _f("ei6_scope1", "P6-EI-6", "ei6_ghg", "Total Scope 1 emissions (Break-up of the GHG into CO2, CH4, N2O, HFCs, PFCs, SF6, NF3, if available)", "tCO2e", "number", "project_supervisor", PROJ_TYPES, "SUM"),
    _f("ei6_scope2", "P6-EI-6", "ei6_ghg", "Total Scope 2 emissions (Break-up of the GHG into CO2, CH4, N2O, HFCs, PFCs, SF6, NF3, if available)", "tCO2e", "number", "project_supervisor", PROJ_TYPES, "SUM"),

    # EI-8 Waste (MT)
    _f("ei8_plastic", "P6-EI-8", "ei8_waste", "Total Waste generated — Plastic waste (A)", "MT", "number", "project_supervisor", PROJ_TYPES, "SUM"),
    _f("ei8_ewaste", "P6-EI-8", "ei8_waste", "Total Waste generated — E-waste (B)", "MT", "number", "project_supervisor", PROJ_TYPES, "SUM"),
    _f("ei8_biomedical", "P6-EI-8", "ei8_waste", "Total Waste generated — Bio-medical waste (C)", "MT", "number", "project_supervisor", PROJ_TYPES, "SUM"),
    _f("ei8_cd", "P6-EI-8", "ei8_waste", "Total Waste generated — Construction and demolition waste (D)", "MT", "number", "project_supervisor", PROJ_TYPES, "SUM"),
    _f("ei8_battery", "P6-EI-8", "ei8_waste", "Total Waste generated — Battery waste (E)", "MT", "number", "project_supervisor", PROJ_TYPES, "SUM"),
    _f("ei8_radioactive", "P6-EI-8", "ei8_waste", "Total Waste generated — Radioactive waste (F)", "MT", "number", "project_supervisor", PROJ_TYPES, "SUM"),
    _f("ei8_other_haz", "P6-EI-8", "ei8_waste", "Total Waste generated — Other Hazardous waste (G)", "MT", "number", "project_supervisor", PROJ_TYPES, "SUM"),
    _f("ei8_other_nonhaz", "P6-EI-8", "ei8_waste", "Total Waste generated — Other Non-hazardous waste generated (H)", "MT", "number", "project_supervisor", PROJ_TYPES, "SUM"),
    _f("ei8_recycled", "P6-EI-8", "ei8_waste", "Waste recovered — (i) Recycled", "MT", "number", "project_supervisor", PROJ_TYPES, "SUM"),
    _f("ei8_reused", "P6-EI-8", "ei8_waste", "Waste recovered — (ii) Re-used", "MT", "number", "project_supervisor", PROJ_TYPES, "SUM"),
    _f("ei8_other_recovery", "P6-EI-8", "ei8_waste", "Waste recovered — (iii) Other recovery operations", "MT", "number", "project_supervisor", PROJ_TYPES, "SUM"),
    _f("ei8_incineration", "P6-EI-8", "ei8_waste", "Waste disposed — (i) Incineration", "MT", "number", "project_supervisor", PROJ_TYPES, "SUM"),
    _f("ei8_landfilling", "P6-EI-8", "ei8_waste", "Waste disposed — (ii) Landfilling", "MT", "number", "project_supervisor", PROJ_TYPES, "SUM"),
    _f("ei8_other_disposal", "P6-EI-8", "ei8_waste", "Waste disposed — (iii) Other disposal operations", "MT", "number", "project_supervisor", PROJ_TYPES, "SUM"),

    # -----------------------------------------------------------------------
    # 2. PROJECT ADMIN — "Site Compliance"
    # -----------------------------------------------------------------------
    _f("pa_ei7_has_project", "P6-EI-7", "ei7_reduction", "Does the entity have any project related to reducing Green House Gas emission?", "", "yesno", "project_admin", PROJ_TYPES, "NONE"),
    _f(
        "pa_ei7_rows", "P6-EI-7", "ei7_reduction",
        "GHG reduction projects — Title & details", "", "table-rows", "project_admin", PROJ_TYPES, "LIST",
        columns=[{"key": "title", "label": "Project Title", "type": "text"}, {"key": "details", "label": "Details", "type": "text"}],
    ),
    _f(
        "pa_ei10_rows", "P6-EI-10", "ei10_eco",
        "Operations / offices in/around ecologically sensitive areas (where environmental approvals/clearances are required)", "", "table-rows", "project_admin", PROJ_TYPES, "LIST",
        columns=[
            {"key": "location", "label": "Location of operations / offices", "type": "text"},
            {"key": "type_of_operations", "label": "Type of operations", "type": "text"},
            {"key": "compliant", "label": "Compliant (Y/N)", "type": "yesno"},
            {"key": "corrective_action", "label": "If no, reasons & corrective action taken", "type": "text"},
        ],
    ),
    _f(
        "pa_ei11_rows", "P6-EI-11", "ei11_eia",
        "Details of environmental impact assessments of projects undertaken based on applicable laws", "", "table-rows", "project_admin", PROJ_TYPES, "LIST",
        columns=[
            {"key": "project", "label": "Name and brief details of project", "type": "text"},
            {"key": "notification_no", "label": "EIA Notification No.", "type": "text"},
            {"key": "date", "label": "Date", "type": "text"},
            {"key": "independent_agency", "label": "Conducted by independent agency (Y/N)", "type": "yesno"},
            {"key": "public_domain", "label": "Results communicated in public domain (Y/N)", "type": "yesno"},
            {"key": "web_link", "label": "Relevant Web link", "type": "text"},
        ],
    ),
    _f("pa_ei12_compliant", "P6-EI-12", "ei12_compliance", "Is the entity compliant with applicable environmental law / regulations / guidelines in India?", "", "yesno", "project_admin", PROJ_TYPES, "NONE"),
    _f(
        "pa_ei12_rows", "P6-EI-12", "ei12_compliance",
        "Non-compliance with environmental laws — Details, fines/penalties & corrective action", "", "table-rows", "project_admin", PROJ_TYPES, "LIST",
        columns=[
            {"key": "law", "label": "Applicable law / regulation / guideline", "type": "text"},
            {"key": "details", "label": "Provide details of the non-compliance", "type": "text"},
            {"key": "fines", "label": "Any fines / penalties / action taken by regulatory agencies", "type": "text"},
            {"key": "corrective_action", "label": "Corrective action taken", "type": "text"},
        ],
    ),
    _f(
        "pa_li5_rows", "P6-LI-5", "li5_biodiversity",
        "Biodiversity impact and steps taken to prevent/remediate (per EI-10 location)", "", "table-rows", "project_admin", PROJ_TYPES, "LIST",
        columns=[
            {"key": "location", "label": "EI-10 Location", "type": "text"},
            {"key": "biodiversity_impact", "label": "Biodiversity impact & prevention / remediation steps", "type": "text"},
        ],
    ),
    _f(
        "pa_li6_rows", "P6-LI-6", "li6_efficiency",
        "Initiatives undertaken on clean technology, energy efficiency, renewable energy, etc.", "", "table-rows", "project_admin", PROJ_TYPES, "LIST",
        columns=[
            {"key": "initiative", "label": "Initiative undertaken", "type": "text"},
            {"key": "details", "label": "Details of the initiative", "type": "text"},
            {"key": "outcome", "label": "Outcome of the initiative", "type": "text"},
        ],
    ),

    # -----------------------------------------------------------------------
    # 3. BU SUPERVISOR — "BU Value Chain"
    # -----------------------------------------------------------------------
    _f("bu_li4_scope3", "P6-LI-4", "li4_scope3", "Total Scope 3 emissions (Break-up of the GHG into CO2, CH4, N2O, HFCs, PFCs, SF6, NF3, if available)", "tCO2e", "number", "bu_supervisor", BU_TYPES, "SUM"),
    _f("bu_li8_adverse_impact", "P6-LI-8", "li8_vc_impact", "If any significant adverse environmental impact has arisen from the value chain, what mitigation or adaptation measures have been taken?", "", "text", "bu_supervisor", BU_TYPES, "NONE"),
    _f("bu_li9_vc_assessed_pct", "P6-LI-9", "li9_vc_assessed", "Percentage of value chain partners (by value of business done with such partners) that were assessed for environmental impacts", "%", "percent", "bu_supervisor", BU_TYPES, "NONE"),

    # -----------------------------------------------------------------------
    # 4. BU ADMIN — "BU Environmental Management"
    # -----------------------------------------------------------------------
    _f("bu_ei2_pat_applicable", "P6-EI-2", "ei2_pat", "Does the entity have any sites / facilities identified as designated consumers (DCs) under the Performance, Achieve and Trade (PAT) Scheme of the Government of India?", "", "yesno", "bu_admin", BU_TYPES, "NONE"),
    _f("bu_ei2_targets_achieved", "P6-EI-2", "ei2_pat", "If yes, disclose whether targets set under the PAT scheme have been achieved", "", "yesno", "bu_admin", BU_TYPES, "NONE"),
    _f("bu_ei2_remedial_action", "P6-EI-2", "ei2_pat", "In case targets have not been achieved, provide the remedial action taken, if any", "", "text", "bu_admin", BU_TYPES, "NONE"),
    _f("bu_ei4_zld_implemented", "P6-EI-4", "ei4_zld", "Has the entity implemented a mechanism for Zero Liquid Discharge?", "", "yesno", "bu_admin", BU_TYPES, "NONE"),
    _f("bu_ei4_zld_details", "P6-EI-4", "ei4_zld", "If yes, provide details of its coverage and implementation", "", "text", "bu_admin", BU_TYPES, "NONE"),
    _f("bu_ei9_waste_strategy", "P6-EI-9", "ei9_waste_strategy", "Briefly describe the waste management practices adopted in your establishments and strategy to reduce usage of hazardous and toxic chemicals", "", "text", "bu_admin", BU_TYPES, "NONE"),
    _f("bu_li7_bcp_plan", "P6-LI-7", "li7_bcp", "Does the entity have a business continuity and disaster management plan? Give details in 100 words / web link", "", "text", "bu_admin", BU_TYPES, "NONE"),

    # -----------------------------------------------------------------------
    # 5. SUBSIDIARY SUPERVISOR — "Subsidiary Initiatives"
    # -----------------------------------------------------------------------
    _f(
        "sub_ei7_rows", "P6-EI-7", "ei7_reduction",
        "Subsidiary GHG reduction projects — Title & details", "", "table-rows", "subsidiary_supervisor", SUB_TYPES, "LIST",
        columns=[{"key": "title", "label": "Project Title", "type": "text"}, {"key": "details", "label": "Details", "type": "text"}],
    ),
    _f(
        "sub_li6_rows", "P6-LI-6", "li6_efficiency",
        "Subsidiary resource efficiency & clean technology initiatives", "", "table-rows", "subsidiary_supervisor", SUB_TYPES, "LIST",
        columns=[
            {"key": "initiative", "label": "Initiative undertaken", "type": "text"},
            {"key": "details", "label": "Details of the initiative", "type": "text"},
            {"key": "outcome", "label": "Outcome of the initiative", "type": "text"},
        ],
    ),

    # -----------------------------------------------------------------------
    # 6. SUBSIDIARY ADMIN — "Subsidiary Compliance"
    # -----------------------------------------------------------------------
    _f("sub_ei12_compliant", "P6-EI-12", "ei12_compliance", "Subsidiary compliant with applicable environmental law / regulations / guidelines?", "", "yesno", "subsidiary_admin", SUB_TYPES, "NONE"),
    _f("sub_ei12_statement", "P6-EI-12", "ei12_compliance", "Compliance statement / explanation", "", "text", "subsidiary_admin", SUB_TYPES, "NONE"),
    _f(
        "sub_ei12_rows", "P6-EI-12", "ei12_compliance",
        "Subsidiary non-compliance rows (if any)", "", "table-rows", "subsidiary_admin", SUB_TYPES, "LIST",
        columns=[
            {"key": "law", "label": "Applicable law / regulation", "type": "text"},
            {"key": "details", "label": "Details of non-compliance", "type": "text"},
            {"key": "fines", "label": "Fines / penalties", "type": "text"},
            {"key": "corrective_action", "label": "Corrective action taken", "type": "text"},
        ],
    ),
    _f(
        "sub_ei11_rows", "P6-EI-11", "ei11_eia",
        "Subsidiary Environmental Impact Assessments (EIA)", "", "table-rows", "subsidiary_admin", SUB_TYPES, "LIST",
        columns=[
            {"key": "project", "label": "Name and brief details of project", "type": "text"},
            {"key": "notification_no", "label": "EIA Notification No.", "type": "text"},
            {"key": "date", "label": "Date", "type": "text"},
            {"key": "independent_agency", "label": "Independent agency (Y/N)", "type": "yesno"},
            {"key": "public_domain", "label": "Public domain (Y/N)", "type": "yesno"},
            {"key": "web_link", "label": "Relevant Web link", "type": "text"},
        ],
    ),

    # -----------------------------------------------------------------------
    # 7. GROUP SUPERVISOR — "Group Policy & Targets" (Section B 1-6, 10 for P6)
    # -----------------------------------------------------------------------
    _f("grp_secb_1_policy_coverage", "SEC-B-1", "sec_b_policy", "1a. Whether your entity's policy/policies cover Principle 6 and its core elements (Yes/No)", "", "yesno", "group_supervisor", GRP_TYPES, "NONE"),
    _f("grp_secb_2_board_approval", "SEC-B-2", "sec_b_policy", "1b. Has the policy been approved by the Board? (Yes/No)", "", "yesno", "group_supervisor", GRP_TYPES, "NONE"),
    _f("grp_secb_3_web_link", "SEC-B-3", "sec_b_policy", "1c. Web Link of the Policies, if available", "", "text", "group_supervisor", GRP_TYPES, "NONE"),
    _f("grp_secb_4_procedures", "SEC-B-4", "sec_b_policy", "2. Whether the entity has translated the policy into procedures (Yes/No)", "", "yesno", "group_supervisor", GRP_TYPES, "NONE"),
    _f("grp_secb_5_value_chain_ext", "SEC-B-5", "sec_b_policy", "3. Do the enlisted policies extend to your value chain partners? (Yes/No)", "", "yesno", "group_supervisor", GRP_TYPES, "NONE"),
    _f("grp_secb_6_standards", "SEC-B-6", "sec_b_policy", "4. Name of the national and international codes/certifications/labels/standards (e.g. ISO 14001, SA 8000)", "", "text", "group_supervisor", GRP_TYPES, "NONE"),
    _f("grp_secb_10_targets", "SEC-B-10", "sec_b_policy", "5. Specific commitments, goals and targets set by the entity with defined timelines, if any", "", "text", "group_supervisor", GRP_TYPES, "NONE"),
    _f("grp_secb_10_performance", "SEC-B-10", "sec_b_policy", "6. Performance of the entity against the specific commitments, goals and targets along-with reasons in case the same are not met", "", "text", "group_supervisor", GRP_TYPES, "NONE"),
    _f(
        "grp_secb_10_review_rows", "SEC-B-10", "sec_b_policy",
        "10. Details of Review of NGRBCs by the Company (Performance & Compliance)", "", "table-rows", "group_supervisor", GRP_TYPES, "LIST",
        columns=[
            {"key": "subject", "label": "Subject for Review", "type": "text"},
            {"key": "reviewed_by", "label": "Indicate whether review was undertaken by Director / Committee of the Board / Any other Committee", "type": "text"},
            {"key": "frequency", "label": "Frequency (Annually / Half yearly / Quarterly / Any other)", "type": "text"},
        ],
    ),

    # -----------------------------------------------------------------------
    # 8. GROUP ADMIN — "Group Disclosures & Assurance"
    # -----------------------------------------------------------------------
    _f(
        "grp_seca_1_24_rows", "SEC-A (1-24)", "sec_a_profile",
        "Section A: General Disclosures (Items 1–24)", "", "table-rows", "group_admin", GRP_TYPES, "LIST",
        columns=[
            {"key": "item_no", "label": "Item #", "type": "text"},
            {"key": "particulars", "label": "Particulars", "type": "text"},
            {"key": "response", "label": "Details / Response", "type": "text"},
        ],
    ),
    _f("grp_secb_7_committee", "SEC-B-7", "sec_b_gov", "7. Statement by director responsible for the business responsibility report, highlighting ESG related challenges, targets and achievements", "", "text", "group_admin", GRP_TYPES, "NONE"),
    _f("grp_secb_8_highest_authority", "SEC-B-8", "sec_b_gov", "8. Details of the highest authority responsible for implementation and oversight of the Business Responsibility policy (ies)", "", "text", "group_admin", GRP_TYPES, "NONE"),
    _f("grp_secb_9_independent_eval", "SEC-B-9", "sec_b_gov", "9. Does the entity have a specified Committee of the Board/ Director responsible for decision making on sustainability related issues? (Yes/No & Details)", "", "text", "group_admin", GRP_TYPES, "NONE"),
    _f("grp_secb_11_external_assessment", "SEC-B-11", "sec_b_gov", "11. Has the entity carried out independent assessment/ evaluation of the working of its policies by an external agency? (Yes/No & Agency Name)", "", "text", "group_admin", GRP_TYPES, "NONE"),
    _f(
        "grp_p6_assurance_rows", "P6-ASSURANCE", "p6_assurance",
        "External Assurance Note for Principle 6 Indicators (EI-1, EI-3, EI-5, EI-6, EI-8, LI-1, LI-2, LI-3, LI-4)", "", "table-rows", "group_admin", GRP_TYPES, "LIST",
        columns=[
            {"key": "indicator", "label": "Indicator", "type": "text"},
            {"key": "assured", "label": "Assured (Y/N)", "type": "yesno"},
            {"key": "agency_name", "label": "Name of Assurance Agency", "type": "text"},
        ],
    ),
]

REGISTRY_BY_ID: Dict[str, Dict[str, Any]] = {f["id"]: f for f in P6_REGISTRY}


def get_fields_for_role(role: str, node_type: Optional[str] = None) -> List[Dict[str, Any]]:
    """Return ONLY fields whose ownerRole == normalized role (and optionally matching node_type)."""
    norm_role = normalize_p6_role(role)
    out: List[Dict[str, Any]] = []
    nt = (node_type or "").lower()
    for f in P6_REGISTRY:
        if f["ownerRole"] != norm_role:
            continue
        if nt and f.get("nodeTypes") and nt not in f["nodeTypes"]:
            # If node is a generic 'project', skip plant-only EI-5 unless node_type is plant/manufacturing
            if f["nodeTypes"] == PLANT_TYPES:
                continue
        out.append(f)
    return out

