"""
app/pipelines/ingestion/steps/store_evidence.py
P1 Stage 2: Store uploaded evidence file and compute its SHA-256 fingerprint.
Delegates to the Evidence module's storage and integrity layers.
"""
import logging
from sqlalchemy.orm import Session

from app.modules.evidence.storage import EvidenceStorage
from app.modules.evidence.models import EvidenceFile, EvidenceStatus
from app.core.hashing import sha256_file_object
from app.core.time import utcnow

logger = logging.getLogger(__name__)
_storage = EvidenceStorage()


def store_evidence(
    db: Session,
    submission_id: str,
    entity_id: str,
    period_id: str,
    metric_codes: list[str],
    filename: str,
    file_obj,              # file-like object (UploadFile.file)
    content_type: str,
    uploaded_by: str,
) -> EvidenceFile:
    """
    Upload file to object storage, compute SHA-256, persist EvidenceFile record.

    Returns:
        EvidenceFile ORM object (committed).
    """
    # 1. Compute hash from stream (rewinds file after hashing)
    sha256 = sha256_file_object(file_obj)

    # 2. Upload to MinIO / local storage
    storage_path = _storage.upload(
        file_obj      = file_obj,
        filename      = filename,
        content_type  = content_type,
        entity_id     = entity_id,
        period_id     = period_id,
    )

    # 3. Persist metadata
    ev = EvidenceFile(
        submission_id    = submission_id,
        entity_id        = entity_id,
        period_id        = period_id,
        metric_codes     = metric_codes,
        filename         = filename,
        storage_path     = storage_path,
        content_type     = content_type,
        size_bytes       = _get_file_size(file_obj),
        sha256_at_upload = sha256,
        status           = EvidenceStatus.UPLOADED.value,
        uploaded_by      = uploaded_by,
        uploaded_at      = utcnow(),
    )
    db.add(ev)
    db.commit()
    db.refresh(ev)

    logger.info(
        "Evidence stored: id=%s filename=%s sha256=%s…",
        ev.id, filename, sha256[:12],
    )
    return ev


def _get_file_size(file_obj) -> int:
    pos = file_obj.tell()
    file_obj.seek(0, 2)
    size = file_obj.tell()
    file_obj.seek(pos)
    return size
