"""Validate and normalize lineage driver rows."""
import math
from typing import List, Dict, Any
from app.ai.schemas import DriverContribution

def extract_drivers(lineage_data: Dict[str, Any]) -> List[DriverContribution]:
    rows = lineage_data.get("drivers", []) if isinstance(lineage_data, dict) else []
    valid = []
    for row in rows if isinstance(rows, list) else []:
        if not isinstance(row, dict):
            continue
        try:
            name, delta = str(row.get("entity", "")).strip(), float(row.get("delta"))
        except (TypeError, ValueError):
            continue
        if name and math.isfinite(delta):
            valid.append((name, delta))
    total = sum(abs(delta) for _, delta in valid)
    if not total:
        return []
    valid.sort(key=lambda item: abs(item[1]), reverse=True)
    return [DriverContribution(entity=name, delta=delta, share=round(abs(delta) / total, 4)) for name, delta in valid]
