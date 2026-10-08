import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Filter, Plus, ChevronRight, ChevronDown,
  FolderKanban, Building2, CheckCircle2, Clock,
  AlertTriangle, Circle, MoreHorizontal, ArrowUpRight,
  SlidersHorizontal, Download, RefreshCw
} from 'lucide-react';
import { useOrgNodes, useOrgPeriods } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';

/* ── Seeded project data for Aarohan Infrastructure & Energy Group ── */
const MOCK_PROJECTS = [
  { id: 'PRJ-ODISHA-SOLAR', name: '250 MW Odisha Solar Park', bu: 'Solar EPC & Operations', subsidiary: 'Aarohan Renewable Energy Pvt. Ltd.', status: 'IN_REVIEW', coverage: 92, period: 'FY 2025–26', type: 'Solar Power Generation', location: 'Odisha, India', lastActivity: '10m ago' },
  { id: 'PRJ-RAJ-SOLAR', name: '50 MW Rajasthan Solar Expansion', bu: 'Solar EPC & Operations', subsidiary: 'Aarohan Renewable Energy Pvt. Ltd.', status: 'APPROVED', coverage: 100, period: 'FY 2025–26', type: 'Solar Power Generation', location: 'Rajasthan, India', lastActivity: '1h ago' },
  { id: 'PRJ-KUTCH-WIND', name: 'Kutch Wind Farm', bu: 'Wind Energy Operations', subsidiary: 'Aarohan Renewable Energy Pvt. Ltd.', status: 'CALCULATED', coverage: 100, period: 'FY 2025–26', type: 'Wind Power Generation', location: 'Gujarat, India', lastActivity: '3h ago' },
  { id: 'PRJ-PURI-HWY', name: 'Bhubaneswar–Puri Road Expansion', bu: 'Highway Development', subsidiary: 'Aarohan Infrastructure Projects Pvt. Ltd.', status: 'SUBMITTED', coverage: 85, period: 'FY 2025–26', type: 'Highway Construction', location: 'Odisha, India', lastActivity: '5h ago' },
];

const STATUS_CONFIG = {
  APPROVED:           { label: 'Ready',            badgeClass: 'badge-green',  dot: 'green',  icon: CheckCircle2 },
  CALCULATED:         { label: 'Calculated',        badgeClass: 'badge-green',  dot: 'green',  icon: CheckCircle2 },
  IN_REVIEW:          { label: 'In Review',         badgeClass: 'badge-blue',   dot: 'blue',   icon: Clock },
  SUBMITTED:          { label: 'Submitted',         badgeClass: 'badge-blue',   dot: 'blue',   icon: Clock },
  CHANGES_REQUESTED:  { label: 'Changes Requested', badgeClass: 'badge-amber',  dot: 'amber',  icon: AlertTriangle },
  DRAFT:              { label: 'Draft',             badgeClass: 'badge-gray',   dot: 'gray',   icon: Circle },
};

function CoverageBar({ pct }) {
  const cls = pct >= 90 ? 'high' : pct >= 70 ? 'medium' : 'low';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 120 }}>
      <div className="coverage-bar-track" style={{ flex: 1, height: 5 }}>
        <div className={`coverage-bar-fill ${cls}`} style={{ width: `${pct}%` }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', width: 32, textAlign: 'right' }}>
        {pct}%
      </span>
    </div>
  );
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.DRAFT;
  return (
    <span className={`badge ${cfg.badgeClass}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span className={`status-dot ${cfg.dot}`} style={{ width: 5, height: 5 }} />
      {cfg.label}
    </span>
  );
}

const FILTER_STATUSES = ['All', 'Ready', 'In Review', 'Submitted', 'Changes Requested', 'Draft'];

export default function Projects() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: nodes = [], isLoading } = useOrgNodes();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 8;

  // Known Aarohan demo project status from seed data
  const AAROHAN_STATUS_MAP = {
    'PRJ-ODISHA-SOLAR': { status: 'IN_REVIEW', coverage: 92, lastActivity: '10m ago' },
    'PRJ-RAJ-SOLAR':    { status: 'APPROVED',  coverage: 100, lastActivity: '1h ago' },
    'PRJ-KUTCH-WIND':   { status: 'CALCULATED', coverage: 100, lastActivity: '3h ago' },
    'PRJ-PURI-HWY':     { status: 'SUBMITTED',  coverage: 85, lastActivity: '5h ago' },
  };

  const projectsList = useMemo(() => {
    const projectNodes = nodes.filter(n => n.type === 'project' || n.type === 'site');
    if (!projectNodes || projectNodes.length === 0) {
      return MOCK_PROJECTS;
    }
    return projectNodes.map(n => {
      const parentBu = nodes.find(b => b.id === n.parent_id);
      const parentSub = parentBu ? nodes.find(s => s.id === parentBu.parent_id) : null;
      const knownStatus = AAROHAN_STATUS_MAP[n.code] || {};
      return {
        id: n.id,
        name: n.name,
        code: n.code,
        bu: parentBu?.name || 'Renewable BU',
        subsidiary: parentSub?.name || 'Aarohan Group',
        status: knownStatus.status || (n.is_active ? 'APPROVED' : 'DRAFT'),
        coverage: knownStatus.coverage || 95,
        period: 'FY 2025–26',
        type: n.project_type || 'Infrastructure',
        location: n.location_state ? `${n.location_state}, India` : 'India',
        lastActivity: knownStatus.lastActivity || 'Active',
      };
    });
  }, [nodes]);

  const filtered = useMemo(() => {
    let rows = [...projectsList];
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.bu.toLowerCase().includes(q) ||
        p.location.toLowerCase().includes(q) ||
        p.type.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'All') {
      rows = rows.filter(p => {
        const cfg = STATUS_CONFIG[p.status];
        return cfg?.label === statusFilter;
      });
    }
    rows.sort((a, b) => {
      let va = a[sortBy], vb = b[sortBy];
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return rows;
  }, [projectsList, search, statusFilter, sortBy, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);


  const handleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
  };

  const SortIcon = ({ col }) => {
    if (sortBy !== col) return <ChevronDown size={12} style={{ opacity: 0.3 }} />;
    return <ChevronDown size={12} style={{ transform: sortDir === 'asc' ? 'rotate(180deg)' : 'none', color: 'var(--accent)' }} />;
  };

  // Aggregate stats
  const stats = useMemo(() => ({
    total: projectsList.length,
    ready: projectsList.filter(p => ['APPROVED', 'CALCULATED'].includes(p.status)).length,
    inReview: projectsList.filter(p => ['IN_REVIEW', 'SUBMITTED'].includes(p.status)).length,
    attention: projectsList.filter(p => ['CHANGES_REQUESTED', 'DRAFT'].includes(p.status) && p.coverage < 80).length,
    avgCoverage: projectsList.length ? Math.round(projectsList.reduce((s, p) => s + p.coverage, 0) / projectsList.length) : 0,
  }), [projectsList]);

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
          PROJECT PORTFOLIO DIRECTORY
        </span>
        <span style={{ color: '#cbd5e1' }}>/</span>
        <span>{projectsList.length} ACTIVE ASSET SITES MONITORED</span>
      </div>

      {/* ── Page Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#09090b', margin: 0, letterSpacing: '-0.02em' }}>
            Projects &amp; Operational Sites
          </h1>
          <p style={{ color: '#64748b', fontSize: '13px', margin: '4px 0 0 0' }}>
            Manage ESG data collection, activity logging, and attestation status across all sites.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" style={{ borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', color: '#09090b', fontWeight: 600 }}>
            <Download size={14} /> Export CSV
          </button>
          <button className="btn btn-primary" style={{ borderRadius: 6, background: '#0070F3', color: '#fff', border: 'none', fontWeight: 600 }} onClick={() => navigate('/projects/new')}>
            <Plus size={14} /> Add Project
          </button>
        </div>
      </div>

      {/* ── KPI Summary Row (Reference Style) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'TOTAL SITES', value: stats.total, badge: 'Monitored', badgeType: 'gray', sub: 'Across 4 business units' },
          { label: 'AVERAGE COVERAGE', value: `${stats.avgCoverage}%`, badge: '+3.1% MoM', badgeType: 'green', sub: 'Evidence completeness' },
          { label: 'ATTESTED & READY', value: stats.ready, badge: `${Math.round(stats.ready / stats.total * 100)}% signed`, badgeType: 'green', sub: 'Ready for consolidation' },
          { label: 'ACTION REQUIRED', value: stats.attention, badge: stats.attention > 0 ? `${stats.attention} blockers` : '0 issues', badgeType: stats.attention > 0 ? 'red' : 'gray', sub: 'Variance / missing docs' },
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
                background: s.badgeType === 'green' ? '#dcfce7' : s.badgeType === 'red' ? '#fee2e2' : '#f1f5f9',
                color: s.badgeType === 'green' ? '#15803d' : s.badgeType === 'red' ? '#b91c1c' : '#475569',
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

      {/* ── Table Card ── */}
      <div className="card">
        {/* Toolbar */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Search */}
          <div className="header-search-pill" style={{ width: 280 }}>
            <Search size={14} color="var(--text-muted)" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search projects..."
              style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: 'var(--text-primary)' }}
            />
          </div>

          {/* Status filter pills */}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {FILTER_STATUSES.map(s => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setPage(1); }}
                style={{
                  padding: '4px 12px', borderRadius: 99, fontSize: 12, fontWeight: 500,
                  background: statusFilter === s ? 'var(--text-primary)' : 'transparent',
                  color: statusFilter === s ? 'var(--text-inverse)' : 'var(--text-secondary)',
                  border: statusFilter === s ? '1px solid var(--text-primary)' : '1px solid var(--border)',
                  cursor: 'pointer', transition: 'all 0.12s',
                }}
              >
                {s}
              </button>
            ))}
          </div>

          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {filtered.length} project{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Table */}
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>
                  <button onClick={() => handleSort('name')} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Project <SortIcon col="name" />
                  </button>
                </th>
                <th>Business Unit</th>
                <th>
                  <button onClick={() => handleSort('status')} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Status <SortIcon col="status" />
                  </button>
                </th>
                <th>
                  <button onClick={() => handleSort('coverage')} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Coverage <SortIcon col="coverage" />
                  </button>
                </th>
                <th>Location</th>
                <th>Last Activity</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-state" style={{ padding: '40px 24px' }}>
                      <FolderKanban size={32} className="empty-state-icon" />
                      <div className="empty-state-title">No projects found</div>
                      <div className="empty-state-desc">
                        {search ? `No projects match "${search}".` : 'No projects match your filters.'}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : paginated.map(proj => (
                <tr
                  key={proj.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/projects/${proj.id}`)}
                >
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>{proj.name}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{proj.type} · {proj.period}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{proj.bu}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{proj.subsidiary}</span>
                    </div>
                  </td>
                  <td><StatusBadge status={proj.status} /></td>
                  <td><CoverageBar pct={proj.coverage} /></td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{proj.location}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{proj.lastActivity}</td>
                  <td>
                    <button
                      onClick={e => { e.stopPropagation(); navigate(`/projects/${proj.id}`); }}
                      className="icon-btn"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ padding: '14px 16px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Page {page} of {totalPages} · {filtered.length} projects
            </span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                className="btn btn-secondary btn-sm"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  style={{
                    width: 32, height: 32, borderRadius: 'var(--r-md)',
                    border: '1px solid', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    background: p === page ? 'var(--text-primary)' : 'transparent',
                    color: p === page ? 'var(--text-inverse)' : 'var(--text-secondary)',
                    borderColor: p === page ? 'var(--text-primary)' : 'var(--border)',
                    transition: 'all 0.12s',
                  }}
                >
                  {p}
                </button>
              ))}
              <button
                className="btn btn-secondary btn-sm"
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
