"""
E2 Engine: Layer 2 - Robust Statistics (MAD + YoY change)
Uses Median Absolute Deviation for robust z-score scoring
and detects year-over-year spikes > 35%.
"""
import numpy as np
from typing import List
from app.ai.schemas import AnomalyReason


def run_robust_stats_layer(value: float, history: List[float]) -> tuple[float, List[AnomalyReason]]:
    """
    Returns (l2_score: float, reasons: List[AnomalyReason])
    Requires at least 3 data points in history.
    """
    score = 0.0
    reasons: List[AnomalyReason] = []

    if not history or len(history) < 3:
        return score, reasons

    h = np.array(history, dtype=float)
    median = np.median(h)
    mad = np.median(np.abs(h - median))
    # Normalize MAD to match standard deviation scale
    mad_std = 1.4826 * mad

    # MAD Z-score check
    if mad_std > 0:
        robust_z = abs(value - median) / mad_std
        if robust_z > 3.5:
            score = min(1.0, float(robust_z / 5.0))
            reasons.append(AnomalyReason(
                feature="robust_mad_zscore",
                message=f"Value deviates {robust_z:.1f} MAD units from trailing median ({median:.1f}). Highly unusual pattern.",
                contribution=0.7
            ))

    # Year-over-year change > 35%
    last_comparable = history[-1]
    if last_comparable > 0:
        yoy_change = abs(value - last_comparable) / last_comparable
        if yoy_change > 0.35:
            score = max(score, min(1.0, yoy_change))
            reasons.append(AnomalyReason(
                feature="yoy_change_35_pct",
                message=f"Year-on-year change of {yoy_change * 100:.1f}% exceeds the 35% materiality threshold.",
                contribution=0.6
            ))

    return score, reasons
