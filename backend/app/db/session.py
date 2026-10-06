"""
app/db/session.py
PostgreSQL-only database session factory.
Uses psycopg (v3) driver with connection pooling via SQLAlchemy.
"""
import logging
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import QueuePool
from app.config.settings import settings

logger = logging.getLogger(__name__)


def _build_engine():
    """
    Build the SQLAlchemy engine for PostgreSQL or SQLite.
    Supports SQLite fallback for local developer workstations and seeded demos.
    """
    url = settings.DATABASE_URL
    if url.startswith("sqlite"):
        engine = create_engine(
            url,
            connect_args={"check_same_thread": False},
            echo=settings.DEBUG,
            future=True,
        )
        logger.info("✅ SQLite connected: %s", url)
        return engine

    if not url.startswith("postgresql"):
        raise RuntimeError(
            f"DATABASE_URL must be a PostgreSQL or SQLite URL. Got: {url!r}"
        )

    engine = create_engine(
        url,
        poolclass=QueuePool,
        pool_size=10,
        max_overflow=20,
        pool_pre_ping=True,       # detect stale connections
        pool_recycle=1800,        # recycle connections every 30 min
        echo=settings.DEBUG,      # log SQL in DEBUG mode
        future=True,
    )

    # Verify connectivity immediately
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("✅ PostgreSQL connected: %s", url.split("@")[-1])
    except Exception as exc:
        logger.error("❌ Cannot connect to PostgreSQL: %s", exc)
        raise

    return engine



engine       = _build_engine()
SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,   # avoid lazy-load after commit
)


# ── FastAPI dependency ────────────────────────────────────────────
def get_db():
    """Yield a scoped database session; always closes on exit."""
    db: Session = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


# ── Startup helper ────────────────────────────────────────────────
def init_db() -> None:
    """
    Create all tables registered in Base.metadata.
    Also enables ltree and uuid-ossp extensions required by this project.
    """
    from app.db.base import Base          # noqa: F401 — triggers all model imports
    import app.db.registry  # noqa: F401 — ensures all models are registered

    if not str(engine.url).startswith("sqlite"):
        with engine.begin() as conn:
            # Enable PostgreSQL extensions
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS ltree"))
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\""))
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS pg_trgm"))
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS pgcrypto"))
            logger.info("PostgreSQL extensions enabled (ltree, uuid-ossp, pg_trgm, pgcrypto)")

    Base.metadata.create_all(bind=engine)
    logger.info("✅ All database tables initialised.")
