"""
app/modules/validation/rules/boundary.py
Validation rule: Operational/Financial boundary inclusion verification.
"""
from typing import Optional, Tuple
from sqlalchemy.orm import Session
from app.modules.org.models import OrgNode


def validate_node_boundary(db: Session, entity_id: str) -> Tuple[bool, Optional[str]]:
    """
    Validates whether the reporting node is active and part of the reporting boundary.
    """
    node = db.query(OrgNode).filter(OrgNode.id == entity_id).first()
    if not node:
        return False, f"Entity '{entity_id}' not found."

    if not node.is_active:
        return False, f"Entity '{node.name}' is inactive."

    if not node.boundary:
        return True, f"Notice: Entity '{node.name}' is marked outside consolidation boundary."

    return True, None
