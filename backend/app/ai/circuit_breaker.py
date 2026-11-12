"""
app/ai/circuit_breaker.py
Capability-aware, self-healing circuit breaker with permanent vs transient classification.
"""
import time
import logging
from enum import Enum
from typing import Dict, Optional, Tuple

logger = logging.getLogger(__name__)


class CircuitState(str, Enum):
    CLOSED = "closed"        # Healthy, accepting traffic
    OPEN = "open"            # Failing/Broken, blocking traffic until cooldown
    HALF_OPEN = "half_open"  # Trial request to verify recovery


class ErrorClassification(str, Enum):
    INSUFFICIENT_CREDITS = "insufficient_credits"    # HTTP 402 - long cooldown (e.g. 15m), credential not necessarily invalid
    AUTH_FAILURE = "auth_failure"                    # HTTP 401/403 - bad token/permissions
    MODEL_UNAVAILABLE = "model_unavailable"          # HTTP 404 - model deprecated/missing
    RATE_LIMITED = "rate_limited"                    # HTTP 429 - short cooldown with backoff
    SERVICE_UNAVAILABLE = "service_unavailable"      # HTTP 500/502/503/504
    TIMEOUT = "timeout"                              # Request timed out
    CLIENT_ERROR = "client_error"                    # HTTP 400/422 malformed request
    NETWORK_ERROR = "network_error"                  # DNS failure, connection refused, host unreachable
    UNKNOWN = "unknown"


def is_network_error(exc: Exception) -> bool:
    """Detects whether an exception is caused by hostname lookup failure or low-level connection breakdown."""
    import socket
    if isinstance(exc, (socket.gaierror, socket.herror)):
        return True
    msg = str(exc).lower()
    return any(
        term in msg
        for term in (
            "getaddrinfo failed",
            "11001",
            "name or service not known",
            "nodename nor servname provided",
            "temporary failure in name resolution",
            "connection refused",
            "network is unreachable",
            "failed to establish a new connection",
            "connecterror",
        )
    )


def classify_error(exc: Exception) -> ErrorClassification:
    """Classifies an exception into an ErrorClassification category."""
    # Check for DNS and transport connection failures first
    if is_network_error(exc):
        return ErrorClassification.NETWORK_ERROR

    msg = str(exc).lower()
    
    # 402 Payment Required / Insufficient credits
    if "402" in msg or "payment required" in msg or "credit" in msg or "pre-paid" in msg:
        return ErrorClassification.INSUFFICIENT_CREDITS
    
    # 401/403 Auth failure
    if "401" in msg or "403" in msg or "unauthorized" in msg or "forbidden" in msg or "invalid api key" in msg:
        return ErrorClassification.AUTH_FAILURE
        
    # 404 Model not found / deprecated
    if "404" in msg or "not found" in msg or "no longer available" in msg:
        return ErrorClassification.MODEL_UNAVAILABLE
        
    # 429 Rate limit / resource exhausted
    if "429" in msg or "resource_exhausted" in msg or "rate limit" in msg or "quota" in msg:
        return ErrorClassification.RATE_LIMITED
        
    # Timeout
    if "timeout" in msg or "timed out" in msg:
        return ErrorClassification.TIMEOUT
        
    # 5xx Service Unavailable / upstream error
    if any(code in msg for code in ("500", "502", "503", "504", "unavailable", "server error", "high demand")):
        return ErrorClassification.SERVICE_UNAVAILABLE

    # 400/422 Client validation
    if "400" in msg or "422" in msg or "bad request" in msg:
        return ErrorClassification.CLIENT_ERROR

    return ErrorClassification.UNKNOWN


class ProviderCircuitBreaker:
    """
    Independent Circuit Breaker for an AI Provider.
    Enforces distinct cooldown periods based on failure classification:
    - Insufficient credits (402): 900s (15 min) cooldown
    - Auth failures (401/403): 600s (10 min) cooldown
    - Rate limits (429): 30s cooldown
    - Transient 5xx / timeouts: 45s cooldown
    """

    def __init__(self, provider_name: str, failure_threshold: int = 2, default_cooldown: int = 60):
        self.provider_name = provider_name
        self.failure_threshold = max(1, failure_threshold)
        self.default_cooldown = default_cooldown
        
        self.state: CircuitState = CircuitState.CLOSED
        self.consecutive_failures: int = 0
        self.last_failure_time: float = 0.0
        self.cooldown_until: float = 0.0
        self.last_error_type: Optional[ErrorClassification] = None
        self.last_error_message: Optional[str] = None

    def can_execute(self) -> bool:
        """Determines if the provider is eligible to process a request."""
        now = time.time()
        if self.state == CircuitState.CLOSED:
            return True
            
        if self.state == CircuitState.OPEN:
            if now >= self.cooldown_until:
                # Cooldown expired, transition to HALF_OPEN for trial request
                self.state = CircuitState.HALF_OPEN
                logger.info(f"CircuitBreaker [{self.provider_name}]: Cooldown elapsed. Entering HALF_OPEN.")
                return True
            return False
            
        if self.state == CircuitState.HALF_OPEN:
            # Allow single trial call through
            return True

        return False

    def get_remaining_cooldown(self) -> int:
        return max(0, int(self.cooldown_until - time.time()))

    def record_success(self):
        """Resets the circuit breaker upon a successful execution."""
        if self.state != CircuitState.CLOSED:
            logger.info(f"CircuitBreaker [{self.provider_name}]: Recovered! State CLOSED.")
        self.state = CircuitState.CLOSED
        self.consecutive_failures = 0
        self.cooldown_until = 0.0
        self.last_error_type = None
        self.last_error_message = None

    def record_failure(self, exc: Exception) -> Tuple[ErrorClassification, int]:
        """
        Records a failure, classifies it, and trips the breaker if threshold reached.
        Returns (ErrorClassification, cooldown_seconds).
        """
        self.consecutive_failures += 1
        self.last_failure_time = time.time()
        err_type = classify_error(exc)
        self.last_error_type = err_type
        self.last_error_message = str(exc)[:200]

        # Determine cooldown duration based on error classification
        if err_type == ErrorClassification.INSUFFICIENT_CREDITS:
            cooldown = 900  # 15 minutes
        elif err_type == ErrorClassification.AUTH_FAILURE:
            cooldown = 600  # 10 minutes
        elif err_type == ErrorClassification.MODEL_UNAVAILABLE:
            cooldown = 120  # 2 minutes
        elif err_type == ErrorClassification.NETWORK_ERROR:
            cooldown = 30   # 30 seconds transient network retry cooldown
        elif err_type == ErrorClassification.RATE_LIMITED:
            cooldown = 30   # 30 seconds
        elif err_type in (ErrorClassification.SERVICE_UNAVAILABLE, ErrorClassification.TIMEOUT):
            cooldown = 45   # 45 seconds
        else:
            cooldown = self.default_cooldown

        # Trip breaker if in HALF_OPEN or failures >= threshold
        if self.state == CircuitState.HALF_OPEN or self.consecutive_failures >= self.failure_threshold:
            self.state = CircuitState.OPEN
            self.cooldown_until = time.time() + cooldown
            logger.warning(
                f"CircuitBreaker [{self.provider_name}]: Breaker OPEN for {cooldown}s "
                f"after {self.consecutive_failures} failures. Reason: {err_type.value} ({exc})"
            )
        else:
            logger.info(
                f"CircuitBreaker [{self.provider_name}]: Failure recorded ({self.consecutive_failures}/{self.failure_threshold}). "
                f"Breaker remains CLOSED."
            )

        return err_type, cooldown

