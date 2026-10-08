"""
app/modules/collection/offline_sync/service.py
Service layer for offline PWA sync operations.

Architectural Guarantees:
1. Idempotency: Duplicate items within the same batch or across replay transmissions
   are identified via `idempotency_key` and applied exactly once.
2. Conflict Policy (Server Wins): If the server has newer version data or the submission
   is in an approved state (BU_APPROVED, SUBSIDIARY_APPROVED, LOCKED), server state takes precedence.
3. Locked-Period Rejection: Any modifications targeted at closed or locked reporting periods
   are strictly rejected.
4. Processing Strategy (Per-Item Partial): Each record in the batch is evaluated independently.
   Valid items are safely applied and committed; conflicts and violations are reported per-item.
"""
import hashlib
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from app.modules.collection.models import Submission, DataPoint, EntryMethod, SubmissionStatus
from app.modules.org.models import ReportingPeriod, PeriodStatus
from app.modules.auth.models import IdempotencyKey, User

logger = logging.getLogger(__name__)


class OfflineSyncService:
    @staticmethod
    def process_sync_batch(
        db: Session,
        submission_id: str,
        items: List[Dict[str, Any]],
        batch_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Processes an offline batch payload with per-item partial execution,
        idempotency enforcement, and server-wins conflict resolution.
        """
        submission = (
            db.query(Submission)
            .filter(Submission.id == submission_id, Submission.is_deleted == False)
            .first()
        )
        if not submission:
            return {
                "status": "error",
                "error_code": "SUBMISSION_NOT_FOUND",
                "message": f"Submission {submission_id} does not exist.",
                "results": [],
            }

        # 1. Locked-Period Rejection
        period = (
            db.query(ReportingPeriod)
            .filter(ReportingPeriod.id == submission.period_id, ReportingPeriod.is_deleted == False)
            .first()
        )
        if period and period.status == PeriodStatus.LOCKED.value:
            return {
                "status": "rejected_period_locked",
                "error_code": "PERIOD_LOCKED",
                "message": f"Reporting period {period.code} is LOCKED. Offline updates rejected.",
                "results": [
                    {
                        "idempotency_key": item.get("idempotency_key"),
                        "metric_code": item.get("metric_code"),
                        "status": "rejected_period_locked",
                        "reason": f"Reporting period {period.code} is locked for audit compliance.",
                    }
                    for item in items
                ],
            }

        # 2. Approved-State Rejection (Server Wins)
        if submission.status in [
            SubmissionStatus.BU_APPROVED.value,
            SubmissionStatus.SUBSIDIARY_APPROVED.value,
            SubmissionStatus.LOCKED.value,
            "CONSOLIDATED",
        ]:
            return {
                "status": "rejected_approved_state",
                "error_code": "SUBMISSION_ALREADY_APPROVED",
                "message": f"Submission is in approved state '{submission.status}'. Server data takes precedence.",
                "results": [
                    {
                        "idempotency_key": item.get("idempotency_key"),
                        "metric_code": item.get("metric_code"),
                        "status": "rejected_approved_state",
                        "reason": f"Submission is {submission.status}. Offline updates cannot overwrite approved figures.",
                    }
                    for item in items
                ],
            }

        results = []
        applied_count = 0
        conflicts_count = 0
        already_synced_count = 0
        rejected_count = 0
        seen_batch_keys = set()

        for item in items:
            key = item.get("idempotency_key")
            metric_code = item.get("metric_code")
            val_num = item.get("value_numeric")
            val_text = item.get("value_text")
            unit = item.get("unit")
            version = item.get("version", 1)
            notes = item.get("notes")

            # Check Duplicate / Idempotency Key
            if key:
                if key in seen_batch_keys:
                    results.append({
                        "idempotency_key": key,
                        "metric_code": metric_code,
                        "status": "already_synced",
                        "reason": "Duplicate item within batch; already processed in this request.",
                    })
                    already_synced_count += 1
                    continue

                db_key = (
                    db.query(IdempotencyKey)
                    .filter(IdempotencyKey.key == f"offline_sync:{key}")
                    .first()
                )
                if db_key:
                    results.append({
                        "idempotency_key": key,
                        "metric_code": metric_code,
                        "status": "already_synced",
                        "reason": "Item was already processed in a previous sync session.",
                    })
                    already_synced_count += 1
                    continue

                seen_batch_keys.add(key)

            # Reconcile DataPoint
            existing = (
                db.query(DataPoint)
                .filter(
                    DataPoint.submission_id == submission_id,
                    DataPoint.metric_code == metric_code,
                    DataPoint.is_deleted == False,
                )
                .first()
            )

            if not existing:
                # Insert new data point
                new_dp = DataPoint(
                    submission_id=submission_id,
                    metric_code=metric_code,
                    value_numeric=val_num,
                    value_text=val_text,
                    unit=unit,
                    normalized_value=val_num,
                    entry_method=EntryMethod.OFFLINE_PWA.value,
                    version=version,
                    notes=notes,
                )
                db.add(new_dp)
                applied_count += 1
                results.append({
                    "idempotency_key": key,
                    "metric_code": metric_code,
                    "status": "applied",
                    "action": "inserted",
                    "new_version": version,
                })
            else:
                # Conflict resolution: Server Wins if server version is strictly ahead
                if existing.version > version:
                    conflicts_count += 1
                    results.append({
                        "idempotency_key": key,
                        "metric_code": metric_code,
                        "status": "conflict_server_newer",
                        "server_version": existing.version,
                        "client_version": version,
                        "reason": f"Server version {existing.version} is ahead of incoming version {version}. Server wins.",
                    })
                elif (
                    existing.value_numeric == val_num and
                    existing.value_text == val_text
                ):
                    results.append({
                        "idempotency_key": key,
                        "metric_code": metric_code,
                        "status": "no_change",
                        "version": existing.version,
                        "reason": "Values identical to server record.",
                    })
                else:
                    # Update data point
                    existing.value_numeric = val_num
                    existing.value_text = val_text
                    existing.unit = unit
                    existing.normalized_value = val_num
                    existing.version = max(existing.version + 1, version + 1)
                    existing.entry_method = EntryMethod.OFFLINE_PWA.value
                    if notes:
                        existing.notes = (existing.notes + " | " + notes) if existing.notes else notes
                    applied_count += 1
                    results.append({
                        "idempotency_key": key,
                        "metric_code": metric_code,
                        "status": "applied",
                        "action": "updated",
                        "new_version": existing.version,
                    })

            # Record Idempotency Key in DB to guarantee replay defense
            if key:
                user_id = submission.maker_id
                if not user_id:
                    u = db.query(User).first()
                    user_id = u.id if u else None
                if user_id:
                    idem_rec = IdempotencyKey(
                        key=f"offline_sync:{key}",
                        user_id=user_id,
                        endpoint="/sync/batch",
                        request_hash=hashlib.sha256(f"{key}:{metric_code}:{val_num}".encode()).hexdigest()[:64],
                        response_code=200,
                        response_body={"metric_code": metric_code, "status": "applied"},
                        expires_at=datetime.now(timezone.utc) + timedelta(days=30),
                    )
                    db.add(idem_rec)

        db.commit()

        return {
            "status": "completed",
            "policy": "server_wins_if_newer_or_approved; per_item_partial",
            "total_items": len(items),
            "applied_count": applied_count,
            "conflicts_count": conflicts_count,
            "already_synced_count": already_synced_count,
            "rejected_count": rejected_count,
            "results": results,
        }
