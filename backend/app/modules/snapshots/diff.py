"""
app/modules/snapshots/diff.py
Snapshot difference and variance analyzer.
Compares two reporting snapshots and produces audited delta reports.
"""
from typing import Dict, Any, List
from app.modules.snapshots.models import ReportSnapshot
from app.modules.snapshots.schemas import SnapshotDiffResponse, MetricDiffItem


def compute_snapshot_diff(
    base_snapshot: ReportSnapshot,
    target_snapshot: ReportSnapshot,
) -> SnapshotDiffResponse:
    """
    Computes metric-by-metric variance between base and target snapshots.
    """
    base_metrics = {
        m["metric_code"]: m
        for m in base_snapshot.data_payload.get("metrics", [])
    }
    target_metrics = {
        m["metric_code"]: m
        for m in target_snapshot.data_payload.get("metrics", [])
    }

    all_codes = sorted(set(base_metrics.keys()) | set(target_metrics.keys()))
    diff_items: List[MetricDiffItem] = []

    for code in all_codes:
        b_val = base_metrics.get(code, {}).get("value")
        t_val = target_metrics.get(code, {}).get("value")
        unit = target_metrics.get(code, {}).get("unit") or base_metrics.get(code, {}).get("unit", "")

        if b_val != t_val:
            abs_delta = None
            pct_change = None
            if b_val is not None and t_val is not None:
                abs_delta = round(t_val - b_val, 4)
                if b_val != 0:
                    pct_change = round(((t_val - b_val) / abs(b_val)) * 100.0, 2)

            diff_items.append(
                MetricDiffItem(
                    metric_code=code,
                    base_value=b_val,
                    target_value=t_val,
                    unit=unit,
                    absolute_delta=abs_delta,
                    percentage_change=pct_change,
                )
            )

    return SnapshotDiffResponse(
        base_snapshot_id=base_snapshot.id,
        target_snapshot_id=target_snapshot.id,
        metrics_changed_count=len(diff_items),
        diffs=diff_items,
    )
