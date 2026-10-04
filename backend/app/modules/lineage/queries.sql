-- PostgreSQL Recursive CTE Queries for 3-Click Audit Lineage

-- 1. Full Org Hierarchy Downwards Recursive Trace
-- Given a root org_node_id, retrieves all descendant sites and projects
WITH RECURSIVE node_tree AS (
    SELECT 
        id, code, name, type, parent_id, path, ownership_pct, boundary, 1 AS depth
    FROM org_nodes
    WHERE id = :root_node_id AND is_deleted = FALSE

    UNION ALL

    SELECT 
        child.id, child.code, child.name, child.type, child.parent_id, child.path, child.ownership_pct, child.boundary, parent.depth + 1
    FROM org_nodes child
    INNER JOIN node_tree parent ON child.parent_id = parent.id
    WHERE child.is_deleted = FALSE
)
SELECT * FROM node_tree ORDER BY depth, path;

-- 2. Complete End-to-End Metric Provenance
-- Traverses: ConsolidatedValue -> Submission -> DataPoint -> EvidenceLink -> EvidenceFile
SELECT 
    cv.metric_code,
    cv.value AS consolidated_value,
    cv.unit AS consolidated_unit,
    cv.method AS roll_up_method,
    node.name AS facility_name,
    node.code AS facility_code,
    node.ownership_pct,
    dp.value_numeric AS site_raw_value,
    dp.unit AS site_raw_unit,
    dp.normalized_value AS site_normalized_value,
    dp.entry_method,
    ef.original_name AS evidence_document_name,
    ef.sha256 AS document_sha256_hash,
    ef.storage_key AS minio_storage_key,
    el.page_ref AS evidence_page_reference
FROM consolidated_values cv
JOIN org_nodes node ON cv.entity_id = node.id
LEFT JOIN submissions s ON s.entity_id = node.id AND s.period_id = cv.period_id AND s.is_deleted = FALSE
LEFT JOIN data_points dp ON dp.submission_id = s.id AND dp.metric_code = cv.metric_code AND dp.is_deleted = FALSE
LEFT JOIN evidence_links el ON el.data_point_id = dp.id AND el.is_deleted = FALSE
LEFT JOIN evidence_files ef ON el.evidence_id = ef.id AND ef.is_deleted = FALSE
WHERE cv.period_id = :period_id
  AND cv.metric_code = :metric_code
ORDER BY node.path;
