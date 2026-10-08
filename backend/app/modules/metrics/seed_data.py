import logging
from sqlalchemy.orm import Session
from app.modules.metrics.models import Metric, AggregationType, IndicatorType, EvidenceRule, MetricCategory, EntryLevel

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
        "owner_role": "site_collector",
        "entry_level": EntryLevel.PROJECT.value,
        "guidance_text": "Enter total electricity consumed at this site from the grid (DISCOM supply) during the month.",
        "why_needed": "Mandated under SEBI BRSR Principle 6 (Scope 2 GHG Disclosure). Drives the grid emission calculation using CEA state factor.",
        "document_hint": "Upload the monthly DISCOM electricity bill (PDF). Meter serial number must be visible."
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
        "owner_role": "site_collector",
        "entry_level": EntryLevel.PROJECT.value,
        "guidance_text": "Enter total fuel consumed (diesel, petrol, LPG, natural gas) in physical units. Do not convert — the system calculates GJ automatically.",
        "why_needed": "Required for Scope 1 GHG calculation under SEBI BRSR Principle 6 and BEE PAT scheme reporting.",
        "document_hint": "Upload fuel delivery challan from IOCL/BPCL/HPCL, or DG logbook stamped by site engineer."
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
        "entry_level": EntryLevel.PROJECT.value,
        "guidance_text": "Enter total diesel/fuel consumed in DG sets, boilers, and fixed combustion equipment at this site.",
        "why_needed": "Scope 1 direct emission under GHG Protocol and SEBI BRSR Core. Calculated using BEE PAT Manual 2023 factors.",
        "document_hint": "Upload DG logbook (daily fuel consumption register) or vendor fuel delivery challan. Stamp of site engineer required.",
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
        "entry_level": EntryLevel.PROJECT.value,
        "guidance_text": "Enter total fuel consumed in excavators, cranes, compactors, trucks, and other mobile equipment at this site.",
        "why_needed": "Scope 1 mobile combustion under GHG Protocol and SEBI BRSR. One of the highest emission sources in construction projects.",
        "document_hint": "Upload equipment fuel logbook (vehicle-wise daily diesel issue register) or bulk fuel tanker receipts.",
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
    {
        "code": "ENV-GHG-001B-DSL",
        "name": "Scope 1 – Mobile Combustion (Diesel / HSD)",
        "definition": (
            "Direct GHG emissions from mobile combustion in diesel-powered vehicles and construction equipment: "
            "excavators, dump trucks, cranes, compactors, and transit mixers. "
            "Calculated as Litres × 0.00268 tCO2e/L. Source: BEE PAT Manual 2023 / MoPNG PPAC."
        ),
        "category": MetricCategory.ENVIRONMENT.value,
        "section": "Section C",
        "principle": 6,
        "indicator_type": IndicatorType.ESSENTIAL.value,
        "brsr_core": True,
        "core_attribute": "Scope 1 GHG – Mobile Diesel",
        "data_type": "numeric",
        "base_unit": "tCO2e",
        "allowed_units": ["tCO2e", "kgCO2e"],
        "aggregation_type": AggregationType.SUM.value,
        "evidence_rule": EvidenceRule.MANDATORY.value,
        "frequency": "monthly",
        "owner_role": "site_collector",
        "entry_level": EntryLevel.PROJECT.value,
        "guidance_text": "Enter diesel/HSD fuel consumed in mobile construction equipment and transport vehicles.",
        "why_needed": "Scope 1 mobile diesel combustion under SEBI BRSR Principle 6 Indicator E1.",
        "document_hint": "Upload vehicle diesel logbook or HSD fuel dispenser meter readings.",
        "calc_formula_code": "CALC-GHG-SCOPE1-MOBILE-DIESEL",
    },
    {
        "code": "ENV-GHG-001B-PET",
        "name": "Scope 1 – Mobile Combustion (Petrol / MS)",
        "definition": (
            "Direct GHG emissions from petrol-fueled fleet vehicles, site inspection cars, and light commercial vehicles. "
            "Calculated as Litres × 0.00231 tCO2e/L. Source: BEE PAT Manual 2023 / MoPNG PPAC."
        ),
        "category": MetricCategory.ENVIRONMENT.value,
        "section": "Section C",
        "principle": 6,
        "indicator_type": IndicatorType.ESSENTIAL.value,
        "brsr_core": True,
        "core_attribute": "Scope 1 GHG – Mobile Petrol",
        "data_type": "numeric",
        "base_unit": "tCO2e",
        "allowed_units": ["tCO2e", "kgCO2e"],
        "aggregation_type": AggregationType.SUM.value,
        "evidence_rule": EvidenceRule.MANDATORY.value,
        "frequency": "monthly",
        "owner_role": "site_collector",
        "entry_level": EntryLevel.PROJECT.value,
        "guidance_text": "Enter petrol consumed in company-owned/leased cars and utility vehicles.",
        "why_needed": "Scope 1 mobile petrol combustion under SEBI BRSR Principle 6 Indicator E1.",
        "document_hint": "Upload petrol pump fuel slips or fleet card monthly summary.",
        "calc_formula_code": "CALC-GHG-SCOPE1-MOBILE-PETROL",
    },
    {
        "code": "ENV-GHG-001B-CNG",
        "name": "Scope 1 – Mobile Combustion (CNG)",
        "definition": (
            "Direct GHG emissions from Compressed Natural Gas (CNG) powered buses, vans, and light commercial vehicles. "
            "Calculated as kg × 0.00221 tCO2e/kg. Source: MoPNG PPAC 2023 / MoEFCC."
        ),
        "category": MetricCategory.ENVIRONMENT.value,
        "section": "Section C",
        "principle": 6,
        "indicator_type": IndicatorType.ESSENTIAL.value,
        "brsr_core": True,
        "core_attribute": "Scope 1 GHG – Mobile CNG",
        "data_type": "numeric",
        "base_unit": "tCO2e",
        "allowed_units": ["tCO2e", "kgCO2e"],
        "aggregation_type": AggregationType.SUM.value,
        "evidence_rule": EvidenceRule.MANDATORY.value,
        "frequency": "monthly",
        "owner_role": "site_collector",
        "entry_level": EntryLevel.PROJECT.value,
        "guidance_text": "Enter CNG quantity consumed in company fleet vehicles in kg.",
        "why_needed": "Scope 1 mobile CNG combustion under SEBI BRSR Principle 6 Indicator E1.",
        "document_hint": "Upload CNG filling station receipts or fleet logbook.",
        "calc_formula_code": "CALC-GHG-SCOPE1-MOBILE-CNG",
    },
    {
        "code": "ENV-GHG-001D-REF",
        "name": "Scope 1 – Fugitive Emissions (Refrigerant Leaks)",
        "definition": (
            "Direct fugitive GHG emissions from HVAC and AC refrigerant leakage and top-ups (HCFC-22, HFC-32, HFC-410A). "
            "Calculated as top-up quantity (kg) × AR4 100-yr GWP. Source: IPCC AR4 / MoEFCC India."
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
        "entry_level": EntryLevel.PROJECT.value,
        "guidance_text": "Enter refrigerant gas quantity refilled in HVAC and cooling systems in kg.",
        "why_needed": "Scope 1 fugitive refrigerant emissions under SEBI BRSR Principle 6.",
        "document_hint": "Upload HVAC maintenance service log or refrigerant gas purchase invoice.",
        "calc_formula_code": "CALC-GHG-SCOPE1-FUGITIVE-REFRIGERANT",
    },
    {
        "code": "ENV-GHG-001D-SF6",
        "name": "Scope 1 – Fugitive Emissions (SF6 Switchgear)",
        "definition": (
            "Direct fugitive GHG emissions from SF6 gas leakage in electrical high-voltage switchgear and substations. "
            "Calculated as top-up/leakage (kg) × 22.800 tCO2e/kg (GWP 22,800). Source: IPCC AR4 / MoEFCC India."
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
        "entry_level": EntryLevel.PROJECT.value,
        "guidance_text": "Enter SF6 gas top-up quantity for gas-insulated switchgear (GIS) in kg.",
        "why_needed": "Scope 1 fugitive SF6 emissions under SEBI BRSR Principle 6.",
        "document_hint": "Upload substation gas pressure test report or SF6 cylinder replenishment log.",
        "calc_formula_code": "CALC-GHG-SCOPE1-FUGITIVE-SF6",
    },
    {
        "code": "ENV-FUEL-DIESEL-HSD",
        "name": "Fuel Consumption – High-Speed Diesel (HSD)",
        "definition": "High-Speed Diesel (IS-1460) consumed in stationary equipment (DG sets, pumps) and mobile machinery. Factor: 0.03576 GJ/L, 0.00268 tCO2e/L. Source: BEE PAT / MoPNG.",
        "category": MetricCategory.ENVIRONMENT.value,
        "section": "Section C",
        "principle": 6,
        "indicator_type": IndicatorType.ESSENTIAL.value,
        "brsr_core": True,
        "core_attribute": "Fuel Consumption – HSD",
        "data_type": "numeric",
        "base_unit": "Litres",
        "allowed_units": ["Litres", "kL", "GJ"],
        "aggregation_type": AggregationType.SUM.value,
        "evidence_rule": EvidenceRule.MANDATORY.value,
        "frequency": "monthly",
        "owner_role": "site_collector",
        "entry_level": EntryLevel.PROJECT.value,
        "guidance_text": "Enter total High-Speed Diesel (HSD) consumed in litres.",
        "why_needed": "Primary fuel tracking for Scope 1 emissions under SEBI BRSR Principle 6.",
        "document_hint": "Upload diesel delivery challan from IOCL/BPCL/HPCL.",
    },
    {
        "code": "ENV-FUEL-DIESEL-LDO",
        "name": "Fuel Consumption – Light Diesel Oil (LDO)",
        "definition": "Light Diesel Oil (IS-15770) consumed in boilers and industrial furnaces. Factor: 0.03624 GJ/L, 0.00260 tCO2e/L. Source: BEE PAT Manual 2023.",
        "category": MetricCategory.ENVIRONMENT.value,
        "section": "Section C",
        "principle": 6,
        "indicator_type": IndicatorType.ESSENTIAL.value,
        "brsr_core": False,
        "core_attribute": None,
        "data_type": "numeric",
        "base_unit": "Litres",
        "allowed_units": ["Litres", "kL", "GJ"],
        "aggregation_type": AggregationType.SUM.value,
        "evidence_rule": EvidenceRule.MANDATORY.value,
        "frequency": "monthly",
        "owner_role": "site_collector",
        "entry_level": EntryLevel.PROJECT.value,
        "guidance_text": "Enter total Light Diesel Oil (LDO) consumed in litres.",
        "why_needed": "Industrial fuel tracking under SEBI BRSR Principle 6.",
        "document_hint": "Upload LDO purchase invoice or boiler fuel register.",
    },
    {
        "code": "ENV-FUEL-COAL-ANTHRACITE",
        "name": "Fuel Consumption – Anthracite Coal",
        "definition": "Anthracite high-rank coal consumed in furnaces/processes. Factor: 28.00 GJ/MT, 2.62 tCO2e/MT. Source: MoEFCC / IPCC AR4 India.",
        "category": MetricCategory.ENVIRONMENT.value,
        "section": "Section C",
        "principle": 6,
        "indicator_type": IndicatorType.ESSENTIAL.value,
        "brsr_core": False,
        "core_attribute": None,
        "data_type": "numeric",
        "base_unit": "tonnes",
        "allowed_units": ["tonnes", "MT", "kg", "GJ"],
        "aggregation_type": AggregationType.SUM.value,
        "evidence_rule": EvidenceRule.MANDATORY.value,
        "frequency": "monthly",
        "owner_role": "site_collector",
        "entry_level": EntryLevel.PROJECT.value,
        "guidance_text": "Enter quantity of Anthracite coal consumed in metric tonnes.",
        "why_needed": "Coal fuel tracking under SEBI BRSR Principle 6.",
        "document_hint": "Upload coal delivery challan and weighbridge slips.",
    },
    {
        "code": "ENV-FUEL-COAL-NONCOKING",
        "name": "Fuel Consumption – Non-Coking / Pit-Grade Coal",
        "definition": "Non-coking thermal coal (Grade D/E/F pit-grade) consumed in boilers/power generation. Factor: 14.50 GJ/MT, 1.66 tCO2e/MT. Source: CEA / Ministry of Coal 2023.",
        "category": MetricCategory.ENVIRONMENT.value,
        "section": "Section C",
        "principle": 6,
        "indicator_type": IndicatorType.ESSENTIAL.value,
        "brsr_core": False,
        "core_attribute": None,
        "data_type": "numeric",
        "base_unit": "tonnes",
        "allowed_units": ["tonnes", "MT", "kg", "GJ"],
        "aggregation_type": AggregationType.SUM.value,
        "evidence_rule": EvidenceRule.MANDATORY.value,
        "frequency": "monthly",
        "owner_role": "site_collector",
        "entry_level": EntryLevel.PROJECT.value,
        "guidance_text": "Enter quantity of thermal non-coking coal consumed in metric tonnes.",
        "why_needed": "Thermal coal tracking under SEBI BRSR Principle 6.",
        "document_hint": "Upload Coal India Limited (CIL) rake receipt note or weighbridge slip.",
    },
    {
        "code": "ENV-FUEL-GAS-CNG",
        "name": "Fuel Consumption – Compressed Natural Gas (CNG)",
        "definition": "Compressed Natural Gas (IS-15989) consumed in vehicles and equipment. Factor: 0.04800 GJ/kg, 0.00221 tCO2e/kg. Source: MoPNG PPAC 2023 / MoEFCC.",
        "category": MetricCategory.ENVIRONMENT.value,
        "section": "Section C",
        "principle": 6,
        "indicator_type": IndicatorType.ESSENTIAL.value,
        "brsr_core": True,
        "core_attribute": "Fuel Consumption – CNG",
        "data_type": "numeric",
        "base_unit": "kg",
        "allowed_units": ["kg", "tonnes", "GJ"],
        "aggregation_type": AggregationType.SUM.value,
        "evidence_rule": EvidenceRule.MANDATORY.value,
        "frequency": "monthly",
        "owner_role": "site_collector",
        "entry_level": EntryLevel.PROJECT.value,
        "guidance_text": "Enter total Compressed Natural Gas (CNG) consumed in kg.",
        "why_needed": "Gaseous fuel tracking under SEBI BRSR Principle 6.",
        "document_hint": "Upload monthly CNG fuel invoices.",
    },
    {
        "code": "ENV-FUEL-GAS-PNG",
        "name": "Fuel Consumption – Piped Natural Gas (PNG)",
        "definition": "Piped Natural Gas (R-LNG/APM) consumed in boilers, canteen, and industrial heating. Factor: 0.03850 GJ/SCM, 0.00203 tCO2e/SCM. Source: MoPNG PPAC 2023 / CEA.",
        "category": MetricCategory.ENVIRONMENT.value,
        "section": "Section C",
        "principle": 6,
        "indicator_type": IndicatorType.ESSENTIAL.value,
        "brsr_core": True,
        "core_attribute": "Fuel Consumption – PNG",
        "data_type": "numeric",
        "base_unit": "scm",
        "allowed_units": ["scm", "m3", "GJ"],
        "aggregation_type": AggregationType.SUM.value,
        "evidence_rule": EvidenceRule.MANDATORY.value,
        "frequency": "monthly",
        "owner_role": "site_collector",
        "entry_level": EntryLevel.PROJECT.value,
        "guidance_text": "Enter total Piped Natural Gas (PNG) consumed in SCM (Standard Cubic Metres).",
        "why_needed": "Piped gas tracking under SEBI BRSR Principle 6.",
        "document_hint": "Upload City Gas Distribution (CGD) monthly billing statement.",
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
        "entry_level": EntryLevel.BU.value,
        "guidance_text": "Enter total business travel by air, rail, and road for all employees of this BU during the month. Enter passenger-kilometres per travel mode.",
        "why_needed": "GHG Protocol Category 6 (Business Travel). Mandated under SEBI BRSR Core for Scope 3 disclosure. HR/Finance is the source of truth for travel data.",
        "document_hint": "Upload monthly travel expense report from HR system, or consolidated airline/rail booking statement from travel desk (Yatra, MakeMyTrip corporate).",
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
        "entry_level": EntryLevel.BU.value,
        "guidance_text": "Enter total employee commuting distance per mode (private car, hired bus, public transport) for all BU staff during the month.",
        "why_needed": "GHG Protocol Category 7 (Employee Commuting). Captured at BU level using HR headcount and average commute distance surveys.",
        "document_hint": "Upload HR commute survey summary report or employee transport vendor records (bus contractor monthly bill).",
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
        "entry_level": EntryLevel.SUBSIDIARY.value,
        "guidance_text": "Enter total quantity of key materials procured (steel in MT, cement in MT, aggregates in MT, aluminium in MT) by the subsidiary during the month.",
        "why_needed": "GHG Protocol Category 1 (Purchased Goods). Procurement department holds PO/invoice data. Mandatory for SEBI BRSR Core upstream emission disclosure.",
        "document_hint": "Upload consolidated monthly procurement statement from ERP/SAP (material-wise purchase orders with quantity in MT).",
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
        "entry_level": EntryLevel.PROJECT.value,
        "guidance_text": "Enter total tonne-kilometres of material transported to this site by third-party logistics (road trucks, rail freight) during the month.",
        "why_needed": "GHG Protocol Category 4 (Upstream Transport). Logistics is coordinated at project level where goods receipt happens.",
        "document_hint": "Upload goods receipt note (GRN) with transport distance, or third-party logistics provider monthly invoice showing tonne-km.",
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
        "entry_level": EntryLevel.SUBSIDIARY.value,
        "guidance_text": "Enter total capital equipment procured by the subsidiary this year (excavators, cranes, compactors, DG sets, HV transformers) — weight in MT or spend in INR Lakh.",
        "why_needed": "GHG Protocol Category 2 (Capital Goods). Finance/Asset register is the source. Reported annually at subsidiary level in SEBI BRSR.",
        "document_hint": "Upload fixed asset purchase register or capex approval note from finance, showing equipment type, quantity, and value/weight.",
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
        "entry_level": EntryLevel.PROJECT.value,
        "guidance_text": "Enter total waste generated at site by category: C&D debris (MT), MSW from camp (MT), hazardous waste (MT), and disposal route (landfill/recycled/treated).",
        "why_needed": "GHG Protocol Category 5 (Waste in Operations). Mandated under SEBI BRSR Principle 6 E7 and C&D Waste Management Rules 2016.",
        "document_hint": "Upload waste manifest from authorized recycler/disposal facility, or site waste register signed by EHS officer.",
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

