from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from app.db.session import get_db
from app.modules.reporting.schemas import BRSRFullReportResponse
from app.modules.reporting.models import ReportType
from app.modules.reporting.disclosure_mapper import compile_brsr_report

router = APIRouter(prefix="/reports", tags=["SEBI BRSR Reports & Disclosures"])

@router.get("", response_model=List[Dict[str, Any]])
def list_reports(
    entity_id: Optional[str] = Query(None),
    period_id: Optional[str] = Query(None),
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
    db: Session = Depends(get_db)
):
    """
    Triggers BRSR report compilation for an entity + period.
    Calls the same disclosure_mapper used by the GET endpoint, then persists result.
    """
    entity_id = data.get("entity_id")
    period_id = data.get("period_id")
    if not entity_id or not period_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="entity_id and period_id are required")
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
    db: Session = Depends(get_db)
):
    """
    F26-F29 SEBI BRSR Report (Full):
    Returns compiled Section A, Section B, and Section C tables with SHA-256 snapshot seal.
    """
    return compile_brsr_report(db, entity_id, period_id, ReportType.BRSR_FULL.value)

@router.get("/brsr-core/{entity_id}/{period_id}", response_model=BRSRFullReportResponse)
def get_sebi_brsr_core_report(
    entity_id: str,
    period_id: str,
    db: Session = Depends(get_db)
):
    """
    F29 SEBI BRSR Core Subset:
    Filtered report containing only indicators requiring external reasonable assurance.
    """
    return compile_brsr_report(db, entity_id, period_id, ReportType.BRSR_CORE.value)

from app.modules.reporting.brsr_generator import (
    compile_brsr_full_data,
    generate_brsr_html,
    render_brsr_pdf_bytes_from_html,
    export_brsr_json,
)

@router.get("/export/html/{entity_id}/{period_id}", response_class=Response)
def export_html_report(
    entity_id: str,
    period_id: str,
    db: Session = Depends(get_db)
):
    """
    Renders official SEBI BRSR report in printable HTML/CSS format matching reference L&T Report.
    Every number is clickable for 3-click lineage.
    """
    try:
        data = compile_brsr_full_data(db, entity_id, period_id)
        html_content = generate_brsr_html(data)
        return Response(content=html_content, media_type="text/html")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/export/pdf/{entity_id}/{period_id}", response_class=Response)
def export_pdf_report(
    entity_id: str,
    period_id: str,
    db: Session = Depends(get_db)
):
    """
    P0 PDF EXPORT:
    Renders official SEBI BRSR report to PDF matching reference L&T Report layout and styling.
    Works for ANY hierarchy level (Standalone leaf, BU, Subsidiary, Group).
    """
    try:
        data = compile_brsr_full_data(db, entity_id, period_id)
        html_content = generate_brsr_html(data)
        pdf_bytes = render_brsr_pdf_bytes_from_html(html_content)
        
        filename = f"BRSR_Report_{data.get('entity_code', 'ENT')}_{data.get('financial_year', 'FY')}.pdf"
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Content-Length": str(len(pdf_bytes)),
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate PDF report: {str(e)}"
        )


@router.get("/export/json/{entity_id}/{period_id}")
def export_json_report(
    entity_id: str,
    period_id: str,
    db: Session = Depends(get_db)
):
    """
    Exports complete BRSR report as structured JSON data model.
    """
    return export_brsr_json(db, entity_id, period_id)


