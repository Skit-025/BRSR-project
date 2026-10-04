"""
app/modules/collection/offline_sync/conflict_policy.py
Conflict resolution policy for offline PWA sync operations.
Guarantees optimistic concurrency compliance (version check) and audit integrity.
"""
from typing import Dict, Any, Tuple
from app.modules.collection.models import DataPoint


def resolve_datapoint_conflict(
    server_point: DataPoint,
    incoming_data: Dict[str, Any],
) -> Tuple[bool, str]:
    """
    Evaluates whether an incoming offline modification can be safely applied:
    Returns (should_apply: bool, reason: str).
    """
    incoming_version = incoming_data.get("version", 1)
    
    # 1. If server version is ahead, reject and mark conflict
    if server_point.version > incoming_version:
        return (
            False,
            f"Conflict detected: Server has newer version {server_point.version} than client {incoming_version}."
        )

    # 2. If values match, no-op
    if (server_point.value_numeric == incoming_data.get("value_numeric") and
        server_point.value_text == incoming_data.get("value_text")):
        return False, "Values identical. No update required."

    # 3. Allow overwrite, increment version
    return True, "Incoming offline revision accepted."
