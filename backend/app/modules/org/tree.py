from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.modules.org.models import OrgNode
from app.modules.org.schemas import OrgNodeTreeRead

def build_materialized_path(db: Session, parent_id: Optional[str], code: str) -> str:
    """Computes dot-separated hierarchy path for high-performance sub-tree querying."""
    sanitized_code = code.replace(".", "_").replace(" ", "_").upper()
    if not parent_id:
        return sanitized_code
    parent = db.query(OrgNode).filter(OrgNode.id == parent_id).first()
    if not parent:
        return sanitized_code
    return f"{parent.path}.{sanitized_code}"

def get_descendants(db: Session, node_id: str) -> List[OrgNode]:
    """Returns all descendant nodes (children, sub-projects) under the specified node."""
    target = db.query(OrgNode).filter(OrgNode.id == node_id).first()
    if not target:
        return []
    # Using materialized path prefix matching
    prefix = f"{target.path}."
    from sqlalchemy import cast, String
    return db.query(OrgNode).filter(
        (cast(OrgNode.path, String).startswith(prefix)) | (OrgNode.id == target.id),
        OrgNode.is_deleted == False
    ).all()

def build_tree_hierarchy(nodes: List[OrgNode]) -> List[Dict[str, Any]]:
    """Transforms a flat list of OrgNodes into a deeply nested tree structure."""
    node_map: Dict[str, Dict[str, Any]] = {}
    roots: List[Dict[str, Any]] = []

    # Initialize all nodes in map
    for n in nodes:
        node_dict = {
            "id": n.id,
            "code": n.code,
            "name": n.name,
            "type": n.type,
            "parent_id": n.parent_id,
            "path": n.path,
            "ownership_pct": n.ownership_pct,
            "control_type": n.control_type,
            "boundary": n.boundary,
            "project_type": n.project_type,
            "location_state": n.location_state,
            "location_country": n.location_country,
            "is_listed": n.is_listed,
            "is_water_stressed": n.is_water_stressed,
            "is_pat_designated": n.is_pat_designated,
            "has_land_acquisition": n.has_land_acquisition,
            "is_active": n.is_active,
            "children": []
        }
        node_map[n.id] = node_dict

    # Build parent-child relationships
    for n in nodes:
        node_dict = node_map[n.id]
        if n.parent_id and n.parent_id in node_map:
            node_map[n.parent_id]["children"].append(node_dict)
        else:
            roots.append(node_dict)

    return roots
