import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GitBranch, CheckCircle, XCircle, Clock, RefreshCw,
  User, MessageSquare, Lock, TrendingUp, Activity,
  BarChart2, PieChart as PieIcon, AlertTriangle, Send,
  ChevronRight, Building2, FileText, Paperclip, Eye
} from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line, Area, AreaChart
} from 'recharts';
import { useWorkflowQueue, useReviewSubmission } from '../hooks/useApi';
import { workflowApi, collectionApi } from '../api/client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';

const STATUS_STYLES = {
  DRAFT:               { label: 'Draft',           color: '#475569', bg: '#f1f5f9' },
  SUBMITTED:           { label: 'Submitted',       color: '#b45309', bg: '#fef3c7' },
  UNDER_BU_REVIEW:     { label: 'BU Review',       color: '#0369a1', bg: '#e0f2fe' },
  BU_APPROVED:         { label: 'BU Approved',     color: '#15803d', bg: '#dcfce7' },
  SUBSIDIARY_APPROVED: { label: 'Sub. Approved',   color: '#1e293b', bg: '#e2e8f0' },
  CONSOLIDATED:        { label: 'Consolidated',    color: '#4338ca', bg: '#e0e7ff' },
  RETURNED:            { label: 'Returned',        color: '#b91c1c', bg: '#fee2e2' },
};

const STATUS_COLORS = {
  DRAFT: '#64748b', SUBMITTED: '#f59e0b', UNDER_BU_REVIEW: '#0284c7',
  BU_APPROVED: '#10b981', SUBSIDIARY_APPROVED: '#1e293b',
  CONSOLIDATED: '#6366f1', RETURNED: '#ef4444',
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
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: queue = [], isLoading, refetch, isRefetching } = useWorkflowQueue();
  const reviewMutation = useReviewSubmission();

  const [selected, setSelected]           = useState(null);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewAction, setReviewAction]   = useState('');
  const [lockingPeriod, setLockingPeriod] = useState('');
  const [notice, setNotice]               = useState(null);
  const [activeTab, setActiveTab]         = useState('overview');
  const [packDetail, setPackDetail]       = useState(null);  // loaded data points for selected pack
  const [loadingDetail, setLoadingDetail] = useState(false);

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
  const handleReview = async (decision) => {
    if (!selected || !user?.id) return;
    setNotice(null);
    // Backend expects uppercase enum values: APPROVE → ReviewDecision.APPROVE
    const backendDecision = decision === 'approve' ? 'APPROVE' : decision === 'return' ? 'RETURN' : decision.toUpperCase();
    try {
      await reviewMutation.mutateAsync({
        submissionId: selected.submission_id,
        data: {
          decision: backendDecision,
          reviewer_id: user.id,
          comment: reviewComment,
        },
      });
      setNotice({
        type: 'success',
        text: `Pack ${backendDecision === 'APPROVE' ? 'APPROVED ✓' : 'RETURNED ↩'} successfully. Segregation of Duties validated. Automated calculation & boundary consolidation triggered!`,
        action: backendDecision
      });
      setSelected(null);
      setPackDetail(null);
      setReviewComment('');
      setReviewAction('');
      refetch();
    } catch (err) {
      setNotice({ type: 'error', text: err.response?.data?.detail || 'Review action failed.' });
    }
  };

  // Load data-point detail for a submission (drill-down §15, §29)
  const loadPackDetail = async (item) => {
    setSelected(item);
    setPackDetail(null);
    setReviewComment('');
    if (!item.entity_id || !item.period_id) return;
    setLoadingDetail(true);
    try {
      const res = await collectionApi.getPack(item.entity_id, item.period_id);
      setPackDetail(res.data);
    } catch (e) {
      setPackDetail(null);
    } finally {
      setLoadingDetail(false);
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
    <div className="page-content anim-fade-up" style={{ background: '#f8fafc' }}>
      {/* ── Status Ticker ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8,
        fontSize: 11, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748b'
      }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#15803d' }}>
          <span className="status-beacon-live" style={{ marginRight: 2 }} />
          REVIEW QUEUE ACTIVE
        </span>
        <span style={{ color: '#cbd5e1' }}>/</span>
        <span>FOUR-EYES MAKER-CHECKER SOD ENFORCED</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#09090b', margin: 0, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <GitBranch size={24} color="#09090b" />
            Reviews &amp; Workflow Engine
          </h1>
          <p style={{ color: '#64748b', fontSize: '13px', margin: '4px 0 0 0' }}>
            Segregation of duties (SoD) enforced approval queue, BU aggregations, and immutable period locks.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isRefetching}
          className="btn btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', color: '#09090b', fontWeight: 600 }}
        >
          <RefreshCw size={13} className={isRefetching ? 'spin' : ''} />
          Refresh Queue
        </button>
      </div>

      {/* Notice */}
      {notice && (
        <div style={{
          padding: '12px 16px', borderRadius: '6px', marginBottom: '20px', fontSize: '13px', fontWeight: 600,
          background: notice.type === 'success' ? '#f0fdf4' : '#fef2f2',
          color: notice.type === 'success' ? '#15803d' : '#b91c1c',
          border: `1px solid ${notice.type === 'success' ? '#bbf7d0' : '#fca5a5'}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span>{notice.text}</span>
            {notice.action === 'APPROVE' && (
              <button
                onClick={() => navigate('/consolidation')}
                style={{
                  padding: '5px 12px',
                  borderRadius: 6,
                  border: 'none',
                  background: '#15803d',
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                Inspect Calculation Pipeline →
              </button>
            )}
          </div>
          <button onClick={() => setNotice(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: '16px' }}>×</button>
        </div>
      )}

      {/* KPI Cards — Matching Reference */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '20px' }}>
        {[
          { label: 'TOTAL SUBMISSIONS', value: totalPacks, badge: `${totalPacks} registered`, badgeType: 'gray', sub: 'Across active entities' },
          { label: 'PENDING BU REVIEW', value: pendingCount, badge: pendingCount > 0 ? `${pendingCount} urgent` : '0 backlog', badgeType: pendingCount > 0 ? 'red' : 'green', sub: 'Maker-Checker gate' },
          { label: 'APPROVED PACKS',    value: approvedCount, badge: 'Validated', badgeType: 'green', sub: 'Ready for aggregation' },
          { label: 'RETURNED FOR EDIT', value: returnedCount, badge: returnedCount > 0 ? 'Action req.' : 'All clear', badgeType: returnedCount > 0 ? 'red' : 'gray', sub: 'Correction required' },
        ].map((kpi) => (
          <div key={kpi.label} style={{
            background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0',
            padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '8px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', fontFamily: 'ui-monospace, monospace', letterSpacing: '0.04em' }}>
                {kpi.label}
              </span>
              <span style={{
                fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '99px',
                background: kpi.badgeType === 'green' ? '#dcfce7' : kpi.badgeType === 'red' ? '#fee2e2' : '#f1f5f9',
                color: kpi.badgeType === 'green' ? '#15803d' : kpi.badgeType === 'red' ? '#b91c1c' : '#475569',
                fontFamily: 'ui-monospace, monospace'
              }}>
                {kpi.badge}
              </span>
            </div>
            <div style={{ fontSize: '32px', fontWeight: 700, color: '#09090b', fontFamily: 'Inter, sans-serif', letterSpacing: '-0.02em', lineHeight: 1 }}>
              <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{kpi.value}</span>
            </div>
            <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: 'auto' }}>
              {kpi.sub}
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', background: '#ffffff', padding: '4px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              flex: 1, padding: '8px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: 600,
              border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              background: activeTab === t.key ? '#0070F3' : 'transparent',
              color: activeTab === t.key ? '#ffffff' : '#64748b',
              boxShadow: activeTab === t.key ? '0 1px 3px rgba(0, 112, 243, 0.25)' : 'none',
              transition: 'all 0.15s ease',
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
                          background: isSelected ? '#f0f4ff' : 'transparent',
                          transition: 'background 0.15s',
                        }}
                      >
                        <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '11px', color: 'var(--brand-400)' }}>
                          {item.submission_id?.slice(0, 8)}…
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>{item.entity_name || item.entity_id}</div>
                          {item.hierarchy_path && (
                            <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
                              <Building2 size={9} style={{ display: 'inline', marginRight: 3 }} />
                              {item.hierarchy_path}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: 12 }}>{item.period_code || item.period_id?.slice(0, 8)}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, color: s.color, background: s.bg }}>
                            {s.label}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: 12 }}>
                          <User size={11} style={{ display: 'inline', marginRight: 3 }} />
                          {item.maker_email || 'Maker'}
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: 12 }}>{item.total_data_points || '—'}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <button
                            onClick={() => isSelected ? (setSelected(null), setPackDetail(null)) : loadPackDetail(item)}
                            style={{
                              padding: '6px 14px', borderRadius: '7px', fontSize: '12px', fontWeight: 700,
                              background: isSelected ? '#6366f1' : '#f0f4ff',
                              border: `1px solid ${isSelected ? '#6366f1' : '#c7d2fe'}`,
                              color: isSelected ? '#fff' : '#4f46e5', cursor: 'pointer',
                              display: 'inline-flex', alignItems: 'center', gap: 5
                            }}
                          >
                            <Eye size={12} />{isSelected ? 'Close' : 'Review'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* ── Review Detail Panel (spec §15 — parameter-by-parameter review) ── */}
          {selected && (
            <div style={{ background: '#fff', borderRadius: 14, border: '2px solid #6366f1', padding: 24, animation: 'fadeIn 0.2s ease' }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 11, color: '#6366f1', fontWeight: 700, marginBottom: 4 }}>REVIEW DECISION</div>
                  <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0f172a' }}>
                    {selected.entity_name}
                  </h3>
                  {selected.hierarchy_path && (
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>
                      <Building2 size={10} style={{ display: 'inline', marginRight: 4 }} />
                      {selected.hierarchy_path}
                    </div>
                  )}
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                    Period: <strong>{selected.period_code}</strong> · Status: <strong>{selected.status}</strong>
                  </div>
                </div>
                <button onClick={() => { setSelected(null); setPackDetail(null); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 18, padding: 4 }}>×</button>
              </div>

              {/* SoD notice */}
              <div style={{ padding: '10px 14px', background: 'rgba(99,102,241,0.06)', borderRadius: 8, borderLeft: '3px solid #6366f1', fontSize: 12, color: '#4f46e5', marginBottom: 18 }}>
                ⚠ <strong>SoD Enforced:</strong> You must be a different user than the submitter. Violation attempts are logged to the immutable audit trail.
              </div>

              {/* Data-point breakdown */}
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 10 }}>
                  SUBMITTED DATA POINTS
                </div>
                {loadingDetail ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#64748b', fontSize: 12 }}>
                    <div className="spinner" style={{ margin: '0 auto 8px', width: 24, height: 24 }} />
                    Loading data points…
                  </div>
                ) : packDetail?.data_points?.length > 0 ? (
                  <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 10 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                          <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#64748b' }}>Metric</th>
                          <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#64748b' }}>Value</th>
                          <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#64748b' }}>Unit</th>
                          <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: '#64748b' }}>Evidence</th>
                        </tr>
                      </thead>
                      <tbody>
                        {packDetail.data_points.map((dp, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '8px 12px', fontWeight: 600, color: '#0f172a' }}>
                              <div>{dp.metric_code}</div>
                              {dp.metric_name && <div style={{ fontSize: 10, color: '#94a3b8' }}>{dp.metric_name}</div>}
                            </td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#1e293b' }}>
                              {dp.value_numeric ?? dp.value_text ?? '—'}
                            </td>
                            <td style={{ padding: '8px 12px', color: '#475569' }}>{dp.unit || '—'}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                              {dp.evidence_count > 0 ? (
                                <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 99, background: '#f0fdf4', color: '#15803d', fontWeight: 700 }}>
                                  <Paperclip size={9} style={{ display: 'inline', marginRight: 2 }} />
                                  {dp.evidence_count} file{dp.evidence_count > 1 ? 's' : ''}
                                </span>
                              ) : (
                                <span style={{ fontSize: 10, color: '#f59e0b' }}>No evidence</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : packDetail ? (
                  <div style={{ color: '#64748b', fontSize: 12, padding: '12px' }}>No data points found in this submission.</div>
                ) : null}
              </div>

              {/* Comment box */}
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Review comments (mandatory for RETURN, recommended for APPROVE)…"
                rows={3}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 8, fontSize: 13,
                  background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a',
                  resize: 'vertical', boxSizing: 'border-box', marginBottom: 14,
                  fontFamily: 'Inter, system-ui, sans-serif'
                }}
              />

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button
                  onClick={() => handleReview('approve')}
                  disabled={reviewMutation.isPending}
                  style={{
                    padding: '10px 22px', borderRadius: 9, fontSize: 13, fontWeight: 700,
                    background: 'linear-gradient(135deg, #059669, #10b981)', color: '#fff',
                    border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7,
                    boxShadow: '0 4px 12px rgba(16,185,129,0.3)'
                  }}
                >
                  <CheckCircle size={14} /> Approve & Dispatch Calculation
                </button>
                <button
                  onClick={() => handleReview('return')}
                  disabled={reviewMutation.isPending || !reviewComment}
                  style={{
                    padding: '10px 22px', borderRadius: 9, fontSize: 13, fontWeight: 700,
                    background: '#ef4444', color: '#fff', border: 'none',
                    cursor: !reviewComment ? 'not-allowed' : 'pointer',
                    opacity: !reviewComment ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 7
                  }}
                >
                  <XCircle size={14} /> Return with Comments
                </button>
                <button
                  onClick={() => { setSelected(null); setPackDetail(null); }}
                  style={{
                    padding: '10px 18px', borderRadius: 9, fontSize: 13, fontWeight: 600,
                    background: '#f1f5f9', border: '1px solid #e2e8f0',
                    color: '#475569', cursor: 'pointer'
                  }}
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
