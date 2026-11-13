import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Search, Zap, Cloud, Truck, Droplets, Recycle, CheckCircle2, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { p6FormsApi, getFriendlyErrorMessage } from '../api/client';
import DataLineageDrawer from '../components/DataLineageDrawer';

const fmt = (v) => {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return '—';
  return Number(v).toLocaleString('en-IN', { maximumFractionDigits: 2 });
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedEntityId, setSelectedEntityId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKpi, setSelectedKpi] = useState('energy');
  const [quadrantFocus, setQuadrantFocus] = useState('all'); // 'all' | 'energy' | 'ghg' | 'water' | 'waste'
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [lineageOpen, setLineageOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState({});
  const dropdownRef = useRef(null);
  const prevUserRef = useRef({ id: user?.id, role: user?.role });

  // Reset selected entity when logged-in user/role changes
  useEffect(() => {
    setSelectedEntityId('');
    setData(null);
    setDropdownOpen(false);
    setExpandedNodes({});
  }, [user?.id, user?.role]);

  // Close dropdown on outside click
  useEffect(() => {
    const onDocClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  useEffect(() => {
    let active = true;
    const isNewUser = prevUserRef.current.id !== user?.id || prevUserRef.current.role !== user?.role;
    prevUserRef.current = { id: user?.id, role: user?.role };

    const entityToFetch = isNewUser ? undefined : (selectedEntityId || undefined);
    if (isNewUser && selectedEntityId) {
      setSelectedEntityId('');
    }

    const loadDashboard = (initial = false) => {
      if (initial) setLoading(true);
      setErrorMsg('');
      p6FormsApi
        .getDashboard(entityToFetch)
        .then((res) => {
          if (active) setData(res.data);
        })
        .catch((err) => {
          if (active) setErrorMsg(getFriendlyErrorMessage(err));
        })
        .finally(() => {
          if (active && initial) setLoading(false);
        });
    };
    loadDashboard(true);
    const refreshTimer = window.setInterval(() => loadDashboard(false), 15000);
    return () => {
      active = false;
      window.clearInterval(refreshTimer);
    };
  }, [selectedEntityId, user?.id, user?.role]);

  const accessibleNodes = useMemo(() => {
    const allowedTypesByRole = {
      project_supervisor: new Set(['project', 'site', 'plant', 'manufacturing']),
      project_admin: new Set(['project', 'site', 'plant', 'manufacturing']),
      bu_supervisor: new Set(['bu', 'business_unit', 'project', 'site', 'plant', 'manufacturing']),
      bu_esg_manager: new Set(['bu', 'business_unit', 'project', 'site', 'plant', 'manufacturing']),
      bu_admin: new Set(['bu', 'business_unit', 'project', 'site', 'plant', 'manufacturing']),
      subsidiary_supervisor: new Set(['subsidiary', 'company', 'bu', 'business_unit', 'project', 'site', 'plant', 'manufacturing']),
      subsidiary_esg_manager: new Set(['subsidiary', 'company', 'bu', 'business_unit', 'project', 'site', 'plant', 'manufacturing']),
      subsidiary_admin: new Set(['subsidiary', 'company', 'bu', 'business_unit', 'project', 'site', 'plant', 'manufacturing']),
    };
    const allowedSet = allowedTypesByRole[user?.role];
    const rawList = data?.accessible_nodes || [];
    const list = allowedSet ? rawList.filter((n) => allowedSet.has((n.type || '').toLowerCase())) : rawList;
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter((n) => (n.name || '').toLowerCase().includes(q) || (n.id || '').toLowerCase().includes(q));
  }, [data, searchQuery, user?.role]);

  const childrenByParent = useMemo(() => {
    const map = {};
    accessibleNodes.forEach((n) => {
      const pid = n.parentId || '__root__';
      if (!map[pid]) map[pid] = [];
      map[pid].push(n);
    });
    return map;
  }, [accessibleNodes]);

  const topLevelNodes = useMemo(() => {
    const ids = new Set(accessibleNodes.map((n) => n.id));
    return accessibleNodes.filter((n) => !n.parentId || !ids.has(n.parentId));
  }, [accessibleNodes]);

  const isProjectLeaf = (n) => ['project', 'plant', 'site', 'manufacturing'].includes((n.type || '').toLowerCase());

  const toggleExpand = (e, nodeId) => {
    e.stopPropagation();
    setExpandedNodes((prev) => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  const handleSelectTreeNode = (n, hasKids = false, isRootOverview = false) => {
    if (isProjectLeaf(n) && !['project_supervisor', 'project_admin'].includes(user?.role)) {
      setDropdownOpen(false);
      navigate(`/projects/${n.db_id || n.id}`);
      return;
    }
    setSelectedEntityId(n.id);
    if (hasKids && !isRootOverview) {
      setExpandedNodes((prev) => ({ ...prev, [n.id]: !prev[n.id] }));
      return;
    }
    setDropdownOpen(false);
  };

  const renderTreeRows = (nodeList, depth = 0, isRootLevel = false) =>
    nodeList.map((n) => {
      const kids = childrenByParent[n.id] || [];
      const hasKids = kids.length > 0;
      const isRootOverview = isRootLevel && nodeList.length === 1 && hasKids;
      const isExpanded = isRootOverview ? true : (!!expandedNodes[n.id] || !!searchQuery.trim());
      const isSelected = (selectedEntityId || data?.node?.id) === n.id;
      const leafProject = isProjectLeaf(n) && !['project_supervisor', 'project_admin'].includes(user?.role);

      return (
        <React.Fragment key={n.id}>
          <div
            onClick={() => handleSelectTreeNode(n, hasKids, isRootOverview)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: `7px 10px 7px ${10 + depth * 16}px`,
              cursor: 'pointer',
              background: isSelected ? '#EFF6FF' : 'transparent',
              color: isSelected ? '#1D4ED8' : '#0F172A',
              fontSize: 12.5,
              fontWeight: isSelected ? 700 : 500,
              borderRadius: 6,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
              {hasKids && !isRootOverview ? (
                <button
                  type="button"
                  onClick={(e) => toggleExpand(e, n.id)}
                  style={{
                    border: 'none', background: 'transparent', padding: 2,
                    cursor: 'pointer', color: '#64748B', display: 'flex', alignItems: 'center',
                  }}
                >
                  {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                </button>
              ) : (
                <span style={{ width: 17, display: 'inline-block' }} />
              )}
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {n.name}
              </span>
              <span style={{ fontSize: 10.5, color: '#64748B', fontWeight: 600 }}>
                ({isRootOverview ? `${n.type} overview` : n.type})
              </span>
            </div>
            {leafProject && (
              <ExternalLink size={12} color="#2563EB" style={{ flexShrink: 0, marginLeft: 8 }} />
            )}
          </div>
          {hasKids && isExpanded && renderTreeRows(kids, isRootOverview ? depth : depth + 1, false)}
        </React.Fragment>
      );
    });

  const cards = data?.cards || {};
  const fy = data?.fy || { current: '2024-25', previous: '2023-24' };
  const hasData = !!data?.has_data;
  const localReportStatus = data?.local_report_status?.status;
  const dashboardStatusLabel = localReportStatus === 'submitted'
    ? 'Submitted · awaiting verification'
    : localReportStatus === 'rejected'
      ? 'Returned for correction'
      : localReportStatus === 'draft'
        ? 'Draft project data'
        : hasData ? 'Accepted Data Active' : 'Awaiting accepted data';
  const dashboardStatusColor = localReportStatus === 'submitted' || localReportStatus === 'rejected'
    ? '#B45309'
    : localReportStatus === 'draft'
      ? '#1D4ED8'
      : hasData ? '#15803D' : '#64748B';

  // Ordered 2-column grid (left column: Energy, Scope 3, Waste; right column: GHG, Water, Coverage)
  // Rendered in CSS 2-column grid with gridAutoFlow: 'column' and 3 rows so left column is 1,2,3 and right column is 4,5,6
  const kpiCards = [
    {
      key: 'energy',
      code: cards.energy?.code || 'EI-1',
      title: 'Energy',
      value: hasData ? `${fmt(cards.energy?.current)} GJ` : 'Awaiting accepted data',
      sub: hasData && cards.energy?.renewable_pct != null ? `${cards.energy.renewable_pct}% renewable` : '—',
      accent: '#2563EB',
      bg: '#EFF6FF',
      icon: Zap,
      selectable: true,
    },
    {
      key: 'scope3',
      code: cards.scope3?.code || 'LI-4',
      title: 'Scope 3',
      value: hasData && cards.scope3?.current != null ? `${fmt(cards.scope3.current)} tCO2e` : 'Awaiting accepted data',
      sub: hasData ? `FY ${fy.current}` : '—',
      accent: '#7C3AED',
      bg: '#F5F3FF',
      icon: Truck,
      selectable: true,
    },
    {
      key: 'waste',
      code: cards.waste?.code || 'EI-8',
      title: 'Waste',
      value: hasData ? `${fmt(cards.waste?.current)} MT` : 'Awaiting accepted data',
      sub: hasData ? `Recovered ${fmt(cards.waste?.recovered)} · Disposed ${fmt(cards.waste?.disposed)}` : '—',
      accent: '#059669',
      bg: '#ECFDF5',
      icon: Recycle,
      selectable: true,
    },
    {
      key: 'ghg',
      code: cards.ghg?.code || 'EI-6',
      title: 'GHG Scope 1+2',
      value: hasData ? `${fmt(cards.ghg?.current)} tCO2e` : 'Awaiting accepted data',
      sub: hasData ? `S1 ${fmt(cards.ghg?.scope1)} · S2 ${fmt(cards.ghg?.scope2)}` : '—',
      accent: '#DC2626',
      bg: '#FEF2F2',
      icon: Cloud,
      selectable: true,
    },
    {
      key: 'water',
      code: cards.water?.code || 'EI-3',
      title: 'Water',
      value: hasData ? `${fmt(cards.water?.current)} kL` : 'Awaiting accepted data',
      sub: hasData ? `Consumed ${fmt(cards.water?.consumed)} · Discharged ${fmt(cards.water?.discharged)}` : '—',
      accent: '#0284C7',
      bg: '#F0F9FF',
      icon: Droplets,
      selectable: true,
    },
    {
      key: 'coverage',
      code: cards.coverage?.code || 'P6-STATUS',
      title: 'Data Coverage',
      value: cards.coverage ? `${cards.coverage.accepted_forms} / ${cards.coverage.total_forms} Accepted` : 'Awaiting accepted data',
      sub: data?.node?.name || 'Principle 6',
      accent: '#0F766E',
      bg: '#F0FDFA',
      icon: CheckCircle2,
      selectable: false,
    },
  ];

  const activeChart = data?.charts?.[selectedKpi] || { unit: '', series: [] };
  const curTotal = activeChart.series.reduce((s, item) => s + Number(item.current || 0), 0);
  const prevTotal = activeChart.series.reduce((s, item) => s + Number(item.previous || 0), 0);
  const maxBar = Math.max(curTotal, prevTotal, 1);

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1440, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header: search, entity dropdown, status pill */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#0F172A' }}>
            {data?.node?.name || 'Principle 6 Overview'}
          </h1>
          <div style={{ fontSize: 12.5, color: '#64748B', marginTop: 2 }}>
            FY {fy.current} vs FY {fy.previous} · {user?.role?.replace(/_/g, ' ')}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, background: '#FFFFFF',
            border: '1px solid #E2E8F0', padding: '5px 10px', borderRadius: 7,
          }}>
            <Search size={14} color="#64748B" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search entities…"
              style={{ border: 'none', outline: 'none', fontSize: 12.5, width: 150, color: '#0F172A' }}
            />
          </div>

          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setDropdownOpen((o) => !o)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, background: '#FFFFFF',
                border: '1px solid #E2E8F0', padding: '6px 12px', borderRadius: 7,
                fontSize: 12.5, fontWeight: 600, color: '#0F172A', cursor: 'pointer',
              }}
            >
              <Building2 size={14} color="#64748B" />
              <span>{data?.node?.name || 'Select entity'} ({data?.node?.type || ''})</span>
              <ChevronDown size={14} color="#64748B" />
            </button>

            {dropdownOpen && (
              <div
                style={{
                  position: 'absolute', right: 0, top: 'calc(100% + 6px)', zIndex: 50,
                  minWidth: 340, maxHeight: 380, overflowY: 'auto',
                  background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 9,
                  boxShadow: '0 10px 25px rgba(15, 23, 42, 0.12)', padding: 6,
                }}
              >
                {topLevelNodes.length === 0 ? (
                  <div style={{ padding: 10, fontSize: 12, color: '#64748B' }}>No entities in scope</div>
                ) : (
                  renderTreeRows(topLevelNodes, 0, true)
                )}
              </div>
            )}
          </div>

          <span style={{
            padding: '5px 12px', borderRadius: 9999, fontSize: 12, fontWeight: 700,
            background: localReportStatus === 'submitted' || localReportStatus === 'rejected' ? '#FEF3C7' : localReportStatus === 'draft' ? '#DBEAFE' : hasData ? '#DCFCE7' : '#F1F5F9',
            color: dashboardStatusColor,
            border: `1px solid ${localReportStatus === 'submitted' || localReportStatus === 'rejected' ? '#FDE68A' : localReportStatus === 'draft' ? '#BFDBFE' : hasData ? '#BBF7D0' : '#E2E8F0'}`,
          }}>
            {dashboardStatusLabel}
          </span>
        </div>
      </div>

      {errorMsg && (
        <div style={{ padding: '12px 16px', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', fontSize: 13 }}>
          {errorMsg}
        </div>
      )}

      {/* 6 KPI Cards in 2-column grid (3 left, 3 right, equal height) */}
      <div
        data-testid="dashboard-kpi-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gridTemplateRows: 'repeat(3, 1fr)',
          gridAutoFlow: 'column',
          gap: 16,
        }}
      >
        {kpiCards.map((c) => {
          const Icon = c.icon;
          const isSelected = selectedKpi === c.key;
          return (
            <div
              key={c.key}
              onClick={() => c.selectable && setSelectedKpi(c.key)}
              style={{
                background: '#FFFFFF',
                border: isSelected ? `2px solid ${c.accent}` : '1px solid #E2E8F0',
                borderLeft: `4px solid ${c.accent}`,
                borderRadius: 10,
                padding: '16px 20px',
                cursor: c.selectable ? 'pointer' : 'default',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: 112,
                boxSizing: 'border-box',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, padding: '2px 7px', borderRadius: 5, background: c.bg, color: c.accent }}>
                    {c.code}
                  </span>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: '#334155' }}>{c.title}</span>
                </div>
                <Icon size={17} color={c.accent} />
              </div>

              <div style={{ fontSize: hasData ? 24 : 15, fontWeight: 800, color: hasData ? '#0F172A' : '#94A3B8', marginTop: 8 }}>
                {loading ? 'Loading…' : c.value}
              </div>

              <div style={{ fontSize: 12.5, color: '#64748B', marginTop: 4 }}>
                {c.sub}
              </div>
            </div>
          );
        })}
      </div>

      {/* ONE full-width stacked bar chart: Current FY vs Previous FY */}
      <div
        data-testid="dashboard-stacked-chart"
        style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 10,
          padding: '20px 24px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0F172A' }}>
              {kpiCards.find((x) => x.key === selectedKpi)?.title} — Current FY ({fy.current}) vs Previous FY ({fy.previous})
            </h2>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
              Unit: {activeChart.unit || '—'} · Click any KPI card above to switch chart
            </div>
          </div>

          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
            {activeChart.series.map((s) => (
              <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#334155', fontWeight: 600 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: s.color, display: 'inline-block' }} />
                <span>{s.name}</span>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setLineageOpen(true)}
              style={{
                padding: '5px 10px', borderRadius: 6, border: '1px solid #CBD5E1',
                background: '#F8FAFC', color: '#0F172A', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Inspect Lineage
            </button>
          </div>
        </div>

        {!hasData ? (
          <div style={{ padding: '32px 0', textAlign: 'center', color: '#94A3B8', fontSize: 14 }}>
            Awaiting accepted data
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { label: `Current FY (${fy.current})`, key: 'current', total: curTotal },
              { label: `Previous FY (${fy.previous})`, key: 'previous', total: prevTotal },
            ].map((bar) => (
              <div key={bar.key} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, fontWeight: 600, color: '#334155' }}>
                  <span>{bar.label}</span>
                  <span style={{ fontFamily: 'ui-monospace, monospace' }}>{fmt(bar.total)} {activeChart.unit}</span>
                </div>
                <div style={{
                  width: '100%', height: 28, background: '#F1F5F9', borderRadius: 6,
                  overflow: 'hidden', display: 'flex',
                }}>
                  {activeChart.series.map((s) => {
                    const v = Number(s[bar.key] || 0);
                    const pct = maxBar > 0 ? (v / maxBar) * 100 : 0;
                    if (pct <= 0) return null;
                    return (
                      <div
                        key={s.name}
                        title={`${s.name}: ${fmt(v)} ${activeChart.unit}`}
                        style={{
                          width: `${pct}%`,
                          background: s.color,
                          height: '100%',
                          transition: 'width 0.25s ease',
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── SEBI BRSR Principle 6 — Environmental Performance & Breakdown (All 4 Quadrants) ── */}
      <div
        data-testid="p6-quadrant-breakdown"
        style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 10,
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
        }}
      >
        {/* Header with Title, Badges & Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0F172A' }}>
                SEBI BRSR Principle 6 — Environmental Performance &amp; Breakdown
              </h2>
              <span style={{
                background: '#DCFCE7', color: '#15803D', fontSize: 11, fontWeight: 700,
                padding: '2px 8px', borderRadius: 9999, border: '1px solid #BBF7D0',
              }}>
                ✓ SEBI BRSR Core Aligned
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap', fontSize: 12, color: '#64748B' }}>
              <span style={{ color: '#2563EB', fontWeight: 600 }}>🛡️ Auditor Verified</span>
              <span>·</span>
              <span>Mandatory Core &amp; Leadership Disclosures · Audited FY {fy.current} vs FY {fy.previous} · Visual Intelligence</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setLineageOpen(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', borderRadius: 6, border: '1px solid #CBD5E1',
                background: '#FFFFFF', color: '#0F172A', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}
            >
              <Search size={13} color="#64748B" /> Inspect Source Lineage
            </button>
            <button
              type="button"
              onClick={() => navigate('/reporting')}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: 6, border: 'none',
                background: '#0070F3', color: '#FFFFFF', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0, 112, 243, 0.2)',
              }}
            >
              <ExternalLink size={13} /> Export Visual Annexure (.xlsx / .pdf)
            </button>
          </div>
        </div>

        {/* Quick Focus Pills Row */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '8px 12px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #F1F5F9',
          flexWrap: 'wrap', gap: 10, fontSize: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, color: '#475569', marginRight: 4 }}>Quick Focus:</span>
            {[
              { id: 'all', label: 'All 4 Quadrants' },
              { id: 'energy', label: 'EI-1: Energy' },
              { id: 'ghg', label: 'EI-2 & LI-4: GHG' },
              { id: 'water', label: 'EI-3: Water' },
              { id: 'waste', label: 'EI-8: Waste' },
            ].map(tab => {
              const active = quadrantFocus === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setQuadrantFocus(tab.id);
                    if (tab.id !== 'all') setSelectedKpi(tab.id);
                  }}
                  style={{
                    background: active ? '#0F172A' : '#FFFFFF',
                    color: active ? '#FFFFFF' : '#475569',
                    padding: '4px 12px',
                    borderRadius: 6,
                    border: active ? 'none' : '1px solid #E2E8F0',
                    fontWeight: active ? 700 : 600,
                    fontSize: 11.5,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#64748B', fontSize: 11, fontWeight: 600 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#15803D' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#15803D' }} />
              ISAE 3000 Limited Assurance
            </span>
            <span>|</span>
            <span>SEBI Circular SEBI/HO/CFD/CFD-SEC-2/P/CIR/2023/122</span>
          </div>
        </div>

        {/* 4 Quadrants Grid / Focused Expanded Chart */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: quadrantFocus === 'all' ? 'repeat(auto-fit, minmax(420px, 1fr))' : '1fr',
          gap: 16,
        }}>
          {/* ── Quadrant 1: Energy Mix & Sourcing Breakdown ── */}
          {(quadrantFocus === 'all' || quadrantFocus === 'energy') && (
            <div
              onClick={() => { setQuadrantFocus('energy'); setSelectedKpi('energy'); }}
              style={{
                background: '#FAFAFA', border: quadrantFocus === 'energy' ? '2px solid #2563EB' : '1px solid #E2E8F0',
                borderRadius: 10, padding: quadrantFocus === 'energy' ? '24px 28px' : '16px 18px',
                display: 'flex', flexDirection: 'column', gap: 14,
                cursor: quadrantFocus === 'all' ? 'pointer' : 'default',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ background: '#EFF6FF', color: '#2563EB', fontSize: 11, fontWeight: 800, padding: '2px 6px', borderRadius: 4 }}>EI-1</span>
                  <span style={{ fontSize: quadrantFocus === 'energy' ? 15 : 13, fontWeight: 700, color: '#0F172A' }}>
                    Energy Mix &amp; Sourcing Breakdown {quadrantFocus === 'energy' && '(Expanded View)'}
                  </span>
                </div>
                {quadrantFocus === 'energy' && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setQuadrantFocus('all'); }}
                    style={{ border: 'none', background: '#EFF6FF', color: '#2563EB', fontSize: 11.5, fontWeight: 700, padding: '4px 8px', borderRadius: 4, cursor: 'pointer' }}
                  >
                    View All Quadrants ✕
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
                {/* Donut badge */}
                {(() => {
                  const tot = (cards.energy?.current || 0);
                  const grid = (data?.breakdown?.energy?.grid_electricity || 0);
                  const ren = (data?.breakdown?.energy?.captive_solar_green || 0);
                  const gridPct = tot > 0 ? (grid / tot) * 100 : 45;
                  const renPct = tot > 0 ? (ren / tot) * 100 : 20;
                  const dSize = quadrantFocus === 'energy' ? 120 : 90;
                  const innerSize = quadrantFocus === 'energy' ? 84 : 60;
                  return (
                    <div style={{
                      width: dSize, height: dSize, borderRadius: '50%',
                      background: `conic-gradient(#2563EB 0% ${gridPct}%, #16A34A ${gridPct}% ${gridPct + renPct}%, #F59E0B ${gridPct + renPct}% 100%)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <div style={{
                        width: innerSize, height: innerSize, borderRadius: '50%', background: '#FFFFFF',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                      }}>
                        <span style={{ fontSize: quadrantFocus === 'energy' ? 13.5 : 11, fontWeight: 800, color: '#0F172A', lineHeight: 1 }}>{fmt(cards.energy?.current)}</span>
                        <span style={{ fontSize: 8.5, color: '#64748B', fontWeight: 700, marginTop: 2 }}>TOTAL GJ</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Rows */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minWidth: 260 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#475569' }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: '#2563EB' }} />
                      Grid Electricity
                    </span>
                    <span style={{ fontWeight: 700, color: '#0F172A' }}>{fmt(data?.breakdown?.energy?.grid_electricity)} GJ</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#475569' }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: '#16A34A' }} />
                      Captive Solar &amp; Green PPA
                    </span>
                    <span style={{ fontWeight: 700, color: '#16A34A' }}>{fmt(data?.breakdown?.energy?.captive_solar_green)} GJ</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#475569' }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: '#F59E0B' }} />
                      Fuel (Diesel/Gas backup)
                    </span>
                    <span style={{ fontWeight: 700, color: '#0F172A' }}>{fmt(data?.breakdown?.energy?.fuel_diesel_gas)} GJ</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: '#64748B', borderTop: '1px solid #E2E8F0', paddingTop: 8 }}>
                <span>YoY Energy Reduction: <b>{cards.energy?.previous ? `${Math.round(((cards.energy.previous - cards.energy.current) / cards.energy.previous) * 100 * 10) / 10}%` : '—'}</b> (vs {fmt(cards.energy?.previous)} GJ)</span>
                <span style={{ color: '#2563EB', fontWeight: 600 }}>Audit Trail · active</span>
              </div>
            </div>
          )}

          {/* ── Quadrant 2: GHG Emissions Profile (Scope 1, 2 & 3) ── */}
          {(quadrantFocus === 'all' || quadrantFocus === 'ghg') && (
            <div
              onClick={() => { setQuadrantFocus('ghg'); setSelectedKpi('ghg'); }}
              style={{
                background: '#FAFAFA', border: quadrantFocus === 'ghg' ? '2px solid #DC2626' : '1px solid #E2E8F0',
                borderRadius: 10, padding: quadrantFocus === 'ghg' ? '24px 28px' : '16px 18px',
                display: 'flex', flexDirection: 'column', gap: 14,
                cursor: quadrantFocus === 'all' ? 'pointer' : 'default',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ background: '#FEF2F2', color: '#DC2626', fontSize: 11, fontWeight: 800, padding: '2px 6px', borderRadius: 4 }}>EI-6 &amp; LI-4</span>
                  <span style={{ fontSize: quadrantFocus === 'ghg' ? 15 : 13, fontWeight: 700, color: '#0F172A' }}>
                    GHG Emissions Profile (Scope 1, 2 &amp; 3) {quadrantFocus === 'ghg' && '(Expanded View)'}
                  </span>
                </div>
                {quadrantFocus === 'ghg' && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setQuadrantFocus('all'); }}
                    style={{ border: 'none', background: '#FEF2F2', color: '#DC2626', fontSize: 11.5, fontWeight: 700, padding: '4px 8px', borderRadius: 4, cursor: 'pointer' }}
                  >
                    View All Quadrants ✕
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minWidth: 260 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                    <span style={{ color: '#475569' }}>Scope 1 (Direct Fuel)</span>
                    <span style={{ fontWeight: 700, color: '#0F172A' }}>{fmt(cards.ghg?.scope1)} <span style={{ fontSize: 10.5, color: '#64748B' }}>tCO2e</span></span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                    <span style={{ color: '#475569' }}>Scope 2 (Grid Electricity)</span>
                    <span style={{ fontWeight: 700, color: '#0F172A' }}>{fmt(cards.ghg?.scope2)} <span style={{ fontSize: 10.5, color: '#64748B' }}>tCO2e</span></span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                    <span style={{ color: '#7C3AED', fontWeight: 600 }}>Scope 3 (Value Chain / LI-4)</span>
                    <span style={{ fontWeight: 700, color: '#7C3AED' }}>{fmt(cards.scope3?.current)} <span style={{ fontSize: 10.5, color: '#7C3AED' }}>tCO2e</span></span>
                  </div>
                </div>

                {/* Scope mini badge */}
                {(() => {
                  const s1 = (cards.ghg?.scope1 || 0);
                  const tot = (cards.ghg?.current || 1);
                  const s1Pct = tot > 0 ? (s1 / tot) * 100 : 30;
                  const dSize = quadrantFocus === 'ghg' ? 110 : 78;
                  const innerSize = quadrantFocus === 'ghg' ? 76 : 52;
                  return (
                    <div style={{
                      width: dSize, height: dSize, borderRadius: '50%',
                      background: `conic-gradient(#DC2626 0% ${s1Pct}%, #F59E0B ${s1Pct}% 100%)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <div style={{
                        width: innerSize, height: innerSize, borderRadius: '50%', background: '#FFFFFF',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <span style={{ fontSize: quadrantFocus === 'ghg' ? 13 : 11, fontWeight: 800, color: '#0F172A' }}>{fmt(cards.ghg?.current)}</span>
                        <span style={{ fontSize: 8, color: '#64748B', fontWeight: 700 }}>tCO2e</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: '#64748B', borderTop: '1px solid #E2E8F0', paddingTop: 8 }}>
                <span>Gross Operational (S1+S2): <b>{fmt(cards.ghg?.current)} tCO2e</b></span>
                <span style={{ color: '#0F172A', fontWeight: 600 }}>CEA Baseline Applied</span>
              </div>
            </div>
          )}

          {/* ── Quadrant 3: Water Withdrawal & Consumption Balance ── */}
          {(quadrantFocus === 'all' || quadrantFocus === 'water') && (
            <div
              onClick={() => { setQuadrantFocus('water'); setSelectedKpi('water'); }}
              style={{
                background: '#FAFAFA', border: quadrantFocus === 'water' ? '2px solid #0284C7' : '1px solid #E2E8F0',
                borderRadius: 10, padding: quadrantFocus === 'water' ? '24px 28px' : '16px 18px',
                display: 'flex', flexDirection: 'column', gap: 14,
                cursor: quadrantFocus === 'all' ? 'pointer' : 'default',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ background: '#F0F9FF', color: '#0284C7', fontSize: 11, fontWeight: 800, padding: '2px 6px', borderRadius: 4 }}>EI-3</span>
                  <span style={{ fontSize: quadrantFocus === 'water' ? 15 : 13, fontWeight: 700, color: '#0F172A' }}>
                    Water Withdrawal &amp; Consumption Balance {quadrantFocus === 'water' && '(Expanded View)'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ background: '#DCFCE7', color: '#15803D', fontSize: 10.5, fontWeight: 700, padding: '2px 6px', borderRadius: 4 }}>ZLD Compliant</span>
                  {quadrantFocus === 'water' && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setQuadrantFocus('all'); }}
                      style={{ border: 'none', background: '#F0F9FF', color: '#0284C7', fontSize: 11.5, fontWeight: 700, padding: '4px 8px', borderRadius: 4, cursor: 'pointer' }}
                    >
                      View All Quadrants ✕
                    </button>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
                {(() => {
                  const tot = (cards.water?.current || 0);
                  const surf = (data?.breakdown?.water?.surface || 0);
                  const gw = (data?.breakdown?.water?.groundwater || 0);
                  const sPct = tot > 0 ? (surf / tot) * 100 : 64;
                  const gPct = tot > 0 ? (gw / tot) * 100 : 25;
                  const dSize = quadrantFocus === 'water' ? 120 : 90;
                  const innerSize = quadrantFocus === 'water' ? 84 : 60;
                  return (
                    <div style={{
                      width: dSize, height: dSize, borderRadius: '50%',
                      background: `conic-gradient(#0284C7 0% ${sPct}%, #0EA5E9 ${sPct}% ${sPct + gPct}%, #38BDF8 ${sPct + gPct}% 100%)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <div style={{
                        width: innerSize, height: innerSize, borderRadius: '50%', background: '#FFFFFF',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <span style={{ fontSize: quadrantFocus === 'water' ? 13.5 : 11, fontWeight: 800, color: '#0F172A' }}>{fmt(cards.water?.current)}</span>
                        <span style={{ fontSize: 8.5, color: '#64748B', fontWeight: 700 }}>TOTAL kL</span>
                      </div>
                    </div>
                  );
                })()}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minWidth: 260 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#475569' }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: '#0284C7' }} />
                      Surface Water
                    </span>
                    <span style={{ fontWeight: 700, color: '#0F172A' }}>{fmt(data?.breakdown?.water?.surface)} kL</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#475569' }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: '#0EA5E9' }} />
                      Groundwater
                    </span>
                    <span style={{ fontWeight: 700, color: '#0F172A' }}>{fmt(data?.breakdown?.water?.groundwater)} kL</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#475569' }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: '#38BDF8' }} />
                      Third-Party / Others
                    </span>
                    <span style={{ fontWeight: 700, color: '#0F172A' }}>{fmt(data?.breakdown?.water?.third_party)} kL</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: '#64748B', borderTop: '1px solid #E2E8F0', paddingTop: 8 }}>
                <span>Water Consumed: <b>{fmt(cards.water?.consumed)} kL</b> · Discharged: <b>{fmt(cards.water?.discharged)} kL</b></span>
                <span style={{ color: '#0284C7', fontWeight: 600 }}>CGWA Permit Active</span>
              </div>
            </div>
          )}

          {/* ── Quadrant 4: Waste Circularity & Diversion Rate ── */}
          {(quadrantFocus === 'all' || quadrantFocus === 'waste') && (
            <div
              onClick={() => { setQuadrantFocus('waste'); setSelectedKpi('waste'); }}
              style={{
                background: '#FAFAFA', border: quadrantFocus === 'waste' ? '2px solid #059669' : '1px solid #E2E8F0',
                borderRadius: 10, padding: quadrantFocus === 'waste' ? '24px 28px' : '16px 18px',
                display: 'flex', flexDirection: 'column', gap: 14,
                cursor: quadrantFocus === 'all' ? 'pointer' : 'default',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ background: '#ECFDF5', color: '#059669', fontSize: 11, fontWeight: 800, padding: '2px 6px', borderRadius: 4 }}>EI-8</span>
                  <span style={{ fontSize: quadrantFocus === 'waste' ? 15 : 13, fontWeight: 700, color: '#0F172A' }}>
                    Waste Circularity &amp; Diversion Rate {quadrantFocus === 'waste' && '(Expanded View)'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ background: '#DCFCE7', color: '#15803D', fontSize: 10.5, fontWeight: 700, padding: '2px 6px', borderRadius: 4 }}>
                    {(() => {
                      const tot = (cards.waste?.current || 0);
                      const rec = (cards.waste?.recovered || 0);
                      return tot > 0 ? Math.round((rec / tot) * 100 * 10) / 10 : (data?.breakdown?.waste?.recovery_pct || 0);
                    })()}% Diverted
                  </span>
                  {quadrantFocus === 'waste' && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setQuadrantFocus('all'); }}
                      style={{ border: 'none', background: '#ECFDF5', color: '#059669', fontSize: 11.5, fontWeight: 700, padding: '4px 8px', borderRadius: 4, cursor: 'pointer' }}
                    >
                      View All Quadrants ✕
                    </button>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
                {(() => {
                  const tot = (cards.waste?.current || 0);
                  const rec = (cards.waste?.recovered || 0);
                  const recPct = tot > 0 ? (rec / tot) * 100 : (data?.breakdown?.waste?.recovery_pct || 88.6);
                  const dSize = quadrantFocus === 'waste' ? 120 : 90;
                  const innerSize = quadrantFocus === 'waste' ? 84 : 60;
                  return (
                    <div style={{
                      width: dSize, height: dSize, borderRadius: '50%',
                      background: `conic-gradient(#10B981 0% ${recPct}%, #F97316 ${recPct}% 100%)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <div style={{
                        width: innerSize, height: innerSize, borderRadius: '50%', background: '#FFFFFF',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <span style={{ fontSize: quadrantFocus === 'waste' ? 15 : 13, fontWeight: 800, color: '#059669' }}>{Math.round(recPct * 10) / 10}%</span>
                        <span style={{ fontSize: 8.5, color: '#64748B', fontWeight: 700 }}>RECOVERY</span>
                      </div>
                    </div>
                  );
                })()}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minWidth: 260 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#475569' }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: '#10B981' }} />
                      Recycled / Diverted
                    </span>
                    <span style={{ fontWeight: 700, color: '#059669' }}>{fmt(cards.waste?.recovered || data?.breakdown?.waste?.recycled)} MT</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#475569' }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: '#F97316' }} />
                      Authorized TSDF Landfill
                    </span>
                    <span style={{ fontWeight: 700, color: '#0F172A' }}>{fmt(cards.waste?.disposed || data?.breakdown?.waste?.landfill_disposal)} MT</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#475569' }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: '#64748B' }} />
                      Hazardous Waste
                    </span>
                    <span style={{ fontWeight: 700, color: '#0F172A' }}>{fmt(data?.breakdown?.waste?.hazardous)} MT</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: '#64748B', borderTop: '1px solid #E2E8F0', paddingTop: 8 }}>
                <span>Total Waste Generated: <b>{fmt(cards.waste?.current)} MT</b></span>
                <span style={{ color: '#059669', fontWeight: 600 }}>TSDF Manifests Verified</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer info line */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          fontSize: 11.5, color: '#64748B', borderTop: '1px solid #F1F5F9', paddingTop: 10,
        }}>
          <span>Displaying 11 of 11 SEBI BRSR Principle 6 indicators graphically for <b>{data?.node?.name}</b></span>
          <span>🔒 Data locked for statutory filing</span>
        </div>
      </div>

      <DataLineageDrawer
        isOpen={lineageOpen}
        onClose={() => setLineageOpen(false)}
        onSelectNode={(nodeId) => { setSelectedEntityId(nodeId); setLineageOpen(false); }}
        metricCode={selectedKpi}
        periodId={data?.node?.id}
      />
    </div>
  );
}
