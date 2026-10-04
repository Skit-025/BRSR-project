"""
app/modules/collection/excel_import/parser.py
Parses and validates tabular bulk uploads for ESG metric entry.
"""
import io
import csv
from typing import List, Dict, Any, Tuple


def parse_csv_upload(file_content: str) -> Tuple[List[Dict[str, Any]], List[str]]:
    """
    Parses CSV text into a structured row list and collects parsing errors.
    Returns: (valid_rows, errors)
    """
    rows = []
    errors = []
    f = io.StringIO(file_content.strip())
    reader = csv.DictReader(f)

    required_fields = ["Metric_Code", "Entered_Value", "Entered_Unit"]
    if not reader.fieldnames:
        return [], ["Empty file or missing headers."]

    missing = [rf for rf in required_fields if rf not in reader.fieldnames]
    if missing:
        return [], [f"Missing required header(s): {', '.join(missing)}"]

    for idx, r in enumerate(reader, start=2):
        code = r.get("Metric_Code", "").strip()
        val_str = r.get("Entered_Value", "").strip()
        unit = r.get("Entered_Unit", "").strip()
        status_str = r.get("Value_Status", "ACTUAL").strip() or "ACTUAL"
        notes = r.get("Notes", "").strip()

        if not code:
            continue  # skip blank lines

        if not val_str:
            continue  # unentered field

        try:
            numeric_val = float(val_str)
            text_val = None
        except ValueError:
            numeric_val = None
            text_val = val_str

        rows.append({
            "line": idx,
            "metric_code": code,
            "value_numeric": numeric_val,
            "value_text": text_val,
            "unit": unit,
            "status": status_str.upper(),
            "notes": notes,
        })

    return rows, errors
