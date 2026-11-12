import React, { useMemo, useState } from 'react';
import {
  Zap, Cloud, Droplets, Trash2, ShieldCheck, Globe,
  ChevronRight, ChevronDown, Building2, Layers, Eye, FileText
} from 'lucide-react';
import { usePrinciple6Rolldown } from '../hooks/useApi';

const P6_TABS = [
  { id: 'overview', label: 'Org Roll-Down' },
  { id: 'energy_ghg', label: 'Energy & GHG (Scope 1–3)' },
  { id: 'water', label: 'Water (EI-3 & EI-4)' },
  { id: 'waste', label: 'Waste (EI-9)' },
  { id: 'air_comp', label: 'Air & Compliance' },
  { id: 'leadership', label: 'Leadership (LI 1–8)' },
];

const STATUS_BADGE = {
  APPROVED: { bg: '#dcfce7', color: '#15803d', label: 'Approved' },
  BU_APPROVED: { bg: '#dcfce7', color: '#15803d', label: 'BU Approved' },
  SUBSIDIARY_APPROVED: { bg: '#e0e7ff', color: '#4338ca', label: 'Sub. Approved' },
  CONSOLIDATED: { bg: '#e0e7ff', color: '#4338ca', label: 'Consolidated' },
  SUBMITTED: { bg: '#fef3c7', color: '#b45309', label: 'Submitted' },
  UNDER_BU_REVIEW: { bg: '#e0f2fe', color: '#0369a1', label: 'Under Review' },
  RETURNED: { bg: '#fee2e2', color: '#b91c1c', label: 'Returned' },
  DRAFT: { bg: '#f1f5f9', color: '#475569', label: 'Draft' },
  NOT_STARTED: { bg: '#f8fafc', color: '#94a3b8', label: 'Pending' },
};

function fmt(v, digits = 2) {
  if (v === null || v === undefined) return '—';
  const n = Number(v);
  if (Number.isNaN(n)) return '—';
  return n.toLocaleString(undefined, { maximumFractionDigits: digits });
}

export default function Principle6RolldownPanel({
  nodes = [],
  periods = [],
  activePeriodId,
  activeEntityId,
  onSelectPeriod,
  onSelectEntity,
  onInspectMetric,
  userRole,
  userOrgNodeId,
}) {
  const [activeTab, setActiveTab] = useState('overview');
  const { data: p6, isLoading } = usePrinciple6Rolldown(activePeriodId, activeEntityId);

  // Build cascading hierarchy options scoped to the admin's own subtree
  const scopedChildrenByParent = useMemo(() => {
    const map = {};
    nodes.forEach((n) => {
      const pid = n.parent_id ? String(n.parent_id) : 'ROOT';
      if (!map[pid]) map[pid] = [];
      map[pid].push(n);
    });
    return map;
  }, [nodes]);

  const isTopAdmin = ['system_admin', 'group_admin', 'group_esg_manager', 'group_supervisor'].includes(userRole);
  const scopeRoot = useMemo(() => {
    if (!isTopAdmin && userOrgNodeId) {
      return nodes.find((n) => String(n.id) === String(userOrgNodeId)) || nodes[0];
    }
    return nodes.find((n) => n.type === 'group' || n.is_root) || nodes[0];
  }, [isTopAdmin, userOrgNodeId, nodes]);

  const kpis = p6?.kpis || {};
  const energy = kpis.energy || {};
  const ghg = kpis.ghg || {};
  const water = kpis.water || {};
  const waste = kpis.waste || {};
  const air = kpis.air || {};
  const comp = kpis.compliance_and_leadership || {};
  const children = p6?.children || [];
  const rawEntries = p6?.project_raw_entries || [];
  const breadcrumbs = p6?.breadcrumbs || [];

  const subsidiaries = useMemo(() => {
    if (!scopeRoot) return [];
    if (scopeRoot.type === 'group') return scopedChildrenByParent[String(scopeRoot.id)] || [];
    if (scopeRoot.type === 'subsidiary' || scopeRoot.type === 'company') return [scopeRoot];
    return [];
  }, [scopeRoot, scopedChildrenByParent]);

  const selectedSub = breadcrumbs.find((b) => ['subsidiary', 'company'].includes(b.type)) || (subsidiaries.length === 1 ? subsidiaries[0] : null);
  const bus = useMemo(() => {
    if (scopeRoot?.type === 'business_unit') return [scopeRoot];
    if (selectedSub) return scopedChildrenByParent[String(selectedSub.id)] || [];
    return [];
  }, [scopeRoot, selectedSub, scopedChildrenByParent]);

  const selectedBU = breadcrumbs.find((b) => b.type === 'business_unit') || (bus.length === 1 ? bus[0] : null);
  const projects = useMemo(() => {
    if (scopeRoot?.type === 'project' || scopeRoot?.type === 'site') return [scopeRoot];
    if (selectedBU) return scopedChildrenByParent[String(selectedBU.id)] || [];
    return [];
  }, [scopeRoot, selectedBU, scopedChildrenByParent]);

  const selectedProj = breadcrumbs.find((b) => ['project', 'site'].includes(b.type));

  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px', marginBottom: '24px' }}>
      {/* Header + Cascading Dropdown Bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Globe size={18} color="#059669" />
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
              Principle 6 — Top-Down Environmental Roll-Down
            </h2>
          </div>
          {/* Breadcrumbs */}
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px', marginTop: '6px', fontSize: '12px', color: '#64748b' }}>
            {breadcrumbs.map((b, idx) => (
              <React.Fragment key={b.id}>
                {idx > 0 && <ChevronRight size={13} />}
                <button
                  type="button"
                  onClick={() => onSelectEntity(b.id)}
                  style={{
                    background: 'none', border: 'none', padding: '2px 6px', borderRadius: '6px', cursor: 'pointer',
                    fontWeight: idx === breadcrumbs.length - 1 ? 700 : 500,
                    color: idx === breadcrumbs.length - 1 ? '#0f766e' : '#475569',
                    backgroundColor: idx === breadcrumbs.length - 1 ? '#f0fdfa' : 'transparent',
                  }}
                >
                  {b.name}
                </button>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Cascading Scope Dropdowns */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
          {subsidiaries.length > 0 && (
            <select
              aria-label="Subsidiary Filter"
              value={selectedSub?.id || ''}
              onChange={(e) => onSelectEntity(e.target.value || scopeRoot?.id)}
              style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', background: '#f8fafc', color: '#0f172a' }}
            >
              {isTopAdmin && <option value="">All Subsidiaries (Group)</option>}
              {subsidiaries.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}
          {bus.length > 0 && (
            <select
              aria-label="Business Unit Filter"
              value={selectedBU?.id || ''}
              onChange={(e) => onSelectEntity(e.target.value || selectedSub?.id || scopeRoot?.id)}
              style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', background: '#f8fafc', color: '#0f172a' }}
            >
              <option value="">All Business Units</option>
              {bus.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}
          {projects.length > 0 && (
            <select
              aria-label="Project Filter"
              value={selectedProj?.id || ''}
              onChange={(e) => onSelectEntity(e.target.value || selectedBU?.id || scopeRoot?.id)}
              style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', background: '#f8fafc', color: '#0f172a' }}
            >
              <option value="">All Projects</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
          <select
            aria-label="Period Filter"
            value={activePeriodId || ''}
            onChange={(e) => onSelectPeriod(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', background: '#fff', fontWeight: 600, color: '#0f172a' }}
          >
            {periods.map((per) => <option key={per.id} value={per.id}>{per.code}</option>)}
          </select>
        </div>
      </div>

      {/* Layer 1: 6 Clean At-a-Glance KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))', gap: '12px', marginBottom: '16px' }}>
        <div style={{ padding: '12px', borderRadius: '10px', background: '#fffbeb', border: '1px solid #fde68a' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#92400e', fontWeight: 600 }}>
            <span>Energy (EI-1)</span><Zap size={14} />
          </div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>{fmt(energy.total_gj)} GJ</div>
          <div style={{ fontSize: '11px', color: '#78350f', marginTop: '2px' }}>
            {fmt(energy.renewable_pct, 1)}% Renewable
          </div>
        </div>

        <div style={{ padding: '12px', borderRadius: '10px', background: '#eff6ff', border: '1px solid #bfdbfe' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#1e40af', fontWeight: 600 }}>
            <span>GHG Scope 1+2 (EI-7)</span><Cloud size={14} />
          </div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>{fmt(ghg.total_s1_s2_tco2e)} tCO₂e</div>
          <div style={{ fontSize: '11px', color: '#1e3a8a', marginTop: '2px' }}>
            S1: {fmt(ghg.scope1_tco2e)} · S2: {fmt(ghg.scope2_tco2e)}
          </div>
        </div>

        <div style={{ padding: '12px', borderRadius: '10px', background: '#f5f3ff', border: '1px solid #ddd6fe' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#5b21b6', fontWeight: 600 }}>
            <span>Scope 3 (LI-2)</span><Layers size={14} />
          </div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>{fmt(ghg.scope3_tco2e)} tCO₂e</div>
          <div style={{ fontSize: '11px', color: '#4c1d95', marginTop: '2px' }}>
            Value Chain Assessed: {fmt(comp.vc_assessed_pct, 1)}%
          </div>
        </div>

        <div style={{ padding: '12px', borderRadius: '10px', background: '#ecfeff', border: '1px solid #a5f3fc' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#155e75', fontWeight: 600 }}>
            <span>Water (EI-3/4)</span><Droplets size={14} />
          </div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>{fmt(water.total_withdrawal_kl)} kL</div>
          <div style={{ fontSize: '11px', color: '#164e63', marginTop: '2px' }}>
            Consumed: {fmt(water.total_consumption_kl)} · Discharged: {fmt(water.total_discharged_kl)}
          </div>
        </div>

        <div style={{ padding: '12px', borderRadius: '10px', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#166534', fontWeight: 600 }}>
            <span>Waste (EI-9)</span><Trash2 size={14} />
          </div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>{fmt(waste.total_generated_mt)} MT</div>
          <div style={{ fontSize: '11px', color: '#14532d', marginTop: '2px' }}>
            {fmt(waste.recovery_pct, 1)}% Recovered ({fmt(waste.total_recovered_mt)} MT)
          </div>
        </div>

        <div style={{ padding: '12px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#334155', fontWeight: 600 }}>
            <span>Compliance & Air</span><ShieldCheck size={14} />
          </div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginTop: '6px' }}>
            {comp.env_compliance_status || 'Pending Entity Update'}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
            NOx: {fmt(air.nox)} · SOx: {fmt(air.sox)} mg/m³
          </div>
        </div>
      </div>

      {/* Layer 2: Domain Tabs (Zero Clutter) */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', marginBottom: '14px' }}>
        {P6_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            style={{
              padding: '6px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600,
              background: activeTab === t.id ? '#0f766e' : '#f1f5f9',
              color: activeTab === t.id ? '#ffffff' : '#475569',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>Loading Principle 6 roll-down...</div>
      ) : (
        <>
          {/* Tab 1: Org Roll-Down */}
          {activeTab === 'overview' && (
            <div>
              {children.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
                        <th style={{ padding: '10px' }}>Child Unit ({children[0]?.type})</th>
                        <th style={{ padding: '10px' }}>Status</th>
                        <th style={{ padding: '10px', textAlign: 'right' }}>Energy (GJ)</th>
                        <th style={{ padding: '10px', textAlign: 'right' }}>Scope 1+2 (tCO₂e)</th>
                        <th style={{ padding: '10px', textAlign: 'right' }}>Scope 3 (tCO₂e)</th>
                        <th style={{ padding: '10px', textAlign: 'right' }}>Water (kL)</th>
                        <th style={{ padding: '10px', textAlign: 'right' }}>Waste (MT)</th>
                        <th style={{ padding: '10px', textAlign: 'center' }}>Drill-Down</th>
                      </tr>
                    </thead>
                    <tbody>
                      {children.map((ch) => {
                        const badge = STATUS_BADGE[ch.submission_status] || STATUS_BADGE.NOT_STARTED;
                        return (
                          <tr key={ch.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '10px', fontWeight: 600, color: '#0f172a' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Building2 size={14} color="#64748b" />
                                <span>{ch.name}</span>
                              </div>
                            </td>
                            <td style={{ padding: '10px' }}>
                              <span style={{ padding: '2px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 600, background: badge.bg, color: badge.color }}>
                                {badge.label}
                              </span>
                            </td>
                            <td style={{ padding: '10px', textAlign: 'right' }}>{fmt(ch.energy_gj)}</td>
                            <td style={{ padding: '10px', textAlign: 'right' }}>{fmt(ch.ghg_s1_s2_tco2e)}</td>
                            <td style={{ padding: '10px', textAlign: 'right' }}>{fmt(ch.scope3_tco2e)}</td>
                            <td style={{ padding: '10px', textAlign: 'right' }}>{fmt(ch.water_kl)}</td>
                            <td style={{ padding: '10px', textAlign: 'right' }}>{fmt(ch.waste_mt)}</td>
                            <td style={{ padding: '10px', textAlign: 'center' }}>
                              <button
                                type="button"
                                onClick={() => onSelectEntity(ch.id)}
                                style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '12px', cursor: 'pointer', fontWeight: 600, color: '#0f766e' }}
                              >
                                {ch.has_children ? 'Roll Down →' : 'Inspect Site →'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
                    Project Site Raw Entries ({rawEntries.length} Principle 6 Data Points)
                  </div>
                  {rawEntries.length === 0 ? (
                    <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', fontSize: '13px', color: '#64748b' }}>
                      No Principle 6 submissions recorded for this site and period yet.
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <thead>
                          <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
                            <th style={{ padding: '8px' }}>Code</th>
                            <th style={{ padding: '8px' }}>Indicator</th>
                            <th style={{ padding: '8px', textAlign: 'right' }}>Value</th>
                            <th style={{ padding: '8px' }}>Unit</th>
                            <th style={{ padding: '8px', textAlign: 'center' }}>Evidence</th>
                            <th style={{ padding: '8px', textAlign: 'center' }}>Lineage</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rawEntries.map((r) => (
                            <tr key={r.metric_code} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '8px', fontFamily: 'monospace' }}>{r.metric_code}</td>
                              <td style={{ padding: '8px', fontWeight: 500 }}>{r.metric_name}</td>
                              <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700 }}>
                                {r.value_numeric !== null && r.value_numeric !== undefined ? fmt(r.value_numeric) : (r.value_text || '—')}
                              </td>
                              <td style={{ padding: '8px' }}>{r.unit}</td>
                              <td style={{ padding: '8px', textAlign: 'center' }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: r.evidence_count > 0 ? '#15803d' : '#94a3b8' }}>
                                  <FileText size={12} /> {r.evidence_count}
                                </span>
                              </td>
                              <td style={{ padding: '8px', textAlign: 'center' }}>
                                {onInspectMetric && (
                                  <button
                                    type="button"
                                    onClick={() => onInspectMetric(r.metric_code)}
                                    style={{ background: 'none', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '2px 8px', cursor: 'pointer', fontSize: '11px' }}
                                  >
                                    <Eye size={11} style={{ verticalAlign: 'middle', marginRight: '3px' }} />Inspect
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
              )}
            </div>
          )}

          {/* Tab 2: Energy & GHG */}
          {activeTab === 'energy_ghg' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', fontSize: '13px' }}>
              <div style={{ padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 700, marginBottom: '8px' }}>EI-1 Energy Breakdown (GJ)</div>
                <div>Renewable Electricity (A): <strong>{fmt(energy.breakdown?.ren_elec_gj)} GJ</strong></div>
                <div>Renewable Fuel (B): <strong>{fmt(energy.breakdown?.ren_fuel_gj)} GJ</strong></div>
                <div>Other Renewable (C): <strong>{fmt(energy.breakdown?.ren_other_gj)} GJ</strong></div>
                <div>Non-Renewable Electricity (D): <strong>{fmt(energy.breakdown?.nonren_elec_gj)} GJ</strong></div>
                <div>Non-Renewable Fuel (E): <strong>{fmt(energy.breakdown?.nonren_fuel_gj)} GJ</strong></div>
                <div>Other Non-Renewable (F): <strong>{fmt(energy.breakdown?.nonren_other_gj)} GJ</strong></div>
              </div>
              <div style={{ padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 700, marginBottom: '8px' }}>EI-7 Scope 1 & 2 + LI-2 Scope 3 (tCO₂e)</div>
                <div>Scope 1 Stationary: <strong>{fmt(ghg.scope1_breakdown?.stationary)} tCO₂e</strong></div>
                <div>Scope 1 Mobile: <strong>{fmt(ghg.scope1_breakdown?.mobile)} tCO₂e</strong></div>
                <div>Scope 1 Process: <strong>{fmt(ghg.scope1_breakdown?.process)} tCO₂e</strong></div>
                <div>Scope 1 Fugitive: <strong>{fmt(ghg.scope1_breakdown?.fugitive)} tCO₂e</strong></div>
                <div>Scope 2 Total: <strong>{fmt(ghg.scope2_tco2e)} tCO₂e</strong></div>
                <div>Scope 3 Total: <strong>{fmt(ghg.scope3_tco2e)} tCO₂e</strong></div>
              </div>
            </div>
          )}

          {/* Tab 3: Water */}
          {activeTab === 'water' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', fontSize: '13px' }}>
              <div style={{ padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 700, marginBottom: '8px' }}>EI-3 Water Withdrawal by Source (kL)</div>
                <div>Surface Water: <strong>{fmt(water.withdrawal_by_source?.surface)} kL</strong></div>
                <div>Groundwater: <strong>{fmt(water.withdrawal_by_source?.groundwater)} kL</strong></div>
                <div>Third Party: <strong>{fmt(water.withdrawal_by_source?.third_party)} kL</strong></div>
                <div>Seawater / Desalinated: <strong>{fmt(water.withdrawal_by_source?.seawater)} kL</strong></div>
                <div>Others: <strong>{fmt(water.withdrawal_by_source?.others)} kL</strong></div>
              </div>
              <div style={{ padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 700, marginBottom: '8px' }}>EI-4 Water Discharged by Destination (kL)</div>
                <div>Surface Water: <strong>{fmt(water.discharge_by_dest?.surface)} kL</strong></div>
                <div>Groundwater: <strong>{fmt(water.discharge_by_dest?.groundwater)} kL</strong></div>
                <div>Seawater: <strong>{fmt(water.discharge_by_dest?.seawater)} kL</strong></div>
                <div>Third Parties / CETP: <strong>{fmt(water.discharge_by_dest?.third_party)} kL</strong></div>
                <div>Others: <strong>{fmt(water.discharge_by_dest?.others)} kL</strong></div>
                <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #e2e8f0' }}>
                  LI-1 Water-Stressed Projects: <strong>{water.water_stressed_projects || 'None flagged'}</strong>
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: Waste */}
          {activeTab === 'waste' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', fontSize: '13px' }}>
              <div style={{ padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 700, marginBottom: '8px' }}>EI-9 Waste Generated by Category (MT)</div>
                <div>Plastic (A): <strong>{fmt(waste.by_category?.plastic)} MT</strong></div>
                <div>E-Waste (B): <strong>{fmt(waste.by_category?.ewaste)} MT</strong></div>
                <div>Bio-Medical (C): <strong>{fmt(waste.by_category?.biomed)} MT</strong></div>
                <div>C&D Waste (D): <strong>{fmt(waste.by_category?.cd)} MT</strong></div>
                <div>Battery (E): <strong>{fmt(waste.by_category?.battery)} MT</strong></div>
                <div>Radioactive (F): <strong>{fmt(waste.by_category?.radioactive)} MT</strong></div>
                <div>Other Hazardous (G): <strong>{fmt(waste.by_category?.hazardous_other)} MT</strong></div>
                <div>Other Non-Hazardous (H): <strong>{fmt(waste.by_category?.non_hazardous_other)} MT</strong></div>
              </div>
              <div style={{ padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 700, marginBottom: '8px' }}>EI-9 Recovery & Disposal (MT)</div>
                <div>Recycled: <strong>{fmt(waste.recovery_methods?.recycled)} MT</strong></div>
                <div>Re-used: <strong>{fmt(waste.recovery_methods?.reused)} MT</strong></div>
                <div>Other Recovery: <strong>{fmt(waste.recovery_methods?.other)} MT</strong></div>
                <div>Incineration: <strong>{fmt(waste.disposal_methods?.incineration)} MT</strong></div>
                <div>Landfilling: <strong>{fmt(waste.disposal_methods?.landfilling)} MT</strong></div>
                <div>Other Disposal: <strong>{fmt(waste.disposal_methods?.other)} MT</strong></div>
              </div>
            </div>
          )}

          {/* Tab 5: Air & Compliance */}
          {activeTab === 'air_comp' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', fontSize: '13px' }}>
              <div style={{ padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 700, marginBottom: '8px' }}>EI-6 Air Emissions (mg/m³)</div>
                <div>NOx: <strong>{fmt(air.nox)}</strong> · SOx: <strong>{fmt(air.sox)}</strong> · PM: <strong>{fmt(air.pm)}</strong></div>
                <div>VOC: <strong>{fmt(air.voc)}</strong> · HAP: <strong>{fmt(air.hap)}</strong> · POP: <strong>{fmt(air.pop)}</strong></div>
              </div>
              <div style={{ padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 700, marginBottom: '8px' }}>EI-2, EI-5, EI-10, EI-11, EI-12, EI-13</div>
                <div>PAT Scheme (EI-2): <strong>{comp.pat_status || '—'}</strong></div>
                <div>ZLD Mechanism (EI-5): <strong>{comp.zld_status || '—'}</strong></div>
                <div>Eco-Sensitive (EI-11): <strong>{comp.eco_sensitive_details || '—'}</strong></div>
                <div>EIA Registry (EI-12): <strong>{comp.eia_details || '—'}</strong></div>
                <div>Law Compliance (EI-13): <strong>{comp.env_compliance_status || '—'}</strong></div>
              </div>
            </div>
          )}

          {/* Tab 6: Leadership */}
          {activeTab === 'leadership' && (
            <div style={{ padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '13px', display: 'grid', gap: '6px' }}>
              <div><strong>LI-1 Water-Stressed Sites:</strong> {water.water_stressed_projects || '—'}</div>
              <div><strong>LI-2 Scope 3 Total:</strong> {fmt(ghg.scope3_tco2e)} tCO₂e</div>
              <div><strong>LI-3 Biodiversity Remediation:</strong> {comp.biodiversity_details || '—'}</div>
              <div><strong>LI-4 Resource Efficiency Initiatives:</strong> {comp.efficiency_details || '—'}</div>
              <div><strong>LI-5 Business Continuity & Disaster Plan:</strong> {comp.bcp_status || '—'}</div>
              <div><strong>LI-6 Value Chain Environmental Impact:</strong> {comp.vc_impact || '—'}</div>
              <div><strong>LI-7 Value Chain Partners Assessed:</strong> {fmt(comp.vc_assessed_pct, 1)}%</div>
              <div><strong>LI-8 Green Credits (Entity / Top 10 VC):</strong> {fmt(comp.green_credits_entity, 0)} / {fmt(comp.green_credits_vc, 0)}</div>
              <div><strong>External Assurance:</strong> {comp.assurance_status || '—'}</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

