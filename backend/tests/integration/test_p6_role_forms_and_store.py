"""
Integration & unit test suite for Principle 6 Role-Specific ESG Forms,
Visibility Rules, Single esgData.json Data Layer, Totals & Roll-up Math,
and BRSR Principle 6 Compilation.
"""
import json
import shutil
import uuid
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.db.session import init_db, SessionLocal
from app.modules.auth.models import User
from app.security.jwt import create_access_token
from app.data import esg_store
from app.data.p6_registry import get_fields_for_role
from app.modules.reporting.disclosure_mapper import compile_brsr_report


client = TestClient(app)


@pytest.fixture(autouse=True)
def isolated_esg_store(tmp_path, monkeypatch):
    """Copy esgData.json to a temp path per test so mutations never pollute repo data."""
    init_db()
    src = Path(__file__).resolve().parents[2] / "app" / "data" / "esgData.json"
    dst = tmp_path / "esgData.json"
    shutil.copy2(src, dst)
    monkeypatch.setattr(esg_store, "DATA_FILE_PATH", dst)
    return dst


def _make_auth_headers(role: str, org_node_code: str | None = None) -> dict[str, str]:
    from app.modules.org.models import OrgNode
    session = SessionLocal()
    try:
        org_node_id = None
        if org_node_code:
            node = session.query(OrgNode).filter(OrgNode.code == org_node_code).first()
            if node:
                org_node_id = str(node.id)
        user = User(
            full_name=f"Test {role}",
            email=f"test_{role}_{uuid.uuid4().hex[:6]}@example.com",
            role=role,
            is_active=True,
            hashed_password="dummy_hash",
            org_node_id=org_node_id,
        )
        session.add(user)
        session.commit()
        session.refresh(user)
        token = create_access_token(
            subject=str(user.id),
            role=user.role,
            org_node_id=org_node_id,
        )
        return {"Authorization": f"Bearer {token}"}
    finally:
        session.close()


# ---------------------------------------------------------------------------
# TEST 2 — Role matrix across all 8 roles
# ---------------------------------------------------------------------------
ALL_EIGHT_ROLES = [
    ("project_supervisor", "PRJ-HWY-001", "plant", "ei1_ren_elec"),
    ("project_admin", "PRJ-ZOJILA-P7", "project", "pa_ei7_has_project"),
    ("bu_supervisor", "BU-TRANS", "bu", "bu_li4_scope3"),
    ("bu_admin", "BU-TRANS", "bu", "bu_ei2_pat_applicable"),
    ("subsidiary_supervisor", "MEGHA-ROAD-TRANS", "subsidiary", "sub_ei7_rows"),
    ("subsidiary_admin", "MEGHA-ROAD-TRANS", "subsidiary", "sub_ei12_compliant"),
    ("group_supervisor", "MEIL-GROUP", "group", "grp_secb_1_policy_coverage"),
    ("group_admin", "MEIL-GROUP", "group", "grp_seca_1_24_rows"),
]


@pytest.mark.parametrize("role,node_code,node_type,sample_field_id", ALL_EIGHT_ROLES)
def test_role_matrix_schema_exact_fields(role, node_code, node_type, sample_field_id):
    headers = _make_auth_headers(role, node_code)
    res = client.get("/api/v1/p6-forms/schema", headers=headers)
    assert res.status_code == 200, res.text
    payload = res.json()
    returned_ids = {f["id"] for f in payload["fields"]}
    expected_ids = {f["id"] for f in get_fields_for_role(role, node_type=node_type)}
    assert returned_ids == expected_ids
    assert len(returned_ids) > 0
    assert sample_field_id in returned_ids
    # Zero cross-role leakage
    for f in payload["fields"]:
        assert f["ownerRole"] == role


# ---------------------------------------------------------------------------
# TEST 3 — Cross-access 403 checks
# ---------------------------------------------------------------------------
def test_cross_access_rejected_403():
    prj_sup_headers = _make_auth_headers("project_supervisor", "PRJ-ZOJILA-P7")
    prj_adm_headers = _make_auth_headers("project_admin", "PRJ-ZOJILA-P7")

    # Project supervisor / admin cannot read BU, Subsidiary, Group, or sibling project
    for forbidden_node in ["BU-TRANS", "MEGHA-ROAD-TRANS", "MEIL-GROUP", "PRJ-HWY-001"]:
        r1 = client.get(f"/api/v1/p6-forms/entries?node_id={forbidden_node}", headers=prj_sup_headers)
        assert r1.status_code == 403, f"project_supervisor should get 403 on {forbidden_node}"
        r2 = client.get(f"/api/v1/p6-forms/entries?node_id={forbidden_node}", headers=prj_adm_headers)
        assert r2.status_code == 403, f"project_admin should get 403 on {forbidden_node}"

    # Project supervisor cannot save a field owned by bu_supervisor
    r_bad_field = client.post(
        "/api/v1/p6-forms/save",
        headers=prj_sup_headers,
        json={"node_id": "PRJ-ZOJILA-P7", "entries": {"bu_li4_scope3": {"current": 100}}},
    )
    assert r_bad_field.status_code == 403

    # Negative value rejected with 422
    r_neg = client.post(
        "/api/v1/p6-forms/save",
        headers=prj_sup_headers,
        json={"node_id": "PRJ-ZOJILA-P7", "entries": {"ei1_ren_elec": {"current": -5}}},
    )
    assert r_neg.status_code == 422


# ---------------------------------------------------------------------------
# TEST 4 — Manual vs computed totals, empty != 0, and LI-3 water-stressed filter
# ---------------------------------------------------------------------------
def test_totals_and_empty_not_zero():
    # Verify empty != 0 in energy totals
    partial_entries = {
        "ei1_ren_elec": {"current": 100.0, "previous": None},
        "ei1_ren_fuel": {"current": None, "previous": None},
        "ei1_ren_other": {"current": 50.0, "previous": None},
        "ei1_nonren_elec": {"current": 200.0, "previous": 180.0},
        "ei1_nonren_fuel": {"current": 300.0, "previous": 250.0},
        "ei1_nonren_other": {"current": None, "previous": None},
    }
    cur_e = esg_store.compute_energy_totals(partial_entries, "current")
    assert cur_e["renewable_total"] == 150.0
    assert cur_e["non_renewable_total"] == 500.0
    assert cur_e["electricity_total"] == 300.0
    assert cur_e["fuel_total"] == 300.0
    assert cur_e["other_total"] == 50.0
    assert cur_e["grand_total"] == 650.0

    # All-empty returns None (not 0)
    empty_e = esg_store.compute_energy_totals({}, "current")
    assert empty_e["grand_total"] is None
    assert empty_e["renewable_total"] is None

    # Verify roll-up on MEIL-GROUP matches manual sum of accepted sample projects
    # PRJ-ZOJILA-P7 + PRJ-HWY-001 (water_stressed=Yes) + PRJ-IRR-002 + PRJ-SOLAR-003
    rollup = esg_store.rollup_node("MEIL-GROUP")
    fields = rollup["fields"]
    totals = rollup["totals"]

    # Manual sum across all 4 projects current FY:
    # ren_elec: 4200 + 6100 + 3100 + 9800 = 23200; renewable_total = 26100
    assert fields["ei1_ren_elec"]["current"] == pytest.approx(23200.0)
    assert totals["energy"]["current"]["renewable_total"] == pytest.approx(26100.0)
    # non_renewable_total: 43100 + 34350 + 39600 + 24000 = 141050
    assert totals["energy"]["current"]["non_renewable_total"] == pytest.approx(141050.0)
    assert totals["energy"]["current"]["grand_total"] == pytest.approx(167150.0)

    # Verify strict growth across hierarchy levels: Project < BU < Subsidiary < Group
    p_dash = esg_store.get_dashboard_data("PRJ-ZOJILA-P7")["cards"]
    bu_dash = esg_store.get_dashboard_data("BU-TRANS")["cards"]
    sub_dash = esg_store.get_dashboard_data("MEGHA-ROAD-TRANS")["cards"]
    grp_dash = esg_store.get_dashboard_data("MEIL-GROUP")["cards"]
    for metric in ("energy", "ghg", "water", "waste"):
        assert p_dash[metric]["current"] < bu_dash[metric]["current"] < sub_dash[metric]["current"] < grp_dash[metric]["current"]

    # LI-3 water-stressed: only PRJ-HWY-001 has water_stressed=Yes
    # surface 12000 + ground 14500 + third_party 3100 + seawater 0 + others 500 = 30100 withdrawal; 26200 consumption
    assert totals["li3_water_stressed"]["current"]["withdrawal_total"] == pytest.approx(30100.0)
    assert totals["li3_water_stressed"]["current"]["consumption"] == pytest.approx(26200.0)


# ---------------------------------------------------------------------------
# TEST 5 — Editing esgData.json updates entries, dashboard, lineage & BRSR report
# ---------------------------------------------------------------------------
def test_single_data_file_propagates_to_all_surfaces(isolated_esg_store):
    raw = json.loads(isolated_esg_store.read_text(encoding="utf-8"))
    # Bump PRJ-ZOJILA-P7 Scope 1 current from 1820.5 by +1000 -> 2820.5
    raw["entries"]["PRJ-ZOJILA-P7"]["project_supervisor"]["ei6_scope1"]["current"] = 2820.5
    isolated_esg_store.write_text(json.dumps(raw, indent=2), encoding="utf-8")

    # 1. /entries
    prj_headers = _make_auth_headers("project_supervisor", "PRJ-ZOJILA-P7")
    r_entries = client.get("/api/v1/p6-forms/entries", headers=prj_headers)
    assert r_entries.status_code == 200
    assert r_entries.json()["entries"]["ei6_scope1"]["current"] == 2820.5

    # 2. /dashboard:
    # Scope 1 = 2820.5 + 1490.0 + 1350.0 + 980.0 = 6640.5
    # Scope 2 = 3910.2 + 3010.4 + 4120.0 + 2150.0 = 13190.6
    # Total Scope 1+2 = 19831.1
    grp_headers = _make_auth_headers("group_admin", "MEIL-GROUP")
    r_dash = client.get("/api/v1/p6-forms/dashboard", headers=grp_headers)
    assert r_dash.status_code == 200
    ghg_card = r_dash.json()["cards"]["ghg"]
    assert ghg_card["current"] == pytest.approx(19831.1)

    # 3. /lineage
    r_lin = client.get("/api/v1/p6-forms/lineage?kpi=ghg", headers=grp_headers)
    assert r_lin.status_code == 200
    zojila_row = next(n for n in r_lin.json()["contributions"] if n["node_id"] == "PRJ-ZOJILA-P7")
    # 2820.5 + 3910.2 = 6730.7
    assert zojila_row["value"] == pytest.approx(6730.7)

    # 4. compile_brsr_report
    from app.modules.org.models import OrgNode, ReportingPeriod
    from datetime import date
    session = SessionLocal()
    try:
        db_node = session.query(OrgNode).filter(OrgNode.code == "MEIL-GROUP").first()
        if not db_node:
            db_node = OrgNode(
                code="MEIL-GROUP",
                name="Megha Engineering & Infrastructures Ltd (MEIL)",
                type="group",
                ownership_pct=100.0,
                control_type="operational_control",
                boundary=True,
                project_type="corporate",
                location_country="India",
            )
            session.add(db_node)
            session.flush()
        db_period = session.query(ReportingPeriod).first()
        if not db_period:
            db_period = ReportingPeriod(
                code="FY2024-25",
                name="FY 2024-25",
                start_date=date(2024, 4, 1),
                end_date=date(2025, 3, 31),
                status="open",
            )
            session.add(db_period)
            session.flush()
        session.commit()
        report = compile_brsr_report(session, str(db_node.id), str(db_period.id))
        s1_item = next(i for i in report.section_c if i.metric_code == "P6-EI-6-S1")
        assert s1_item.disclosed_value == pytest.approx(6640.5)
    finally:
        session.close()


def test_field_evidence_upload_and_retrieval(tmp_path, monkeypatch):
    from app.data import esg_store

    monkeypatch.setattr(esg_store, "EVIDENCE_DIR", tmp_path / "evidence")
    ps_headers = _make_auth_headers("project_supervisor", "PRJ-ZOJILA-P7")

    # Upload a valid PDF evidence file for a field owned by project_supervisor
    r_up = client.post(
        "/api/v1/p6-forms/upload-evidence",
        headers=ps_headers,
        data={"node_id": "PRJ-ZOJILA-P7", "field_id": "ei1_ren_elec", "fy_key": "current"},
        files={"file": ("solar_bill.pdf", b"%PDF-1.4 mock pdf content", "application/pdf")},
    )
    assert r_up.status_code == 200, r_up.text
    up_body = r_up.json()
    assert up_body["success"] is True
    assert up_body["file_name"] == "solar_bill.pdf"
    assert up_body["evidence_id"]

    # Retrieve evidence for the field
    r_get = client.get("/api/v1/p6-forms/evidence/PRJ-ZOJILA-P7/ei1_ren_elec", headers=ps_headers)
    assert r_get.status_code == 200, r_get.text
    ev_list = r_get.json()["evidence"]["current"]
    assert len(ev_list) == 1
    assert ev_list[0]["file_name"] == "solar_bill.pdf"

    # Retrieve all evidence for the node
    r_node = client.get("/api/v1/p6-forms/evidence/PRJ-ZOJILA-P7", headers=ps_headers)
    assert r_node.status_code == 200
    assert "ei1_ren_elec" in r_node.json()["evidence"]

    # Cross-role upload rejected (project_supervisor cannot attach to project_admin field)
    r_bad = client.post(
        "/api/v1/p6-forms/upload-evidence",
        headers=ps_headers,
        data={"node_id": "PRJ-ZOJILA-P7", "field_id": "pa_ei7_has_project", "fy_key": "current"},
        files={"file": ("doc.pdf", b"%PDF-1.4", "application/pdf")},
    )
    assert r_bad.status_code == 403
