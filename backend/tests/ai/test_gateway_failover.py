"""
Integration and failover tests for AI Gateway provider cascade and circuit breaker.
"""
import pytest
from unittest.mock import MagicMock, patch
from pydantic import BaseModel
from typing import Optional

from app.ai.gateway import AIGateway
from app.ai.models_registry import AICapability
from app.ai.circuit_breaker import CircuitState, ErrorClassification
from app.config.settings import settings


class DummySchema(BaseModel):
    status: str = "ok"
    val: float = 1.0
    is_fallback: Optional[bool] = False


def test_gateway_primary_openrouter_success():
    """Verify that when OpenRouter is healthy, it is chosen first."""
    gw = AIGateway()
    with patch.object(gw.openrouter_provider, "generate_json", return_value={"status": "ok", "val": 1.0}):
        res = gw.run_structured(
            engine="TEST",
            prompt="test prompt",
            response_model=DummySchema
        )
        assert res.status == "ok"
        assert res.val == 1.0
        assert gw.circuit_breakers["openrouter"].state == CircuitState.CLOSED


def test_gateway_openrouter_402_failover_to_gemini():
    """Verify that when OpenRouter throws 402 insufficient credits, it falls back to Gemini."""
    gw = AIGateway()
    with patch.object(gw.openrouter_provider, "generate_json", side_effect=Exception("HTTP 402 Payment Required: Insufficient credits")), \
         patch.object(gw.gemini_provider, "generate_json", return_value={"status": "from_gemini", "val": 2.0}):
        res = gw.run_structured(
            engine="TEST",
            prompt="test prompt",
            response_model=DummySchema
        )
        assert res.status == "from_gemini"
        assert res.val == 2.0
        assert gw.circuit_breakers["openrouter"].last_error_type == ErrorClassification.INSUFFICIENT_CREDITS


def test_gateway_all_live_fail_to_mock():
    """Verify that when all live providers fail, Gateway engages deterministic Mock in non-production."""
    gw = AIGateway()
    with patch.object(settings, "APP_ENV", "development"), \
         patch.object(gw.openrouter_provider, "generate_json", side_effect=Exception("HTTP 500")), \
         patch.object(gw.gemini_provider, "generate_json", side_effect=Exception("HTTP 503")), \
         patch.object(gw.huggingface_provider, "generate_json", side_effect=Exception("HTTP 402")):
        res = gw.run_structured(
            engine="TEST",
            prompt="test prompt",
            response_model=DummySchema
        )
        assert res is not None
        assert res.is_fallback is True


def test_production_rejects_mock_fallback():
    """Verify that in production (APP_ENV=production), mock fallback is strictly disabled."""
    gw = AIGateway()
    with patch.object(settings, "APP_ENV", "production"), \
         patch.object(gw.openrouter_provider, "generate_json", side_effect=Exception("HTTP 500")), \
         patch.object(gw.gemini_provider, "generate_json", side_effect=Exception("HTTP 503")), \
         patch.object(gw.huggingface_provider, "generate_json", side_effect=Exception("HTTP 402")):
        with pytest.raises(RuntimeError, match="Mock fallback is strictly disabled in production"):
            gw.run_structured(
                engine="TEST",
                prompt="test prompt",
                response_model=DummySchema
            )


def test_circuit_breaker_skips_cooling_provider():
    """Verify that once a provider circuit breaker is OPEN, it is bypassed immediately."""
    gw = AIGateway()
    cb = gw.circuit_breakers["openrouter"]
    cb.record_failure(Exception("HTTP 402 Insufficient credits"))
    cb.record_failure(Exception("HTTP 402 Insufficient credits"))
    assert cb.state == CircuitState.OPEN
    assert cb.can_execute() is False

    with patch.object(gw.openrouter_provider, "generate_json") as mock_or, \
         patch.object(gw.gemini_provider, "generate_json", return_value={"status": "ok", "val": 42.0}):
        res = gw.run_structured(
            engine="TEST",
            prompt="test prompt",
            response_model=DummySchema
        )
        assert res.val == 42.0
        mock_or.assert_not_called()


def test_circuit_breaker_half_open_recovery_when_credits_restored():
    """Verify that after cooldown elapses, breaker enters HALF_OPEN and fully recovers to CLOSED on success."""
    import time
    gw = AIGateway()
    cb = gw.circuit_breakers["huggingface"]
    # Simulate 402 insufficient credits failure
    cb.record_failure(Exception("HTTP 402 Payment Required: Insufficient credits"))
    cb.record_failure(Exception("HTTP 402 Payment Required: Insufficient credits"))
    assert cb.state == CircuitState.OPEN

    # Fast-forward past cooldown
    cb.cooldown_until = time.time() - 1
    assert cb.can_execute() is True
    assert cb.state == CircuitState.HALF_OPEN

    # Simulate success after user restores credits
    cb.record_success()
    assert cb.state == CircuitState.CLOSED
    assert cb.consecutive_failures == 0
    assert cb.get_remaining_cooldown() == 0

