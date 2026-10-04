from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.modules.org.models import OrgNode, ReportingPeriod, MetricApplicability
from app.modules.org.schemas import (
    OrgNodeCreate,
    OrgNodeUpdate,
    OrgNodeRead,
    OrgNodeTreeRead,
    ReportingPeriodCreate,
    ReportingPeriodRead,
    MetricApplicabilityRead,
    ApplicabilityOverrideRequest
)
from app.modules.org.tree import build_materialized_path, build_tree_hierarchy
from app.modules.org.applicability.engine import evaluate_applicability_for_node

router = APIRouter(prefix="/org", tags=["Organization Hierarchy & Applicability"])

# --- ORG NODES ---

@router.get("/tree", response_model=List[OrgNodeTreeRead])
def get_organization_tree(db: Session = Depends(get_db)):
    """Returns the full organization hierarchy as a nested tree structure."""
    nodes = db.query(OrgNode).filter(OrgNode.is_deleted == False).order_by(OrgNode.path).all()
    return build_tree_hierarchy(nodes)

@router.get("/nodes", response_model=List[OrgNodeRead])
def list_nodes(
    parent_id: Optional[str] = None,
    node_type: Optional[str] = None,
    boundary: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """Lists organization nodes with optional filtering."""
    query = db.query(OrgNode).filter(OrgNode.is_deleted == False)
    if parent_id:
        query = query.filter(OrgNode.parent_id == parent_id)
    if node_type:
        query = query.filter(OrgNode.type == node_type)
    if boundary is not None:
        query = query.filter(OrgNode.boundary == boundary)
    return query.all()

@router.post("/nodes", response_model=OrgNodeRead, status_code=status.HTTP_201_CREATED)
def create_node(node_in: OrgNodeCreate, db: Session = Depends(get_db)):
    """Creates a new node in the hierarchy, computes path, and triggers applicability evaluation."""
    existing = db.query(OrgNode).filter(OrgNode.code == node_in.code).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Node with code '{node_in.code}' already exists."
        )

    path = build_materialized_path(db, node_in.parent_id, node_in.code)
    
    node = OrgNode(
        code=node_in.code,
        name=node_in.name,
        type=node_in.type.value,
        parent_id=node_in.parent_id,
        path=path,
        ownership_pct=node_in.ownership_pct,
        control_type=node_in.control_type.value,
        boundary=node_in.boundary,
        project_type=node_in.project_type.value,
        location_state=node_in.location_state,
        location_country=node_in.location_country,
        is_listed=node_in.is_listed,
        is_water_stressed=node_in.is_water_stressed,
        is_pat_designated=node_in.is_pat_designated,
        has_land_acquisition=node_in.has_land_acquisition
    )
    db.add(node)
    db.commit()
    db.refresh(node)

    # Trigger automatic applicability evaluation
    evaluate_applicability_for_node(node, db)

    return node

@router.get("/nodes/{node_id}", response_model=OrgNodeRead)
def get_node(node_id: str, db: Session = Depends(get_db)):
    node = db.query(OrgNode).filter(OrgNode.id == node_id, OrgNode.is_deleted == False).first()
    if not node:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Node not found.")
    return node

# --- REPORTING PERIODS ---

@router.get("/periods", response_model=List[ReportingPeriodRead])
def list_periods(financial_year: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(ReportingPeriod).filter(ReportingPeriod.is_deleted == False)
    if financial_year:
        query = query.filter(ReportingPeriod.financial_year == financial_year)
    return query.order_by(ReportingPeriod.start_date.desc()).all()

@router.post("/periods", response_model=ReportingPeriodRead, status_code=status.HTTP_201_CREATED)
def create_period(period_in: ReportingPeriodCreate, db: Session = Depends(get_db)):
    existing = db.query(ReportingPeriod).filter(ReportingPeriod.code == period_in.code).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Period '{period_in.code}' already exists.")
    
    period = ReportingPeriod(
        code=period_in.code,
        financial_year=period_in.financial_year,
        period_type=period_in.period_type.value,
        month=period_in.month,
        quarter=period_in.quarter,
        start_date=period_in.start_date,
        end_date=period_in.end_date,
        status=period_in.status.value
    )
    db.add(period)
    db.commit()
    db.refresh(period)
    return period

# --- APPLICABILITY ENGINE ---

@router.get("/applicability/{node_id}", response_model=List[MetricApplicabilityRead])
def get_node_applicability(node_id: str, period_id: Optional[str] = None, db: Session = Depends(get_db)):
    node = db.query(OrgNode).filter(OrgNode.id == node_id).first()
    if not node:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Node not found.")
    
    # Ensure rules are evaluated
    records = evaluate_applicability_for_node(node, db, period_id)
    return records

@router.post("/applicability/{node_id}/override", response_model=MetricApplicabilityRead)
def override_applicability(node_id: str, override_req: ApplicabilityOverrideRequest, db: Session = Depends(get_db)):
    node = db.query(OrgNode).filter(OrgNode.id == node_id).first()
    if not node:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Node not found.")

    rec = db.query(MetricApplicability).filter(
        MetricApplicability.org_node_id == node_id,
        MetricApplicability.metric_code == override_req.metric_code
    ).first()

    if not rec:
        rec = MetricApplicability(
            org_node_id=node_id,
            metric_code=override_req.metric_code,
            rule_id="MANUAL-OVERRIDE"
        )

    rec.is_applicable = override_req.is_applicable
    rec.is_exception = True
    rec.exception_reason = override_req.reason
    rec.approved_by = override_req.approved_by
    rec.reason = f"Audited Exception: {override_req.reason} (Approved by {override_req.approved_by})"

    db.add(rec)
    db.commit()
    db.refresh(rec)
    return rec
