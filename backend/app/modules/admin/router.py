"""
app/modules/admin/router.py
FastAPI router for system health diagnostics, table counts, and admin jobs.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.modules.admin.schemas import SystemDiagnostics
from app.modules.admin.service import AdminService
from app.modules.admin.jobs.router import router as jobs_router

router = APIRouter(prefix="/admin", tags=["System Administration & Diagnostics"])
router.include_router(jobs_router)


from app.modules.auth.router import require_system_admin

@router.get("/diagnostics", response_model=SystemDiagnostics)
def get_system_diagnostics(
    _admin = Depends(require_system_admin),
    db: Session = Depends(get_db)
):
    """Inspects complete PostgreSQL health, row counts, and active configuration."""
    service = AdminService(db)
    return service.get_diagnostics()
