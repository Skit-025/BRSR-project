"""
app/modules/audit/chain.py
Cryptographic hash-chain calculation and integrity verification for audit logs.
"""
import hashlib
import json
from typing import Any, Dict, Optional


def compute_audit_hash(
    sequence: int,
    action: str,
    actor_id: Optional[str],
    target_type: str,
    target_id: Optional[str],
    changes: Optional[Dict[str, Any]],
    timestamp_iso: str,
    prev_hash: str,
) -> str:
    """
    Computes deterministic SHA-256 hash of an audit record linked to the previous block.
    """
    payload = {
        "sequence": sequence,
        "action": action,
        "actor_id": actor_id or "",
        "target_type": target_type,
        "target_id": target_id or "",
        "changes": changes or {},
        "timestamp": timestamp_iso,
        "prev_hash": prev_hash,
    }
    encoded = json.dumps(payload, sort_keys=True, default=str).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def verify_chain_integrity(records: list) -> bool:
    """
    Validates that every record's prev_hash matches the prior record's record_hash,
    and each record's computed hash equals its stored record_hash.
    """
    expected_prev = "0" * 64
    for record in records:
        if record.prev_hash != expected_prev:
            return False
        
        computed = compute_audit_hash(
            sequence=record.sequence_number or 0,
            action=record.action,
            actor_id=record.actor_id,
            target_type=record.target_type,
            target_id=record.target_id,
            changes=record.changes,
            timestamp_iso=record.created_at.isoformat() if record.created_at else "",
            prev_hash=record.prev_hash,
        )
        if computed != record.record_hash:
            return False
        
        expected_prev = record.record_hash

    return True
