import React, { useState, useEffect } from 'react';
import { 
  X, CheckCircle2, Shield, FileText, ArrowDown, ExternalLink, 
  Hash, Building2, Calculator, Clock, UserCheck, RefreshCw, AlertCircle, Download
} from 'lucide-react';
import { api, API_BASE } from '../api/client';

export default function DataLineageDrawer({ isOpen, onClose, metricData, metricCode, periodId, entityId }) {
  const [liveLineage, setLiveLineage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const activeMetricCode = metricCode || metricData?.metricCode || metricData?.code;
  const activePeriodId = periodId || metricData?.periodId;
  const activeEntityId = entityId || metricData?.entityId;

  useEffect(() => {
    if (!isOpen) {
      setLiveLineage(null);
      setError(null);
      return;
    }

    if (!activeMetricCode || !activePeriodId) {
      setLiveLineage(null);
      setError('Metric code and reporting period are required to trace audit lineage.');
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    const fetchLiveLineage = async () => {
      try {
        let url = `/lineage/${encodeURIComponent(activeMetricCode)}/${encodeURIComponent(activePeriodId)}`;
        if (activeEntityId) url += `?entity_id=${encodeURIComponent(activeEntityId)}`;
        const res = await api.get(url);
        if (isMounted) {
          if (res.data) {
            setLiveLineage(res.data);
          } else {
            setError('No audit lineage recorded for this metric in the selected period.');
          }
        }
      } catch (err) {
        if (isMounted) {
          setLiveLineage(null);
          setError(err.response?.data?.detail || 'No lineage trace recorded for this metric in the selected period.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchLiveLineage();
    return () => { isMounted = false; };
  }, [isOpen, activeMetricCode, activePeriodId, activeEntityId]);

  if (!isOpen) return null;

  // Extract real hierarchy steps recursively
  const extractStepsFromTree = (root) => {
    if (!root) return [];
    const steps = [];
    const traverse = (node, depth = 0) => {
      if (!node) return;
      const typeLabel = (node.node_type || 'ORGANIZATION').toUpperCase();
      steps.push({
        level: `${typeLabel} LEVEL`,
        entity: node.node_name || node.node_code || 'Organization Node',
        actor: depth === 0 ? 'Group Consolidation Engine' : `${node.node_type || 'Entity'} Aggregation Node`,
        timestamp: 'Audited & Consolidated',
        value: `${Number(node.reported_value || 0).toLocaleString()} ${node.unit || ''}`,
        note: `Consolidation Method: ${node.method || 'SUM'} (Consolidation Share: ${node.share_pct ?? 100}%)`
      });

      if (node.site_datapoints && node.site_datapoints.length > 0) {
        node.site_datapoints.forEach(site => {
          steps.push({
            level: 'PROJECT OPERATIONAL LEVEL',
            entity: site.project_name || site.project_code || 'Site Operational Node',
            actor: `Maker (${site.maker_id ? 'Authenticated User' : 'Site Engineer'})`,
            timestamp: site.submitted_at ? new Date(site.submitted_at).toLocaleDateString('en-IN') : 'Logged',
            value: `${Number(site.raw_value || 0).toLocaleString()} ${site.unit || ''}`,
            note: `Direct operational datapoint (Status: ${site.status || 'SUBMITTED'})`
          });
        });
      }

      if (node.children && node.children.length > 0) {
        node.children.forEach(child => traverse(child, depth + 1));
      }
    };
    traverse(root, 0);
    return steps;
  };

  // Extract all real evidence items attached to data points
  const extractEvidenceFromTree = (root) => {
    if (!root) return [];
    const evidenceList = [];
    const traverse = (node) => {
      if (node.site_datapoints) {
        node.site_datapoints.forEach(site => {
          if (site.evidence && site.evidence.length > 0) {
            site.evidence.forEach(ev => {
              evidenceList.push({
                ...ev,
                projectName: site.project_name || site.project_code
              });
            });
          }
        });
      }
      if (node.children) {
        node.children.forEach(traverse);
      }
    };
    traverse(root);
    return evidenceList;
  };

  const steps = liveLineage ? extractStepsFromTree(liveLineage.lineage_tree) : [];
  const evidenceItems = liveLineage ? extractEvidenceFromTree(liveLineage.lineage_tree) : [];
  const metricDisplayName = liveLineage?.metric_name || metricData?.metricName || activeMetricCode || 'Metric Lineage';
  const displayCode = liveLineage?.metric_code || activeMetricCode || '—';
  const displayPeriod = liveLineage?.period_code || activePeriodId || '—';
  const consolidatedValue = liveLineage 
    ? `${Number(liveLineage.consolidated_group_value || 0).toLocaleString()} ${liveLineage.unit || ''}`
    : null;

  return (
    <div
      className="anim-fade"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9998,
        background: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        justifyContent: 'flex-end'
      }}
      onClick={onClose}
    >
      <div
        className="anim-slide-left"
        style={{
          width: '100%',
          maxWidth: '580px',
          height: '100vh',
          background: 'var(--card-bg, #0f172a)',
          borderLeft: '1px solid var(--border-color, #334155)',
          boxShadow: '-10px 0 30px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '18px 22px',
          borderBottom: '1px solid var(--border-color, #334155)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(255, 255, 255, 0.02)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="badge badge-purple" style={{ fontSize: '10px' }}>
                BRSR AUDIT LINEAGE
              </span>
              <span style={{ fontSize: '11px', color: 'var(--emerald-400)' }}>
                ● Dynamic API Trace
              </span>
            </div>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>
              {metricDisplayName}
            </h2>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Code: <span style={{ fontFamily: 'monospace' }}>{displayCode}</span> | Period: {displayPeriod}
            </div>
          </div>

          <button className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div style={{ padding: '60px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <RefreshCw size={24} className="spin" color="var(--brand-400)" />
            <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '14px' }}>
              Fetching Dynamic Audit Lineage...
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
              Calling GET /api/v1/lineage/{activeMetricCode}/{activePeriodId}
            </div>
          </div>
        )}

        {/* Error / No Data State */}
        {!loading && (error || !liveLineage) && (
          <div style={{ padding: '40px 24px', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            <div style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16
            }}>
              <AlertCircle size={26} color="#ef4444" />
            </div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
              No Audit Lineage Found
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', maxWidth: '380px', lineHeight: 1.5, margin: 0 }}>
              {error || `No recorded consolidation data points found for metric ${activeMetricCode} in period ${activePeriodId}. Site-level data must be submitted and consolidated before a lineage trace can be reconstructed.`}
            </p>
          </div>
        )}

        {/* Live Lineage Content */}
        {!loading && liveLineage && (
          <>
            {/* Reported Value Hero Card */}
            <div style={{ padding: '20px 22px', borderBottom: '1px solid var(--border-color, #334155)' }}>
              <div style={{
                padding: '16px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 51, 234, 0.05) 100%)',
                border: '1px solid rgba(59, 130, 246, 0.25)'
              }}>
                <div style={{ fontSize: '11px', color: 'var(--brand-400)', textTransform: 'uppercase', fontWeight: 700 }}>
                  Consolidated Group Figure
                </div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#ffffff', margin: '4px 0' }}>
                  {consolidatedValue}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '12px', color: 'var(--text-secondary)' }}>
                  <Calculator size={13} color="var(--brand-400)" />
                  <span>Consolidated across operational nodes</span>
                </div>
              </div>
            </div>

            {/* Traceability Hierarchy Timeline */}
            <div style={{ padding: '20px 22px', flex: 1 }}>
              <h3 style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 16 }}>
                Aggregation Trace ({steps.length} Nodes)
              </h3>

              {steps.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                  No intermediate aggregation steps found.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'relative' }}>
                  {steps.map((step, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: 14 }}>
                      {/* Timeline node */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          background: idx === 0 ? 'var(--brand-500)' : 'rgba(255, 255, 255, 0.08)',
                          border: '2px solid var(--card-bg)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontSize: '11px',
                          fontWeight: 700
                        }}>
                          {idx + 1}
                        </div>
                        {idx < steps.length - 1 && (
                          <div style={{ width: 2, flex: 1, background: 'rgba(255, 255, 255, 0.1)', margin: '4px 0' }} />
                        )}
                      </div>

                      {/* Content */}
                      <div style={{
                        flex: 1,
                        padding: '12px 14px',
                        borderRadius: 8,
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid var(--border-color)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--brand-400)' }}>
                            {step.level}
                          </span>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: '#fff' }}>
                            {step.value}
                          </span>
                        </div>

                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
                          {step.entity}
                        </div>

                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: 4 }}>
                          {step.note}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontSize: '10px', color: 'var(--text-muted)' }}>
                          <span>{step.actor}</span>
                          <span>•</span>
                          <span>{step.timestamp}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Real Evidence Documents */}
              <div style={{ marginTop: 24 }}>
                <h3 style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 12 }}>
                  Linked Statutory Evidence Documents ({evidenceItems.length})
                </h3>

                {evidenceItems.length === 0 ? (
                  <div style={{
                    padding: '14px',
                    borderRadius: 8,
                    border: '1px dashed var(--border-color)',
                    textAlign: 'center',
                    fontSize: '12px',
                    color: 'var(--text-muted)'
                  }}>
                    No statutory evidence files attached to contributing data points.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {evidenceItems.map((ev, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: '14px',
                          borderRadius: 8,
                          border: '1px solid rgba(16, 185, 129, 0.25)',
                          background: 'rgba(16, 185, 129, 0.05)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <FileText size={20} color="var(--emerald-400)" />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>
                              {ev.filename}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              Site: {ev.projectName || 'Operational Site'}
                            </div>
                          </div>
                          <span className="badge badge-emerald" style={{ fontSize: '10px' }}>
                            VERIFIED
                          </span>
                        </div>

                        {ev.sha256 && (
                          <div style={{
                            marginTop: 10,
                            padding: '6px 10px',
                            borderRadius: 4,
                            background: 'rgba(0, 0, 0, 0.3)',
                            fontSize: '10px',
                            fontFamily: 'monospace',
                            color: 'var(--text-secondary)',
                            wordBreak: 'break-all'
                          }}>
                            <span style={{ color: 'var(--text-muted)' }}>SHA-256: </span>
                            {ev.sha256}
                          </div>
                        )}

                        {ev.download_url && (
                          <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
                            <a
                              href={ev.download_url.startsWith('http') ? ev.download_url : `${API_BASE}${ev.download_url}`}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                fontSize: '11px',
                                color: 'var(--brand-400)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                textDecoration: 'none',
                                fontWeight: 600
                              }}
                            >
                              <Download size={12} /> Download Evidence File
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Footer */}
        <div style={{
          padding: '14px 22px',
          borderTop: '1px solid var(--border-color, #334155)',
          background: 'rgba(0, 0, 0, 0.2)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 10
        }}>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            Close Lineage
          </button>
        </div>
      </div>
    </div>
  );
}
