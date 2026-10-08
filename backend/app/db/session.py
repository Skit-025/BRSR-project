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
    Build the SQLAlchemy engine for PostgreSQL.
    Uses QueuePool with pre-ping to detect stale connections.
    Raises on connection failure at startup — no silent SQLite fallback.
    """
    url = settings.DATABASE_URL
    if not url.startswith("postgresql"):
        raise RuntimeError(
            f"DATABASE_URL must be a PostgreSQL URL. Got: {url!r}"
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
    Optimized for fast startup: if tables already exist, avoids expensive reflection.
    """
    from app.db.base import Base          # noqa: F401
    import app.db.registry  # noqa: F401

    try:
        with engine.begin() as conn:
            # Fast check: if users table already exists, run lightweight column migrations
            table_check = conn.execute(
                text("SELECT 1 FROM information_schema.tables WHERE table_name = 'users' LIMIT 1")
            ).fetchone()
            if table_check:
                conn.execute(text("""
                    ALTER TABLE evidence_files ADD COLUMN IF NOT EXISTS doc_type VARCHAR(50) DEFAULT 'OTHER';
                    ALTER TABLE evidence_files ADD COLUMN IF NOT EXISTS evidence_display_id VARCHAR(20);
                    ALTER TABLE evidence_files ADD COLUMN IF NOT EXISTS doc_category VARCHAR(20) DEFAULT 'Unknown';
                    ALTER TABLE evidence_files ADD COLUMN IF NOT EXISTS bill_type VARCHAR(50) DEFAULT 'Unknown';
                    ALTER TABLE evidence_files ADD COLUMN IF NOT EXISTS attached_by_role VARCHAR(50);
                    ALTER TABLE evidence_files ADD COLUMN IF NOT EXISTS project_id VARCHAR(100);
                    ALTER TABLE evidence_files ADD COLUMN IF NOT EXISTS esg_indicator VARCHAR(100);
                    
                    ALTER TABLE org_nodes ADD COLUMN IF NOT EXISTS project_description TEXT;
                    ALTER TABLE org_nodes ADD COLUMN IF NOT EXISTS enabled_activity_categories JSONB DEFAULT '[]'::jsonb;
                    ALTER TABLE metrics ADD COLUMN IF NOT EXISTS entry_level VARCHAR(50) DEFAULT 'project';
                    ALTER TABLE metrics ADD COLUMN IF NOT EXISTS guidance_text TEXT;
                    ALTER TABLE metrics ADD COLUMN IF NOT EXISTS why_needed TEXT;
                    ALTER TABLE metrics ADD COLUMN IF NOT EXISTS document_hint TEXT;
                    ALTER TABLE metrics ADD COLUMN IF NOT EXISTS calc_formula_code VARCHAR(100);
                    ALTER TABLE reports ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'READY';

                    UPDATE evidence_files
                    SET evidence_display_id = 'EVD-' || UPPER(SUBSTRING(REPLACE(id::text, '-', ''), 1, 8))
                    WHERE evidence_display_id IS NULL;
                """))
                logger.info("⚡ Database already initialized — startup accelerated.")
                return

            # First-time initialization
            conn.execute(text("""
                CREATE EXTENSION IF NOT EXISTS ltree;
                CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
                CREATE EXTENSION IF NOT EXISTS pg_trgm;
                CREATE EXTENSION IF NOT EXISTS pgcrypto;
            """))

        Base.metadata.create_all(bind=engine)

        with engine.begin() as conn:
            conn.execute(text("""
                ALTER TABLE evidence_files ADD COLUMN IF NOT EXISTS doc_type VARCHAR(50) DEFAULT 'OTHER';
                ALTER TABLE evidence_files ADD COLUMN IF NOT EXISTS evidence_display_id VARCHAR(20);
                ALTER TABLE evidence_files ADD COLUMN IF NOT EXISTS doc_category VARCHAR(20) DEFAULT 'Unknown';
                ALTER TABLE evidence_files ADD COLUMN IF NOT EXISTS bill_type VARCHAR(50) DEFAULT 'Unknown';
                ALTER TABLE evidence_files ADD COLUMN IF NOT EXISTS attached_by_role VARCHAR(50);
                ALTER TABLE evidence_files ADD COLUMN IF NOT EXISTS project_id VARCHAR(100);
                ALTER TABLE evidence_files ADD COLUMN IF NOT EXISTS esg_indicator VARCHAR(100);

                ALTER TABLE org_nodes ADD COLUMN IF NOT EXISTS project_description TEXT;
                ALTER TABLE org_nodes ADD COLUMN IF NOT EXISTS enabled_activity_categories JSONB DEFAULT '[]'::jsonb;
                ALTER TABLE metrics ADD COLUMN IF NOT EXISTS entry_level VARCHAR(50) DEFAULT 'project';
                ALTER TABLE metrics ADD COLUMN IF NOT EXISTS guidance_text TEXT;
                ALTER TABLE metrics ADD COLUMN IF NOT EXISTS why_needed TEXT;
                ALTER TABLE metrics ADD COLUMN IF NOT EXISTS document_hint TEXT;
                ALTER TABLE metrics ADD COLUMN IF NOT EXISTS calc_formula_code VARCHAR(100);
                ALTER TABLE reports ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'READY';

                UPDATE evidence_files
                SET evidence_display_id = 'EVD-' || UPPER(SUBSTRING(REPLACE(id::text, '-', ''), 1, 8))
                WHERE evidence_display_id IS NULL;
            """))
        logger.info("✅ All database tables initialised.")
    except Exception as e:
        logger.warning(f"Database initialization check notice: {e}")
