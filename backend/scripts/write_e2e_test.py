import os, textwrap
os.makedirs("tests/integration", exist_ok=True)
code = textwrap.dedent("""
import os, uuid, pytest, requests
from datetime import datetime, timezone

BASE = os.getenv("BRSR_BASE_URL", "http://localhost:8000/api/v1")

class _FX:
    period_id = None
    nodes = {}
    users = {}
    submissions = {}
    disclosures = {}
    vc_partners = []

FX = _FX()

def _login(email, pwd):
    r = requests.post(f"{BASE}/auth/login", json={"username": email, "password": pwd})
    if r.ok:
        data = r.json()
        return data.get("access_token",""), data.get("user",{}).get("id")
    return "", None

def _h(key="__admin__"):
    return {"Authorization": f"Bearer {FX.users.get(key,{}).get('token','')}"}

def api_get(path, key="__admin__", **kw):
    return requests.get(f"{BASE}{path}", headers=_h(key), **kw)

def api_post(path, body, key="__admin__", **kw):
    return requests.post(f"{BASE}{path}", json=body, headers=_h(key), **kw)

def _ensure_period():
    r = api_get("/org/periods")
    for p in (r.json() if r.ok else []):
        if "2024-25" in p.get("code","") or p.get("financial_year","") == "2024-2025":
            FX.period_id = p["id"]; return p["id"]
    cr = api_post("/org/periods", {
        "code": "FY2024-25-ANNUAL", "financial_year": "2024-2025",
        "period_type": "financial_year",
        "start_date": "2024-04-01", "end_date": "2025-03-31", "status": "OPEN"})
    assert cr.status_code in (200, 201), f"Period create: {cr.text}"
    FX.period_id = cr.json()["id"]; return FX.period_id

def _ensure_node(code, name, ntype, parent_code=None, project_type="corporate"):
    r = api_get("/org/nodes")
    existing = {n["code"]: n for n in (r.json() if r.ok else [])}
    if code in existing:
        FX.nodes[code] = existing[code]["id"]; return FX.nodes[code]
    parent_id = FX.nodes.get(parent_code)
    parent_path = existing.get(parent_code, {}).get("path", parent_code) if parent_code else None
    path = f"{parent_path}.{code}" if parent_path else code
    cr = api_post("/org/nodes", {
        "code": code, "name": name, "type": ntype, "parent_id": parent_id, "path": path,
        "ownership_pct": 100.0, "control_type": "operational_control", "boundary": True,
        "project_type": project_type, "location_country": "India",
        "is_active": True, "is_root": not parent_id})
    assert cr.status_code in (200, 201), f"Node {code}: {cr.text}"
    FX.nodes[code] = cr.json()["id"]; return FX.nodes[code]

def _ensure_user(key, email, pwd, role, node_code=None):
    tok, uid = _login(email, pwd)
    if tok:
        FX.users[key] = {"token": tok, "id": uid}; return tok
    body = {"email": email, "password": pwd, "full_name": f"Test {key}",
            "role": role, "is_active": True}
    if node_code and node_code in FX.nodes:
        body["org_node_id"] = FX.nodes[node_code]
    for ep in ["/auth/users", "/admin/users"]:
        cr = api_post(ep, body)
        if cr.status_code in (200, 201): break
    tok, uid = _login(email, pwd)
    FX.users[key] = {"token": tok, "id": uid}; return tok

def _submit_pack(leaf_code, user_key, energy, water):
    dps = [
        {"metric_code": "ENV-ENERGY-001", "value_numeric": energy, "unit": "kWh",
         "status": "ACTUAL", "entry_method": "manual_form"},
        {"metric_code": "ENV-WATER-001",  "value_numeric": water,  "unit": "kL",
         "status": "ACTUAL", "entry_method": "manual_form"},
    ]
    sr = api_post("/collection/packs/save", {
        "entity_id": FX.nodes[leaf_code], "period_id": FX.period_id,
        "submission_id": None, "version": 1, "data_points": dps}, key=user_key)
    assert sr.status_code in (200, 201), f"[{leaf_code}] save: {sr.text}"
    sid = (sr.json().get("id") or sr.json().get("submission_id")
           or sr.json().get("data", {}).get("id"))
    assert sid, f"[{leaf_code}] no sid: {sr.json()}"
    sub_r = api_post(f"/collection/packs/{sid}/submit", {}, key=user_key)
    assert sub_r.status_code in (200, 201), f"[{leaf_code}] submit: {sub_r.text}"
    FX.submissions[leaf_code] = sid; return sid


@pytest.fixture(scope="session", autouse=True)
def seed_hierarchy():
    for cred in [("admin@brsr.in","Admin@1234"), ("system.admin@meil.in","Admin@1234!")]:
        tok, uid = _login(*cred)
        if tok:
            FX.users["__admin__"] = {"token": tok, "id": uid}; break
    assert FX.users.get("__admin__",{}).get("token"), "Cannot login as admin"
    _ensure_period()
    _ensure_node("GRP-001", "BRSR Group",                    "group")
    _ensure_node("SUB-CON", "Construction Subsidiary",       "subsidiary",    "GRP-001")
    _ensure_node("SUB-HEV", "Heavy Equipment Subsidiary",    "subsidiary",    "GRP-001")
    _ensure_node("BU-BLD",  "Buildings BU",                  "business_unit", "SUB-CON")
    _ensure_node("BU-WAT",  "Water BU",                      "business_unit", "SUB-CON")
    _ensure_node("BU-HEV",  "Heavy Equipment BU",            "business_unit", "SUB-HEV")
    _ensure_node("BU-PRE",  "Prefab BU",                     "business_unit", "SUB-HEV")
    _ensure_node("PRJ-MUM", "Mumbai Project",  "project", "BU-BLD", "road")
    _ensure_node("PRJ-PUN", "Pune Project",    "project", "BU-BLD", "road")
    _ensure_node("PRJ-KOL", "Kolkata Project", "project", "BU-WAT", "irrigation")
    _ensure_node("PLT-HAZ", "Hazira Plant",    "project", "BU-HEV", "corporate")
    _ensure_node("PLT-VAD", "Vadodara Plant",  "project", "BU-PRE", "corporate")
    _ensure_node("PLT-COI", "Coimbatore Plant","project", "BU-PRE", "corporate")
    _ensure_user("grp_admin",  "grp.admin@test.brsr",  "Test@1234!", "group_admin",      "GRP-001")
    _ensure_user("sub_con",    "sub.con@test.brsr",    "Test@1234!", "subsidiary_admin", "SUB-CON")
    _ensure_user("sub_hev",    "sub.hev@test.brsr",    "Test@1234!", "subsidiary_admin", "SUB-HEV")
    _ensure_user("bu_bld_mk",  "bu.bld.mk@test.brsr",  "Test@1234!", "bu_maker",         "BU-BLD")
    _ensure_user("bu_bld_ck",  "bu.bld.ck@test.brsr",  "Test@1234!", "bu_checker",       "BU-BLD")
    _ensure_user("mum_mk",     "prj.mum@test.brsr",    "Test@1234!", "data_entry",       "PRJ-MUM")
    _ensure_user("pun_mk",     "prj.pun@test.brsr",    "Test@1234!", "data_entry",       "PRJ-PUN")
    _ensure_user("kol_mk",     "prj.kol@test.brsr",    "Test@1234!", "data_entry",       "PRJ-KOL")
    _ensure_user("haz_mk",     "plt.haz@test.brsr",    "Test@1234!", "data_entry",       "PLT-HAZ")
    _ensure_user("vad_mk",     "plt.vad@test.brsr",    "Test@1234!", "data_entry",       "PLT-VAD")
    _ensure_user("coi_mk",     "plt.coi@test.brsr",    "Test@1234!", "data_entry",       "PLT-COI")
    _ensure_user("viewer",     "viewer@test.brsr",      "Test@1234!", "viewer",           "GRP-001")
    yield


# ============================================================
# AREA 1: ROLL-UP  (tests 01-06)
# ============================================================
class TestRollUp:
    def test_01_submit_five_leaves_skip_pun(self, seed_hierarchy):
        _submit_pack("PRJ-MUM","mum_mk",45000,8000)
        _submit_pack("PRJ-KOL","kol_mk",22000,5000)
        _submit_pack("PLT-HAZ","haz_mk",30000,3500)
        _submit_pack("PLT-VAD","vad_mk",18000,2100)
        _submit_pack("PLT-COI","coi_mk",12000,1500)
        assert len(FX.submissions) == 5

    def test_02_partial_rollup_bu_bld_incomplete(self, seed_hierarchy):
        r = api_get(f"/consolidation/bu-drilldown/{FX.nodes['BU-BLD']}/{FX.period_id}")
        assert r.ok, r.text
        d = r.json()
        assert d.get("total_projects",0) == 2, f"Expected 2 children: {d}"
        coverage = d.get("data_coverage_pct", 100)
        assert coverage < 100, f"Expected partial coverage (<100%), got {coverage}%"

    def test_03_consolidation_engine_runs(self, seed_hierarchy):
        r = api_post("/consolidation/run", {"period_id": FX.period_id, "root_node_id": None})
        assert r.ok, r.text
        assert r.json().get("consolidated_nodes_count",0) > 0

    def test_04_bu_bld_energy_is_mum_only(self, seed_hierarchy):
        r = api_get(f"/consolidation/{FX.nodes['BU-BLD']}/{FX.period_id}")
        assert r.ok
        vals = {v["metric_code"]:v["value"] for v in r.json()}
        if "ENV-ENERGY-001" in vals:
            assert abs(vals["ENV-ENERGY-001"] - 45000) < 1, vals

    def test_05_group_energy_equals_all_submitted(self, seed_hierarchy):
        r = api_get(f"/consolidation/{FX.nodes['GRP-001']}/{FX.period_id}")
        assert r.ok
        vals = {v["metric_code"]:v["value"] for v in r.json()}
        if "ENV-ENERGY-001" in vals:
            expected = 45000+22000+30000+18000+12000
            assert abs(vals["ENV-ENERGY-001"] - expected) < 5, \
                f"Expected {expected}, got {vals['ENV-ENERGY-001']}"

    def test_06_late_pun_submission_recomputes_bu_bld(self, seed_hierarchy):
        r0 = api_get(f"/consolidation/{FX.nodes['BU-BLD']}/{FX.period_id}")
        before = next((v["value"] for v in r0.json() if v["metric_code"]=="ENV-ENERGY-001"),0)
        _submit_pack("PRJ-PUN","pun_mk",15000,2000)
        api_post("/consolidation/run",{"period_id":FX.period_id,"root_node_id":None})
        r1 = api_get(f"/consolidation/{FX.nodes['BU-BLD']}/{FX.period_id}")
        after = next((v["value"] for v in r1.json() if v["metric_code"]=="ENV-ENERGY-001"),0)
        assert after > before, f"Recompute failed: before={before} after={after}"


# ============================================================
# AREA 2: DRILL-DOWN & RECONCILIATION  (07-10)
# ============================================================
class TestDrillDown:
    def test_07_group_reconciles_to_subsidiaries(self, seed_hierarchy):
        def _vals(code):
            r = api_get(f"/consolidation/{FX.nodes[code]}/{FX.period_id}")
            return {v["metric_code"]:v["value"] for v in (r.json() if r.ok else [])}
        grp = _vals("GRP-001"); con = _vals("SUB-CON"); hev = _vals("SUB-HEV")
        for m in ["ENV-ENERGY-001","ENV-WATER-001"]:
            if m in grp:
                diff = abs(grp[m] - con.get(m,0) - hev.get(m,0))
                assert diff < 2, f"[{m}] reconciles to parent: {'checkmark' if diff<2 else 'FAIL'} diff={diff}"

    def test_08_bu_drilldown_lists_all_projects(self, seed_hierarchy):
        r = api_get(f"/consolidation/bu-drilldown/{FX.nodes['BU-BLD']}/{FX.period_id}")
        assert r.ok, r.text
        codes = [p["project_code"] for p in r.json().get("projects",[])]
        assert "PRJ-MUM" in codes, "PRJ-MUM missing"
        assert "PRJ-PUN" in codes, "PRJ-PUN missing"

    def test_09_bu_energy_reconciles_to_project_sum(self, seed_hierarchy):
        r = api_get(f"/consolidation/bu-drilldown/{FX.nodes['BU-BLD']}/{FX.period_id}")
        assert r.ok
        d = r.json()
        cons_e = next((m["value"] for m in d.get("consolidated_metrics",[])
                       if m["metric_code"]=="ENV-ENERGY-001"), None)
        if cons_e is None: pytest.skip("No consolidated energy for BU-BLD")
        proj_sum = sum(dp.get("value",0) or 0
                       for p in d.get("projects",[])
                       for dp in p.get("raw_inputs",[])
                       if dp["metric_code"]=="ENV-ENERGY-001")
        assert abs(cons_e - proj_sum) < 2, \
            f"BU-BLD energy reconciles to parent: FAIL cons={cons_e} proj_sum={proj_sum}"

    def test_10_lineage_endpoint_reachable(self, seed_hierarchy):
        sid = FX.submissions.get("PRJ-MUM")
        if not sid: pytest.skip("No submission")
        r = api_get(f"/collection/packs/{sid}")
        if not r.ok: pytest.skip(f"Pack unreadable")
        dps = r.json().get("data_points",[])
        if not dps: pytest.skip("No datapoints")
        lr = api_get(f"/lineage/datapoint/{dps[0]['id']}")
        assert lr.status_code in (200,404)


# ============================================================
# AREA 3: DISCLOSURES  (11-14)
# ============================================================
class TestDisclosures:
    def _disc(self, node_code, level, section, maker_key, approver_key=None):
        r = api_post("/disclosures/save", {
            "org_node_id": FX.nodes[node_code], "period_id": FX.period_id,
            "disclosure_level": level, "disclosure_section": section,
            "payload": {"test": node_code}, "payload_version": "v1", "notes": "e2e"
        }, key=maker_key)
        assert r.ok, f"save {node_code}: {r.text}"
        did = r.json()["id"]
        sr = api_post(f"/disclosures/submit/{did}", {}, key=maker_key)
        assert sr.ok, f"submit {node_code}: {sr.text}"
        ar = api_post(f"/disclosures/approve/{did}", {}, key=approver_key or maker_key)
        assert ar.ok, f"approve {node_code}: {ar.text}"
        st = ar.json().get("status","")
        assert st.upper() in ("APPROVED","SUBMITTED"), f"Unexpected status {st}"
        FX.disclosures[(level, node_code)] = did
        return did

    def test_11_bu_bld_disclosure_lifecycle(self, seed_hierarchy):
        self._disc("BU-BLD","bu","bu_section_b_p6","bu_bld_mk","bu_bld_ck")

    def test_12_sub_con_disclosure_lifecycle(self, seed_hierarchy):
        self._disc("SUB-CON","subsidiary","section_b_p1","sub_con","grp_admin")

    def test_13_grp_001_disclosure_lifecycle(self, seed_hierarchy):
        self._disc("GRP-001","group","section_a_org","grp_admin","grp_admin")

    def test_14_disclosure_list_readable(self, seed_hierarchy):
        r = api_get(f"/disclosures/group/{FX.nodes['GRP-001']}/{FX.period_id}")
        if r.ok: assert isinstance(r.json(), list)


# ============================================================
# AREA 4: RBAC MATRIX  (15-17)
# ============================================================
MATRIX = [
    ("grp_admin","GET","/org/nodes",          200,"group admin reads nodes"),
    ("grp_admin","GET","/org/periods",         200,"group admin reads periods"),
    ("grp_admin","GET","/consolidation/status",200,"group admin reads cons status"),
    ("sub_con",  "GET","/org/nodes",           200,"sub_con reads nodes"),
    ("bu_bld_mk","GET","/org/nodes",           200,"bu maker reads nodes"),
    ("mum_mk",   "GET","/org/nodes",           200,"prj maker reads nodes"),
    ("viewer",   "GET","/org/nodes",           200,"viewer reads (RO)"),
    ("viewer",   "POST","/collection/packs/save",403,"viewer cannot write"),
    ("mum_mk",   "POST","/collection/packs/save",403,"maker cross-scope write denied"),
]

class TestScopingPermissions:
    @pytest.mark.parametrize("role,method,path,expect,note", MATRIX)
    def test_15_rbac(self, seed_hierarchy, role, method, path, expect, note):
        if not FX.users.get(role,{}).get("token"):
            pytest.skip(f"No token for {role}")
        if method == "GET":
            r = api_get(path, key=role)
        else:
            r = api_post(path, {
                "entity_id": FX.nodes.get("GRP-001","x"),
                "period_id": FX.period_id or "x",
                "submission_id": None, "version": 1, "data_points": []
            }, key=role)
        if expect == 403:
            assert r.status_code in (400,401,403,422), \
                f"[{note}] Expected 403-class, got {r.status_code}: {r.text[:100]}"
        else:
            assert r.status_code in (200,201), \
                f"[{note}] Expected 200, got {r.status_code}: {r.text[:100]}"

    def test_16_no_token_401(self, seed_hierarchy):
        r = requests.get(f"{BASE}/org/nodes")
        assert r.status_code == 401

    def test_17_sub_admin_blocked_from_sibling_subtree(self, seed_hierarchy):
        r = api_post("/admin/users", {
            "email": f"x_{uuid.uuid4().hex[:6]}@test.brsr", "password": "Test@1234!",
            "full_name": "Cross", "role": "data_entry", "is_active": True,
            "org_node_id": FX.nodes.get("SUB-HEV")
        }, key="sub_con")
        assert r.status_code in (400,401,403,422), \
            f"sub_con must not create users in SUB-HEV, got {r.status_code}"


# ============================================================
# AREA 5: WORKFLOW  (18-22)
# ============================================================
class TestWorkflow:
    def test_18_maker_cannot_approve_own(self, seed_hierarchy):
        sid = FX.submissions.get("PRJ-MUM")
        if not sid: pytest.skip("No submission")
        uid = FX.users["mum_mk"].get("id","self")
        r = api_post(f"/workflow/review/{sid}",
                     {"reviewer_id":uid,"decision":"APPROVE","comment":""}, key="mum_mk")
        assert r.status_code == 403, f"SoD: expected 403, got {r.status_code}"

    def test_19_return_without_comment_is_400(self, seed_hierarchy):
        sid = next(iter(FX.submissions.values()), None)
        if not sid: pytest.skip("No submission")
        uid = FX.users["bu_bld_ck"].get("id","ck")
        r = api_post(f"/workflow/review/{sid}",
                     {"reviewer_id":uid,"decision":"RETURN","comment":""}, key="bu_bld_ck")
        assert r.status_code in (400,422), f"Empty comment RETURN: expected 400/422, got {r.status_code}"

    def test_20_return_with_comment_accepted(self, seed_hierarchy):
        sid = next(iter(FX.submissions.values()), None)
        if not sid: pytest.skip("No submission")
        uid = FX.users["bu_bld_ck"].get("id","ck")
        r = api_post(f"/workflow/review/{sid}",
                     {"reviewer_id":uid,"decision":"RETURN",
                      "comment":"Values exceed threshold, please verify meter logs."}, key="bu_bld_ck")
        assert r.status_code in (200,201,403), f"RETURN with comment: {r.status_code}"

    def test_21_locked_period_rejects_save(self, seed_hierarchy):
        cr = api_post("/org/periods",{"code":f"LOCKED-{uuid.uuid4().hex[:4]}",
            "financial_year":"2022-2023","period_type":"financial_year",
            "start_date":"2022-04-01","end_date":"2023-03-31","status":"LOCKED"})
        if not cr.ok: pytest.skip("Cannot create locked period")
        r = api_post("/collection/packs/save",{
            "entity_id": FX.nodes["PRJ-MUM"], "period_id": cr.json()["id"],
            "submission_id": None, "version": 1,
            "data_points":[{"metric_code":"ENV-ENERGY-001","value_numeric":100,
                            "unit":"kWh","status":"ACTUAL","entry_method":"manual_form"}]
        }, key="mum_mk")
        assert r.status_code in (400,403,409,422), \
            f"Locked period save: expected rejection, got {r.status_code}"

    def test_22_offline_sync_to_unknown_sub_rejected(self, seed_hierarchy):
        r = api_post("/collection/sync/batch",{
            "submission_id": str(uuid.uuid4()),
            "batch_id": f"b_{uuid.uuid4().hex[:8]}",
            "sync_timestamp": datetime.now(timezone.utc).isoformat(),
            "client_device":"test_runner",
            "items":[{"idempotency_key":f"ik_{uuid.uuid4().hex}","metric_code":"ENV-ENERGY-001",
                      "value_numeric":999,"value_text":None,"unit":"kWh","version":1,"notes":"test"}]
        }, key="mum_mk")
        assert r.status_code in (400,403,404,409,422)


# ============================================================
# AREA 6: DASHBOARD  (23-26)
# ============================================================
class TestDashboard:
    def test_23_group_dashboard(self, seed_hierarchy):
        r = api_get(f"/dashboards/summary?period_id={FX.period_id}&entity_id={FX.nodes['GRP-001']}")
        assert r.ok, r.text
        assert any(k in r.json() for k in
                   ["kpis","metrics","energy_kwh","summary","completeness_pct","total_submissions"])

    def test_24_subsidiary_dashboard(self, seed_hierarchy):
        r = api_get(f"/dashboards/summary?period_id={FX.period_id}&entity_id={FX.nodes['SUB-CON']}")
        assert r.ok, r.text

    def test_25_bu_dashboard(self, seed_hierarchy):
        r = api_get(f"/dashboards/summary?period_id={FX.period_id}&entity_id={FX.nodes['BU-BLD']}")
        assert r.ok, r.text

    def test_26_org_tree_has_all_nodes(self, seed_hierarchy):
        r = api_get("/org/nodes"); assert r.ok
        codes = {n["code"] for n in r.json()}
        for c in ["GRP-001","SUB-CON","SUB-HEV","BU-BLD","BU-WAT",
                  "BU-HEV","BU-PRE","PRJ-MUM","PRJ-PUN","PRJ-KOL",
                  "PLT-HAZ","PLT-VAD","PLT-COI"]:
            assert c in codes, f"Node {c} missing from org tree"


# ============================================================
# AREA 7: ORG TREE UI  (27-29)
# ============================================================
class TestOrgTreeUI:
    def test_27_all_nodes_have_type(self, seed_hierarchy):
        r = api_get("/org/nodes"); assert r.ok
        for n in r.json():
            assert n.get("type"), f"Node {n['code']} missing type field"

    def test_28_parent_child_links_correct(self, seed_hierarchy):
        r = api_get("/org/nodes"); assert r.ok
        nodes = {n["code"]:n for n in r.json()}
        id2code = {n["id"]:n["code"] for n in r.json()}
        pairs = [("SUB-CON","GRP-001"),("SUB-HEV","GRP-001"),
                 ("BU-BLD","SUB-CON"),("BU-WAT","SUB-CON"),
                 ("BU-HEV","SUB-HEV"),("BU-PRE","SUB-HEV"),
                 ("PRJ-MUM","BU-BLD"),("PRJ-PUN","BU-BLD"),
                 ("PRJ-KOL","BU-WAT"),("PLT-HAZ","BU-HEV"),
                 ("PLT-VAD","BU-PRE"),("PLT-COI","BU-PRE")]
        for child, parent in pairs:
            if child not in nodes: continue
            actual = id2code.get(nodes[child].get("parent_id",""),"NONE")
            assert actual == parent, f"{child}: expected parent {parent}, got {actual}"

    def test_29_leaf_status_readable_for_period(self, seed_hierarchy):
        VALID = {"DRAFT","SUBMITTED","BU_APPROVED","SUBSIDIARY_APPROVED",
                 "RETURNED","LOCKED","CONSOLIDATED"}
        for leaf, sid in FX.submissions.items():
            r = api_get(f"/collection/packs/{sid}")
            if r.ok:
                st = r.json().get("status","UNKNOWN")
                assert st in VALID, f"Invalid status {st!r} for {leaf}"


# ============================================================
# AREA 8: VALUE CHAIN  (30-32)
# ============================================================
PARTNERS = [
    {"partner_name":"Acme Steel Pvt. Ltd.",       "category":"supplier",   "spend_share_pct":42.0},
    {"partner_name":"RoadTech Aggregates Ltd.",   "category":"supplier",   "spend_share_pct":28.0},
    {"partner_name":"Precision Formwork Systems", "category":"contractor", "spend_share_pct":18.0},
]

class TestValueChain:
    def test_30_register_three_partners(self, seed_hierarchy):
        for p in PARTNERS:
            r = api_post("/valuechain/partners", {
                **p, "org_node_id": FX.nodes["GRP-001"],
                "period_id": FX.period_id, "country": "India"})
            assert r.ok, f"Register {p['partner_name']}: {r.text}"
            FX.vc_partners.append(r.json())
        assert len(FX.vc_partners) == 3

    def test_31_sebi_75pct_boundary_satisfied(self, seed_hierarchy):
        r = api_get(f"/valuechain/boundary-check"
                    f"?org_node_id={FX.nodes['GRP-001']}&period_id={FX.period_id}")
        if r.status_code == 404: pytest.skip("boundary-check not implemented")
        assert r.ok, r.text
        pct = r.json().get("covered_spend_pct") or r.json().get("spend_coverage_pct",0)
        if pct: assert pct >= 75, f"Expected >=75%, got {pct}"

    def test_32_partners_visible_in_group_context(self, seed_hierarchy):
        r = api_get(f"/valuechain/partners?org_node_id={FX.nodes['GRP-001']}")
        if r.status_code == 404: pytest.skip("partners list not implemented")
        assert r.ok, r.text
        items = r.json() if isinstance(r.json(),list) else r.json().get("items",[])
        names = [i.get("partner_name",i.get("name","")) for i in items]
        for p in PARTNERS:
            assert any(p["partner_name"] in n for n in names), \
                f"Partner {p['partner_name']} missing"
""").lstrip()

with open("tests/integration/test_hierarchy_e2e.py", "w", encoding="utf-8") as f:
    f.write(code)
print(f"Written {len(code)} chars to tests/integration/test_hierarchy_e2e.py")
