"""
Single Data-Access Module for esgData.json.
All forms, roll-up totals, dashboard cards, stacked chart, lineage drawer, and BRSR report
read from and write to esgData.json exclusively through this module.
"""
from __future__ import annotations

import json
import os
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from app.data.p6_registry import P6_REGISTRY, REGISTRY_BY_ID, ROLE_NODE_TYPES, get_fields_for_role

DATA_FILE_PATH = Path(os.environ.get("ESG_DATA_FILE", Path(__file__).resolve().parent / "esgData.json"))
_LOCK = threading.RLock()
_NODE_ID_ALIASES = {"BU-TRANS": "BU-TRANSPORTATION"}


def _canonical_node_id(node_id: Optional[str]) -> Optional[str]:
    if node_id is None:
        return None
    raw_id = str(node_id)
    return _NODE_ID_ALIASES.get(raw_id.upper(), raw_id)


def load_data() -> Dict[str, Any]:
    with _LOCK:
        with open(DATA_FILE_PATH, "r", encoding="utf-8") as f:
            return json.load(f)


def save_data(data: Dict[str, Any]) -> None:
    with _LOCK:
        tmp = DATA_FILE_PATH.with_suffix(".json.tmp")
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        os.replace(tmp, DATA_FILE_PATH)


def get_fy() -> Dict[str, str]:
    return load_data().get("fy", {"current": "2024-25", "previous": "2023-24"})


def get_nodes() -> List[Dict[str, Any]]:
    return load_data().get("nodes", [])


def ensure_node(node: Dict[str, Any]) -> Dict[str, Any]:
    """Add a relational org node to the P6 hierarchy store on first use."""
    with _LOCK:
        data = load_data()
        nodes = data.setdefault("nodes", [])
        node_id = _canonical_node_id(node.get("id"))
        parent_id = _canonical_node_id(node.get("parentId"))
        existing = next((item for item in nodes if str(item.get("id")) == str(node_id)), None)
        if existing:
            return existing
        nodes.append({
            "id": str(node_id),
            "name": node["name"],
            "type": node["type"],
            "parentId": str(parent_id) if parent_id else None,
        })
        save_data(data)
        return nodes[-1]


def resolve_node(node_ref: Optional[str], fallback_role: Optional[str] = None, strict: bool = False) -> Optional[Dict[str, Any]]:
    nodes = get_nodes()
    if not nodes:
        return None
    if node_ref:
        ref_str = str(_canonical_node_id(str(node_ref).strip()))
        for n in nodes:
            if str(n["id"]) == ref_str or str(n["id"]).lower() == ref_str.lower():
                return n
        # Match by exact name if UUID from DB org_nodes was passed
        for n in nodes:
            if n["name"].lower() == ref_str.lower():
                return n
        if strict:
            return None
    if fallback_role:
        allowed_types = ROLE_NODE_TYPES.get(fallback_role, [])
        for n in nodes:
            if n["type"].lower() in allowed_types:
                return n
    return None if strict else nodes[0]


def get_descendant_ids(node_id: str, include_self: bool = True) -> List[str]:
    node_id = _canonical_node_id(node_id) or node_id
    nodes = get_nodes()
    by_parent: Dict[Optional[str], List[str]] = {}
    for n in nodes:
        by_parent.setdefault(n.get("parentId"), []).append(n["id"])
    result: List[str] = []
    if include_self:
        result.append(node_id)
    queue = list(by_parent.get(node_id, []))
    while queue:
        cid = queue.pop(0)
        if cid not in result:
            result.append(cid)
            queue.extend(by_parent.get(cid, []))
    return result


def is_descendant_or_self(ancestor_id: str, target_id: str) -> bool:
    return target_id in get_descendant_ids(ancestor_id, include_self=True)


def get_status(node_id: str, owner_role: str) -> Dict[str, Any]:
    data = load_data()
    return data.get("statuses", {}).get(node_id, {}).get(owner_role, {"status": "draft", "reason": None})


def set_status(node_id: str, owner_role: str, status_val: str, reason: Optional[str] = None, actor_id: Optional[str] = None, actor_name: Optional[str] = None) -> Dict[str, Any]:
    with _LOCK:
        data = load_data()
        data.setdefault("statuses", {}).setdefault(node_id, {})[owner_role] = {
            "status": status_val,
            "reason": reason,
        }
        data.setdefault("audit_log", []).append({
            "node_id": node_id,
            "owner_role": owner_role,
            "event": status_val,
            "reason": reason,
            "actor_id": actor_id,
            "actor_name": actor_name,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        save_data(data)
        return data["statuses"][node_id][owner_role]


def reopen_accepted_report(node_id: str, owner_role: str, actor_id: Optional[str] = None, actor_name: Optional[str] = None) -> Dict[str, Any]:
    """Start an auditable revision while retaining the accepted report's history and data."""
    with _LOCK:
        data = load_data()
        current = data.get("statuses", {}).get(node_id, {}).get(owner_role, {"status": "draft"})
        if current.get("status") != "accepted":
            raise ValueError(f"Only accepted reports can be reopened (status: {current.get('status', 'draft')}).")
        updated = {"status": "draft", "reason": None}
        data.setdefault("statuses", {}).setdefault(node_id, {})[owner_role] = updated
        data.setdefault("audit_log", []).append({
            "node_id": node_id,
            "owner_role": owner_role,
            "event": "reopened",
            "reason": "Owner started a revision of the accepted report.",
            "actor_id": actor_id,
            "actor_name": actor_name,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        save_data(data)
        return updated


def get_role_entries(node_id: str, owner_role: str) -> Dict[str, Any]:
    data = load_data()
    return data.get("entries", {}).get(node_id, {}).get(owner_role, {})


def get_daily_entries(node_id: str, owner_role: str) -> List[Dict[str, Any]]:
    data = load_data()
    rows = data.get("daily_entries", {}).get(node_id, {}).get(owner_role, [])
    return sorted(rows, key=lambda row: (row.get("date", ""), row.get("created_at", "")), reverse=True)


def get_entry_mode(node_id: str, owner_role: str) -> str:
    data = load_data()
    return data.get("entry_modes", {}).get(node_id, {}).get(owner_role, "daily")


def add_daily_entry(
    node_id: str,
    owner_role: str,
    daily_entry: Dict[str, Any],
    aggregate_values: Dict[str, float],
    period_key: str = "current",
    actor_id: Optional[str] = None,
    actor_name: Optional[str] = None,
) -> Dict[str, Any]:
    """Append a date-stamped activity record and refresh its annual current totals."""
    with _LOCK:
        data = load_data()
        rows = data.setdefault("daily_entries", {}).setdefault(node_id, {}).setdefault(owner_role, [])
        rows.append(daily_entry)
        role_bucket = data.setdefault("entries", {}).setdefault(node_id, {}).setdefault(owner_role, {})
        for field in get_fields_for_role(owner_role, (resolve_node(node_id) or {}).get("type", "")):
            if field.get("type") == "number" and field.get("aggregation") == "SUM":
                entry_obj = role_bucket.setdefault(field["id"], {"current": None, "previous": None})
                entry_obj[period_key] = None
        for field_id, total in aggregate_values.items():
            entry_obj = role_bucket.setdefault(field_id, {"current": None, "previous": None})
            entry_obj[period_key] = total
        data.setdefault("entry_modes", {}).setdefault(node_id, {})[owner_role] = "daily"
        data.setdefault("statuses", {}).setdefault(node_id, {})[owner_role] = {"status": "draft", "reason": None}
        data.setdefault("audit_log", []).append({
            "node_id": node_id,
            "owner_role": owner_role,
            "event": "daily_entry_added",
            "actor_id": actor_id,
            "actor_name": actor_name,
            "created_at": daily_entry.get("created_at"),
            "daily_entry_id": daily_entry.get("id"),
            "date": daily_entry.get("date"),
            "fields": sorted(daily_entry.get("values", {}).keys()),
        })
        save_data(data)
        return role_bucket


def get_daily_entry(node_id: str, owner_role: str, entry_id: str) -> Optional[Dict[str, Any]]:
    data = load_data()
    rows = data.get("daily_entries", {}).get(node_id, {}).get(owner_role, [])
    return next((row for row in rows if row.get("id") == entry_id), None)


def save_role_entries(
    node_id: str,
    owner_role: str,
    updates: Dict[str, Dict[str, Any]],
    new_status: Optional[str] = None,
    actor_id: Optional[str] = None,
    actor_name: Optional[str] = None,
    entry_mode: Optional[str] = None,
) -> Dict[str, Any]:
    with _LOCK:
        data = load_data()
        node_bucket = data.setdefault("entries", {}).setdefault(node_id, {})
        role_bucket = node_bucket.setdefault(owner_role, {})
        if owner_role == "project_supervisor" and entry_mode in ("daily", "annual"):
            data.setdefault("entry_modes", {}).setdefault(node_id, {})[owner_role] = entry_mode
        for fid, val in updates.items():
            if val is None:
                continue
            entry_obj: Dict[str, Any] = {
                "current": val.get("current"),
                "previous": val.get("previous"),
            }
            role_bucket[fid] = entry_obj
        if new_status:
            data.setdefault("statuses", {}).setdefault(node_id, {})[owner_role] = {
                "status": new_status,
                "reason": None,
            }
            data.setdefault("audit_log", []).append({
                "node_id": node_id,
                "owner_role": owner_role,
                "event": "submitted" if new_status == "submitted" else "draft_saved",
                "actor_id": actor_id,
                "actor_name": actor_name,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "revision": 1 + sum(
                    1 for item in data.get("audit_log", [])
                    if item.get("node_id") == node_id
                    and item.get("owner_role") == owner_role
                    and item.get("event") == "submitted"
                ) if new_status == "submitted" else None,
                "snapshot": updates if new_status == "submitted" else None,
            })
        save_data(data)
        return role_bucket


def _num_or_none(v: Any) -> Optional[float]:
    if v is None or v == "":
        return None
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def _sum_optional(vals: List[Optional[float]]) -> Optional[float]:
    present = [v for v in vals if v is not None]
    if not present:
        return None
    return round(sum(present), 4)


def compute_energy_totals(entries_map: Dict[str, Any], fy_key: str) -> Dict[str, Optional[float]]:
    a = _num_or_none((entries_map.get("ei1_ren_elec") or {}).get(fy_key))
    b = _num_or_none((entries_map.get("ei1_ren_fuel") or {}).get(fy_key))
    c = _num_or_none((entries_map.get("ei1_ren_other") or {}).get(fy_key))
    d = _num_or_none((entries_map.get("ei1_nonren_elec") or {}).get(fy_key))
    e = _num_or_none((entries_map.get("ei1_nonren_fuel") or {}).get(fy_key))
    f = _num_or_none((entries_map.get("ei1_nonren_other") or {}).get(fy_key))

    ren_total = _sum_optional([a, b, c])
    nonren_total = _sum_optional([d, e, f])
    elec_total = _sum_optional([a, d])
    fuel_total = _sum_optional([b, e])
    other_total = _sum_optional([c, f])
    grand_total = _sum_optional([ren_total, nonren_total])
    return {
        "renewable_total": ren_total,
        "non_renewable_total": nonren_total,
        "electricity_total": elec_total,
        "fuel_total": fuel_total,
        "other_total": other_total,
        "grand_total": grand_total,
    }


def compute_water_totals(entries_map: Dict[str, Any], fy_key: str) -> Dict[str, Optional[float]]:
    w_keys = ["ei3_surface", "ei3_groundwater", "ei3_third_party", "ei3_seawater", "ei3_others"]
    withdrawal_total = _sum_optional([_num_or_none((entries_map.get(k) or {}).get(fy_key)) for k in w_keys])
    consumption = _num_or_none((entries_map.get("ei3_water_consumption") or {}).get(fy_key))

    dest_prefixes = ["surface", "ground", "sea", "third", "other"]
    levels = ["no", "primary", "secondary", "tertiary"]
    dest_totals: Dict[str, Optional[float]] = {}
    all_disch: List[Optional[float]] = []
    for p in dest_prefixes:
        vals = [_num_or_none((entries_map.get(f"li2_{p}_{lv}") or {}).get(fy_key)) for lv in levels]
        dest_totals[p] = _sum_optional(vals)
        all_disch.extend(vals)
    discharge_total = _sum_optional(all_disch)
    return {
        "withdrawal_total": withdrawal_total,
        "consumption": consumption,
        "discharge_by_destination": dest_totals,
        "discharge_total": discharge_total,
    }


def compute_waste_totals(entries_map: Dict[str, Any], fy_key: str) -> Dict[str, Optional[float]]:
    gen_keys = [
        "ei8_plastic", "ei8_ewaste", "ei8_biomedical", "ei8_cd",
        "ei8_battery", "ei8_radioactive", "ei8_other_haz", "ei8_other_nonhaz",
    ]
    rec_keys = ["ei8_recycled", "ei8_reused", "ei8_other_recovery"]
    disp_keys = ["ei8_incineration", "ei8_landfilling", "ei8_other_disposal"]
    gen_total = _sum_optional([_num_or_none((entries_map.get(k) or {}).get(fy_key)) for k in gen_keys])
    rec_total = _sum_optional([_num_or_none((entries_map.get(k) or {}).get(fy_key)) for k in rec_keys])
    disp_total = _sum_optional([_num_or_none((entries_map.get(k) or {}).get(fy_key)) for k in disp_keys])
    return {
        "generated_total": gen_total,
        "recovered_total": rec_total,
        "disposed_total": disp_total,
    }


def rollup_node(
    node_id: str,
    only_accepted: bool = True,
    include_node_data_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Aggregates all P6_REGISTRY fields for `node_id` across itself + accepted descendants.
    - SUM fields: sum of values across matching nodes (empty != 0 -> None if none reported)
    - LIST fields: concatenated list with `source_node` and `source_node_name`
    - NONE fields: own node value only (or per-facility list for EI-5)
    Also computes LI-3 water-stressed totals (sum of EI-3 & LI-2 for sites where li3_water_stressed == 'Yes').
    """
    node_id = _canonical_node_id(node_id) or node_id
    include_node_data_id = _canonical_node_id(include_node_data_id)
    data = load_data()
    nodes_by_id = {n["id"]: n for n in data.get("nodes", [])}
    desc_ids = get_descendant_ids(node_id, include_self=True)
    entries = data.get("entries", {})
    statuses = data.get("statuses", {})

    def _is_included(nid: str, role: str) -> bool:
        if not only_accepted:
            return True
        st = statuses.get(nid, {}).get(role, {}).get("status", "draft")
        return st == "accepted" or (
            nid == include_node_data_id
        )

    summed_entries: Dict[str, Dict[str, Any]] = {}
    list_entries: Dict[str, Dict[str, List[Dict[str, Any]]]] = {}
    none_entries: Dict[str, Dict[str, Any]] = {}

    for f in P6_REGISTRY:
        fid = f["id"]
        role = f["ownerRole"]
        agg = f["aggregation"]

        if agg == "SUM":
            cur_vals: List[Optional[float]] = []
            prev_vals: List[Optional[float]] = []
            for nid in desc_ids:
                if not _is_included(nid, role):
                    continue
                e = entries.get(nid, {}).get(role, {}).get(fid)
                if e:
                    cur_vals.append(_num_or_none(e.get("current")))
                    prev_vals.append(_num_or_none(e.get("previous")))
            summed_entries[fid] = {
                "current": _sum_optional(cur_vals),
                "previous": _sum_optional(prev_vals),
            }
        elif agg == "LIST":
            cur_rows: List[Dict[str, Any]] = []
            prev_rows: List[Dict[str, Any]] = []
            for nid in desc_ids:
                if not _is_included(nid, role):
                    continue
                e = entries.get(nid, {}).get(role, {}).get(fid)
                if e:
                    nname = nodes_by_id.get(nid, {}).get("name", nid)
                    for row in (e.get("current") or []):
                        if isinstance(row, dict):
                            cur_rows.append({**row, "source_node": nid, "source_node_name": nname})
                    for row in (e.get("previous") or []):
                        if isinstance(row, dict):
                            prev_rows.append({**row, "source_node": nid, "source_node_name": nname})
            list_entries[fid] = {"current": cur_rows, "previous": prev_rows}
        else:  # NONE
            if fid == "ei5_air_rows":
                # Per-facility rows, never summed
                facility_rows: List[Dict[str, Any]] = []
                for nid in desc_ids:
                    if not _is_included(nid, role):
                        continue
                    e = entries.get(nid, {}).get(role, {}).get(fid)
                    if e and e.get("current"):
                        nname = nodes_by_id.get(nid, {}).get("name", nid)
                        for row in e["current"]:
                            facility_rows.append({**row, "source_node": nid, "source_node_name": nname})
                none_entries[fid] = {"current": facility_rows, "previous": []}
            else:
                e = entries.get(node_id, {}).get(role, {}).get(fid)
                none_entries[fid] = e if e is not None else {"current": None, "previous": None}

    # LI-3 Water-stressed sites totals (sites with li3_water_stressed == "Yes")
    li3_sites: List[Dict[str, Any]] = []
    li3_stressed_entries: Dict[str, Dict[str, Optional[float]]] = {}
    for nid in desc_ids:
        if not _is_included(nid, "project_supervisor"):
            continue
        ps_entries = entries.get(nid, {}).get("project_supervisor", {})
        ws_flag = str((ps_entries.get("li3_water_stressed") or {}).get("current") or "").strip().lower()
        if ws_flag == "yes":
            li3_sites.append({
                "node_id": nid,
                "node_name": nodes_by_id.get(nid, {}).get("name", nid),
                "area_name": (ps_entries.get("li3_area_name") or {}).get("current") or "",
            })
            for k, val_obj in ps_entries.items():
                if k.startswith("ei3_") or k.startswith("li2_"):
                    cur_v = _num_or_none((val_obj or {}).get("current"))
                    prev_v = _num_or_none((val_obj or {}).get("previous"))
                    bucket = li3_stressed_entries.setdefault(k, {"current": None, "previous": None})
                    if cur_v is not None:
                        bucket["current"] = round((bucket["current"] or 0.0) + cur_v, 4)
                    if prev_v is not None:
                        bucket["previous"] = round((bucket["previous"] or 0.0) + prev_v, 4)

    merged = {**summed_entries, **list_entries, **none_entries}
    return {
        "fy": data.get("fy", {"current": "2024-25", "previous": "2023-24"}),
        "node": nodes_by_id.get(node_id, {"id": node_id, "name": node_id}),
        "fields": merged,
        "totals": {
            "energy": {
                "current": compute_energy_totals(merged, "current"),
                "previous": compute_energy_totals(merged, "previous"),
            },
            "water": {
                "current": compute_water_totals(merged, "current"),
                "previous": compute_water_totals(merged, "previous"),
            },
            "waste": {
                "current": compute_waste_totals(merged, "current"),
                "previous": compute_waste_totals(merged, "previous"),
            },
            "ghg": {
                "current": {
                    "scope1": (merged.get("ei6_scope1") or {}).get("current"),
                    "scope2": (merged.get("ei6_scope2") or {}).get("current"),
                    "scope1_2_total": _sum_optional([
                        _num_or_none((merged.get("ei6_scope1") or {}).get("current")),
                        _num_or_none((merged.get("ei6_scope2") or {}).get("current")),
                    ]),
                    "scope3": (merged.get("bu_li4_scope3") or {}).get("current"),
                },
                "previous": {
                    "scope1": (merged.get("ei6_scope1") or {}).get("previous"),
                    "scope2": (merged.get("ei6_scope2") or {}).get("previous"),
                    "scope1_2_total": _sum_optional([
                        _num_or_none((merged.get("ei6_scope1") or {}).get("previous")),
                        _num_or_none((merged.get("ei6_scope2") or {}).get("previous")),
                    ]),
                    "scope3": (merged.get("bu_li4_scope3") or {}).get("previous"),
                },
            },
            "li3_water_stressed": {
                "sites": li3_sites,
                "current": compute_water_totals(li3_stressed_entries, "current"),
                "previous": compute_water_totals(li3_stressed_entries, "previous"),
            },
        },
    }


def get_dashboard_data(
    node_id: Optional[str] = None,
    include_node_data_id: Optional[str] = None,
    local_owner_role: Optional[str] = None,
) -> Dict[str, Any]:
    node_id = _canonical_node_id(node_id)
    include_node_data_id = _canonical_node_id(include_node_data_id)
    nodes = get_nodes()
    target_id = node_id or (nodes[0]["id"] if nodes else "MEIL-GROUP")
    rolled = rollup_node(
        target_id,
        only_accepted=True,
        include_node_data_id=include_node_data_id,
    )
    local_node = next((node for node in get_nodes() if node["id"] == target_id), {})
    local_owner_role = local_owner_role or {
        "project": "project_supervisor", "site": "project_supervisor",
        "plant": "project_supervisor", "manufacturing": "project_supervisor",
        "bu": "bu_supervisor", "business_unit": "bu_supervisor",
        "subsidiary": "subsidiary_supervisor", "company": "subsidiary_supervisor",
        "group": "group_supervisor", "root": "group_supervisor",
    }.get((local_node.get("type") or "").lower(), "project_supervisor")
    t = rolled["totals"]
    f = rolled["fields"]
    fy = rolled["fy"]

    # Coverage count (6th card)
    desc_ids = get_descendant_ids(target_id, include_self=True)
    data = load_data()
    statuses = data.get("statuses", {})
    accepted_forms = 0
    total_forms = 0
    for nid in desc_ids:
        for role, st in statuses.get(nid, {}).items():
            total_forms += 1
            if st.get("status") == "accepted":
                accepted_forms += 1

    e_cur = t["energy"]["current"]
    e_prev = t["energy"]["previous"]
    g_cur = t["ghg"]["current"]
    g_prev = t["ghg"]["previous"]
    w_cur = t["water"]["current"]
    w_prev = t["water"]["previous"]
    wa_cur = t["waste"]["current"]
    wa_prev = t["waste"]["previous"]

    ren_pct = None
    if e_cur["grand_total"] and e_cur["grand_total"] > 0 and e_cur["renewable_total"] is not None:
        ren_pct = round((e_cur["renewable_total"] / e_cur["grand_total"]) * 100.0, 1)

    has_data = any(
        x is not None and x > 0
        for x in [
            e_cur["grand_total"],
            g_cur["scope1_2_total"],
            g_cur["scope3"],
            w_cur["withdrawal_total"],
            wa_cur["generated_total"],
        ]
    )

    # Waste "other" = generated - (recovered + disposed) when > 0
    def _waste_other(wt: Dict[str, Optional[float]]) -> float:
        gen = wt.get("generated_total") or 0.0
        rec = wt.get("recovered_total") or 0.0
        disp = wt.get("disposed_total") or 0.0
        return round(max(0.0, gen - rec - disp), 4)

    return {
        "fy": fy,
        "node": rolled["node"],
        "local_report_status": statuses.get(target_id, {}).get(local_owner_role),
        "has_data": has_data,
        "cards": {
            "energy": {
                "code": "EI-1",
                "title": "Total Energy",
                "unit": "GJ",
                "current": e_cur["grand_total"],
                "previous": e_prev["grand_total"],
                "renewable_pct": ren_pct,
                "renewable": e_cur["renewable_total"],
                "non_renewable": e_cur["non_renewable_total"],
            },
            "ghg": {
                "code": "EI-6",
                "title": "GHG Scope 1+2",
                "unit": "tCO2e",
                "current": g_cur["scope1_2_total"],
                "previous": g_prev["scope1_2_total"],
                "scope1": g_cur["scope1"],
                "scope2": g_cur["scope2"],
            },
            "scope3": {
                "code": "LI-4",
                "title": "Scope 3 Emissions",
                "unit": "tCO2e",
                "current": g_cur["scope3"],
                "previous": g_prev["scope3"],
            },
            "water": {
                "code": "EI-3",
                "title": "Water Withdrawal",
                "unit": "kL",
                "current": w_cur["withdrawal_total"],
                "previous": w_prev["withdrawal_total"],
                "consumed": w_cur["consumption"],
                "discharged": w_cur["discharge_total"],
            },
            "waste": {
                "code": "EI-8",
                "title": "Total Waste",
                "unit": "MT",
                "current": wa_cur["generated_total"],
                "previous": wa_prev["generated_total"],
                "recovered": wa_cur["recovered_total"],
                "disposed": wa_cur["disposed_total"],
            },
            "coverage": {
                "code": "P6-STATUS",
                "title": "Data Coverage",
                "accepted_forms": accepted_forms,
                "total_forms": total_forms,
            },
        },
        "charts": {
            "energy": {
                "unit": "GJ",
                "series": [
                    {"name": "Renewable", "current": e_cur["renewable_total"] or 0, "previous": e_prev["renewable_total"] or 0, "color": "#16A34A"},
                    {"name": "Non-Renewable", "current": e_cur["non_renewable_total"] or 0, "previous": e_prev["non_renewable_total"] or 0, "color": "#2563EB"},
                ],
            },
            "ghg": {
                "unit": "tCO2e",
                "series": [
                    {"name": "Scope 1", "current": g_cur["scope1"] or 0, "previous": g_prev["scope1"] or 0, "color": "#DC2626"},
                    {"name": "Scope 2", "current": g_cur["scope2"] or 0, "previous": g_prev["scope2"] or 0, "color": "#F59E0B"},
                ],
            },
            "scope3": {
                "unit": "tCO2e",
                "series": [
                    {"name": "Scope 3 Total", "current": g_cur["scope3"] or 0, "previous": g_prev["scope3"] or 0, "color": "#7C3AED"},
                ],
            },
            "water": {
                "unit": "kL",
                "series": [
                    {"name": "Withdrawal", "current": w_cur["withdrawal_total"] or 0, "previous": w_prev["withdrawal_total"] or 0, "color": "#0284C7"},
                    {"name": "Consumption", "current": w_cur["consumption"] or 0, "previous": w_prev["consumption"] or 0, "color": "#0EA5E9"},
                    {"name": "Discharged", "current": w_cur["discharge_total"] or 0, "previous": w_prev["discharge_total"] or 0, "color": "#38BDF8"},
                ],
            },
            "waste": {
                "unit": "MT",
                "series": [
                    {"name": "Recovered", "current": wa_cur["recovered_total"] or 0, "previous": wa_prev["recovered_total"] or 0, "color": "#10B981"},
                    {"name": "Disposed", "current": wa_cur["disposed_total"] or 0, "previous": wa_prev["disposed_total"] or 0, "color": "#F97316"},
                    {"name": "Other", "current": _waste_other(wa_cur), "previous": _waste_other(wa_prev), "color": "#94A3B8"},
                ],
            },
        },
        "breakdown": {
            "energy": {
                "grid_electricity": f.get("ei1_nonren_elec", {}).get("current") or 0.0,
                "captive_solar_green": (f.get("ei1_ren_elec", {}).get("current") or 0.0) + (f.get("ei1_ren_other", {}).get("current") or 0.0),
                "fuel_diesel_gas": (f.get("ei1_nonren_fuel", {}).get("current") or 0.0) + (f.get("ei1_ren_fuel", {}).get("current") or 0.0),
                "previous_grand_total": e_prev.get("grand_total"),
            },
            "ghg": {
                "scope1_current": g_cur.get("scope1") or 0.0,
                "scope1_prev": g_prev.get("scope1") or 0.0,
                "scope2_current": g_cur.get("scope2") or 0.0,
                "scope2_prev": g_prev.get("scope2") or 0.0,
                "scope3_current": g_cur.get("scope3") or 0.0,
            },
            "water": {
                "surface": f.get("ei3_surface", {}).get("current") or 0.0,
                "groundwater": f.get("ei3_groundwater", {}).get("current") or 0.0,
                "third_party": (f.get("ei3_third_party", {}).get("current") or 0.0) + (f.get("ei3_others", {}).get("current") or 0.0),
                "consumption": w_cur.get("consumption") or 0.0,
                "discharge": w_cur.get("discharge_total") or 0.0,
            },
            "waste": {
                "recycled": (f.get("ei8_recycled", {}).get("current") or 0.0) + (f.get("ei8_reused", {}).get("current") or 0.0),
                "landfill_disposal": (f.get("ei8_landfilling", {}).get("current") or 0.0) + (f.get("ei8_incineration", {}).get("current") or 0.0) + (f.get("ei8_other_disposal", {}).get("current") or 0.0),
                "hazardous": (f.get("ei8_other_haz", {}).get("current") or 0.0) + (f.get("ei8_battery", {}).get("current") or 0.0) + (f.get("ei8_ewaste", {}).get("current") or 0.0) + (f.get("ei8_biomedical", {}).get("current") or 0.0),
                "total_generated": wa_cur.get("generated_total") or 0.0,
                "recovery_pct": round(((wa_cur.get("recovered_total") or 0.0) / (wa_cur.get("generated_total") or 1.0)) * 100, 1) if (wa_cur.get("generated_total") or 0) > 0 else 0.0,
            },
        },
    }


def get_lineage_breakdown(
    node_id: str,
    kpi_key: str = "energy",
    include_node_data_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Return source-level values, hierarchy paths, submission events and linked evidence."""
    node_id = _canonical_node_id(node_id) or node_id
    include_node_data_id = _canonical_node_id(include_node_data_id)
    data = load_data()
    nodes_by_id = {n["id"]: n for n in data.get("nodes", [])}
    desc_ids = get_descendant_ids(node_id, include_self=True)
    entries = data.get("entries", {})
    statuses = data.get("statuses", {})
    evidence_store = data.get("evidence", {})
    metric_fields = {
        "energy": ["ei1_ren_elec", "ei1_ren_fuel", "ei1_ren_other", "ei1_nonren_elec", "ei1_nonren_fuel", "ei1_nonren_other"],
        "ghg": ["ei6_scope1", "ei6_scope2"],
        "scope3": ["bu_li4_scope3"],
        "water": ["ei3_surface", "ei3_groundwater", "ei3_third_party", "ei3_seawater", "ei3_others", "ei3_water_consumption"],
        "waste": ["ei8_plastic", "ei8_ewaste", "ei8_biomedical", "ei8_cd", "ei8_battery", "ei8_radioactive", "ei8_other_haz", "ei8_other_nonhaz", "ei8_recycled", "ei8_reused", "ei8_other_recovery", "ei8_incineration", "ei8_landfilling", "ei8_other_disposal"],
    }
    rows: List[Dict[str, Any]] = []
    audit = data.get("audit_log", [])
    fy = data.get("fy", {})
    def hierarchy_path(nid: str) -> List[Dict[str, str]]:
        path, seen, current = [], set(), nid
        while current and current not in seen:
            seen.add(current)
            node = nodes_by_id.get(current)
            if not node:
                break
            path.append({"id": str(current), "name": node.get("name", str(current)), "type": node.get("type", "unknown")})
            current = node.get("parentId")
        return list(reversed(path))

    for nid in desc_ids:
        n = nodes_by_id.get(nid, {"id": nid, "name": nid, "type": "unknown"})
        role_used = "bu_supervisor" if kpi_key == "scope3" else "project_supervisor"
        entry_status = statuses.get(nid, {}).get(role_used, {}).get("status", "draft")
        if entry_status != "accepted" and nid != include_node_data_id:
            continue
        source_entries = entries.get(nid, {}).get(role_used, {})
        if not source_entries:
            continue
        val = None
        unit = ""
        if kpi_key == "energy":
            val = compute_energy_totals(source_entries, "current")["grand_total"]
            unit = "GJ"
        elif kpi_key == "ghg":
            s1 = _num_or_none((source_entries.get("ei6_scope1") or {}).get("current"))
            s2 = _num_or_none((source_entries.get("ei6_scope2") or {}).get("current"))
            val = _sum_optional([s1, s2])
            unit = "tCO2e"
        elif kpi_key == "scope3":
            val = _num_or_none((source_entries.get("bu_li4_scope3") or {}).get("current"))
            unit = "tCO2e"
        elif kpi_key == "water":
            val = compute_water_totals(source_entries, "current")["withdrawal_total"]
            unit = "kL"
        elif kpi_key == "waste":
            val = compute_waste_totals(source_entries, "current")["generated_total"]
            unit = "MT"

        if val is not None:
            relevant_fields = metric_fields.get(kpi_key, [])
            field_values = []
            linked_evidence = []
            for fid in relevant_fields:
                value_obj = source_entries.get(fid)
                if value_obj is None:
                    continue
                field_values.append({"field_id": fid, "current": value_obj.get("current"), "previous": value_obj.get("previous")})
                for ev in evidence_store.get(nid, {}).get(role_used, {}).get(fid, {}).get("current", []):
                    linked_evidence.append({
                        "filename": ev.get("file_name"), "sha256": ev.get("sha256"),
                        "evidence_id": ev.get("evidence_id"), "evidence_display_id": ev.get("evidence_display_id"),
                        "field_id": fid, "node_id": nid, "node_name": n.get("name", nid),
                        "uploaded_at": ev.get("uploaded_at"),
                    })
            latest_submission = next((event for event in reversed(audit)
                if event.get("node_id") == nid and event.get("owner_role") == role_used
                and event.get("event") == "submitted"), None)
            rows.append({
                "node_id": nid,
                "node_name": n["name"],
                "node_type": n["type"],
                "status": entry_status,
                "value": val,
                "unit": unit,
                "source_role": role_used,
                "source_is_mock": bool(n.get("is_mock")) or any(bool(v.get("_sample")) for v in source_entries.values() if isinstance(v, dict)),
                "source_path": hierarchy_path(nid),
                "submitted_by": latest_submission.get("actor_name") if latest_submission else None,
                "submitted_at": latest_submission.get("created_at") if latest_submission else None,
                "source_fields": field_values,
                "evidence": linked_evidence,
            })

    return {"node_id": node_id, "kpi": kpi_key, "fy": fy, "contributions": rows,
            "total": _sum_optional([_num_or_none(row.get("value")) for row in rows])}


# ── Evidence attachment helpers ───────────────────────────────────────────────

EVIDENCE_DIR = Path(os.environ.get(
    "EVIDENCE_LOCAL_DIR",
    Path(__file__).resolve().parent.parent.parent / "uploads" / "evidence",
))


def save_field_evidence(
    node_id: str,
    role: str,
    field_id: str,
    fy_key: str,
    file_name: str,
    file_path: Optional[str],
    mime_type: str,
    uploaded_by: str,
    vault_evidence_id: Optional[str] = None,
    evidence_display_id: Optional[str] = None,
    sha256: Optional[str] = None,
    storage_key: Optional[str] = None,
) -> Dict[str, Any]:
    """Persist evidence metadata inside esgData.json under evidence[node_id][role][field_id][fy_key]."""
    evidence_id = str(uuid.uuid4())
    record: Dict[str, Any] = {
        "evidence_id": evidence_id,
        "file_name": file_name,
        "file_path": file_path,
        "mime_type": mime_type,
        "uploaded_by": uploaded_by,
        "vault_evidence_id": vault_evidence_id,
        "evidence_display_id": evidence_display_id,
        "sha256": sha256,
        "storage_key": storage_key,
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
        "fy_key": fy_key,
    }
    with _LOCK:
        data = load_data()
        bucket = (
            data
            .setdefault("evidence", {})
            .setdefault(node_id, {})
            .setdefault(role, {})
            .setdefault(field_id, {})
        )
        bucket.setdefault(fy_key, []).append(record)
        save_data(data)
    return record


def remove_field_evidence(node_id: str, role: str, field_id: str, fy_key: str, evidence_id: str) -> bool:
    """Detach a file from a P6 form while leaving its universal vault record intact."""
    with _LOCK:
        data = load_data()
        records = (
            data.get("evidence", {}).get(node_id, {}).get(role, {}).get(field_id, {}).get(fy_key, [])
        )
        kept = [record for record in records if record.get("evidence_id") != evidence_id]
        if len(kept) == len(records):
            return False
        data["evidence"][node_id][role][field_id][fy_key] = kept
        save_data(data)
        return True


def get_field_evidence(node_id: str, role: str, field_id: str) -> Dict[str, List[Dict[str, Any]]]:
    """Return evidence records for a node/role/field, keyed by fy_key."""
    data = load_data()
    return (
        data.get("evidence", {})
        .get(node_id, {})
        .get(role, {})
        .get(field_id, {})
    )


def get_node_evidence(node_id: str, role: str) -> Dict[str, Any]:
    """Return all evidence records for a given node and role (all fields)."""
    data = load_data()
    return (
        data.get("evidence", {})
        .get(node_id, {})
        .get(role, {})
    )

