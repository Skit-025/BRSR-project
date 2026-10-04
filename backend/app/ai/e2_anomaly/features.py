"""
E2 Engine: Feature Engineering
Normalizes and prepares feature vectors for the Isolation Forest model.
Also computes derived features like rolling ratios and seasonal indices.
"""
import numpy as np
from typing import List, Dict, Any


def build_feature_vector(value: float, history: List[float], extra_context: Dict[str, Any]) -> Dict[str, float]:
    """
    Builds a normalized feature dictionary for a single data point.
    Used by IsolationForest and future multivariate models.
    """
    features: Dict[str, float] = {}

    features["raw_value"] = value

    if history and len(history) >= 3:
        h = np.array(history, dtype=float)
        median = float(np.median(h))
        std = float(np.std(h)) or 1.0

        features["z_score"] = (value - median) / std
        features["ratio_to_median"] = value / median if median > 0 else 0.0
        features["trailing_mean"] = float(np.mean(h))
        features["trailing_std"] = std
        features["trailing_min"] = float(np.min(h))
        features["trailing_max"] = float(np.max(h))

        # Month-over-month change from last known value
        if len(history) >= 2:
            prev = history[-1]
            features["mom_change"] = (value - prev) / prev if prev > 0 else 0.0

    # Extra cross-metric context features
    for k, v in extra_context.items():
        if isinstance(v, (int, float)):
            features[f"ctx_{k}"] = float(v)

    return features


def to_numpy_row(features: Dict[str, float]) -> np.ndarray:
    """Converts a feature dict to a 1D numpy array for sklearn models."""
    return np.array(list(features.values()), dtype=float).reshape(1, -1)
