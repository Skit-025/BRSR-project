"""
app/modules/forms/service.py
Dynamic Digital Forms Engine.
Generates the Master Digital Form and dynamically projects it into 40 distinct perspectives
(5 Subsidiaries x 8 Roles) according to entity scope and caller role permissions.
"""
from typing import Dict, List, Optional, Any
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.modules.org.models import OrgNode, ReportingPeriod, MetricApplicability
from app.modules.metrics.models import Metric
from app.modules.collection.models import Submission, DataPoint
from app.modules.forms.schemas import DigitalFormResponse, FormSection, FormField
from app.security.rbac import Role

# 5 Authoritative MEIL Subsidiaries
MEIL_SUBSIDIARIES = [
    {"code": "MEIL-INFRA",  "name": "MEIL Infrastructure & Civil Engineering"},
    {"code": "MEIL-ENERGY", "name": "MEIL Energy, Solar & Power Grids"},
    {"code": "MEIL-WATER",  "name": "MEIL Water Treatment & Lift Irrigation"},
    {"code": "MEIL-HYDRO",  "name": "MEIL Hydrocarbons & Petrochemical Drilling"},
    {"code": "MEIL-EV",     "name": "MEIL Electric Mobility & Green Fleets"},
]

PRINCIPLE_NAMES = {
    "P1": ("Governance, Ethics & Anti-Corruption", "Governance"),
    "P2": ("Sustainable & Safe Products/Services", "Governance"),
    "P3": ("Employee Well-being, Safety & Diversity", "Social"),
    "P4": ("Stakeholder Inclusiveness & Grievances", "Social"),
    "P5": ("Human Rights & Fair Labor Practices", "Social"),
    "P6": ("Environmental Protection, GHG & Waste", "Environment"),
    "P7": ("Responsible Public Policy Advocacy", "Governance"),
    "P8": ("Inclusive Growth & CSR Development", "Social"),
    "P9": ("Consumer Value & Fair Customer Practices", "Governance"),
}


def _lookup_period(db: Session, identifier: str) -> Optional[ReportingPeriod]:
    """Safely retrieves a ReportingPeriod by code (e.g. 'FY2025-26') or UUID string."""
    import uuid
    # Try by code
    p = db.query(ReportingPeriod).filter(ReportingPeriod.code == identifier).first()
    if p:
        return p
    # Try by UUID only if valid UUID format
    try:
        valid_uuid = str(uuid.UUID(identifier))
        return db.query(ReportingPeriod).filter(ReportingPeriod.id == valid_uuid).first()
    except (ValueError, TypeError):
        return None


def build_master_digital_form(db: Session, period_id: str) -> DigitalFormResponse:
    """
    Builds the Master Digital Form containing all BRSR Core Essential indicators
    across all 5 subsidiaries and 9 principles.
    Visible only to System Admin (and ESG Manager/Group Admin).
    """
    period = _lookup_period(db, period_id)
    if not period:
        period_code = period_id
    else:
        period_code = period.code


    metrics = db.query(Metric).filter(Metric.is_deleted == False).order_by(Metric.principle, Metric.code).all()

    # Group metrics by principle
    sections_dict: Dict[str, List[FormField]] = {}
    for m in metrics:
        p = f"P{m.principle}" if m.principle else "P6"
        p_name, pillar = PRINCIPLE_NAMES.get(p, ("General Sustainability", "Environment"))
        
        ind_type = "Essential" if (getattr(m, 'indicator_type', None) == "essential" or m.brsr_core) else "Leadership"
        p_num = m.principle or 6
        disclosure_name = f"Principle {p_num}: {ind_type} Indicator — {m.name}"
        
        field = FormField(
            metric_code=m.code,
            metric_name=m.name,
            indicator_disclosure_name=disclosure_name,
            definition=m.definition or m.name,
            principle=p,
            pillar=m.category if m.category else pillar,
            data_type=m.data_type if m.data_type else "numeric",
            unit=m.base_unit,
            allowed_units=[m.base_unit] + (m.allowed_units or []),
            is_mandatory=bool(m.brsr_core),
            read_only=False,
            current_value=None,
            notes=f"SEBI Core Indicator {m.code}",
            formula_ref=m.calc_formula_code
        )
        sections_dict.setdefault(p, []).append(field)


    sections: List[FormSection] = []
    for p in sorted(sections_dict.keys()):
        p_name, pillar = PRINCIPLE_NAMES.get(p, ("General Sustainability", "Environment"))
        fields = sections_dict[p]
        sections.append(
            FormSection(
                principle=p,
                principle_name=p_name,
                pillar=pillar,
                field_count=len(fields),
                fields=fields
            )
        )

    # 40 Dimensions Overview (5 subsidiaries x 8 roles)
    all_roles = [r.value for r in Role]
    dimensions_summary = {
        "subsidiaries": MEIL_SUBSIDIARIES,
        "roles": all_roles,
        "total_dimensions": len(MEIL_SUBSIDIARIES) * len(all_roles),
        "description": "Master BRSR Digital Form encompassing all 40 subsidiary-role perspectives."
    }

    # Check if a submission pack already exists for master/group
    master_sub = db.query(Submission).filter(
        Submission.period_id == (period.id if period else period_id)
    ).first()

    return DigitalFormResponse(
        form_id="FORM-MEIL-MASTER-BRSR",
        form_type="master",
        entity_id=None,
        entity_code="MEIL-GROUP",
        entity_name="Megha Engineering & Infrastructures Limited (Consolidated Group)",
        role=Role.SYSTEM_ADMIN.value,
        period_id=period_id,
        period_code=period_code,
        submission_id=str(master_sub.id) if master_sub else None,
        submission_status=master_sub.status if master_sub else "DRAFT",
        is_editable=True,
        can_submit=True,
        can_approve=True,
        can_audit=True,
        can_upload_spreadsheet=True,
        total_metrics=len(metrics),
        sections=sections,
        dimensions_summary=dimensions_summary
    )


def build_scoped_digital_form(
    db: Session,
    period_id: str,
    user_role: str,
    user_entity_id: Optional[str]
) -> DigitalFormResponse:
    """
    Dynamically projects the digital form to the user's specific context and selected entity.
    - If user_entity_id is provided, projects specifically for that entity's applicability rules.
    - If no user_entity_id is provided and user is system_admin, returns master form.
    - Distinct subsidiaries (e.g. Hydrocarbon, Solar, Irrigation, EV Bus) receive distinct parameters.
    """
    if user_role == Role.SYSTEM_ADMIN.value and not user_entity_id:
        return build_master_digital_form(db, period_id)

    # Resolve entity (by code or UUID)
    import uuid
    entity = None
    if user_entity_id:
        entity = db.query(OrgNode).filter(OrgNode.code == user_entity_id, OrgNode.is_deleted == False).first()
        if not entity:
            try:
                valid_uuid = str(uuid.UUID(user_entity_id))
                entity = db.query(OrgNode).filter(OrgNode.id == valid_uuid, OrgNode.is_deleted == False).first()
            except (ValueError, TypeError):
                entity = None

    # If still not resolved, try first active node
    if not entity:
        entity = db.query(OrgNode).filter(OrgNode.is_deleted == False).first()

    entity_code = entity.code if entity else "MEIL-GENERAL"
    entity_name = entity.name if entity else "MEIL Designated Reporting Entity"

    period = _lookup_period(db, period_id)
    period_code = period.code if period else period_id

    # Fetch existing data points if submission pack exists
    current_values: Dict[str, Any] = {}
    current_notes: Dict[str, str] = {}
    sub_id = None
    sub_status = "DRAFT"

    if entity and period:
        sub = db.query(Submission).filter(
            Submission.entity_id == entity.id,
            Submission.period_id == period.id
        ).first()
        if sub:
            sub_id = str(sub.id)
            sub_status = sub.status
            for dp in sub.data_points:
                current_values[dp.metric_code] = dp.value_numeric if dp.value_numeric is not None else dp.value_text
                current_notes[dp.metric_code] = dp.notes

    # Dynamic Applicable Metrics for this specific subsidiary/project
    applicable_metric_codes = set()
    if entity:
        # Run or retrieve applicability rules for this specific entity
        app_records = db.query(MetricApplicability).filter(
            MetricApplicability.org_node_id == entity.id
        ).all()

        if not app_records:
            # Dynamically evaluate rules for this node
            from app.modules.org.applicability.engine import evaluate_applicability_for_node
            app_records = evaluate_applicability_for_node(entity, db, period.id if period else None)

        applicable_metric_codes = {r.metric_code for r in app_records if r.is_applicable}

    all_metrics = db.query(Metric).filter(Metric.is_deleted == False).order_by(Metric.principle, Metric.code).all()

    # Role capability flags
    is_maker = user_role in [Role.MAKER.value, Role.SYSTEM_ADMIN.value, Role.ESG_MANAGER.value]
    is_checker = user_role in [Role.CHECKER.value, Role.SYSTEM_ADMIN.value, Role.ESG_MANAGER.value]
    is_auditor = user_role in [Role.AUDITOR.value, Role.SYSTEM_ADMIN.value]

    # Determine the entity's node type for gating and entry_level filtering
    entity_node_type = (entity.type if entity else "group").lower()
    # Normalize legacy aliases
    if entity_node_type in ("subsidiary", "company"):
        entity_node_type = "company"
    elif entity_node_type == "site":
        entity_node_type = "project"

    # Allowed entry_levels for this entity type
    # Each level can only enter metrics at its own level.
    ENTRY_LEVEL_MAP = {
        "project":       ["project"],
        "business_unit": ["business_unit"],
        "company":       ["subsidiary"],
        "group":         ["group", "project", "business_unit", "subsidiary"],  # Group admins see all
    }
    allowed_entry_levels = ENTRY_LEVEL_MAP.get(entity_node_type, ["project"])

    # Scope badge helper
    def _scope_badge(code: str) -> str | None:
        if code.startswith("ENV-GHG-001"):
            return "SCOPE 1"
        if code.startswith("ENV-GHG-002"):
            return "SCOPE 2"
        if code.startswith("ENV-GHG-003"):
            return "SCOPE 3"
        if code.startswith("ENV-ENERGY"):
            return "ENERGY"
        if code.startswith("ENV-WATER"):
            return "WATER"
        if code.startswith("ENV-WASTE"):
            return "WASTE"
        return None

    sections_dict: Dict[str, List[FormField]] = {}
    for m in all_metrics:
        # ── GATE 1: Section A/B — only visible at Company/Group level ────────
        # Project and BU users should never see Section A (corporate info) or Section B (governance).
        metric_section = getattr(m, 'section', 'Section C') or 'Section C'
        if entity_node_type in ("project", "business_unit") and metric_section.strip() in ("Section A", "Section B"):
            continue

        # ── GATE 2: Entry Level — only show metrics this entity is responsible for ─
        metric_entry_level = getattr(m, 'entry_level', 'project') or 'project'
        if entity_node_type != "group" and metric_entry_level not in allowed_entry_levels:
            continue

        # ── GATE 3: Applicability rules (project type / flags) ───────────────
        if entity and entity_node_type not in ("group", "company") and applicable_metric_codes:
            if m.code not in applicable_metric_codes:
                continue

        p = f"P{m.principle}" if m.principle else "P6"
        p_name, pillar = PRINCIPLE_NAMES.get(p, ("General Sustainability", "Environment"))

        ind_type = "Essential" if (getattr(m, 'indicator_type', None) == "essential" or m.brsr_core) else "Leadership"
        p_num = m.principle or 6
        disclosure_name = f"Principle {p_num}: {ind_type} Indicator — {m.name}"

        field = FormField(
            metric_code=m.code,
            metric_name=m.name,
            indicator_disclosure_name=disclosure_name,
            definition=m.definition or m.name,
            principle=p,
            pillar=m.category if m.category else pillar,
            data_type=m.data_type if m.data_type else "numeric",
            unit=m.base_unit,
            allowed_units=[m.base_unit] + (m.allowed_units or []),
            is_mandatory=bool(m.brsr_core),
            read_only=False,
            current_value=current_values.get(m.code),
            notes=current_notes.get(m.code),
            formula_ref=m.calc_formula_code,
            # ── New fields ──────────────────────────────────────────────────
            entry_level=metric_entry_level,
            guidance_text=getattr(m, 'guidance_text', None),
            why_needed=getattr(m, 'why_needed', None),
            document_hint=getattr(m, 'document_hint', None),
            scope_badge=_scope_badge(m.code),
            is_brsr_core=bool(m.brsr_core),
            evidence_rule=getattr(m, 'evidence_rule', 'mandatory') or 'mandatory',
        )
        sections_dict.setdefault(p, []).append(field)

    sections: List[FormSection] = []
    total_metrics = 0
    for p in sorted(sections_dict.keys()):
        p_name, pillar = PRINCIPLE_NAMES.get(p, ("General Sustainability", "Environment"))
        fields = sections_dict[p]
        total_metrics += len(fields)
        sections.append(
            FormSection(
                principle=p,
                principle_name=p_name,
                pillar=pillar,
                field_count=len(fields),
                fields=fields
            )
        )

    form_id = f"FORM-{entity_code}-{user_role.upper()}"

    return DigitalFormResponse(
        form_id=form_id,
        form_type="scoped",
        entity_id=str(entity.id) if entity else user_entity_id,
        entity_code=entity_code,
        entity_name=entity_name,
        entity_type=entity_node_type,
        project_description=getattr(entity, 'project_description', None) if entity else None,
        project_type=getattr(entity, 'project_type', None) if entity else None,
        entity_state=getattr(entity, 'location_state', None) if entity else None,
        role=user_role,
        period_id=period_id,
        period_code=period_code,
        submission_id=sub_id,
        submission_status=sub_status,
        is_editable=True,
        can_submit=True,
        can_approve=is_checker,
        can_audit=is_auditor,
        can_upload_spreadsheet=True,
        total_metrics=total_metrics,
        sections=sections
    )
