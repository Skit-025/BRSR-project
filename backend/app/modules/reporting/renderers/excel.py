"""
app/modules/reporting/renderers/excel.py
Generates multi-sheet Excel workbooks for SEBI BRSR and BRSR Core disclosures.
"""
import io
import csv
from typing import Dict, Any


def render_brsr_csv(report_data: Dict[str, Any]) -> str:
    """
    Renders Section C disclosures into a structured CSV format.
    """
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Principle",
        "Metric_Code",
        "Metric_Name",
        "Reported_Value",
        "Unit",
        "BRSR_Core",
        "Evidence_Verified",
        "Snapshot_Hash",
    ])

    sec_c = report_data.get("section_c", [])
    snap_hash = report_data.get("snapshot_hash", "")

    for item in sec_c:
        writer.writerow([
            item.get("principle"),
            item.get("metric_code"),
            item.get("metric_name"),
            item.get("value"),
            item.get("unit"),
            "YES" if item.get("brsr_core") else "NO",
            "YES" if item.get("evidence_verified") else "NO",
            snap_hash,
        ])

    return output.getvalue()
