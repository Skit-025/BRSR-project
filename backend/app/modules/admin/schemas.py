"""
app/modules/admin/schemas.py
Pydantic schemas for system diagnostics, database statistics, and administrative controls.
"""
from typing import Dict, Any, List
from pydantic import BaseModel


class SystemDiagnostics(BaseModel):
    app_name: str
    environment: str
    database_status: str
    redis_status: str
    storage_status: str
    active_worker_threads: int
    table_row_counts: Dict[str, int] = {}
    feature_flags: Dict[str, bool] = {}
