# -*- coding: utf-8 -*-
import os

target = os.path.join("app", "modules", "reporting", "brsr_generator.py")

part1 = """# -*- coding: utf-8 -*-
\"\"\"
app/modules/reporting/brsr_generator.py
Comprehensive SEBI BRSR Statutory Reporting Engine and High-Fidelity PDF/HTML Renderer.
Faithfully replicates the visual layout, typography, palettes, and disclosures of
reference L&T BRSR Report FY2025-26.
\"\"\"
import os
import re
import uuid
import json
import hashlib
import math
from datetime import datetime, timezone, date
from decimal import Decimal
from typing import Dict, Any, List, Optional, Tuple

from sqlalchemy.orm import Session
from sqlalchemy import cast, String, desc, or_
from fastapi import HTTPException, status

from app.modules.org.models import OrgNode, ReportingPeriod
from app.modules.metrics.models import Metric
from app.modules.collection.models import Submission, DataPoint, SubmissionStatus
from app.modules.consolidation.models import ConsolidatedValue
from app.modules.disclosures.models import OrgLevelDisclosure, DisclosureStatus, DisclosureSection
from app.modules.snapshots.models import ReportSnapshot, SnapshotRestatement
from app.modules.assurance.models import AssuranceEngagement
from app.modules.calc.formulas import (
    calculate_energy_intensity,
    calculate_ghg_intensity,
    calculate_water_intensity,
    calculate_women_pct,
    calculate_msme_pct,
    calculate_ltifr,
)

def format_indian_number(val: Any, decimals: Optional[int] = None) -> str:
    \"\"\"
    Formats numbers following Indian numbering system grouping:
    Last 3 digits grouped together, subsequent pairs grouped by commas (e.g. 3,78,039).
    Returns 'Data not provided' if None. Returns '–' if 0.
    \"\"\"
    if val is None or val == "" or val == "None":
        return "Data not provided"
    try:
        fval = float(val)
    except (ValueError, TypeError):
        return str(val)

    if fval == 0.0:
        return "–"

    is_neg = fval < 0
    fval = abs(fval)

    if decimals is not None:
        formatted = f"{fval:.{decimals}f}"
        int_part, frac_part = formatted.split(".")
    else:
        if fval.is_integer():
            int_part = str(int(fval))
            frac_part = ""
        else:
            formatted = f"{fval:.2f}".rstrip("0").rstrip(".")
            if "." in formatted:
                int_part, frac_part = formatted.split(".")
            else:
                int_part, frac_part = formatted, ""

    if len(int_part) <= 3:
        grouped = int_part
    else:
        last3 = int_part[-3:]
        rest = int_part[:-3]
        groups = []
        while len(rest) > 2:
            groups.insert(0, rest[-2:])
            rest = rest[:-2]
        if rest:
            groups.insert(0, rest)
        grouped = ",".join(groups) + "," + last3

    res = ("-" if is_neg else "") + grouped
    if frac_part:
        res += "." + frac_part
    return res

def render_num_cell(
    val: Any,
    metric_code: str = "",
    entity_id: str = "",
    period_id: str = "",
    unit: str = "",
    decimals: Optional[int] = None,
    is_pct: bool = False,
    is_currency: bool = False,
    bold: bool = False
) -> str:
    \"\"\"
    Renders an HTML <td> cell for a numeric metric.
    Inserts data attributes for 3-click lineage navigation.
    Ensures that empty values show 'Data not provided' and zero shows '–'.
    \"\"\"
    if val is None or val == "" or val == "Data not provided":
        return '<td class="cell-missing" style="text-align:center; color:#94a3b8; font-style:italic;">Data not provided</td>'

    formatted = format_indian_number(val, decimals=decimals)
    if formatted == "–":
        return '<td class="cell-nil" style="text-align:center; color:#64748b;">–</td>'

    prefix = "? " if is_currency else ""
    suffix = "%" if is_pct else (f" {unit}" if unit else "")
    display_str = f"{prefix}{formatted}{suffix}"

    weight_style = "font-weight:700;" if bold else "font-weight:600;"
    cell_html = (
        f'<td class="cell-num clickable-kpi" '
        f'data-metric-code="{metric_code}" '
        f'data-entity-id="{entity_id}" '
        f'data-period-id="{period_id}" '
        f'style="text-align:right; {weight_style} cursor:pointer;" '
        f'onclick="if(window.parent)window.parent.postMessage({{type:\\'OPEN_LINEAGE\\',metricCode:\\'{metric_code}\\',entityId:\\'{entity_id}\\',periodId:\\'{period_id}\\'}},\\'*\\')" '
        f'title="Click to trace lineage in Lineage Explorer">{display_str}</td>'
    )
    return cell_html
"""

with open(target, "w", encoding="utf-8") as f:
    f.write(part1)
print("Part 1 written")
