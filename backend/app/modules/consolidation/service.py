import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.modules.org.models import OrgNode, ControlType
from app.modules.metrics.models import Metric, AggregationType
from app.modules.collection.models import Submission, DataPoint, SubmissionStatus
from app.modules.consolidation.models import ConsolidatedValue
from app.modules.consolidation.schemas import ConsolidationRunResponse

logger = logging.getLogger(__name__)

def run_consolidation_engine(
    db: Session,
    period_id: str,
    root_node_id: Optional[str] = None
) -> ConsolidationRunResponse:
    """
    F22-F23 Deterministic Boundary & Consolidation Engine:
    Rolls up data points hierarchically: Project -> Business Unit -> Subsidiary -> Group.
    Guarantees:
      - Ratios are recomputed from sums of numerators and denominators (never averaged).
      - Effective boundary % is applied per node (100% operational control vs 51% JV equity share).
      - Every rolled-up value carries its full child contribution lineage.
    """
    # 1. Fetch metrics catalogue (indexed by both code and UUID for deterministic foreign key resolution)
    all_metrics = db.query(Metric).filter(Metric.is_deleted == False).all()
    metrics = {m.code: m for m in all_metrics}
    metrics_by_id = {str(m.id): m for m in all_metrics}

    # 2. Get all organization nodes in hierarchy order (deepest nodes first for bottom-up roll-up)
    all_nodes = db.query(OrgNode).filter(OrgNode.is_deleted == False).all()
    # Sort by path length descending (bottom-up: projects -> BUs -> subsidiaries -> group)
    sorted_nodes = sorted(all_nodes, key=lambda n: n.path.count("."), reverse=True)

    # Cache for values at each node: node_id -> {metric_code: (value, unit)}
    node_values: Dict[str, Dict[str, tuple[float, str]]] = {}

    # Initialize leaf project values from approved or active submissions
    submissions = db.query(Submission).filter(
        Submission.period_id == period_id,
        Submission.status.in_([
            SubmissionStatus.SUBMITTED.value,
            SubmissionStatus.PROJECT_APPROVED.value,
            SubmissionStatus.UNDER_BU_REVIEW.value,
            SubmissionStatus.BU_APPROVED.value,
            SubmissionStatus.UNDER_SUBSIDIARY_REVIEW.value,
            SubmissionStatus.SUBSIDIARY_APPROVED.value,
            SubmissionStatus.UNDER_GROUP_REVIEW.value,
            SubmissionStatus.CONSOLIDATED.value,
            SubmissionStatus.LOCKED.value
        ])
    ).all()

    direct_entries: Dict[str, Dict[str, Tuple[float, str]]] = {}
    for s in submissions:
        direct_entries[s.entity_id] = {}
        if s.entity_id not in node_values:
            node_values[s.entity_id] = {}
        data_points = db.query(DataPoint).filter(DataPoint.submission_id == s.id).all()
        for dp in data_points:
            val = dp.normalized_value if dp.normalized_value is not None else dp.value_numeric
            if val is not None:
                metric = metrics.get(dp.metric_code)
                base_unit = metric.base_unit if metric else dp.unit
                direct_entries[s.entity_id][dp.metric_code] = (float(val), base_unit)
                node_values[s.entity_id][dp.metric_code] = (float(val), base_unit)

    # 3. Bottom-up roll-up across parent nodes
    # Group parent nodes by checking which nodes have children
    parent_nodes = [n for n in sorted_nodes if db.query(OrgNode).filter(OrgNode.parent_id == n.id).count() > 0]
    parent_node_ids = {n.id for n in parent_nodes}

    # Pre-populate from existing ConsolidatedValue (supports multi-tier pre-computed rollups and leaf test fixtures)
    # Crucial: Do NOT pre-populate parent nodes whose consolidated values are currently being recalculated!
    existing_cvs = db.query(ConsolidatedValue).filter(
        ConsolidatedValue.period_id == period_id,
        ConsolidatedValue.is_deleted == False
    ).all()
    for cv in existing_cvs:
        if cv.entity_id not in parent_node_ids:
            if cv.entity_id not in node_values:
                node_values[cv.entity_id] = {}
            if cv.metric_code not in node_values[cv.entity_id]:
                node_values[cv.entity_id][cv.metric_code] = (cv.value, cv.unit)

    consolidated_nodes_count = 0
    consolidated_metrics_count = 0

    for parent in parent_nodes:
        children = db.query(OrgNode).filter(
            OrgNode.parent_id == parent.id,
            OrgNode.is_deleted == False
        ).all()
        if not children:
            continue

        if parent.id not in node_values:
            node_values[parent.id] = {}

        # Process in two passes:
        # Pass 1: Additive and raw metrics (SUM, COUNT, AVERAGE, MIN, MAX, WEIGHTED_AVG)
        # Pass 2: Ratio & Derived metrics (so parent-level numerators and denominators are already available)
        base_metrics = [m for m in all_metrics if m.aggregation_type not in (AggregationType.RATIO.value, "ratio", AggregationType.DERIVED.value, "derived")]
        ratio_metrics = [m for m in all_metrics if m.aggregation_type in (AggregationType.RATIO.value, "ratio", AggregationType.DERIVED.value, "derived")]

        for metric in (base_metrics + ratio_metrics):
            metric_code = metric.code
            child_records: List[Dict[str, Any]] = []
            sum_weighted_val = 0.0
            sum_unweighted_val = 0.0
            total_active_children = 0

            # Direct entry at parent level (e.g. BU overhead, business travel, central power)
            if parent.id in direct_entries and metric_code in direct_entries[parent.id]:
                parent_val, parent_unit = direct_entries[parent.id][metric_code]
                if parent_val is not None:
                    sum_weighted_val += float(parent_val)
                    sum_unweighted_val += float(parent_val)
                    child_records.append({
                        "child_id": parent.id,
                        "child_code": parent.code,
                        "child_name": f"{parent.name} (Direct BU/Node Entry)",
                        "raw_value": float(parent_val),
                        "unit": parent_unit,
                        "share_pct": 100.0,
                        "weighted_value": float(parent_val)
                    })

            for child in children:
                if child.id in node_values and metric_code in node_values[child.id]:
                    child_val, child_unit = node_values[child.id][metric_code]
                    
                    # Boundary calculation (DEF-CALC-005):
                    # Operational control takes 100%. Equity share applies to physical flow environmental metrics.
                    # Social/human metrics (fatalities, injuries, headcount) and governance/compliance metrics
                    # are NEVER scaled to fractional humans or fractional violations.
                    is_equity_scalable = (
                        getattr(metric, "category", "") == "environment"
                        and metric.aggregation_type in (AggregationType.SUM.value, "sum", AggregationType.WEIGHTED_AVERAGE.value, "weighted_average")
                        and not (
                            metric_code.startswith("SOC-") or
                            metric_code.startswith("GOV-") or
                            "FATALITY" in metric_code or
                            "INJURY" in metric_code or
                            "LTIFR" in metric_code or
                            "COMPLIANCE" in metric_code
                        )
                    )

                    if child.control_type == ControlType.EQUITY_SHARE.value and is_equity_scalable:
                        effective_share = float(child.ownership_pct) if child.ownership_pct is not None else 100.0
                    else:
                        effective_share = 100.0

                    if child_val is not None:
                        weighted_val = float(child_val) * (effective_share / 100.0)
                        sum_weighted_val += weighted_val
                        sum_unweighted_val += float(child_val)
                        total_active_children += 1

                        child_records.append({
                            "child_id": child.id,
                            "child_code": child.code,
                            "child_name": child.name,
                            "raw_value": float(child_val),
                            "unit": child_unit,
                            "share_pct": effective_share,
                            "weighted_value": weighted_val
                        })
                    else:
                        child_records.append({
                            "child_id": child.id,
                            "child_code": child.code,
                            "child_name": child.name,
                            "raw_value": None,
                            "unit": child_unit,
                            "share_pct": effective_share,
                            "weighted_value": None
                        })

            roll_method = metric.aggregation_type
            final_val = 0.0
            calc_status = "CALCULATED"
            status_reason = None

            # For Ratio metrics: recompute as Sum(Numerators) / Sum(Denominators) (DEF-CALC-001)
            if roll_method in (AggregationType.RATIO.value, "ratio", AggregationType.DERIVED.value, "derived"):
                num_id = metric.numerator_metric_id
                denom_id = metric.denominator_metric_id

                num_metric = (metrics_by_id.get(str(num_id)) or metrics.get(str(num_id))) if num_id else None
                denom_metric = (metrics_by_id.get(str(denom_id)) or metrics.get(str(denom_id))) if denom_id else None

                num_val = None
                denom_val = None

                if num_metric and num_metric.code in node_values.get(parent.id, {}):
                    num_val = node_values[parent.id][num_metric.code][0]
                if denom_metric and denom_metric.code in node_values.get(parent.id, {}):
                    denom_val = node_values[parent.id][denom_metric.code][0]

                if num_val is not None and denom_val is not None:
                    if denom_val > 0:
                        final_val = num_val / denom_val
                        calc_status = "CALCULATED" if num_val > 0 else "VALID_ZERO"
                    elif denom_val == 0:
                        final_val = None
                        calc_status = "UNDEFINED_ZERO_DENOMINATOR"
                        status_reason = "Division by zero: denominator is 0.0"
                    else:
                        final_val = None
                        calc_status = "INVALID_NEGATIVE_DENOMINATOR"
                        status_reason = f"Negative denominator ({denom_val}) is invalid for statutory ratio"
                else:
                    # Deterministically sum numerators and denominators from child records
                    c_num_sum = 0.0
                    c_den_sum = 0.0
                    has_num = False
                    has_den = False
                    for child in children:
                        if child.id in node_values:
                            c_share = (float(child.ownership_pct) if child.ownership_pct is not None else 100.0) if child.control_type == ControlType.EQUITY_SHARE.value else 100.0
                            if num_metric and num_metric.code in node_values[child.id]:
                                num_tuple = node_values[child.id][num_metric.code]
                                if num_tuple[0] is not None:
                                    c_num_sum += num_tuple[0] * (c_share / 100.0)
                                    has_num = True
                            if denom_metric and denom_metric.code in node_values[child.id]:
                                den_tuple = node_values[child.id][denom_metric.code]
                                if den_tuple[0] is not None:
                                    c_den_sum += den_tuple[0] * (c_share / 100.0)
                                    has_den = True

                    if not has_num and not has_den:
                        final_val = None
                        calc_status = "INSUFFICIENT_DATA"
                        status_reason = "Neither numerator nor denominator reported by any contributing entity"
                    elif not has_den:
                        final_val = None
                        calc_status = "MISSING_DENOMINATOR"
                        status_reason = f"Denominator metric '{denom_metric.code if denom_metric else 'UNKNOWN'}' not reported by any contributing entity"
                    elif c_den_sum == 0.0:
                        final_val = None
                        calc_status = "UNDEFINED_ZERO_DENOMINATOR"
                        status_reason = "Division by zero: contributing denominator sum is 0.0"
                    elif c_den_sum < 0.0:
                        final_val = None
                        calc_status = "INVALID_NEGATIVE_DENOMINATOR"
                        status_reason = f"Negative denominator sum ({c_den_sum}) is invalid for statutory ratio"
                    elif c_num_sum == 0.0:
                        final_val = 0.0
                        calc_status = "VALID_ZERO"
                        status_reason = None
                    else:
                        final_val = c_num_sum / c_den_sum
                        calc_status = "CALCULATED"
                        status_reason = None

                    if calc_status != "CALCULATED" and calc_status != "VALID_ZERO":
                        logger.warning(
                            f"Ratio metric '{metric_code}' consolidated for entity '{parent.id}' as {calc_status}: {status_reason}"
                        )

            elif not child_records:
                continue
            elif roll_method in (AggregationType.SUM.value, "sum"):
                final_val = sum_weighted_val
            elif roll_method in (AggregationType.COUNT.value, "count"):
                final_val = float(total_active_children)
            elif roll_method in (AggregationType.AVERAGE.value, "average"):
                final_val = sum_unweighted_val / total_active_children if total_active_children > 0 else 0.0
            elif roll_method in (AggregationType.MIN.value, "min"):
                raw_vals = [r["raw_value"] for r in child_records if r.get("raw_value") is not None]
                final_val = min(raw_vals) if raw_vals else 0.0
            elif roll_method in (AggregationType.MAX.value, "max"):
                raw_vals = [r["raw_value"] for r in child_records if r.get("raw_value") is not None]
                final_val = max(raw_vals) if raw_vals else 0.0
            elif roll_method in (AggregationType.WEIGHTED_AVERAGE.value, "weighted_average", AggregationType.WEIGHTED_PCT.value, "weighted_pct"):
                total_shares = sum([r.get("share_pct", 100.0) for r in child_records])
                if total_shares > 0:
                    final_val = sum([r.get("raw_value", 0.0) * (r.get("share_pct", 100.0) / 100.0) for r in child_records]) / (total_shares / 100.0)
                else:
                    final_val = sum_weighted_val / (total_active_children if total_active_children > 0 else 1.0)
            elif roll_method in (AggregationType.NOT_AGGREGATABLE.value, AggregationType.NON_AGGREGABLE.value, "not_aggregatable", "non_aggregable"):
                direct = [r["raw_value"] for r in child_records if r.get("child_id") == parent.id]
                final_val = direct[0] if direct else 0.0
            else:
                final_val = sum_weighted_val
                final_val = sum_weighted_val

            # Store in node cache for upper levels (BU -> Subsidiary -> Group)
            node_values[parent.id][metric_code] = (final_val, metric.base_unit)

            # Upsert into consolidated_values table
            existing = db.query(ConsolidatedValue).filter(
                ConsolidatedValue.entity_id == parent.id,
                ConsolidatedValue.period_id == period_id,
                ConsolidatedValue.metric_code == metric_code
            ).first()

            parent_share = float(parent.ownership_pct) if parent.ownership_pct is not None else 100.0

            if existing:
                existing.value = final_val
                existing.unit = metric.base_unit
                existing.method = roll_method
                existing.share_pct = parent_share
                existing.child_contributions = child_records
                existing.status = calc_status
                existing.status_reason = status_reason
                existing.version += 1
            else:
                cons_rec = ConsolidatedValue(
                    entity_id=parent.id,
                    period_id=period_id,
                    metric_code=metric_code,
                    value=final_val,
                    unit=metric.base_unit,
                    method=roll_method,
                    share_pct=parent_share,
                    child_contributions=child_records,
                    status=calc_status,
                    status_reason=status_reason,
                )
                db.add(cons_rec)

            consolidated_metrics_count += 1

        consolidated_nodes_count += 1

    db.commit()

    return ConsolidationRunResponse(
        period_id=period_id,
        consolidated_nodes_count=consolidated_nodes_count,
        consolidated_metrics_count=consolidated_metrics_count,
        message="Hierarchical boundary consolidation executed successfully."
    )


def get_reporting_coverage(
    db: Session,
    entity_id: str,
    period_id: str
) -> Dict[str, Any]:
    """
    Computes progressive reporting coverage for any entity (BU, Subsidiary, Group)
    over its direct children and reporting tree.
    Guarantees:
    - Never fabricates missing entities or missing values.
    - Accurately tracks submitted, approved, pending, rejected, and missing children.
    - Calculates reporting coverage percentage: (approved_count / total_children * 100.0).
    - Preserves traceability to contributing vs missing source records.
    - Enables progressive consolidation and higher-layer reporting without waiting for 100%.
    """
    parent = db.query(OrgNode).filter(OrgNode.id == entity_id, OrgNode.is_deleted == False).first()
    if not parent:
        parent = db.query(OrgNode).filter(OrgNode.code == entity_id, OrgNode.is_deleted == False).first()
    if not parent:
        raise ValueError(f"Organization entity '{entity_id}' not found.")

    children = db.query(OrgNode).filter(
        OrgNode.parent_id == parent.id,
        OrgNode.is_deleted == False
    ).order_by(OrgNode.name).all()

    total_children = len(children)
    child_ids = [c.id for c in children]

    submissions = db.query(Submission).filter(
        Submission.entity_id.in_(child_ids) if child_ids else False,
        Submission.period_id == period_id,
        Submission.is_deleted == False
    ).all() if child_ids else []

    sub_by_child = {str(s.entity_id): s for s in submissions}

    contributing_entities = []
    missing_entities = []

    submitted_count = 0
    approved_count = 0
    pending_count = 0
    rejected_count = 0
    not_submitted_count = 0

    APPROVED_STATUSES = {
        SubmissionStatus.PROJECT_APPROVED.value,
        SubmissionStatus.UNDER_BU_REVIEW.value,
        SubmissionStatus.BU_APPROVED.value,
        SubmissionStatus.UNDER_SUBSIDIARY_REVIEW.value,
        SubmissionStatus.SUBSIDIARY_APPROVED.value,
        SubmissionStatus.UNDER_GROUP_REVIEW.value,
        SubmissionStatus.CONSOLIDATED.value,
        SubmissionStatus.LOCKED.value,
        "APPROVED"
    }

    PENDING_STATUSES = {
        SubmissionStatus.SUBMITTED.value,
        SubmissionStatus.DRAFT.value,
        "PENDING",
        "BU_REVIEW"
    }

    REJECTED_STATUSES = {
        SubmissionStatus.RETURNED.value,
        "REJECTED",
        "CHANGES_REQUESTED"
    }

    for child in children:
        cid_str = str(child.id)
        sub = sub_by_child.get(cid_str)

        if sub:
            submitted_count += 1
            status_val = sub.status
            dp_count = len(sub.data_points) if hasattr(sub, "data_points") else 0
            is_approved = status_val in APPROVED_STATUSES
            is_pending = status_val in PENDING_STATUSES
            is_rejected = status_val in REJECTED_STATUSES

            item = {
                "id": str(child.id),
                "code": child.code,
                "name": child.name,
                "type": child.type,
                "status": status_val,
                "version": sub.version,
                "submitted_at": sub.submitted_at.isoformat() if sub.submitted_at else None,
                "data_points_count": dp_count,
                "is_included_in_consolidation": is_approved,
                "exclusion_reason": None if is_approved else ("Pending Verification" if is_pending else "Returned for Correction")
            }

            if is_approved:
                approved_count += 1
                contributing_entities.append(item)
            elif is_pending:
                pending_count += 1
                missing_entities.append(item)
            elif is_rejected:
                rejected_count += 1
                missing_entities.append(item)
            else:
                missing_entities.append(item)
        else:
            not_submitted_count += 1
            missing_entities.append({
                "id": str(child.id),
                "code": child.code,
                "name": child.name,
                "type": child.type,
                "status": "NOT_SUBMITTED",
                "version": 0,
                "submitted_at": None,
                "data_points_count": 0,
                "is_included_in_consolidation": False,
                "exclusion_reason": "Not Submitted"
            })

    coverage_pct = round((approved_count / total_children * 100.0), 2) if total_children > 0 else 100.0
    is_complete = (total_children > 0 and approved_count == total_children)

    return {
        "entity_id": str(parent.id),
        "entity_code": parent.code,
        "entity_name": parent.name,
        "entity_type": parent.type,
        "period_id": period_id,
        "total_children_count": total_children,
        "submitted_children_count": submitted_count,
        "approved_children_count": approved_count,
        "pending_children_count": pending_count,
        "rejected_children_count": rejected_count,
        "not_submitted_children_count": not_submitted_count,
        "included_children_count": len(contributing_entities),
        "excluded_children_count": len(missing_entities),
        "coverage_pct": coverage_pct,
        "is_complete": is_complete,
        "is_partially_reported": not is_complete,
        "can_proceed_with_progressive_reporting": approved_count > 0 or total_children == 0,
        "contributing_entities": contributing_entities,
        "missing_entities": missing_entities,
        "progressive_reporting_notice": (
            f"Progressive reporting active: {approved_count} of {total_children} entities approved ({coverage_pct}% coverage). "
            f"Missing entities remain identifiable and are excluded from roll-up without fabrication."
            if not is_complete else
            f"100% complete: All {total_children} entities approved."
        )
    }


def get_stale_consolidations(db: Session, period_id: str) -> List[Dict[str, Any]]:
    """
    Identifies consolidated values whose underlying submissions have been modified,
    returned, or re-submitted after the consolidated value was generated (Section 7).
    """
    stale_records = []
    cons_records = (
        db.query(ConsolidatedValue)
        .filter(ConsolidatedValue.period_id == period_id, ConsolidatedValue.is_deleted == False)
        .all()
    )

    # Map of entity_id -> submission
    subs = (
        db.query(Submission)
        .filter(Submission.period_id == period_id, Submission.is_deleted == False)
        .all()
    )
    sub_map = {str(s.entity_id): s for s in subs}

    for cv in cons_records:
        is_stale = False
        reasons = []

        # Check if parent entity's own submission changed
        parent_sub = sub_map.get(str(cv.entity_id))
        if parent_sub and parent_sub.updated_at and cv.updated_at:
            if parent_sub.updated_at > cv.updated_at:
                is_stale = True
                reasons.append(f"Parent submission updated at {parent_sub.updated_at.isoformat()}")
            if parent_sub.status == SubmissionStatus.RETURNED.value:
                is_stale = True
                reasons.append("Parent submission has been RETURNED for correction")

        # Check contributing children recorded in child_contributions
        for contrib in (cv.child_contributions or []):
            cid = contrib.get("child_id")
            if cid and cid in sub_map:
                c_sub = sub_map[cid]
                if c_sub.updated_at and cv.updated_at and c_sub.updated_at > cv.updated_at:
                    is_stale = True
                    reasons.append(f"Contributing child '{contrib.get('child_code')}' updated at {c_sub.updated_at.isoformat()}")
                if c_sub.status == SubmissionStatus.RETURNED.value:
                    is_stale = True
                    reasons.append(f"Contributing child '{contrib.get('child_code')}' was returned")

        if is_stale:
            stale_records.append({
                "consolidated_value_id": str(cv.id),
                "entity_id": str(cv.entity_id),
                "metric_code": cv.metric_code,
                "current_value": cv.value,
                "unit": cv.unit,
                "version": cv.version,
                "consolidated_at": cv.updated_at.isoformat() if cv.updated_at else None,
                "reasons": reasons,
            })

    return stale_records

