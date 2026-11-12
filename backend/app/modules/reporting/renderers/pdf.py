"""
app/modules/reporting/renderers/pdf.py
Compiles Jinja2 SEBI Annexure I HTML templates and renders official PDF/HTML disclosure documents.
"""
import os
from typing import Dict, Any
from jinja2 import Environment, FileSystemLoader, select_autoescape


def _normalize_report_data(report_data: Dict[str, Any]) -> Dict[str, Any]:
    """Ensure backward-compatible defaults whether caller passes full BRSRFullReportResponse or lightweight dict."""
    sec_a = dict(report_data.get("section_a") or {})
    if "corporate_name" not in sec_a:
        sec_a["corporate_name"] = sec_a.get("company_name") or report_data.get("entity_name") or "MEIL"
    sec_a.setdefault("business_activities", [])
    sec_a.setdefault("products_services", [])
    sec_a.setdefault("locations", {})
    sec_a.setdefault("markets_served", {})
    sec_a.setdefault("employees_breakdown", {})
    sec_a.setdefault("differently_abled", {})
    sec_a.setdefault("women_representation", {})
    sec_a.setdefault("turnover_rate", {})
    sec_a.setdefault("holding_subsidiaries", [])
    sec_a.setdefault("csr_details", {})
    sec_a.setdefault("complaints", {})
    sec_a.setdefault("material_issues", [])

    sec_b = dict(report_data.get("section_b") or {})
    sec_b.setdefault("principles_matrix", {})
    sec_b.setdefault("review_details", {})
    sec_b.setdefault("independent_assessment", {})
    sec_b.setdefault("reasons_not_covered", {})

    norm_c = []
    for item in report_data.get("section_c", []):
        row = dict(item)
        if "disclosed_value" not in row and "value" in row:
            row["disclosed_value"] = row["value"]
        if "indicator_name" not in row and "metric_name" in row:
            row["indicator_name"] = row["metric_name"]
        row.setdefault("unit", "")
        row.setdefault("principle", 1)
        norm_c.append(row)

    normalized = dict(report_data)
    normalized["section_a"] = sec_a
    normalized["section_b"] = sec_b
    normalized["section_c"] = norm_c
    normalized.setdefault("entity_name", sec_a["corporate_name"])
    normalized.setdefault("entity_code", "")
    normalized.setdefault("period_code", "")
    normalized.setdefault("report_type", "BRSR_FULL")
    normalized.setdefault("report_id", "")
    normalized.setdefault("snapshot_hash", "")
    normalized.setdefault("total_scope_1_tco2e", 0.0)
    normalized.setdefault("total_scope_2_tco2e", 0.0)
    normalized.setdefault("total_scope_3_tco2e", 0.0)
    return normalized


def render_brsr_html(report_data: Dict[str, Any]) -> str:
    """
    Renders structured report dictionary into the standalone SEBI Annexure I HTML document.
    """
    curr_dir = os.path.dirname(__file__)
    tmpl_dir = os.path.abspath(os.path.join(curr_dir, "..", "templates"))

    styles_path = os.path.join(tmpl_dir, "styles.css")
    styles_css = ""
    if os.path.exists(styles_path):
        with open(styles_path, "r", encoding="utf-8") as f:
            styles_css = f.read()

    normalized = _normalize_report_data(report_data)
    metrics_map = {item.get("metric_code"): item for item in normalized["section_c"] if item.get("metric_code")}

    # Derive combined energy display only when MWh/GJ values exist (no fabricated fallback)
    e1 = metrics_map.get("ENV-ENERGY-001", {}).get("disclosed_value")
    e2 = metrics_map.get("ENV-ENERGY-002", {}).get("disclosed_value")
    total_energy_display = ""
    if e1 is not None and e2 is None:
        total_energy_display = f"{e1:.2f} {metrics_map['ENV-ENERGY-001'].get('unit', '')}".strip()
    elif e2 is not None and e1 is None:
        total_energy_display = f"{e2:.2f} {metrics_map['ENV-ENERGY-002'].get('unit', '')}".strip()
    elif e1 is not None and e2 is not None:
        total_energy_display = f"{e1:.2f} {metrics_map['ENV-ENERGY-001'].get('unit', '')} + {e2:.2f} {metrics_map['ENV-ENERGY-002'].get('unit', '')}".strip()

    env = Environment(
        loader=FileSystemLoader(tmpl_dir),
        autoescape=select_autoescape(["html", "xml"]),
    )

    ctx = {
        "report": normalized,
        "styles_css": styles_css,
        "metrics_map": metrics_map,
        "total_energy_display": total_energy_display,
    }

    section_a_html = env.get_template("brsr_section_a.html").render(**ctx)
    section_b_html = env.get_template("brsr_section_b.html").render(**ctx)
    section_c_html = env.get_template("brsr_section_c.html").render(**ctx)

    return env.get_template("brsr_core.html").render(
        **ctx,
        section_a_html=section_a_html,
        section_b_html=section_b_html,
        section_c_html=section_c_html,
    )


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
