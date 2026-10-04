-- PostgreSQL Materialized & Standard Views for ESG Dashboard Analytics

-- 1. Entity Submission Completion Overview View
CREATE OR REPLACE VIEW vw_entity_submission_summary AS
SELECT 
    e.id AS entity_id,
    e.name AS entity_name,
    e.code AS entity_code,
    s.period_id,
    COUNT(s.id) AS total_submissions,
    COUNT(CASE WHEN s.status = 'APPROVED' THEN 1 END) AS approved_count,
    COUNT(CASE WHEN s.status = 'SUBMITTED' THEN 1 END) AS pending_review_count,
    COUNT(CASE WHEN s.status = 'REJECTED' THEN 1 END) AS rejected_count,
    COUNT(CASE WHEN s.status = 'DRAFT' THEN 1 END) AS draft_count
FROM entities e
LEFT JOIN submissions s ON e.id = s.entity_id
GROUP BY e.id, e.name, e.code, s.period_id;

-- 2. Principle-wise Completion & Quality Score View
CREATE OR REPLACE VIEW vw_principle_kpi_metrics AS
SELECT 
    m.principle,
    m.category,
    COUNT(DISTINCT m.id) AS total_indicators,
    COUNT(DISTINCT dp.id) AS reported_datapoints,
    ROUND(AVG(COALESCE(dp.confidence_score, 1.0)) * 100, 2) AS avg_data_confidence_pct
FROM metrics m
LEFT JOIN data_points dp ON m.code = dp.metric_code
GROUP BY m.principle, m.category;
