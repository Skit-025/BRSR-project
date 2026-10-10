from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.modules.org.models import OrgNode, MetricApplicability, ProjectType

APPLICABILITY_RULES = [
    {
        "metric_code": "ENV-ENERGY-001",
        "rule_id": "RULE-ENG-01",
        "description": "Electricity consumption applies to all active project sites and facilities with grid or generator connections.",
        "condition": lambda node: node.is_active and node.boundary
    },
    {
        "metric_code": "ENV-ENERGY-002",
        "rule_id": "RULE-ENG-02",
        "description": "Fuel consumption applies to infrastructure, construction, hydrocarbons, solar operations, fleet, and site equipment.",
        "condition": lambda node: node.project_type in [
            ProjectType.IRRIGATION.value, ProjectType.HYDROCARBON.value,
            ProjectType.ROAD.value, ProjectType.TUNNEL.value, ProjectType.EV_BUS.value,
            ProjectType.SOLAR.value, "solar_generation"
        ] or node.type in ["group", "subsidiary", "business_unit"]
    },
    {
        "metric_code": "ENV-GHG-001",
        "rule_id": "RULE-GHG-01",
        "description": "Scope 1 emissions mandatory for all sites with stationary combustion or fleet machinery.",
        "condition": lambda node: node.is_active and node.boundary
    },
    {
        "metric_code": "ENV-GHG-002",
        "rule_id": "RULE-GHG-02",
        "description": "Scope 2 location-based emissions mandatory for all entities purchasing electricity.",
        "condition": lambda node: node.is_active and node.boundary
    },
    {
        "metric_code": "ENV-WATER-001",
        "rule_id": "RULE-WAT-01",
        "description": "Water withdrawal tracking mandatory; critical priority for water-stressed zones or irrigation/hydrocarbon projects.",
        "condition": lambda node: node.is_water_stressed or node.project_type in [
            ProjectType.IRRIGATION.value, ProjectType.HYDROCARBON.value, ProjectType.TUNNEL.value
        ] or node.type in ["group", "subsidiary"]
    },
    {
        "metric_code": "ENV-WASTE-001",
        "rule_id": "RULE-WST-01",
        "description": "Waste generation and disposal tracking applies to all physical construction and operational sites.",
        "condition": lambda node: node.project_type != ProjectType.CORPORATE.value or node.type in ["group", "subsidiary"]
    },
    {
        "metric_code": "SOC-SAFE-001",
        "rule_id": "RULE-SAF-01",
        "description": "LTIFR safety tracking mandatory across all active operational and construction units.",
        "condition": lambda node: node.is_active and node.type in ["project", "site", "business_unit", "subsidiary", "group"]
    },
    {
        "metric_code": "SOC-SAFE-002",
        "rule_id": "RULE-SAF-02",
        "description": "Fatalities monitoring mandatory across all entities without exception.",
        "condition": lambda node: True
    },
    {
        "metric_code": "SOC-EMP-001",
        "rule_id": "RULE-EMP-01",
        "description": "Workforce breakdown by gender and category applies across all operational units.",
        "condition": lambda node: True
    },
    {
        "metric_code": "SOC-WELF-001",
        "rule_id": "RULE-WLF-01",
        "description": "Employee and worker training hours tracking required for all operating units.",
        "condition": lambda node: node.is_active
    },
    {
        "metric_code": "GOV-ETH-001",
        "rule_id": "RULE-ETH-01",
        "description": "Ethics and anti-corruption training coverage required at management and project units.",
        "condition": lambda node: True
    },
    {
        "metric_code": "GOV-COMP-001",
        "rule_id": "RULE-CMP-01",
        "description": "Stakeholder complaints register mandatory across all public and commercial projects.",
        "condition": lambda node: True
    }
]

def evaluate_applicability_for_node(
    node: Any,
    db: Any,
    period_id: Optional[str] = None
) -> List[MetricApplicability]:
    """
    Evaluates rule catalogue against node facts and updates/creates MetricApplicability records.
    Preserves manual approved exceptions.
    """
    # Normalize argument order if caller passed (db, node) instead of (node, db)
    if hasattr(node, "query") and not hasattr(db, "query"):
        db, node = node, db

    # Resolve node object if caller passed a UUID string or node ID
    if isinstance(node, str):
        from app.modules.org.models import OrgNode
        node = db.query(OrgNode).filter(OrgNode.id == node).first()
        if not node:
            return []

    records: List[MetricApplicability] = []

    for rule in APPLICABILITY_RULES:
        metric_code = rule["metric_code"]
        
        # Check existing record (to preserve approved exceptions)
        query = db.query(MetricApplicability).filter(
            MetricApplicability.org_node_id == node.id,
            MetricApplicability.metric_code == metric_code
        )
        if period_id:
            existing = query.filter(MetricApplicability.period_id == period_id).first()
            if not existing:
                existing = query.filter(
                    MetricApplicability.period_id.is_(None),
                    MetricApplicability.is_exception.is_(True)
                ).first()
        else:
            existing = query.first()

        if existing and existing.is_exception:
            records.append(existing)
            continue

        is_applicable = bool(rule["condition"](node))
        reason = f"Derived by {rule['rule_id']}: {rule['description']}"

        if existing:
            existing.is_applicable = is_applicable
            existing.reason = reason
            existing.rule_id = rule["rule_id"]
            db.add(existing)
            records.append(existing)
        else:
            rec = MetricApplicability(
                org_node_id=node.id,
                metric_code=metric_code,
                period_id=period_id,
                is_applicable=is_applicable,
                reason=reason,
                rule_id=rule["rule_id"]
            )
            db.add(rec)
            records.append(rec)

    db.commit()
    return records
