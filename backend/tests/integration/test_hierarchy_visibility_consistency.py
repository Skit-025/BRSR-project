"""
backend/tests/integration/test_hierarchy_visibility_consistency.py
Validates consistent role-based data visibility across the ESG hierarchy for all Quick Login personas.
Verifies:
1. Group Level: Group Admin & Group ESG Manager see the exact same set of entities (26 nodes).
2. Subsidiary Level: Subsidiary Admin & Subsidiary ESG Manager see the exact same set of entities (11 nodes).
3. Business Unit Level: BU Admin & BU ESG Manager (Vikram Rao) see the exact same set of entities (8 nodes: BU + 7 projects).
4. Project Level: Project Admin & Project Supervisor see the exact same set of entities (4 nodes: Project + ancestors).
5. Automatic scoping on /api/v1/dashboards/summary without explicit entity_id parameter.
6. Negative access control: BU and Subsidiary users cannot access entities outside their hierarchy.
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import SessionLocal
from app.modules.auth.models import User
from app.modules.org.models import OrgNode
from app.security.jwt import create_access_token
from app.security.scope import filter_projects_query_for_user, is_user_authorized_for_project

client = TestClient(app)


PERSONAS = [
    ("admin@aarohan.in", "system_admin", 26),
    ("group.admin@aarohan.in", "group_admin", 26),
    ("group.supervisor@aarohan.in", "group_esg_manager", 26),
    ("sub.admin@aarohan.in", "subsidiary_admin", 11),
    ("subsidiary.supervisor@aarohan.in", "subsidiary_esg_manager", 11),
    ("bu.admin@aarohan.in", "bu_admin", 8),
    ("bu.supervisor@aarohan.in", "bu_esg_manager", 8),
    ("project.admin@aarohan.in", "project_admin", 4),
    ("project.supervisor@aarohan.in", "project_supervisor", 4),
]


def _get_token_for_user(email: str) -> str:
    with SessionLocal() as db:
        user = db.query(User).filter(User.email.ilike(email)).first()
        assert user is not None, f"User {email} not found"
        return create_access_token(
            subject=str(user.id),
            role=user.role,
            org_node_id=str(user.org_node_id) if user.org_node_id else None,
        )


def test_quick_login_users_org_nodes_visibility():
    """Verify that all Quick Login personas can list their authorized org nodes with at least the canonical baseline counts."""
    for email, expected_role, expected_min_nodes in PERSONAS:
        token = _get_token_for_user(email)
        headers = {"Authorization": f"Bearer {token}"}
        nodes_res = client.get("/api/v1/org/nodes", headers=headers)
        assert nodes_res.status_code == 200, f"GET /org/nodes failed for {email}: {nodes_res.text}"
        nodes = nodes_res.json()
        assert len(nodes) >= expected_min_nodes, f"{email} ({expected_role}): expected at least {expected_min_nodes} nodes, got {len(nodes)}"


def test_tier_symmetry_database_and_http():
    """Verify that Admin and ESG Manager/Supervisor pairs at each tier see the identical set of entity IDs."""
    with SessionLocal() as db:
        tiers = [
            ("Group", "group.admin@aarohan.in", "group.supervisor@aarohan.in"),
            ("Subsidiary", "sub.admin@aarohan.in", "subsidiary.supervisor@aarohan.in"),
            ("BU", "bu.admin@aarohan.in", "bu.supervisor@aarohan.in"),
            ("Project", "project.admin@aarohan.in", "project.supervisor@aarohan.in"),
        ]
        for tier_name, admin_email, sup_email in tiers:
            admin_user = db.query(User).filter(User.email == admin_email).first()
            sup_user = db.query(User).filter(User.email == sup_email).first()
            assert admin_user is not None
            assert sup_user is not None

            q_admin = db.query(OrgNode).filter(OrgNode.is_deleted == False)
            admin_nodes = {str(n.id) for n in filter_projects_query_for_user(db, q_admin, admin_user).all()}

            q_sup = db.query(OrgNode).filter(OrgNode.is_deleted == False)
            sup_nodes = {str(n.id) for n in filter_projects_query_for_user(db, q_sup, sup_user).all()}

            assert admin_nodes == sup_nodes, f"{tier_name} tier asymmetry: Admin has {len(admin_nodes)} nodes, Sup has {len(sup_nodes)} nodes. Diff={admin_nodes ^ sup_nodes}"


def test_vikram_rao_bu_esg_manager_projects_and_dashboard():
    """Verify Vikram Rao (bu.supervisor@aarohan.in) sees Transportation BU and all 7 child projects."""
    token = _get_token_for_user("bu.supervisor@aarohan.in")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Org nodes check
    nodes_res = client.get("/api/v1/org/nodes", headers=headers)
    assert nodes_res.status_code == 200
    nodes = nodes_res.json()
    codes = {n["code"] for n in nodes}
    assert len(nodes) == 8
    assert "BU-TRANSPORTATION" in codes
    assert "PRJ-HWY-001" in codes
    assert "PRJ-ZOJILA-P7" in codes
    assert "PRJ-NH-18-HIGHWAY-C-9350" in codes

    # 2. Dashboard summary check (automatic scope resolution)
    summary_res = client.get("/api/v1/dashboards/summary", headers=headers)
    assert summary_res.status_code == 200
    summary = summary_res.json()
    assert len(summary["operating_units"]) == 7

    # 3. Compare with BU Admin dashboard summary - must be 100% identical
    token_admin = _get_token_for_user("bu.admin@aarohan.in")
    admin_summary = client.get("/api/v1/dashboards/summary", headers={"Authorization": f"Bearer {token_admin}"}).json()
    assert summary == admin_summary


def test_cross_boundary_negative_authorization():
    """Verify that BU and Subsidiary users cannot access entities outside their organizational boundary."""
    with SessionLocal() as db:
        bu_sup = db.query(User).filter(User.email == "bu.supervisor@aarohan.in").first()
        sub_sup = db.query(User).filter(User.email == "subsidiary.supervisor@aarohan.in").first()

        # Hydrocarbons BU (c5603252-2855-4a5f-aa63-f81e8197d123) is outside Transportation BU and Megha Road & Transport
        hydro_bu = db.query(OrgNode).filter(OrgNode.code == "BU-HYDROCARBONS").first()
        assert hydro_bu is not None

        # Transportation BU supervisor cannot access Hydrocarbons BU
        assert not is_user_authorized_for_project(db, bu_sup, str(hydro_bu.id))
        # Megha Road & Transport subsidiary supervisor cannot access Hydrocarbons BU (which is under another tree)
        assert not is_user_authorized_for_project(db, sub_sup, str(hydro_bu.id))
