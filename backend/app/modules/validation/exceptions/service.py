"""
app/modules/validation/exceptions/service.py
Service for creating, escalating, and resolving validation exceptions.
"""
from typing import List, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.modules.validation.exceptions.models import ValidationException, ExceptionStatus


class ValidationExceptionService:
    def __init__(self, db: Session):
        self.db = db

    def raise_exception(
        self,
        submission_id: str,
        metric_code: str,
        rule_id: str,
        severity: str,
        description: str,
        raised_by: str = "SYSTEM_RULE",
        assigned_to: Optional[str] = None,
    ) -> ValidationException:
        exc = ValidationException(
            submission_id=submission_id,
            metric_code=metric_code,
            rule_id=rule_id,
            severity=severity,
            description=description,
            raised_by=raised_by,
            assigned_to=assigned_to,
            status=ExceptionStatus.OPEN.value,
        )
        self.db.add(exc)
        self.db.commit()
        self.db.refresh(exc)
        return exc

    def list_exceptions(
        self,
        submission_id: Optional[str] = None,
        status: Optional[str] = None,
        assigned_to: Optional[str] = None,
    ) -> List[ValidationException]:
        query = self.db.query(ValidationException).filter(ValidationException.is_deleted == False)
        if submission_id:
            query = query.filter(ValidationException.submission_id == submission_id)
        if status:
            query = query.filter(ValidationException.status == status)
        if assigned_to:
            query = query.filter(ValidationException.assigned_to == assigned_to)
        return query.order_by(ValidationException.created_at.desc()).all()

    def resolve_exception(
        self,
        exception_id: str,
        resolution_notes: str,
        resolved_by: str,
        waive: bool = False,
    ) -> ValidationException:
        exc = (
            self.db.query(ValidationException)
            .filter(ValidationException.id == exception_id, ValidationException.is_deleted == False)
            .first()
        )
        if not exc:
            raise ValueError(f"Validation exception '{exception_id}' not found.")

        exc.status = ExceptionStatus.WAIVED.value if waive else ExceptionStatus.RESOLVED.value
        exc.resolution_notes = resolution_notes
        exc.resolved_by = resolved_by
        exc.resolved_at = datetime.now(timezone.utc)
        self.db.commit()
        self.db.refresh(exc)
        return exc
