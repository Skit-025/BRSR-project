"""
app/modules/consolidation/repository.py
Repository pattern for ConsolidatedValue persistence and querying.
"""
from typing import List, Optional
from sqlalchemy.orm import Session
from app.modules.consolidation.models import ConsolidatedValue


class ConsolidationRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_consolidated_value(
        self,
        entity_id: str,
        period_id: str,
        metric_code: str,
    ) -> Optional[ConsolidatedValue]:
        return (
            self.db.query(ConsolidatedValue)
            .filter(
                ConsolidatedValue.entity_id == entity_id,
                ConsolidatedValue.period_id == period_id,
                ConsolidatedValue.metric_code == metric_code,
                ConsolidatedValue.is_deleted == False,
            )
            .first()
        )

    def list_consolidated_values(
        self,
        entity_id: Optional[str] = None,
        period_id: Optional[str] = None,
    ) -> List[ConsolidatedValue]:
        query = self.db.query(ConsolidatedValue).filter(ConsolidatedValue.is_deleted == False)
        if entity_id:
            query = query.filter(ConsolidatedValue.entity_id == entity_id)
        if period_id:
            query = query.filter(ConsolidatedValue.period_id == period_id)
        return query.all()

    def upsert_consolidated_value(self, val: ConsolidatedValue) -> ConsolidatedValue:
        existing = self.get_consolidated_value(val.entity_id, val.period_id, val.metric_code)
        if existing:
            existing.value = val.value
            existing.unit = val.unit
            existing.method = val.method
            existing.share_pct = val.share_pct
            existing.child_contributions = val.child_contributions
            existing.version += 1
            self.db.commit()
            self.db.refresh(existing)
            return existing
        else:
            self.db.add(val)
            self.db.commit()
            self.db.refresh(val)
            return val
