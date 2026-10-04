from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from app.modules.org.models import OrgNode, MetricApplicability
from app.modules.metrics.models import Metric
from app.modules.metrics.schemas import DynamicFormResponse, DynamicFormSection, FormFieldSchema

def build_dynamic_form(
    db: Session,
    entity_id: str,
    period_id: str,
    submission_id: Optional[str] = None,
    submission_status: str = "DRAFT",
    existing_data_points: Optional[Dict[str, Any]] = None
) -> DynamicFormResponse:
    """
    Constructs the dynamic BRSR monthly entry form (F06).
    Joins:
      - Master Metric Catalogue (fields, units, validation, evidence rules)
      - Derived Entity Applicability (is_applicable, rules, audited exceptions)
      - Existing saved values/status in the draft pack.
    """
    node = db.query(OrgNode).filter(OrgNode.id == entity_id).first()
    if not node:
        raise ValueError(f"Organization node '{entity_id}' not found.")

    # 1. Fetch all metrics
    metrics = db.query(Metric).filter(Metric.is_deleted == False).order_by(Metric.principle, Metric.code).all()

    # 2. Fetch applicability for this node
    applicability_map = {}
    apps = db.query(MetricApplicability).filter(
        MetricApplicability.org_node_id == entity_id
    ).all()
    for a in apps:
        applicability_map[a.metric_code] = a

    # 3. Group by Section / Principle
    section_dict: Dict[str, List[FormFieldSchema]] = {}

    for m in metrics:
        app_record = applicability_map.get(m.code)
        is_applicable = app_record.is_applicable if app_record else True
        app_reason = app_record.reason if app_record else "Standard BRSR indicator"

        # Check existing draft value if any
        current_val = None
        current_unit = m.base_unit
        current_status = "NOT_AVAILABLE"

        if existing_data_points and m.code in existing_data_points:
            dp = existing_data_points[m.code]
            current_val = dp.get("value_numeric")
            current_unit = dp.get("unit", m.base_unit)
            current_status = dp.get("status", "ACTUAL")

        field = FormFieldSchema(
            metric_code=m.code,
            name=m.name,
            definition=m.definition,
            category=m.category,
            section=m.section,
            principle=m.principle,
            indicator_type=m.indicator_type,
            brsr_core=m.brsr_core,
            data_type=m.data_type,
            base_unit=m.base_unit,
            allowed_units=m.allowed_units or [m.base_unit],
            evidence_rule=m.evidence_rule,
            is_applicable=is_applicable,
            applicability_reason=app_reason,
            current_value=current_val,
            current_unit=current_unit,
            current_status=current_status
        )

        section_key = f"Principle {m.principle} - {m.category.capitalize()}"
        if section_key not in section_dict:
            section_dict[section_key] = []
        section_dict[section_key].append(field)

    sections = [
        DynamicFormSection(
            title=title,
            principle=fields[0].principle if fields else None,
            fields=fields
        )
        for title, fields in section_dict.items()
    ]

    return DynamicFormResponse(
        entity_id=entity_id,
        period_id=period_id,
        submission_id=submission_id,
        submission_status=submission_status,
        sections=sections
    )
