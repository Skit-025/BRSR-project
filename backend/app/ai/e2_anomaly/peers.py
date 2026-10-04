"""
E2 Engine: Layer 3 - Peer Benchmark (IQR Band)
Compares the current metric value against a set of peer project values
using the 1.5x Interquartile Range (IQR) fence, a standard outlier detection method.
"""
import numpy as np
from typing import List
from app.ai.schemas import AnomalyReason


def run_peer_layer(value: float, peer_values: List[float]) -> tuple[float, List[AnomalyReason]]:
    """
    Returns (l3_score: float, reasons: List[AnomalyReason])
    Requires at least 3 peer values to compute meaningful IQR.
    """
    score = 0.0
    reasons: List[AnomalyReason] = []

    if not peer_values or len(peer_values) < 3:
        return score, reasons

    p = np.array(peer_values, dtype=float)
    q25, q75 = np.percentile(p, [25, 75])
    iqr = q75 - q25
    lower_fence = q25 - 1.5 * iqr
    upper_fence = q75 + 1.5 * iqr
    peer_median = float(np.median(p))

    if value < lower_fence or value > upper_fence:
        score = 0.8
        reasons.append(AnomalyReason(
            feature="peer_iqr_outlier",
            message=(
                f"Value ({value:.1f}) falls outside the peer IQR fence "
                f"[{lower_fence:.1f}, {upper_fence:.1f}]. "
                f"Peer median is {peer_median:.1f}."
            ),
            contribution=0.65
        ))

    return score, reasons
