import logging
from sqlalchemy.orm import Session
from app.modules.metrics.models import Metric, AggregationType, IndicatorType, EvidenceRule, MetricCategory

logger = logging.getLogger(__name__)

MVP_METRICS = [
    {
        "code": "ENV-ENERGY-001",
        "name": "Total electricity consumption",
        "definition": "Disclose total electricity consumed in MWh/GJ, including purchased and self-generated renewable and non-renewable electricity.",
        "category": MetricCategory.ENVIRONMENT.value,
        "section": "Section C",
        "principle": 6,
        "indicator_type": IndicatorType.ESSENTIAL.value,
        "brsr_core": True,
        "core_attribute": "Core Energy Consumption",
        "data_type": "numeric",
        "base_unit": "MWh",
        "allowed_units": ["kWh", "MWh", "GJ"],
        "aggregation_type": AggregationType.SUM.value,
        "evidence_rule": EvidenceRule.MANDATORY.value,
        "frequency": "monthly",
        "owner_role": "site_collector"
    },
    {
        "code": "ENV-ENERGY-002",
        "name": "Fuel consumption (diesel, petrol, gas)",
        "definition": "Capture fuel consumption in physical units (litres, kL, kg) converted to gigajoules (GJ) using documented calorific factors.",
        "category": MetricCategory.ENVIRONMENT.value,
        "section": "Section C",
        "principle": 6,
        "indicator_type": IndicatorType.ESSENTIAL.value,
        "brsr_core": False,
        "core_attribute": None,
        "data_type": "numeric",
        "base_unit": "GJ",
        "allowed_units": ["Litres", "kL", "GJ"],
        "aggregation_type": AggregationType.SUM.value,
        "evidence_rule": EvidenceRule.MANDATORY.value,
        "frequency": "monthly",
        "owner_role": "site_collector"
    },
    {
        "code": "ENV-GHG-001",
        "name": "Scope 1 emissions",
        "definition": "Gross direct GHG emissions resulting from fuel combustion in stationary and mobile sources owned or controlled by MEIL.",
        "category": MetricCategory.ENVIRONMENT.value,
        "section": "Section C",
        "principle": 6,
        "indicator_type": IndicatorType.ESSENTIAL.value,
        "brsr_core": True,
        "core_attribute": "Scope 1 GHG Intensity",
        "data_type": "numeric",
        "base_unit": "tCO2e",
        "allowed_units": ["tCO2e", "kgCO2e"],
        "aggregation_type": AggregationType.SUM.value,
        "evidence_rule": EvidenceRule.MANDATORY.value,
        "frequency": "monthly",
        "owner_role": "site_collector"
    },
    {
        "code": "ENV-GHG-002",
        "name": "Scope 2 emissions (location-based)",
        "definition": "Gross indirect GHG emissions from generation of purchased or acquired electricity, heating, or cooling.",
        "category": MetricCategory.ENVIRONMENT.value,
        "section": "Section C",
        "principle": 6,
        "indicator_type": IndicatorType.ESSENTIAL.value,
        "brsr_core": True,
        "core_attribute": "Scope 2 GHG Intensity",
        "data_type": "numeric",
        "base_unit": "tCO2e",
        "allowed_units": ["tCO2e", "kgCO2e"],
        "aggregation_type": AggregationType.SUM.value,
        "evidence_rule": EvidenceRule.MANDATORY.value,
        "frequency": "monthly",
        "owner_role": "site_collector"
    },
    {
        "code": "ENV-WATER-001",
        "name": "Water withdrawal and consumption",
        "definition": "Total volume of water withdrawn and consumed across surface water, groundwater, seawater, and third-party municipal suppliers.",
        "category": MetricCategory.ENVIRONMENT.value,
        "section": "Section C",
        "principle": 6,
        "indicator_type": IndicatorType.ESSENTIAL.value,
        "brsr_core": True,
        "core_attribute": "Water Intensity",
        "data_type": "numeric",
        "base_unit": "m3",
        "allowed_units": ["m3", "kL", "Litres"],
        "aggregation_type": AggregationType.SUM.value,
        "evidence_rule": EvidenceRule.MANDATORY.value,
        "frequency": "monthly",
        "owner_role": "site_collector"
    },
    {
        "code": "ENV-WASTE-001",
        "name": "Waste generated and disposed",
        "definition": "Total quantity of hazardous and non-hazardous construction, municipal, and industrial waste generated and diverted/disposed.",
        "category": MetricCategory.ENVIRONMENT.value,
        "section": "Section C",
        "principle": 6,
        "indicator_type": IndicatorType.ESSENTIAL.value,
        "brsr_core": True,
        "core_attribute": "Waste Intensity",
        "data_type": "numeric",
        "base_unit": "tonnes",
        "allowed_units": ["tonnes", "kg"],
        "aggregation_type": AggregationType.SUM.value,
        "evidence_rule": EvidenceRule.MANDATORY.value,
        "frequency": "monthly",
        "owner_role": "site_collector"
    },
    {
        "code": "SOC-SAFE-001",
        "name": "Lost Time Injury Frequency Rate (LTIFR)",
        "definition": "Number of lost time injuries per 1,000,000 person-hours worked across direct employees and contractual workers.",
        "category": MetricCategory.SOCIAL.value,
        "section": "Section C",
        "principle": 3,
        "indicator_type": IndicatorType.ESSENTIAL.value,
        "brsr_core": True,
        "core_attribute": "Safety Rate",
        "data_type": "numeric",
        "base_unit": "per 1,000,000 h",
        "allowed_units": ["per 1,000,000 h"],
        "aggregation_type": AggregationType.RATIO.value,
        "evidence_rule": EvidenceRule.MANDATORY.value,
        "frequency": "monthly",
        "owner_role": "site_collector"
    },
    {
        "code": "SOC-SAFE-002",
        "name": "Workplace Fatalities (direct + contract)",
        "definition": "Number of fatal incidents resulting from work-related injuries involving direct employees and contractor workforces.",
        "category": MetricCategory.SOCIAL.value,
        "section": "Section C",
        "principle": 3,
        "indicator_type": IndicatorType.ESSENTIAL.value,
        "brsr_core": False,
        "core_attribute": None,
        "data_type": "integer",
        "base_unit": "count",
        "allowed_units": ["count"],
        "aggregation_type": AggregationType.SUM.value,
        "evidence_rule": EvidenceRule.MANDATORY.value,
        "frequency": "monthly",
        "owner_role": "site_collector"
    },
    {
        "code": "SOC-EMP-001",
        "name": "Workforce breakdown by gender and category",
        "definition": "Total headcount of permanent employees, other employees, and contractual workers disaggregated by gender.",
        "category": MetricCategory.SOCIAL.value,
        "section": "Section A and C",
        "principle": 3,
        "indicator_type": IndicatorType.ESSENTIAL.value,
        "brsr_core": True,
        "core_attribute": "Gender Diversity",
        "data_type": "integer",
        "base_unit": "count",
        "allowed_units": ["count"],
        "aggregation_type": AggregationType.SUM.value,
        "evidence_rule": EvidenceRule.MANDATORY.value,
        "frequency": "monthly",
        "owner_role": "site_collector"
    },
    {
        "code": "SOC-WELF-001",
        "name": "Training hours per employee",
        "definition": "Average training hours on health, safety, skill upgradation, and human rights delivered per employee/worker.",
        "category": MetricCategory.SOCIAL.value,
        "section": "Section C",
        "principle": 3,
        "indicator_type": IndicatorType.ESSENTIAL.value,
        "brsr_core": False,
        "core_attribute": None,
        "data_type": "numeric",
        "base_unit": "hours",
        "allowed_units": ["hours"],
        "aggregation_type": AggregationType.RATIO.value,
        "evidence_rule": EvidenceRule.MANDATORY.value,
        "frequency": "monthly",
        "owner_role": "site_collector"
    },
    {
        "code": "GOV-ETH-001",
        "name": "Anti-corruption & ethics training coverage",
        "definition": "Percentage of Board members, key managerial personnel, and employees briefed or trained on anti-corruption policies.",
        "category": MetricCategory.GOVERNANCE.value,
        "section": "Section C",
        "principle": 1,
        "indicator_type": IndicatorType.ESSENTIAL.value,
        "brsr_core": False,
        "core_attribute": None,
        "data_type": "percentage",
        "base_unit": "%",
        "allowed_units": ["%"],
        "aggregation_type": AggregationType.WEIGHTED_PCT.value,
        "evidence_rule": EvidenceRule.MANDATORY.value,
        "frequency": "monthly",
        "owner_role": "site_collector"
    },
    {

        "code": "GOV-COMP-001",
        "name": "Stakeholder complaints received and resolved",
        "definition": "Number of complaints received, resolved, and pending across communities, workers, customers, and investors.",
        "category": MetricCategory.GOVERNANCE.value,
        "section": "Section C",
        "principle": 1,
        "indicator_type": IndicatorType.ESSENTIAL.value,
        "brsr_core": False,
        "core_attribute": None,
        "data_type": "integer",
        "base_unit": "count",
        "allowed_units": ["count"],
        "aggregation_type": AggregationType.SUM.value,
        "evidence_rule": EvidenceRule.MANDATORY.value,
        "frequency": "monthly",
        "owner_role": "site_collector"
    },

    # =========================================================================
    # SCOPE 1 SUBCATEGORIES (Director's P0 Requirement)
    # The legacy ENV-GHG-001 is preserved for backward compat.
    # These 4 codes represent GHG Protocol sub-categories that roll up into it.
    # =========================================================================
    {
        "code": "ENV-GHG-001A",
        "name": "Scope 1 – Stationary Combustion",
        "definition": (
            "Direct GHG emissions from fuel combustion in stationary equipment owned or controlled by the entity: "
            "DG sets, boilers, furnaces, kilns, heaters, and gensets. "
            "Source: BEE PAT Manual 2023 / MoPNG. Report in tCO2e."
        ),
        "category": MetricCategory.ENVIRONMENT.value,
        "section": "Section C",
        "principle": 6,
        "indicator_type": IndicatorType.ESSENTIAL.value,
        "brsr_core": True,
        "core_attribute": "Scope 1 GHG – Stationary",
        "data_type": "numeric",
        "base_unit": "tCO2e",
        "allowed_units": ["tCO2e", "kgCO2e"],
        "aggregation_type": AggregationType.SUM.value,
        "evidence_rule": EvidenceRule.MANDATORY.value,
        "frequency": "monthly",
        "owner_role": "site_collector",
        "calc_formula_code": "CALC-GHG-SCOPE1-STATIONARY",
    },
    {
        "code": "ENV-GHG-001B",
        "name": "Scope 1 – Mobile Combustion",
        "definition": (
            "Direct GHG emissions from fuel combustion in mobile sources owned or controlled by the entity: "
            "company cars, trucks, buses, construction equipment (excavators, cranes, compactors), and marine vessels. "
            "Source: BEE PAT Manual 2023 / IPCC 2006. Report in tCO2e."
        ),
        "category": MetricCategory.ENVIRONMENT.value,
        "section": "Section C",
        "principle": 6,
        "indicator_type": IndicatorType.ESSENTIAL.value,
        "brsr_core": True,
        "core_attribute": "Scope 1 GHG – Mobile",
        "data_type": "numeric",
        "base_unit": "tCO2e",
        "allowed_units": ["tCO2e", "kgCO2e"],
        "aggregation_type": AggregationType.SUM.value,
        "evidence_rule": EvidenceRule.MANDATORY.value,
        "frequency": "monthly",
        "owner_role": "site_collector",
        "calc_formula_code": "CALC-GHG-SCOPE1-MOBILE",
    },
    {
        "code": "ENV-GHG-001C",
        "name": "Scope 1 – Process Emissions",
        "definition": (
            "Direct GHG emissions arising from industrial or chemical processes at the facility that are not "
            "the result of combustion: welding acetylene, galvanizing HCl, cement clinker calcination, "
            "steel making, or other material transformation processes. "
            "Source: IPCC 2006 Tier 2 / MoEFCC. Report in tCO2e."
        ),
        "category": MetricCategory.ENVIRONMENT.value,
        "section": "Section C",
        "principle": 6,
        "indicator_type": IndicatorType.ESSENTIAL.value,
        "brsr_core": False,
        "core_attribute": None,
        "data_type": "numeric",
        "base_unit": "tCO2e",
        "allowed_units": ["tCO2e", "kgCO2e"],
        "aggregation_type": AggregationType.SUM.value,
        "evidence_rule": EvidenceRule.MANDATORY.value,
        "frequency": "monthly",
        "owner_role": "site_collector",
        "calc_formula_code": "CALC-GHG-SCOPE1-PROCESS",
    },
    {
        "code": "ENV-GHG-001D",
        "name": "Scope 1 – Fugitive Emissions",
        "definition": (
            "Direct GHG emissions from intentional or unintentional releases: HVAC refrigerant leaks "
            "(HCFC-22, HFC-32, HFC-410A), SF6 gas from HV electrical switchgear, and fugitive methane "
            "from biogas systems. Report refrigerant consumption quantities; conversion to tCO2e uses IPCC AR4 GWPs "
            "as adopted by MoEFCC India."
        ),
        "category": MetricCategory.ENVIRONMENT.value,
        "section": "Section C",
        "principle": 6,
        "indicator_type": IndicatorType.ESSENTIAL.value,
        "brsr_core": False,
        "core_attribute": None,
        "data_type": "numeric",
        "base_unit": "tCO2e",
        "allowed_units": ["tCO2e", "kgCO2e"],
        "aggregation_type": AggregationType.SUM.value,
        "evidence_rule": EvidenceRule.MANDATORY.value,
        "frequency": "monthly",
        "owner_role": "site_collector",
        "calc_formula_code": "CALC-GHG-SCOPE1-FUGITIVE",
    },

    # =========================================================================
    # SCOPE 2 SPLIT — Grid vs. Renewable (Director's P1 Requirement)
    # =========================================================================
    {
        "code": "ENV-GHG-002A",
        "name": "Scope 2 – Grid Electricity (Non-Renewable)",
        "definition": (
            "Indirect GHG emissions from purchased grid electricity sourced from coal/gas-fired power stations. "
            "Use CEA CO2 Baseline Database (national or state-specific factor). "
            "Report the net fossil grid electricity consumed in MWh and the tCO2e calculated. "
            "Exclude any electricity covered under ENV-GHG-002B."
        ),
        "category": MetricCategory.ENVIRONMENT.value,
        "section": "Section C",
        "principle": 6,
        "indicator_type": IndicatorType.ESSENTIAL.value,
        "brsr_core": True,
        "core_attribute": "Scope 2 GHG – Grid (Location-Based)",
        "data_type": "numeric",
        "base_unit": "tCO2e",
        "allowed_units": ["tCO2e", "kgCO2e"],
        "aggregation_type": AggregationType.SUM.value,
        "evidence_rule": EvidenceRule.MANDATORY.value,
        "frequency": "monthly",
        "owner_role": "site_collector",
        "calc_formula_code": "CALC-GHG-SCOPE2-GRID",
    },
    {
        "code": "ENV-GHG-002B",
        "name": "Scope 2 – Renewable / Green Electricity",
        "definition": (
            "Electricity consumed from renewable sources: rooftop solar (captive), open-access solar/wind PPA, "
            "wheeled renewable energy, or green tariff supply. Zero emission factor applies. "
            "Report quantity in MWh. Evidence: REC certificate, PPA agreement, DISCOM green tariff invoice, "
            "or net-metering statement."
        ),
        "category": MetricCategory.ENVIRONMENT.value,
        "section": "Section C",
        "principle": 6,
        "indicator_type": IndicatorType.ESSENTIAL.value,
        "brsr_core": True,
        "core_attribute": "Scope 2 GHG – Renewable",
        "data_type": "numeric",
        "base_unit": "MWh",
        "allowed_units": ["MWh", "kWh"],
        "aggregation_type": AggregationType.SUM.value,
        "evidence_rule": EvidenceRule.MANDATORY.value,
        "frequency": "monthly",
        "owner_role": "site_collector",
        "calc_formula_code": "CALC-GHG-SCOPE2-RENEWABLE",
    },

    # =========================================================================
    # SCOPE 3 CATEGORIES (Director's P0 Requirement)
    # SEBI BRSR Core requires disclosure of material Scope 3 categories.
    # Starting with the 4 most material categories for MEIL's business
    # (infrastructure & construction sector).
    # =========================================================================
    {
        "code": "ENV-GHG-003A",
        "name": "Scope 3 – Business Travel",
        "definition": (
            "Indirect GHG emissions from employee travel on business in vehicles not owned or controlled by MEIL: "
            "domestic and international flights, Indian Railways (trains), road travel by hired taxi/cab. "
            "Calculate using distance (passenger-km) × mode emission factor. "
            "Source: Indian Railways Sustainability Report / DGCA / MoPNG / IPCC 2006."
        ),
        "category": MetricCategory.ENVIRONMENT.value,
        "section": "Section C",
        "principle": 6,
        "indicator_type": IndicatorType.ESSENTIAL.value,
        "brsr_core": True,
        "core_attribute": "Scope 3 GHG – Business Travel",
        "data_type": "numeric",
        "base_unit": "tCO2e",
        "allowed_units": ["tCO2e", "kgCO2e"],
        "aggregation_type": AggregationType.SUM.value,
        "evidence_rule": EvidenceRule.MANDATORY.value,
        "frequency": "monthly",
        "owner_role": "site_collector",
        "calc_formula_code": "CALC-GHG-SCOPE3-TRAVEL",
    },
    {
        "code": "ENV-GHG-003B",
        "name": "Scope 3 – Employee Commuting",
        "definition": (
            "Indirect GHG emissions from employee commuting between home and workplace in vehicles not owned "
            "by MEIL: site buses hired, personal vehicles, public transport. "
            "Use distance (km/day × working days) × occupancy × emission factor. "
            "Source: MoPNG PPAC / IPCC 2006."
        ),
        "category": MetricCategory.ENVIRONMENT.value,
        "section": "Section C",
        "principle": 6,
        "indicator_type": IndicatorType.ESSENTIAL.value,
        "brsr_core": False,
        "core_attribute": None,
        "data_type": "numeric",
        "base_unit": "tCO2e",
        "allowed_units": ["tCO2e", "kgCO2e"],
        "aggregation_type": AggregationType.SUM.value,
        "evidence_rule": EvidenceRule.CONDITIONAL.value,
        "frequency": "monthly",
        "owner_role": "site_collector",
        "calc_formula_code": "CALC-GHG-SCOPE3-COMMUTE",
    },
    {
        "code": "ENV-GHG-003C",
        "name": "Scope 3 – Purchased Goods and Materials",
        "definition": (
            "Indirect GHG emissions from the extraction, production, and transportation of goods and materials "
            "purchased by MEIL (upstream): steel, cement, aluminium, copper, aggregates, and other bulk materials. "
            "Use physical quantity (tonnes) × material emission factor. "
            "Source: SAIL / worldsteel / CMA India / MoEFCC 2023."
        ),
        "category": MetricCategory.ENVIRONMENT.value,
        "section": "Section C",
        "principle": 6,
        "indicator_type": IndicatorType.LEADERSHIP.value,
        "brsr_core": True,
        "core_attribute": "Scope 3 GHG – Upstream Materials",
        "data_type": "numeric",
        "base_unit": "tCO2e",
        "allowed_units": ["tCO2e", "kgCO2e"],
        "aggregation_type": AggregationType.SUM.value,
        "evidence_rule": EvidenceRule.CONDITIONAL.value,
        "frequency": "monthly",
        "owner_role": "site_collector",
        "calc_formula_code": "CALC-GHG-SCOPE3-PURCHASED-GOODS",
    },
    {
        "code": "ENV-GHG-003D",
        "name": "Scope 3 – Upstream Transportation and Logistics",
        "definition": (
            "Indirect GHG emissions from transportation of purchased goods and materials to MEIL's facilities "
            "in vehicles not owned or controlled by MEIL: third-party logistics trucks, rail freight. "
            "Use tonne-km × freight emission factor (HCV diesel / Indian Railways). "
            "Source: CPCB / MoPNG / Indian Railways 2022–23."
        ),
        "category": MetricCategory.ENVIRONMENT.value,
        "section": "Section C",
        "principle": 6,
        "indicator_type": IndicatorType.LEADERSHIP.value,
        "brsr_core": False,
        "core_attribute": None,
        "data_type": "numeric",
        "base_unit": "tCO2e",
        "allowed_units": ["tCO2e", "kgCO2e"],
        "aggregation_type": AggregationType.SUM.value,
        "evidence_rule": EvidenceRule.CONDITIONAL.value,
        "frequency": "monthly",
        "owner_role": "site_collector",
        "calc_formula_code": "CALC-GHG-SCOPE3-LOGISTICS",
    },

    # =========================================================================
    # SCOPE 3 — CAPITAL GOODS  (GHG Protocol Cat 2 — Director's P0)
    # Embodied carbon in heavy plant & equipment procured by MEIL.
    # Material for infrastructure sector per SEBI BRSR Core guidance.
    # =========================================================================
    {
        "code": "ENV-GHG-003E",
        "name": "Scope 3 – Capital Goods",
        "definition": (
            "Indirect GHG emissions from the extraction, production, and manufacturing of capital goods "
            "purchased or acquired by MEIL during the reporting period: excavators, cranes, compactors, "
            "pipe-layers, boring rigs, HV transformers, and DG sets. "
            "Calculate using equipment weight (tonnes) × embodied carbon factor (tCO2e/t) — "
            "sourced from worldsteel 2023 and IPCC 2006 Tier 1. "
            "Spend-based method (INR Lakh × sector EF) acceptable as per SEBI BRSR Core guidance "
            "where weight data is unavailable. "
            "Source: worldsteel 2023 / IPCC 2006 Tier 1 / BEE India."
        ),
        "category": MetricCategory.ENVIRONMENT.value,
        "section": "Section C",
        "principle": 6,
        "indicator_type": IndicatorType.LEADERSHIP.value,
        "brsr_core": True,
        "core_attribute": "Scope 3 GHG – Capital Goods",
        "data_type": "numeric",
        "base_unit": "tCO2e",
        "allowed_units": ["tCO2e", "kgCO2e"],
        "aggregation_type": AggregationType.SUM.value,
        "evidence_rule": EvidenceRule.CONDITIONAL.value,
        "frequency": "annual",               # Capital goods purchased annually
        "owner_role": "maker",
        "calc_formula_code": "CALC-GHG-SCOPE3-CAPITAL-GOODS",
    },

    # =========================================================================
    # SCOPE 3 — WASTE GENERATED IN OPERATIONS  (GHG Protocol Cat 5 — Director's P0)
    # GHG from disposal of C&D debris, hazardous, MSW, e-waste from sites.
    # Material for construction sector — mandated by SEBI BRSR Principle 6 E7.
    # =========================================================================
    {
        "code": "ENV-GHG-003F",
        "name": "Scope 3 – Waste Generated in Operations",
        "definition": (
            "Indirect GHG emissions from the disposal and treatment of solid and liquid waste "
            "generated at MEIL's construction sites and facilities: "
            "C&D debris (landfill / recycled), municipal solid waste from site camps and offices, "
            "hazardous waste (oily rags, spent solvents, contaminated soil), e-waste (cables, switchgear), "
            "and wastewater. "
            "Calculate using waste quantity (tonnes) × disposal route emission factor (tCO2e/t). "
            "Factors from CPCB SWM Report 2022–23, MoEFCC C&D Waste Management Rules 2016, "
            "IPCC 2006 Waste Chapter (India Tier 1 methane correction factors)."
        ),
        "category": MetricCategory.ENVIRONMENT.value,
        "section": "Section C",
        "principle": 6,
        "indicator_type": IndicatorType.ESSENTIAL.value,
        "brsr_core": True,
        "core_attribute": "Scope 3 GHG – Waste in Operations",
        "data_type": "numeric",
        "base_unit": "tCO2e",
        "allowed_units": ["tCO2e", "kgCO2e"],
        "aggregation_type": AggregationType.SUM.value,
        "evidence_rule": EvidenceRule.MANDATORY.value,
        "frequency": "monthly",
        "owner_role": "maker",
        "calc_formula_code": "CALC-GHG-SCOPE3-WASTE",
    },
]

def seed_metrics(db: Session):
    """Inserts or updates all BRSR metric indicators in the Metric Catalogue."""
    count = 0
    for m_data in MVP_METRICS:
        existing = db.query(Metric).filter(Metric.code == m_data["code"]).first()
        if not existing:
            metric = Metric(**m_data)
            db.add(metric)
            count += 1
        else:
            for k, v in m_data.items():
                setattr(existing, k, v)
    db.commit()
    logger.info(f"Seeded/updated {count} standard BRSR metrics.")

