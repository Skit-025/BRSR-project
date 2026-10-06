"""
app/modules/org/repository.py
Repository pattern data-access layer for organization nodes, periods, and applicability.
"""
from typing import List, Optional
from sqlalchemy.orm import Session
from app.modules.org.models import OrgNode, ReportingPeriod, MetricApplicability


class OrgRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_node_by_id(self, node_id: str) -> Optional[OrgNode]:
        return (
            self.db.query(OrgNode)
            .filter(OrgNode.id == node_id, OrgNode.is_deleted == False)
            .first()
        )

    def get_node_by_code(self, code: str) -> Optional[OrgNode]:
        return (
            self.db.query(OrgNode)
            .filter(OrgNode.code == code, OrgNode.is_deleted == False)
            .first()
        )

    def list_nodes(
        self,
        parent_id: Optional[str] = None,
        node_type: Optional[str] = None,
        boundary: Optional[bool] = None,
        active_only: bool = True,
    ) -> List[OrgNode]:
        query = self.db.query(OrgNode).filter(OrgNode.is_deleted == False)
        if active_only:
            query = query.filter(OrgNode.is_active == True)
        if parent_id is not None:
            query = query.filter(OrgNode.parent_id == parent_id)
        if node_type is not None:
            query = query.filter(OrgNode.type == node_type)
        if boundary is not None:
            query = query.filter(OrgNode.boundary == boundary)
        return query.order_by(OrgNode.path).all()

    def get_descendants(self, path_prefix: str) -> List[OrgNode]:
        """Fetch all children and sub-descendants using PostgreSQL materialized path prefix."""
        from sqlalchemy import cast, String
        return (
            self.db.query(OrgNode)
            .filter(
                cast(OrgNode.path, String).like(f"{path_prefix}%"),
                OrgNode.is_deleted == False,
                OrgNode.is_active == True,
            )
            .all()
        )

    def create_node(self, node: OrgNode) -> OrgNode:
        self.db.add(node)
        self.db.commit()
        self.db.refresh(node)
        return node

    def update_node(self, node: OrgNode) -> OrgNode:
        self.db.commit()
        self.db.refresh(node)
        return node

    def get_period_by_id(self, period_id: str) -> Optional[ReportingPeriod]:
        return (
            self.db.query(ReportingPeriod)
            .filter(ReportingPeriod.id == period_id, ReportingPeriod.is_deleted == False)
            .first()
        )

    def get_period_by_code(self, code: str) -> Optional[ReportingPeriod]:
        return (
            self.db.query(ReportingPeriod)
            .filter(ReportingPeriod.code == code, ReportingPeriod.is_deleted == False)
            .first()
        )

    def list_periods(self, financial_year: Optional[str] = None) -> List[ReportingPeriod]:
        query = self.db.query(ReportingPeriod).filter(ReportingPeriod.is_deleted == False)
        if financial_year:
            query = query.filter(ReportingPeriod.financial_year == financial_year)
        return query.order_by(ReportingPeriod.start_date.desc()).all()
