import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2, Target, Award, Shield, Save, Send, CheckCircle2,
  Clock, AlertTriangle, RefreshCw, Plus, Trash2, ArrowRight,
  Info, Sparkles, Layers, FileCheck
} from 'lucide-react';
import { useOrgNodes, useOrgPeriods } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { disclosuresApi } from '../api/client';

const SECTIONS = [
  { id: 'bu_targets', label: 'ESG Targets & Commitments', icon: Target, desc: 'Reduction targets set at the Business Unit level' },
  { id: 'bu_initiatives', label: 'Key ESG Initiatives', icon: Award, desc: 'Programs, investments, and energy transitions' },
  { id: 'bu_governance', label: 'BU Governance & Risk', icon: Shield, desc: 'Oversight structure and sustainability accountability' },
];

const getInitialFormData = (buNode) => {
  const code = buNode?.code || '';
  const isSeed = code === 'BU-TRANS' || code.startsWith('BU-A1-') || code === 'BU-HYDRO-01';

  if (isSeed) {
    return {
      bu_targets: {
        energy_reduction_pct: '',
        energy_baseline_year: 'FY 2023-24',
        energy_target_year: 'FY 2027-28',
        water_recycle_pct: '',
        ghg_reduction_pct: '',
        renewable_energy_target_pct: '',
        zero_waste_target_year: '',
        net_zero_commitment_year: '2045',
      },
      bu_initiatives: [
        {
          id: 1,
          name: 'Rooftop Solar & Microgrid Installation',
          category: 'Renewable Energy',
          capex_inr_lakhs: '125',
          expected_co2_reduction_tco2e: '340',
          status: 'In Progress',
          milestone: '70% commissioning complete'
        },
        {
          id: 2,
          name: 'Effluent Zero Liquid Discharge (ZLD) Retrofit',
          category: 'Water Conservation',
          capex_inr_lakhs: '80',
          expected_co2_reduction_tco2e: '45',
          status: 'Completed',
          milestone: 'Commissioned Q1'
        }
      ],
      bu_governance: {
        bu_esg_lead_name: '',
        lead_designation: 'Head of Operations / ESG',
        committee_meeting_frequency: 'Monthly',
        risk_mitigation_framework: 'ISO 14001 & ISO 45001 Integrated System',
        audit_mechanism: 'Quarterly Internal ESG Peer Review',
        escalation_protocol: 'Reported directly to Subsidiary ESG Committee'
      }
    };
  }

  return {
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
    bu_governance: {
      bu_esg_lead_name: '',
      lead_designation: '',
      committee_meeting_frequency: 'Quarterly',
      risk_mitigation_framework: '',
      audit_mechanism: '',
      escalation_protocol: ''
    }
  };
};

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
    <div className="page-content anim-fade-up" style={{ padding: '28px 36px', maxWidth: 1200, margin: '0 auto' }}>
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
                      GHG Intensity Reduction Target (%)
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
