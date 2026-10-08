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
    ReportingPeriodUpdate,
    ReportingPeriodRead,
    MetricApplicabilityRead,
    ApplicabilityOverrideRequest
)
from app.modules.org.tree import build_materialized_path, build_tree_hierarchy
from app.modules.org.applicability.engine import evaluate_applicability_for_node
from app.security.deps import require_permission, TokenData
from app.security.rbac import Permission

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
def create_node(
    node_in: OrgNodeCreate,
    db: Session = Depends(get_db),
    _user: TokenData = Depends(require_permission(Permission.ORG_WRITE))
):
    """Creates a new node in the hierarchy, validates 4-level parent-child rules, computes path, and triggers applicability evaluation."""
    from app.modules.org.service import OrgService
    service = OrgService(db)
    try:
        return service.create_node(node_in)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/nodes/{node_id}", response_model=OrgNodeRead)
def get_node(node_id: str, db: Session = Depends(get_db)):
    node = db.query(OrgNode).filter(OrgNode.id == node_id, OrgNode.is_deleted == False).first()
    if not node:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Node not found.")
    return node


@router.put("/nodes/{node_id}", response_model=OrgNodeRead)
def update_node(
    node_id: str,
    node_in: OrgNodeUpdate,
    db: Session = Depends(get_db),
    _user: TokenData = Depends(require_permission(Permission.ORG_WRITE))
):
    """Updates an organization unit's metadata, boundary status, or ownership."""
    node = db.query(OrgNode).filter(OrgNode.id == node_id, OrgNode.is_deleted == False).first()
    if not node:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Node not found.")

    if node_in.name is not None:
        node.name = node_in.name
    if node_in.code is not None:
        node.code = node_in.code
    if node_in.ownership_pct is not None:
        node.ownership_pct = node_in.ownership_pct
    if node_in.control_type is not None:
        node.control_type = node_in.control_type.value
    if node_in.boundary is not None:
        node.boundary = node_in.boundary
    if node_in.project_type is not None:
        node.project_type = node_in.project_type.value
    if node_in.location_state is not None:
        node.location_state = node_in.location_state
    if node_in.is_water_stressed is not None:
        node.is_water_stressed = node_in.is_water_stressed
    if node_in.is_pat_designated is not None:
        node.is_pat_designated = node_in.is_pat_designated
    if node_in.has_land_acquisition is not None:
        node.has_land_acquisition = node_in.has_land_acquisition
    if node_in.is_active is not None:
        node.is_active = node_in.is_active

    db.commit()
    db.refresh(node)
    evaluate_applicability_for_node(node, db)
    return node


# --- REPORTING PERIODS ---

@router.get("/periods", response_model=List[ReportingPeriodRead])
def list_periods(financial_year: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(ReportingPeriod).filter(ReportingPeriod.is_deleted == False)
    if financial_year:
        query = query.filter(ReportingPeriod.financial_year == financial_year)
    return query.order_by(ReportingPeriod.start_date.desc()).all()


@router.post("/periods", response_model=ReportingPeriodRead, status_code=status.HTTP_201_CREATED)
def create_period(
    period_in: ReportingPeriodCreate,
    db: Session = Depends(get_db),
    _user: TokenData = Depends(require_permission(Permission.PERIOD_LOCK))
):
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


@router.put("/periods/{period_id}", response_model=ReportingPeriodRead)
def update_period(
    period_id: str,
    period_in: ReportingPeriodUpdate,
    db: Session = Depends(get_db),
    _user: TokenData = Depends(require_permission(Permission.PERIOD_LOCK))
):
    """Updates a reporting period's lifecycle state (OPEN / LOCKED) or calendar dates."""
    period = db.query(ReportingPeriod).filter(ReportingPeriod.id == period_id, ReportingPeriod.is_deleted == False).first()
    if not period:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reporting period not found.")

    if period_in.status is not None:
        period.status = period_in.status.value
    if period_in.start_date is not None:
        period.start_date = period_in.start_date
    if period_in.end_date is not None:
        period.end_date = period_in.end_date

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
def override_applicability(
    node_id: str,
    override_req: ApplicabilityOverrideRequest,
    db: Session = Depends(get_db),
    _user: TokenData = Depends(require_permission(Permission.ORG_WRITE))
):
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
