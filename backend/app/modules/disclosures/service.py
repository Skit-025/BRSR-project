"""
app/modules/disclosures/service.py
Service operations for Type 3 Disclosures (BU, Subsidiary, Group) and Calculation Pipeline Jobs.
"""
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.modules.disclosures.models import (
    OrgLevelDisclosure,
    DisclosureLevel,
    DisclosureSection,
    DisclosureStatus,
    CalculationJob
)
from app.modules.disclosures.schemas import OrgLevelDisclosureSaveRequest
from app.modules.org.models import OrgNode
from app.modules.reporting.models import Report


def get_or_create_disclosure(
    db: Session,
    org_node_id: str,
    period_id: Optional[str],
    disclosure_level: str,
    disclosure_section: str
) -> OrgLevelDisclosure:
    """Finds an existing disclosure record or creates a draft one."""
    disc = db.query(OrgLevelDisclosure).filter(
        OrgLevelDisclosure.org_node_id == org_node_id,
        OrgLevelDisclosure.period_id == period_id,
        OrgLevelDisclosure.disclosure_level == disclosure_level,
        OrgLevelDisclosure.disclosure_section == disclosure_section
    ).first()

    if not disc:
        disc = OrgLevelDisclosure(
            org_node_id=org_node_id,
            period_id=period_id,
            disclosure_level=disclosure_level,
            disclosure_section=disclosure_section,
            payload={},
            payload_version="v1",
            status=DisclosureStatus.DRAFT.value
        )
        db.add(disc)
        db.commit()
        db.refresh(disc)
    return disc


def list_disclosures(
    db: Session,
    org_node_id: str,
    period_id: Optional[str] = None,
    disclosure_level: Optional[str] = None
) -> List[OrgLevelDisclosure]:
    """Lists disclosures for an org node, optionally filtered by level and period."""
    q = db.query(OrgLevelDisclosure).filter(OrgLevelDisclosure.org_node_id == org_node_id)
    if period_id:
        q = q.filter(OrgLevelDisclosure.period_id == period_id)
    if disclosure_level:
        q = q.filter(OrgLevelDisclosure.disclosure_level == disclosure_level)
    return q.all()


def save_disclosure(
    db: Session,
    req: OrgLevelDisclosureSaveRequest,
    user_id: Optional[str] = None
) -> OrgLevelDisclosure:
    """Autosaves or updates a draft disclosure section."""
    disc = db.query(OrgLevelDisclosure).filter(
        OrgLevelDisclosure.org_node_id == req.org_node_id,
        OrgLevelDisclosure.period_id == req.period_id,
        OrgLevelDisclosure.disclosure_level == req.disclosure_level,
        OrgLevelDisclosure.disclosure_section == req.disclosure_section
    ).first()

    if not disc:
        disc = OrgLevelDisclosure(
            org_node_id=req.org_node_id,
            period_id=req.period_id,
            disclosure_level=req.disclosure_level,
            disclosure_section=req.disclosure_section,
            payload=req.payload,
            payload_version=req.payload_version or "v1",
            status=DisclosureStatus.DRAFT.value,
            notes=req.notes
        )
        db.add(disc)
    else:
        if disc.status == DisclosureStatus.LOCKED.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Disclosure is locked and cannot be edited."
            )
        disc.payload = req.payload
        disc.payload_version = req.payload_version or disc.payload_version
        if req.notes is not None:
            disc.notes = req.notes

    db.commit()
    db.refresh(disc)
    return disc


def submit_disclosure(
    db: Session,
    disclosure_id: str,
    user_id: Optional[str] = None
) -> OrgLevelDisclosure:
    """Submits a disclosure for review."""
    disc = db.query(OrgLevelDisclosure).filter(OrgLevelDisclosure.id == disclosure_id).first()
    if not disc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Disclosure not found")
    disc.status = DisclosureStatus.SUBMITTED.value
    disc.submitted_by_id = user_id
    disc.submitted_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(disc)
    return disc


def approve_disclosure(
    db: Session,
    disclosure_id: str,
    user_id: Optional[str] = None
) -> OrgLevelDisclosure:
    """Approves a disclosure."""
    disc = db.query(OrgLevelDisclosure).filter(OrgLevelDisclosure.id == disclosure_id).first()
    if not disc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Disclosure not found")
    disc.status = DisclosureStatus.APPROVED.value
    disc.approved_by_id = user_id
    disc.approved_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(disc)
    return disc


def create_or_trigger_calc_job(
    db: Session,
    org_node_id: str,
    period_id: Optional[str] = None,
    trigger_event: str = "manual",
    user_id: Optional[str] = None
) -> CalculationJob:
    """
    Creates and simulates a calculation pipeline execution (spec §48).
    Pipeline stages: project_calc -> bu_aggregation -> subsidiary_aggregation -> group_aggregation -> report_generation
    Also marks affected reports as STALE (spec §49).
    """
    # Find reports for this entity or parent entities to mark stale
    affected_reports_list = []
    try:
        affected_reps = db.query(Report).filter(Report.entity_id == org_node_id).all()
        for r in affected_reps:
            if hasattr(r, 'status'):
                r.status = "STALE"
            affected_reports_list.append(str(r.id))
        db.commit()
    except Exception:
        pass

    job = CalculationJob(
        trigger_event=trigger_event,
        org_node_id=org_node_id,
        period_id=period_id,
        initiated_by_id=user_id,
        pipeline_status={
            "project_calc": "DONE",
            "bu_aggregation": "DONE",
            "subsidiary_aggregation": "DONE",
            "group_aggregation": "DONE",
            "report_generation": "DONE"
        },
        overall_status="COMPLETE",
        methodology_version="v2.4",
        started_at=datetime.now(timezone.utc),
        completed_at=datetime.now(timezone.utc),
        affected_reports=affected_reports_list
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


def get_latest_calc_job(
    db: Session,
    org_node_id: str,
    period_id: Optional[str] = None
) -> Optional[CalculationJob]:
    """Retrieves the latest calculation job for an org node and period."""
    q = db.query(CalculationJob).filter(CalculationJob.org_node_id == org_node_id)
    if period_id:
        q = q.filter(CalculationJob.period_id == period_id)
    return q.order_by(CalculationJob.created_at.desc()).first()
