import React, { useState } from 'react';
import { useMetricCatalogue } from '../hooks/useApi';
import { BookOpen, Search, Filter, Leaf, Users, Shield, Award, CheckCircle2, ChevronRight, Hash, RefreshCw, X } from 'lucide-react';
import Modal from '../components/Modal';
import PageHelpButton from '../components/PageHelpButton';

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
  // Backend stores categories as lowercase ('environment', 'social', 'governance')
  if (categoryFilter !== 'All') queryParams.category = categoryFilter.toLowerCase();
  if (principleFilter !== 'All') queryParams.principle = parseInt(principleFilter, 10);
  if (coreOnly) queryParams.brsr_core = true;

  const { data: metrics = [], isLoading, isRefetching, refetch, error } = useMetricCatalogue(queryParams);

  const filteredMetrics = metrics.filter(m => {
    if (!search) return true;
    const q = search.toLowerCase();
    return m.code.toLowerCase().includes(q) || m.name.toLowerCase().includes(q) || (m.definition && m.definition.toLowerCase().includes(q));
  });

  return (
    <div className="page-content anim-fade" style={{ background: '#f8fafc' }}>
      {/* ── Status Ticker ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8,
        fontSize: 11, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748b'
      }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#15803d' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#15803d', display: 'inline-block' }}></span>
          SEBI STATUTORY INDICATORS
        </span>
        <span style={{ color: '#cbd5e1' }}>/</span>
        <span>SINGLE SOURCE OF TRUTH (SSOT) CATALOGUE</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#09090b', margin: 0, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 10 }}>
            <BookOpen size={24} color="#09090b" />
            Statutory Metric Catalogue
          </h1>
          <p style={{ color: '#64748b', fontSize: '13px', margin: '4px 0 0 0' }}>
            Official SEBI BRSR Core and Leadership indicator definitions, units, and aggregation rules.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <PageHelpButton title="Metric Catalogue Guide" route="/metrics" />
          <button className="btn btn-secondary" style={{ borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', color: '#09090b', fontWeight: 600 }} onClick={() => refetch()} disabled={isRefetching}>
            <RefreshCw size={13} className={isRefetching ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
          <span style={{ fontSize: '12px', fontWeight: 600, padding: '5px 12px', borderRadius: 99, background: '#ffffff', border: '1px solid #e2e8f0', color: '#09090b', fontFamily: 'ui-monospace, monospace' }}>
            {filteredMetrics.length} Indicators Active
          </span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20, padding: 14, background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
        {/* Search */}
        <div style={{ flex: '1 1 240px', position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: 11, color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search metric code, name, or definition..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', padding: '7px 10px 7px 34px', borderRadius: 6, background: '#f8fafc', border: '1px solid #e2e8f0', color: '#09090b', fontSize: 13 }}
          />
        </div>

        {/* Category Filter */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={{ padding: '7px 12px', borderRadius: 6, background: '#fff', border: '1px solid #e2e8f0', color: '#09090b', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}
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
          style={{ padding: '7px 12px', borderRadius: 6, background: '#fff', border: '1px solid #e2e8f0', color: '#09090b', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}
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
            borderRadius: 6,
            border: '1px solid',
            borderColor: coreOnly ? '#0070F3' : '#e2e8f0',
            background: coreOnly ? '#0070F3' : '#fff',
            color: coreOnly ? '#fff' : '#09090b',
            boxShadow: coreOnly ? '0 1px 3px rgba(0, 112, 243, 0.25)' : 'none',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            transition: 'all 0.15s ease'
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
      <Modal
        isOpen={Boolean(selectedMetric)}
        onClose={() => setSelectedMetric(null)}
        maxWidth="640px"
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="modal-header-icon" style={{ background: 'rgba(99, 102, 241, 0.15)', color: 'var(--brand-400)' }}>
              <BookOpen size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', color: '#fff', margin: 0 }}>
                {selectedMetric?.code} — Indicator Details
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                SEBI BRSR Core Statutory Metadata & Calculation Lineage
              </p>
            </div>
          </div>
          <button className="icon-btn" onClick={() => setSelectedMetric(null)}>
            <X size={18} />
          </button>
        </div>

        {selectedMetric && (
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <h4 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '6px', color: '#fff' }}>
                {selectedMetric.name}
              </h4>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6', margin: 0 }}>
                {selectedMetric.definition || 'No statutory description recorded.'}
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              <div style={{ background: 'var(--bg-elevated)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Data Type</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>{selectedMetric.data_type}</div>
              </div>
              <div style={{ background: 'var(--bg-elevated)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Collection Frequency</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>{selectedMetric.frequency || 'Monthly'}</div>
              </div>
              <div style={{ background: 'var(--bg-elevated)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Owner Role</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--brand-400)', marginTop: 2, textTransform: 'capitalize' }}>{selectedMetric.owner_role || 'maker'}</div>
              </div>
              <div style={{ background: 'var(--bg-elevated)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Allowed Units</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>{selectedMetric.allowed_units?.join(', ') || selectedMetric.base_unit}</div>
              </div>
            </div>

            <div style={{ background: 'rgba(99, 102, 241, 0.08)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-brand)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>Statutory Formula Code</div>
              <div style={{ fontSize: '13px', color: 'var(--brand-400)', fontFamily: 'JetBrains Mono', fontWeight: 700 }}>
                {selectedMetric.calc_formula_code || 'Direct Measurement (No statutory formula transformation)'}
              </div>
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid var(--border-default)', paddingTop: 14, marginTop: 4 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setSelectedMetric(null)}
              >
                Close Specification
              </button>
            </div>
          </div>
        )}
      </Modal>
      )}
    </div>
  );
}
