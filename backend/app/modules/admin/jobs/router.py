"""
app/modules/admin/jobs/router.py
FastAPI router for background job monitoring, triggering, and status inspection.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime
from app.db.session import get_db
from app.modules.admin.jobs.models import BackgroundJob

router = APIRouter(prefix="/jobs", tags=["Background Jobs & Pipeline Tasks"])


class JobRead(BaseModel):
    id: str
    job_type: str
    celery_task_id: Optional[str] = None
    status: str
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None


@router.get("/", response_model=List[JobRead])
def list_jobs(
    job_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    """List recent background task executions."""
    query = db.query(BackgroundJob)
    if job_type:
        query = query.filter(BackgroundJob.job_type == job_type)
    if status:
        query = query.filter(BackgroundJob.status == status)
    jobs = query.order_by(BackgroundJob.created_at.desc()).limit(limit).all()
    return jobs


@router.get("/{job_id}", response_model=JobRead)
def get_job_status(job_id: str, db: Session = Depends(get_db)):
    """Get the status and payload of a specific job."""
    job = db.query(BackgroundJob).filter(BackgroundJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found.")
    return job
