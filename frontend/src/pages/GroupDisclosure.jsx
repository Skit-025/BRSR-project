import React, { useState, useEffect, useMemo } from 'react';
import {
  Globe2, ShieldCheck, CheckCircle2, Clock, AlertTriangle,
  RefreshCw, Save, Send, Building2, FileCheck, Award, Lock, ExternalLink
} from 'lucide-react';
import { useOrgNodes, useOrgPeriods } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { disclosuresApi } from '../api/client';
import PageHelpButton from '../components/PageHelpButton';

const GROUP_TABS = [
  { id: 'group_general', label: 'Enterprise Boundary', icon: Globe2, desc: 'Group structure, subsidiaries in scope, consolidation approach' },
  { id: 'group_policies', label: 'Group Commitments', icon: Award, desc: 'Enterprise Net-Zero targets, RE100, and group ESG policies' },
  { id: 'group_p6', label: 'Principle 6: Group Params', icon: FileCheck, desc: 'Principle 6 external assurance and LI-8 Green Credits' },
  { id: 'group_governance', label: 'Board Governance', icon: ShieldCheck, desc: 'Board committee oversight, CSR charter, and assurance provider' },
];
const getInitialFormData = (groupNode) => ({
  group_general: {
    group_legal_name: groupNode?.name || '',
    consolidation_approach: '',
    subsidiaries_count_in_scope: '',
    joint_ventures_count: '',
    total_group_revenue_cr: '',
    statutory_financial_year: '',
  },
  group_policies: {
    enterprise_net_zero_year: '',
    renewable_target_2030_pct: '',
    water_neutral_target_year: '',
    supplier_code_of_conduct_enforced: false,
    human_rights_due_diligence_published: false,
    executive_compensation_linked_to_esg: false,
    whistleblower_ombudsperson_active: false
  },
  group_p6: {
    imf_ppp_rate: '20.66',
    prev_imf_ppp_rate: '22.40',
    p6_assurance_status: 'Reasonable Assurance',
    p6_assurance_agency: '',
    p6_assurance_report_ref: '',
    indicator_assurance: {
      'EI-1': { status: 'Reasonable Assurance', agency: '', report_ref: '' },
      'EI-3': { status: 'Reasonable Assurance', agency: '', report_ref: '' },
      'EI-4': { status: 'Reasonable Assurance', agency: '', report_ref: '' },
      'EI-6': { status: 'Limited Assurance', agency: '', report_ref: '' },
      'EI-7': { status: 'Reasonable Assurance', agency: '', report_ref: '' },
      'EI-9': { status: 'Reasonable Assurance', agency: '', report_ref: '' },
      'LI-2': { status: 'Not Assured', agency: '', report_ref: '' },
    },
    green_credits_entity: '',
    green_credits_value_chain: '',
  },
  group_governance: {
    board_committee_title: '',
    committee_chair_name: '',
    independent_directors_on_committee_pct: '',
    assurance_standard: '',
    assurance_provider: '',
    assurance_scope: '',
    assurance_opinion_type: ''
  }
});

export default function GroupDisclosure() {
  const { user, isSystemAdmin, isGroupAdmin, isGroupEsgManager } = useAuth();
  const { data: orgNodes = [] } = useOrgNodes();
  const { data: periods = [] } = useOrgPeriods();

  // Find group node
  const groupNode = useMemo(() => {
    return orgNodes.find(n => n.type === 'group') || orgNodes[0];
  }, [orgNodes]);

  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [activeTab, setActiveTab] = useState('group_general');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState(null);

  const [disclosureStatus, setDisclosureStatus] = useState('DRAFT');
  const [disclosureId, setDisclosureId] = useState(null);

  const [formData, setFormData] = useState(() => getInitialFormData(null));

  useEffect(() => {
    if (periods.length > 0 && !selectedPeriod) {
      setSelectedPeriod(periods[0].id);
    }
  }, [periods, selectedPeriod]);

  useEffect(() => {
    if (!groupNode?.id || !selectedPeriod) return;
    let isMounted = true;
    setLoading(true);

    const baseData = getInitialFormData(groupNode);

    disclosuresApi.getSection('group', groupNode.id, selectedPeriod, activeTab)
      .then(res => {
        if (!isMounted) return;
        if (res.data) {
          setDisclosureId(res.data.id);
          setDisclosureStatus(res.data.status || 'DRAFT');
          if (res.data.payload && Object.keys(res.data.payload).length > 0) {
            setFormData(prev => ({
              ...prev,
              [activeTab]: { ...baseData[activeTab], ...res.data.payload }
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
  }, [groupNode, selectedPeriod, activeTab]);

  const handleFieldChange = (sectionKey, field, val) => {
    setFormData(prev => ({
      ...prev,
      [sectionKey]: { ...prev[sectionKey], [field]: val }
    }));
  };

  const handleSaveDraft = async () => {
    if (!groupNode?.id || !selectedPeriod) return;
    setSaving(true);
    try {
      const res = await disclosuresApi.save({
        org_node_id: groupNode.id,
        period_id: selectedPeriod,
        disclosure_level: 'group',
        disclosure_section: activeTab,
        payload: formData[activeTab],
        payload_version: 'v1'
      });
      if (res.data?.id) setDisclosureId(res.data.id);
      setNotice({ type: 'success', message: 'Group Disclosures draft saved.' });
    } catch (e) {
      setNotice({ type: 'error', message: e?.response?.data?.detail || 'Failed to save.' });
    } finally {
      setSaving(false);
      setTimeout(() => setNotice(null), 3500);
    }
  };

  const handleApprove = async () => {
    if (!disclosureId) await handleSaveDraft();
    setSubmitting(true);
    try {
      if (disclosureId) {
        await disclosuresApi.approve(disclosureId);
      }
      setDisclosureStatus('APPROVED');
      setNotice({ type: 'success', message: 'Group Disclosures officially approved and sealed for Report Compilation!' });
    } catch (e) {
      setNotice({ type: 'error', message: e?.response?.data?.detail || 'Approval failed.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-content anim-fade-up" style={{ padding: '28px 36px', maxWidth: 1480, width: '100%', margin: '0 auto' }}>
      {/* ── Page Header ── */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#15803d', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
            <span className="status-beacon-live" style={{ marginRight: 2 }} />
            <span>TYPE 3 DISCLOSURE FORM (SPEC §34-36)</span>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
            Enterprise Group Disclosures & Commitments
          </h1>
          <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: 14 }}>
            Define group-wide reporting boundaries, corporate Net-Zero commitments, and statutory board assurance.
          </p>
        </div>

        {/* Selectors */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <PageHelpButton title="Reporting Guide" route="/reporting" />
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

          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
            borderRadius: 99, fontSize: 12, fontWeight: 700,
            background: disclosureStatus === 'APPROVED' ? '#dcfce7' : '#f1f5f9',
            color: disclosureStatus === 'APPROVED' ? '#15803d' : '#64748b',
            border: '1px solid currentColor'
          }}>
            {disclosureStatus === 'APPROVED' ? <CheckCircle2 size={13} /> : <FileCheck size={13} />}
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

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border-default)', marginBottom: 24 }}>
        {GROUP_TABS.map(t => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
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
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ── Content Card ── */}
      <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 14, padding: '24px 28px' }}>
        {loading ? (
          <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <RefreshCw size={24} className="spin" style={{ margin: '0 auto 12px' }} />
            <div>Loading Group Disclosures…</div>
          </div>
        ) : (
          <>
            {activeTab === 'group_general' && (
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 6px', color: 'var(--text-primary)' }}>
                  Enterprise Boundary & Reporting Scope
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 20px' }}>
                  Define which entities are included in the BRSR consolidated boundary.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                      Group Legal Entity Name
                    </label>
                    <input
                      type="text"
                      value={formData.group_general.group_legal_name || ''}
                      onChange={e => handleFieldChange('group_general', 'group_legal_name', e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--bg-base)', color: 'var(--text-primary)' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                      Consolidation Approach
                    </label>
                    <select
                      value={formData.group_general.consolidation_approach || ''}
                      onChange={e => handleFieldChange('group_general', 'consolidation_approach', e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--bg-base)', color: 'var(--text-primary)' }}
                    >
                      <option value="Operational Control (100% boundary for fully managed entities)">Operational Control</option>
                      <option value="Financial Control (Standard accounting consolidation)">Financial Control</option>
                      <option value="Equity Share (Pro-rata share of emissions)">Equity Share</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                      Subsidiaries in Scope (Count)
                    </label>
                    <input
                      type="number"
                      value={formData.group_general.subsidiaries_count_in_scope || ''}
                      onChange={e => handleFieldChange('group_general', 'subsidiaries_count_in_scope', e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--bg-base)', color: 'var(--text-primary)' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                      Reporting Boundary Standard
                    </label>
                    <input
                      type="text"
                      value={formData.group_general.consolidation_approach || ''}
                      onChange={e => handleFieldChange('group_general', 'consolidation_approach', e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--bg-base)', color: 'var(--text-primary)' }}
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'group_policies' && (
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 6px', color: 'var(--text-primary)' }}>
                  Enterprise ESG Commitments & Multi-Year Pledges
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 20px' }}>
                  Group-level commitments published to investors and statutory regulators.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                      Net-Zero Target Commitment Year
                    </label>
                    <input
                      type="text"
                      value={formData.group_policies.enterprise_net_zero_year || ''}
                      onChange={e => handleFieldChange('group_policies', 'enterprise_net_zero_year', e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--bg-base)', color: 'var(--text-primary)' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                      2030 Renewable Power Target (%)
                    </label>
                    <input
                      type="number"
                      value={formData.group_policies.renewable_target_2030_pct || ''}
                      onChange={e => handleFieldChange('group_policies', 'renewable_target_2030_pct', e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--bg-base)', color: 'var(--text-primary)' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                      Water Neutrality Commitment Year
                    </label>
                    <input
                      type="text"
                      value={formData.group_policies.water_neutral_target_year || ''}
                      onChange={e => handleFieldChange('group_policies', 'water_neutral_target_year', e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--bg-base)', color: 'var(--text-primary)' }}
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'group_governance' && (
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 6px', color: 'var(--text-primary)' }}>
                  Statutory Board Governance & Assurance
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 20px' }}>
                  Auditor workpaper references and board sustainability committee configuration.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                      Board Committee Responsible
                    </label>
                    <input
                      type="text"
                      value={formData.group_governance.board_committee_title || ''}
                      onChange={e => handleFieldChange('group_governance', 'board_committee_title', e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--bg-base)', color: 'var(--text-primary)' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                      Assurance Standard
                    </label>
                    <input
                      type="text"
                      value={formData.group_governance.assurance_standard || ''}
                      onChange={e => handleFieldChange('group_governance', 'assurance_standard', e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--bg-base)', color: 'var(--text-primary)' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                      Assurance Scope
                    </label>
                    <input
                      type="text"
                      value={formData.group_governance.assurance_scope || ''}
                      onChange={e => handleFieldChange('group_governance', 'assurance_scope', e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--bg-base)', color: 'var(--text-primary)' }}
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'group_p6' && (() => {
              const p6 = formData.group_p6 || {};
              const indAssurance = p6.indicator_assurance || {};
              const P6_ASSURED_INDICATORS = [
                { key: 'EI-1', label: 'EI-1: Energy Consumption' },
                { key: 'EI-3', label: 'EI-3: Water Withdrawal & Consumption' },
                { key: 'EI-4', label: 'EI-4: Water Discharge by Destination' },
                { key: 'EI-6', label: 'EI-6: Air Emissions (NOx, SOx, PM)' },
                { key: 'EI-7', label: 'EI-7: GHG Emissions (Scope 1 & 2)' },
                { key: 'EI-9', label: 'EI-9: Waste Generated, Recovered & Disposed' },
                { key: 'LI-2', label: 'LI-2: Scope 3 Emissions' },
              ];
              const updateIndAssurance = (indKey, field, val) => {
                const next = {
                  ...indAssurance,
                  [indKey]: { ...(indAssurance[indKey] || { status: 'Not Assured', agency: '', report_ref: '' }), [field]: val },
                };
                handleFieldChange('group_p6', 'indicator_assurance', next);
              };

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div>
                    <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                      Principle 6 — Per-Indicator Assurance &amp; Green Credits (EI-1/3/4/6/7/9, LI-2, LI-8)
                    </h2>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
                      Per-indicator external assurance metadata and LI-8 Green Credits.
                    </p>
                  </div>

                  {/* Green Credits */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                        Overall Principle 6 External Assurance Level
                      </label>
                      <select value={p6.p6_assurance_status || 'Reasonable Assurance'}
                        onChange={e => handleFieldChange('group_p6', 'p6_assurance_status', e.target.value)}
                        style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--bg-base)' }}>
                        <option value="Reasonable Assurance">Reasonable Assurance (BRSR Core)</option>
                        <option value="Limited Assurance">Limited Assurance</option>
                        <option value="Not Assured">Not Assured</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                        Default Assurance Agency &amp; Report Ref
                      </label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input type="text" value={p6.p6_assurance_agency || ''}
                          onChange={e => handleFieldChange('group_p6', 'p6_assurance_agency', e.target.value)}
                          placeholder="e.g. Deloitte / DNV / KPMG"
                          style={{ flex: 1, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--bg-base)' }} />
                        <input type="text" value={p6.p6_assurance_report_ref || ''}
                          onChange={e => handleFieldChange('group_p6', 'p6_assurance_report_ref', e.target.value)}
                          placeholder="Report Ref / UDIN"
                          style={{ flex: 1, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--bg-base)' }} />
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                        LI-8A: Green Credits Generated/Procured (Listed Entity)
                      </label>
                      <input type="number" value={p6.green_credits_entity || ''}
                        onChange={e => handleFieldChange('group_p6', 'green_credits_entity', e.target.value)}
                        style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--bg-base)' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                        LI-8B: Green Credits (Top 10 Value Chain Partners)
                      </label>
                      <input type="number" value={p6.green_credits_value_chain || ''}
                        onChange={e => handleFieldChange('group_p6', 'green_credits_value_chain', e.target.value)}
                        style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--bg-base)' }} />
                    </div>
                  </div>

                  {/* Per-Indicator External Assurance Details */}
                  <div style={{ padding: 14, borderRadius: 10, border: '1px solid var(--border-default)', background: 'var(--bg-base)' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>
                      Per-Indicator External Assurance Details (EI-1, EI-3, EI-4, EI-6, EI-7, EI-9, LI-2)
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {P6_ASSURED_INDICATORS.map(ind => {
                        const row = indAssurance[ind.key] || {};
                        return (
                          <div key={ind.key} style={{ display: 'grid', gridTemplateColumns: '1.6fr 1.1fr 1fr 1fr', gap: 8, alignItems: 'center' }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{ind.label}</span>
                            <select value={row.status || 'Reasonable Assurance'} onChange={e => updateIndAssurance(ind.key, 'status', e.target.value)}
                              style={{ padding: '7px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, background: '#fff' }}>
                              <option value="Reasonable Assurance">Reasonable</option>
                              <option value="Limited Assurance">Limited</option>
                              <option value="Not Assured">Not Assured</option>
                            </select>
                            <input type="text" value={row.agency || ''} placeholder={p6.p6_assurance_agency || 'Agency (DNV/KPMG/EY)'}
                              onChange={e => updateIndAssurance(ind.key, 'agency', e.target.value)}
                              style={{ padding: '7px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }} />
                            <input type="text" value={row.report_ref || ''} placeholder="Report Reference"
                              onChange={e => updateIndAssurance(ind.key, 'report_ref', e.target.value)}
                              style={{ padding: '7px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Action Bar */}
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
                {saving ? 'Saving…' : 'Save Draft'}
              </button>

              <button
                onClick={handleApprove}
                disabled={submitting}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7, padding: '10px 22px',
                  borderRadius: 8, border: 'none', background: 'var(--brand-500)',
                  color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(99,102,241,0.3)'
                }}
              >
                <CheckCircle2 size={15} />
                {submitting ? 'Approving…' : 'Approve & Seal Disclosures'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
