import React, { useState, useEffect, useMemo } from 'react';
import {
  Building, BookOpen, Layers, ShieldCheck, Save, Send,
  CheckCircle2, Clock, AlertTriangle, RefreshCw, Plus, Trash2,
  ArrowRight, FileText, Globe, Users, HeartHandshake, Scale
} from 'lucide-react';
import { useOrgNodes, useOrgPeriods } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { disclosuresApi } from '../api/client';
import PageHelpButton from '../components/PageHelpButton';

const SUB_TABS = [
  { id: 'section_a_org', label: 'Section A: General Details', icon: Building, desc: 'Corporate identity, facilities, employee demographics & CSR' },
  { id: 'section_b_p1', label: 'Section B: Management (P1-P9)', icon: ShieldCheck, desc: 'Policy commitments, board governance, and oversight' },
  { id: 'section_c_overrides', label: 'Section C: Direct Metrics', icon: Layers, desc: 'Subsidiary-owned metrics and non-project disclosures' },
  { id: 'sub_p6', label: 'Principle 6: Environment', icon: Globe, desc: 'PAT, ZLD, Compliance, Waste Strategy & Procurement Scope 3' },
];

const getInitialFormData = (subNode) => ({
  section_a_org: {
    corporate_name: subNode?.name || '',
    cin_number: '',
    registered_office_address: '',
    contact_person: '',
    contact_email: '',
    website: '',
    reporting_boundary: 'Standalone entity and operational sites',
    total_employees_permanent: '',
    total_workers_permanent: '',
    female_employees_pct: '',
    csr_average_net_profit_cr: '',
    csr_spent_amount_cr: '',
    grievance_complaints_received: '',
    grievance_complaints_resolved: '',
  },
  section_b_p1: {
    has_ethics_policy: false,
    has_human_rights_policy: false,
    has_environment_policy: false,
    has_stakeholder_policy: false,
    board_committee_responsible: '',
    policy_weblink: '',
    review_frequency_months: '',
    independent_directors_oversight: false,
    stakeholder_grievance_redressal_in_place: false
  },
  section_c_overrides: {
    subsidiary_r_and_d_spend_pct_turnover: '',
    patents_granted_count: '',
    extended_producer_responsibility_registered: false,
    green_building_certified_sqft: '',
    internal_carbon_pricing_inr: ''
  },
  sub_p6: {
    turnover_inr_crores: '',
    prev_turnover_inr_crores: '',
    pat_designated_consumer: 'No',
    pat_details: '',
    zld_implemented: 'No',
    zld_coverage: '',
    env_law_compliant: 'Yes',
    env_non_compliance_rows: [],
    env_non_compliance_details: '',
    waste_management_strategy: '',
    bcp_disaster_plan: 'Yes',
    bcp_summary: '',
    bcp_weblink: '',
    scope3_purchased_goods_category: 'Cement & Steel',
    scope3_purchased_goods_spend: '',
    scope3_purchased_goods_tco2e: '',
    scope3_capital_goods_tco2e: '',
    scope3_leased_assets_tco2e: '',
    vc_env_impact_mitigation: '',
    vc_partners_assessed_pct: '',
  }
});

export default function SubsidiaryDisclosure() {
  const { user, isSystemAdmin, isSubsidiaryAdmin, isSubEsgManager } = useAuth();
  const { data: orgNodes = [] } = useOrgNodes();
  const { data: periods = [] } = useOrgPeriods();

  // Filter org nodes to Subsidiary / Company level
  const subNodes = useMemo(() => {
    return orgNodes.filter(n => n.type === 'company' || n.type === 'subsidiary');
  }, [orgNodes]);

  const [selectedSub, setSelectedSub] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [activeTab, setActiveTab] = useState('section_a_org');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState(null);

  const [disclosureStatus, setDisclosureStatus] = useState('DRAFT');
  const [disclosureId, setDisclosureId] = useState(null);

  const selectedSubNode = useMemo(() => {
    return subNodes.find(n => n.id === selectedSub);
  }, [subNodes, selectedSub]);

  // Form states initialized dynamically
  const [formData, setFormData] = useState(() => getInitialFormData(null));

  useEffect(() => {
    if (subNodes.length > 0 && !selectedSub) {
      const userSub = subNodes.find(n => n.id === user?.org_node_id);
      setSelectedSub(userSub ? userSub.id : subNodes[0].id);
    }
  }, [subNodes, selectedSub, user]);

  useEffect(() => {
    if (periods.length > 0 && !selectedPeriod) {
      setSelectedPeriod(periods[0].id);
    }
  }, [periods, selectedPeriod]);

  // Load section data
  useEffect(() => {
    if (!selectedSub || !selectedPeriod) return;
    let isMounted = true;
    setLoading(true);

    const baseData = getInitialFormData(selectedSubNode);

    disclosuresApi.getSection('subsidiary', selectedSub, selectedPeriod, activeTab)
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
  }, [selectedSub, selectedPeriod, activeTab, selectedSubNode]);

  const handleFieldChange = (sectionKey, field, val) => {
    setFormData(prev => ({
      ...prev,
      [sectionKey]: { ...prev[sectionKey], [field]: val }
    }));
  };

  const handleSaveDraft = async () => {
    if (!selectedSub || !selectedPeriod) return;
    setSaving(true);
    try {
      const res = await disclosuresApi.save({
        org_node_id: selectedSub,
        period_id: selectedPeriod,
        disclosure_level: 'subsidiary',
        disclosure_section: activeTab,
        payload: formData[activeTab],
        payload_version: 'v1'
      });
      if (res.data?.id) setDisclosureId(res.data.id);
      setNotice({ type: 'success', message: 'Subsidiary Disclosure draft saved successfully.' });
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
      setNotice({ type: 'success', message: 'Subsidiary Disclosures submitted to Group ESG Manager!' });
    } catch (e) {
      setNotice({ type: 'error', message: e?.response?.data?.detail || 'Submit failed.' });
    } finally {
      setSubmitting(false);
    }
  };

  const isLocked = disclosureStatus === 'APPROVED' || disclosureStatus === 'LOCKED';

  return (
    <div className="page-content anim-fade-up" style={{ padding: '28px 36px', maxWidth: 1480, width: '100%', margin: '0 auto' }}>
      {/* ── Page Header ── */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#15803d', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
            <span className="status-beacon-live" style={{ marginRight: 2 }} />
            <span>TYPE 3 DISCLOSURE FORM (SPEC §26-32)</span>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
            Subsidiary BRSR Disclosures (Sections A, B & C)
          </h1>
          <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: 14 }}>
            Manage entity-level regulatory disclosures required by SEBI BRSR that cannot be entered at project level.
          </p>
        </div>

        {/* Selectors */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <PageHelpButton title="Reporting Guide" route="/reporting" />
          <select
            value={selectedSub}
            onChange={e => setSelectedSub(e.target.value)}
            style={{
              padding: '9px 14px', borderRadius: 8, background: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)', color: 'var(--text-primary)', fontSize: 13, fontWeight: 600
            }}
          >
            {subNodes.map(n => (
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

          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
            borderRadius: 99, fontSize: 12, fontWeight: 700,
            background: disclosureStatus === 'APPROVED' ? '#dcfce7' : disclosureStatus === 'SUBMITTED' ? '#e0f2fe' : '#f1f5f9',
            color: disclosureStatus === 'APPROVED' ? '#15803d' : disclosureStatus === 'SUBMITTED' ? '#0369a1' : '#64748b',
            border: '1px solid currentColor'
          }}>
            {disclosureStatus === 'APPROVED' ? <CheckCircle2 size={13} /> : disclosureStatus === 'SUBMITTED' ? <Clock size={13} /> : <FileText size={13} />}
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
        {SUB_TABS.map(t => {
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
            <div>Loading section content…</div>
          </div>
        ) : (
          <>
            {/* Section A Tab */}
            {activeTab === 'section_a_org' && (
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 6px', color: 'var(--text-primary)' }}>
                  Section A: General Statutory & Demographic Disclosures
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 20px' }}>
                  Statutory corporate identifiers and employee demographics per SEBI BRSR Format.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                      Corporate Identity Number (CIN)
                    </label>
                    <input
                      type="text"
                      disabled={isLocked}
                      value={formData.section_a_org.cin_number || ''}
                      onChange={e => handleFieldChange('section_a_org', 'cin_number', e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--bg-base)', color: 'var(--text-primary)' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                      Official Web Portal URL
                    </label>
                    <input
                      type="text"
                      disabled={isLocked}
                      value={formData.section_a_org.website || ''}
                      onChange={e => handleFieldChange('section_a_org', 'website', e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--bg-base)', color: 'var(--text-primary)' }}
                    />
                  </div>

                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                      Registered Office Address
                    </label>
                    <input
                      type="text"
                      disabled={isLocked}
                      value={formData.section_a_org.registered_office_address || ''}
                      onChange={e => handleFieldChange('section_a_org', 'registered_office_address', e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--bg-base)', color: 'var(--text-primary)' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                      Permanent Employees (Headcount)
                    </label>
                    <input
                      type="number"
                      disabled={isLocked}
                      value={formData.section_a_org.total_employees_permanent || ''}
                      onChange={e => handleFieldChange('section_a_org', 'total_employees_permanent', e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--bg-base)', color: 'var(--text-primary)' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                      Permanent Workers (Headcount)
                    </label>
                    <input
                      type="number"
                      disabled={isLocked}
                      value={formData.section_a_org.total_workers_permanent || ''}
                      onChange={e => handleFieldChange('section_a_org', 'total_workers_permanent', e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--bg-base)', color: 'var(--text-primary)' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                      Female Representation (%)
                    </label>
                    <input
                      type="number"
                      disabled={isLocked}
                      value={formData.section_a_org.female_employees_pct || ''}
                      onChange={e => handleFieldChange('section_a_org', 'female_employees_pct', e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--bg-base)', color: 'var(--text-primary)' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                      CSR Spend for FY (₹ Crores)
                    </label>
                    <input
                      type="number"
                      disabled={isLocked}
                      value={formData.section_a_org.csr_spent_amount_cr || ''}
                      onChange={e => handleFieldChange('section_a_org', 'csr_spent_amount_cr', e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--bg-base)', color: 'var(--text-primary)' }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Section B Tab */}
            {activeTab === 'section_b_p1' && (
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 6px', color: 'var(--text-primary)' }}>
                  Section B: Management and Process Disclosures (Principles 1 to 9)
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 20px' }}>
                  Governance policies and board-level structures across the 9 National Guidelines on Responsible Business Conduct principles.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                      Board Committee in Charge of ESG
                    </label>
                    <input
                      type="text"
                      disabled={isLocked}
                      value={formData.section_b_p1.board_committee_responsible || ''}
                      onChange={e => handleFieldChange('section_b_p1', 'board_committee_responsible', e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--bg-base)', color: 'var(--text-primary)' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                      Policy Review Cycle (Months)
                    </label>
                    <input
                      type="number"
                      disabled={isLocked}
                      value={formData.section_b_p1.review_frequency_months || ''}
                      onChange={e => handleFieldChange('section_b_p1', 'review_frequency_months', e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--bg-base)', color: 'var(--text-primary)' }}
                    />
                  </div>

                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                      Public Policy Weblink
                    </label>
                    <input
                      type="text"
                      disabled={isLocked}
                      value={formData.section_b_p1.policy_weblink || ''}
                      onChange={e => handleFieldChange('section_b_p1', 'policy_weblink', e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--bg-base)', color: 'var(--text-primary)' }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Section C Overrides */}
            {activeTab === 'section_c_overrides' && (
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 6px', color: 'var(--text-primary)' }}>
                  Section C: Direct Subsidiary Disclosures
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 20px' }}>
                  Metrics that cannot be collected at operational sites and reside exclusively at company level.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                      Green Building Space (Sq. Ft.)
                    </label>
                    <input
                      type="number"
                      disabled={isLocked}
                      value={formData.section_c_overrides.green_building_certified_sqft || ''}
                      onChange={e => handleFieldChange('section_c_overrides', 'green_building_certified_sqft', e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--bg-base)', color: 'var(--text-primary)' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                      Internal Carbon Price (₹ / tCO₂e)
                    </label>
                    <input
                      type="number"
                      disabled={isLocked}
                      value={formData.section_c_overrides.internal_carbon_pricing_inr || ''}
                      onChange={e => handleFieldChange('section_c_overrides', 'internal_carbon_pricing_inr', e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--bg-base)', color: 'var(--text-primary)' }}
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'sub_p6' && (() => {
              const p6 = formData.sub_p6 || {};
              const nonCompRows = Array.isArray(p6.env_non_compliance_rows) ? p6.env_non_compliance_rows : [];
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <div>
                    <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                      Principle 6 — Subsidiary Statutory &amp; Financial Disclosures (EI-2, EI-5, EI-10, EI-13, LI-2, LI-5, LI-6, LI-7)
                    </h2>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
                      Statutory compliance, ZLD/PAT status, BCP, procurement/asset Scope 3, and value chain assessments.
                    </p>
                  </div>

                  {/* EI-2 PAT & EI-5 ZLD */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                        EI-2: Designated Consumer under PAT Scheme (BEE)?
                      </label>
                      <select disabled={isLocked} value={p6.pat_designated_consumer || 'No'}
                        onChange={e => handleFieldChange('sub_p6', 'pat_designated_consumer', e.target.value)}
                        style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--bg-base)', marginBottom: 8 }}>
                        <option value="No">No</option>
                        <option value="Yes">Yes</option>
                      </select>
                      <input type="text" disabled={isLocked} value={p6.pat_details || ''} placeholder="Target achievement / facility details (if Yes)"
                        onChange={e => handleFieldChange('sub_p6', 'pat_details', e.target.value)}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--bg-base)', fontSize: 12 }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                        EI-5: Zero Liquid Discharge (ZLD) Implemented?
                      </label>
                      <select disabled={isLocked} value={p6.zld_implemented || 'No'}
                        onChange={e => handleFieldChange('sub_p6', 'zld_implemented', e.target.value)}
                        style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--bg-base)', marginBottom: 8 }}>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                        <option value="Partial">Partial (Selected Facilities)</option>
                      </select>
                      <input type="text" disabled={isLocked} value={p6.zld_coverage || ''} placeholder="Coverage (% of sites / facility names & reuse details)"
                        onChange={e => handleFieldChange('sub_p6', 'zld_coverage', e.target.value)}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--bg-base)', fontSize: 12 }} />
                    </div>
                  </div>

                  {/* EI-13 Environmental Law Compliance */}
                  <div style={{ padding: 14, borderRadius: 10, border: '1px solid var(--border-default)', background: 'var(--bg-base)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <label style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)' }}>
                        EI-13: Compliant with Water Act, Air Act, Environment Protection Act?
                      </label>
                      <select disabled={isLocked} value={p6.env_law_compliant || 'Yes'}
                        onChange={e => handleFieldChange('sub_p6', 'env_law_compliant', e.target.value)}
                        style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border-default)', background: '#fff' }}>
                        <option value="Yes">Yes — Fully Compliant</option>
                        <option value="No">No — Fines / Show-cause Notices</option>
                      </select>
                    </div>
                    {p6.env_law_compliant === 'No' && (
                      <div>
                        {!isLocked && (
                          <button type="button" onClick={() => handleFieldChange('sub_p6', 'env_non_compliance_rows', [...nonCompRows, { law: '', authority: '', details: '', fine_inr: '' }])}
                            style={{ marginBottom: 8, padding: '4px 10px', fontSize: 11.5, fontWeight: 700, borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}>
                            + Add Notice / Fine
                          </button>
                        )}
                        {nonCompRows.map((r, idx) => (
                          <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr 0.8fr auto', gap: 8, marginBottom: 6 }}>
                            <input disabled={isLocked} value={r.law || ''} placeholder="Applicable Law" onChange={e => handleFieldChange('sub_p6', 'env_non_compliance_rows', nonCompRows.map((x, i) => i === idx ? { ...x, law: e.target.value } : x))}
                              style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }} />
                            <input disabled={isLocked} value={r.authority || ''} placeholder="Authority (SPCB/CPCB)" onChange={e => handleFieldChange('sub_p6', 'env_non_compliance_rows', nonCompRows.map((x, i) => i === idx ? { ...x, authority: e.target.value } : x))}
                              style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }} />
                            <input disabled={isLocked} value={r.details || ''} placeholder="Show-cause / Corrective Action" onChange={e => handleFieldChange('sub_p6', 'env_non_compliance_rows', nonCompRows.map((x, i) => i === idx ? { ...x, details: e.target.value } : x))}
                              style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }} />
                            <input disabled={isLocked} value={r.fine_inr || ''} placeholder="Fine (₹)" onChange={e => handleFieldChange('sub_p6', 'env_non_compliance_rows', nonCompRows.map((x, i) => i === idx ? { ...x, fine_inr: e.target.value } : x))}
                              style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }} />
                            {!isLocked && (
                              <button type="button" onClick={() => handleFieldChange('sub_p6', 'env_non_compliance_rows', nonCompRows.filter((_, i) => i !== idx))}
                                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>✕</button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* LI-2 Procurement & Asset Scope 3 */}
                  <div style={{ padding: 14, borderRadius: 10, border: '1px solid var(--border-default)', background: 'var(--bg-base)' }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>
                      LI-2: Procurement &amp; Asset Scope 3 (Purchased Goods 003C, Capital Goods 003E, Downstream Leased Assets)
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>003C Material Category</label>
                        <select disabled={isLocked} value={p6.scope3_purchased_goods_category || 'Cement & Steel'}
                          onChange={e => handleFieldChange('sub_p6', 'scope3_purchased_goods_category', e.target.value)}
                          style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border-default)', background: '#fff' }}>
                          <option value="Cement & Steel">Cement &amp; Steel</option>
                          <option value="Ready-Mix Concrete">Ready-Mix Concrete</option>
                          <option value="Bitumen & Aggregates">Bitumen &amp; Aggregates</option>
                          <option value="Electrical & Mechanical">Electrical &amp; Mechanical</option>
                          <option value="All Bulk Materials">All Bulk Materials</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>003C Purchased Goods (tCO₂e)</label>
                        <input type="number" step="0.01" disabled={isLocked} value={p6.scope3_purchased_goods_tco2e || ''}
                          onChange={e => handleFieldChange('sub_p6', 'scope3_purchased_goods_tco2e', e.target.value)}
                          style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border-default)', background: '#fff' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>003E Capital Goods (tCO₂e)</label>
                        <input type="number" step="0.01" disabled={isLocked} value={p6.scope3_capital_goods_tco2e || ''}
                          onChange={e => handleFieldChange('sub_p6', 'scope3_capital_goods_tco2e', e.target.value)}
                          style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border-default)', background: '#fff' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Downstream Leased Assets (tCO₂e)</label>
                        <input type="number" step="0.01" disabled={isLocked} value={p6.scope3_leased_assets_tco2e || ''}
                          onChange={e => handleFieldChange('sub_p6', 'scope3_leased_assets_tco2e', e.target.value)}
                          style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border-default)', background: '#fff' }} />
                      </div>
                    </div>
                  </div>

                  {/* LI-5 BCP & LI-6/LI-7 Value Chain */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                        LI-5: Business Continuity &amp; Disaster Plan (Yes/No + Web link)
                      </label>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                        <select disabled={isLocked} value={p6.bcp_disaster_plan || 'Yes'}
                          onChange={e => handleFieldChange('sub_p6', 'bcp_disaster_plan', e.target.value)}
                          style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--bg-base)' }}>
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </select>
                        <input type="text" disabled={isLocked} value={p6.bcp_weblink || ''} placeholder="BCP Policy Web Link (URL)"
                          onChange={e => handleFieldChange('sub_p6', 'bcp_weblink', e.target.value)}
                          style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--bg-base)' }} />
                      </div>
                      <textarea rows={2} disabled={isLocked} value={p6.bcp_summary || ''} placeholder="100-word BCP & Disaster Management summary..."
                        onChange={e => handleFieldChange('sub_p6', 'bcp_summary', e.target.value)}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--bg-base)' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                        LI-7: % Value Chain Partners Assessed &amp; LI-6 Mitigation Actions
                      </label>
                      <input type="number" step="0.1" disabled={isLocked} value={p6.vc_partners_assessed_pct || ''} placeholder="% of value chain partners assessed (by business value)"
                        onChange={e => handleFieldChange('sub_p6', 'vc_partners_assessed_pct', e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--bg-base)', marginBottom: 8 }} />
                      <textarea rows={2} disabled={isLocked} value={p6.vc_env_impact_mitigation || ''} placeholder="LI-6: Significant adverse environmental impacts in value chain & mitigation actions..."
                        onChange={e => handleFieldChange('sub_p6', 'vc_env_impact_mitigation', e.target.value)}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--bg-base)' }} />
                    </div>
                  </div>

                  {/* EI-10 Waste Strategy */}
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                      EI-10: Waste Management Practices &amp; Hazardous/Toxic Chemical Reduction Strategy
                    </label>
                    <textarea rows={2} disabled={isLocked} value={p6.waste_management_strategy || ''}
                      onChange={e => handleFieldChange('sub_p6', 'waste_management_strategy', e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--bg-base)' }} />
                  </div>
                </div>
              );
            })()}

            {/* Action Bar */}
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
                  {saving ? 'Saving…' : 'Save Draft'}
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
                  {submitting ? 'Submitting…' : 'Submit Disclosures'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
