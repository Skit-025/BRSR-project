from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict
from datetime import datetime

class EvidenceTraceItem(BaseModel):
    evidence_id: str
    filename: str
    sha256: str
    page_ref: Optional[str] = None
    download_url: str

class SiteDataPointTrace(BaseModel):
    data_point_id: str
    project_id: str
    project_code: str
    project_name: str
    project_type: str
    raw_value: float
    unit: str
    normalized_value: float
    status: str
    maker_id: Optional[str] = None
    submitted_at: Optional[datetime] = None
    evidence: List[EvidenceTraceItem] = []

class LineageNodeTrace(BaseModel):
    node_id: str
    node_code: str
    node_name: str
    node_type: str
    reported_value: float
    unit: str
    method: str
    share_pct: float
    children: List["LineageNodeTrace"] = []
    site_datapoints: List[SiteDataPointTrace] = []

class LineageTreeResponse(BaseModel):
    metric_code: str
    metric_name: str
    period_id: str
    period_code: str
    consolidated_group_value: float
    unit: str
    lineage_tree: LineageNodeTrace
