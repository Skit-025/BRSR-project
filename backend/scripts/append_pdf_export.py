import os

target = os.path.join("app", "modules", "reporting", "brsr_generator.py")

with open(target, "a", encoding="utf-8") as f:
    f.write('''

def render_brsr_pdf_bytes_from_html(html_content: str) -> bytes:
    """
    Renders HTML string into PDF bytes using Playwright Headless Chromium
    with exact dimensions (594pt x 738pt) matching the reference L&T Report.
    """
    try:
        from playwright.sync_api import sync_playwright
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            page.set_content(html_content, wait_until="networkidle")
            pdf_bytes = page.pdf(
                width="594pt",
                height="738pt",
                print_background=True,
                prefer_css_page_size=True,
                margin={"top": "12mm", "bottom": "16mm", "left": "14mm", "right": "14mm"},
            )
            browser.close()
            return pdf_bytes
    except Exception as exc:
        raise RuntimeError(f"Playwright PDF generation failed: {exc}") from exc


def export_brsr_pdf(db: Session, entity_id: str, period_id: str) -> bytes:
    """Compiles BRSR report and returns high-fidelity PDF bytes."""
    data = compile_brsr_full_data(db, entity_id, period_id)
    html_content = generate_brsr_html(data)
    return render_brsr_pdf_bytes_from_html(html_content)


def export_brsr_json(db: Session, entity_id: str, period_id: str) -> Dict[str, Any]:
    """Compiles BRSR report and returns complete structured JSON dictionary."""
    return compile_brsr_full_data(db, entity_id, period_id)
''')
print("export functions appended")
