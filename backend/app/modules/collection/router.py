"""
app/modules/collection/router.py
Data Collection & Monthly Submissions Router.
Supports manual form autosave, spreadsheet bulk upload (.xlsx, .csv), and freeze submission.
"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.modules.auth.models import User
from app.modules.auth.router import get_current_active_user
from app.modules.collection.models import Submission
from app.modules.collection.schemas import (
    SubmissionRead,
    SubmissionSaveRequest,
    SubmitPackResponse
)
from app.modules.collection.service import (
    get_or_create_submission,
    save_draft_submission,
    submit_submission_pack,
    process_spreadsheet_upload
)
from app.security.rate_limit import upload_rate_limit
from app.security.rbac import Permission, has_permission

router = APIRouter(prefix="/collection", tags=["Monthly Data Collection & Sync"])


@router.get("/pack/{entity_id}/{period_id}", response_model=SubmissionRead)
def get_submission_pack(
    entity_id: str,
    period_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Retrieves the monthly submission pack and all recorded data points for an entity and period."""
    submission = get_or_create_submission(db, entity_id, period_id, maker_id=str(current_user.id))
    return submission


@router.post("/save", response_model=SubmissionRead)
def save_pack(
    save_req: SubmissionSaveRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Autosaves draft numbers into the monthly pack (F08).
    Enforces optimistic concurrency (409 Conflict on stale version) and normalizes units.
    """
    if not (has_permission(current_user.role, Permission.FORM_SUBMIT) or has_permission(current_user.role, Permission.SUBMISSION_CREATE)):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission 'form:submit' required to edit data points."
        )
    submission = save_draft_submission(db, save_req, user_id=str(current_user.id))
    return submission


@router.post("/submit/{submission_id}", response_model=SubmitPackResponse)
def submit_pack(
    submission_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Freezes submission pack and moves it to SUBMITTED state for reviewer queue."""
    if not has_permission(current_user.role, Permission.SUBMISSION_SUBMIT):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission 'submission:submit' required to submit packs."
        )
    submission = submit_submission_pack(db, submission_id, user_id=str(current_user.id))
    return SubmitPackResponse(
        submission_id=submission.id,
        status=submission.status,
        submitted_at=submission.submitted_at,
        message="Monthly ESG submission pack successfully frozen and submitted for review."
    )


@router.post(
    "/upload-spreadsheet/{entity_id}/{period_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(upload_rate_limit)],
    summary="Upload bulk data via spreadsheet (alias)"
)
@router.post(
    "/upload/{entity_id}/{period_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(upload_rate_limit)],
    summary="Upload bulk data via spreadsheet (XLSX, XLS, CSV)"
)
async def upload_spreadsheet(
    entity_id: str,
    period_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Upload an Excel or CSV spreadsheet of ESG measurements.
    Automatically parses metric codes, normalizes units, validates numeric values,
    and updates the entity's monthly submission pack.
    """
    if not (has_permission(current_user.role, Permission.SPREADSHEET_UPLOAD) or has_permission(current_user.role, Permission.EVIDENCE_UPLOAD)):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission 'spreadsheet:upload' required to upload data spreadsheets."
        )
    file_bytes = await file.read()
    result = process_spreadsheet_upload(
        db=db,
        entity_id=entity_id,
        period_id=period_id,
        file_bytes=file_bytes,
        filename=file.filename or "upload.xlsx",
        user_id=str(current_user.id)
    )
    return result
