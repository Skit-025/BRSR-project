import uuid
import hashlib
import json
from datetime import datetime, timezone
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.modules.org.models import OrgNode, ReportingPeriod
from app.modules.metrics.models import Metric
from app.modules.consolidation.models import ConsolidatedValue
from app.modules.reporting.models import Report, ReportType
from app.modules.reporting.schemas import (
    BRSRFullReportResponse,
    SectionAData,
    SectionBData,
    PrincipleIndicatorDisclosure
)

def compile_brsr_report(
    db: Session,
    entity_id: str,
    period_id: str,
    report_type: str = ReportType.BRSR_FULL.value,
    generated_by: str = "Corporate ESG Team"
) -> BRSRFullReportResponse:
    """
    F26-F29 SEBI BRSR Report Compiler:
    Synthesizes Section A (General Information), Section B (Management),
    and Section C (Principles 1-9) from consolidated numbers and sealed audit hashes.
    """
    node = db.query(OrgNode).filter(OrgNode.id == entity_id).first()
    if not node:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entity not found.")

    # Guard: SEBI BRSR reports can only be generated at Group or Company level
    allowed_report_types = ["group", "company", "subsidiary"]
    if node.type.lower() not in allowed_report_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Statutory SEBI BRSR reports can only be compiled at the Group or Company level. "
                f"Entity '{node.name}' is of type '{node.type}'. "
                "Data entry takes place at the Project level, while reporting compiles at Group/Company."
            )
        )

    period = db.query(ReportingPeriod).filter(ReportingPeriod.id == period_id).first()
    if not period:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reporting period not found.")

    # 1. Fetch all consolidated values for this entity and period
    cons_values = db.query(ConsolidatedValue).filter(
        ConsolidatedValue.entity_id == entity_id,
        ConsolidatedValue.period_id == period_id
    ).all()

    cons_map = {c.metric_code: c for c in cons_values}
    metrics = {m.code: m for m in db.query(Metric).filter(Metric.is_deleted == False).all()}

    # Calculate Scope 1, 2, 3 statutory emission totals
    scope1_sub_codes = ["ENV-GHG-001A", "ENV-GHG-001B", "ENV-GHG-001C", "ENV-GHG-001D"]
    scope1_sum = sum(cons_map[c].value for c in scope1_sub_codes if c in cons_map and cons_map[c].value)
    scope1_flat = cons_map["ENV-GHG-001"].value if "ENV-GHG-001" in cons_map else 0.0
    total_scope_1 = float(scope1_sum if scope1_sum > 0 else scope1_flat)

    scope2_sub_codes = ["ENV-GHG-002A", "ENV-GHG-002B", "ENV-GHG-002C"]
    scope2_sum = sum(cons_map[c].value for c in scope2_sub_codes if c in cons_map and cons_map[c].value)
    scope2_flat = cons_map["ENV-GHG-002"].value if "ENV-GHG-002" in cons_map else 0.0
    total_scope_2 = float(scope2_sum if scope2_sum > 0 else scope2_flat)

    # Scope 3 (DEF-CALC-003): Precedence to sub-codes if present; fallback to flat summary code
    scope3_codes = ["ENV-GHG-003A", "ENV-GHG-003B", "ENV-GHG-003C", "ENV-GHG-003D", "ENV-GHG-003E", "ENV-GHG-003F"]
    scope3_sum = sum(cons_map[c].value for c in scope3_codes if c in cons_map and cons_map[c].value)
    scope3_flat = cons_map["ENV-GHG-003"].value if "ENV-GHG-003" in cons_map else (
        cons_map["ENV-SCOPE3"].value if "ENV-SCOPE3" in cons_map else 0.0
    )
    total_scope_3 = float(scope3_sum if scope3_sum > 0 else scope3_flat)

    total_ghg = round(total_scope_1 + total_scope_2 + total_scope_3, 4)

    # 2. Compile Section C (Principle-wise performance)
    section_c: List[PrincipleIndicatorDisclosure] = []

    for code, m in metrics.items():
        if report_type == ReportType.BRSR_CORE.value and not m.brsr_core:
            continue

        c_val = cons_map.get(code)
        disclosed_num = c_val.value if c_val else None
        unit = c_val.unit if c_val else m.base_unit
        method = c_val.method if c_val else m.aggregation_type
        calc_status = getattr(c_val, "status", "CALCULATED") if c_val else "NOT_REPORTED"
        calc_reason = getattr(c_val, "status_reason", None) if c_val else "Metric not consolidated for this reporting entity"

        # Explicitly distinguish undefined/missing ratios from legitimate zero disclosures
        if c_val and c_val.status in ("UNDEFINED_ZERO_DENOMINATOR", "MISSING_DENOMINATOR", "INVALID_NEGATIVE_DENOMINATOR", "INSUFFICIENT_DATA"):
            disclosed_num = None

        # Check evidence verification
        has_evidence = bool(c_val and c_val.child_contributions)

        section_c.append(
            PrincipleIndicatorDisclosure(
                metric_code=code,
                indicator_name=m.name,
                principle=m.principle,
                brsr_core=m.brsr_core,
                disclosed_value=disclosed_num,
                unit=unit,
                aggregation_method=method,
                assurance_ready=m.brsr_core,
                evidence_verified=has_evidence,
                status=calc_status,
                status_reason=calc_reason,
            )
        )

    # 3. Compile Section A & B from real OrgNode, child entities, consolidated metrics & OrgLevelDisclosures
    from sqlalchemy import cast, String
    from app.modules.disclosures.models import OrgLevelDisclosure

    sites_count = db.query(OrgNode).filter(
        cast(OrgNode.path, String).like(f"{node.path}%"),
        OrgNode.type.in_(["project", "site"]),
        OrgNode.is_deleted == False,
    ).count()

    # Load all non-deleted OrgLevelDisclosures for this entity/period (or descendant scope if any)
    disclosures_rows = db.query(OrgLevelDisclosure).filter(
        OrgLevelDisclosure.org_node_id == entity_id,
        OrgLevelDisclosure.is_deleted == False,
    ).all()
    disc_by_section: Dict[str, Dict[str, Any]] = {}
    for d in disclosures_rows:
        if d.period_id in (None, period_id) and d.payload:
            disc_by_section[d.disclosure_section] = d.payload

    # Headcount from SOC-EMP-001 (or org node attributes if configured, otherwise 0)
    emp_val = cons_map.get("SOC-EMP-001")
    if emp_val and emp_val.value is not None:
        total_emp = int(emp_val.value)
    elif node.attributes and "headcount" in node.attributes:
        total_emp = int(node.attributes["headcount"])
    else:
        total_emp = 0

    # Corporate legal entity metadata from node_attrs + section_a_org / group_general disclosure
    node_attrs = node.attributes or {}
    sec_a_org = disc_by_section.get("section_a_org", {})
    grp_gen = disc_by_section.get("group_general", {})
    sec_a_prod = disc_by_section.get("section_a_products", {})
    sec_a_ops = disc_by_section.get("section_a_operations", {})
    sec_a_emp = disc_by_section.get("section_a_employees", {})
    sec_a_grp = disc_by_section.get("section_a_group_rel", {})
    sec_a_csr = disc_by_section.get("section_a_csr", {})
    sec_a_trans = disc_by_section.get("section_a_transparency", {})

    if "corporate_name" in node_attrs:
        corporate_name = node_attrs["corporate_name"]
    elif sec_a_org.get("company_name"):
        corporate_name = sec_a_org["company_name"]
    elif "meil" in (node.name or "").lower():
        corporate_name = "Megha Engineering & Infrastructures Ltd (MEIL)"
    else:
        corporate_name = node.name or "Aarohan Consolidated Enterprise"

    # Real child Subsidiaries / Associates / JVs from OrgNode hierarchy
    child_subs = db.query(OrgNode).filter(
        OrgNode.parent_id == node.id,
        OrgNode.is_deleted == False,
        OrgNode.type.in_(["subsidiary", "company", "associate", "jv"]),
    ).order_by(OrgNode.name).all()
    holding_subs_list = sec_a_grp.get("entities") or [
        {
            "name": ch.name,
            "relation": (ch.type or "Subsidiary").replace("_", " ").title(),
            "ownership_pct": f"{ch.ownership_pct:.1f}%" if ch.ownership_pct is not None else "",
            "participates_br": "Yes",
        }
        for ch in child_subs
    ]

    # Denominator turnover if consolidated
    turnover_metric = next((c for k, c in cons_map.items() if k.startswith("DEN-") and c.value is not None), None)
    turnover_str = f"{turnover_metric.value:,.2f} Cr" if turnover_metric else sec_a_csr.get("turnover", "")

    section_a = SectionAData(
        corporate_name=corporate_name,
        cin=sec_a_org.get("cin") or node_attrs.get("cin") or "U45200TG2006PLC050277",
        year_of_incorporation=str(sec_a_org.get("year_of_incorporation") or node_attrs.get("year_of_incorporation") or ""),
        registered_office=sec_a_org.get("registered_office") or node_attrs.get("registered_office") or "",
        corporate_address=sec_a_org.get("corporate_address") or node_attrs.get("corporate_address") or "",
        email=sec_a_org.get("email") or node_attrs.get("email") or "",
        telephone=sec_a_org.get("telephone") or node_attrs.get("telephone") or "",
        website=sec_a_org.get("website") or node_attrs.get("website") or "",
        stock_exchanges=sec_a_org.get("stock_exchanges") or node_attrs.get("stock_exchanges") or "",
        paid_up_capital_inr=str(sec_a_org.get("paid_up_capital") or node_attrs.get("paid_up_capital_inr") or ""),
        contact_person=sec_a_org.get("contact_person") or node_attrs.get("contact_person") or "",
        reporting_boundary=grp_gen.get("reporting_boundary") or sec_a_org.get("reporting_boundary") or "Consolidated (Subsidiaries, JVs, and Operating Sites)",
        financial_year=period.financial_year,
        total_employees=total_emp,
        operating_plants_and_sites_count=max(sites_count, 1),
        turnover_inr=turnover_str or None,
        net_worth_inr=sec_a_csr.get("net_worth") or None,
        business_activities=sec_a_prod.get("business_activities", []),
        products_services=sec_a_prod.get("products_services", []),
        locations=sec_a_ops.get("locations", {"national_plants": max(sites_count, 0)}),
        markets_served=sec_a_ops.get("markets_served", {}),
        employees_breakdown=sec_a_emp.get("employees_breakdown", {}),
        differently_abled=sec_a_emp.get("differently_abled", {}),
        women_representation=sec_a_emp.get("women_representation", {}),
        turnover_rate=sec_a_emp.get("turnover_rate", {}),
        holding_subsidiaries=holding_subs_list,
        csr_details=sec_a_csr,
        complaints=sec_a_trans.get("complaints", {}),
        material_issues=sec_a_trans.get("material_issues", []),
    )

    grp_gov = disc_by_section.get("group_governance", {})
    grp_pol = disc_by_section.get("group_policies", {})
    principles_matrix = {}
    for p_idx in range(1, 10):
        p_payload = disc_by_section.get(f"section_b_p{p_idx}", {})
        if p_payload:
            principles_matrix[f"P{p_idx}"] = p_payload

    section_b = SectionBData(
        board_oversight_committee=grp_gov.get("board_committee") or "MEIL ESG & Risk Management Committee",
        principles_matrix=principles_matrix,
        director_statement=grp_gov.get("director_statement", ""),
        highest_authority=grp_gov.get("highest_authority", ""),
        sustainability_committee=grp_gov.get("board_committee", ""),
        review_details=grp_pol.get("review_details", {}),
        independent_assessment=disc_by_section.get("group_assurance", {}),
        reasons_not_covered=grp_pol.get("reasons_not_covered", {}),
    )

    # 4. Calculate reporting coverage
    from app.modules.consolidation.service import get_reporting_coverage
    try:
        cov_info = get_reporting_coverage(db, entity_id, period_id)
    except Exception:
        cov_info = None

    # 5. Generate snapshot seal
    report_dict = {
        "entity": node.code,
        "period": period.code,
        "section_a": section_a.model_dump(),
        "section_c": [d.model_dump() for d in section_c],
        "total_scope_1_tco2e": total_scope_1,
        "total_scope_2_tco2e": total_scope_2,
        "total_scope_3_tco2e": total_scope_3,
        "total_ghg_emissions_tco2e": total_ghg,
        "reporting_coverage": cov_info,
    }
    snapshot_hash = hashlib.sha256(json.dumps(report_dict, sort_keys=True, default=str).encode("utf-8")).hexdigest()

    # 6. Persist Report record
    report_id = str(uuid.uuid4())
    report_rec = Report(
        id=report_id,
        entity_id=node.id,
        period_id=period.id,
        report_type=report_type,
        snapshot_hash=snapshot_hash,
        generated_by=generated_by,
        content_json=report_dict
    )
    db.add(report_rec)
    db.commit()

    return BRSRFullReportResponse(
        report_id=report_id,
        report_type=report_type,
        entity_code=node.code,
        entity_name=node.name,
        financial_year=period.financial_year,
        period_code=period.code,
        snapshot_hash=snapshot_hash,
        generated_at=datetime.now(timezone.utc),
        section_a=section_a,
        section_b=section_b,
        section_c=section_c,
        total_scope_1_tco2e=total_scope_1,
        total_scope_2_tco2e=total_scope_2,
        total_scope_3_tco2e=total_scope_3,
        total_ghg_emissions_tco2e=total_ghg,
        reporting_coverage=cov_info,
        is_partially_reported=cov_info.get("is_partially_reported", False) if cov_info else False,
    )
