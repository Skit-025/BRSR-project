import threading
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from app.config.settings import settings
from app.db.session import init_db
from app.api import api_router

logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Fast startup: run quick DB table check synchronously
    init_db()

    # Seed admins & emission factors asynchronously so server accepts requests immediately
    def _seed_worker():
        try:
            from app.db.seed_admins import seed_system_admins
            seed_system_admins()
            from app.db.session import SessionLocal
            from app.modules.calc.service import seed_emission_factors
            _db = SessionLocal()
            try:
                seed_emission_factors(_db)
            finally:
                _db.close()
        except Exception as e:
            logger.warning(f"Background seeding notice: {e}")

    threading.Thread(target=_seed_worker, daemon=True, name="bg-seeder").start()
    yield

app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="Aarohan ESG-BRSR Reporting Portal",
    lifespan=lifespan,
    docs_url="/docs" if settings.DEBUG or settings.APP_ENV != "production" else None,
    redoc_url=None,
)

# Global production exception handler: masks internal stack traces, DB errors, and algorithms
@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error on {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected error occurred while processing your request. Please try again."}
    )

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register central API router under /api/v1
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/health", tags=["System"])
def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "ai_provider": settings.AI_PROVIDER,
        "auto_fallback_enabled": settings.AI_AUTO_FALLBACK_ON_ERROR
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
