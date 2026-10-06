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

    scope3_codes = ["ENV-GHG-003A", "ENV-GHG-003B", "ENV-GHG-003C", "ENV-GHG-003D", "ENV-GHG-003E", "ENV-GHG-003F"]
    scope3_sum = sum(cons_map[c].value for c in scope3_codes if c in cons_map and cons_map[c].value)
    total_scope_3 = float(scope3_sum)

    total_ghg = round(total_scope_1 + total_scope_2 + total_scope_3, 4)

    # 2. Compile Section C (Principle-wise performance)
    section_c: List[PrincipleIndicatorDisclosure] = []

    for code, m in metrics.items():
        if report_type == ReportType.BRSR_CORE.value and not m.brsr_core:
            continue

        c_val = cons_map.get(code)
        disclosed_num = c_val.value if c_val else 0.0
        unit = c_val.unit if c_val else m.base_unit
        method = c_val.method if c_val else m.aggregation_type

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
                evidence_verified=has_evidence
            )
        )

    # 3. Compile Section A & B
    from sqlalchemy import cast, String
    sites_count = db.query(OrgNode).filter(
        cast(OrgNode.path, String).like(f"{node.path}%"),
        OrgNode.type.in_(["project", "site"])
    ).count()

    # Headcount from SOC-EMP-001 if available
    emp_val = cons_map.get("SOC-EMP-001")
    total_emp = int(emp_val.value) if emp_val else 12500

    section_a = SectionAData(
        corporate_name="Megha Engineering & Infrastructures Ltd (MEIL)",
        financial_year=period.financial_year,
        total_employees=total_emp,
        operating_plants_and_sites_count=max(sites_count, 1)
    )

    section_b = SectionBData()

    # 4. Generate snapshot seal
    report_dict = {
        "entity": node.code,
        "period": period.code,
        "section_a": section_a.model_dump(),
        "section_c": [d.model_dump() for d in section_c],
        "total_scope_1_tco2e": total_scope_1,
        "total_scope_2_tco2e": total_scope_2,
        "total_scope_3_tco2e": total_scope_3,
        "total_ghg_emissions_tco2e": total_ghg,
    }
    snapshot_hash = hashlib.sha256(json.dumps(report_dict, sort_keys=True).encode("utf-8")).hexdigest()

    # 5. Persist Report record
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
    )
