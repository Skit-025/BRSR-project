"""
app/modules/valuechain/service.py
Service for value chain boundary derivation (top 75% cumulative spend) and assessments.
"""
from typing import List, Optional
from sqlalchemy.orm import Session
from app.modules.valuechain.models import ValueChainPartner, ValueChainAssessment
from app.modules.valuechain.schemas import PartnerCreate, AssessmentCreate


class ValueChainService:
    def __init__(self, db: Session):
        self.db = db

    def recalculate_75_percent_boundary(self):
        """
        Sorts all partners by annual spend descending, computes cumulative %,
        and tags in_sebi_75_boundary = True for the cumulative top 75%.
        """
        partners = (
            self.db.query(ValueChainPartner)
            .filter(ValueChainPartner.is_deleted == False)
            .order_by(ValueChainPartner.annual_spend_inr_crores.desc())
            .all()
        )
        total_spend = sum(p.annual_spend_inr_crores for p in partners)
        if total_spend <= 0:
            return

        cum_spend = 0.0
        boundary_met = False

        for p in partners:
            share = (p.annual_spend_inr_crores / total_spend) * 100.0
            cum_spend += share
            p.spend_share_pct = round(share, 2)
            p.cumulative_spend_pct = round(cum_spend, 2)

            if not boundary_met:
                p.in_sebi_75_boundary = True
                if cum_spend >= 75.0:
                    boundary_met = True
            else:
                p.in_sebi_75_boundary = False

        self.db.commit()

    def create_partner(self, req: PartnerCreate) -> ValueChainPartner:
        partner = ValueChainPartner(
            name=req.name,
            identifier=req.identifier,
            partner_type=req.partner_type.value if hasattr(req.partner_type, "value") else str(req.partner_type),
            category=req.category,
            annual_spend_inr_crores=req.annual_spend_inr_crores,
            contact_email=req.contact_email,
        )
        self.db.add(partner)
        self.db.commit()
        self.db.refresh(partner)
        self.recalculate_75_percent_boundary()
        self.db.refresh(partner)
        return partner

    def list_partners(self, in_boundary_only: bool = False) -> List[ValueChainPartner]:
        query = self.db.query(ValueChainPartner).filter(ValueChainPartner.is_deleted == False)
        if in_boundary_only:
            query = query.filter(ValueChainPartner.in_sebi_75_boundary == True)
        return query.order_by(ValueChainPartner.annual_spend_inr_crores.desc()).all()

    def record_assessment(self, req: AssessmentCreate) -> ValueChainAssessment:
        assessment = ValueChainAssessment(
            partner_id=req.partner_id,
            period_id=req.period_id,
            esg_score=req.esg_score,
            has_iso14001=req.has_iso14001,
            has_code_of_conduct=req.has_code_of_conduct,
            scope3_reported_tco2e=req.scope3_reported_tco2e,
            assessment_responses=req.assessment_responses,
            risk_level=req.risk_level,
        )
        self.db.add(assessment)
        self.db.commit()
        self.db.refresh(assessment)
        return assessment
