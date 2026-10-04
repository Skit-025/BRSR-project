"""
app/modules/org/applicability/service.py
Service for evaluating, overriding, and querying metric applicability rules.
"""
from typing import List, Optional
from sqlalchemy.orm import Session
from app.modules.org.models import MetricApplicability, OrgNode
from app.modules.org.applicability.engine import evaluate_applicability_for_node, APPLICABILITY_RULES


class ApplicabilityService:
    def __init__(self, db: Session):
        self.db = db

    def evaluate_node(self, node_id: str, period_id: Optional[str] = None) -> List[MetricApplicability]:
        return evaluate_applicability_for_node(self.db, node_id, period_id)

    def get_node_applicability(self, node_id: str, period_id: Optional[str] = None) -> List[MetricApplicability]:
        query = self.db.query(MetricApplicability).filter(MetricApplicability.org_node_id == node_id)
        if period_id:
            query = query.filter(MetricApplicability.period_id == period_id)
        return query.all()

    def override_applicability(
        self,
        node_id: str,
        metric_code: str,
        is_applicable: bool,
        exception_reason: str,
        approved_by: str,
        period_id: Optional[str] = None,
    ) -> MetricApplicability:
        record = (
            self.db.query(MetricApplicability)
            .filter(
                MetricApplicability.org_node_id == node_id,
                MetricApplicability.metric_code == metric_code,
            )
            .first()
        )
        if not record:
            record = MetricApplicability(
                org_node_id=node_id,
                metric_code=metric_code,
                period_id=period_id,
                is_applicable=is_applicable,
                reason="Manual manager override",
                rule_id="RULE-OVERRIDE",
                is_exception=True,
                exception_reason=exception_reason,
                approved_by=approved_by,
            )
            self.db.add(record)
        else:
            record.is_applicable = is_applicable
            record.is_exception = True
            record.exception_reason = exception_reason
            record.approved_by = approved_by
            if period_id:
                record.period_id = period_id

        self.db.commit()
        self.db.refresh(record)
        return record
