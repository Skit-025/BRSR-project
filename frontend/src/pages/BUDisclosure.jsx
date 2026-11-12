import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2, Target, Award, Shield, Save, Send, CheckCircle2,
  Clock, AlertTriangle, RefreshCw, Plus, Trash2, ArrowRight,
  Info, Sparkles, Layers, FileCheck
} from 'lucide-react';
import { useOrgNodes, useOrgPeriods } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { disclosuresApi } from '../api/client';
import PageHelpButton from '../components/PageHelpButton';

const SECTIONS = [
  { id: 'bu_targets', label: 'ESG Targets & Commitments', icon: Target, desc: 'Reduction targets set at the Business Unit level' },
  { id: 'bu_initiatives', label: 'Key ESG Initiatives', icon: Award, desc: 'Programs, investments, and energy transitions' },
  { id: 'bu_p6', label: 'Principle 6: Environment', icon: Layers, desc: 'Water-stressed sites, Eco-sensitive/EIA, GHG projects & BU Scope 3' },
  { id: 'bu_governance', label: 'BU Governance & Risk', icon: Shield, desc: 'Oversight structure and sustainability accountability' },
];

const getInitialFormData = () => ({
  bu_targets: {
    energy_reduction_pct: '',
    energy_baseline_year: '',
    energy_target_year: '',
    water_recycle_pct: '',
    ghg_reduction_pct: '',
    renewable_energy_target_pct: '',
    zero_waste_target_year: '',
    net_zero_commitment_year: '',
  },
  bu_initiatives: [],
  bu_p6: {
    water_stressed_project_ids: [],
    water_stressed_projects: '',
    water_stress_tool: 'WRI Aqueduct',
    eco_sensitive_rows: [],
    eco_sensitive_operations: '',
    eco_clearance_compliant: 'Yes',
    eia_rows: [],
    eia_projects_summary: '',
    efficiency_initiatives: [],
    ghg_reduction_projects: '',
    biodiversity_remediation: '',
    resource_efficiency_outcomes: '',
    business_travel_mode: 'Air passenger-km',
    business_travel_qty: '',
    scope3_business_travel_tco2e: '',
    commute_headcount: '',
    commute_mode: 'Two-wheeler',
    commute_avg_km: '',
    commute_working_days: '250',
    scope3_employee_commute_tco2e: '',
  },
  bu_governance: {
    bu_esg_lead_name: '',
    lead_designation: '',
    committee_meeting_frequency: 'Quarterly',
    risk_mitigation_framework: '',
    audit_mechanism: '',
    escalation_protocol: ''
  }
});

export default function BUDisclosure() {
  const { user, isSystemAdmin, isBuAdmin, isBuEsgManager } = useAuth();
  const { data: orgNodes = [] } = useOrgNodes();
  const { data: periods = [] } = useOrgPeriods();

  // Filter org nodes to BU level
  const buNodes = useMemo(() => {
    return orgNodes.filter(n => n.type === 'business_unit' || n.type === 'bu');
  }, [orgNodes]);

  const [selectedBU, setSelectedBU] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [activeTab, setActiveTab] = useState('bu_targets');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState(null);

  const selectedBUNode = useMemo(() => {
    return buNodes.find(n => n.id === selectedBU);
  }, [buNodes, selectedBU]);

  // Projects belonging to the selected BU (for LI-1, EI-11, EI-12 dropdowns)
  const buProjects = useMemo(() => {
    const projects = orgNodes.filter(n => n.type === 'project' || n.type === 'site');
    if (!selectedBUNode) return projects;
    const scoped = projects.filter(
      n => n.parent_id === selectedBUNode.id || (n.path && selectedBUNode.path && n.path.startsWith(selectedBUNode.path))
    );
    return scoped.length > 0 ? scoped : projects;
  }, [orgNodes, selectedBUNode]);

  // Form payload states initialized dynamically
  const [formData, setFormData] = useState(() => getInitialFormData(null));

  const [disclosureStatus, setDisclosureStatus] = useState('DRAFT');
  const [disclosureId, setDisclosureId] = useState(null);

  useEffect(() => {
    if (buNodes.length > 0 && !selectedBU) {
      // Pick user's BU or first BU
      const userBu = buNodes.find(n => n.id === user?.org_node_id);
      setSelectedBU(userBu ? userBu.id : buNodes[0].id);
    }
  }, [buNodes, selectedBU, user]);

  useEffect(() => {
    if (periods.length > 0 && !selectedPeriod) {
      setSelectedPeriod(periods[0].id);
    }
  }, [periods, selectedPeriod]);

  // Fetch disclosure data when BU, period, or activeTab changes
  useEffect(() => {
    if (!selectedBU || !selectedPeriod) return;
    let isMounted = true;
    setLoading(true);

    const baseData = getInitialFormData(selectedBUNode);

    disclosuresApi.getSection('bu', selectedBU, selectedPeriod, activeTab)
      .then(res => {
        if (!isMounted) return;
        if (res.data) {
          setDisclosureId(res.data.id);
          setDisclosureStatus(res.data.status || 'DRAFT');
          if (res.data.payload && (Array.isArray(res.data.payload) ? res.data.payload.length > 0 : Object.keys(res.data.payload).length > 0)) {
            setFormData(prev => ({
              ...prev,
              [activeTab]: res.data.payload
            }));
            return;
          }
        }
        setDisclosureId(null);
        setDisclosureStatus('DRAFT');
        setFormData(prev => ({
          ...prev,
          [activeTab]: baseData[activeTab]
        }));
      })
      .catch(err => {
        if (isMounted) {
          setDisclosureId(null);
          setDisclosureStatus('DRAFT');
          setFormData(prev => ({
            ...prev,
            [activeTab]: baseData[activeTab]
          }));
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, [selectedBU, selectedPeriod, activeTab, selectedBUNode]);

  const handleTargetChange = (field, val) => {
    setFormData(prev => ({
      ...prev,
      bu_targets: { ...prev.bu_targets, [field]: val }
    }));
  };

  const handleGovernanceChange = (field, val) => {
    setFormData(prev => ({
      ...prev,
      bu_governance: { ...prev.bu_governance, [field]: val }
    }));
  };

  const handleAddInitiative = () => {
    const newItem = {
      id: Date.now(),
      name: '',
      category: 'Energy Efficiency',
      capex_inr_lakhs: '',
      expected_co2_reduction_tco2e: '',
      status: 'Planned',
      milestone: ''
    };
    setFormData(prev => ({
      ...prev,
      bu_initiatives: [...(Array.isArray(prev.bu_initiatives) ? prev.bu_initiatives : []), newItem]
    }));
  };

  const handleRemoveInitiative = (idx) => {
    setFormData(prev => ({
      ...prev,
      bu_initiatives: prev.bu_initiatives.filter((_, i) => i !== idx)
    }));
  };

  const handleInitiativeChange = (idx, field, val) => {
    setFormData(prev => {
      const list = [...(prev.bu_initiatives || [])];
      list[idx] = { ...list[idx], [field]: val };
      return { ...prev, bu_initiatives: list };
    });
  };

  const handleSaveDraft = async () => {
    if (!selectedBU || !selectedPeriod) return;
    setSaving(true);
    try {
      const res = await disclosuresApi.save({
        org_node_id: selectedBU,
        period_id: selectedPeriod,
        disclosure_level: 'bu',
        disclosure_section: activeTab,
        payload: formData[activeTab],
        payload_version: 'v1'
      });
      if (res.data?.id) setDisclosureId(res.data.id);
      setNotice({ type: 'success', message: 'BU Disclosure draft saved.' });
    } catch (e) {
      setNotice({ type: 'error', message: e?.response?.data?.detail || 'Failed to save.' });
    } finally {
      setSaving(false);
      setTimeout(() => setNotice(null), 3500);
    }
  };

  const handleSubmit = async () => {
    if (!disclosureId) {
      await handleSaveDraft();
    }
    setSubmitting(true);
    try {
      if (disclosureId) {
        await disclosuresApi.submit(disclosureId);
      }
      setDisclosureStatus('SUBMITTED');
      setNotice({ type: 'success', message: 'BU Disclosure submitted to Subsidiary ESG Manager for review!' });
    } catch (e) {
      setNotice({ type: 'error', message: e?.response?.data?.detail || 'Submit failed.' });
    } finally {
      setSubmitting(false);
    }
  };

  const isLocked = disclosureStatus === 'APPROVED' || disclosureStatus === 'LOCKED';

  const currentBU = buNodes.find(n => n.id === selectedBU);

  return (
    <div className="page-content anim-fade-up" style={{ padding: '28px 36px', maxWidth: 1480, width: '100%', margin: '0 auto' }}>
      {/* ── Page Header ── */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#15803d', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
            <span className="status-beacon-live" style={{ marginRight: 2 }} />
            <span>TYPE 3 DISCLOSURE FORM (SPEC §23, §46)</span>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
            Business Unit ESG Disclosures
          </h1>
          <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: 14 }}>
            Enter ESG information that genuinely belongs to the Business Unit level (targets, overarching initiatives, governance).
          </p>
        </div>

        {/* Selectors */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <PageHelpButton title="Reporting Guide" route="/reporting" />
          <select
            value={selectedBU}
            onChange={e => setSelectedBU(e.target.value)}
            style={{
              padding: '9px 14px', borderRadius: 8, background: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)', color: 'var(--text-primary)', fontSize: 13, fontWeight: 600
            }}
          >
            {buNodes.map(n => (
              <option key={n.id} value={n.id}>{n.name}</option>
            ))}
          </select>

          <select
            value={selectedPeriod}
            onChange={e => setSelectedPeriod(e.target.value)}
            style={{
              padding: '9px 14px', borderRadius: 8, background: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)', color: 'var(--text-primary)', fontSize: 13, fontWeight: 600
            }}
          >
            {periods.map(p => (
              <option key={p.id} value={p.id}>{p.code}</option>
            ))}
          </select>

          {/* Status Badge */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
            borderRadius: 99, fontSize: 12, fontWeight: 700,
            background: disclosureStatus === 'APPROVED' ? '#dcfce7' : disclosureStatus === 'SUBMITTED' ? '#e0f2fe' : '#f1f5f9',
            color: disclosureStatus === 'APPROVED' ? '#15803d' : disclosureStatus === 'SUBMITTED' ? '#0369a1' : '#64748b',
            border: '1px solid currentColor'
          }}>
            {disclosureStatus === 'APPROVED' ? <CheckCircle2 size={13} /> : disclosureStatus === 'SUBMITTED' ? <Clock size={13} /> : <FileCheck size={13} />}
            <span>Status: {disclosureStatus}</span>
          </div>
        </div>
      </div>

      {/* ── Notice Banner ── */}
      {notice && (
        <div style={{
          padding: '12px 18px', borderRadius: 10, marginBottom: 20,
          background: notice.type === 'success' ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${notice.type === 'success' ? '#86efac' : '#fca5a5'}`,
          color: notice.type === 'success' ? '#166534' : '#991b1b',
          fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8
        }}>
          {notice.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          {typeof notice.message === 'object' ? JSON.stringify(notice.message) : (notice.message || notice.text || notice.msg)}
        </div>
      )}

      {/* ── Architectural Guidance Banner (Spec Distinction) ── */}
      <div style={{
        padding: '14px 20px', borderRadius: 12, marginBottom: 24,
        background: 'linear-gradient(135deg, rgba(99,102,241,0.06), rgba(56,189,248,0.06))',
        border: '1px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Sparkles size={20} color="var(--brand-500)" />
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--text-primary)' }}>Operational Data vs. BU Disclosures:</strong> Operational numbers (fuel, power, water) are entered at project level and roll up automatically. This form captures <em>strategic BU-level commitments</em>.
          </div>
        </div>
        <a
          href="/consolidation"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12,
            color: 'var(--brand-500)', fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap', marginLeft: 16
          }}
        >
          View Aggregated Data <ArrowRight size={13} />
        </a>
      </div>

      {/* ── Navigation Tabs ── */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border-default)', marginBottom: 24 }}>
        {SECTIONS.map(s => {
          const Icon = s.icon;
          const isActive = activeTab === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setActiveTab(s.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '12px 18px',
                border: 'none', background: 'none', cursor: 'pointer',
                fontSize: 14, fontWeight: isActive ? 700 : 500,
                color: isActive ? 'var(--brand-500)' : 'var(--text-secondary)',
                borderBottom: isActive ? '2px solid var(--brand-500)' : '2px solid transparent',
                marginBottom: -1, transition: 'all 0.15s ease'
              }}
            >
              <Icon size={16} />
              {s.label}
            </button>
          );
        })}
      </div>

      {/* ── Tab Content ── */}
      <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 14, padding: '24px 28px' }}>
        {loading ? (
          <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <RefreshCw size={24} className="spin" style={{ margin: '0 auto 12px' }} />
            <div>Loading {SECTIONS.find(s => s.id === activeTab)?.label}…</div>
          </div>
        ) : (
          <>
            {/* ── Tab 1: BU Targets ── */}
            {activeTab === 'bu_targets' && (
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 6px', color: 'var(--text-primary)' }}>
                  BU-Level Multi-Year ESG Targets
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 20px' }}>
                  Target commitments entered here will be compared against aggregated project actuals in the BRSR Section C performance review.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                      Energy Reduction Target (%)
                    </label>
                    <input
                      type="number"
                      disabled={isLocked}
                      placeholder="e.g. 15"
                      value={formData.bu_targets.energy_reduction_pct || ''}
                      onChange={e => handleTargetChange('energy_reduction_pct', e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--bg-base)', color: 'var(--text-primary)' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                      Renewable Energy Share Target (%)
                    </label>
                    <input
                      type="number"
                      disabled={isLocked}
                      placeholder="e.g. 40"
                      value={formData.bu_targets.renewable_energy_target_pct || ''}
                      onChange={e => handleTargetChange('renewable_energy_target_pct', e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--bg-base)', color: 'var(--text-primary)' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                      Water Recycling / Zero Liquid Discharge (%)
                    </label>
                    <input
                      type="number"
                      disabled={isLocked}
                      placeholder="e.g. 85"
                      value={formData.bu_targets.water_recycle_pct || ''}
                      onChange={e => handleTargetChange('water_recycle_pct', e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--bg-base)', color: 'var(--text-primary)' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                      GHG Reduction Target (%)
                    </label>
                    <input
                      type="number"
                      disabled={isLocked}
                      placeholder="e.g. 25"
                      value={formData.bu_targets.ghg_reduction_pct || ''}
                      onChange={e => handleTargetChange('ghg_reduction_pct', e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--bg-base)', color: 'var(--text-primary)' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                      Baseline Period
                    </label>
                    <input
                      type="text"
                      disabled={isLocked}
                      value={formData.bu_targets.energy_baseline_year || ''}
                      onChange={e => handleTargetChange('energy_baseline_year', e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--bg-base)', color: 'var(--text-primary)' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                      Target Horizon / Year
                    </label>
                    <input
                      type="text"
                      disabled={isLocked}
                      value={formData.bu_targets.energy_target_year || ''}
                      onChange={e => handleTargetChange('energy_target_year', e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--bg-base)', color: 'var(--text-primary)' }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ── Tab 2: BU Initiatives ── */}
            {activeTab === 'bu_initiatives' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px', color: 'var(--text-primary)' }}>
                      Major ESG Capital & Operational Initiatives
                    </h3>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
                      Initiatives entered here flow into BRSR Principle 6 (Environment) & Principle 2 (Product Lifecycle).
                    </p>
                  </div>
                  {!isLocked && (
                    <button
                      onClick={handleAddInitiative}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
                        borderRadius: 8, background: 'var(--brand-500)', color: '#fff',
                        border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700
                      }}
                    >
                      <Plus size={15} /> Add Initiative
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {(Array.isArray(formData.bu_initiatives) ? formData.bu_initiatives : []).map((item, idx) => (
                    <div
                      key={item.id || idx}
                      style={{
                        padding: '16px 20px', borderRadius: 10,
                        border: '1px solid var(--border-default)', background: 'var(--bg-base)',
                        display: 'flex', flexDirection: 'column', gap: 12
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                        <div style={{ flex: 1 }}>
                          <input
                            type="text"
                            disabled={isLocked}
                            placeholder="Initiative Title (e.g. Electric Vehicle Fleet Transition)"
                            value={item.name || ''}
                            onChange={e => handleInitiativeChange(idx, 'name', e.target.value)}
                            style={{
                              width: '100%', padding: '8px 12px', fontSize: 14, fontWeight: 700,
                              borderRadius: 6, border: '1px solid var(--border-default)',
                              background: 'var(--bg-elevated)', color: 'var(--text-primary)'
                            }}
                          />
                        </div>
                        {!isLocked && (
                          <button
                            onClick={() => handleRemoveInitiative(idx)}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 6 }}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                        <div>
                          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Category</label>
                          <select
                            disabled={isLocked}
                            value={item.category || 'Renewable Energy'}
                            onChange={e => handleInitiativeChange(idx, 'category', e.target.value)}
                            style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid var(--border-default)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: 12 }}
                          >
                            <option value="Renewable Energy">Renewable Energy</option>
                            <option value="Energy Efficiency">Energy Efficiency</option>
                            <option value="Water Conservation">Water Conservation</option>
                            <option value="Circular Economy & Waste">Circular Economy & Waste</option>
                            <option value="Worker Safety & Health">Worker Safety & Health</option>
                          </select>
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Capex (₹ Lakhs)</label>
                          <input
                            type="number"
                            disabled={isLocked}
                            placeholder="0.00"
                            value={item.capex_inr_lakhs || ''}
                            onChange={e => handleInitiativeChange(idx, 'capex_inr_lakhs', e.target.value)}
                            style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid var(--border-default)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: 12 }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Est. CO₂ Reduction (tCO₂e)</label>
                          <input
                            type="number"
                            disabled={isLocked}
                            placeholder="0.00"
                            value={item.expected_co2_reduction_tco2e || ''}
                            onChange={e => handleInitiativeChange(idx, 'expected_co2_reduction_tco2e', e.target.value)}
                            style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid var(--border-default)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: 12 }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Status</label>
                          <select
                            disabled={isLocked}
                            value={item.status || 'Planned'}
                            onChange={e => handleInitiativeChange(idx, 'status', e.target.value)}
                            style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid var(--border-default)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: 12 }}
                          >
                            <option value="Planned">Planned</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Completed">Completed</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Tab 3: BU Governance ── */}
            {activeTab === 'bu_governance' && (
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 6px', color: 'var(--text-primary)' }}>
                  Business Unit Sustainability Governance
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 20px' }}>
                  Specifies accountability lines and periodic audit compliance for this Business Unit.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                      BU ESG Officer / Responsible Executive
                    </label>
                    <input
                      type="text"
                      disabled={isLocked}
                      placeholder="e.g. Ramesh Kumar, VP Operations"
                      value={formData.bu_governance.bu_esg_lead_name || ''}
                      onChange={e => handleGovernanceChange('bu_esg_lead_name', e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--bg-base)', color: 'var(--text-primary)' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                      Executive Designation
                    </label>
                    <input
                      type="text"
                      disabled={isLocked}
                      value={formData.bu_governance.lead_designation || ''}
                      onChange={e => handleGovernanceChange('lead_designation', e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--bg-base)', color: 'var(--text-primary)' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                      Review Frequency
                    </label>
                    <select
                      disabled={isLocked}
                      value={formData.bu_governance.committee_meeting_frequency || 'Monthly'}
                      onChange={e => handleGovernanceChange('committee_meeting_frequency', e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--bg-base)', color: 'var(--text-primary)' }}
                    >
                      <option value="Bi-Weekly">Bi-Weekly</option>
                      <option value="Monthly">Monthly</option>
                      <option value="Quarterly">Quarterly</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                      Management System Certification
                    </label>
                    <input
                      type="text"
                      disabled={isLocked}
                      value={formData.bu_governance.risk_mitigation_framework || ''}
                      onChange={e => handleGovernanceChange('risk_mitigation_framework', e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--bg-base)', color: 'var(--text-primary)' }}
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'bu_p6' && (() => {
              const p6 = formData.bu_p6 || {};
              const updateP6 = (patch) => setFormData(p => ({ ...p, bu_p6: { ...(p.bu_p6 || {}), ...patch } }));
              const selectedWsIds = Array.isArray(p6.water_stressed_project_ids) ? p6.water_stressed_project_ids : [];
              const toggleWsProject = (proj) => {
                const nextIds = selectedWsIds.includes(proj.id)
                  ? selectedWsIds.filter(id => id !== proj.id)
                  : [...selectedWsIds, proj.id];
                const names = buProjects.filter(pr => nextIds.includes(pr.id)).map(pr => pr.name).join(', ');
                updateP6({ water_stressed_project_ids: nextIds, water_stressed_projects: names });
              };
              const ecoRows = Array.isArray(p6.eco_sensitive_rows) ? p6.eco_sensitive_rows : [];
              const eiaRows = Array.isArray(p6.eia_rows) ? p6.eia_rows : [];
              const effRows = Array.isArray(p6.efficiency_initiatives) ? p6.efficiency_initiatives : [];

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
                  <div>
                    <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                      Principle 6 — Business Unit Disclosures (LI-1, EI-11 &amp; LI-3, EI-12, EI-8 &amp; LI-4, LI-2)
                    </h2>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
                      BU-wide site classifications, EIA/eco-sensitive compliance, resource-efficiency initiatives, and BU Scope 3 (Travel &amp; Commuting).
                    </p>
                  </div>

                  {/* 1. LI-1 Water-Stressed Sites */}
                  <div style={{ padding: 14, borderRadius: 10, border: '1px solid var(--border-default)', background: 'var(--bg-base)' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>
                      LI-1: Water-Stressed Sites (Multi-select BU Projects + Assessment Tool)
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                          Select BU Projects in Water-Stressed Areas
                        </label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: 10, borderRadius: 8, border: '1px solid var(--border-default)', background: '#fff', maxHeight: 130, overflowY: 'auto' }}>
                          {buProjects.length === 0 ? (
                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>No projects under this BU yet.</span>
                          ) : buProjects.map(proj => {
                            const checked = selectedWsIds.includes(proj.id);
                            return (
                              <label key={proj.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '4px 10px', borderRadius: 99, border: `1px solid ${checked ? '#2563eb' : '#cbd5e1'}`, background: checked ? '#eff6ff' : '#f8fafc', cursor: 'pointer', fontWeight: 600 }}>
                                <input type="checkbox" disabled={isLocked} checked={checked} onChange={() => toggleWsProject(proj)} />
                                {proj.name}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                          Assessment Tool / Source
                        </label>
                        <select
                          disabled={isLocked}
                          value={p6.water_stress_tool || 'WRI Aqueduct'}
                          onChange={e => updateP6({ water_stress_tool: e.target.value })}
                          style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border-default)', background: '#fff' }}
                        >
                          <option value="WRI Aqueduct">WRI Aqueduct</option>
                          <option value="CGWB Assessment">CGWB (Central Ground Water Board)</option>
                          <option value="WWF Water Risk Filter">WWF Water Risk Filter</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* 2. EI-11 & LI-3 Ecologically Sensitive Areas & Biodiversity */}
                  <div style={{ padding: 14, borderRadius: 10, border: '1px solid var(--border-default)', background: 'var(--bg-base)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                        EI-11 &amp; LI-3: Ecologically Sensitive Areas &amp; Biodiversity
                      </div>
                      {!isLocked && (
                        <button type="button" onClick={() => updateP6({ eco_sensitive_rows: [...ecoRows, { project_name: '', operations_type: 'EPC project', compliant: 'Yes', corrective_action: '', biodiversity_action: '' }] })}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', fontSize: 11.5, fontWeight: 700, borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}>
                          <Plus size={13} /> Add Site
                        </button>
                      )}
                    </div>
                    {ecoRows.map((row, idx) => (
                      <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 0.8fr 1.2fr 1.5fr auto', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                        <select disabled={isLocked} value={row.project_name || ''} onChange={e => {
                          const next = ecoRows.map((r, i) => i === idx ? { ...r, project_name: e.target.value } : r);
                          updateP6({ eco_sensitive_rows: next, eco_sensitive_operations: next.map(r => `${r.project_name} (${r.operations_type})`).join('; ') });
                        }} style={{ padding: '7px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}>
                          <option value="">Select Project/Location...</option>
                          {buProjects.map(pr => <option key={pr.id} value={pr.name}>{pr.name}</option>)}
                        </select>
                        <input disabled={isLocked} value={row.operations_type || ''} placeholder="Type of operations" onChange={e => {
                          const next = ecoRows.map((r, i) => i === idx ? { ...r, operations_type: e.target.value } : r);
                          updateP6({ eco_sensitive_rows: next });
                        }} style={{ padding: '7px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }} />
                        <select disabled={isLocked} value={row.compliant || 'Yes'} onChange={e => {
                          const next = ecoRows.map((r, i) => i === idx ? { ...r, compliant: e.target.value } : r);
                          updateP6({ eco_sensitive_rows: next, eco_clearance_compliant: next.some(r => r.compliant === 'No') ? 'No' : 'Yes' });
                        }} style={{ padding: '7px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}>
                          <option value="Yes">Compliant: Yes</option>
                          <option value="No">Compliant: No</option>
                        </select>
                        <input disabled={isLocked || row.compliant !== 'No'} value={row.corrective_action || ''} placeholder="Corrective action (if No)" onChange={e => {
                          const next = ecoRows.map((r, i) => i === idx ? { ...r, corrective_action: e.target.value } : r);
                          updateP6({ eco_sensitive_rows: next });
                        }} style={{ padding: '7px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }} />
                        <input disabled={isLocked} value={row.biodiversity_action || ''} placeholder="LI-3 Biodiversity remediation" onChange={e => {
                          const next = ecoRows.map((r, i) => i === idx ? { ...r, biodiversity_action: e.target.value } : r);
                          updateP6({ eco_sensitive_rows: next, biodiversity_remediation: next.map(r => r.biodiversity_action).filter(Boolean).join('; ') });
                        }} style={{ padding: '7px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }} />
                        {!isLocked && (
                          <button type="button" onClick={() => updateP6({ eco_sensitive_rows: ecoRows.filter((_, i) => i !== idx) })} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* 3. EI-12 Environmental Impact Assessments (EIA) */}
                  <div style={{ padding: 14, borderRadius: 10, border: '1px solid var(--border-default)', background: 'var(--bg-base)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                        EI-12: Environmental Impact Assessments (EIA)
                      </div>
                      {!isLocked && (
                        <button type="button" onClick={() => updateP6({ eia_rows: [...eiaRows, { project_name: '', notification_no_date: '', independent_agency: 'Yes', public_domain: 'Yes', web_link: '' }] })}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', fontSize: 11.5, fontWeight: 700, borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}>
                          <Plus size={13} /> Add EIA
                        </button>
                      )}
                    </div>
                    {eiaRows.map((row, idx) => (
                      <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 0.8fr 0.8fr 1.3fr auto', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                        <select disabled={isLocked} value={row.project_name || ''} onChange={e => {
                          const next = eiaRows.map((r, i) => i === idx ? { ...r, project_name: e.target.value } : r);
                          updateP6({ eia_rows: next, eia_projects_summary: next.map(r => `${r.project_name}: ${r.notification_no_date}`).join('; ') });
                        }} style={{ padding: '7px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}>
                          <option value="">Select Project/Location...</option>
                          {buProjects.map(pr => <option key={pr.id} value={pr.name}>{pr.name}</option>)}
                        </select>
                        <input disabled={isLocked} value={row.notification_no_date || ''} placeholder="EIA Notification No. & Date" onChange={e => {
                          const next = eiaRows.map((r, i) => i === idx ? { ...r, notification_no_date: e.target.value } : r);
                          updateP6({ eia_rows: next, eia_projects_summary: next.map(r => `${r.project_name}: ${r.notification_no_date}`).join('; ') });
                        }} style={{ padding: '7px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }} />
                        <select disabled={isLocked} value={row.independent_agency || 'Yes'} onChange={e => updateP6({ eia_rows: eiaRows.map((r, i) => i === idx ? { ...r, independent_agency: e.target.value } : r) })}
                          style={{ padding: '7px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}>
                          <option value="Yes">Indep. Agency: Yes</option>
                          <option value="No">Indep. Agency: No</option>
                        </select>
                        <select disabled={isLocked} value={row.public_domain || 'Yes'} onChange={e => updateP6({ eia_rows: eiaRows.map((r, i) => i === idx ? { ...r, public_domain: e.target.value } : r) })}
                          style={{ padding: '7px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}>
                          <option value="Yes">Public: Yes</option>
                          <option value="No">Public: No</option>
                        </select>
                        <input disabled={isLocked} value={row.web_link || ''} placeholder="Public Web Link" onChange={e => updateP6({ eia_rows: eiaRows.map((r, i) => i === idx ? { ...r, web_link: e.target.value } : r) })}
                          style={{ padding: '7px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }} />
                        {!isLocked && (
                          <button type="button" onClick={() => updateP6({ eia_rows: eiaRows.filter((_, i) => i !== idx) })} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* 4. EI-8 & LI-4 GHG & Resource Efficiency Initiatives */}
                  <div style={{ padding: 14, borderRadius: 10, border: '1px solid var(--border-default)', background: 'var(--bg-base)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                        EI-8 &amp; LI-4: GHG &amp; Resource Efficiency Initiatives
                      </div>
                      {!isLocked && (
                        <button type="button" onClick={() => updateP6({ efficiency_initiatives: [...effRows, { title: '', category: 'Energy', description: '', outcome: '' }] })}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', fontSize: 11.5, fontWeight: 700, borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}>
                          <Plus size={13} /> Add Initiative
                        </button>
                      )}
                    </div>
                    {effRows.map((row, idx) => (
                      <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.9fr 1.6fr 1.3fr auto', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                        <input disabled={isLocked} value={row.title || ''} placeholder="Initiative title" onChange={e => {
                          const next = effRows.map((r, i) => i === idx ? { ...r, title: e.target.value } : r);
                          updateP6({ efficiency_initiatives: next, ghg_reduction_projects: next.map(r => `${r.title} (${r.outcome})`).join('; ') });
                        }} style={{ padding: '7px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }} />
                        <select disabled={isLocked} value={row.category || 'Energy'} onChange={e => updateP6({ efficiency_initiatives: effRows.map((r, i) => i === idx ? { ...r, category: e.target.value } : r) })}
                          style={{ padding: '7px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}>
                          <option value="Energy">Energy</option>
                          <option value="GHG">GHG</option>
                          <option value="Water">Water</option>
                          <option value="Waste">Waste</option>
                          <option value="Effluent">Effluent</option>
                        </select>
                        <input disabled={isLocked} value={row.description || ''} placeholder="Description / technology used" onChange={e => updateP6({ efficiency_initiatives: effRows.map((r, i) => i === idx ? { ...r, description: e.target.value } : r) })}
                          style={{ padding: '7px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }} />
                        <input disabled={isLocked} value={row.outcome || ''} placeholder="Measurable outcome (GJ / tCO₂e / kL / MT)" onChange={e => {
                          const next = effRows.map((r, i) => i === idx ? { ...r, outcome: e.target.value } : r);
                          updateP6({ efficiency_initiatives: next, ghg_reduction_projects: next.map(r => `${r.title} (${r.outcome})`).join('; ') });
                        }} style={{ padding: '7px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }} />
                        {!isLocked && (
                          <button type="button" onClick={() => updateP6({ efficiency_initiatives: effRows.filter((_, i) => i !== idx) })} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* 5. LI-2 BU-Level Scope 3 */}
                  <div style={{ padding: 14, borderRadius: 10, border: '1px solid var(--border-default)', background: 'var(--bg-base)' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>
                      LI-2: BU-Level Scope 3 (Business Travel ENV-GHG-003A &amp; Employee Commuting ENV-GHG-003B)
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Business Travel Mode</label>
                        <select disabled={isLocked} value={p6.business_travel_mode || 'Air passenger-km'} onChange={e => updateP6({ business_travel_mode: e.target.value })}
                          style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border-default)', background: '#fff' }}>
                          <option value="Air passenger-km">Air passenger-km</option>
                          <option value="Rail km">Rail km</option>
                          <option value="Road km">Road km</option>
                          <option value="Travel Spend (₹)">Travel Spend (₹)</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Activity Quantity / Spend</label>
                        <input type="number" disabled={isLocked} value={p6.business_travel_qty || ''} onChange={e => updateP6({ business_travel_qty: e.target.value })}
                          style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border-default)', background: '#fff' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>ENV-GHG-003A Travel (tCO₂e)</label>
                        <input type="number" step="0.01" disabled={isLocked} value={p6.scope3_business_travel_tco2e || ''} onChange={e => updateP6({ scope3_business_travel_tco2e: e.target.value })}
                          style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border-default)', background: '#fff' }} />
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: 10 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Commute Headcount</label>
                        <input type="number" disabled={isLocked} value={p6.commute_headcount || ''} onChange={e => updateP6({ commute_headcount: e.target.value })}
                          style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border-default)', background: '#fff' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Commute Mode</label>
                        <select disabled={isLocked} value={p6.commute_mode || 'Two-wheeler'} onChange={e => updateP6({ commute_mode: e.target.value })}
                          style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border-default)', background: '#fff' }}>
                          <option value="Two-wheeler">Two-wheeler</option>
                          <option value="Car">Car</option>
                          <option value="Bus / Metro">Bus / Metro</option>
                          <option value="EV / Public">EV / Public</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Avg Distance (km/day)</label>
                        <input type="number" disabled={isLocked} value={p6.commute_avg_km || ''} onChange={e => updateP6({ commute_avg_km: e.target.value })}
                          style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border-default)', background: '#fff' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Working Days</label>
                        <input type="number" disabled={isLocked} value={p6.commute_working_days || '250'} onChange={e => updateP6({ commute_working_days: e.target.value })}
                          style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border-default)', background: '#fff' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>ENV-GHG-003B (tCO₂e)</label>
                        <input type="number" step="0.01" disabled={isLocked} value={p6.scope3_employee_commute_tco2e || ''} onChange={e => updateP6({ scope3_employee_commute_tco2e: e.target.value })}
                          style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border-default)', background: '#fff' }} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* ── Action Buttons ── */}
            {!isLocked && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--border-default)' }}>
                <button
                  onClick={handleSaveDraft}
                  disabled={saving}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7, padding: '10px 20px',
                    borderRadius: 8, border: '1px solid var(--border-default)',
                    background: 'var(--bg-elevated)', color: 'var(--text-primary)',
                    fontSize: 13, fontWeight: 700, cursor: 'pointer'
                  }}
                >
                  <Save size={15} />
                  {saving ? 'Saving…' : 'Save Section Draft'}
                </button>

                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7, padding: '10px 22px',
                    borderRadius: 8, border: 'none', background: 'var(--brand-500)',
                    color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(99,102,241,0.3)'
                  }}
                >
                  <Send size={15} />
                  {submitting ? 'Submitting…' : 'Submit BU Disclosures'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
