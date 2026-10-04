"""
app/modules/reporting/service.py
Service layer for compiling and exporting SEBI BRSR reports and audit packs.
"""
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from app.modules.reporting.disclosure_mapper import compile_brsr_report
from app.modules.reporting.renderers import (
    render_brsr_csv,
    render_brsr_html,
    render_brsr_pdf_bytes,
    generate_audit_pack_zip,
)
from app.modules.audit.service import AuditService
from app.modules.evidence.models import EvidenceFile


class ReportingService:
    def __init__(self, db: Session):
        self.db = db

    def get_report_data(
        self,
        entity_id: str,
        period_id: str,
        report_type: str = "BRSR_FULL",
    ) -> Dict[str, Any]:
        resp = compile_brsr_report(self.db, entity_id, period_id, report_type)
        return resp.model_dump()

    def export_csv(self, entity_id: str, period_id: str, report_type: str = "BRSR_FULL") -> str:
        data = self.get_report_data(entity_id, period_id, report_type)
        return render_brsr_csv(data)

    def export_html(self, entity_id: str, period_id: str, report_type: str = "BRSR_FULL") -> str:
        data = self.get_report_data(entity_id, period_id, report_type)
        return render_brsr_html(data)

    def export_pdf(self, entity_id: str, period_id: str, report_type: str = "BRSR_FULL") -> bytes:
        data = self.get_report_data(entity_id, period_id, report_type)
        return render_brsr_pdf_bytes(data)

    def export_audit_pack(self, entity_id: str, period_id: str) -> bytes:
        report_data = self.get_report_data(entity_id, period_id, "BRSR_FULL")
        
        # Evidence manifest
        files = self.db.query(EvidenceFile).filter(EvidenceFile.is_deleted == False).all()
        manifest = [
            {
                "file_name": f.original_name,
                "mime_type": f.mime_type,
                "sha256": f.sha256,
                "size_bytes": f.size_bytes,
                "storage_key": f.storage_key,
            }
            for f in files
        ]

        # Audit chain proof
        audit_service = AuditService(self.db)
        chain_res = audit_service.verify_ledger()
        proof = chain_res.model_dump()

        return generate_audit_pack_zip(report_data, manifest, proof)
