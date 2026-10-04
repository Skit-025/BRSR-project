"""
app/pipelines/reporting/steps/render_documents.py
Step 3 – Render the BRSR report in requested formats (JSON, CSV, PDF-ready HTML).
"""
from __future__ import annotations

import csv
import io
import json
import logging
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any, Dict, List

if TYPE_CHECKING:
    from sqlalchemy.orm import Session
    from app.pipelines.reporting.pipeline import ReportingContext

logger = logging.getLogger(__name__)


def _render_json(ctx: "ReportingContext") -> str:
    """Produce a structured JSON string of the full disclosure tree."""
    report = {
        "report_id": ctx.run_id,
        "period_id": ctx.period_id,
        "root_entity_id": ctx.root_entity_id,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "snapshot": ctx.snapshot_meta,
        "sections": ctx.disclosure_tree,
    }
    return json.dumps(report, indent=2, default=str)


def _render_csv(ctx: "ReportingContext") -> str:
    """Flatten disclosure tree into a CSV string."""
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(
        ["Section", "Sub-Section", "Code", "Label", "Value", "Unit", "Value Type", "Status"]
    )
    for section in ctx.disclosure_tree:
        for disc in section.get("disclosures", []):
            writer.writerow(
                [
                    section.get("section", ""),
                    disc.get("sub_section", ""),
                    disc.get("code", ""),
                    disc.get("label", ""),
                    disc.get("reported_value", ""),
                    disc.get("unit", ""),
                    disc.get("value_type", ""),
                    disc.get("status", ""),
                ]
            )
    return buf.getvalue()


def _render_html(ctx: "ReportingContext") -> str:
    """Produce a print-ready HTML document for the BRSR report."""
    rows_html = ""
    for section in ctx.disclosure_tree:
        rows_html += f'<tr><th colspan="5" style="background:#1e293b;color:#fff;text-align:left;padding:8px">{section["section"]}</th></tr>\n'
        for disc in section.get("disclosures", []):
            val = disc.get("reported_value", "")
            unit = disc.get("unit") or ""
            rows_html += (
                f"<tr>"
                f'<td>{disc.get("sub_section","")}</td>'
                f'<td><b>{disc.get("code","")}</b></td>'
                f'<td>{disc.get("label","")}</td>'
                f'<td style="text-align:right">{val} {unit}</td>'
                f'<td>{disc.get("status","")}</td>'
                f"</tr>\n"
            )

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>BRSR Report — {ctx.period_id}</title>
<style>
  body {{ font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; color: #1e293b; }}
  h1 {{ background: linear-gradient(135deg,#1e3a5f,#0ea5e9); color:#fff; padding:20px; border-radius:8px; }}
  table {{ border-collapse: collapse; width: 100%; margin-top: 20px; }}
  th,td {{ border: 1px solid #e2e8f0; padding: 6px 10px; }}
  tr:nth-child(even) {{ background: #f8fafc; }}
</style>
</head>
<body>
<h1>MEIL ESG-BRSR Report</h1>
<p><strong>Period:</strong> {ctx.period_id} &nbsp;|&nbsp;
   <strong>Entity:</strong> {ctx.root_entity_id} &nbsp;|&nbsp;
   <strong>Generated:</strong> {datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")}</p>
<table>
<thead>
<tr>
  <th>Sub-Section</th><th>Code</th><th>Disclosure</th><th>Value</th><th>Status</th>
</tr>
</thead>
<tbody>
{rows_html}
</tbody>
</table>
</body>
</html>"""


def render_documents(ctx: "ReportingContext", db: "Session") -> None:
    """
    Render the disclosure tree into all requested output formats and
    store results in ctx.rendered_outputs.
    """
    outputs: Dict[str, str] = {}

    formats = ctx.output_formats or ["json", "csv", "html"]

    if "json" in formats:
        outputs["json"] = _render_json(ctx)
        logger.debug("JSON render complete: %d chars", len(outputs["json"]))

    if "csv" in formats:
        outputs["csv"] = _render_csv(ctx)
        logger.debug("CSV render complete: %d chars", len(outputs["csv"]))

    if "html" in formats:
        outputs["html"] = _render_html(ctx)
        logger.debug("HTML render complete: %d chars", len(outputs["html"]))

    ctx.rendered_outputs = outputs
    logger.info("Documents rendered in formats: %s", list(outputs.keys()))
