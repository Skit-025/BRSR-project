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
        rows_html += f"""
        <tr>
            <td style="padding:10px;border-bottom:1px solid #e5e7eb;"><b>{item.metric_code}</b></td>
            <td style="padding:10px;border-bottom:1px solid #e5e7eb;">{item.indicator_name} {core_badge}</td>
            <td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:right;"><b>{item.disclosed_value:,.2f} {item.unit}</b></td>
            <td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:center;">{item.aggregation_method.upper()}</td>
            <td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:center;">{evidence_badge}</td>
        </tr>
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
