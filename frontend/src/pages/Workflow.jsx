import React, { useState, useMemo } from 'react';
import {
  GitBranch, CheckCircle, XCircle, Clock, RefreshCw,
  User, MessageSquare, Lock, TrendingUp, Activity,
  BarChart2, PieChart as PieIcon, AlertTriangle, Send
} from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line, Area, AreaChart
} from 'recharts';
import { useWorkflowQueue, useReviewSubmission } from '../hooks/useApi';
import { workflowApi } from '../api/client';
import { useQueryClient } from '@tanstack/react-query';

const STATUS_STYLES = {
  DRAFT:               { label: 'Draft',           color: '#64748b', bg: 'rgba(100,116,139,0.15)' },
  SUBMITTED:           { label: 'Submitted',       color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  UNDER_BU_REVIEW:     { label: 'BU Review',       color: '#38bdf8', bg: 'rgba(56,189,248,0.15)' },
  BU_APPROVED:         { label: 'BU Approved',     color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
  SUBSIDIARY_APPROVED: { label: 'Sub. Approved',   color: '#6366f1', bg: 'rgba(99,102,241,0.15)' },
  CONSOLIDATED:        { label: 'Consolidated',    color: '#a78bfa', bg: 'rgba(167,139,250,0.15)' },
  RETURNED:            { label: 'Returned',        color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
};

const STATUS_COLORS = {
  DRAFT: '#64748b', SUBMITTED: '#f59e0b', UNDER_BU_REVIEW: '#38bdf8',
  BU_APPROVED: '#10b981', SUBSIDIARY_APPROVED: '#6366f1',
  CONSOLIDATED: '#a78bfa', RETURNED: '#ef4444',
};

// Custom tooltip for pie chart
function CustomPieTooltip({ active, payload }) {
  if (active && payload?.length) {
    const { name, value, payload: p } = payload[0];
    return (
      <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
        <div style={{ fontWeight: 700, color: p.color, marginBottom: 4 }}>{name}</div>
        <div style={{ color: 'var(--text-primary)' }}>{value} pack{value !== 1 ? 's' : ''}</div>
      </div>
    );
  }
  return null;
}

// Custom tooltip for bar chart
function CustomBarTooltip({ active, payload, label }) {
  if (active && payload?.length) {
    return (
      <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
        <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>{label}</div>
        {payload.map((p) => (
          <div key={p.name} style={{ color: p.color, marginBottom: 2 }}>
            {p.name}: <strong>{p.value}</strong>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

// Approval pipeline stages
const PIPELINE_STAGES = [
  { key: 'DRAFT',               label: 'Draft',        icon: '📝' },
  { key: 'SUBMITTED',           label: 'Submitted',    icon: '📤' },
  { key: 'UNDER_BU_REVIEW',     label: 'BU Review',    icon: '🔍' },
  { key: 'BU_APPROVED',         label: 'BU Approved',  icon: '✅' },
  { key: 'SUBSIDIARY_APPROVED', label: 'Sub Approved', icon: '🏢' },
  { key: 'CONSOLIDATED',        label: 'Consolidated', icon: '📊' },
];

export default function Workflow() {
  const qc = useQueryClient();
  const { data: queue = [], isLoading, refetch, isRefetching } = useWorkflowQueue();
  const reviewMutation = useReviewSubmission();

  const [selected, setSelected]           = useState(null);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewAction, setReviewAction]   = useState('');
  const [lockingPeriod, setLockingPeriod] = useState('');
  const [notice, setNotice]               = useState(null);
  const [activeTab, setActiveTab]         = useState('overview');

  // ── Derived analytics from queue data ──────────────────────────
  const statusCounts = useMemo(() => {
    const counts = {};
    queue.forEach((item) => {
      counts[item.status] = (counts[item.status] || 0) + 1;
    });
    return counts;
  }, [queue]);

  const pieData = useMemo(() =>
    Object.entries(statusCounts).map(([status, count]) => ({
      name: STATUS_STYLES[status]?.label || status,
      value: count,
      color: STATUS_COLORS[status] || '#64748b',
    })),
  [statusCounts]);

  // Entity-level submission bar data
  const entityBarData = useMemo(() => {
    const entityMap = {};
    queue.forEach((item) => {
      const key = item.entity_name || item.entity_id?.slice(0, 8) || 'Unknown';
      if (!entityMap[key]) entityMap[key] = { entity: key, submitted: 0, approved: 0, returned: 0 };
      if (['SUBMITTED', 'UNDER_BU_REVIEW'].includes(item.status)) entityMap[key].submitted++;
      if (['BU_APPROVED', 'SUBSIDIARY_APPROVED', 'CONSOLIDATED'].includes(item.status)) entityMap[key].approved++;
      if (item.status === 'RETURNED') entityMap[key].returned++;
    });
    return Object.values(entityMap);
  }, [queue]);

  // Monthly trend data (synthesized from queue timestamps)
  const trendData = useMemo(() => {
    const monthMap = {};
    queue.forEach((item) => {
      const d = item.created_at ? new Date(item.created_at) : new Date();
      const key = d.toLocaleString('en-IN', { month: 'short', year: '2-digit' });
      if (!monthMap[key]) monthMap[key] = { month: key, submissions: 0, approvals: 0 };
      monthMap[key].submissions++;
      if (['BU_APPROVED', 'SUBSIDIARY_APPROVED', 'CONSOLIDATED'].includes(item.status)) {
        monthMap[key].approvals++;
      }
    });
    return Object.values(monthMap).slice(-6);
  }, [queue]);

  // Pipeline counts per stage
  const stageCounts = useMemo(() =>
    PIPELINE_STAGES.map((s) => ({ ...s, count: statusCounts[s.key] || 0 })),
  [statusCounts]);

  // ── Actions ─────────────────────────────────────────────────────
  const handleReview = async (action) => {
    if (!selected) return;
    setNotice(null);
    try {
      await reviewMutation.mutateAsync({
        submissionId: selected.submission_id,
        data: { action, comments: reviewComment },
      });
      setNotice({
        type: 'success',
        text: `Pack ${action === 'approve' ? 'APPROVED ✓' : 'RETURNED ↩'} successfully. Immutable audit trail recorded.`,
      });
      setSelected(null);
      setReviewComment('');
      setReviewAction('');
      refetch();
    } catch (err) {
      setNotice({ type: 'error', text: err.response?.data?.detail || 'Review action failed.' });
    }
  };

  const handleLockPeriod = async () => {
    if (!lockingPeriod) return;
    setNotice(null);
    try {
      const res = await workflowApi.lockPeriod(lockingPeriod);
      setNotice({ type: 'success', text: `Period LOCKED 🔒  SHA-256: ${res.data?.snapshot_hash?.slice(0, 24)}…` });
      setLockingPeriod('');
      qc.invalidateQueries({ queryKey: ['dashboard-summary'] });
    } catch (err) {
      setNotice({ type: 'error', text: err.response?.data?.detail || 'Period lock failed.' });
    }
  };

  const totalPacks   = queue.length;
  const pendingCount = queue.filter(q => ['SUBMITTED', 'UNDER_BU_REVIEW'].includes(q.status)).length;
  const approvedCount = queue.filter(q => ['BU_APPROVED', 'SUBSIDIARY_APPROVED', 'CONSOLIDATED'].includes(q.status)).length;
  const returnedCount = queue.filter(q => q.status === 'RETURNED').length;

  const tabs = [
    { key: 'overview', label: 'Overview', icon: <PieIcon size={14} /> },
    { key: 'queue',    label: `Review Queue (${pendingCount})`, icon: <Clock size={14} /> },
    { key: 'lock',     label: 'Period Lock',  icon: <Lock size={14} /> },
  ];

  return (
    <div className="page-content anim-fade">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--brand-400)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '4px' }}>
            FOUR-EYES MAKER-CHECKER
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <GitBranch size={24} color="var(--brand-400)" />
            Workflow & Approval Engine
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '4px 0 0 0' }}>
            SoD-enforced approval queue, period locking, and immutable audit trail.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isRefetching}
          className="btn btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px' }}
        >
          <RefreshCw size={13} className={isRefetching ? 'spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Notice */}
      {notice && (
        <div style={{
          padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontSize: '13px', fontWeight: 600,
          background: notice.type === 'success' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
          color: notice.type === 'success' ? '#10b981' : '#ef4444',
          border: `1px solid ${notice.type === 'success' ? '#10b981' : '#ef4444'}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span>{notice.text}</span>
          <button onClick={() => setNotice(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: '16px' }}>×</button>
        </div>
      )}

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Total Packs',    value: totalPacks,    color: 'var(--brand-400)', icon: <Activity size={18} /> },
          { label: 'Pending Review', value: pendingCount,  color: '#f59e0b',          icon: <Clock size={18} /> },
          { label: 'Approved',       value: approvedCount, color: '#10b981',          icon: <CheckCircle size={18} /> },
          { label: 'Returned',       value: returnedCount, color: '#ef4444',          icon: <XCircle size={18} /> },
        ].map(({ label, value, color, icon }) => (
          <div key={label} style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-default)', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: 40, height: 40, borderRadius: '10px', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>
              {icon}
            </div>
            <div>
              <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: 'var(--bg-card)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border-default)' }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              flex: 1, padding: '8px 12px', borderRadius: '7px', fontSize: '13px', fontWeight: 600,
              border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              background: activeTab === t.key ? 'var(--brand-400)' : 'transparent',
              color: activeTab === t.key ? '#fff' : 'var(--text-secondary)',
              transition: 'all 0.2s',
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ───────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Approval Pipeline */}
          <div style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-default)', padding: '20px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Send size={14} color="var(--brand-400)" /> Approval Pipeline
            </h3>
            <div style={{ display: 'flex', gap: '0', alignItems: 'center', overflowX: 'auto', paddingBottom: '4px' }}>
              {stageCounts.map((stage, i) => (
                <React.Fragment key={stage.key}>
                  <div style={{ textAlign: 'center', minWidth: '100px', flex: '1 0 100px' }}>
                    <div style={{ fontSize: '24px', marginBottom: '6px' }}>{stage.icon}</div>
                    <div style={{
                      fontSize: '22px', fontWeight: 800,
                      color: stage.count > 0 ? STATUS_COLORS[stage.key] : 'var(--text-muted)',
                    }}>
                      {stage.count}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, marginTop: '4px' }}>{stage.label}</div>
                  </div>
                  {i < stageCounts.length - 1 && (
                    <div style={{ fontSize: '18px', color: 'var(--border-default)', flexShrink: 0, padding: '0 4px' }}>›</div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Charts Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: '16px' }}>
            {/* Status Distribution Pie */}
            <div style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-default)', padding: '20px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <PieIcon size={14} color="var(--brand-400)" /> Status Distribution
              </h3>
              {pieData.length === 0 ? (
                <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                  No submission packs in queue
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                    <Legend
                      formatter={(value, entry) => (
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Entity Submission Bar */}
            <div style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-default)', padding: '20px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <BarChart2 size={14} color="var(--brand-400)" /> Entity Submission Breakdown
              </h3>
              {entityBarData.length === 0 ? (
                <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                  No data available yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={entityBarData} barSize={14} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" />
                    <XAxis dataKey="entity" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} allowDecimals={false} />
                    <Tooltip content={<CustomBarTooltip />} />
                    <Legend formatter={(v) => <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{v}</span>} />
                    <Bar dataKey="submitted" name="Pending" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="approved" name="Approved" fill="#10b981" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="returned" name="Returned" fill="#ef4444" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Trend Chart */}
          {trendData.length > 0 && (
            <div style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-default)', padding: '20px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <TrendingUp size={14} color="var(--brand-400)" /> Submission Trend (Last 6 Months)
              </h3>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="subGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--brand-400)" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="var(--brand-400)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="appGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} allowDecimals={false} />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Area type="monotone" dataKey="submissions" name="Submissions" stroke="var(--brand-400)" fill="url(#subGrad)" strokeWidth={2} dot={{ r: 3 }} />
                  <Area type="monotone" dataKey="approvals"   name="Approvals"  stroke="#10b981"          fill="url(#appGrad)"   strokeWidth={2} dot={{ r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* SoD Notice */}
          <div style={{ padding: '14px 18px', borderRadius: '10px', background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.2)', fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <AlertTriangle size={16} color="#6366f1" style={{ flexShrink: 0, marginTop: '1px' }} />
            <div>
              <strong style={{ color: 'var(--text-primary)' }}>Segregation of Duties (SoD) — Enforced server-side.</strong>{' '}
              The reviewer must be a different user than the maker who submitted the pack. Violation attempts are logged to the immutable audit trail.
              All approved packs receive a SHA-256 cryptographic seal at consolidation.
            </div>
          </div>
        </div>
      )}

      {/* ── REVIEW QUEUE TAB ──────────────────────────────────────── */}
      {activeTab === 'queue' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Queue Table */}
          <div style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-default)', overflowX: 'auto' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={16} color="var(--brand-400)" />
              <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>
                Pending Review Queue — {queue.length} pack{queue.length !== 1 ? 's' : ''}
              </span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-default)', background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Submission ID</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Entity</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Period</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Submitted By</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Data Points</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>Loading review queue…</td></tr>
                ) : queue.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>
                      <CheckCircle size={32} color="#10b981" style={{ display: 'block', margin: '0 auto 10px' }} />
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>All Clear!</div>
                      No submissions pending review at this time.
                    </td>
                  </tr>
                ) : (
                  queue.map((item) => {
                    const s = STATUS_STYLES[item.status] || STATUS_STYLES.SUBMITTED;
                    const isSelected = selected?.submission_id === item.submission_id;
                    return (
                      <tr
                        key={item.submission_id}
                        style={{
                          borderBottom: '1px solid var(--border-default)',
                          background: isSelected ? 'var(--bg-elevated)' : 'transparent',
                          transition: 'background 0.15s',
                        }}
                      >
                        <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '11px', color: 'var(--brand-400)' }}>
                          {item.submission_id?.slice(0, 8)}…
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 600 }}>{item.entity_name || item.entity_id}</td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{item.period_code || item.period_id?.slice(0, 8)}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, color: s.color, background: s.bg }}>
                            {s.label}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <User size={12} /> {item.maker_email || 'Maker'}
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{item.total_data_points || 0}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <button
                            onClick={() => { setSelected(isSelected ? null : item); setReviewComment(''); }}
                            style={{
                              padding: '5px 14px', borderRadius: '5px', fontSize: '12px', fontWeight: 600,
                              background: isSelected ? 'var(--brand-400)' : 'var(--bg-elevated)',
                              border: `1px solid ${isSelected ? 'var(--brand-400)' : 'var(--border-default)'}`,
                              color: isSelected ? '#fff' : 'var(--text-primary)', cursor: 'pointer',
                            }}
                          >
                            {isSelected ? 'Cancel' : 'Review'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Review Action Panel */}
          {selected && (
            <div style={{ padding: '20px', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--brand-400)', animation: 'slideIn 0.2s ease' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--brand-400)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MessageSquare size={16} /> Review Decision — {selected.entity_name} · {selected.period_code}
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '14px', padding: '8px 12px', background: 'rgba(99,102,241,0.06)', borderRadius: '6px', borderLeft: '3px solid #6366f1' }}>
                ⚠ SoD Enforced: reviewer must differ from submitter ({selected.maker_email || 'maker'})
              </p>
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Review comments (mandatory for RETURN, recommended for APPROVE)…"
                rows={3}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', fontSize: '13px', resize: 'vertical', boxSizing: 'border-box', marginBottom: '12px' }}
              />
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => handleReview('approve')}
                  disabled={reviewMutation.isPending}
                  style={{ padding: '9px 20px', borderRadius: '7px', fontSize: '13px', fontWeight: 700, background: '#10b981', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <CheckCircle size={14} /> Approve
                </button>
                <button
                  onClick={() => handleReview('return')}
                  disabled={reviewMutation.isPending || !reviewComment}
                  style={{ padding: '9px 20px', borderRadius: '7px', fontSize: '13px', fontWeight: 700, background: '#ef4444', color: '#fff', border: 'none', cursor: !reviewComment ? 'not-allowed' : 'pointer', opacity: !reviewComment ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <XCircle size={14} /> Return with Comments
                </button>
                <button
                  onClick={() => setSelected(null)}
                  style={{ padding: '9px 20px', borderRadius: '7px', fontSize: '13px', fontWeight: 600, background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)', cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── PERIOD LOCK TAB ──────────────────────────────────────── */}
      {activeTab === 'lock' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ padding: '24px', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-default)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <Lock size={20} color="#f59e0b" />
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Lock Reporting Period
              </h2>
              <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
                ESG Manager / Group Admin Only
              </span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px', maxWidth: '600px' }}>
              Locking a period freezes all submission packs for that period and generates an immutable SHA-256 cryptographic snapshot. 
              This action cannot be reversed. All subsequent changes require a new period to be opened.
            </p>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 300px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Period ID (UUID from Org Hierarchy settings)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 3fa85f64-5717-4562-b3fc-2c963f66afa6"
                  value={lockingPeriod}
                  onChange={(e) => setLockingPeriod(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>
              <button
                onClick={handleLockPeriod}
                disabled={!lockingPeriod}
                style={{
                  padding: '10px 22px', borderRadius: '8px', fontSize: '13px', fontWeight: 700,
                  background: lockingPeriod ? '#f59e0b' : 'var(--bg-elevated)',
                  color: lockingPeriod ? '#000' : 'var(--text-muted)',
                  border: 'none', cursor: lockingPeriod ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', gap: '8px',
                }}
              >
                <Lock size={14} /> Lock & Generate SHA-256 Seal
              </button>
            </div>
          </div>

          {/* How locking works */}
          <div style={{ padding: '20px', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-default)' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '14px' }}>How Period Locking Works</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { step: '1', text: 'All SUBMITTED / APPROVED packs for the period are frozen — no further edits permitted.' },
                { step: '2', text: 'A SHA-256 hash of the entire dataset snapshot is computed and stored in the audit ledger.' },
                { step: '3', text: 'The snapshot hash serves as a tamper-evident seal for regulatory submission.' },
                { step: '4', text: 'Auditors can verify data integrity at any point by re-hashing the snapshot and comparing.' },
              ].map(({ step, text }) => (
                <div key={step} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', fontSize: '13px' }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--brand-400)', color: '#fff', fontWeight: 700, fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {step}
                  </div>
                  <span style={{ color: 'var(--text-secondary)', lineHeight: '1.5' }}>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
