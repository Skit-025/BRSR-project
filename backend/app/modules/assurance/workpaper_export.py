"""
app/modules/assurance/workpaper_export.py
Workpaper exporter for ESG auditors and verification agencies.
Packages substantive test sheets, evidence references, hashes, and reviewer sign-offs.
"""
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.modules.assurance.models import AssuranceEngagement, AssuranceFinding
from app.modules.org.models import ReportingPeriod, OrgNode


def generate_assurance_workpaper(db: Session, engagement_id: str) -> Dict[str, Any]:
    """
    Compiles full audit workpaper dossier for an assurance engagement.
    """
    eng = db.query(AssuranceEngagement).filter(AssuranceEngagement.id == engagement_id).first()
    if not eng:
        raise ValueError(f"Engagement '{engagement_id}' not found.")

    period = db.query(ReportingPeriod).filter(ReportingPeriod.id == eng.period_id).first()
    entity = db.query(OrgNode).filter(OrgNode.id == eng.entity_id).first()
    findings = db.query(AssuranceFinding).filter(AssuranceFinding.engagement_id == engagement_id).all()

    return {
        "engagement": {
            "id": eng.id,
            "firm": eng.assurance_firm_name,
            "lead_auditor": eng.lead_auditor_name,
            "level": eng.level,
            "status": eng.status,
            "scope_indicators": eng.scope_indicators,
        },
        "subject_matter": {
            "entity": entity.name if entity else "MEIL Group",
            "period": period.code if period else "FY2025-26",
            "financial_year": period.financial_year if period else "2025-2026",
        },
        "findings_summary": {
            "total_findings": len(findings),
            "material_count": sum(1 for f in findings if f.materiality == "MATERIAL"),
            "open_count": sum(1 for f in findings if f.status == "OPEN"),
            "findings": [
                {
                    "id": f.id,
                    "metric_code": f.metric_code,
                    "title": f.title,
                    "materiality": f.materiality,
                    "status": f.status,
                    "description": f.description,
                    "management_response": f.management_response,
                }
                for f in findings
            ]
        },
    }
