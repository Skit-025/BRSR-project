from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.modules.collection.models import SubmissionStatus, ValueStatus, EntryMethod

class DataPointInput(BaseModel):
    metric_code: str
    value_numeric: Optional[float] = None
    value_text: Optional[str] = None
    unit: str
    status: ValueStatus = ValueStatus.ACTUAL
    entry_method: EntryMethod = EntryMethod.MANUAL_FORM
    notes: Optional[str] = None

class DataPointRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    submission_id: str
    metric_code: str
    value_numeric: Optional[float] = None
    value_text: Optional[str] = None
    unit: str
    normalized_value: Optional[float] = None
    status: str
    entry_method: str
    version: int
    notes: Optional[str] = None

class SubmissionSaveRequest(BaseModel):
    entity_id: str
    period_id: str
    expected_version: Optional[int] = None  # Optimistic concurrency check
    data_points: List[DataPointInput]
    notes: Optional[str] = None

class SubmissionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    entity_id: str
    period_id: str
    status: str
    version: int
    maker_id: Optional[str] = None
    submitted_at: Optional[datetime] = None
    notes: Optional[str] = None
    data_points: List[DataPointRead] = []

class SubmitPackResponse(BaseModel):
    submission_id: str
    status: str
    submitted_at: datetime
    message: str
