"""
app/modules/metrics/period_service.py
Service for managing Indian FY reporting periods, month/quarter deadlines, and locked state checks.
"""
from typing import List, Optional
from datetime import date
from sqlalchemy.orm import Session
from app.modules.org.models import ReportingPeriod, PeriodStatus, PeriodType
from app.modules.org.repository import OrgRepository


class PeriodService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = OrgRepository(db)

    def is_period_locked(self, period_id: str) -> bool:
        """Checks if a period is locked to prevent mutations."""
        period = self.repo.get_period_by_id(period_id)
        if not period:
            return False
        return period.status == PeriodStatus.LOCKED.value

    def get_active_periods(self) -> List[ReportingPeriod]:
        """Fetch all currently open periods accepting submissions."""
        return (
            self.db.query(ReportingPeriod)
            .filter(
                ReportingPeriod.status == PeriodStatus.OPEN.value,
                ReportingPeriod.is_deleted == False,
            )
            .order_by(ReportingPeriod.start_date.desc())
            .all()
        )

    def lock_period(self, period_id: str) -> ReportingPeriod:
        """Locks a period after final review and audit verification."""
        period = self.repo.get_period_by_id(period_id)
        if not period:
            raise ValueError(f"Period '{period_id}' not found.")
        period.status = PeriodStatus.LOCKED.value
        self.db.commit()
        self.db.refresh(period)
        return period

    def unlock_period_for_restatement(self, period_id: str) -> ReportingPeriod:
        """Allows reopening for audited restatements under manager authority."""
        period = self.repo.get_period_by_id(period_id)
        if not period:
            raise ValueError(f"Period '{period_id}' not found.")
        period.status = PeriodStatus.EXTENDED.value
        self.db.commit()
        self.db.refresh(period)
        return period
