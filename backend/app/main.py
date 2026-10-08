from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.config.settings import settings
from app.db.session import init_db
from app.db.seed_admins import seed_system_admins
from app.api import api_router
import logging

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize database tables, seed system admins & statutory emission factors
    init_db()
    seed_system_admins()
    from app.db.session import SessionLocal
    from app.modules.calc.service import seed_emission_factors
    _db = SessionLocal()
    try:
        seed_emission_factors(_db)
    finally:
        _db.close()
    yield


app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="Aarohan ESG-BRSR Reporting Portal Backend with 7 AI Engines & Deterministic Audit Rails",
    lifespan=lifespan,
    # SECURITY: Disable OpenAPI docs in production to avoid schema leakage
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    openapi_url="/openapi.json" if settings.DEBUG else None,
)

# SECURITY: CORS restricted to configured allowlist — never "*" in production
_cors_origins = settings.get_cors_origins()
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Requested-With"],
)


# SECURITY: Global exception handler — never expose raw tracebacks to clients
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    if settings.DEBUG:
        # In debug mode, re-raise so FastAPI's default handler shows the traceback
        raise exc
    logger.exception("Unhandled server error at %s", request.url)
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected server error occurred. Please contact support."},
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

