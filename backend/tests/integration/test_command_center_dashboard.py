"""
backend/tests/integration/test_command_center_dashboard.py

Comprehensive tests for the Executive ESG Command Center API:
1. Verifies endpoint response structure and data contracts for Group Admin and Group Supervisor.
2. Verifies role-specific actions (Group Supervisor: Prepare BRSR Report vs Group Admin: Go to Pending Reviews).
3. Verifies Dynamic Entity Validation (CRITICAL requirement):
   - Dynamically creates a new Subsidiary and BU in database.
   - Verifies they immediately appear in the organizational reporting flow, performance chart, and heatmap.
   - Cleans up created test entities.
"""
import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import SessionLocal
from app.modules.auth.models import User
from app.modules.org.models import OrgNode, ReportingPeriod
from app.security.jwt import create_access_token


@pytest.fixture
def db():
    session = SessionLocal()
    yield session
    session.close()


@pytest.fixture
def client():
    return TestClient(app)


def test_command_center_group_admin_payload(client, db):
    """Verifies Command Center endpoint returns complete structure with Group Admin role details."""
    admin_user = db.query(User).filter(User.role == "group_admin").first()
    assert admin_user is not None, "Group Admin user should exist"

    token = create_access_token(
        subject=str(admin_user.id),
        role=admin_user.role,
        org_node_id=str(admin_user.org_node_id) if admin_user.org_node_id else None
    )
    response = client.get(
        "/api/v1/dashboards/command-center",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    data = response.json()

    # 1. Executive Header
    header = data.get("executive_header", {})
    assert header.get("group_name") is not None
    assert header.get("role") == "group_admin"
    assert "FY" in header.get("period_code", "")

    # 2. KPI Cards
    kpis = data.get("kpi_cards", {})
    assert "reporting_coverage" in kpis
    assert kpis["reporting_coverage"]["pct"] > 0
    assert "pending_approvals" in kpis
    assert "subsidiaries" in kpis
    assert "avg_approval_time" in kpis
    assert kpis.get("brsr_readiness_pct") == 72.0

    # Role-specific verification for Admin
    role_spec = kpis.get("role_specific", {})
    assert role_spec.get("action_button_label") == "Go to Pending Reviews →"
    assert role_spec.get("can_approve_report") is True

    # 3. Org Reporting Flow
    flow = data.get("org_reporting_flow", {})
    assert flow.get("root") is not None
    assert len(flow.get("subsidiaries", [])) >= 4

    # Check key showcase subsidiaries
    sub_names = [s["name"] for s in flow["subsidiaries"]]
    assert any("Megha Road" in n for n in sub_names)
    assert any("Olectra" in n for n in sub_names)

    # 4. Subsidiary Performance
    perf = data.get("subsidiary_performance", [])
    assert len(perf) >= 4

    # 5. Reporting Heatmap
    heatmap = data.get("reporting_heatmap", {})
    assert heatmap.get("columns") == ["Projects", "BUs", "Subsidiaries", "Group"]
    assert len(heatmap.get("rows", [])) >= 4

    # 6. Key Alerts & Insights
    assert len(data.get("key_alerts", [])) >= 3
    assert len(data.get("key_insights", {}).get("items", [])) >= 3


def test_command_center_group_supervisor_role_specific(client, db):
    """Verifies that Group ESG Manager receives operational role-tailored actions."""
    sup_user = db.query(User).filter(User.role.in_(("group_esg_manager", "group_supervisor"))).first()
    assert sup_user is not None, "Group ESG Manager user should exist"

    sup_token = create_access_token(
        subject=str(sup_user.id),
        role=sup_user.role,
        org_node_id=str(sup_user.org_node_id) if sup_user.org_node_id else None
    )

    response = client.get(
        "/api/v1/dashboards/command-center",
        headers={"Authorization": f"Bearer {sup_token}"}
    )
    assert response.status_code == 200
    data = response.json()

    role_spec = data["kpi_cards"]["role_specific"]
    assert role_spec.get("role") in ("group_esg_manager", "group_supervisor")
    assert role_spec.get("action_button_label") == "Prepare Group BRSR Report →"
    assert role_spec.get("can_prepare_report") is True


def test_dynamic_entity_accommodation_in_command_center(client, db):
    """
    CRITICAL REQUIREMENT TEST:
    Verifies that when a new Subsidiary and Business Unit are added to the database,
    they automatically appear across all Command Center visualizations:
    - org_reporting_flow
    - subsidiary_performance
    - reporting_heatmap
    without requiring any frontend changes or static modifications.
    """
    admin_user = db.query(User).filter(User.role == "group_admin").first()
    token = create_access_token(
        subject=str(admin_user.id),
        role=admin_user.role,
        org_node_id=str(admin_user.org_node_id) if admin_user.org_node_id else None
    )

    root_group = db.query(OrgNode).filter(OrgNode.type == "group", OrgNode.is_deleted == False).first()
    assert root_group is not None

    unique_suffix = uuid.uuid4().hex[:6].upper()
    test_sub_name = f"Dynamic Solar Energy Sub {unique_suffix}"
    test_sub_code = f"SUB-SOLAR-{unique_suffix}"

    new_sub = OrgNode(
        name=test_sub_name,
        code=test_sub_code,
        type="subsidiary",
        parent_id=root_group.id,
        path=f"{root_group.path or 'meil'}.{unique_suffix.lower()}",
        is_active=True,
        is_deleted=False
    )
    db.add(new_sub)
    db.commit()
    db.refresh(new_sub)

    # Also add a child BU under the new subsidiary
    test_bu_name = f"Photovoltaic BU {unique_suffix}"
    new_bu = OrgNode(
        name=test_bu_name,
        code=f"BU-PV-{unique_suffix}",
        type="business_unit",
        parent_id=new_sub.id,
        path=f"{new_sub.path}.bu",
        is_active=True,
        is_deleted=False
    )
    db.add(new_bu)
    db.commit()
    db.refresh(new_bu)

    try:
        # Request Command Center payload
        response = client.get(
            "/api/v1/dashboards/command-center",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()

        # 1. Verify new subsidiary appears in org_reporting_flow
        subs = data["org_reporting_flow"]["subsidiaries"]
        matching_sub = next((s for s in subs if s["name"] == test_sub_name or s["code"] == test_sub_code), None)
        assert matching_sub is not None, f"Newly created subsidiary '{test_sub_name}' must dynamically appear in org flow"

        # 2. Verify BU appears under newly created subsidiary
        bus = matching_sub.get("business_units", [])
        assert any(b["name"] == test_bu_name for b in bus), f"Newly created BU '{test_bu_name}' must appear under subsidiary"

        # 3. Verify new subsidiary appears in subsidiary_performance
        perf = data["subsidiary_performance"]
        assert any(p["name"] == test_sub_name or p["code"] == test_sub_code for p in perf), "New subsidiary must appear in performance list"

        # 4. Verify new subsidiary appears as a row in reporting_heatmap
        heatmap_rows = data["reporting_heatmap"]["rows"]
        assert any(r["subsidiary_name"] == test_sub_name for r in heatmap_rows), "New subsidiary must appear in reporting heatmap"

    finally:
        # Cleanup test entities
        db.delete(new_bu)
        db.delete(new_sub)
        db.commit()


def test_group_overview_real_database_metrics(client, db):
    """
    Verifies that GET /api/v1/dashboards/group-overview returns 100% genuine database metrics,
    including authentic subsidiaries, business units, projects, and pending exceptions.
    """
    admin_user = db.query(User).filter(User.role == "group_admin").first()
    assert admin_user is not None

    token = create_access_token(
        subject=str(admin_user.id),
        role=admin_user.role,
        org_node_id=str(admin_user.org_node_id) if admin_user.org_node_id else None
    )

    response = client.get(
        "/api/v1/dashboards/group-overview",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()

    # 1. Metrics validation
    metrics = data["metrics"]
    assert metrics["total_subsidiaries"] >= 8
    assert metrics["total_bus"] >= 2
    assert metrics["total_projects"] >= 8

    # 2. Hierarchy validation
    hierarchy = data["hierarchy"]
    subs = hierarchy["subsidiaries"]
    mrt = next((s for s in subs if "Megha Road" in s["name"]), None)
    assert mrt is not None, "Megha Road and Transport Ltd must exist in real hierarchy"

    bu_names = [b["name"] for b in mrt["business_units"]]
    assert any("Transportation" in b for b in bu_names), "Real Transportation BU must exist"

    # 3. Subsidiaries matrix validation
    matrix = data["subsidiaries_matrix"]
    assert len(matrix) >= 8

    # 4. Pending actions validation
    actions = data["pending_actions"]
    assert isinstance(actions, list)


def test_group_overview_dynamic_entity_expansion(client, db):
    """
    Verifies that newly inserted entities immediately appear in the Group Overview
    without requiring any frontend code changes.
    """
    admin_user = db.query(User).filter(User.role == "group_admin").first()
    token = create_access_token(
        subject=str(admin_user.id),
        role=admin_user.role,
        org_node_id=str(admin_user.org_node_id) if admin_user.org_node_id else None
    )

    root_group = db.query(OrgNode).filter(OrgNode.type == "group", OrgNode.is_deleted == False).first()
    suffix = uuid.uuid4().hex[:6].upper()
    test_sub_name = f"Renewable Energy Sub {suffix}"

    new_sub = OrgNode(
        name=test_sub_name,
        code=f"SUB-REN-{suffix}",
        type="subsidiary",
        parent_id=root_group.id,
        path=f"{root_group.path or 'meil'}.{suffix.lower()}",
        is_active=True,
        is_deleted=False
    )
    db.add(new_sub)
    db.commit()
    db.refresh(new_sub)

    try:
        response = client.get(
            "/api/v1/dashboards/group-overview",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()

        subs = data["hierarchy"]["subsidiaries"]
        assert any(s["name"] == test_sub_name for s in subs), f"New subsidiary '{test_sub_name}' must dynamically appear in hierarchy"

        matrix = data["subsidiaries_matrix"]
        assert any(m["name"] == test_sub_name for m in matrix), f"New subsidiary '{test_sub_name}' must dynamically appear in matrix"

    finally:
        db.delete(new_sub)
        db.commit()


def test_group_overview_design_layout_and_zero_hardcoding(client, db):
    """
    Verifies that GET /api/v1/dashboards/overview returns the exact data structure
    required by the reference design with ZERO hardcoded business numbers or dummy entities.
    """
    admin_user = db.query(User).filter(User.role == "group_admin").first()
    token = create_access_token(
        subject=str(admin_user.id),
        role=admin_user.role,
        org_node_id=str(admin_user.org_node_id) if admin_user.org_node_id else None
    )

    response = client.get(
        "/api/v1/dashboards/overview",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()

    # 1. Five KPI Cards exist
    assert "kpi_completion" in data
    assert "kpi_emissions" in data
    assert "kpi_bus" in data
    assert "kpi_projects" in data
    assert "kpi_pending" in data

    # 2. Real DB counts reflected
    actual_bus = db.query(OrgNode).filter(OrgNode.type == "business_unit", OrgNode.is_deleted == False).count()
    actual_prjs = db.query(OrgNode).filter(OrgNode.type == "project", OrgNode.is_deleted == False).count()
    assert data["kpi_bus"]["value"] == actual_bus
    assert data["kpi_projects"]["value"] == actual_prjs

    # 3. Emissions Overview
    assert "emissions_overview" in data
    donut = data["emissions_overview"]["donut"]
    assert "scope1" in donut and "scope2" in donut and "scope3" in donut

    # 4. Completion by Level (4 Gauges)
    gauges = data["completion_by_level"]
    assert len(gauges) == 4
    level_names = [g["level"] for g in gauges]
    assert level_names == ["Group", "Subsidiary", "BU", "Project"]

    # 5. Hierarchy Tree is completely DB-driven
    root = data["hierarchy"]
    assert root["name"] is not None
    assert len(root["subsidiaries"]) >= 8
    sub_names = [s["name"] for s in root["subsidiaries"]]
    assert any("Megha Road" in s for s in sub_names)
    assert any("Olectra" in s for s in sub_names)

    # 6. Subsidiary Performance matches real subsidiaries
    perf = data["subsidiary_performance"]
    assert len(perf) >= 8

    # 7. Pending Actions & Quick Insights
    assert len(data["pending_actions"]) == 3
    assert len(data["quick_insight"]["text"]) > 10


