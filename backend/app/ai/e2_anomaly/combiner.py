"""Combine normalized detector strengths without diluting a single strong signal."""
from math import prod
from typing import List
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
    layer_scores = [min(1.0, max(0.0, score)) for score in (l1_score, l2_score, l3_score, l4_score)]

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
        # Noisy-OR: independent detectors add support, while a zero score from an
        # unavailable/non-triggering layer cannot suppress a strong signal.
        composite = 1.0 - prod(1.0 - score for score in layer_scores)
    if not hard_invalid and composite >= 0.65:
        severity = AnomalySeverity.WARNING
    elif not hard_invalid and all_reasons:
        severity = AnomalySeverity.INFO
    is_anomaly = severity is not None

    return round(composite, 3), is_anomaly, severity, top_reasons
