"""
app/pipelines/aggregation/stages/04_apply_boundary.py
Stage 4: Applies operational/financial boundary inclusion rules and resolves effective share %.
"""
from typing import Dict, List
from sqlalchemy.orm import Session
from app.modules.org.models import OrgNode
from app.pipelines.aggregation.boundary.rules import resolve_consolidation_rule


def stage_04_apply_boundary(db: Session, entity_ids: List[str]) -> Dict[str, float]:
    """
    Returns mapping of entity_id -> effective boundary share %.
    Entities excluded from boundary receive 0.0%.
    """
    nodes = db.query(OrgNode).filter(OrgNode.id.in_(entity_ids)).all()
    shares = {}
    for n in nodes:
        included, share = resolve_consolidation_rule(n)
        shares[n.id] = share if included else 0.0
    return shares
