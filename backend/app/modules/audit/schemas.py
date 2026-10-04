"""
app/modules/audit/schemas.py
Pydantic schemas for audit log querying and verification responses.
"""
from typing import Optional, Dict, Any, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class AuditLogCreate(BaseModel):
    action: str
    actor_id: Optional[str] = None
    actor_email: Optional[str] = None
    actor_role: Optional[str] = None
    target_type: str
    target_id: Optional[str] = None
    changes: Optional[Dict[str, Any]] = None
    details: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None


class AuditLogRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    sequence_number: Optional[int] = None
    action: str
    actor_id: Optional[str] = None
    actor_email: Optional[str] = None
    actor_role: Optional[str] = None
    target_type: str
    target_id: Optional[str] = None
    changes: Optional[Dict[str, Any]] = None
    details: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    prev_hash: str
    record_hash: str
    created_at: datetime


class ChainVerificationResult(BaseModel):
    is_valid: bool
    total_records_checked: int
    last_verified_hash: Optional[str] = None
    error_message: Optional[str] = None
