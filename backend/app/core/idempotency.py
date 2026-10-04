"""
app/core/idempotency.py
Idempotency key management for preventing duplicate mutations.
Stores processed keys in PostgreSQL to survive restarts.

Usage (in a router):
    @router.post("/submit/{id}")
    def submit(id: str, x_idempotency_key: str = Header(None), db = Depends(get_db)):
        check_idempotency(db, x_idempotency_key, namespace="workflow.submit")
        ...do work...
        mark_idempotency_done(db, x_idempotency_key, namespace="workflow.submit")
"""
import uuid
import hashlib
from datetime import datetime, timezone, timedelta
from typing import Optional

from sqlalchemy import Column, String, DateTime, Text
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.db.base import Base


# ── ORM model (lightweight — no FK constraints) ───────────────────
class IdempotencyRecord(Base):
    __tablename__ = "idempotency_records"

    key        = Column(String(128), primary_key=True)
    namespace  = Column(String(128), nullable=False)
    response   = Column(Text, nullable=True)   # JSON snapshot of response
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime(timezone=True), nullable=False)


# ── Helpers ───────────────────────────────────────────────────────
def _build_key(raw_key: str, namespace: str) -> str:
    """Namespace + hash the raw key to produce a stable compound key."""
    h = hashlib.sha256(f"{namespace}:{raw_key}".encode()).hexdigest()[:64]
    return h


def check_idempotency(
    db: Session,
    idempotency_key: Optional[str],
    namespace: str,
    ttl_hours: int = 24,
) -> Optional[str]:
    """
    If the key has been processed before, raise HTTP 409 with cached response.
    If not seen, return None (caller should proceed).
    If idempotency_key is None/empty, skip check entirely.
    """
    if not idempotency_key:
        return None

    compound = _build_key(idempotency_key, namespace)
    record   = db.query(IdempotencyRecord).filter(
        IdempotencyRecord.key == compound
    ).first()

    if record:
        # Key already processed
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "error":           "DUPLICATE_REQUEST",
                "detail":          "This request has already been processed.",
                "idempotency_key": idempotency_key,
                "cached_response": record.response,
            },
        )
    return compound


def mark_idempotency_done(
    db: Session,
    idempotency_key: Optional[str],
    namespace: str,
    response_json: Optional[str] = None,
    ttl_hours: int = 24,
) -> None:
    """Mark an idempotency key as processed with optional response snapshot."""
    if not idempotency_key:
        return

    compound = _build_key(idempotency_key, namespace)
    expires  = datetime.now(timezone.utc) + timedelta(hours=ttl_hours)
    record   = IdempotencyRecord(
        key       = compound,
        namespace = namespace,
        response  = response_json,
        expires_at= expires,
    )
    db.add(record)
    db.commit()


def purge_expired_keys(db: Session) -> int:
    """Delete expired idempotency records. Returns count deleted."""
    now = datetime.now(timezone.utc)
    deleted = db.query(IdempotencyRecord).filter(
        IdempotencyRecord.expires_at < now
    ).delete(synchronize_session=False)
    db.commit()
    return deleted
