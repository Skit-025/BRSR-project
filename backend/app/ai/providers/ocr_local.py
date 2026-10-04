"""
app/ai/providers/ocr_local.py
Local OCR and text extraction engine using pdfplumber / regex parsing.
"""
import io
import re
from typing import Dict, Any, List


def extract_text_from_pdf_bytes(pdf_bytes: bytes) -> str:
    """Extracts raw text from PDF binary stream using pdfplumber if available."""
    try:
        import pdfplumber
        text_parts = []
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            for page in pdf.pages:
                t = page.extract_text()
                if t:
                    text_parts.append(t)
        return "\n".join(text_parts)
    except Exception:
        # Fallback to UTF-8 decoding / plain string extraction
        try:
            return pdf_bytes.decode("utf-8", errors="ignore")
        except Exception:
            return ""


def extract_key_values_regex(raw_text: str) -> List[Dict[str, Any]]:
    """
    Scans document text for patterns like:
    - 'Electricity Consumption: 1,450.50 MWh'
    - 'Diesel: 5,200 Litres'
    - 'Total Units: 120000 kWh'
    """
    matches = []
    # Pattern: Metric label followed by number and unit
    pattern = re.compile(r"([A-Za-z\s]{3,30})[:\-]\s*([\d,]+(?:\.\d+)?)\s*([A-Za-z/³²]+)")
    for line in raw_text.splitlines():
        m = pattern.search(line)
        if m:
            label = m.group(1).strip()
            num_str = m.group(2).replace(",", "")
            unit = m.group(3).strip()
            try:
                val = float(num_str)
                matches.append({"label": label, "value": val, "unit": unit})
            except ValueError:
                pass
    return matches
