"""
app/modules/snapshots/builder.py
Deterministic snapshot builder: compiles and cryptographically fingerprints all reported ESG data.
"""
import hashlib
import json
from typing import Dict, Any, Tuple
from sqlalchemy.orm import Session
from app.modules.org.models import OrgNode, ReportingPeriod
from app.modules.consolidation.models import ConsolidatedValue


def build_snapshot_payload(
    db: Session,
    entity_id: str,
    period_id: str,
) -> Tuple[Dict[str, Any], str]:
    """
    Constructs a frozen JSON representation of all consolidated indicators
    and calculates its canonical SHA-256 hash.
    """
    node = db.query(OrgNode).filter(OrgNode.id == entity_id).first()
    period = db.query(ReportingPeriod).filter(ReportingPeriod.id == period_id).first()
    
    if not node:
        raise ValueError(f"Entity '{entity_id}' not found.")
    if not period:
        raise ValueError(f"Period '{period_id}' not found.")

    cons_values = (
        db.query(ConsolidatedValue)
        .filter(
            ConsolidatedValue.entity_id == entity_id,
            ConsolidatedValue.period_id == period_id,
            ConsolidatedValue.is_deleted == False,
        )
        .order_by(ConsolidatedValue.metric_code)
        .all()
    )

    metrics_payload = []
    for cv in cons_values:
        metrics_payload.append({
            "metric_code": cv.metric_code,
            "value": cv.value,
            "unit": cv.unit,
            "method": cv.method,
            "share_pct": cv.share_pct,
            "child_contributions": cv.child_contributions,
        })

    payload = {
        "entity": {
            "id": node.id,
            "code": node.code,
            "name": node.name,
            "path": node.path,
        },
        "period": {
            "id": period.id,
            "code": period.code,
            "financial_year": period.financial_year,
        },
        "metrics": metrics_payload,
    }

    canonical_json = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    sha256_hash = hashlib.sha256(canonical_json.encode("utf-8")).hexdigest()

    return payload, sha256_hash
