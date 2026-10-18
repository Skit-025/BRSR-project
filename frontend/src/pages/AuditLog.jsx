import React, { useState, useEffect } from 'react';
import {
  Search, Filter, Download, User, Shield, FileText,
  CheckCircle2, XCircle, Upload, RefreshCw, Settings,
  Building2, LogIn, LogOut, Lock, Unlock, ChevronDown,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import PageHelpButton from '../components/PageHelpButton';

const ACTION_TYPES = {
  SUBMISSION_CREATED:   { label: 'Submission Created',  icon: FileText,     color: 'var(--accent)',  bg: 'var(--accent-subtle)',  border: 'var(--accent-border)'  },
  SUBMISSION_APPROVED:  { label: 'Approved',            icon: CheckCircle2, color: 'var(--success)', bg: 'var(--success-subtle)', border: 'var(--success-border)' },
  SUBMISSION_REJECTED:  { label: 'Changes Requested',   icon: XCircle,      color: 'var(--danger)',  bg: 'var(--danger-subtle)',  border: 'var(--danger-border)'  },
  EVIDENCE_UPLOADED:    { label: 'Evidence Uploaded',   icon: Upload,       color: 'var(--success)', bg: 'var(--success-subtle)', border: 'var(--success-border)' },
  CONSOLIDATION_RUN:    { label: 'Consolidation Run',   icon: RefreshCw,    color: '#6D28D9',        bg: '#F5F3FF',               border: '#DDD6FE'               },
  USER_PROVISIONED:     { label: 'User Provisioned',    icon: User,         color: 'var(--accent)',  bg: 'var(--accent-subtle)',  border: 'var(--accent-border)'  },
  CONFIG_CHANGED:       { label: 'Config Changed',      icon: Settings,     color: '#B45309',        bg: 'var(--warning-subtle)', border: 'var(--warning-border)' },
  LOGIN:                { label: 'Login',               icon: LogIn,        color: 'var(--text-muted)', bg: 'var(--bg-muted)',    border: 'var(--border)'         },
  REPORT_GENERATED:     { label: 'Report Generated',    icon: FileText,     color: 'var(--success)', bg: 'var(--success-subtle)', border: 'var(--success-border)' },
};

export default function AuditLog() {
  const { user, isAdmin, isGroupAdmin, isSubAdmin, isSubsidiaryAdmin, isBuAdmin } = useAuth();
  
  const isPrivilegedAdmin = Boolean(
    isAdmin ||
    isGroupAdmin ||
    isSubAdmin ||
    isSubsidiaryAdmin ||
    isBuAdmin ||
    user?.role?.includes('admin') ||
    user?.role === 'system_admin'
  );

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('All');
  const [targetTypeFilter, setTargetTypeFilter] = useState('All');
  const [limitFilter, setLimitFilter] = useState(100);
  const [expanded, setExpanded] = useState(null);
  const [chainStatus, setChainStatus] = useState(null);
  const [verifyingChain, setVerifyingChain] = useState(false);

  const fetchLogs = () => {
    if (!isPrivilegedAdmin) return;
    setLoading(true);
    setError(null);

    const params = { limit: limitFilter };
    if (actionFilter !== 'All') params.action = actionFilter;
    if (targetTypeFilter !== 'All') params.target_type = targetTypeFilter;

    api.get('/audit/logs', { params })
      .then(res => {
        setLogs(res.data || []);
      })
      .catch(err => {
        setError(err.response?.data?.detail || 'Failed to load audit events from server.');
        setLogs([]);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchLogs();
  }, [isPrivilegedAdmin, actionFilter, targetTypeFilter, limitFilter]);

  const handleVerifyChain = async () => {
    setVerifyingChain(true);
    try {
      const res = await api.get('/audit/verify-chain');
      setChainStatus(res.data);
    } catch (err) {
      setChainStatus({ is_valid: false, error_message: err.response?.data?.detail || 'Verification error' });
    } finally {
      setVerifyingChain(false);
    }
  };

  // If user is not an admin, show a strict "Admin view only" view
  if (!isPrivilegedAdmin) {
    return (
      <div className="page-content anim-fade" style={{ background: '#f8fafc', minHeight: 'calc(100vh - 80px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          background: '#ffffff',
          borderRadius: 12,
          border: '1px solid #e2e8f0',
          padding: '48px 36px',
          maxWidth: 540,
          textAlign: 'center',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
        }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px auto'
          }}>
            <Lock size={26} color="#ef4444" />
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#09090b', marginBottom: 8 }}>
            Admin View Only
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.6, marginBottom: 20 }}>
            Audit trail and activity log inspection is restricted to authorized ESG platform administrators (System Admin, Group Admin, Subsidiary Admin, BU Admin).
          </p>
          <div style={{
            padding: '12px 16px',
            borderRadius: 8,
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            fontSize: '12px',
            color: '#475569'
          }}>
            Signed in as: <strong style={{ color: '#09090b' }}>{user?.email || 'Current User'}</strong> · Role: <strong style={{ color: '#09090b' }}>{user?.role || 'Restricted'}</strong>
          </div>
        </div>
      </div>
    );
  }

  const actionFilterOptions = ['All', ...new Set(logs.map(l => l.action).filter(Boolean))];

  const filtered = logs.filter(log => {
    const actorStr = log.actor_email || log.actor_id || '';
    const detailStr = typeof log.details === 'object' ? JSON.stringify(log.details) : (log.details || '');
    const targetStr = `${log.target_type || ''} ${log.target_id || ''}`;
    const matchSearch = !search || [actorStr, detailStr, targetStr, log.action].some(f => f.toLowerCase().includes(search.toLowerCase()));
    const matchAction = actionFilter === 'All' || log.action === actionFilter;
    return matchSearch && matchAction;
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
          IMMUTABLE AUDIT TRAIL
        </span>
        <span style={{ color: '#cbd5e1' }}>/</span>
        <span>SHA-256 LIVE EVENT LEDGER</span>
      </div>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#09090b', margin: 0, letterSpacing: '-0.02em' }}>
            Audit Trail &amp; Activity Stream
          </h1>
          <p style={{ color: '#64748b', fontSize: '13px', margin: '4px 0 0 0' }}>
            Live record of operations retrieved from cryptographic audit ledger.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <PageHelpButton title="Audit Log Guide" route="/audit" />
          <button
            onClick={handleVerifyChain}
            disabled={verifyingChain}
            className="btn btn-secondary"
            style={{ borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', color: '#09090b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Shield size={14} color="#15803d" /> {verifyingChain ? 'Verifying…' : 'Verify Hash Chain'}
          </button>
        </div>
      </div>

      {/* Chain Verification Result Banner */}
      {chainStatus && (
        <div style={{
          padding: '12px 18px',
          borderRadius: 8,
          marginBottom: 16,
          background: chainStatus.is_valid ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          border: `1px solid ${chainStatus.is_valid ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 13
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {chainStatus.is_valid ? <CheckCircle2 size={18} color="#10b981" /> : <AlertCircle size={18} color="#ef4444" />}
            <span style={{ fontWeight: 600, color: chainStatus.is_valid ? '#065f46' : '#991b1b' }}>
              {chainStatus.is_valid
                ? `Cryptographic Audit Chain Intact: Verified ${chainStatus.total_records_checked ?? 0} records without tampering.`
                : `Cryptographic Audit Chain Warning: ${chainStatus.error_message || 'Chain validation failed.'}`}
            </span>
          </div>
          <button
            onClick={() => setChainStatus(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#64748b' }}
          >
            ×
          </button>
        </div>
      )}

      {/* ── Stats KPI Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'RECORDED EVENTS', value: logs.length, badge: 'Live DB', badgeType: 'green', sub: 'Verified audit log records' },
          { label: 'FILTERED VIEW',   value: filtered.length, badge: actionFilter, badgeType: 'gray', sub: 'Active query results' },
          { label: 'UNIQUE ACTORS',   value: [...new Set(logs.map(l => l.actor_email || l.actor_id).filter(Boolean))].length, badge: 'RBAC', badgeType: 'gray', sub: 'Identities recorded in ledger' },
          { label: 'LEDGER STATUS',   value: chainStatus ? (chainStatus.is_valid ? 'VALID' : 'WARN') : 'LIVE', badge: 'SHA-256', badgeType: 'green', sub: 'Cryptographic hash chaining' },
        ].map(s => (
          <div key={s.label} style={{
            background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0', padding: '16px 18px',
            display: 'flex', flexDirection: 'column', gap: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', fontFamily: 'ui-monospace, monospace', letterSpacing: '0.04em' }}>
                {s.label}
              </span>
              <span style={{
                fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
                background: s.badgeType === 'green' ? '#dcfce7' : '#f1f5f9',
                color: s.badgeType === 'green' ? '#15803d' : '#475569',
                fontFamily: 'ui-monospace, monospace'
              }}>
                {s.badge}
              </span>
            </div>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#09090b', letterSpacing: '-0.02em', lineHeight: 1 }}>
              <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{s.value}</span>
            </div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 'auto' }}>
              {s.sub}
            </div>
          </div>
        ))}
      </div>

      {/* ── Log table card ── */}
      <div className="card" style={{ background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        {/* Toolbar */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div className="header-search-pill" style={{ width: 260, display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #e2e8f0', borderRadius: 6, padding: '6px 10px' }}>
            <Search size={13} color="var(--text-muted)" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search live events..."
              style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 13 }}
            />
          </div>
          <select
            value={actionFilter}
            onChange={e => setActionFilter(e.target.value)}
            style={{
              padding: '6px 12px', borderRadius: 6, border: '1px solid #e2e8f0',
              fontSize: 12, fontWeight: 500, color: '#09090b', background: '#fff',
              cursor: 'pointer',
            }}
          >
            {actionFilterOptions.map(o => <option key={o} value={o}>{o === 'All' ? 'All Actions' : o}</option>)}
          </select>

          <select
            value={targetTypeFilter}
            onChange={e => setTargetTypeFilter(e.target.value)}
            style={{
              padding: '6px 12px', borderRadius: 6, border: '1px solid #e2e8f0',
              fontSize: 12, fontWeight: 500, color: '#09090b', background: '#fff',
              cursor: 'pointer',
            }}
          >
            <option value="All">All Resource Types</option>
            <option value="submission">Submissions</option>
            <option value="evidence">Evidence Vault</option>
            <option value="org_node">Org Nodes</option>
            <option value="user">Users</option>
            <option value="report">Reports</option>
          </select>

          <select
            value={limitFilter}
            onChange={e => setLimitFilter(Number(e.target.value))}
            style={{
              padding: '6px 12px', borderRadius: 6, border: '1px solid #e2e8f0',
              fontSize: 12, fontWeight: 500, color: '#09090b', background: '#fff',
              cursor: 'pointer',
            }}
          >
            <option value={50}>Limit: 50</option>
            <option value={100}>Limit: 100</option>
            <option value={200}>Limit: 200</option>
            <option value={500}>Limit: 500</option>
          </select>

          <button
            onClick={fetchLogs}
            disabled={loading}
            className="btn btn-secondary"
            style={{ padding: '6px 12px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <RefreshCw size={12} className={loading ? 'spin' : ''} /> Refresh
          </button>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 12, color: '#64748b' }}>{filtered.length} events</span>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
            <RefreshCw size={20} className="spin" style={{ margin: '0 auto 10px auto' }} />
            <div>Loading live audit ledger...</div>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#ef4444' }}>
            <AlertCircle size={24} style={{ margin: '0 auto 8px auto' }} />
            <div>{typeof error === 'object' ? JSON.stringify(error) : error}</div>
          </div>
        )}

        {/* Log entries */}
        {!loading && !error && (
          <div style={{ padding: '0 20px' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '48px 20px', textAlign: 'center', color: '#64748b' }}>
                <CheckCircle2 size={32} color="#10b981" style={{ margin: '0 auto 12px auto' }} />
                <div style={{ fontWeight: 600, color: '#09090b', marginBottom: 4 }}>No audit events logged yet</div>
                <div style={{ fontSize: 12 }}>Platform activity such as logins, submissions, reviews, and consolidations will be recorded here with SHA-256 hashes.</div>
              </div>
            ) : filtered.map(log => {
              const cfg = ACTION_TYPES[log.action] || {
                label: log.action,
                icon: Shield,
                color: 'var(--brand-400, #3b82f6)',
                bg: 'rgba(59, 130, 246, 0.1)',
                border: 'rgba(59, 130, 246, 0.2)'
              };
              const Icon = cfg.icon;
              const isExpanded = expanded === log.id;
              const timeStr = log.created_at ? new Date(log.created_at).toLocaleString('en-IN') : '—';
              const actorName = log.actor_email || log.actor_id || 'System';
              const targetStr = log.target_type ? `${log.target_type}${log.target_id ? ` #${log.target_id.slice(0, 8)}` : ''}` : 'System operation';

              return (
                <div
                  key={log.id}
                  style={{
                    padding: '14px 0',
                    borderBottom: '1px solid #f1f5f9',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 14,
                    cursor: 'pointer'
                  }}
                  onClick={() => setExpanded(isExpanded ? null : log.id)}
                >
                  {/* Icon */}
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: cfg.bg, border: `1px solid ${cfg.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                    <Icon size={14} color={cfg.color} />
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#09090b' }}>{actorName}</span>
                      {log.actor_role && (
                        <span style={{ fontSize: 11, color: '#64748b', background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '1px 6px', borderRadius: 99 }}>
                          {log.actor_role}
                        </span>
                      )}
                      <span className="badge" style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, fontSize: 10 }}>
                        {cfg.label}
                      </span>
                    </div>

                    <div style={{ fontSize: 12, color: '#475569' }}>
                      <span>Target: {targetStr}</span>
                      {isExpanded && (
                        <div style={{ marginTop: 8, padding: '10px 12px', background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 11, color: '#334155', lineHeight: 1.6 }}>
                          <div><strong>Record Hash:</strong> <span style={{ fontFamily: 'monospace' }}>{log.record_hash}</span></div>
                          {log.prev_hash && <div><strong>Prev Hash:</strong> <span style={{ fontFamily: 'monospace' }}>{log.prev_hash}</span></div>}
                          {log.ip_address && <div><strong>Client IP:</strong> {log.ip_address}</div>}
                          {log.details && (
                            <div style={{ marginTop: 4 }}>
                              <strong>Details:</strong>
                              <pre style={{ margin: '4px 0 0 0', padding: '6px', background: '#ffffff', borderRadius: 4, overflowX: 'auto', fontSize: 10 }}>
                                {typeof log.details === 'object' ? JSON.stringify(log.details, null, 2) : log.details}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{timeStr}</div>
                  </div>

                  <ChevronDown size={13} color="#94a3b8" style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0, marginTop: 6 }} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
