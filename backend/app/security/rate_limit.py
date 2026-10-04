"""
app/security/rate_limit.py
In-memory sliding-window rate limiter using a simple token-bucket approach.
For production, replace with Redis-backed SlowAPI or similar.
"""
import time
import threading
from collections import defaultdict, deque
from typing import Deque, Dict
from fastapi import HTTPException, Request, status


# ── Sliding-window store (in-memory, process-local) ──────────────
_lock: threading.Lock = threading.Lock()
_windows: Dict[str, Deque[float]] = defaultdict(deque)


def _sliding_window_check(key: str, limit: int, window_seconds: int) -> bool:
    """
    Returns True if the key is within the allowed limit, False if exceeded.
    Timestamps are stored per key; old ones are pruned on each call.
    """
    now = time.monotonic()
    cutoff = now - window_seconds
    with _lock:
        dq = _windows[key]
        # Remove timestamps outside the window
        while dq and dq[0] < cutoff:
            dq.popleft()
        if len(dq) >= limit:
            return False
        dq.append(now)
        return True


# ── FastAPI dependency factories ─────────────────────────────────
def rate_limit(limit: int = 60, window_seconds: int = 60, key_prefix: str = "global"):
    """
    Returns a FastAPI dependency that enforces rate limiting per client IP.

    Args:
        limit:          Max requests allowed in the window.
        window_seconds: Sliding window duration in seconds.
        key_prefix:     Namespace prefix for the rate limit key.

    Usage:
        @router.post("/upload", dependencies=[Depends(rate_limit(limit=10, window_seconds=60))])
        def upload(...):
    """
    async def _dependency(request: Request) -> None:
        client_ip = request.client.host if request.client else "unknown"
        key = f"{key_prefix}:{client_ip}"
        allowed = _sliding_window_check(key, limit, window_seconds)
        if not allowed:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded: max {limit} requests per {window_seconds}s.",
                headers={"Retry-After": str(window_seconds)},
            )
    return _dependency


# ── Pre-built limiters ────────────────────────────────────────────
# Stricter limit for auth endpoints (anti-brute-force)
auth_rate_limit     = rate_limit(limit=10,  window_seconds=60,  key_prefix="auth")
# Upload endpoint limit
upload_rate_limit   = rate_limit(limit=30,  window_seconds=60,  key_prefix="upload")
# General API limit
api_rate_limit      = rate_limit(limit=120, window_seconds=60,  key_prefix="api")
# AI endpoints — expensive, lower limit
ai_rate_limit       = rate_limit(limit=20,  window_seconds=60,  key_prefix="ai")
