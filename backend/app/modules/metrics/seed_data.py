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
    }
]

def seed_metrics(db: Session):
    """Inserts or updates the 12 MVP indicators in the Metric Catalogue."""
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
