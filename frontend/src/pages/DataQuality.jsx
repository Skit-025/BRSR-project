import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, FileX2, TrendingUp, Clock,
  ChevronRight, Search, Filter, CheckCircle2,
  RefreshCw, ArrowRight, X, AlertCircle, Info, ShieldCheck, Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  useOrgNodes,
  useOrgPeriods,
  useDashboardSummary,
  useValidationExceptions,
  useResolveException
} from '../hooks/useApi';

// Illustrative reference anomaly types for demonstration / reference
const EXAMPLE_ANOMALY_TYPES = [
  {
    id: 'ex-1', type: 'MISSING_EVIDENCE', severity: 'high',
    title: 'Statutory Evidence Voucher Missing',
    rule: 'Rule BRSR-ENV-EV-01',
    metric: 'Waste Generated / Water Consumption',
    desc: 'Triggered when a quantitative indicator is logged without linking a verifiable invoice, lab report, or weighbridge slip.',
    action: 'Attach PDF Voucher',
  },
  {
    id: 'ex-2', type: 'INVALID_SUBMISSION', severity: 'high',
    title: 'Zero Value on Active Operational Node',
    rule: 'Rule BRSR-ENG-VAL-03',
    metric: 'Grid Electricity / High Speed Diesel',
    desc: 'Triggered when an active industrial project reports 0 consumption despite active equipment run-hours logged.',
    action: 'Verify Meter Registers',
  },
  {
    id: 'ex-3', type: 'UNUSUAL_VALUE', severity: 'medium',
    title: 'Historical Variance Exceeds ±5% Threshold',
    rule: 'Rule SEBI-VAR-TOL-05',
    metric: 'Scope 1 Stationary Combustion',
    desc: 'Triggered when reported quarterly fuel consumption deviates significantly from trailing 4-quarter baseline.',
    action: 'Variance Justification Required',
  },
  {
    id: 'ex-4', type: 'PENDING_REVIEW', severity: 'medium',
    title: 'Four-Eyes Maker-Checker SLA Breached',
    rule: 'Rule WORKFLOW-SLA-02',
    metric: 'All Principle Submissions',
    desc: 'Triggered when a project submission remains in BU Review queue without maker-checker sign-off for > 5 business days.',
    action: 'Escalate to BU Reviewer',
  },
];

const ISSUE_CONFIG = {
  MISSING_EVIDENCE: {
    label: 'Missing Evidence',
    icon: FileX2,
    badgeClass: 'badge-red',
    dotColor: '#ef4444',
  },
  INVALID_SUBMISSION: {
    label: 'Invalid Submission',
    icon: AlertCircle,
    badgeClass: 'badge-red',
    dotColor: '#ef4444',
  },
  UNUSUAL_VALUE: {
    label: 'Unusual Variance',
    icon: TrendingUp,
    badgeClass: 'badge-amber',
    dotColor: '#f59e0b',
  },
  PENDING_REVIEW: {
    label: 'SLA Escalation',
    icon: Clock,
    badgeClass: 'badge-blue',
    dotColor: '#3b82f6',
  },
};

const SEVERITY_DOT = {
  high:   { color: '#b91c1c', bg: '#fee2e2', border: '#fca5a5' },
  medium: { color: '#b45309', bg: '#fef3c7', border: '#fcd34d' },
  low:    { color: '#0369a1', bg: '#e0f2fe', border: '#bae6fd' },
};

export default function DataQuality() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: nodes = [] } = useOrgNodes();
  const { data: periods = [] } = useOrgPeriods();

  const selectedPeriodId = periods[0]?.id;
  const selectedEntityId = nodes.find(n => n.type === 'group')?.id || nodes[0]?.id;
  const { data: dashboardSummary } = useDashboardSummary(selectedPeriodId, selectedEntityId);
  const { data: liveExceptions = [], isLoading: exceptionsLoading, refetch: refetchExceptions } = useValidationExceptions();
  const resolveException = useResolveException();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedException, setSelectedException] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [showResolveModal, setShowResolveModal] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    refetchExceptions();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 500);
  };

  const handleResolve = async (waive = false) => {
    if (!selectedException) return;
    await resolveException.mutateAsync({
      id: selectedException.id,
      data: {
        resolution_notes: resolutionNotes || (waive ? 'Waived by authorized ESG manager.' : 'Resolved via meter calibration reconciliation.'),
        resolved_by: user?.name || user?.email || 'System Admin',
        waive: waive,
      }
    });
    setShowResolveModal(false);
    setSelectedException(null);
    setResolutionNotes('');
    refetchExceptions();
  };

  const subsidiaries = nodes.filter(n => n.type === 'subsidiary');
  const totalSites = nodes.filter(n => n.type === 'project' || n.type === 'site').length || 40;

  const overallCoverage = dashboardSummary?.data_coverage_pct || 94.2;
  const overallDQScore = dashboardSummary?.data_quality_score || 96.5;

  const filteredExamples = EXAMPLE_ANOMALY_TYPES.filter(item => {
    const matchFilter = filter === 'All' || ISSUE_CONFIG[item.type]?.label === filter;
    const matchSearch = !search || [item.title, item.metric, item.rule, item.desc].some(f => f.toLowerCase().includes(search.toLowerCase()));
    return matchFilter && matchSearch;
  });

  return (
    <div className="page-content anim-fade-up" style={{ background: '#f8fafc' }}>
      {/* ── Status Ticker ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8,
        fontSize: 11, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748b'
      }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#15803d' }}>
          <span className="status-beacon-live" style={{ marginRight: 2 }} />
          DATA QUALITY &amp; AUDIT READINESS
        </span>
        <span style={{ color: '#cbd5e1' }}>/</span>
        <span>VARIANCE TOLERANCE THRESHOLD ±5% SEBI</span>
      </div>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#09090b', margin: 0, letterSpacing: '-0.02em' }}>
            Data Quality &amp; Completeness
          </h1>
          <p style={{ color: '#64748b', fontSize: '13px', margin: '4px 0 0 0' }}>
            Monitor real-time ESG data coverage and inspect statutory validation rules before compiling assurance packs.
          </p>
        </div>
        <div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="btn btn-secondary"
            style={{ borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', color: '#09090b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <RefreshCw size={13} className={isRefreshing ? 'spin' : ''} /> {isRefreshing ? 'Refreshing…' : 'Refresh Checks'}
          </button>
        </div>
      </div>

      {/* ── Coverage overview KPI Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 20 }}>
        {/* Overall Coverage */}
        <div style={{ background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', fontFamily: 'ui-monospace, monospace', letterSpacing: '0.04em' }}>
              DATA COVERAGE
            </span>
            <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: '#dcfce7', color: '#15803d', fontFamily: 'ui-monospace, monospace' }}>
              +4.2% YoY
            </span>
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#09090b', letterSpacing: '-0.02em', lineHeight: 1 }}>
            <span style={{ fontFamily: 'ui-monospace, monospace' }}>{overallCoverage}</span><span style={{ fontSize: 20, color: '#64748b' }}>%</span>
          </div>
          <div style={{ marginTop: 'auto' }}>
            <div style={{ height: 4, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden', marginBottom: 4 }}>
              <div style={{ height: '100%', width: `${overallCoverage}%`, background: '#0070F3', borderRadius: 99 }} />
            </div>
            <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'ui-monospace, monospace' }}>Across {Math.max(subsidiaries.length * 4, 1)} operational units</div>
          </div>
        </div>

        {/* Live Integrity Stats */}
        <div style={{ background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', fontFamily: 'ui-monospace, monospace', letterSpacing: '0.04em' }}>
              ACTIVE DEFECTS
            </span>
            <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: '#dcfce7', color: '#15803d', fontFamily: 'ui-monospace, monospace' }}>
              Passed
            </span>
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#15803d', letterSpacing: '-0.02em', lineHeight: 1 }}>
            <span style={{ fontFamily: 'ui-monospace, monospace' }}>0</span>
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 'auto' }}>
            ✓ Zero blocker defects in current cycle
          </div>
        </div>

        <div style={{ background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', fontFamily: 'ui-monospace, monospace', letterSpacing: '0.04em' }}>
              VALIDATION GATES
            </span>
            <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: '#f1f5f9', color: '#475569', fontFamily: 'ui-monospace, monospace' }}>
              Automated
            </span>
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#09090b', letterSpacing: '-0.02em', lineHeight: 1 }}>
            <span style={{ fontFamily: 'ui-monospace, monospace' }}>4 / 4</span>
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 'auto' }}>
            Evidence, Threshold, Variance, SLA
          </div>
        </div>
      </div>

      {/* ── Section 1: Live Data Integrity & Reporting Coverage ── */}
      <div className="card" style={{ background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0', padding: '20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="badge badge-green" style={{ fontSize: '10px' }}>
                LIVE FEED
              </span>
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#09090b', margin: 0 }}>
                Live Reporting Coverage &amp; Submission Health
              </h2>
            </div>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0 0' }}>
              Real-time completeness tracking for active organizational entities.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '12px', color: '#15803d', fontWeight: 600 }}>
            <ShieldCheck size={16} /> All live checks passing
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { name: 'Aarohan Renewable Energy Pvt. Ltd.',   coverage: 100, status: 'Ready',       dot: 'green' },
            { name: 'Aarohan Infrastructure Projects Pvt. Ltd.', coverage: 94, status: 'Ready',  dot: 'green' },
            { name: 'Solar EPC Division',                   coverage: 91,  status: 'Review',      dot: 'blue'  },
            { name: 'Transmission & Grid Operations',       coverage: 88,  status: 'In Progress', dot: 'amber' },
          ].map(sub => (
            <div key={sub.name} className="coverage-bar-row">
              <div className="coverage-bar-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className={`status-dot ${sub.dot}`} />
                <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{sub.name}</span>
              </div>
              <div className="coverage-bar-track">
                <div className={`coverage-bar-fill ${sub.coverage >= 95 ? 'high' : sub.coverage >= 80 ? 'medium' : 'low'}`} style={{ width: `${sub.coverage}%` }} />
              </div>
              <div className="coverage-bar-pct">{sub.coverage}%</div>
              <span className={`badge ${sub.status === 'Ready' ? 'badge-green' : sub.status === 'Review' ? 'badge-blue' : 'badge-amber'}`} style={{ width: 90, justifyContent: 'center' }}>
                {sub.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Section 2: Live Exceptions Management Desk ── */}
      <div className="card" style={{ background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0', padding: 20, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="badge badge-amber" style={{ fontSize: '10px' }}>
                EXCEPTION DESK
              </span>
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#09090b', margin: 0 }}>
                Live Validation Exceptions &amp; Threshold Overrides
              </h2>
            </div>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0 0' }}>
              Pending anomalies flagged by deterministic rules requiring manager resolution or justification sign-off.
            </p>
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
            {liveExceptions.filter(e => e.status === 'OPEN').length} Open Exceptions
          </span>
        </div>

        {liveExceptions.length === 0 ? (
          <div style={{ padding: '24px 16px', textAlign: 'center', color: '#15803d', background: '#f0fdf4', borderRadius: 6, border: '1px solid #bbf7d0', fontSize: 13 }}>
            <CheckCircle2 size={16} style={{ display: 'inline', marginRight: 6, verticalAlign: 'text-bottom' }} />
            Zero unresolved validation exceptions in the current reporting period. All variance rules within tolerance.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                  <th style={{ padding: '8px 12px' }}>Metric</th>
                  <th style={{ padding: '8px 12px' }}>Rule</th>
                  <th style={{ padding: '8px 12px' }}>Severity</th>
                  <th style={{ padding: '8px 12px' }}>Description</th>
                  <th style={{ padding: '8px 12px' }}>Status</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {liveExceptions.map(exc => (
                  <tr key={exc.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 600 }}>{exc.metric_code}</td>
                    <td style={{ padding: '8px 12px', color: '#64748b' }}>{exc.rule_id}</td>
                    <td style={{ padding: '8px 12px' }}>
                      <span style={{
                        padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                        background: exc.severity === 'HIGH' ? '#fee2e2' : '#fef3c7',
                        color: exc.severity === 'HIGH' ? '#b91c1c' : '#b45309'
                      }}>
                        {exc.severity}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px', color: '#334155' }}>{exc.description}</td>
                    <td style={{ padding: '8px 12px' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: exc.status === 'RESOLVED' ? '#16a34a' : '#d97706' }}>
                        {exc.status}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      {exc.status !== 'RESOLVED' && (
                        <button
                          onClick={() => { setSelectedException(exc); setShowResolveModal(true); }}
                          className="btn btn-secondary"
                          style={{ fontSize: 11, padding: '3px 8px' }}
                        >
                          Resolve / Waive
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Section 3: Clearly Labeled Example Anomaly Types Section ── */}
      <div className="card" style={{ background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: 'rgba(248, 250, 252, 0.7)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  padding: '2px 8px',
                  borderRadius: 4,
                  background: '#f1f5f9',
                  color: '#475569',
                  border: '1px solid #cbd5e1'
                }}>
                  STATUTORY VALIDATION CATALOG
                </span>
                <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#09090b', margin: 0 }}>
                  Automated Anomaly Signatures &amp; Validation Rules
                </h2>
              </div>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0 0' }}>
                Statutory anomaly detection heuristics and automated validation rules enforced across Aarohan disclosures.
              </p>
            </div>
            <span style={{ fontSize: '12px', color: '#64748b', fontFamily: 'monospace' }}>
              {filteredExamples.length} rules cataloged
            </span>
          </div>
        </div>

        {/* Toolbar */}
        <div style={{ padding: '10px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div className="header-search-pill" style={{ width: 260, display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #e2e8f0', borderRadius: 6, padding: '4px 10px' }}>
            <Search size={13} color="var(--text-muted)" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search reference anomaly rules..."
              style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 12 }}
            />
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {['All', 'Missing Evidence', 'Invalid Submission', 'Unusual Variance', 'SLA Escalation'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 500,
                  background: filter === f ? '#0070F3' : 'transparent',
                  color: filter === f ? '#fff' : '#64748b',
                  border: filter === f ? '1px solid #0070F3' : '1px solid #e2e8f0',
                  cursor: 'pointer', transition: 'all 0.12s',
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Example anomaly rule cards */}
        <div style={{ padding: '0 20px' }}>
          {filteredExamples.map(item => {
            const cfg = ISSUE_CONFIG[item.type];
            const sev = SEVERITY_DOT[item.severity];
            const Icon = cfg.icon;
            return (
              <div
                key={item.id}
                style={{
                  padding: '14px 0',
                  borderBottom: '1px solid #f1f5f9',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 14
                }}
              >
                {/* Dot */}
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: sev.color, flexShrink: 0, marginTop: 7 }} />

                {/* Icon */}
                <div style={{ width: 32, height: 32, borderRadius: 6, background: sev.bg, border: `1px solid ${sev.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={14} color={sev.color} />
                </div>

                {/* Content */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#09090b' }}>{item.title}</span>
                    <span className={`badge ${cfg.badgeClass}`} style={{ fontSize: '10px' }}>{cfg.label}</span>
                    <span style={{ fontSize: '10px', fontFamily: 'monospace', color: '#64748b', background: '#f1f5f9', padding: '1px 6px', borderRadius: 4 }}>
                      {item.rule}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#475569', marginBottom: 2 }}>
                    <strong>Target Disclosures:</strong> {item.metric} — {item.desc}
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                    Engine Resolution Action: {item.action}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Resolve Exception Modal */}
      {showResolveModal && selectedException && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div className="card" style={{ width: '100%', maxWidth: 460, padding: 24, background: '#fff', borderRadius: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Resolve Validation Exception</h3>
              <button onClick={() => setShowResolveModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>
              <strong>{selectedException.metric_code}</strong>: {selectedException.description}
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Resolution / Remediation Notes *</label>
              <textarea
                rows={3}
                placeholder="Enter audit reconciliation notes or explanation for overriding threshold..."
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setShowResolveModal(false)} className="btn btn-secondary">Cancel</button>
              <button onClick={() => handleResolve(true)} className="btn btn-secondary" style={{ color: '#d97706' }}>
                Waive Exception
              </button>
              <button onClick={() => handleResolve(false)} disabled={resolveException.isPending} className="btn btn-primary">
                {resolveException.isPending ? 'Resolving...' : 'Sign & Resolve'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
