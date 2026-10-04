from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.modules.workflow.models import ReviewDecision

class ReviewActionRequest(BaseModel):
    decision: ReviewDecision
    comment: Optional[str] = None
    reviewer_id: str

class ReviewRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    submission_id: str
    stage: str
    reviewer_id: str
    decision: str
    comment: Optional[str] = None
    decided_at: datetime

class ReviewQueueItem(BaseModel):
    submission_id: str
    entity_id: str
    entity_code: str
    entity_name: str
    period_id: str
    period_code: str
    status: str
    maker_id: Optional[str] = None
    submitted_at: Optional[datetime] = None
    version: int

class PeriodLockResponse(BaseModel):
    period_id: str
    period_code: str
    status: str
    snapshot_hash: str
    message: str
