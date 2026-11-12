import React, { useEffect, useMemo, useState } from 'react';
import { Building2, Search, Zap, Cloud, Truck, Droplets, Recycle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { p6FormsApi, getFriendlyErrorMessage } from '../api/client';
import DataLineageDrawer from '../components/DataLineageDrawer';

const fmt = (v) => {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return '—';
  return Number(v).toLocaleString('en-IN', { maximumFractionDigits: 2 });
};

export default function Dashboard() {
  const { user } = useAuth();
  const [selectedEntityId, setSelectedEntityId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKpi, setSelectedKpi] = useState('energy');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [lineageOpen, setLineageOpen] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setErrorMsg('');
    p6FormsApi
      .getDashboard(selectedEntityId || undefined)
      .then((res) => {
        if (active) setData(res.data);
      })
      .catch((err) => {
        if (active) setErrorMsg(getFriendlyErrorMessage(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedEntityId]);

  const accessibleNodes = useMemo(() => {
    const list = data?.accessible_nodes || [];
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter((n) => (n.name || '').toLowerCase().includes(q) || (n.id || '').toLowerCase().includes(q));
  }, [data, searchQuery]);

  const cards = data?.cards || {};
  const fy = data?.fy || { current: '2024-25', previous: '2023-24' };
  const hasData = !!data?.has_data;

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

          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, background: '#FFFFFF',
            border: '1px solid #E2E8F0', padding: '5px 10px', borderRadius: 7,
          }}>
            <Building2 size={14} color="#64748B" />
            <select
              value={selectedEntityId || data?.node?.id || ''}
              onChange={(e) => setSelectedEntityId(e.target.value)}
              style={{ border: 'none', outline: 'none', fontSize: 12.5, fontWeight: 600, color: '#0F172A', background: 'transparent', cursor: 'pointer' }}
            >
              {accessibleNodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name} ({n.type})
                </option>
              ))}
            </select>
          </div>

          <span style={{
            padding: '5px 12px', borderRadius: 9999, fontSize: 12, fontWeight: 700,
            background: hasData ? '#DCFCE7' : '#F1F5F9',
            color: hasData ? '#15803D' : '#64748B',
            border: `1px solid ${hasData ? '#BBF7D0' : '#E2E8F0'}`,
          }}>
            {hasData ? 'Accepted Data Active' : 'Awaiting accepted data'}
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

      <DataLineageDrawer
        isOpen={lineageOpen}
        onClose={() => setLineageOpen(false)}
        metricCode={selectedKpi}
        periodId={data?.node?.id}
      />
    </div>
  );
}
