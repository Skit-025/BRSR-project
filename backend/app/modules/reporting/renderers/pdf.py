"""
app/modules/reporting/renderers/pdf.py
Compiles HTML templates and renders official PDF disclosure documents.
"""
import os
from typing import Dict, Any


def render_brsr_html(report_data: Dict[str, Any]) -> str:
    """
    Renders structured report dictionary into standalone HTML document.
    """
    curr_dir = os.path.dirname(__file__)
    tmpl_dir = os.path.abspath(os.path.join(curr_dir, "..", "templates"))

    styles_path = os.path.join(tmpl_dir, "styles.css")
    styles_css = ""
    if os.path.exists(styles_path):
        with open(styles_path, "r", encoding="utf-8") as f:
            styles_css = f.read()

    # Generate Section C rows
    sec_c_rows = ""
    for item in report_data.get("section_c", []):
        core_tag = '<span style="color: #0f766e; font-weight: 600;">CORE</span>' if item.get("brsr_core") else "-"
        ver_tag = '<span style="color: #16a34a; font-weight: 600;">✓ Verified</span>' if item.get("evidence_verified") else '<span style="color: #ca8a04;">Pending</span>'
        sec_c_rows += f"""
        <tr>
            <td style="text-align: center;">P{item.get('principle', 1)}</td>
            <td><code>{item.get('metric_code', '')}</code></td>
            <td>{item.get('metric_name', '')}</td>
            <td style="text-align: right; font-weight: 600;">{item.get('value', 0.0)}</td>
            <td>{item.get('unit', '')}</td>
            <td style="text-align: center;">{core_tag}</td>
            <td style="text-align: center;">{ver_tag}</td>
        </tr>
        """

    sec_a = report_data.get("section_a", {})
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>SEBI BRSR Comprehensive Disclosure Report</title>
    <style>{styles_css}</style>
</head>
<body>
    <div class="watermark">SEALED AUDIT COPY</div>

    <div class="report-header">
        <h1 class="report-title">{sec_a.get('company_name', 'MEIL')}</h1>
        <p class="report-subtitle">Business Responsibility and Sustainability Report (BRSR) — {sec_a.get('financial_year', 'FY2025-26')}</p>
        <div class="seal-badge">
            🔒 Cryptographic Snapshot Seal: {report_data.get('snapshot_hash', '')}
        </div>
    </div>

    <div class="section-container">
        <div class="section-title">SECTION A: GENERAL DISCLOSURES</div>
        <table>
            <tr><th style="width: 35%;">Field</th><th>Details</th></tr>
            <tr><td>CIN</td><td><strong>{sec_a.get('cin', '')}</strong></td></tr>
            <tr><td>Name of Entity</td><td><strong>{sec_a.get('company_name', '')}</strong></td></tr>
            <tr><td>Registered Office</td><td>{sec_a.get('registered_office', '')}</td></tr>
            <tr><td>Financial Year</td><td><strong>{sec_a.get('financial_year', '')}</strong></td></tr>
            <tr><td>Reporting Boundary</td><td>{sec_a.get('reporting_boundary', '')}</td></tr>
        </table>
    </div>

    <div class="section-container">
        <div class="section-title">SECTION C: PRINCIPLE-WISE PERFORMANCE DISCLOSURE</div>
        <table>
            <thead>
                <tr>
                    <th style="width: 10%;">Principle</th>
                    <th style="width: 15%;">Metric Code</th>
                    <th style="width: 30%;">Indicator Name</th>
                    <th style="width: 15%;">Reported Value</th>
                    <th style="width: 10%;">Unit</th>
                    <th style="width: 10%;">BRSR Core</th>
                    <th style="width: 10%;">Assurance</th>
                </tr>
            </thead>
            <tbody>
                {sec_c_rows}
            </tbody>
        </table>
    </div>
</body>
</html>"""
    return html


def render_brsr_pdf_bytes(report_data: Dict[str, Any]) -> bytes:
    """
    Renders HTML to PDF bytes. Falls back to UTF-8 HTML bytes if PDF compiler is unavailable.
    """
    html_content = render_brsr_html(report_data)
    try:
        from weasyprint import HTML
        return HTML(string=html_content).write_pdf()
    except Exception:
        # Graceful fallback: return HTML bytes
        return html_content.encode("utf-8")
