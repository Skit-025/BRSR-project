"""
app/modules/evidence/repository.py
Repository pattern for Evidence file records and DataPoint linkages.
"""
from typing import List, Optional
from sqlalchemy.orm import Session
from app.modules.evidence.models import EvidenceFile, EvidenceLink


class EvidenceRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, evidence_id: str) -> Optional[EvidenceFile]:
        return (
            self.db.query(EvidenceFile)
            .filter(EvidenceFile.id == evidence_id, EvidenceFile.is_deleted == False)
            .first()
        )

    def get_by_sha256(self, sha256_hash: str) -> Optional[EvidenceFile]:
        return (
            self.db.query(EvidenceFile)
            .filter(EvidenceFile.sha256 == sha256_hash, EvidenceFile.is_deleted == False)
            .first()
        )

    def list_files(self, uploader_id: Optional[str] = None) -> List[EvidenceFile]:
        query = self.db.query(EvidenceFile).filter(EvidenceFile.is_deleted == False)
        if uploader_id:
            query = query.filter(EvidenceFile.uploader_id == uploader_id)
        return query.order_by(EvidenceFile.uploaded_at.desc()).all()

    def create(self, evidence: EvidenceFile) -> EvidenceFile:
        self.db.add(evidence)
        self.db.commit()
        self.db.refresh(evidence)
        return evidence

    def link_to_datapoint(self, evidence_id: str, data_point_id: str, page_ref: Optional[str] = None, notes: Optional[str] = None) -> EvidenceLink:
        link = EvidenceLink(
            evidence_id=evidence_id,
            data_point_id=data_point_id,
            page_ref=page_ref,
            notes=notes,
        )
        self.db.add(link)
        self.db.commit()
        self.db.refresh(link)
        return link

    def get_evidence_for_datapoint(self, data_point_id: str) -> List[EvidenceFile]:
        return (
            self.db.query(EvidenceFile)
            .join(EvidenceLink, EvidenceFile.id == EvidenceLink.evidence_id)
            .filter(EvidenceLink.data_point_id == data_point_id, EvidenceFile.is_deleted == False)
            .all()
        )
