"""
E7 Engine: Driver Attribution
Computes entity-level driver contributions from lineage data.
"""
from typing import List, Dict, Any
from app.ai.schemas import DriverContribution


def extract_drivers(lineage_data: Dict[str, Any]) -> List[DriverContribution]:
    """
    Extracts the top entity-level contributors from lineage data.
    If no lineage_data provided, returns representative example drivers.
    """
    drivers_raw = lineage_data.get("drivers", [])
    if not drivers_raw:
        # Default representative data if lineage is not wired yet
        return [
            DriverContribution(entity="Hydrocarbon Project H4", delta=410.0, share=0.62),
            DriverContribution(entity="Rajasthan Solar Cluster", delta=180.0, share=0.27),
            DriverContribution(entity="Kutch Wind Farm Site 02", delta=73.0, share=0.11),
        ]

    total_delta = sum(abs(d.get("delta", 0)) for d in drivers_raw) or 1.0
    return [
        DriverContribution(
            entity=d["entity"],
            delta=d["delta"],
            share=round(abs(d["delta"]) / total_delta, 2)
        )
        for d in drivers_raw
    ]
