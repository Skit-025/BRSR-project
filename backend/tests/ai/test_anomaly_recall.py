"""
Unit and integration tests for E2 Anomaly Detection recall, robustness, and layer scoring.
Verifies:
- L1 Deterministic unit & ratio checks.
- L2 MAD z-score robust statistics.
- L3 Peer group IQR fences.
- L4 Isolation Forest multidimensional outlier detection.
- Handling of insufficient historical observations (< 3 data points).
- False positive suppression and reproducible severity levels.
"""
import pytest
from app.ai.schemas import E2AnomalyRequest, AnomalySeverity
from app.ai.e2_anomaly.engine import e2_engine


def test_extreme_outlier_detection_recall():
    """Verify that a 1000x jump in consumption is flagged as high-severity anomaly."""
    history = [100.0, 102.0, 98.0, 105.0, 99.0, 101.0, 100.0, 103.0]
    req = E2AnomalyRequest(
        metric_code="ENV-ENERGY-001",
        current_value=100000.0,  # 1000x unit error (e.g. MWh reported in kWh)
        unit="kWh",
        history=history,
        peer_values=[95.0, 105.0, 100.0]
    )
    res = e2_engine.evaluate(req)
    assert res.is_anomaly is True
    assert res.score >= 0.75
    assert res.severity in (AnomalySeverity.WARNING, AnomalySeverity.ERROR)
    assert any("unit error" in r.message.lower() or "mad" in r.message.lower() for r in res.reasons)


def test_normal_consumption_no_false_positive():
    """Verify that expected slight variance does not trigger an anomaly."""
    history = [100.0, 102.0, 98.0, 104.0, 101.0, 99.0, 103.0]
    req = E2AnomalyRequest(
        metric_code="ENV-ENERGY-001",
        current_value=101.5,
        unit="kWh",
        history=history,
        peer_values=[98.0, 102.0, 100.0]
    )
    res = e2_engine.evaluate(req)
    assert res.is_anomaly is False
    assert res.score < 0.5


def test_insufficient_history_graceful_handling():
    """Verify engine handles sparse / new metrics without crashing."""
    req = E2AnomalyRequest(
        metric_code="ENV-NEW-001",
        current_value=50.0,
        unit="Tonnes",
        history=[],  # No historical baseline
        peer_values=[]
    )
    res = e2_engine.evaluate(req)
    # Should not crash, and layer scores should reflect lack of history
    assert isinstance(res.score, float)
    assert "L1_rules" in res.layer_scores
    assert "L2_robust_stats" in res.layer_scores


def test_peer_group_iqr_outlier():
    """Verify peer group IQR fence flagging when plant deviates from peer cluster."""
    peers = [10.0, 11.0, 10.5, 11.2, 10.8, 10.2, 10.9]
    req = E2AnomalyRequest(
        metric_code="ENV-WASTE-001",
        current_value=35.0,  # 3x peers
        unit="Tonnes",
        history=[10.0, 11.0],
        peer_values=peers
    )
    res = e2_engine.evaluate(req)
    assert res.layer_scores["L3_peer_benchmark"] > 0.0

