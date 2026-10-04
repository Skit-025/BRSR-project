"""
E2 Engine: Layer 4 - Isolation Forest (Multivariate Unsupervised Scoring)
Uses scikit-learn's IsolationForest on the historical series to detect
rare-cluster divergence from the value's own tail distribution.
"""
import numpy as np
from typing import List
from app.ai.schemas import AnomalyReason


def run_iforest_layer(value: float, history: List[float]) -> tuple[float, List[AnomalyReason]]:
    """
    Returns (l4_score: float, reasons: List[AnomalyReason])
    Requires at least 6 data points to train a meaningful model.
    """
    score = 0.0
    reasons: List[AnomalyReason] = []

    if not history or len(history) < 6:
        return score, reasons

    try:
        from sklearn.ensemble import IsolationForest

        X_train = np.array(history, dtype=float).reshape(-1, 1)
        clf = IsolationForest(contamination=0.05, random_state=42)
        clf.fit(X_train)

        # Decision function returns negative scores for outliers
        raw_score = clf.decision_function([[value]])[0]
        if raw_score < 0:
            score = min(1.0, abs(raw_score) * 2.0)
            reasons.append(AnomalyReason(
                feature="isolation_forest",
                message="Multivariate Isolation Forest flagged this value as a rare-cluster outlier relative to historical data.",
                contribution=0.5
            ))
    except Exception:
        pass

    return score, reasons
