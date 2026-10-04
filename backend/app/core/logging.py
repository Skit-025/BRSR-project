"""
app/core/logging.py
Structured JSON logging setup for the application.
Configures the root logger once; all modules use standard logging.getLogger(__name__).
"""
import logging
import sys
import json
from datetime import datetime, timezone
from typing import Any


class _JsonFormatter(logging.Formatter):
    """Format log records as single-line JSON objects."""

    def format(self, record: logging.LogRecord) -> str:
        log_obj: dict[str, Any] = {
            "ts":      datetime.now(timezone.utc).isoformat(),
            "level":   record.levelname,
            "logger":  record.name,
            "msg":     record.getMessage(),
        }
        if record.exc_info:
            log_obj["exc"] = self.formatException(record.exc_info)
        if hasattr(record, "extra"):
            log_obj.update(record.extra)
        return json.dumps(log_obj, default=str)


def setup_logging(level: str = "INFO", json_logs: bool = False) -> None:
    """
    Configure root logger.

    Args:
        level:     Logging level string (DEBUG / INFO / WARNING / ERROR).
        json_logs: If True, emit JSON-formatted lines (for log aggregators).
                   If False, emit human-readable format.
    """
    root = logging.getLogger()
    root.setLevel(level.upper())

    # Remove any existing handlers
    for h in root.handlers[:]:
        root.removeHandler(h)

    handler = logging.StreamHandler(sys.stdout)
    if json_logs:
        handler.setFormatter(_JsonFormatter())
    else:
        fmt = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
        handler.setFormatter(logging.Formatter(fmt, datefmt="%Y-%m-%d %H:%M:%S"))

    root.addHandler(handler)

    # Silence noisy third-party loggers
    for noisy in ("uvicorn.access", "sqlalchemy.engine", "httpcore", "httpx"):
        logging.getLogger(noisy).setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    """Convenience wrapper — identical to logging.getLogger(name)."""
    return logging.getLogger(name)
