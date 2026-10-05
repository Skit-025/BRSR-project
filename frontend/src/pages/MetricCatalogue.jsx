import React, { useState } from 'react';
import { useMetricCatalogue } from '../hooks/useApi';
import { BookOpen, Search, Filter, Leaf, Users, Shield, Award, CheckCircle2, ChevronRight, Hash, RefreshCw } from 'lucide-react';

const CATEGORY_STYLES = {
  Environmental: { icon: Leaf,   color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' },
  Social:        { icon: Users,  color: '#0284c7', bg: 'rgba(2, 132, 199, 0.1)' },
  Governance:    { icon: Shield, color: '#6366f1', bg: 'rgba(99, 102, 241, 0.1)' },
};

export default function MetricCatalogue() {
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [coreOnly, setCoreOnly] = useState(false);
  const [principleFilter, setPrincipleFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [selectedMetric, setSelectedMetric] = useState(null);

  const queryParams = {};
  if (categoryFilter !== 'All') queryParams.category = categoryFilter;
  if (principleFilter !== 'All') queryParams.principle = parseInt(principleFilter, 10);
  if (coreOnly) queryParams.brsr_core = true;

  const { data: metrics = [], isLoading, isRefetching, refetch, error } = useMetricCatalogue(queryParams);

  const filteredMetrics = metrics.filter(m => {
    if (!search) return true;
    const q = search.toLowerCase();
    return m.code.toLowerCase().includes(q) || m.name.toLowerCase().includes(q) || (m.definition && m.definition.toLowerCase().includes(q));
  });

  return (
    <div className="page-content anim-fade">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookOpen size={24} color="var(--brand-400)" />
            Statutory Metric Catalogue (Single Source of Truth)
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '4px 0 0 0' }}>
            Official SEBI BRSR Core and Leadership indicator definitions, units, and aggregation rules.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button className="btn btn-secondary" onClick={() => refetch()} disabled={isRefetching}>
            <RefreshCw size={13} className={isRefetching ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
          <span style={{ fontSize: '13px', fontWeight: '700', padding: '6px 14px', borderRadius: '20px', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
            {filteredMetrics.length} Indicators Active
          </span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px', padding: '14px', background: 'var(--bg-card)', borderRadius: '10px', border: '1px solid var(--border-default)' }}>
        {/* Search */}
        <div style={{ flex: '1 1 240px', position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search metric code, name, or definition..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', padding: '7px 10px 7px 32px', borderRadius: '6px', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', fontSize: '13px' }}
          />
        </div>

        {/* Category Filter */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={{ padding: '7px 12px', borderRadius: '6px', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', fontSize: '13px' }}
        >
          <option value="All">All Categories (E, S, G)</option>
          <option value="Environmental">Environmental (E)</option>
          <option value="Social">Social (S)</option>
          <option value="Governance">Governance (G)</option>
        </select>

        {/* Principle Filter */}
        <select
          value={principleFilter}
          onChange={(e) => setPrincipleFilter(e.target.value)}
          style={{ padding: '7px 12px', borderRadius: '6px', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', fontSize: '13px' }}
        >
          <option value="All">All Principles (1 - 9)</option>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(p => (
            <option key={p} value={p}>Principle {p}</option>
          ))}
        </select>

        {/* BRSR Core Toggle */}
        <button
          onClick={() => setCoreOnly(!coreOnly)}
          style={{
            padding: '7px 14px',
            borderRadius: '6px',
            border: '1px solid',
            borderColor: coreOnly ? 'var(--brand-400)' : 'var(--border-default)',
            background: coreOnly ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-elevated)',
            color: coreOnly ? 'var(--brand-400)' : 'var(--text-secondary)',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Award size={14} />
          SEBI Core Only
        </button>
      </div>

      {/* Metrics Table / Grid */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>Loading live metric catalogue from database...</div>
      ) : filteredMetrics.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>No indicators match your filter criteria.</div>
      ) : (
        <div style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-default)', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-default)', background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '12px 16px' }}>Code</th>
                <th style={{ padding: '12px 16px' }}>Principle & Name</th>
                <th style={{ padding: '12px 16px' }}>Category</th>
                <th style={{ padding: '12px 16px' }}>Base Unit</th>
                <th style={{ padding: '12px 16px' }}>Aggregation Math</th>
                <th style={{ padding: '12px 16px' }}>Evidence Rule</th>
                <th style={{ padding: '12px 16px' }}>Compliance Tag</th>
              </tr>
            </thead>
            <tbody>
              {filteredMetrics.map((m) => {
                const catCfg = CATEGORY_STYLES[m.category] || CATEGORY_STYLES.Governance;
                const CatIcon = catCfg.icon;

                return (
                  <tr
                    key={m.code}
                    onClick={() => setSelectedMetric(selectedMetric?.code === m.code ? null : m)}
                    style={{
                      borderBottom: '1px solid var(--border-default)',
                      cursor: 'pointer',
                      background: selectedMetric?.code === m.code ? 'var(--bg-elevated)' : 'transparent',
                    }}
                  >
                    <td style={{ padding: '12px 16px', fontWeight: '700', fontFamily: 'monospace', color: 'var(--brand-400)' }}>
                      {m.code}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{m.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        Principle {m.principle} · {m.section}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, color: catCfg.color, background: catCfg.bg }}>
                        <CatIcon size={12} />
                        {m.category}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                      {m.base_unit || '-'}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: '12px' }}>
                      {m.aggregation_type}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: '12px' }}>
                      {m.evidence_rule ? m.evidence_rule.replace('_', ' ') : 'None'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {m.brsr_core ? (
                        <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                          SEBI CORE
                        </span>
                      ) : (
                        <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                          LEADERSHIP
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Slideout/Modal */}
      {selectedMetric && (
        <div style={{ marginTop: '20px', padding: '20px', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-default)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '8px', color: 'var(--brand-400)' }}>
            Indicator Specification: {selectedMetric.code} - {selectedMetric.name}
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px', lineHeight: '1.6' }}>
            {selectedMetric.definition || 'No statutory description recorded.'}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', fontSize: '12px' }}>
            <div><strong>Data Type:</strong> {selectedMetric.data_type}</div>
            <div><strong>Frequency:</strong> {selectedMetric.frequency || 'Monthly'}</div>
            <div><strong>Owner Role:</strong> {selectedMetric.owner_role || 'maker'}</div>
            <div><strong>Statutory Formula:</strong> {selectedMetric.calc_formula_code || 'Direct Measurement'}</div>
            <div><strong>Allowed Units:</strong> {selectedMetric.allowed_units?.join(', ') || selectedMetric.base_unit}</div>
          </div>
        </div>
      )}
    </div>
  );
}
