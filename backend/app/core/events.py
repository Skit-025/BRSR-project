"""
app/core/events.py
Application lifespan events — startup and shutdown hooks.
Called once by FastAPI's lifespan context manager in main.py.
"""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI

from app.core.logging import setup_logging
from app.config.settings import settings

logger = logging.getLogger(__name__)


async def on_startup() -> None:
    """Run all startup tasks sequentially."""
    # 1. Configure logging
    setup_logging(
        level="DEBUG" if settings.DEBUG else "INFO",
        json_logs=settings.APP_ENV == "production",
    )
    logger.info("🚀 Starting %s [%s]", settings.APP_NAME, settings.APP_ENV)

    # 2. Initialise database (create tables + extensions)
    from app.db.session import init_db
    init_db()

    # 3. Seed metric catalogue on first run
    try:
        from app.db.session import SessionLocal
        from app.modules.metrics.seed_data import seed_metric_catalogue
        from app.modules.metrics.models import MetricDefinition
        db = SessionLocal()
        try:
            if db.query(MetricDefinition).count() == 0:
                seed_metric_catalogue(db)
                logger.info("✅ Metric catalogue seeded.")
            else:
                logger.info("Metric catalogue already seeded — skipping.")
        finally:
            db.close()
    except Exception as exc:
        logger.warning("Could not seed metric catalogue: %s", exc)

    logger.info("✅ Startup complete.")


async def on_shutdown() -> None:
    """Run shutdown cleanup tasks."""
    logger.info("🛑 Shutting down %s…", settings.APP_NAME)
    # Future: flush any pending outbox messages, drain worker queues
    logger.info("Shutdown complete.")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """FastAPI lifespan context manager — replaces deprecated @app.on_event."""
    await on_startup()
    yield
    await on_shutdown()
