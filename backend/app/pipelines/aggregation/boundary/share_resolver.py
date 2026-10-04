"""
app/pipelines/aggregation/boundary/share_resolver.py
Resolves effective share percentage down multi-tier subsidiary/JV chains.
"""
from typing import Dict, List
from app.modules.org.models import OrgNode
from app.pipelines.aggregation.boundary.rules import resolve_consolidation_rule


def compute_effective_shares(nodes: List[OrgNode]) -> Dict[str, float]:
    """
    Computes effective consolidation share for each node in hierarchy.
    """
    shares = {}
    for node in nodes:
        included, share = resolve_consolidation_rule(node)
        shares[node.id] = share if included else 0.0
    return shares
