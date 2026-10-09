"""
app/modules/dashboards/service.py
Service for building complete executive dashboard payloads.
"""
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.modules.org.models import OrgNode, ReportingPeriod
from app.modules.collection.models import Submission, SubmissionStatus
from app.modules.metrics.models import Metric
from app.modules.dashboards.schemas import (
    ExecutiveDashboardSummary,
    SubmissionProgressSummary,
    PrincipleSummary,
)
from app.modules.dashboards.kpis import get_executive_kpis
from app.modules.dashboards.quality_score import compute_esg_quality_score


class DashboardService:
    def __init__(self, db: Session):
        self.db = db

    def get_summary(self, period_id: str, entity_id: str) -> ExecutiveDashboardSummary:
        period = self.db.query(ReportingPeriod).filter(ReportingPeriod.id == period_id).first()
        period_label = period.code if period else "Current Period"

        from app.modules.auth.service import get_descendant_node_ids
        target_node = self.db.query(OrgNode).filter(OrgNode.id == entity_id).first()
        if not target_node:
            target_node = self.db.query(OrgNode).filter(OrgNode.code == entity_id).first()

        scoped_entity_ids = [entity_id]
        total_reporting_entities = 1
        if target_node:
            desc_ids = get_descendant_node_ids(self.db, str(target_node.id))
            scoped_entity_ids = list(set([str(target_node.id)] + [str(d) for d in desc_ids]))
            reporting_nodes = self.db.query(OrgNode).filter(
                OrgNode.id.in_(scoped_entity_ids),
                OrgNode.type.in_(["project", "site", "bu", "business_unit"]),
                OrgNode.is_deleted == False
            ).all()
            total_reporting_entities = max(len(reporting_nodes), 1)

        # 1. Submission Progress scoped to this entity and its descendants
        submissions = (
            self.db.query(Submission)
            .filter(
                Submission.entity_id.in_(scoped_entity_ids),
                Submission.period_id == period_id,
                Submission.is_deleted == False
            )
            .all()
        )
        total_sub = len(submissions)
        approved = sum(1 for s in submissions if s.status in [SubmissionStatus.BU_APPROVED.value, SubmissionStatus.SUBSIDIARY_APPROVED.value, SubmissionStatus.CONSOLIDATED.value])
        in_rev = sum(1 for s in submissions if s.status in [SubmissionStatus.SUBMITTED.value, SubmissionStatus.UNDER_BU_REVIEW.value])
        draft = sum(1 for s in submissions if s.status == SubmissionStatus.DRAFT.value)
        rejected = sum(1 for s in submissions if s.status == SubmissionStatus.RETURNED.value)

        progress_pct = (approved / total_reporting_entities * 100.0) if total_reporting_entities > 0 else 0.0

        sub_progress = SubmissionProgressSummary(
            total_entities=total_reporting_entities,
            total_submissions=total_sub,
            approved=approved,
            in_review=in_rev,
            draft=draft,
            rejected=rejected,
            overall_progress_pct=round(progress_pct, 1),
        )

        # 2. Quality Score
        sub_ids = [s.id for s in submissions]
        qs = compute_esg_quality_score(self.db, sub_ids)

        # 3. Key KPIs
        kpis = get_executive_kpis(self.db, period_id, entity_id)

        # 4. Principle Summaries (Principles 1 through 9)
        principles: List[PrincipleSummary] = []
        for p_num in range(1, 10):
            p_metrics = self.db.query(Metric).filter(Metric.principle == p_num).all()
            tot_p_m = len(p_metrics)
            principles.append(
                PrincipleSummary(
                    principle=p_num,
                    title=f"Principle {p_num}",
                    total_metrics=tot_p_m,
                    reported_metrics=tot_p_m,
                    completion_percentage=round(progress_pct, 1),
                    data_quality_score=qs["score"],
                )
            )

        return ExecutiveDashboardSummary(
            reporting_period=period_label,
            submission_progress=sub_progress,
            data_quality_score=qs["score"],
            data_quality_grade=qs["grade"],
            key_environmental_kpis=kpis["environmental"],
            key_social_kpis=kpis["social"],
            principles=principles,
        )
