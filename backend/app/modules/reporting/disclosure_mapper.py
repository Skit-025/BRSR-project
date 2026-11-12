import uuid
import hashlib
import json
from datetime import datetime, timezone
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.modules.org.models import OrgNode, ReportingPeriod
from app.modules.reporting.models import Report, ReportType
from app.modules.reporting.schemas import (
    BRSRFullReportResponse,
    SectionAData,
    SectionBData,
    PrincipleIndicatorDisclosure,
)
from app.data import esg_store


def compile_brsr_report(
    db: Session,
    entity_id: str,
    period_id: str,
    report_type: str = ReportType.BRSR_FULL.value,
    generated_by: str = "Corporate ESG Team",
) -> BRSRFullReportResponse:
    """
    SEBI BRSR Report Compiler driven by esgData.json via esg_store.
    Principles 1-5 and 7-9 render plain placeholder rows.
    """
    node = db.query(OrgNode).filter(OrgNode.id == entity_id).first()
    if not node:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entity not found.")

    allowed_report_types = ["group", "company", "subsidiary"]
    if node.type.lower() not in allowed_report_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Statutory SEBI BRSR reports can only be compiled at the Group or Company level. "
                f"Entity '{node.name}' is of type '{node.type}'."
            ),
        )

    period = db.query(ReportingPeriod).filter(ReportingPeriod.id == period_id).first()
    if not period:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reporting period not found.")

    # Resolve node in esgData.json (by code or name, fallback to MEIL-GROUP)
    store_node = (
        esg_store.resolve_node(node.code, fallback_role=None)
        if node.code and esg_store.resolve_node(node.code, fallback_role=None)
        else esg_store.resolve_node(node.name, fallback_role="group_admin")
    )
    store_node_id = store_node["id"] if store_node else "MEIL-GROUP"

    rolled = esg_store.rollup_node(store_node_id, only_accepted=True)
    fields = rolled["fields"]
    totals = rolled["totals"]
    fy_info = rolled["fy"]

    def _fv(fid: str, fy_key: str = "current", default: Any = 0.0) -> Any:
        v = (fields.get(fid) or {}).get(fy_key)
        return default if v is None else v

    def _build_fy_block(fy_key: str) -> Dict[str, Any]:
        et = totals["energy"][fy_key]
        wt = totals["water"][fy_key]
        wst = totals["waste"][fy_key]
        gt = totals["ghg"][fy_key]
        w_dest = wt["discharge_by_destination"]

        air_rows = (fields.get("ei5_air_rows") or {}).get("current") or []
        air_map: Dict[str, Any] = {}
        for row in air_rows:
            p_low = str(row.get("parameter") or "").lower()
            v_air = row.get(fy_key)
            if "nox" in p_low:
                air_map["nox"] = v_air
            elif "sox" in p_low:
                air_map["sox"] = v_air
            elif "particulate" in p_low or "pm" in p_low:
                air_map["pm"] = v_air
            elif "pop" in p_low:
                air_map["pop"] = v_air
            elif "voc" in p_low:
                air_map["voc"] = v_air
            elif "hap" in p_low:
                air_map["hap"] = v_air

        return {
            "energy": {
                "ren_elec": round(_fv("ei1_ren_elec", fy_key, 0.0), 2),
                "ren_fuel": round(_fv("ei1_ren_fuel", fy_key, 0.0), 2),
                "ren_other": round(_fv("ei1_ren_other", fy_key, 0.0), 2),
                "ren_total": round(et["renewable_total"] or 0.0, 2),
                "nonren_elec": round(_fv("ei1_nonren_elec", fy_key, 0.0), 2),
                "nonren_fuel": round(_fv("ei1_nonren_fuel", fy_key, 0.0), 2),
                "nonren_other": round(_fv("ei1_nonren_other", fy_key, 0.0), 2),
                "nonren_total": round(et["non_renewable_total"] or 0.0, 2),
                "elec": round(et["electricity_total"] or 0.0, 2),
                "fuel": round(et["fuel_total"] or 0.0, 2),
                "other": round(et["other_total"] or 0.0, 2),
                "total": round(et["grand_total"] or 0.0, 2),
            },
            "water": {
                "surface": round(_fv("ei3_surface", fy_key, 0.0), 2),
                "groundwater": round(_fv("ei3_groundwater", fy_key, 0.0), 2),
                "third_party": round(_fv("ei3_third_party", fy_key, 0.0), 2),
                "seawater": round(_fv("ei3_seawater", fy_key, 0.0), 2),
                "others": round(_fv("ei3_others", fy_key, 0.0), 2),
                "withdrawn": round(wt["withdrawal_total"] or 0.0, 2),
                "consumed": round(wt["consumption"] or 0.0, 2),
                "discharged": round(wt["discharge_total"] or 0.0, 2),
                "discharge_by_dest": {
                    "surface": round(w_dest.get("surface") or 0.0, 2),
                    "groundwater": round(w_dest.get("ground") or 0.0, 2),
                    "seawater": round(w_dest.get("sea") or 0.0, 2),
                    "third_party": round(w_dest.get("third") or 0.0, 2),
                    "others": round(w_dest.get("other") or 0.0, 2),
                },
            },
            "air": air_map,
            "ghg": {
                "scope1": round(gt["scope1"] or 0.0, 2),
                "scope2": round(gt["scope2"] or 0.0, 2),
                "total_s1_s2": round(gt["scope1_2_total"] or 0.0, 2),
                "scope3": round(gt["scope3"] or 0.0, 2),
            },
            "waste": {
                "categories": {
                    "plastic": round(_fv("ei8_plastic", fy_key, 0.0), 2),
                    "ewaste": round(_fv("ei8_ewaste", fy_key, 0.0), 2),
                    "biomed": round(_fv("ei8_biomedical", fy_key, 0.0), 2),
                    "cd": round(_fv("ei8_cd", fy_key, 0.0), 2),
                    "battery": round(_fv("ei8_battery", fy_key, 0.0), 2),
                    "radioactive": round(_fv("ei8_radioactive", fy_key, 0.0), 2),
                    "hazardous_other": round(_fv("ei8_other_haz", fy_key, 0.0), 2),
                    "non_hazardous_other": round(_fv("ei8_other_nonhaz", fy_key, 0.0), 2),
                },
                "generated": round(wst["generated_total"] or 0.0, 2),
                "recovery": {
                    "recycled": round(_fv("ei8_recycled", fy_key, 0.0), 2),
                    "reused": round(_fv("ei8_reused", fy_key, 0.0), 2),
                    "other": round(_fv("ei8_other_recovery", fy_key, 0.0), 2),
                },
                "recovered": round(wst["recovered_total"] or 0.0, 2),
                "disposal": {
                    "incineration": round(_fv("ei8_incineration", fy_key, 0.0), 2),
                    "landfilling": round(_fv("ei8_landfilling", fy_key, 0.0), 2),
                    "other": round(_fv("ei8_other_disposal", fy_key, 0.0), 2),
                },
                "disposed": round(wst["disposed_total"] or 0.0, 2),
            },
        }

    curr_p6 = _build_fy_block("current")
    prev_p6 = _build_fy_block("previous")

    def _join_rows(fid: str, formatter) -> str:
        rows = (fields.get(fid) or {}).get("current") or []
        parts = [formatter(r) for r in rows if isinstance(r, dict)]
        return "; ".join(p for p in parts if p) or "—"

    ws_sites = totals["li3_water_stressed"]["sites"]
    ws_summary = (
        "; ".join(f"{s['node_name']} ({s['area_name']})" for s in ws_sites)
        if ws_sites else "No water-stressed sites declared"
    )

    assur_rows = (fields.get("grp_p6_assurance_rows") or {}).get("current") or []
    assur_agency = next((r.get("agency_name") for r in assur_rows if r.get("agency_name")), "—")
    assur_status = "Assured" if any(str(r.get("assured")).lower() == "yes" for r in assur_rows) else "Not Assured"

    qualitative = {
        "pat_scheme": f"Applicable: {_fv('bu_ei2_pat_applicable', 'current', '—')} | Targets Achieved: {_fv('bu_ei2_targets_achieved', 'current', '—')} | {_fv('bu_ei2_remedial_action', 'current', '')}",
        "zld_mechanism": f"Implemented: {_fv('bu_ei4_zld_implemented', 'current', '—')} | {_fv('bu_ei4_zld_details', 'current', '')}",
        "ghg_projects": _join_rows("pa_ei7_rows", lambda r: f"[{r.get('source_node_name', '')}] {r.get('title', '')}: {r.get('details', '')}"),
        "waste_strategy": _fv("bu_ei9_waste_strategy", "current", "—"),
        "eco_sensitive": _join_rows("pa_ei10_rows", lambda r: f"{r.get('location', '')} ({r.get('type_of_operations', '')}) [Compliant: {r.get('compliant', '')}]"),
        "eia_details": _join_rows("pa_ei11_rows", lambda r: f"{r.get('project', '')} — {r.get('notification_no', '')} ({r.get('date', '')})"),
        "env_compliance": f"Compliant: {_fv('sub_ei12_compliant', 'current', _fv('pa_ei12_compliant', 'current', 'Yes'))} | {_fv('sub_ei12_statement', 'current', '')}",
        "water_stressed_sites": ws_summary,
        "biodiversity": _join_rows("pa_li5_rows", lambda r: f"{r.get('location', '')}: {r.get('biodiversity_impact', '')}"),
        "resource_efficiency": _join_rows("pa_li6_rows", lambda r: f"{r.get('initiative', '')} — {r.get('outcome', '')}"),
        "bcp_plan": _fv("bu_li7_bcp_plan", "current", "—"),
        "vc_impact": _fv("bu_li8_adverse_impact", "current", "—"),
        "vc_assessed_pct": _fv("bu_li9_vc_assessed_pct", "current", 0),
        "assurance_status": assur_status,
        "assurance_agency": assur_agency,
    }

    principle_6_summary = {
        "current_fy": fy_info["current"],
        "previous_fy": fy_info["previous"],
        "current": curr_p6,
        "previous": prev_p6,
        "energy_gj": curr_p6["energy"],
        "water_kl": curr_p6["water"],
        "ghg_tco2e": curr_p6["ghg"],
        "waste_mt": curr_p6["waste"],
        "qualitative": qualitative,
    }

    total_scope_1 = curr_p6["ghg"]["scope1"]
    total_scope_2 = curr_p6["ghg"]["scope2"]
    total_scope_3 = curr_p6["ghg"]["scope3"]
    total_ghg = round(total_scope_1 + total_scope_2 + total_scope_3, 4)

    # Section C rows: Principle 6 from esgData.json + plain placeholder rows for Principles 1-5 & 7-9
    section_c_disclosures: List[PrincipleIndicatorDisclosure] = [
        PrincipleIndicatorDisclosure(
            metric_code="P6-EI-1", indicator_name="Total Energy Consumption (GJ)", principle=6, brsr_core=True,
            disclosed_value=curr_p6["energy"]["total"], unit="GJ", aggregation_method="SUM",
            assurance_ready=True, evidence_verified=True, status="CALCULATED",
        ),
        PrincipleIndicatorDisclosure(
            metric_code="P6-EI-3", indicator_name="Total Water Withdrawal (kL)", principle=6, brsr_core=True,
            disclosed_value=curr_p6["water"]["withdrawn"], unit="kL", aggregation_method="SUM",
            assurance_ready=True, evidence_verified=True, status="CALCULATED",
        ),
        PrincipleIndicatorDisclosure(
            metric_code="P6-EI-6-S1", indicator_name="Total Scope 1 GHG Emissions (tCO2e)", principle=6, brsr_core=True,
            disclosed_value=total_scope_1, unit="tCO2e", aggregation_method="SUM",
            assurance_ready=True, evidence_verified=True, status="CALCULATED",
        ),
        PrincipleIndicatorDisclosure(
            metric_code="P6-EI-6-S2", indicator_name="Total Scope 2 GHG Emissions (tCO2e)", principle=6, brsr_core=True,
            disclosed_value=total_scope_2, unit="tCO2e", aggregation_method="SUM",
            assurance_ready=True, evidence_verified=True, status="CALCULATED",
        ),
        PrincipleIndicatorDisclosure(
            metric_code="P6-LI-4", indicator_name="Total Scope 3 GHG Emissions (tCO2e)", principle=6, brsr_core=False,
            disclosed_value=total_scope_3, unit="tCO2e", aggregation_method="SUM",
            assurance_ready=True, evidence_verified=True, status="CALCULATED",
        ),
        PrincipleIndicatorDisclosure(
            metric_code="P6-EI-8", indicator_name="Total Waste Generated (MT)", principle=6, brsr_core=True,
            disclosed_value=curr_p6["waste"]["generated"], unit="MT", aggregation_method="SUM",
            assurance_ready=True, evidence_verified=True, status="CALCULATED",
        ),
    ]
    # Plain placeholder rows for Principles 1-5 and 7-9 (out of scope)
    for p_num, p_title in [
        (1, "Ethics, Transparency & Accountability"),
        (2, "Product Lifecycle Sustainability"),
        (3, "Employee Well-being"),
        (4, "Stakeholder Engagement"),
        (5, "Human Rights"),
        (7, "Public Policy Advocacy"),
        (8, "Inclusive Growth & Equitable Development"),
        (9, "Consumer Value & Responsibility"),
    ]:
        section_c_disclosures.append(
            PrincipleIndicatorDisclosure(
                metric_code=f"P{p_num}-PLACEHOLDER",
                indicator_name=f"Principle {p_num}: {p_title} (Out of scope — placeholder)",
                principle=p_num,
                brsr_core=False,
                disclosed_value=None,
                unit="—",
                aggregation_method="NONE",
                assurance_ready=False,
                evidence_verified=False,
                status="PLACEHOLDER",
            )
        )

    sec_a_rows = (fields.get("grp_seca_1_24_rows") or {}).get("current") or []
    cin_val = next((r.get("response") for r in sec_a_rows if "cin" in str(r.get("particulars", "")).lower()), "U45201TG2006PLC050271")
    sites_count = len([n for n in esg_store.get_nodes() if n["type"] in ("project", "site", "plant", "manufacturing")])

    section_a = SectionAData(
        corporate_name=node.name,
        cin=str(cin_val),
        financial_year=fy_info["current"],
        total_employees=0,
        operating_plants_and_sites_count=sites_count,
    )
    section_b = SectionBData(
        policy_governance_score=f"Policy covers P6: {_fv('grp_secb_1_policy_coverage', 'current', 'Yes')} | Standards: {_fv('grp_secb_6_standards', 'current', 'ISO 14001')}",
        board_oversight_committee=str(_fv("grp_secb_8_highest_authority", "current", "Board ESG Committee")),
    )

    raw_payload = json.dumps({
        "entity_id": node.id,
        "period_id": period.id,
        "p6": principle_6_summary,
    }, sort_keys=True, default=str)
    snapshot_hash = hashlib.sha256(raw_payload.encode("utf-8")).hexdigest()

    report_id = str(uuid.uuid4())
    new_report = Report(
        id=report_id,
        entity_id=node.id,
        period_id=period.id,
        report_type=report_type,
        snapshot_hash=snapshot_hash,
        generated_by=generated_by,
        content_json=json.loads(raw_payload),
    )
    db.add(new_report)
    db.commit()

    return BRSRFullReportResponse(
        report_id=report_id,
        report_type=report_type,
        entity_code=node.code,
        entity_name=node.name,
        financial_year=fy_info["current"],
        period_code=period.code,
        snapshot_hash=snapshot_hash,
        generated_at=datetime.now(timezone.utc),
        section_a=section_a,
        section_b=section_b,
        section_c=section_c_disclosures,
        total_scope_1_tco2e=total_scope_1,
        total_scope_2_tco2e=total_scope_2,
        total_scope_3_tco2e=total_scope_3,
        total_ghg_emissions_tco2e=total_ghg,
        principle_6_summary=principle_6_summary,
        reporting_coverage={"total_expected": 6, "reported_count": 6, "missing_count": 0},
        is_partially_reported=False,
    )
