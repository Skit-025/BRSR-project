import React, { useState, useEffect, useMemo } from 'react';
import {
  Building, BookOpen, Layers, ShieldCheck, Save, Send,
  CheckCircle2, Clock, AlertTriangle, RefreshCw, Plus, Trash2,
  ArrowRight, FileText, Globe, Users, HeartHandshake, Scale
} from 'lucide-react';
import { useOrgNodes, useOrgPeriods } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { disclosuresApi } from '../api/client';

const SUB_TABS = [
  { id: 'section_a_org', label: 'Section A: General Details', icon: Building, desc: 'Corporate identity, facilities, employee demographics & CSR' },
  { id: 'section_b_p1', label: 'Section B: Management (P1-P9)', icon: ShieldCheck, desc: 'Policy commitments, board governance, and oversight' },
  { id: 'section_c_overrides', label: 'Section C: Direct Metrics', icon: Layers, desc: 'Subsidiary-owned metrics and non-project disclosures' },
];

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

  // Form states
  const [formData, setFormData] = useState({
    section_a_org: {
      corporate_name: 'Megha Engineering & Infrastructures Ltd (Subsidiary)',
      cin_number: 'U45200TG2006PLC050278',
      registered_office_address: 'S-2, Technocrat Industrial Estate, Balanagar, Hyderabad - 500037',
      contact_person: 'Corporate Sustainability Officer',
      contact_email: 'esg.compliance@meilgroup.com',
      website: 'https://meil.in',
      reporting_boundary: 'Standalone entity and operational sites',
      total_employees_permanent: '14250',
      total_workers_permanent: '28400',
      female_employees_pct: '14.5',
      csr_average_net_profit_cr: '124.50',
      csr_spent_amount_cr: '2.52',
      grievance_complaints_received: '4',
      grievance_complaints_resolved: '4',
    },
    section_b_p1: {
      has_ethics_policy: true,
      has_human_rights_policy: true,
      has_environment_policy: true,
      has_stakeholder_policy: true,
      board_committee_responsible: 'CSR & Sustainability Committee of the Board',
      policy_weblink: 'https://meil.in/sustainability/policies',
      review_frequency_months: '12',
      independent_directors_oversight: true,
      stakeholder_grievance_redressal_in_place: true
    },
    section_c_overrides: {
      subsidiary_r_and_d_spend_pct_turnover: '1.2',
      patents_granted_count: '6',
      extended_producer_responsibility_registered: true,
      green_building_certified_sqft: '450000',
      internal_carbon_pricing_inr: '1850'
    }
  });

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

    disclosuresApi.getSection('subsidiary', selectedSub, selectedPeriod, activeTab)
      .then(res => {
        if (!isMounted) return;
        if (res.data) {
          setDisclosureId(res.data.id);
          setDisclosureStatus(res.data.status || 'DRAFT');
          if (res.data.payload && Object.keys(res.data.payload).length > 0) {
            setFormData(prev => ({
              ...prev,
              [activeTab]: res.data.payload
            }));
          }
        }
      })
      .catch(err => {
        console.warn('Could not fetch subsidiary disclosure section:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, [selectedSub, selectedPeriod, activeTab]);

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
    <div className="page-content" style={{ padding: '28px 36px', maxWidth: 1200, margin: '0 auto' }}>
      {/* ── Page Header ── */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--brand-500)', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
            <Building size={16} />
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
          {notice.message}
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
                      R&D Spending (% of Total Turnover)
                    </label>
                    <input
                      type="number"
                      disabled={isLocked}
                      value={formData.section_c_overrides.subsidiary_r_and_d_spend_pct_turnover || ''}
                      onChange={e => handleFieldChange('section_c_overrides', 'subsidiary_r_and_d_spend_pct_turnover', e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--bg-base)', color: 'var(--text-primary)' }}
                    />
                  </div>

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
