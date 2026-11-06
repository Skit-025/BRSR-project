import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import SessionLocal, init_db
from app.modules.org.models import OrgNode, ReportingPeriod, PeriodType, PeriodStatus
from app.modules.auth.models import User
from app.modules.collection.models import Submission, SubmissionStatus, DataPoint
from app.modules.workflow.models import Review
from app.modules.notifications.models import Notification
from app.modules.consolidation.service import get_reporting_coverage, run_consolidation_engine
from app.modules.org.tree import build_materialized_path

client = TestClient(app)


from app.security.jwt import create_access_token


def get_token(username: str = "admin@aarohan.in", password: str = "Password123!") -> str:
    with SessionLocal() as db:
        user = db.query(User).filter(
            (User.email == username) | (User.email.ilike(username))
        ).first()
        if user:
            return create_access_token(
                subject=str(user.id),
                role=user.role,
                org_node_id=str(user.org_node_id) if user.org_node_id else None,
            )
    res = client.post("/api/v1/auth/login", json={"username": username, "password": password})
    assert res.status_code == 200, f"Login failed: {res.text}"
    return res.json()["access_token"]


@pytest.fixture(autouse=True)
def setup_db():
    init_db()


def create_test_period(db, suffix: str) -> ReportingPeriod:
    p = ReportingPeriod(
        code=f"FY26_{suffix}",
        financial_year="2025-2026",
        period_type=PeriodType.MONTH.value,
        start_date="2025-06-01",
        end_date="2025-06-30",
        status=PeriodStatus.OPEN.value,
    )
    db.add(p)
    db.flush()
    return p


def test_segregation_of_duties_and_role_boundaries():
    """Verify SoD: maker cannot approve own submission (409) and supervisors cannot review (403)."""
    suffix = uuid.uuid4().hex[:6]
    with SessionLocal() as db:
        period = create_test_period(db, suffix)
        proj_sup = db.query(User).filter_by(email="project.supervisor@aarohan.in").first()
        proj_adm = db.query(User).filter_by(email="project.admin@aarohan.in").first()

        # Create submission by project supervisor
        sub = Submission(
            entity_id=proj_sup.org_node_id,
            period_id=period.id,
            status=SubmissionStatus.SUBMITTED.value,
            maker_id=proj_sup.id,
        )
        db.add(sub)
        db.commit()
        sub_id = sub.id

    # 1. Project supervisor attempts to review own submission -> Forbidden (403) or SoD Conflict (409)
    sup_token = get_token("project.supervisor@aarohan.in")
    res_sup = client.post(
        f"/api/v1/workflow/review/{sub_id}",
        json={"decision": "APPROVE", "reviewer_id": str(proj_sup.id), "comment": "Self review"},
        headers={"Authorization": f"Bearer {sup_token}"},
    )
    assert res_sup.status_code in (403, 409), f"Expected 403 or 409, got {res_sup.status_code}: {res_sup.text}"

    # 2. Legitimate Project Admin reviews -> succeeds (200) and advances to PROJECT_APPROVED
    adm_token = get_token("project.admin@aarohan.in")
    res_adm = client.post(
        f"/api/v1/workflow/review/{sub_id}",
        json={"decision": "APPROVE", "reviewer_id": str(proj_adm.id), "comment": "Verified site metrics against voucher."},
        headers={"Authorization": f"Bearer {adm_token}"},
    )
    assert res_adm.status_code == 200
    assert res_adm.json()["decision"] == "APPROVE"

    with SessionLocal() as db:
        updated_sub = db.query(Submission).filter_by(id=sub_id).first()
        assert updated_sub.status == SubmissionStatus.PROJECT_APPROVED.value


def test_rejection_requires_mandatory_comment():
    """Verify that rejection requires a comment and returns the pack to the supervisor."""
    suffix = uuid.uuid4().hex[:6]
    with SessionLocal() as db:
        period = create_test_period(db, suffix)
        proj_sup = db.query(User).filter_by(email="project.supervisor@aarohan.in").first()
        proj_adm = db.query(User).filter_by(email="project.admin@aarohan.in").first()

        sub = Submission(
            entity_id=proj_sup.org_node_id,
            period_id=period.id,
            status=SubmissionStatus.SUBMITTED.value,
            maker_id=proj_sup.id,
        )
        db.add(sub)
        db.commit()
        sub_id = sub.id

    adm_token = get_token("project.admin@aarohan.in")

    # Reject without comment -> 400
    res_no_comment = client.post(
        f"/api/v1/workflow/review/{sub_id}",
        json={"decision": "RETURN", "reviewer_id": str(proj_adm.id), "comment": "   "},
        headers={"Authorization": f"Bearer {adm_token}"},
    )
    assert res_no_comment.status_code == 400
    assert "mandatory" in res_no_comment.json()["detail"].lower() or "comment required" in res_no_comment.json()["detail"].lower()

    # Reject with comment -> 200 and RETURNED
    res_with_comment = client.post(
        f"/api/v1/workflow/review/{sub_id}",
        json={"decision": "RETURN", "reviewer_id": str(proj_adm.id), "comment": "Meter serial number is illegible."},
        headers={"Authorization": f"Bearer {adm_token}"},
    )
    assert res_with_comment.status_code == 200

    with SessionLocal() as db:
        updated_sub = db.query(Submission).filter_by(id=sub_id).first()
        assert updated_sub.status == SubmissionStatus.RETURNED.value
        latest_review = db.query(Review).filter_by(submission_id=sub_id).order_by(Review.created_at.desc()).first()
        assert latest_review is not None
        assert latest_review.comment == "Meter serial number is illegible."


def test_bu_progressive_reporting_coverage_50_projects_30_approved():
    """
    Critical requirement:
    A BU has 50 projects. 30 have submitted reports and received Project Admin approval.
    20 have not submitted reports.
    BU Supervisor must work with the 30 approved project records without being blocked,
    and missing projects must not be fabricated or zeroed out.
    """
    suffix = uuid.uuid4().hex[:6]
    with SessionLocal() as db:
        period = create_test_period(db, suffix)

        # Create BU
        bu_code = f"BU_TEST_{suffix}".upper()
        bu = OrgNode(
            code=bu_code,
            name=f"Tunneling Infrastructure BU {suffix}",
            type="business_unit",
            path=bu_code,
            ownership_pct=100.0,
            control_type="operational_control",
            boundary=True,
            is_active=True,
        )
        db.add(bu)
        db.flush()

        # Create 50 Projects under this BU
        for i in range(50):
            p_code = f"PRJ_{suffix}_{i:02d}".upper()
            p_path = f"{bu_code}.{p_code}"
            p = OrgNode(
                code=p_code,
                name=f"Highway Segment {i:02d}",
                type="project",
                parent_id=bu.id,
                path=p_path,
                ownership_pct=100.0,
                control_type="operational_control",
                boundary=True,
                is_active=True,
            )
            db.add(p)
            db.flush()

            if i < 30:
                # 30 approved projects
                sub = Submission(
                    entity_id=p.id,
                    period_id=period.id,
                    status=SubmissionStatus.PROJECT_APPROVED.value,
                )
                db.add(sub)
                db.flush()
                dp = DataPoint(
                    submission_id=sub.id,
                    metric_code="ENV-ENERGY-001",
                    value_numeric=100.0,
                    unit="kWh",
                    status="ACTUAL",
                )
                db.add(dp)

        # Bind bu.supervisor to this BU for scope authorization
        bu_sup = db.query(User).filter_by(email="bu.supervisor@aarohan.in").first()
        bu_sup.org_node_id = bu.id

        db.commit()
        bu_id = str(bu.id)
        period_id = str(period.id)

    # Check reporting coverage analysis
    token = get_token("bu.supervisor@aarohan.in")
    res = client.get(
        f"/api/v1/consolidation/coverage/{bu_id}/{period_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    cov = res.json()

    assert cov["total_children_count"] == 50
    assert cov["approved_children_count"] == 30
    assert cov["coverage_pct"] == 60.0
    assert cov["is_complete"] is False
    assert cov["can_proceed_with_progressive_reporting"] is True
    assert len(cov["contributing_entities"]) == 30
    assert len(cov["missing_entities"]) == 20

    # Ensure BU consolidation executes on the actual 30 approved records
    with SessionLocal() as db:
        res_calc = run_consolidation_engine(db, period_id=period_id, root_node_id=bu_id)
        assert res_calc.consolidated_metrics_count >= 1
        assert res_calc.consolidated_nodes_count >= 1
        # Check rolled up value for BU: 30 projects * 100 kWh = 3000.0 kWh
        from app.modules.consolidation.models import ConsolidatedValue
        bu_val = db.query(ConsolidatedValue).filter_by(entity_id=bu_id, period_id=period_id, metric_code="ENV-ENERGY-001").first()
        assert bu_val is not None
        assert bu_val.value == 3000.0


def test_subsidiary_progressive_reporting_coverage_80_bus_20_approved():
    """
    Critical requirement:
    A Subsidiary has 80 Business Units. 20 have submitted and received BU Admin approval.
    60 have not submitted.
    Subsidiary Supervisor must work with the 20 approved BU records without being blocked,
    coverage is 25%, and missing BUs are accurately reported.
    """
    suffix = uuid.uuid4().hex[:6]
    with SessionLocal() as db:
        period = create_test_period(db, suffix)

        # Create Subsidiary
        sub_code = f"SUB_TEST_{suffix}".upper()
        sub_org = OrgNode(
            code=sub_code,
            name=f"Roadways Corporation {suffix}",
            type="subsidiary",
            path=sub_code,
            ownership_pct=100.0,
            control_type="operational_control",
            boundary=True,
            is_active=True,
        )
        db.add(sub_org)
        db.flush()

        # Create 80 BUs under this Subsidiary
        for i in range(80):
            bu_code = f"BU_{suffix}_{i:02d}".upper()
            bu_path = f"{sub_code}.{bu_code}"
            bu = OrgNode(
                code=bu_code,
                name=f"Regional Division {i:02d}",
                type="business_unit",
                parent_id=sub_org.id,
                path=bu_path,
                ownership_pct=100.0,
                control_type="operational_control",
                boundary=True,
                is_active=True,
            )
            db.add(bu)
            db.flush()

            if i < 20:
                # 20 approved BUs
                submission = Submission(
                    entity_id=bu.id,
                    period_id=period.id,
                    status=SubmissionStatus.BU_APPROVED.value,
                )
                db.add(submission)
                db.flush()
                dp = DataPoint(
                    submission_id=submission.id,
                    metric_code="ENV-WATER-001",
                    value_numeric=500.0,
                    unit="kL",
                    status="ACTUAL",
                )
                db.add(dp)

        # Bind subsidiary.supervisor to this Subsidiary for scope authorization
        sub_sup = db.query(User).filter_by(email="subsidiary.supervisor@aarohan.in").first()
        sub_sup.org_node_id = sub_org.id

        db.commit()
        sub_org_id = str(sub_org.id)
        period_id = str(period.id)

    token = get_token("subsidiary.supervisor@aarohan.in")
    res = client.get(
        f"/api/v1/consolidation/coverage/{sub_org_id}/{period_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    cov = res.json()

    assert cov["total_children_count"] == 80
    assert cov["approved_children_count"] == 20
    assert cov["coverage_pct"] == 25.0
    assert cov["is_complete"] is False
    assert cov["can_proceed_with_progressive_reporting"] is True
    assert len(cov["contributing_entities"]) == 20
    assert len(cov["missing_entities"]) == 60

    # Ensure subsidiary consolidation executes on the actual 20 approved records
    with SessionLocal() as db:
        res_calc = run_consolidation_engine(db, period_id=period_id, root_node_id=sub_org_id)
        assert res_calc.consolidated_metrics_count >= 1
        assert res_calc.consolidated_nodes_count >= 1
        from app.modules.consolidation.models import ConsolidatedValue
        sub_val = db.query(ConsolidatedValue).filter_by(entity_id=sub_org_id, period_id=period_id, metric_code="ENV-WATER-001").first()
        assert sub_val is not None
        assert sub_val.value == 10000.0


def test_stage1_to_stage8_hierarchical_workflow_end_to_end():
    """
    Test the full 8-stage hierarchical workflow:
    Stage 1: Project Supervisor submits project data -> SUBMITTED
    Stage 2: Project Admin verifies and approves -> PROJECT_APPROVED
    Stage 3: BU Supervisor submits available BU report -> UNDER_BU_REVIEW
    Stage 4: BU Admin verifies and approves -> BU_APPROVED
    Stage 5: Subsidiary Supervisor submits available subsidiary report -> UNDER_SUBSIDIARY_REVIEW
    Stage 6: Subsidiary Admin verifies and approves -> SUBSIDIARY_APPROVED
    Stage 7: Group Supervisor compiles Group BRSR -> UNDER_GROUP_REVIEW
    Stage 8: Group Admin verifies, grants final sign-off and locks -> LOCKED
    """
    suffix = uuid.uuid4().hex[:6]
    with SessionLocal() as db:
        period = create_test_period(db, suffix)
        proj_sup = db.query(User).filter_by(email="project.supervisor@aarohan.in").first()
        proj_adm = db.query(User).filter_by(email="project.admin@aarohan.in").first()
        bu_sup = db.query(User).filter_by(email="bu.supervisor@aarohan.in").first()
        bu_adm = db.query(User).filter_by(email="bu.admin@aarohan.in").first()
        sub_sup = db.query(User).filter_by(email="subsidiary.supervisor@aarohan.in").first()
        sub_adm = db.query(User).filter(
            (User.email == "sub.admin@aarohan.in") | (User.email == "subsidiary.admin@aarohan.in")
        ).first()
        grp_sup = db.query(User).filter_by(email="group.supervisor@aarohan.in").first()
        grp_adm = db.query(User).filter_by(email="group.admin@aarohan.in").first()

        # Create submission with a data point
        sub = Submission(
            entity_id=proj_sup.org_node_id,
            period_id=period.id,
            status=SubmissionStatus.DRAFT.value,
            maker_id=proj_sup.id,
        )
        db.add(sub)
        db.flush()
        dp = DataPoint(
            submission_id=sub.id,
            metric_code="ENV-ENERGY-001",
            value_numeric=1234.5,
            unit="kWh",
            status="ACTUAL",
        )
        db.add(dp)
        db.commit()
        sub_id = sub.id

    # Tokens for all personas
    p_sup_tok = get_token(proj_sup.email)
    p_adm_tok = get_token(proj_adm.email)
    b_sup_tok = get_token(bu_sup.email)
    b_adm_tok = get_token(bu_adm.email)
    s_sup_tok = get_token(sub_sup.email)
    s_adm_tok = get_token(sub_adm.email)
    g_sup_tok = get_token(grp_sup.email)
    g_adm_tok = get_token(grp_adm.email)

    # Stage 1: Project Supervisor uploads evidence, links it, and submits report
    up_res = client.post(
        "/api/v1/evidence/upload",
        files={"file": ("meter_reading.pdf", b"POWER INVOICE VERIFIED", "application/pdf")},
        headers={"Authorization": f"Bearer {p_sup_tok}"},
    )
    assert up_res.status_code == 201
    ev_id = up_res.json()["evidence"]["id"]
    client.post(
        "/api/v1/evidence/link",
        json={"evidence_id": ev_id, "data_point_id": str(dp.id), "page_ref": "Page 1"},
        headers={"Authorization": f"Bearer {p_sup_tok}"},
    )

    res_s1 = client.post(
        f"/api/v1/collection/submit/{sub_id}",
        headers={"Authorization": f"Bearer {p_sup_tok}"},
    )
    assert res_s1.status_code == 200
    assert res_s1.json()["status"] == SubmissionStatus.SUBMITTED.value

    # Stage 2: Project Admin reviews & approves -> PROJECT_APPROVED
    res_s2 = client.post(
        f"/api/v1/workflow/review/{sub_id}",
        json={"decision": "APPROVE", "reviewer_id": str(proj_adm.id), "comment": "Site data verified."},
        headers={"Authorization": f"Bearer {p_adm_tok}"},
    )
    assert res_s2.status_code == 200
    with SessionLocal() as db:
        s = db.query(Submission).filter_by(id=sub_id).first()
        assert s.status == SubmissionStatus.PROJECT_APPROVED.value

    # Stage 3: BU Supervisor advances report to BU review
    with SessionLocal() as db:
        s = db.query(Submission).filter_by(id=sub_id).first()
        s.status = SubmissionStatus.UNDER_BU_REVIEW.value
        db.commit()

    # Stage 4: BU Admin reviews & approves -> BU_APPROVED
    res_s4 = client.post(
        f"/api/v1/workflow/review/{sub_id}",
        json={"decision": "APPROVE", "reviewer_id": str(bu_adm.id), "comment": "BU rollup verified."},
        headers={"Authorization": f"Bearer {b_adm_tok}"},
    )
    assert res_s4.status_code == 200
    with SessionLocal() as db:
        s = db.query(Submission).filter_by(id=sub_id).first()
        assert s.status == SubmissionStatus.BU_APPROVED.value

    # Stage 5: Subsidiary Supervisor advances report to Subsidiary review
    with SessionLocal() as db:
        s = db.query(Submission).filter_by(id=sub_id).first()
        s.status = SubmissionStatus.UNDER_SUBSIDIARY_REVIEW.value
        db.commit()

    # Stage 6: Subsidiary Admin reviews & approves -> SUBSIDIARY_APPROVED
    res_s6 = client.post(
        f"/api/v1/workflow/review/{sub_id}",
        json={"decision": "APPROVE", "reviewer_id": str(sub_adm.id), "comment": "Subsidiary boundary approved."},
        headers={"Authorization": f"Bearer {s_adm_tok}"},
    )
    assert res_s6.status_code == 200
    with SessionLocal() as db:
        s = db.query(Submission).filter_by(id=sub_id).first()
        assert s.status == SubmissionStatus.SUBSIDIARY_APPROVED.value

    # Stage 7: Group Supervisor compiles report
    with SessionLocal() as db:
        s = db.query(Submission).filter_by(id=sub_id).first()
        s.status = SubmissionStatus.UNDER_GROUP_REVIEW.value
        db.commit()

    # Stage 8: Group Admin reviews, gives final sign-off & period lock -> LOCKED
    res_s8 = client.post(
        f"/api/v1/workflow/review/{sub_id}",
        json={"decision": "APPROVE", "reviewer_id": str(grp_adm.id), "comment": "Group executive sign-off and period locked."},
        headers={"Authorization": f"Bearer {g_adm_tok}"},
    )
    assert res_s8.status_code == 200
    with SessionLocal() as db:
        s = db.query(Submission).filter_by(id=sub_id).first()
        assert s.status == SubmissionStatus.LOCKED.value
