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


PRE_EXISTING_DEMO_CODES = {
    "AAROHAN-GROUP", "AAROHAN-RENEW", "BU-SOLAR", "PRJ-ODISHA-SOLAR",
    "BU-WIND", "PRJ-GUJ-WIND", "AAROHAN-INFRA", "BU-HIGHWAYS", "PRJ-HIGHWAY-NH16"
}


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

        node_code = (target_node.code or "").upper() if target_node else ""
        is_pre_existing = node_code in PRE_EXISTING_DEMO_CODES or (target_node and target_node.is_root)

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

        has_real_submissions = total_sub > 0

        if has_real_submissions:
            # Dynamically calculate progress from actual database submissions
            from app.modules.collection.models import DataPoint
            sub_ids = [s.id for s in submissions]
            dps = self.db.query(DataPoint).filter(DataPoint.submission_id.in_(sub_ids), DataPoint.is_deleted == False).all()
            filled_count = sum(1 for d in dps if d.value_numeric is not None or d.value_text is not None)
            total_expected_dps = max(len(dps), total_reporting_entities * 40)

            if total_reporting_entities > 0 and approved > 0:
                progress_pct = min(100.0, round((approved / total_reporting_entities) * 100.0, 1))
            elif total_expected_dps > 0 and filled_count > 0:
                progress_pct = min(100.0, round((filled_count / total_expected_dps) * 100.0, 1))
            else:
                progress_pct = 0.0

            data_cov_pct = min(100.0, round((filled_count / total_expected_dps) * 100.0, 1)) if total_expected_dps > 0 else progress_pct
            qs = compute_esg_quality_score(self.db, sub_ids)
            assurance_score = min(100.0, round(progress_pct * 0.9 + qs["score"] * 0.1, 1))
            brsr_status = "SEBI Aligned" if approved > 0 else "Submissions Pending"
        else:
            # No real submissions for this entity
            if is_pre_existing:
                # Realistic baseline data strictly between 70% and 90%
                if target_node and target_node.type == "group":
                    progress_pct = 85.4
                    data_cov_pct = 88.2
                    assurance_score = 84.5
                    qs = {"score": 87.6, "grade": "B+"}
                    approved, in_rev, draft, total_sub = 11, 2, 1, 14
                    total_reporting_entities = 14
                elif target_node and target_node.type == "subsidiary":
                    progress_pct = 82.6
                    data_cov_pct = 84.8
                    assurance_score = 81.3
                    qs = {"score": 86.2, "grade": "B+"}
                    approved, in_rev, draft, total_sub = 5, 1, 0, 6
                    total_reporting_entities = 6
                elif target_node and target_node.type in ("business_unit", "bu"):
                    progress_pct = 78.4
                    data_cov_pct = 79.5
                    assurance_score = 76.5
                    qs = {"score": 78.8, "grade": "B"}
                    approved, in_rev, draft, total_sub = 2, 1, 0, 3
                    total_reporting_entities = 3
                else: # project
                    progress_pct = 88.0
                    data_cov_pct = 88.5
                    assurance_score = 85.0
                    qs = {"score": 89.2, "grade": "B+"}
                    approved, in_rev, draft, total_sub = 1, 0, 0, 1
                    total_reporting_entities = 1
                brsr_status = "SEBI Aligned"
            else:
                # Newly created entity with no data -> strictly 0.0%
                progress_pct = 0.0
                data_cov_pct = 0.0
                assurance_score = 0.0
                qs = {"score": 0.0, "grade": "—"}
                approved, in_rev, draft, total_sub = 0, 0, 0, 0
                brsr_status = "Submissions Pending"

        sub_progress = SubmissionProgressSummary(
            total_entities=total_reporting_entities,
            total_submissions=total_sub,
            approved=approved,
            in_review=in_rev,
            draft=draft,
            rejected=rejected,
            overall_progress_pct=round(progress_pct, 1),
        )

        # 2. Key KPIs
        kpis = get_executive_kpis(self.db, period_id, entity_id)

        # 3. Principle Summaries (Principles 1 through 9)
        principles: List[PrincipleSummary] = []
        for p_num in range(1, 10):
            p_metrics = self.db.query(Metric).filter(Metric.principle == p_num).all()
            tot_p_m = len(p_metrics)
            if has_real_submissions:
                rep_m = tot_p_m if approved > 0 else int(tot_p_m * (progress_pct / 100.0))
                p_comp = round(progress_pct, 1)
            elif is_pre_existing:
                rep_m = tot_p_m if p_num <= 8 else 0
                p_comp = round(progress_pct, 1) if p_num <= 8 else 0.0
            else:
                rep_m = 0
                p_comp = 0.0

            principles.append(
                PrincipleSummary(
                    principle=p_num,
                    title=f"Principle {p_num}",
                    total_metrics=tot_p_m,
                    reported_metrics=rep_m,
                    completion_percentage=p_comp,
                    data_quality_score=qs["score"],
                )
            )

        # 4. Operating Units (Child entities with individual progress percentages)
        operating_units: List[Dict[str, Any]] = []
        if target_node:
            child_nodes = self.db.query(OrgNode).filter(
                OrgNode.parent_id == target_node.id,
                OrgNode.is_deleted == False
            ).all()

            # Baseline mock variations between 70% and 90% for pre-existing children
            demo_pcts = [89.4, 82.1, 78.6, 85.2, 74.5, 88.0]

            for idx, child in enumerate(child_nodes):
                c_subs = self.db.query(Submission).filter(
                    Submission.entity_id == child.id,
                    Submission.period_id == period_id,
                    Submission.is_deleted == False
                ).all()

                child_is_pre = (child.code or "").upper() in PRE_EXISTING_DEMO_CODES

                if len(c_subs) > 0:
                    c_app = sum(1 for s in c_subs if s.status in [SubmissionStatus.BU_APPROVED.value, SubmissionStatus.SUBSIDIARY_APPROVED.value, SubmissionStatus.CONSOLIDATED.value])
                    c_rev = sum(1 for s in c_subs if s.status in [SubmissionStatus.SUBMITTED.value, SubmissionStatus.UNDER_BU_REVIEW.value])
                    c_pct = 100.0 if c_app > 0 else (50.0 if c_rev > 0 else 25.0)
                    c_stat = "Ready" if c_app > 0 else ("In Review" if c_rev > 0 else "Draft")
                    c_stat_type = "success" if c_app > 0 else ("neutral" if c_rev > 0 else "neutral")
                    c_ev = f"{c_app}/{len(c_subs)}"
                elif child_is_pre:
                    # Pre-existing seeded child: realistic baseline between 70% and 90%
                    c_pct = demo_pcts[idx % len(demo_pcts)]
                    c_stat = "Ready" if c_pct >= 85.0 else "In Review"
                    c_stat_type = "success" if c_stat == "Ready" else "neutral"
                    c_ev = "4/4" if c_stat == "Ready" else "3/4"
                else:
                    # Newly created child: strictly 0%
                    c_pct = 0.0
                    c_stat = "Draft"
                    c_stat_type = "neutral"
                    c_ev = "0/0"

                route = f"/disclosure/bu?nodeId={child.id}" if child.type in ("bu", "business_unit") else (
                    f"/disclosure/subsidiary?nodeId={child.id}" if child.type == "subsidiary" else f"/projects/{child.id}"
                )

                operating_units.append({
                    "id": str(child.id),
                    "name": child.name,
                    "code": child.code,
                    "type": child.type.replace("_", " ").title(),
                    "coverage_pct": round(c_pct, 1),
                    "evidence": c_ev,
                    "status": c_stat,
                    "statusType": c_stat_type,
                    "route": route
                })

        return ExecutiveDashboardSummary(
            reporting_period=period_label,
            submission_progress=sub_progress,
            data_quality_score=qs["score"],
            data_quality_grade=qs["grade"],
            assurance_score=assurance_score,
            data_coverage_pct=data_cov_pct,
            completeness_pct=data_cov_pct,
            brsr_core_status=brsr_status,
            key_environmental_kpis=kpis["environmental"],
            key_social_kpis=kpis["social"],
            principles=principles,
            operating_units=operating_units,
        )
