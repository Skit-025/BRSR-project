"""
app/modules/metrics/service.py
Service layer for managing the single-source-of-truth Metric Catalogue and building dynamic input forms.
"""
from typing import List, Optional
from sqlalchemy.orm import Session
from app.modules.metrics.models import Metric
from app.modules.metrics.schemas import MetricCreate, DynamicFormResponse
from app.modules.metrics.repository import MetricRepository
from app.modules.metrics.form_builder import build_dynamic_form
from app.modules.metrics.seed_data import seed_metrics


class MetricService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = MetricRepository(db)

    def list_metrics(
        self,
        category: Optional[str] = None,
        principle: Optional[int] = None,
        brsr_core: Optional[bool] = None,
    ) -> List[Metric]:
        # Ensure seed data exists
        if len(self.repo.list_metrics()) == 0:
            seed_metrics(self.db)
        return self.repo.list_metrics(category=category, principle=principle, brsr_core=brsr_core)

    def get_by_code(self, code: str) -> Optional[Metric]:
        return self.repo.get_by_code(code)

    def create_metric(self, metric_in: MetricCreate) -> Metric:
        existing = self.repo.get_by_code(metric_in.code)
        if existing:
            raise ValueError(f"Metric with code '{metric_in.code}' already exists.")

        metric = Metric(
            code=metric_in.code,
            name=metric_in.name,
            definition=metric_in.definition,
            category=metric_in.category.value if hasattr(metric_in.category, "value") else str(metric_in.category),
            section=metric_in.section,
            principle=metric_in.principle,
            indicator_type=metric_in.indicator_type.value if hasattr(metric_in.indicator_type, "value") else str(metric_in.indicator_type),
            brsr_core=metric_in.brsr_core,
            core_attribute=metric_in.core_attribute,
            data_type=metric_in.data_type,
            base_unit=metric_in.base_unit,
            allowed_units=metric_in.allowed_units or [metric_in.base_unit],
            aggregation_type=metric_in.aggregation_type.value if hasattr(metric_in.aggregation_type, "value") else str(metric_in.aggregation_type),
            evidence_rule=metric_in.evidence_rule.value if hasattr(metric_in.evidence_rule, "value") else str(metric_in.evidence_rule),
            frequency=metric_in.frequency,
            owner_role=metric_in.owner_role,
        )
        return self.repo.create(metric)

    def get_form_for_node(self, node_id: str, period_id: Optional[str] = None) -> DynamicFormResponse:
        return build_dynamic_form(self.db, node_id, period_id)
