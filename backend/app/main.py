from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config.settings import settings
from app.db.session import init_db
from app.db.seed_admins import seed_system_admins
from app.api import api_router

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
    description="MEIL ESG-BRSR Reporting Portal Backend with 7 AI Engines & Deterministic Audit Rails",
    lifespan=lifespan
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
