from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.modules.metrics.models import Metric
from app.modules.metrics.schemas import MetricCreate, MetricRead, DynamicFormResponse
from app.modules.metrics.form_builder import build_dynamic_form
from app.modules.metrics.seed_data import seed_metrics

router = APIRouter(tags=["Metric Catalogue & Form Engine"])

@router.get("/metrics", response_model=List[MetricRead])
def list_metrics(
    category: Optional[str] = None,
    principle: Optional[int] = None,
    brsr_core: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """Lists all BRSR indicators defined in the single-source-of-truth catalogue (F05)."""
    # Seed metrics if empty
    if db.query(Metric).count() == 0:
        seed_metrics(db)

    query = db.query(Metric).filter(Metric.is_deleted == False)
    if category:
        query = query.filter(Metric.category == category)
    if principle is not None:
        query = query.filter(Metric.principle == principle)
    if brsr_core is not None:
        query = query.filter(Metric.brsr_core == brsr_core)
    return query.order_by(Metric.principle, Metric.code).all()

@router.get("/metrics/{code}", response_model=MetricRead)
def get_metric(code: str, db: Session = Depends(get_db)):
    """Retrieves definition, units, and aggregation rules for a specific metric."""
    metric = db.query(Metric).filter(Metric.code == code, Metric.is_deleted == False).first()
    if not metric:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Metric '{code}' not found.")
    return metric

@router.post("/metrics", response_model=MetricRead, status_code=status.HTTP_201_CREATED)
def create_metric(metric_in: MetricCreate, db: Session = Depends(get_db)):
    """Creates or updates a KPI definition in the Metric Catalogue."""
    existing = db.query(Metric).filter(Metric.code == metric_in.code).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Metric '{metric_in.code}' already exists.")

    metric = Metric(
        code=metric_in.code,
        name=metric_in.name,
        definition=metric_in.definition,
        category=metric_in.category.value,
        section=metric_in.section,
        principle=metric_in.principle,
        indicator_type=metric_in.indicator_type.value,
        brsr_core=metric_in.brsr_core,
        core_attribute=metric_in.core_attribute,
        data_type=metric_in.data_type,
        base_unit=metric_in.base_unit,
        allowed_units=metric_in.allowed_units or [metric_in.base_unit],
        aggregation_type=metric_in.aggregation_type.value,
        numerator_metric_id=metric_in.numerator_metric_id,
        denominator_metric_id=metric_in.denominator_metric_id,
        evidence_rule=metric_in.evidence_rule.value,
        frequency=metric_in.frequency,
        owner_role=metric_in.owner_role,
        calc_formula_code=metric_in.calc_formula_code
    )
    db.add(metric)
    db.commit()
    db.refresh(metric)
    return metric

@router.get("/forms/{entity_id}/{period_id}", response_model=DynamicFormResponse)
def get_dynamic_monthly_form(entity_id: str, period_id: str, db: Session = Depends(get_db)):
    """
    F06 Form Engine: Returns dynamically generated monthly data entry form for a specific entity.
    Joins catalogue metadata with derived applicability rules and project-type profiles.
    """
    if db.query(Metric).count() == 0:
        seed_metrics(db)

    try:
        form = build_dynamic_form(db, entity_id, period_id)
        return form
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
