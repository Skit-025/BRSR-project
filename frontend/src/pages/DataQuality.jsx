import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, FileQuestion, XCircle, Clock, CheckCircle2,
  ArrowRight, ShieldAlert, Sparkles, Filter
} from 'lucide-react';
import { useDataQuality } from '../hooks/useApi';

export default function DataQuality() {
  const navigate = useNavigate();
  const { data: dq } = useDataQuality();
  const [filterType, setFilterType] = useState('all');

  const filteredItems = dq?.items?.filter((item) => {
    return filterType === 'all' || item.type === filterType;
  }) || [];

  return (
    <div className="page-content">
      {/* Header (Section 25 Specification) */}
      <div className="page-header">
        <div>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontWeight: 600 }}>
            Assurance & Data Quality
          </div>
          <h1 className="page-title" style={{ marginTop: '2px' }}>
            Data Quality & Telemetry Health
          </h1>
          <p className="page-sub">
            Continuous automated anomaly detection and evidence compliance monitoring across 32 projects.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="badge badge-ready" style={{ fontSize: '12px' }}>
            <span className="status-dot" />
            94.2% Overall Coverage
          </span>
        </div>
      </div>

      {/* Issues Requiring Attention (Section 25 Specification) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div 
          className="kpi-card" 
          style={{ cursor: 'pointer', border: filterType === 'missing_evidence' ? '1px solid var(--accent-black)' : '1px solid var(--border-subtle)' }}
          onClick={() => setFilterType(filterType === 'missing_evidence' ? 'all' : 'missing_evidence')}
        >
          <div className="kpi-label">
            <span>Missing Evidence</span>
            <FileQuestion size={14} color="var(--status-warn-text)" />
          </div>
          <div className="kpi-value" style={{ color: 'var(--status-warn-text)' }}>
            {dq?.summary.missingEvidence}
          </div>
          <div className="kpi-footer">
            <span>Unlinked invoices or logbooks</span>
          </div>
        </div>

        <div 
          className="kpi-card"
          style={{ cursor: 'pointer', border: filterType === 'invalid_submissions' ? '1px solid var(--accent-black)' : '1px solid var(--border-subtle)' }}
          onClick={() => setFilterType(filterType === 'invalid_submissions' ? 'all' : 'invalid_submissions')}
        >
          <div className="kpi-label">
            <span>Invalid Submissions</span>
            <XCircle size={14} color="var(--status-error-text)" />
          </div>
          <div className="kpi-value" style={{ color: 'var(--status-error-text)' }}>
            {dq?.summary.invalidSubmissions}
          </div>
          <div className="kpi-footer">
            <span>Expired recycler or lab licenses</span>
          </div>
        </div>

        <div 
          className="kpi-card"
          style={{ cursor: 'pointer', border: filterType === 'unusual_values' ? '1px solid var(--accent-black)' : '1px solid var(--border-subtle)' }}
          onClick={() => setFilterType(filterType === 'unusual_values' ? 'all' : 'unusual_values')}
        >
          <div className="kpi-label">
            <span>Unusual Values</span>
            <AlertTriangle size={14} color="var(--status-warn-text)" />
          </div>
          <div className="kpi-value">
            {dq?.summary.unusualValues}
          </div>
          <div className="kpi-footer">
            <span>Statistical 3-sigma outliers</span>
          </div>
        </div>

        <div 
          className="kpi-card"
          style={{ cursor: 'pointer', border: filterType === 'pending_reviews' ? '1px solid var(--accent-black)' : '1px solid var(--border-subtle)' }}
          onClick={() => setFilterType(filterType === 'pending_reviews' ? 'all' : 'pending_reviews')}
        >
          <div className="kpi-label">
            <span>Pending Reviews</span>
            <Clock size={14} color="var(--status-review-text)" />
          </div>
          <div className="kpi-value" style={{ color: 'var(--status-review-text)' }}>
            {dq?.summary.pendingReviews}
          </div>
          <div className="kpi-footer">
            <span>Awaiting BU checker sign-off</span>
          </div>
        </div>
      </div>

      {/* Issues Queue Table */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="card-title">Remediation Action Queue</div>
            <div className="card-sub">Click any issue to jump directly into the affected submission</div>
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
            Showing {filteredItems.length} issues
          </span>
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>Severity</th>
              <th>Project</th>
              <th>Metric Area</th>
              <th>Anomaly Description</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item) => (
              <tr 
                key={item.id} 
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(item.link)}
              >
                <td>
                  <span className={`badge ${item.severity === 'high' ? 'badge-error' : item.severity === 'warning' ? 'badge-attention' : 'badge-review'}`}>
                    {item.severity.toUpperCase()}
                  </span>
                </td>
                <td style={{ fontWeight: 600 }}>
                  {item.project}
                </td>
                <td style={{ color: 'var(--text-secondary)' }}>
                  {item.metric}
                </td>
                <td style={{ color: 'var(--text-primary)' }}>
                  {item.issue}
                </td>
                <td>
                  <button 
                    className="btn btn-secondary btn-sm"
                    onClick={(e) => { e.stopPropagation(); navigate(item.link); }}
                    style={{ height: '26px', fontSize: '11px' }}
                  >
                    <span>Remediate</span>
                    <ArrowRight size={12} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
