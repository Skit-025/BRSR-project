"""
app/modules/org/service.py
Business logic service for organization hierarchy, reporting boundary validation, and period control.
"""
from typing import List, Optional
from sqlalchemy.orm import Session
from app.modules.org.models import OrgNode, ReportingPeriod, PeriodStatus
from app.modules.org.schemas import OrgNodeCreate, OrgNodeUpdate
from app.modules.org.repository import OrgRepository
from app.modules.org.tree import build_materialized_path, build_tree_hierarchy
from app.modules.org.applicability.engine import evaluate_applicability_for_node


class OrgService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = OrgRepository(db)

    def get_tree(self) -> List[dict]:
        nodes = self.repo.list_nodes(active_only=False)
        return build_tree_hierarchy(nodes)

    def create_node(self, node_in: OrgNodeCreate) -> OrgNode:
        existing = self.repo.get_node_by_code(node_in.code)
        if existing:
            raise ValueError(f"Organization node with code '{node_in.code}' already exists.")

        node_type_val = node_in.type.value if hasattr(node_in.type, "value") else str(node_in.type)
        if node_in.parent_id:
            parent = self.repo.get_node_by_id(node_in.parent_id)
            if not parent:
                raise ValueError(f"Parent node with ID '{node_in.parent_id}' does not exist.")
            parent_type = parent.type
            allowed_parents = {
                "company": ["group"],
                "subsidiary": ["group"],
                "associate": ["group", "company"],
                "jv": ["group", "company"],
                "business_unit": ["company", "subsidiary", "group"],
                "project": ["business_unit", "company", "subsidiary", "group"],
                "site": ["business_unit", "project", "company", "subsidiary", "group"],
            }
            if node_type_val in allowed_parents and parent_type not in allowed_parents[node_type_val]:
                raise ValueError(
                    f"Invalid hierarchy: Node of type '{node_type_val}' cannot be a child of '{parent_type}'. "
                    f"Expected parent type to be one of: {', '.join(allowed_parents[node_type_val])}."
                )
        elif node_type_val != "group":
            existing_nodes = self.repo.list_nodes(active_only=True)
            if existing_nodes:
                root = next((n for n in existing_nodes if n.type == "group"), existing_nodes[0])
                node_in.parent_id = root.id

        path = build_materialized_path(self.db, node_in.parent_id, node_in.code)
        node = OrgNode(
            code=node_in.code,
            name=node_in.name,
            type=node_in.type.value if hasattr(node_in.type, "value") else str(node_in.type),
            parent_id=node_in.parent_id,
            path=path,
            ownership_pct=node_in.ownership_pct,
            control_type=node_in.control_type.value if hasattr(node_in.control_type, "value") else str(node_in.control_type),
            boundary=node_in.boundary,
            project_type=node_in.project_type.value if hasattr(node_in.project_type, "value") else str(node_in.project_type),
            location_state=node_in.location_state,
            location_country=node_in.location_country,
            is_listed=node_in.is_listed,
            is_water_stressed=node_in.is_water_stressed,
            is_pat_designated=node_in.is_pat_designated,
            has_land_acquisition=node_in.has_land_acquisition,
        )
        saved = self.repo.create_node(node)
        
        # Trigger automatic baseline applicability evaluation
        evaluate_applicability_for_node(self.db, saved.id)
        return saved

    def update_node(self, node_id: str, node_in: OrgNodeUpdate) -> OrgNode:
        node = self.repo.get_node_by_id(node_id)
        if not node:
            raise ValueError(f"Organization node with id '{node_id}' not found.")

        update_data = node_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            if value is not None:
                if hasattr(value, "value"):
                    value = value.value
                setattr(node, field, value)

        saved = self.repo.update_node(node)
        # Re-evaluate applicability if operational profile changed
        evaluate_applicability_for_node(self.db, saved.id)
        return saved

    def lock_period(self, period_id: str) -> ReportingPeriod:
        period = self.repo.get_period_by_id(period_id)
        if not period:
            raise ValueError(f"Reporting period with id '{period_id}' not found.")
        period.status = PeriodStatus.LOCKED.value
        self.db.commit()
        self.db.refresh(period)
        return period
