"""
app/modules/collection/excel_import/error_report.py
Generates machine-readable error reports and summaries for batch file imports.
"""
from typing import List, Dict, Any
from pydantic import BaseModel


class BulkImportRowError(BaseModel):
    line_number: int
    metric_code: str
    error_message: str
    raw_data: Dict[str, Any] = {}


class BulkImportSummary(BaseModel):
    total_rows_processed: int
    successful_rows: int
    failed_rows: int
    errors: List[BulkImportRowError] = []
