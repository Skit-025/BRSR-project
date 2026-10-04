"""
app/modules/audit/service.py
Service layer for logging audit events and verifying cryptographic chain integrity.
"""
from typing import List, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.modules.audit.models import AuditLog
from app.modules.audit.schemas import AuditLogCreate, ChainVerificationResult
from app.modules.audit.chain import compute_audit_hash, verify_chain_integrity


class AuditService:
    def __init__(self, db: Session):
        self.db = db

    def log_event(self, event_in: AuditLogCreate) -> AuditLog:
        """
        Appends an immutable audit event to the cryptographic ledger.
        Fetches the previous record to link the SHA-256 hash chain.
        """
        last_entry = (
            self.db.query(AuditLog)
            .order_by(AuditLog.sequence_number.desc())
            .first()
        )
        prev_hash = last_entry.record_hash if last_entry else ("0" * 64)
        next_seq = (last_entry.sequence_number + 1) if (last_entry and last_entry.sequence_number) else 1
        now_dt = datetime.now(timezone.utc)

        record_hash = compute_audit_hash(
            sequence=next_seq,
            action=event_in.action,
            actor_id=event_in.actor_id,
            target_type=event_in.target_type,
            target_id=event_in.target_id,
            changes=event_in.changes,
            timestamp_iso=now_dt.isoformat(),
            prev_hash=prev_hash,
        )

        record = AuditLog(
            sequence_number=next_seq,
            action=event_in.action,
            actor_id=event_in.actor_id,
            actor_email=event_in.actor_email,
            actor_role=event_in.actor_role,
            target_type=event_in.target_type,
            target_id=event_in.target_id,
            changes=event_in.changes,
            details=event_in.details,
            ip_address=event_in.ip_address,
            prev_hash=prev_hash,
            record_hash=record_hash,
            created_at=now_dt,
        )
        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)
        return record

    def list_events(
        self,
        target_type: Optional[str] = None,
        target_id: Optional[str] = None,
        actor_id: Optional[str] = None,
        action: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> List[AuditLog]:
        query = self.db.query(AuditLog)
        if target_type:
            query = query.filter(AuditLog.target_type == target_type)
        if target_id:
            query = query.filter(AuditLog.target_id == target_id)
        if actor_id:
            query = query.filter(AuditLog.actor_id == actor_id)
        if action:
            query = query.filter(AuditLog.action == action)

        return (
            query.order_by(AuditLog.sequence_number.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )

    def verify_ledger(self) -> ChainVerificationResult:
        """Verifies the unbroken cryptographic chain across all audit records."""
        records = (
            self.db.query(AuditLog)
            .order_by(AuditLog.sequence_number.asc())
            .all()
        )
        if not records:
            return ChainVerificationResult(
                is_valid=True,
                total_records_checked=0,
                last_verified_hash=None,
            )

        is_valid = verify_chain_integrity(records)
        return ChainVerificationResult(
            is_valid=is_valid,
            total_records_checked=len(records),
            last_verified_hash=records[-1].record_hash if records else None,
            error_message=None if is_valid else "Hash chain mismatch detected! Tampering suspected.",
        )
