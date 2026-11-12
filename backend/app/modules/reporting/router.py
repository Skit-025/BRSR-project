from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from app.db.session import get_db
from app.modules.auth.models import User
from app.modules.auth.router import get_current_active_user
from app.security.sod import assert_can_compile_report
from app.security.scope import assert_user_authorized_for_project
from app.modules.reporting.schemas import BRSRFullReportResponse
from app.modules.reporting.models import ReportType
from app.modules.reporting.disclosure_mapper import compile_brsr_report

router = APIRouter(prefix="/reports", tags=["SEBI BRSR Reports & Disclosures"])

@router.get("", response_model=List[Dict[str, Any]])
def list_reports(
    entity_id: Optional[str] = Query(None),
    period_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Lists all compiled BRSR reports. Filterable by entity and period.
    Frontend uses this to populate the reports sidebar.
    """
    try:
        from app.modules.reporting.models import Report as ReportModel
        q = db.query(ReportModel)
        if entity_id:
            assert_user_authorized_for_project(db, current_user, entity_id, "view reports for this entity")
            q = q.filter(ReportModel.entity_id == entity_id)
        if period_id:
            q = q.filter(ReportModel.period_id == period_id)
        reports = q.order_by(ReportModel.generated_at.desc()).limit(50).all()
        return [
            {
                "id": str(r.id),
                "entity_id": str(r.entity_id),
                "period_id": str(r.period_id),
                "status": getattr(r, "status", "READY"),
                "sha256_seal": r.snapshot_hash,
                "generated_at": str(r.generated_at) if r.generated_at else None,
                "report_type": r.report_type,
            }
            for r in reports
        ]
    except Exception as e:
        # Return empty list gracefully if model/table doesn't exist yet
        return []

@router.post("/compile", response_model=Dict[str, Any])
def compile_report_endpoint(
    data: Dict[str, Any],
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Triggers BRSR report compilation for an entity + period.
    Calls the same disclosure_mapper used by the GET endpoint, then persists result.
    """
    assert_can_compile_report(current_user.role)
    entity_id = data.get("entity_id")
    period_id = data.get("period_id")
    if not entity_id or not period_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="entity_id and period_id are required")
    
    assert_user_authorized_for_project(db, current_user, entity_id, "compile report for this entity")
    try:
        report = compile_brsr_report(db, entity_id, period_id, ReportType.BRSR_FULL.value)
        return {
            "entity_id": entity_id,
            "period_id": period_id,
            "sha256_seal": report.snapshot_hash,
            "report_id": str(report.report_id),
            "status": "compiled",
            "generated_at": str(report.generated_at),
        }
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/brsr/{entity_id}/{period_id}", response_model=BRSRFullReportResponse)
def get_sebi_brsr_report(
    entity_id: str,
    period_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    F26-F29 SEBI BRSR Report (Full):
    Returns compiled Section A, Section B, and Section C tables with SHA-256 snapshot seal.
    """
    assert_user_authorized_for_project(db, current_user, entity_id, "view BRSR report for this entity")
    return compile_brsr_report(db, entity_id, period_id, ReportType.BRSR_FULL.value)

@router.get("/brsr-core/{entity_id}/{period_id}", response_model=BRSRFullReportResponse)
def get_sebi_brsr_core_report(
    entity_id: str,
    period_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    F29 SEBI BRSR Core Subset:
    Filtered report containing only indicators requiring external reasonable assurance.
    """
    assert_user_authorized_for_project(db, current_user, entity_id, "view BRSR Core report for this entity")
    return compile_brsr_report(db, entity_id, period_id, ReportType.BRSR_CORE.value)

@router.get("/export/html/{entity_id}/{period_id}", response_class=Response)
def export_html_report(
    entity_id: str,
    period_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Renders official SEBI BRSR report in printable HTML/CSS format with assurance seal footer.
    """
    assert_user_authorized_for_project(db, current_user, entity_id, "export HTML report for this entity")
    report = compile_brsr_report(db, entity_id, period_id, ReportType.BRSR_FULL.value)

    rows_html = ""
    for item in report.section_c:
        core_badge = "<span style='background:#e0f2fe;color:#0369a1;padding:2px 6px;border-radius:4px;font-size:11px;'>BRSR CORE</span>" if item.brsr_core else ""
        evidence_badge = "<span style='color:#15803d;'>&#10003; Verified</span>" if item.evidence_verified else "<span style='color:#b45309;'>Reported</span>"
        if item.disclosed_value is not None:
            val_display = f"{item.disclosed_value:,.2f} {item.unit}"
        else:
            status_text = getattr(item, 'status', None) or 'NOT REPORTED'
            val_display = f"<span style='color:#6b7280;font-style:italic;'>{status_text}</span>"

        rows_html += f"""
        <tr>
            <td style="padding:10px;border-bottom:1px solid #e5e7eb;"><b>{item.metric_code}</b></td>
            <td style="padding:10px;border-bottom:1px solid #e5e7eb;">{item.indicator_name} {core_badge}</td>
            <td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:right;"><b>{val_display}</b></td>
            <td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:center;">{item.aggregation_method.upper()}</td>
            <td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:center;">{evidence_badge}</td>
        </tr>
        """

    p6 = report.principle_6_summary or {}
    c6 = p6.get("current") or {}
    p6_prev = p6.get("previous") or {}
    qual = p6.get("qualitative") or {}
    curr_fy = p6.get("current_fy") or report.financial_year
    prev_fy = p6.get("previous_fy") or "Previous FY"

    def _f(v):
        if v is None or v == "":
            return "—"
        if isinstance(v, (int, float)):
            return f"{v:,.2f}"
        return str(v)

    ce = c6.get("energy", {})
    pe = p6_prev.get("energy", {})
    cw = c6.get("water", {})
    pw = p6_prev.get("water", {})
    ca = c6.get("air", {})
    pa = p6_prev.get("air", {})
    cg = c6.get("ghg", {})
    pg = p6_prev.get("ghg", {})
    cws = c6.get("waste", {})
    pws = p6_prev.get("waste", {})
    ccat = cws.get("categories", {})
    pcat = pws.get("categories", {})
    crec = cws.get("recovery", {})
    prec = pws.get("recovery", {})
    cdisp = cws.get("disposal", {})
    pdisp = pws.get("disposal", {})
    cwdis = cw.get("discharge_by_dest", {})
    pwdis = pw.get("discharge_by_dest", {})
    assur_note = f"<i>Note: External assessment/assurance status: <b>{qual.get('assurance_status', 'Not Assured')}</b> | Agency: <b>{qual.get('assurance_agency', '—')}</b></i>"

    p6_html = f"""
    <div style="margin-top: 30px; page-break-before: always;">
        <h2 style="color:#0f766e;border-bottom:2px solid #0f766e;padding-bottom:6px;">PRINCIPLE 6: Businesses should respect and make efforts to protect and restore the environment</h2>
        <h3 style="background:#f1f5f9;padding:8px 12px;border-left:4px solid #0f766e;">Essential Indicators</h3>

        <p><b>1. Details of total energy consumption (in GJ):</b></p>
        <table>
            <thead><tr><th>Parameter</th><th style="text-align:right;">{curr_fy} (Current FY)</th><th style="text-align:right;">{prev_fy} (Previous FY)</th></tr></thead>
            <tbody>
                <tr><td>Total electricity consumption (A+D)</td><td style="text-align:right;">{_f(ce.get('elec'))}</td><td style="text-align:right;">{_f(pe.get('elec'))}</td></tr>
                <tr><td>Total fuel consumption (B+E)</td><td style="text-align:right;">{_f(ce.get('fuel'))}</td><td style="text-align:right;">{_f(pe.get('fuel'))}</td></tr>
                <tr><td>Energy consumption through other sources (C+F)</td><td style="text-align:right;">{_f(ce.get('other'))}</td><td style="text-align:right;">{_f(pe.get('other'))}</td></tr>
                <tr><td><b>Total energy consumption (A+B+C+D+E+F)</b></td><td style="text-align:right;"><b>{_f(ce.get('total'))}</b></td><td style="text-align:right;"><b>{_f(pe.get('total'))}</b></td></tr>
            </tbody>
        </table>
        <p style="font-size:12px;color:#475569;">{assur_note}</p>

        <p><b>2. Designated Consumers (DCs) under PAT Scheme:</b> {_f(qual.get('pat_scheme'))}</p>

        <p><b>3. Disclosures related to water (in kilolitres):</b></p>
        <table>
            <thead><tr><th>Parameter</th><th style="text-align:right;">{curr_fy} (Current FY)</th><th style="text-align:right;">{prev_fy} (Previous FY)</th></tr></thead>
            <tbody>
                <tr><td>(i) Surface water</td><td style="text-align:right;">{_f(cw.get('surface'))}</td><td style="text-align:right;">{_f(pw.get('surface'))}</td></tr>
                <tr><td>(ii) Groundwater</td><td style="text-align:right;">{_f(cw.get('groundwater'))}</td><td style="text-align:right;">{_f(pw.get('groundwater'))}</td></tr>
                <tr><td>(iii) Third party water</td><td style="text-align:right;">{_f(cw.get('third_party'))}</td><td style="text-align:right;">{_f(pw.get('third_party'))}</td></tr>
                <tr><td>(iv) Seawater / desalinated water</td><td style="text-align:right;">{_f(cw.get('seawater'))}</td><td style="text-align:right;">{_f(pw.get('seawater'))}</td></tr>
                <tr><td>(v) Others</td><td style="text-align:right;">{_f(cw.get('others'))}</td><td style="text-align:right;">{_f(pw.get('others'))}</td></tr>
                <tr><td><b>Total volume of water withdrawal (i+ii+iii+iv+v)</b></td><td style="text-align:right;"><b>{_f(cw.get('withdrawn'))}</b></td><td style="text-align:right;"><b>{_f(pw.get('withdrawn'))}</b></td></tr>
                <tr><td><b>Total volume of water consumption (kL)</b></td><td style="text-align:right;"><b>{_f(cw.get('consumed'))}</b></td><td style="text-align:right;"><b>{_f(pw.get('consumed'))}</b></td></tr>
            </tbody>
        </table>
        <p style="font-size:12px;color:#475569;">{assur_note}</p>

        <p><b>4. Zero Liquid Discharge (ZLD) mechanism implemented:</b> {_f(qual.get('zld_mechanism'))}</p>

        <p><b>5. Air emissions (other than GHG emissions):</b></p>
        <table>
            <thead><tr><th>Parameter</th><th>Unit</th><th style="text-align:right;">{curr_fy}</th><th style="text-align:right;">{prev_fy}</th></tr></thead>
            <tbody>
                <tr><td>NOx</td><td>mg/m³</td><td style="text-align:right;">{_f(ca.get('nox'))}</td><td style="text-align:right;">{_f(pa.get('nox'))}</td></tr>
                <tr><td>SOx</td><td>mg/m³</td><td style="text-align:right;">{_f(ca.get('sox'))}</td><td style="text-align:right;">{_f(pa.get('sox'))}</td></tr>
                <tr><td>Particulate matter (PM)</td><td>mg/m³</td><td style="text-align:right;">{_f(ca.get('pm'))}</td><td style="text-align:right;">{_f(pa.get('pm'))}</td></tr>
                <tr><td>Persistent organic pollutants (POP)</td><td>mg/m³</td><td style="text-align:right;">{_f(ca.get('pop'))}</td><td style="text-align:right;">{_f(pa.get('pop'))}</td></tr>
                <tr><td>Volatile organic compounds (VOC)</td><td>mg/m³</td><td style="text-align:right;">{_f(ca.get('voc'))}</td><td style="text-align:right;">{_f(pa.get('voc'))}</td></tr>
                <tr><td>Hazardous air pollutants (HAP)</td><td>mg/m³</td><td style="text-align:right;">{_f(ca.get('hap'))}</td><td style="text-align:right;">{_f(pa.get('hap'))}</td></tr>
            </tbody>
        </table>

        <p><b>6. Greenhouse gas emissions (Scope 1 and Scope 2):</b></p>
        <table>
            <thead><tr><th>Parameter</th><th>Unit</th><th style="text-align:right;">{curr_fy}</th><th style="text-align:right;">{prev_fy}</th></tr></thead>
            <tbody>
                <tr><td>Total Scope 1 emissions</td><td>tCO2e</td><td style="text-align:right;">{_f(cg.get('scope1'))}</td><td style="text-align:right;">{_f(pg.get('scope1'))}</td></tr>
                <tr><td>Total Scope 2 emissions</td><td>tCO2e</td><td style="text-align:right;">{_f(cg.get('scope2'))}</td><td style="text-align:right;">{_f(pg.get('scope2'))}</td></tr>
            </tbody>
        </table>

        <p><b>7. Projects related to reducing Green House Gas emission:</b> {_f(qual.get('ghg_projects'))}</p>

        <p><b>8. Waste management (in metric tonnes):</b></p>
        <table>
            <thead><tr><th>Parameter</th><th style="text-align:right;">{curr_fy}</th><th style="text-align:right;">{prev_fy}</th></tr></thead>
            <tbody>
                <tr><td>Plastic waste (A)</td><td style="text-align:right;">{_f(ccat.get('plastic'))}</td><td style="text-align:right;">{_f(pcat.get('plastic'))}</td></tr>
                <tr><td>E-waste (B)</td><td style="text-align:right;">{_f(ccat.get('ewaste'))}</td><td style="text-align:right;">{_f(pcat.get('ewaste'))}</td></tr>
                <tr><td>Bio-medical waste (C)</td><td style="text-align:right;">{_f(ccat.get('biomed'))}</td><td style="text-align:right;">{_f(pcat.get('biomed'))}</td></tr>
                <tr><td>Construction and demolition waste (D)</td><td style="text-align:right;">{_f(ccat.get('cd'))}</td><td style="text-align:right;">{_f(pcat.get('cd'))}</td></tr>
                <tr><td>Battery waste (E)</td><td style="text-align:right;">{_f(ccat.get('battery'))}</td><td style="text-align:right;">{_f(pcat.get('battery'))}</td></tr>
                <tr><td>Radioactive waste (F)</td><td style="text-align:right;">{_f(ccat.get('radioactive'))}</td><td style="text-align:right;">{_f(pcat.get('radioactive'))}</td></tr>
                <tr><td>Other Hazardous waste (G)</td><td style="text-align:right;">{_f(ccat.get('hazardous_other'))}</td><td style="text-align:right;">{_f(pcat.get('hazardous_other'))}</td></tr>
                <tr><td>Other Non-hazardous waste (H)</td><td style="text-align:right;">{_f(ccat.get('non_hazardous_other'))}</td><td style="text-align:right;">{_f(pcat.get('non_hazardous_other'))}</td></tr>
                <tr><td><b>Total Waste Generated (A+B+C+D+E+F+G+H)</b></td><td style="text-align:right;"><b>{_f(cws.get('generated'))}</b></td><td style="text-align:right;"><b>{_f(pws.get('generated'))}</b></td></tr>
                <tr><td>Recovered — (i) Recycled</td><td style="text-align:right;">{_f(crec.get('recycled'))}</td><td style="text-align:right;">{_f(prec.get('recycled'))}</td></tr>
                <tr><td>Recovered — (ii) Re-used</td><td style="text-align:right;">{_f(crec.get('reused'))}</td><td style="text-align:right;">{_f(prec.get('reused'))}</td></tr>
                <tr><td>Recovered — (iii) Other recovery operations</td><td style="text-align:right;">{_f(crec.get('other'))}</td><td style="text-align:right;">{_f(prec.get('other'))}</td></tr>
                <tr><td>Disposed — (i) Incineration</td><td style="text-align:right;">{_f(cdisp.get('incineration'))}</td><td style="text-align:right;">{_f(pdisp.get('incineration'))}</td></tr>
                <tr><td>Disposed — (ii) Landfilling</td><td style="text-align:right;">{_f(cdisp.get('landfilling'))}</td><td style="text-align:right;">{_f(pdisp.get('landfilling'))}</td></tr>
                <tr><td>Disposed — (iii) Other disposal operations</td><td style="text-align:right;">{_f(cdisp.get('other'))}</td><td style="text-align:right;">{_f(pdisp.get('other'))}</td></tr>
            </tbody>
        </table>

        <p><b>9. Waste management practices &amp; toxic chemical reduction strategy:</b> {_f(qual.get('waste_strategy'))}</p>
        <p><b>10. Operations in ecologically sensitive areas:</b> {_f(qual.get('eco_sensitive'))}</p>
        <p><b>11. Environmental Impact Assessments (EIA):</b> {_f(qual.get('eia_details'))}</p>
        <p><b>12. Compliance with Water Act, Air Act &amp; Environment Protection Act:</b> {_f(qual.get('env_compliance'))}</p>

        <h3 style="background:#f1f5f9;padding:8px 12px;border-left:4px solid #0f766e;margin-top:24px;">Leadership Indicators</h3>

        <p><b>1. Break-up of total energy consumed (in GJ) from renewable and non-renewable sources:</b></p>
        <table>
            <thead><tr><th>Parameter</th><th style="text-align:right;">{curr_fy}</th><th style="text-align:right;">{prev_fy}</th></tr></thead>
            <tbody>
                <tr><td>Renewable — Electricity (A)</td><td style="text-align:right;">{_f(ce.get('ren_elec'))}</td><td style="text-align:right;">{_f(pe.get('ren_elec'))}</td></tr>
                <tr><td>Renewable — Fuel (B)</td><td style="text-align:right;">{_f(ce.get('ren_fuel'))}</td><td style="text-align:right;">{_f(pe.get('ren_fuel'))}</td></tr>
                <tr><td>Renewable — Other (C)</td><td style="text-align:right;">{_f(ce.get('ren_other'))}</td><td style="text-align:right;">{_f(pe.get('ren_other'))}</td></tr>
                <tr><td><b>Total Renewable (A+B+C)</b></td><td style="text-align:right;"><b>{_f(ce.get('ren_total'))}</b></td><td style="text-align:right;"><b>{_f(pe.get('ren_total'))}</b></td></tr>
                <tr><td>Non-Renewable — Electricity (D)</td><td style="text-align:right;">{_f(ce.get('nonren_elec'))}</td><td style="text-align:right;">{_f(pe.get('nonren_elec'))}</td></tr>
                <tr><td>Non-Renewable — Fuel (E)</td><td style="text-align:right;">{_f(ce.get('nonren_fuel'))}</td><td style="text-align:right;">{_f(pe.get('nonren_fuel'))}</td></tr>
                <tr><td>Non-Renewable — Other (F)</td><td style="text-align:right;">{_f(ce.get('nonren_other'))}</td><td style="text-align:right;">{_f(pe.get('nonren_other'))}</td></tr>
                <tr><td><b>Total Non-Renewable (D+E+F)</b></td><td style="text-align:right;"><b>{_f(ce.get('nonren_total'))}</b></td><td style="text-align:right;"><b>{_f(pe.get('nonren_total'))}</b></td></tr>
            </tbody>
        </table>

        <p><b>2. Water discharged by destination (in kilolitres):</b></p>
        <table>
            <thead><tr><th>Destination</th><th style="text-align:right;">{curr_fy}</th><th style="text-align:right;">{prev_fy}</th></tr></thead>
            <tbody>
                <tr><td>(i) To Surface water</td><td style="text-align:right;">{_f(cwdis.get('surface'))}</td><td style="text-align:right;">{_f(pwdis.get('surface'))}</td></tr>
                <tr><td>(ii) To Groundwater</td><td style="text-align:right;">{_f(cwdis.get('groundwater'))}</td><td style="text-align:right;">{_f(pwdis.get('groundwater'))}</td></tr>
                <tr><td>(iii) To Seawater</td><td style="text-align:right;">{_f(cwdis.get('seawater'))}</td><td style="text-align:right;">{_f(pwdis.get('seawater'))}</td></tr>
                <tr><td>(iv) Sent to third-parties</td><td style="text-align:right;">{_f(cwdis.get('third_party'))}</td><td style="text-align:right;">{_f(pwdis.get('third_party'))}</td></tr>
                <tr><td>(v) Others</td><td style="text-align:right;">{_f(cwdis.get('others'))}</td><td style="text-align:right;">{_f(pwdis.get('others'))}</td></tr>
                <tr><td><b>Total water discharged (kL)</b></td><td style="text-align:right;"><b>{_f(cw.get('discharged'))}</b></td><td style="text-align:right;"><b>{_f(pw.get('discharged'))}</b></td></tr>
            </tbody>
        </table>

        <p><b>3. Water withdrawal, consumption &amp; discharge in areas of water stress:</b> {_f(qual.get('water_stressed_sites'))}</p>

        <p><b>4. Total Scope 3 emissions:</b></p>
        <table>
            <thead><tr><th>Parameter</th><th>Unit</th><th style="text-align:right;">{curr_fy}</th><th style="text-align:right;">{prev_fy}</th></tr></thead>
            <tbody>
                <tr><td>Total Scope 3 emissions</td><td>tCO2e</td><td style="text-align:right;">{_f(cg.get('scope3'))}</td><td style="text-align:right;">{_f(pg.get('scope3'))}</td></tr>
            </tbody>
        </table>

        <p><b>5. Biodiversity impact &amp; remediation:</b> {_f(qual.get('biodiversity'))}</p>
        <p><b>6. Resource efficiency initiatives &amp; outcomes:</b> {_f(qual.get('resource_efficiency'))}</p>
        <p><b>7. Business continuity &amp; disaster management plan:</b> {_f(qual.get('bcp_plan'))}</p>
        <p><b>8. Adverse environmental impact from value chain &amp; mitigation:</b> {_f(qual.get('vc_impact'))}</p>
        <p><b>9. % of value chain partners assessed for environmental impacts:</b> {_f(qual.get('vc_assessed_pct'))}%</p>
        <p><b>Green Credits (Entity / Top 10 Value Chain Partners):</b> {_f(qual.get('green_credits_entity'))} / {_f(qual.get('green_credits_vc'))}</p>
    </div>
    """

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8"/>
        <title>SEBI BRSR Report - {report.entity_name} ({report.financial_year})</title>
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 40px; color: #1f2937; }}
            .header {{ border-bottom: 3px solid #0f766e; padding-bottom: 15px; margin-bottom: 25px; }}
            .seal {{ background: #f0fdfa; border: 1px solid #99f6e4; padding: 12px; border-radius: 6px; font-family: monospace; font-size: 12px; margin-bottom: 25px; }}
            table {{ width: 100%; border-collapse: collapse; margin-top: 15px; }}
            th {{ background: #f8fafc; padding: 10px; text-align: left; border-bottom: 2px solid #cbd5e1; font-size: 13px; }}
            .footer {{ margin-top: 50px; border-top: 1px solid #cbd5e1; padding-top: 15px; font-size: 12px; color: #64748b; }}
        </style>
    </head>
    <body>
        <div class="header">
            <h1 style="margin:0 0 5px 0;color:#0f766e;">MEIL ESG-BRSR Reporting Portal</h1>
            <h2 style="margin:0;color:#334155;font-size:18px;">Business Responsibility and Sustainability Report (SEBI Guidelines)</h2>
            <p style="margin:5px 0 0 0;color:#64748b;">Entity: <b>{report.entity_name} ({report.entity_code})</b> | Period: <b>{report.period_code} ({report.financial_year})</b></p>
        </div>

        <div class="seal">
            <b>&#128274; CRYPTOGRAPHIC ASSURANCE SEAL (SHA-256):</b><br/>
            {report.snapshot_hash}<br/>
            <i>Generated: {report.generated_at.strftime("%Y-%m-%d %H:%M:%S UTC")} | Report ID: {report.report_id}</i>
        </div>

        <h3>Section A: General Information</h3>
        <p>Corporate Name: <b>{report.section_a.corporate_name}</b> | CIN: <b>{report.section_a.cin}</b></p>
        <p>Reporting Boundary: <b>{report.section_a.reporting_boundary}</b> | Operating Sites: <b>{report.section_a.operating_plants_and_sites_count}</b></p>

        {p6_html}

        <h3>Section C: Principle-wise Performance Indicators</h3>
        <table>
            <thead>
                <tr>
                    <th style="width:150px;">Metric Code</th>
                    <th>Indicator Description</th>
                    <th style="text-align:right;">Disclosed Quantity</th>
                    <th style="text-align:center;">Method</th>
                    <th style="text-align:center;">Assurance Proof</th>
                </tr>
            </thead>
            <tbody>
                {rows_html}
            </tbody>
        </table>

        <div class="footer">
            <p>Certified in compliance with Securities and Exchange Board of India (SEBI) BRSR framework. Traceable to verified evidence documents in MEIL Evidence Vault.</p>
        </div>
    </body>
    </html>
    """

    return Response(content=html_content, media_type="text/html")
