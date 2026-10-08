import os
import json
import pypdfium2 as pdfium
from app.db.session import SessionLocal
from app.modules.org.models import OrgNode, ReportingPeriod
from app.modules.reporting.brsr_generator import export_brsr_pdf, export_brsr_json

os.makedirs("storage/generated_reports", exist_ok=True)
db = SessionLocal()

# Find FY2025-26 period or first period
period = db.query(ReportingPeriod).filter(ReportingPeriod.code.ilike("%2025-26%")).first()
if not period:
    period = db.query(ReportingPeriod).first()

print(f"Using period: {period.code} ({period.id})")

entities = ["PRJ-MUM", "BU-HEV", "SUB-CON", "GRP-001"]
generated_files = {}

for code in entities:
    node = db.query(OrgNode).filter(OrgNode.code == code).first()
    if not node:
        print(f"Warning: Node {code} not found in DB")
        continue

    print(f"Generating PDF for {code} ({node.name})...")
    pdf_bytes = export_brsr_pdf(db, str(node.id), str(period.id))
    pdf_path = f"storage/generated_reports/BRSR_{code}_{period.financial_year}.pdf"
    with open(pdf_path, "wb") as f:
        f.write(pdf_bytes)

    print(f"Saved {pdf_path} ({len(pdf_bytes)} bytes)")
    generated_files[code] = pdf_path

# Rasterize pages 1, 14, 30 for GRP-001
if "GRP-001" in generated_files:
    grp_pdf_path = generated_files["GRP-001"]
    doc = pdfium.PdfDocument(grp_pdf_path)
    total_pages = len(doc)
    print(f"GRP-001 PDF has {total_pages} pages")

    pages_to_render = [0, min(13, total_pages - 1), min(29, total_pages - 1)]
    for idx in pages_to_render:
        page = doc[idx]
        image = page.render(scale=2).to_pil()
        img_path = f"storage/generated_reports/GRP-001_page_{idx + 1}.png"
        image.save(img_path)
        print(f"Rasterized page {idx + 1} to {img_path}")

# Rasterize reference PDF pages 1, 14, 30 if reference exists
ref_path = "reference/L_T_BRSR_Report_FY2025-26.pdf"
if not os.path.exists(ref_path):
    ref_path = "../reference/L_T_BRSR_Report_FY2025-26.pdf"

if os.path.exists(ref_path):
    print(f"Rendering reference PDF pages from {ref_path}...")
    ref_doc = pdfium.PdfDocument(ref_path)
    ref_pages = [0, 13, 29]
    for idx in ref_pages:
        if idx < len(ref_doc):
            ref_img = ref_doc[idx].render(scale=2).to_pil()
            ref_img_path = f"storage/generated_reports/REF_page_{idx + 1}.png"
            ref_img.save(ref_img_path)
            print(f"Rasterized reference page {idx + 1} to {ref_img_path}")

print("Done generating sample PDFs and rasterized pages.")

