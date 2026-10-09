from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.modules.auth.models import User
from app.modules.auth.router import get_current_active_user
from app.security.sod import assert_can_run_consolidation
from app.security.scope import assert_user_authorized_for_project
from app.modules.consolidation.models import ConsolidatedValue
from app.modules.consolidation.schemas import (
    ConsolidatedValueRead,
    ConsolidationRunRequest,
    ConsolidationRunResponse
)
from app.modules.consolidation.service import run_consolidation_engine

router = APIRouter(prefix="/consolidation", tags=["Boundary & Consolidation Engine"])

@router.get("/status", response_model=Dict[str, Any])
def get_consolidation_status(db: Session = Depends(get_db)):
    """
    Returns the current and historical consolidation run status.
    Frontend uses this for real-time polling and history display.
    """
    try:
        # Count consolidated values as a proxy for run completeness
        total_consolidated = db.query(ConsolidatedValue).count()
        # Group by period to build history
        from sqlalchemy import func, text
        periods = db.execute(
            text("SELECT DISTINCT period_id FROM consolidated_values ORDER BY period_id DESC LIMIT 10")
        ).fetchall() if total_consolidated > 0 else []
        history = []
        for row in periods:
            pid = row[0]
            count = db.query(ConsolidatedValue).filter(ConsolidatedValue.period_id == pid).count()
            history.append({
                "period_id": pid,
                "status": "completed",
                "entities_processed": count,
                "variance_flags": 0,
                "duration_ms": None,
            })
        return {
            "current_run": history[0] if history else None,
            "history": history,
            "total_consolidated_values": total_consolidated,
        }
    except Exception as e:
        return {
            "current_run": None,
            "history": [],
            "total_consolidated_values": 0,
            "error": str(e),
        }

@router.post("/run", response_model=ConsolidationRunResponse, status_code=status.HTTP_200_OK)
def trigger_consolidation(
    req: ConsolidationRunRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    F22-F23: Triggers deterministic post-order roll-up of approved site numbers
    up to Business Units, Subsidiaries, and MEIL Group.
    """
    assert_can_run_consolidation(current_user.role)
    if req.root_node_id:
        assert_user_authorized_for_project(db, current_user, req.root_node_id, "trigger consolidation for this entity")
    try:
        res = run_consolidation_engine(db, req.period_id, req.root_node_id)
        return res
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/{entity_id}/{period_id}", response_model=List[ConsolidatedValueRead])
def get_consolidated_figures(
    entity_id: str,
    period_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Retrieves rolled-up KPI values for a parent node (BU, Subsidiary, or Group)
    including child contribution lineage (raw value, boundary share %, weighted value).
    """
    assert_user_authorized_for_project(db, current_user, entity_id, "view consolidated figures for this entity")
    values = db.query(ConsolidatedValue).filter(
        ConsolidatedValue.entity_id == entity_id,
        ConsolidatedValue.period_id == period_id
    ).all()
    return values


@router.get("/bu-drilldown/{bu_id}/{period_id}", response_model=Dict[str, Any])
def get_bu_drilldown(
    bu_id: str,
    period_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Spec §18-§20: BU Drill-Down View.
    Returns:
    - BU overview & coverage metrics
    - Rolled-up BU metrics
    - Granular breakdown of each constituent project:
      raw inputs, calculation methodology, approval status, and evidence files.
    """
    assert_user_authorized_for_project(db, current_user, bu_id, "view BU drilldown for this entity")
    from app.modules.org.models import OrgNode
    from app.modules.collection.models import Submission, DataPoint, SubmissionStatus
    from app.modules.evidence.models import EvidenceFile, EvidenceLink
    from app.modules.metrics.models import Metric

    bu_node = db.query(OrgNode).filter(OrgNode.id == bu_id, OrgNode.is_deleted == False).first()
    if not bu_node:
        raise HTTPException(status_code=404, detail=f"Business Unit '{bu_id}' not found.")

    # Find projects directly under this BU
    projects = db.query(OrgNode).filter(OrgNode.parent_id == bu_id, OrgNode.is_deleted == False).all()
    project_ids = [p.id for p in projects]

    # Submissions for these projects
    submissions = db.query(Submission).filter(
        Submission.entity_id.in_(project_ids) if project_ids else False,
        Submission.period_id == period_id,
        Submission.is_deleted == False
    ).all() if project_ids else []

    sub_by_project = {s.entity_id: s for s in submissions}

    # Consolidated figures for BU
    cons_values = db.query(ConsolidatedValue).filter(
        ConsolidatedValue.entity_id == bu_id,
        ConsolidatedValue.period_id == period_id
    ).all()

    project_items = []
    approved_count = 0
    pending_count = 0
    changes_req_count = 0

    for proj in projects:
        sub = sub_by_project.get(proj.id)
        status_val = sub.status if sub else "NOT_STARTED"
        if status_val in ("BU_APPROVED", "APPROVED", "SUBSIDIARY_APPROVED", "LOCKED"):
            approved_count += 1
        elif status_val in ("SUBMITTED", "PENDING", "BU_REVIEW"):
            pending_count += 1
        elif status_val in ("REJECTED", "CHANGES_REQUESTED"):
            changes_req_count += 1

        raw_points = []
        calc_points = []

        if sub:
            dps = db.query(DataPoint).filter(DataPoint.submission_id == sub.id).all()
            for dp in dps:
                # Find linked evidence
                links = db.query(EvidenceLink).filter(EvidenceLink.data_point_id == dp.id).all()
                evidence_list = []
                for link in links:
                    ef = db.query(EvidenceFile).filter(EvidenceFile.id == link.evidence_id).first()
                    if ef:
                        evidence_list.append({
                            "id": ef.id,
                            "filename": ef.original_name,
                            "sha256": ef.sha256,
                            "size_bytes": ef.size_bytes,
                            "doc_type": ef.doc_type,
                        })

                entry_data = {
                    "metric_code": dp.metric_code,
                    "value": dp.value_numeric,
                    "unit": dp.unit,
                    "notes": dp.notes,
                    "evidence_files": evidence_list
                }

                # Categorize raw vs derived
                if "SCOPE" in dp.metric_code or "EMISSION" in dp.metric_code or "TOTAL" in dp.metric_code:
                    calc_points.append(entry_data)
                else:
                    raw_points.append(entry_data)

        project_items.append({
            "project_id": proj.id,
            "project_name": proj.name,
            "project_code": proj.code,
            "status": status_val,
            "submission_id": sub.id if sub else None,
            "submitted_at": sub.submitted_at.isoformat() if sub and sub.submitted_at else None,
            "raw_inputs": raw_points,
            "calculated_metrics": calc_points,
        })

    total_projects = len(projects)
    coverage_pct = round((approved_count / total_projects * 100), 1) if total_projects > 0 else 0.0

    return {
        "bu_id": bu_node.id,
        "bu_name": bu_node.name,
        "bu_code": bu_node.code,
        "period_id": period_id,
        "total_projects": total_projects,
        "approved_projects": approved_count,
        "pending_projects": pending_count,
        "correction_required": changes_req_count,
        "data_coverage_pct": coverage_pct,
        "consolidated_metrics": [
            {
                "metric_code": cv.metric_code,
                "value": cv.value,
                "unit": cv.unit,
                "method": cv.method,
                "child_contributions": cv.child_contributions
            }
            for cv in cons_values
        ],
        "projects": project_items
    }

