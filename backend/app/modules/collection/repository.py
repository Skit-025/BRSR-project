"""
app/modules/collection/repository.py
Repository pattern for Submission packs and DataPoints.
"""
from typing import List, Optional
from sqlalchemy.orm import Session
from app.modules.collection.models import Submission, DataPoint


class CollectionRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_submission_by_id(self, submission_id: str) -> Optional[Submission]:
        return (
            self.db.query(Submission)
            .filter(Submission.id == submission_id, Submission.is_deleted == False)
            .first()
        )

    def get_by_entity_and_period(self, entity_id: str, period_id: str) -> Optional[Submission]:
        return (
            self.db.query(Submission)
            .filter(
                Submission.entity_id == entity_id,
                Submission.period_id == period_id,
                Submission.is_deleted == False,
            )
            .first()
        )

    def list_submissions(
        self,
        entity_id: Optional[str] = None,
        period_id: Optional[str] = None,
        status: Optional[str] = None,
    ) -> List[Submission]:
        query = self.db.query(Submission).filter(Submission.is_deleted == False)
        if entity_id:
            query = query.filter(Submission.entity_id == entity_id)
        if period_id:
            query = query.filter(Submission.period_id == period_id)
        if status:
            query = query.filter(Submission.status == status)
        return query.order_by(Submission.updated_at.desc()).all()

    def create_submission(self, submission: Submission) -> Submission:
        self.db.add(submission)
        self.db.commit()
        self.db.refresh(submission)
        return submission

    def update_submission(self, submission: Submission) -> Submission:
        self.db.commit()
        self.db.refresh(submission)
        return submission

    def get_datapoints_for_submission(self, submission_id: str) -> List[DataPoint]:
        return (
            self.db.query(DataPoint)
            .filter(DataPoint.submission_id == submission_id, DataPoint.is_deleted == False)
            .all()
        )
