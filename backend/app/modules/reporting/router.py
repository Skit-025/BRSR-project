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
    Renders official SEBI Annexure I BRSR report in printable HTML/CSS format with assurance seal.
    """
    from app.modules.reporting.renderers.pdf import render_brsr_html
    assert_user_authorized_for_project(db, current_user, entity_id, "export HTML report for this entity")
    report = compile_brsr_report(db, entity_id, period_id, ReportType.BRSR_FULL.value)
    html_content = render_brsr_html(report.model_dump())
    return Response(content=html_content, media_type="text/html")


@router.get("/export/pdf/{entity_id}/{period_id}", response_class=Response)
def export_pdf_report(
    entity_id: str,
    period_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Renders official SEBI Annexure I BRSR report as PDF bytes (or print-ready HTML fallback when WeasyPrint is absent).
    """
    from app.modules.reporting.renderers.pdf import render_brsr_pdf_bytes
    assert_user_authorized_for_project(db, current_user, entity_id, "export PDF report for this entity")
    report = compile_brsr_report(db, entity_id, period_id, ReportType.BRSR_FULL.value)
    pdf_bytes = render_brsr_pdf_bytes(report.model_dump())
    media = "application/pdf" if pdf_bytes.startswith(b"%PDF") else "text/html"
    return Response(content=pdf_bytes, media_type=media)
