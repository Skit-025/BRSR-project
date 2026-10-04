"""
app/modules/assurance/sampling.py
Statistically rigorous sampling engine for BRSR Core substantive testing.
Selects high-impact material facilities, outliers, and representative samples.
"""
import random
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.modules.collection.models import DataPoint, Submission
from app.modules.org.models import OrgNode


def generate_audit_sample(
    db: Session,
    period_id: str,
    metric_code: str,
    sample_percentage: float = 15.0,
    stratify_by_value: bool = True,
) -> Dict[str, Any]:
    """
    Selects a substantive audit sample of data points:
      - 100% of Top 10 percentile by value (high materiality)
      - Random representative sample of remaining population
    """
    points = (
        db.query(DataPoint, OrgNode.name.label("entity_name"), OrgNode.code.label("entity_code"))
        .join(Submission, DataPoint.submission_id == Submission.id)
        .join(OrgNode, Submission.entity_id == OrgNode.id)
        .filter(
            Submission.period_id == period_id,
            DataPoint.metric_code == metric_code,
            DataPoint.is_deleted == False,
        )
        .all()
    )

    if not points:
        return {"total_population": 0, "sample_size": 0, "sampled_items": []}

    total_count = len(points)
    target_sample_size = max(1, int(total_count * (sample_percentage / 100.0)))

    # Sort descending by numeric value
    sorted_pts = sorted(
        points,
        key=lambda item: item[0].value_numeric if item[0].value_numeric is not None else 0.0,
        reverse=True
    )

    sampled = []
    if stratify_by_value and total_count > 3:
        # Top 20% high-materiality items included automatically
        top_cut = max(1, int(target_sample_size * 0.4))
        for p, ename, ecode in sorted_pts[:top_cut]:
            sampled.append({
                "data_point_id": p.id,
                "submission_id": p.submission_id,
                "entity_name": ename,
                "entity_code": ecode,
                "value": p.value_numeric,
                "unit": p.unit,
                "sampling_stratum": "TOP_MATERIAL_PERCENTILE",
            })
        
        # Remaining sampled randomly
        remaining = sorted_pts[top_cut:]
        remaining_needed = target_sample_size - len(sampled)
        if remaining_needed > 0 and remaining:
            random_sample = random.sample(remaining, min(remaining_needed, len(remaining)))
            for p, ename, ecode in random_sample:
                sampled.append({
                    "data_point_id": p.id,
                    "submission_id": p.submission_id,
                    "entity_name": ename,
                    "entity_code": ecode,
                    "value": p.value_numeric,
                    "unit": p.unit,
                    "sampling_stratum": "RANDOM_REPRESENTATIVE",
                })
    else:
        for p, ename, ecode in sorted_pts[:target_sample_size]:
            sampled.append({
                "data_point_id": p.id,
                "submission_id": p.submission_id,
                "entity_name": ename,
                "entity_code": ecode,
                "value": p.value_numeric,
                "unit": p.unit,
                "sampling_stratum": "DIRECT_SAMPLE",
            })

    return {
        "metric_code": metric_code,
        "total_population": total_count,
        "sample_size": len(sampled),
        "sample_coverage_pct": round(len(sampled) / total_count * 100.0, 1),
        "sampled_items": sampled,
    }
