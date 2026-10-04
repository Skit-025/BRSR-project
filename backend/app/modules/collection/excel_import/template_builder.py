"""
app/modules/collection/excel_import/template_builder.py
Generates standardized bulk data entry templates (CSV/Excel) based on applicable entity metrics.
"""
import io
import csv
from typing import List
from sqlalchemy.orm import Session
from app.modules.metrics.models import Metric


def generate_csv_template(metrics: List[Metric]) -> str:
    """
    Generates CSV template with mandatory column headers and pre-filled metric codes and names.
    Columns:
      Metric_Code, Metric_Name, Category, Base_Unit, Entered_Value, Entered_Unit, Status (ACTUAL/ESTIMATED), Notes
    """
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Metric_Code",
        "Metric_Name",
        "Category",
        "Base_Unit",
        "Allowed_Units",
        "Entered_Value",
        "Entered_Unit",
        "Value_Status",
        "Notes"
    ])

    for m in metrics:
        allowed = ",".join(m.allowed_units) if m.allowed_units else m.base_unit
        writer.writerow([
            m.code,
            m.name,
            m.category,
            m.base_unit,
            allowed,
            "",                     # empty Entered_Value for maker to fill
            m.base_unit,            # prefill default unit
            "ACTUAL",
            ""
        ])

    return output.getvalue()
