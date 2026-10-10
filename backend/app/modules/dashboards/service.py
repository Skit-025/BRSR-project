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
from app.modules.dashboards.kpis import (
    get_executive_kpis,
    is_new_railway_project,
    is_seed_demo_entity,
    get_entity_mock_data,
)
from app.modules.dashboards.quality_score import compute_esg_quality_score


class DashboardService:
    def __init__(self, db: Session):
        self.db = db

    def get_summary(self, period_id: str, entity_id: str) -> ExecutiveDashboardSummary:
        import uuid
        is_period_uuid = False
        try:
            uuid.UUID(str(period_id))
            is_period_uuid = True
        except (ValueError, TypeError):
            pass

        if is_period_uuid:
            period = self.db.query(ReportingPeriod).filter(ReportingPeriod.id == period_id).first()
        else:
            period = self.db.query(ReportingPeriod).filter(ReportingPeriod.code == period_id).first()

        period_label = period.code if period else str(period_id)
        effective_period_uuid = None
        if period:
            effective_period_uuid = period.id
        else:
            try:
                effective_period_uuid = uuid.UUID(str(period_id))
            except (ValueError, TypeError):
                effective_period_uuid = None

        from app.modules.auth.service import get_descendant_node_ids
        is_entity_uuid = False
        try:
            uuid.UUID(str(entity_id))
            is_entity_uuid = True
        except (ValueError, TypeError):
            pass

        if is_entity_uuid:
            target_node = self.db.query(OrgNode).filter(OrgNode.id == entity_id).first()
        else:
            target_node = self.db.query(OrgNode).filter(OrgNode.code == entity_id).first()

        scoped_entity_ids = []
        total_reporting_entities = 1
        if target_node:
            desc_ids = get_descendant_node_ids(self.db, str(target_node.id))
            valid_uuids = set()
            valid_uuids.add(target_node.id)
            for d in desc_ids:
                try:
                    valid_uuids.add(uuid.UUID(str(d)))
                except (ValueError, TypeError):
                    continue
            scoped_entity_ids = list(valid_uuids)
            reporting_nodes = self.db.query(OrgNode).filter(
                OrgNode.id.in_(scoped_entity_ids),
                OrgNode.type.in_(["project", "site", "bu", "business_unit"]),
                OrgNode.is_deleted == False
            ).all()
            total_reporting_entities = max(len(reporting_nodes), 1)

        is_railway = is_new_railway_project(target_node)

        # 1. Submission Progress scoped to this entity and its descendants
        submissions = []
        if scoped_entity_ids and effective_period_uuid:
            submissions = (
                self.db.query(Submission)
                .filter(
                    Submission.entity_id.in_(scoped_entity_ids),
                    Submission.period_id == effective_period_uuid,
                    Submission.is_deleted == False
                )
                .all()
            )
        total_sub = len(submissions)
        approved = sum(1 for s in submissions if s.status in [SubmissionStatus.BU_APPROVED.value, SubmissionStatus.SUBSIDIARY_APPROVED.value, SubmissionStatus.CONSOLIDATED.value])
        in_rev = sum(1 for s in submissions if s.status in [SubmissionStatus.SUBMITTED.value, SubmissionStatus.UNDER_BU_REVIEW.value])
        draft = sum(1 for s in submissions if s.status == SubmissionStatus.DRAFT.value)
        rejected = sum(1 for s in submissions if s.status == SubmissionStatus.RETURNED.value)

        is_railway = is_new_railway_project(target_node)

        # Check for real filled operational data points and workflow progression
        has_real_filled_data = False
        filled_count = 0
        if total_sub > 0:
            from app.modules.collection.models import DataPoint
            sub_ids = [s.id for s in submissions]
            dps = self.db.query(DataPoint).filter(DataPoint.submission_id.in_(sub_ids), DataPoint.is_deleted == False).all()
            filled_count = sum(1 for d in dps if d.value_numeric is not None or (d.value_text is not None and str(d.value_text).strip() != ""))
            if filled_count > 0 or approved > 0 or in_rev > 0:
                has_real_filled_data = True

        if is_railway:
            # Rule: Railway project is new -> strictly 0.0% / empty until user starts adding data
            if not has_real_filled_data:
                progress_pct = 0.0
                data_cov_pct = 0.0
                assurance_score = 0.0
                qs = {"score": 0.0, "grade": "—"}
                approved, in_rev, draft, total_sub = 0, 0, 0, 0
                total_reporting_entities = 0
                brsr_status = "Submissions Pending"
            else:
                data_cov_pct = min(100.0, max(1.0, round((filled_count / 16.0) * 100.0, 1)))
                if approved > 0:
                    progress_pct = min(100.0, round(85.0 + (data_cov_pct * 0.15), 1))
                    brsr_status = "SEBI Aligned"
                elif in_rev > 0:
                    progress_pct = min(80.0, round(50.0 + (data_cov_pct * 0.30), 1))
                    brsr_status = "In Review"
                else:
                    progress_pct = min(50.0, round(data_cov_pct * 0.50, 1))
                    brsr_status = "In Progress"
                assurance_score = min(100.0, round(progress_pct * 0.6 + data_cov_pct * 0.4, 1))
                qs_grade = "A" if assurance_score >= 88 else ("B+" if assurance_score >= 78 else ("B" if assurance_score >= 65 else ("C" if assurance_score >= 40 else "D")))
                qs = {"score": assurance_score, "grade": qs_grade}
        elif is_seed_demo_entity(target_node) and not has_real_filled_data:
            # Pre-seeded demo entity with no real data: use curated mock so the demo looks populated
            mock = get_entity_mock_data(target_node)
            progress_pct = mock.get("progress", 82.0)
            data_cov_pct = mock.get("coverage", 84.0)
            assurance_score = mock.get("assurance", 81.0)
            qs = {"score": mock.get("qs_score", 85.0), "grade": mock.get("qs_grade", "B+")}
            approved = mock.get("approved", 1)
            in_rev = mock.get("in_rev", 0)
            draft = mock.get("draft", 0)
            total_sub = mock.get("total_sub", 1)
            total_reporting_entities = mock.get("total_entities", 1)
            brsr_status = "SEBI Aligned"
        elif has_real_filled_data:
            # Any entity that has real submitted data: compute dynamically
            data_cov_pct = min(100.0, max(1.0, round((filled_count / max(total_reporting_entities * 16, 1)) * 100.0, 1)))
            if approved > 0:
                progress_pct = min(100.0, round(85.0 + (data_cov_pct * 0.15), 1))
                brsr_status = "SEBI Aligned"
            elif in_rev > 0:
                progress_pct = min(80.0, round(50.0 + (data_cov_pct * 0.30), 1))
                brsr_status = "In Review"
            else:
                progress_pct = min(50.0, round(data_cov_pct * 0.50, 1))
                brsr_status = "In Progress"
            assurance_score = min(100.0, round(progress_pct * 0.6 + data_cov_pct * 0.4, 1))
            qs_grade = "A" if assurance_score >= 88 else ("B+" if assurance_score >= 78 else ("B" if assurance_score >= 65 else ("C" if assurance_score >= 40 else "D")))
            qs = {"score": assurance_score, "grade": qs_grade}
        else:
            # Newly created real entity with zero filled data -> strict zeros
            progress_pct = 0.0
            data_cov_pct = 0.0
            assurance_score = 0.0
            qs = {"score": 0.0, "grade": "—"}
            # Keep actual draft/total counts (don't zero those out — empty drafts are still real)
            approved = 0
            in_rev = 0
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
        # Determine whether this entity has real data (for principles calculation)
        is_no_data_entity = not has_real_filled_data and not is_seed_demo_entity(target_node) and not is_railway
        for p_num in range(1, 10):
            p_metrics = self.db.query(Metric).filter(Metric.principle == p_num).all()
            tot_p_m = len(p_metrics)
            if is_no_data_entity or (is_railway and not has_real_filled_data):
                rep_m = 0
                p_comp = 0.0
            else:
                # Principles 1 through 8 active, Principle 9 optional
                rep_m = tot_p_m if p_num <= 8 else 0
                p_comp = round(progress_pct, 1) if p_num <= 8 else 0.0

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

            for child in child_nodes:
                # Get real submission stats for this child and its descendants
                child_is_seed = is_seed_demo_entity(child)

                if child_is_seed and not has_real_filled_data:
                    # Demo child: use curated mock
                    c_mock = get_entity_mock_data(child)
                    c_pct = c_mock.get("coverage", 82.0)
                    c_stat = "Ready" if c_pct >= 85.0 else "In Review"
                    c_stat_type = "success" if c_stat == "Ready" else "neutral"
                    c_ev = "4/4" if c_stat == "Ready" else "3/4"
                else:
                    # Real/new child: compute from actual submissions
                    from app.modules.auth.service import get_descendant_node_ids
                    import uuid as _uuid
                    child_desc_raw = get_descendant_node_ids(self.db, str(child.id))
                    child_scope = set()
                    child_scope.add(child.id)
                    for d in child_desc_raw:
                        try:
                            child_scope.add(_uuid.UUID(str(d)))
                        except (ValueError, TypeError):
                            pass

                    child_subs = []
                    if effective_period_uuid:
                        child_subs = (
                            self.db.query(Submission)
                            .filter(
                                Submission.entity_id.in_(list(child_scope)),
                                Submission.period_id == effective_period_uuid,
                                Submission.is_deleted == False,
                            )
                            .all()
                        )

                    child_approved = sum(1 for s in child_subs if s.status in [
                        SubmissionStatus.BU_APPROVED.value,
                        SubmissionStatus.SUBSIDIARY_APPROVED.value,
                        SubmissionStatus.CONSOLIDATED.value,
                    ])
                    child_in_rev = sum(1 for s in child_subs if s.status in [
                        SubmissionStatus.SUBMITTED.value,
                        SubmissionStatus.UNDER_BU_REVIEW.value,
                    ])

                    if child_subs:
                        from app.modules.collection.models import DataPoint
                        child_sub_ids = [s.id for s in child_subs]
                        child_dps = self.db.query(DataPoint).filter(
                            DataPoint.submission_id.in_(child_sub_ids),
                            DataPoint.is_deleted == False,
                        ).all()
                        child_filled = sum(
                            1 for d in child_dps
                            if d.value_numeric is not None or (d.value_text is not None and str(d.value_text).strip() != "")
                        )
                        # Coverage = filled metrics / expected (16 per project = sensible default)
                        expected = max(len(child_subs) * 16, 1)
                        c_pct = min(100.0, round((child_filled / expected) * 100.0, 1))
                    else:
                        child_filled = 0
                        c_pct = 0.0

                    if child_approved > 0:
                        c_stat = "Approved"
                        c_stat_type = "success"
                    elif child_in_rev > 0:
                        c_stat = "In Review"
                        c_stat_type = "neutral"
                    elif child_subs:
                        c_stat = "Draft"
                        c_stat_type = "neutral"
                    else:
                        c_stat = "Awaiting Submission"
                        c_stat_type = "warning"

                    total_child_metrics = max(len(child_subs) * 16, 0)
                    c_ev = f"{child_filled}/{total_child_metrics}" if total_child_metrics > 0 else "0/0"

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
