"""
app/modules/dashboards/quality_score.py
Automated ESG Data Quality Score calculator (0 to 100).
Evaluates Evidence Attachment, Actual vs Estimated ratio, Error rate, and Completeness.
"""
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.modules.collection.models import DataPoint, ValueStatus
from app.modules.evidence.models import EvidenceLink
from app.modules.validation.models import ValidationResult, Severity


def compute_esg_quality_score(
    db: Session,
    submission_ids: List[str],
) -> Dict[str, Any]:
    """
    Computes ESG Data Quality Index (0 - 100):
      - Evidence Coverage (35%): % of required metrics backed by validated documents
      - Measurement Precision (25%): % of metrics recorded as ACTUAL vs ESTIMATED
      - Validation Health (20%): % metrics free of validation errors or anomalies
      - Data Completeness (20%): % applicable metrics with recorded data
    """
    if not submission_ids:
        return {
            "score": 100.0,
            "grade": "A",
            "breakdown": {
                "evidence_coverage_pct": 100.0,
                "actual_values_pct": 100.0,
                "validation_health_pct": 100.0,
                "completeness_pct": 100.0,
            }
        }

    points = (
        db.query(DataPoint)
        .filter(DataPoint.submission_id.in_(submission_ids), DataPoint.is_deleted == False)
        .all()
    )
    total_pts = len(points)
    if total_pts == 0:
        return {
            "score": 0.0,
            "grade": "D",
            "breakdown": {
                "evidence_coverage_pct": 0.0,
                "actual_values_pct": 0.0,
                "validation_health_pct": 100.0,
                "completeness_pct": 0.0,
            }
        }

    # 1. Evidence coverage
    point_ids = [p.id for p in points]
    linked_count = (
        db.query(EvidenceLink.data_point_id)
        .filter(EvidenceLink.data_point_id.in_(point_ids))
        .distinct()
        .count()
    )
    evidence_cov = min(100.0, (linked_count / total_pts) * 100.0)

    # 2. Actual values ratio
    actual_count = sum(1 for p in points if p.status == ValueStatus.ACTUAL.value)
    actual_pct = (actual_count / total_pts) * 100.0

    # 3. Validation Health
    error_count = (
        db.query(ValidationResult)
        .filter(
            ValidationResult.submission_id.in_(submission_ids),
            ValidationResult.severity == Severity.ERROR.value,
            ValidationResult.resolved == False,
        )
        .count()
    )
    val_health = max(0.0, 100.0 - (error_count * 10.0))

    # 4. Completeness
    complete_count = sum(1 for p in points if (p.value_numeric is not None or p.value_text is not None))
    complete_pct = (complete_count / total_pts) * 100.0

    # Weighted composite score
    composite = (
        (evidence_cov * 0.35) +
        (actual_pct * 0.25) +
        (val_health * 0.20) +
        (complete_pct * 0.20)
    )
    score = round(composite, 1)

    if score >= 90:
        grade = "A"
    elif score >= 75:
        grade = "B"
    elif score >= 60:
        grade = "C"
    else:
        grade = "D"

    return {
        "score": score,
        "grade": grade,
        "breakdown": {
            "evidence_coverage_pct": round(evidence_cov, 1),
            "actual_values_pct": round(actual_pct, 1),
            "validation_health_pct": round(val_health, 1),
            "completeness_pct": round(complete_pct, 1),
        }
    }
