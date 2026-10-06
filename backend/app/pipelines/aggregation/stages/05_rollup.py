"""
app/pipelines/aggregation/stages/05_rollup.py
Stage 5: Traverses hierarchy bottom-up and computes consolidated figures per node.
"""
from typing import Dict, List, Any
from sqlalchemy.orm import Session
from app.modules.org.models import OrgNode
from app.modules.metrics.models import Metric, AggregationType
from app.modules.collection.models import Submission, DataPoint
from app.modules.consolidation.models import ConsolidatedValue
from app.pipelines.aggregation.methods import aggregate_sum, aggregate_weighted_pct, aggregate_latest


def stage_05_rollup(
    db: Session,
    period_id: str,
    root_node_id: str,
    boundary_shares: Dict[str, float],
) -> List[ConsolidatedValue]:
    """
    Computes consolidated metrics for the root entity and persists into consolidated_values.
    """
    root_node = db.query(OrgNode).filter(OrgNode.id == root_node_id).first()
    if not root_node:
        raise ValueError(f"Root node '{root_node_id}' not found.")

    from sqlalchemy import cast, String
    # Fetch all descendant active nodes in boundary
    descendants = (
        db.query(OrgNode)
        .filter(cast(OrgNode.path, String).like(f"{root_node.path}%"), OrgNode.is_deleted == False)
        .all()
    )
    node_map = {n.id: n for n in descendants}

    # Fetch submissions for these nodes
    subs = (
        db.query(Submission)
        .filter(Submission.period_id == period_id, Submission.entity_id.in_(list(node_map.keys())))
        .all()
    )
    sub_ids = [s.id for s in subs]
    sub_node_map = {s.id: s.entity_id for s in subs}

    datapoints = (
        db.query(DataPoint)
        .filter(DataPoint.submission_id.in_(sub_ids), DataPoint.is_deleted == False)
        .all()
    )

    metrics = {m.code: m for m in db.query(Metric).all()}
    points_by_metric: Dict[str, List[DataPoint]] = {}
    for dp in datapoints:
        points_by_metric.setdefault(dp.metric_code, []).append(dp)

    consolidated_records: List[ConsolidatedValue] = []

    for code, pts in points_by_metric.items():
        m = metrics.get(code)
        if not m:
            continue

        contribs = []
        for dp in pts:
            entity_id = sub_node_map.get(dp.submission_id)
            share = boundary_shares.get(entity_id, 100.0)
            if share <= 0:
                continue

            node = node_map.get(entity_id)
            val = dp.normalized_value if dp.normalized_value is not None else dp.value_numeric
            contribs.append({
                "entity_id": entity_id,
                "entity_name": node.name if node else "Unknown",
                "value": val or 0.0,
                "share_pct": share,
            })

        # Apply aggregation type
        if m.aggregation_type == AggregationType.WEIGHTED_PCT.value:
            items = [{"percentage": c["value"], "weight": 1.0} for c in contribs]
            final_val = aggregate_weighted_pct(items)
        elif m.aggregation_type == AggregationType.LATEST.value:
            final_val = aggregate_latest(contribs) or 0.0
        else:
            final_val = aggregate_sum(contribs)

        # Upsert record
        rec = (
            db.query(ConsolidatedValue)
            .filter(
                ConsolidatedValue.entity_id == root_node_id,
                ConsolidatedValue.period_id == period_id,
                ConsolidatedValue.metric_code == code,
            )
            .first()
        )
        if not rec:
            rec = ConsolidatedValue(
                entity_id=root_node_id,
                period_id=period_id,
                metric_code=code,
                value=float(final_val),
                unit=m.base_unit,
                method=m.aggregation_type,
                share_pct=100.0,
                child_contributions=contribs,
            )
            db.add(rec)
        else:
            rec.value = float(final_val)
            rec.unit = m.base_unit
            rec.method = m.aggregation_type
            rec.child_contributions = contribs
            rec.version += 1

        consolidated_records.append(rec)

    db.commit()
    return consolidated_records
