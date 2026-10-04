"""
E2 Engine: Layer 1 - Hard Rule Checks
Validates a single metric value against absolute business rules.
"""
from typing import List
from app.ai.schemas import AnomalyReason


def run_rules_layer(value: float, history: List[float], metric_code: str, extra_context: dict) -> tuple[float, List[AnomalyReason]]:
    """
    Returns (l1_score: float, reasons: List[AnomalyReason])
    Rules:
      - Negative values are strictly invalid.
      - Value >500x median of history = unit slip (e.g. litres vs kL, kWh vs MWh).
      - Zero safety incidents with >100k man-hours triggers a verification flag.
    """
    score = 0.0
    reasons: List[AnomalyReason] = []

    # Rule 1: No negative consumption
    if value < 0:
        score = 1.0
        reasons.append(AnomalyReason(
            feature="non_negative",
            message=f"Negative consumption value ({value}) is strictly invalid.",
            contribution=1.0
        ))

    # Rule 2: Unit-slip detection (>500x median = likely wrong unit)
    if history:
        import numpy as np
        hist_median = float(np.median(history))
        if hist_median > 0:
            ratio = value / hist_median
            if ratio > 500:
                score = max(score, 0.95)
                reasons.append(AnomalyReason(
                    feature="unit_slip_1000x",
                    message=f"Value ({value}) is ~{int(ratio)}x the trailing median ({hist_median:.1f}). Likely unit error (e.g. litres vs kL, kWh vs MWh).",
                    contribution=0.9
                ))

    # Rule 3: Cross-metric plausibility — zero incidents on very high man-hours
    if "man_hours" in extra_context:
        mh = extra_context["man_hours"]
        if mh > 100_000 and value == 0 and "SAFE" in metric_code:
            score = max(score, 0.5)
            reasons.append(AnomalyReason(
                feature="zero_incidents_high_hours",
                message=f"Zero safety incidents reported across {mh:,} man-hours. Manual verification required.",
                contribution=0.5
            ))

    return score, reasons
