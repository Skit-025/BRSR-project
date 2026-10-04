"""
app/core/time.py
Timezone-aware datetime utilities.
All datetimes in the system are stored/compared in UTC.
"""
from datetime import datetime, timezone, timedelta
from typing import Optional


def utcnow() -> datetime:
    """Return current UTC datetime (timezone-aware)."""
    return datetime.now(timezone.utc)


def utc_from_timestamp(ts: float) -> datetime:
    """Convert a UNIX timestamp to a UTC-aware datetime."""
    return datetime.fromtimestamp(ts, tz=timezone.utc)


def ensure_utc(dt: Optional[datetime]) -> Optional[datetime]:
    """
    If `dt` is naive (no tzinfo), assume UTC and attach it.
    If already timezone-aware, convert to UTC.
    Returns None if input is None.
    """
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def fiscal_year_label(dt: Optional[datetime] = None, fy_start_month: int = 4) -> str:
    """
    Return the Indian fiscal year label for a given date.
    FY starts in April (month=4) by default.

    Examples:
        fiscal_year_label(datetime(2024, 8, 1))  → "FY 2024-25"
        fiscal_year_label(datetime(2025, 2, 1))  → "FY 2024-25"
    """
    dt = dt or utcnow()
    if dt.month >= fy_start_month:
        start = dt.year
    else:
        start = dt.year - 1
    return f"FY {start}-{str(start + 1)[-2:]}"


def is_within_period(dt: datetime, start: datetime, end: datetime) -> bool:
    """Return True if `dt` falls within [start, end] (inclusive)."""
    dt    = ensure_utc(dt)
    start = ensure_utc(start)
    end   = ensure_utc(end)
    return start <= dt <= end


def humanize_delta(dt: datetime) -> str:
    """Return a human-readable relative time string (e.g. '3 hours ago')."""
    now   = utcnow()
    delta = now - ensure_utc(dt)
    secs  = int(delta.total_seconds())
    if secs < 60:
        return f"{secs}s ago"
    if secs < 3600:
        return f"{secs // 60}m ago"
    if secs < 86400:
        return f"{secs // 3600}h ago"
    return f"{secs // 86400}d ago"
