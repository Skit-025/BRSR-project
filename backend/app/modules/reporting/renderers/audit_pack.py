"""
app/modules/reporting/renderers/audit_pack.py
Audit Pack generator: Bundles report disclosures, SHA-256 evidence manifest, and cryptographic chain proofs.
"""
import io
import json
import zipfile
from typing import Dict, Any


def generate_audit_pack_zip(
    report_data: Dict[str, Any],
    evidence_manifest: list,
    chain_proof: Dict[str, Any],
) -> bytes:
    """
    Creates an in-memory ZIP archive containing the complete auditor dossier.
    """
    zip_buffer = io.BytesIO()

    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        # 1. Report Disclosures JSON
        zf.writestr(
            "disclosures_report.json",
            json.dumps(report_data, indent=2, default=str),
        )

        # 2. Evidence SHA-256 Manifest
        zf.writestr(
            "evidence_manifest.json",
            json.dumps(evidence_manifest, indent=2, default=str),
        )

        # 3. Cryptographic Chain Verification Certificate
        zf.writestr(
            "audit_chain_proof.json",
            json.dumps(chain_proof, indent=2, default=str),
        )

        # 4. Auditor Readme
        readme = f"""======================================================
MEIL ESG-BRSR REASONABLE ASSURANCE AUDIT PACK
======================================================
Period: {report_data.get('section_a', {}).get('financial_year', 'FY2025-26')}
Company: {report_data.get('section_a', {}).get('company_name', 'MEIL')}
Snapshot Hash: {report_data.get('snapshot_hash', '')}
Generated At: {report_data.get('generated_at', '')}

This archive contains:
1. disclosures_report.json - Complete SEBI BRSR Section A, B, and C figures
2. evidence_manifest.json - List of substantiating source files with SHA-256 hashes
3. audit_chain_proof.json - Cryptographic hash chain validation certificate
======================================================
"""
        zf.writestr("README_AUDITOR.txt", readme)

    zip_buffer.seek(0)
    return zip_buffer.getvalue()
