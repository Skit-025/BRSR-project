"""
E2 Engine: Score Combiner
Aggregates L1, L2, L3, L4 layer scores into a single composite anomaly score
using the weighted formula from Page 24 of the MEIL BRSR Build Guide:
  composite = 0.50*L1 + 0.20*L2 + 0.15*L3 + 0.15*L4
"""
from typing import List, Dict
from app.ai.schemas import AnomalySeverity, AnomalyReason


def combine_scores(
    l1_score: float,
    l2_score: float,
    l3_score: float,
    l4_score: float,
    all_reasons: List[AnomalyReason]
) -> tuple[float, bool, AnomalySeverity | None, List[AnomalyReason]]:
    """
    Returns (composite_score, is_anomaly, severity, top_reasons)
    """
    composite = (
        0.50 * l1_score +
        0.20 * l2_score +
        0.15 * l3_score +
        0.15 * l4_score
    )
    composite = min(1.0, max(0.0, composite))

    # Sort reasons by contribution descending, keep top 5
    top_reasons = sorted(all_reasons, key=lambda r: r.contribution, reverse=True)[:5]

    severity = None
    is_anomaly = False
    if composite >= 0.65:
        severity = AnomalySeverity.WARNING
        is_anomaly = True
    elif composite >= 0.40:
        severity = AnomalySeverity.INFO
        is_anomaly = True

    return round(composite, 3), is_anomaly, severity, top_reasons
