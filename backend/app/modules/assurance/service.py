"""
app/modules/assurance/service.py
Service layer for managing independent ESG assurance engagements and auditor findings.
"""
from typing import List, Optional
from sqlalchemy.orm import Session
from app.modules.assurance.models import AssuranceEngagement, AssuranceFinding, EngagementStatus
from app.modules.assurance.schemas import EngagementCreate, FindingCreate
from app.modules.assurance.sampling import generate_audit_sample
from app.modules.assurance.workpaper_export import generate_assurance_workpaper


class AssuranceService:
    def __init__(self, db: Session):
        self.db = db

    def create_engagement(self, req: EngagementCreate) -> AssuranceEngagement:
        eng = AssuranceEngagement(
            period_id=req.period_id,
            entity_id=req.entity_id,
            assurance_firm_name=req.assurance_firm_name,
            lead_auditor_name=req.lead_auditor_name,
            level=req.level.value if hasattr(req.level, "value") else str(req.level),
            scope_indicators=req.scope_indicators,
            status=EngagementStatus.PLANNING.value,
        )
        self.db.add(eng)
        self.db.commit()
        self.db.refresh(eng)
        return eng

    def list_engagements(self, period_id: Optional[str] = None) -> List[AssuranceEngagement]:
        query = self.db.query(AssuranceEngagement).filter(AssuranceEngagement.is_deleted == False)
        if period_id:
            query = query.filter(AssuranceEngagement.period_id == period_id)
        return query.order_by(AssuranceEngagement.created_at.desc()).all()

    def get_engagement(self, engagement_id: str) -> Optional[AssuranceEngagement]:
        return (
            self.db.query(AssuranceEngagement)
            .filter(AssuranceEngagement.id == engagement_id, AssuranceEngagement.is_deleted == False)
            .first()
        )

    def add_finding(self, req: FindingCreate) -> AssuranceFinding:
        finding = AssuranceFinding(
            engagement_id=req.engagement_id,
            data_point_id=req.data_point_id,
            metric_code=req.metric_code,
            materiality=req.materiality,
            title=req.title,
            description=req.description,
            auditor_recommendation=req.auditor_recommendation,
            status="OPEN",
        )
        self.db.add(finding)
        self.db.commit()
        self.db.refresh(finding)
        return finding

    def respond_to_finding(self, finding_id: str, management_response: str) -> AssuranceFinding:
        finding = self.db.query(AssuranceFinding).filter(AssuranceFinding.id == finding_id).first()
        if not finding:
            raise ValueError(f"Finding '{finding_id}' not found.")
        finding.management_response = management_response
        finding.status = "RESPONDED"
        self.db.commit()
        self.db.refresh(finding)
        return finding

    def run_sampling(self, period_id: str, metric_code: str, sample_pct: float = 15.0):
        return generate_audit_sample(self.db, period_id, metric_code, sample_pct)

    def export_workpaper(self, engagement_id: str):
        return generate_assurance_workpaper(self.db, engagement_id)
