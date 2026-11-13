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
    weighted_score = (
        0.50 * l1_score +
        0.20 * l2_score +
        0.15 * l3_score +
        0.15 * l4_score
    )
    strongest_layer = max(l1_score, l2_score, l3_score, l4_score)

    # Sort reasons by contribution descending, keep top 5
    top_reasons = sorted(all_reasons, key=lambda r: r.contribution, reverse=True)[:5]

    severity = None
    is_anomaly = False
    hard_invalid = any(r.feature == "non_negative" for r in all_reasons)
    if hard_invalid:
        composite = 1.0
        severity = AnomalySeverity.ERROR
        is_anomaly = True
    else:
        # The original weighted average could hide a decisive single-layer signal
        # (for example an extreme MAD/YoY outlier became only 20% when the other
        # layers had no benchmark data). Preserve the weight for corroboration,
        # while giving one strong detector enough influence to trigger review.
        evidence_floor = 0.40 if all_reasons else 0.0
        composite = max(weighted_score, 0.80 * strongest_layer, evidence_floor)
        composite = min(1.0, max(0.0, composite))
    if not hard_invalid and composite >= 0.65:
        severity = AnomalySeverity.WARNING
        is_anomaly = True
    elif not hard_invalid and composite >= 0.40:
        severity = AnomalySeverity.INFO
        is_anomaly = True

    return round(composite, 3), is_anomaly, severity, top_reasons
