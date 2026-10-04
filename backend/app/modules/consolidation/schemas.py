from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict

class ChildContributionItem(BaseModel):
    child_id: str
    child_code: str
    child_name: str
    raw_value: float
    share_pct: float
    weighted_value: float

class ConsolidatedValueRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    entity_id: str
    period_id: str
    metric_code: str
    value: float
    unit: str
    method: str
    share_pct: float
    child_contributions: List[Dict[str, Any]] = []

class ConsolidationRunRequest(BaseModel):
    period_id: str
    root_node_id: Optional[str] = None

class ConsolidationRunResponse(BaseModel):
    period_id: str
    consolidated_nodes_count: int
    consolidated_metrics_count: int
    message: str
