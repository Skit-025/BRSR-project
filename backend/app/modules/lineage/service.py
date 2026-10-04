from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.modules.org.models import OrgNode, ReportingPeriod
from app.modules.metrics.models import Metric
from app.modules.collection.models import Submission, DataPoint
from app.modules.evidence.models import EvidenceLink, EvidenceFile
from app.modules.consolidation.models import ConsolidatedValue
from app.modules.lineage.schemas import (
    LineageTreeResponse,
    LineageNodeTrace,
    SiteDataPointTrace,
    EvidenceTraceItem
)

def build_metric_lineage(
    db: Session,
    metric_code: str,
    period_id: str,
    entity_id: Optional[str] = None
) -> LineageTreeResponse:
    """
    F25 3-Click Lineage Explorer:
    Recursively maps any reported KPI number back to:
    Consolidated Value -> Boundary Share % -> Contributing Units -> Site DataPoints -> Evidence Documents & SHA-256 Hashes.
    """
    # 1. Fetch Metric & Period
    metric = db.query(Metric).filter(Metric.code == metric_code).first()
    if not metric:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Metric '{metric_code}' not found.")

    period = db.query(ReportingPeriod).filter(ReportingPeriod.id == period_id).first()
    if not period:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Reporting period '{period_id}' not found.")

    # 2. Identify Root Entity (Group root if not specified)
    if entity_id:
        root_node = db.query(OrgNode).filter(OrgNode.id == entity_id).first()
    else:
        root_node = db.query(OrgNode).filter(OrgNode.type == "group").first()
        if not root_node:
            root_node = db.query(OrgNode).filter(OrgNode.parent_id == None).first()

    if not root_node:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Root organization entity not found.")

    # 3. Fetch consolidated figure at root
    cons_root = db.query(ConsolidatedValue).filter(
        ConsolidatedValue.entity_id == root_node.id,
        ConsolidatedValue.period_id == period_id,
        ConsolidatedValue.metric_code == metric_code
    ).first()

    root_val = cons_root.value if cons_root else 0.0
    root_unit = cons_root.unit if cons_root else metric.base_unit
    root_method = cons_root.method if cons_root else metric.aggregation_type

    def _build_node_trace(node: OrgNode) -> LineageNodeTrace:
        node_cons = db.query(ConsolidatedValue).filter(
            ConsolidatedValue.entity_id == node.id,
            ConsolidatedValue.period_id == period_id,
            ConsolidatedValue.metric_code == metric_code
        ).first()

        val = node_cons.value if node_cons else 0.0
        unit = node_cons.unit if node_cons else metric.base_unit
        method = node_cons.method if node_cons else metric.aggregation_type

        # Check immediate child nodes
        children_nodes = db.query(OrgNode).filter(
            OrgNode.parent_id == node.id,
            OrgNode.is_deleted == False
        ).all()

        child_traces: List[LineageNodeTrace] = []
        site_datapoints: List[SiteDataPointTrace] = []

        if children_nodes:
            for child in children_nodes:
                child_traces.append(_build_node_trace(child))
        else:
            # Leaf site: fetch direct data point and evidence
            sub = db.query(Submission).filter(
                Submission.entity_id == node.id,
                Submission.period_id == period_id
            ).first()

            if sub:
                dp = db.query(DataPoint).filter(
                    DataPoint.submission_id == sub.id,
                    DataPoint.metric_code == metric_code
                ).first()

                if dp:
                    # Fetch linked evidence files
                    links = db.query(EvidenceLink).filter(EvidenceLink.data_point_id == dp.id).all()
                    ev_items: List[EvidenceTraceItem] = []
                    for l in links:
                        ef = db.query(EvidenceFile).filter(EvidenceFile.id == l.evidence_id).first()
                        if ef:
                            ev_items.append(
                                EvidenceTraceItem(
                                    evidence_id=ef.id,
                                    filename=ef.original_name,
                                    sha256=ef.sha256,
                                    page_ref=l.page_ref,
                                    download_url=f"/api/v1/evidence/{ef.id}/download"
                                )
                            )

                    site_datapoints.append(
                        SiteDataPointTrace(
                            data_point_id=dp.id,
                            project_id=node.id,
                            project_code=node.code,
                            project_name=node.name,
                            project_type=node.project_type,
                            raw_value=dp.value_numeric or 0.0,
                            unit=dp.unit,
                            normalized_value=dp.normalized_value or dp.value_numeric or 0.0,
                            status=dp.status,
                            maker_id=sub.maker_id,
                            submitted_at=sub.submitted_at,
                            evidence=ev_items
                        )
                    )

        return LineageNodeTrace(
            node_id=node.id,
            node_code=node.code,
            node_name=node.name,
            node_type=node.type,
            reported_value=val,
            unit=unit,
            method=method,
            share_pct=node.ownership_pct,
            children=child_traces,
            site_datapoints=site_datapoints
        )

    root_trace = _build_node_trace(root_node)

    return LineageTreeResponse(
        metric_code=metric_code,
        metric_name=metric.name,
        period_id=period_id,
        period_code=period.code,
        consolidated_group_value=root_val,
        unit=root_unit,
        lineage_tree=root_trace
    )
