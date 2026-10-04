"""
app/modules/metrics/repository.py
Repository pattern for Metric catalogue queries and persistence.
"""
from typing import List, Optional
from sqlalchemy.orm import Session
from app.modules.metrics.models import Metric


class MetricRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, metric_id: str) -> Optional[Metric]:
        return (
            self.db.query(Metric)
            .filter(Metric.id == metric_id, Metric.is_deleted == False)
            .first()
        )

    def get_by_code(self, code: str) -> Optional[Metric]:
        return (
            self.db.query(Metric)
            .filter(Metric.code == code, Metric.is_deleted == False)
            .first()
        )

    def list_metrics(
        self,
        category: Optional[str] = None,
        principle: Optional[int] = None,
        brsr_core: Optional[bool] = None,
    ) -> List[Metric]:
        query = self.db.query(Metric).filter(Metric.is_deleted == False)
        if category:
            query = query.filter(Metric.category == category)
        if principle is not None:
            query = query.filter(Metric.principle == principle)
        if brsr_core is not None:
            query = query.filter(Metric.brsr_core == brsr_core)
        return query.order_by(Metric.principle, Metric.code).all()

    def create(self, metric: Metric) -> Metric:
        self.db.add(metric)
        self.db.commit()
        self.db.refresh(metric)
        return metric

    def update(self, metric: Metric) -> Metric:
        self.db.commit()
        self.db.refresh(metric)
        return metric
