"""
app/modules/evidence/__init__.py
Evidence vault and document linkage module.
"""
from app.modules.evidence.models import EvidenceFile, EvidenceLink, ScanStatus
from app.modules.evidence.router import router

__all__ = ["EvidenceFile", "EvidenceLink", "ScanStatus", "router"]
