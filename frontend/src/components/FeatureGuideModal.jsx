import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  HelpCircle, X, Compass, Shield, BookOpen, UserCheck,
  CheckCircle2, AlertTriangle, Lightbulb, ExternalLink,
  ChevronRight, Search, FileText, ArrowRight, Layers, Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { FEATURE_GUIDES, getGuideForRoute } from '../data/featureGuides';

export default function FeatureGuideModal({ isOpen, onClose, initialRoute }) {
  const location = useLocation();
  const { user, role, roleMeta } = useAuth();

  const currentRoute = initialRoute || location.pathname;
  const [selectedGuideKey, setSelectedGuideKey] = useState(currentRoute);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'brsr', 'roles', 'manual'
  const [searchQuery, setSearchQuery] = useState('');

  // Update selected guide when modal opens or route changes
  useEffect(() => {
    if (isOpen) {
      setSelectedGuideKey(currentRoute);
    }
  }, [isOpen, currentRoute]);

  // Keyboard shortcut: Escape closes modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentGuide = getGuideForRoute(selectedGuideKey);

  // Filter guide options for the quick-switcher
  const guideEntries = Object.entries(FEATURE_GUIDES);
  const filteredGuideEntries = searchQuery
    ? guideEntries.filter(([route, g]) =>
        g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.sebiSection.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.whatIsIt.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : guideEntries;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: '#FFFFFF',
          width: '100%',
          maxWidth: '920px',
          maxHeight: '90vh',
          borderRadius: '14px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0,0,0,0.06)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          fontFamily: 'Inter, system-ui, sans-serif'
        }}
      >
        {/* ── Top Header Bar ── */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid #E2E8F0',
            background: '#F8FAFC',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: currentGuide.color || '#0070F3',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              <HelpCircle size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h2 style={{ fontSize: 17, fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  {currentGuide.title}
                </h2>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 9999,
                    background: '#EEF2FF',
                    color: '#4F46E5',
                    border: '1px solid #C7D2FE'
                  }}
                >
                  {currentGuide.badge}
                </span>
              </div>
              <p style={{ fontSize: 12, color: '#64748B', margin: '2px 0 0 0' }}>
                {currentGuide.subtitle}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Quick Feature Switcher Dropdown */}
            <div style={{ position: 'relative' }}>
              <select
                value={selectedGuideKey}
                onChange={(e) => setSelectedGuideKey(e.target.value)}
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#334155',
                  background: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  borderRadius: 7,
                  padding: '6px 28px 6px 10px',
                  cursor: 'pointer',
                  outline: 'none'
                }}
                title="Switch to another feature guide"
              >
                {guideEntries.map(([r, g]) => (
                  <option key={r} value={r}>
                    {g.title}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: '#64748B',
                cursor: 'pointer',
                padding: 6,
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.15s'
              }}
              title="Close Guide (Esc)"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ── Active Role Callout Banner ── */}
        <div
          style={{
            background: '#F0FDF4',
            borderBottom: '1px solid #DCFCE7',
            padding: '8px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 12
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13 }}>👉</span>
            <span style={{ color: '#166534' }}>
              You are accessing this as: <strong style={{ color: roleMeta?.color || '#059669' }}>{roleMeta?.label || role}</strong>
            </span>
          </div>
          <span style={{ fontSize: 11, color: '#15803D', fontWeight: 600 }}>
            SEBI Regulatory & Operational Guide
          </span>
        </div>

        {/* ── Navigation Tabs ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '0 24px',
            borderBottom: '1px solid #E2E8F0',
            background: '#FFFFFF',
            gap: 8
          }}
        >
          {[
            { id: 'overview', label: '1. What & Why', icon: BookOpen },
            { id: 'brsr', label: '2. Final BRSR Contribution', icon: Layers },
            { id: 'roles', label: '3. Role-Based Duties', icon: UserCheck },
            { id: 'manual', label: '4. Step-by-Step Manual', icon: CheckCircle2 }
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '12px 14px',
                  background: 'none',
                  border: 'none',
                  borderBottom: isSelected ? '2px solid #0070F3' : '2px solid transparent',
                  color: isSelected ? '#0070F3' : '#64748B',
                  fontWeight: isSelected ? 700 : 500,
                  fontSize: 13,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon size={15} color={isSelected ? '#0070F3' : '#94A3B8'} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ── Tab Content Area ── */}
        <div
          style={{
            padding: '24px',
            overflowY: 'auto',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 20
          }}
        >
          {/* TAB 1: WHAT & WHY */}
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* What is it card */}
              <div
                style={{
                  background: '#F8FAFC',
                  borderRadius: 10,
                  border: '1px solid #E2E8F0',
                  padding: '18px 20px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 6,
                      background: '#DBEAFE',
                      color: '#1D4ED8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      fontWeight: 700
                    }}
                  >
                    1
                  </div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: 0 }}>
                    What is this feature?
                  </h3>
                </div>
                <p style={{ fontSize: 13.5, color: '#334155', lineHeight: 1.65, margin: 0 }}>
                  {currentGuide.whatIsIt}
                </p>
              </div>

              {/* Why is it necessary card */}
              <div
                style={{
                  background: '#FFFBEB',
                  borderRadius: 10,
                  border: '1px solid #FDE68A',
                  padding: '18px 20px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 6,
                      background: '#FEF3C7',
                      color: '#B45309',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      fontWeight: 700
                    }}
                  >
                    2
                  </div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: '#92400E', margin: 0 }}>
                    Why is it necessary? (Statutory & Regulatory Rationale)
                  </h3>
                </div>
                <p style={{ fontSize: 13.5, color: '#78350F', lineHeight: 1.65, margin: 0 }}>
                  {currentGuide.whyNecessary}
                </p>
              </div>

              {/* Key Indicators covered */}
              {currentGuide.indicators && currentGuide.indicators.length > 0 && (
                <div style={{ marginTop: 4 }}>
                  <h4 style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B', margin: '0 0 8px 0', fontWeight: 700 }}>
                    Governed ESG Parameters & Metrics
                  </h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {currentGuide.indicators.map((ind, idx) => (
                      <span
                        key={idx}
                        style={{
                          fontSize: 11.5,
                          fontWeight: 600,
                          padding: '3px 9px',
                          borderRadius: 6,
                          background: '#F1F5F9',
                          color: '#475569',
                          border: '1px solid #E2E8F0'
                        }}
                      >
                        {ind}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: FINAL BRSR REPORT CONTRIBUTION */}
          {activeTab === 'brsr' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Section Tag Banner */}
              <div
                style={{
                  background: '#EEF2FF',
                  border: '1px solid #C7D2FE',
                  borderRadius: 10,
                  padding: '14px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12
                }}
              >
                <Layers size={22} color="#4F46E5" />
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#4F46E5', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Statutory Filing Destination
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1E1B4B' }}>
                    {currentGuide.sebiSection}
                  </div>
                </div>
              </div>

              {/* Exact Contribution Details */}
              <div
                style={{
                  background: '#FFFFFF',
                  borderRadius: 10,
                  border: '1px solid #E2E8F0',
                  padding: '18px 20px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                }}
              >
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginTop: 0, marginBottom: 10 }}>
                  How this directly shapes the final published report
                </h3>
                <p style={{ fontSize: 13.5, color: '#334155', lineHeight: 1.65, margin: 0 }}>
                  {currentGuide.brsrContribution}
                </p>
              </div>

              {/* Statutory Assurance Callout */}
              <div
                style={{
                  background: '#F0FDF4',
                  borderRadius: 10,
                  border: '1px solid #BBF7D0',
                  padding: '14px 18px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12
                }}
              >
                <Shield size={20} color="#16A34A" style={{ marginTop: 2 }} />
                <div>
                  <h4 style={{ fontSize: 13.5, fontWeight: 700, color: '#166534', margin: 0 }}>
                    Reasonable Assurance Readiness
                  </h4>
                  <p style={{ fontSize: 12.5, color: '#15803D', lineHeight: 1.55, margin: '4px 0 0 0' }}>
                    Figures configured or submitted here are bound to verified evidence hashes in the audit pack. When independent verifiers audit the final disclosures, they follow the digital lineage trail back to this exact module.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ROLE-BASED GUIDE */}
          {activeTab === 'roles' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>
                Every user role has distinct responsibilities on this screen to ensure compliance with <strong>Four-Eyes Segregation of Duties</strong>:
              </p>

              {currentGuide.rolesGuide.map((rg, idx) => {
                const isUserRole = (roleMeta?.label || '').toLowerCase().includes(rg.badge.toLowerCase()) ||
                  (role || '').toLowerCase().includes(rg.badge.toLowerCase());

                return (
                  <div
                    key={idx}
                    style={{
                      background: isUserRole ? '#F0FDF4' : '#FFFFFF',
                      borderRadius: 10,
                      border: isUserRole ? '2px solid #86EFAC' : '1px solid #E2E8F0',
                      padding: '16px 18px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                      position: 'relative'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 6,
                            background: rg.color || '#3B82F6',
                            color: '#FFFFFF'
                          }}
                        >
                          {rg.badge}
                        </span>
                        <strong style={{ fontSize: 14, color: '#0F172A' }}>
                          {rg.role}
                        </strong>
                      </div>

                      {isUserRole && (
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: '#15803D',
                            background: '#DCFCE7',
                            padding: '2px 8px',
                            borderRadius: 9999
                          }}
                        >
                          Your Active Role
                        </span>
                      )}
                    </div>

                    <p style={{ fontSize: 13, color: '#334155', lineHeight: 1.6, margin: '4px 0 0 0' }}>
                      {rg.action}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 4: STEP-BY-STEP USER MANUAL */}
          {activeTab === 'manual' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Step Sequence */}
              <div>
                <h3 style={{ fontSize: 14.5, fontWeight: 700, color: '#0F172A', marginTop: 0, marginBottom: 12 }}>
                  How to perform tasks on this page (Step-by-Step)
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {currentGuide.userManual.steps.map((st, sidx) => (
                    <div
                      key={sidx}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 12,
                        background: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        borderRadius: 8,
                        padding: '12px 14px'
                      }}
                    >
                      <div
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          background: '#0070F3',
                          color: '#FFFFFF',
                          fontSize: 12,
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}
                      >
                        {st.num}
                      </div>
                      <div>
                        <strong style={{ fontSize: 13.5, color: '#0F172A' }}>{st.title}</strong>
                        <p style={{ fontSize: 12.5, color: '#475569', margin: '3px 0 0 0', lineHeight: 1.5 }}>
                          {st.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pro-Tips & Best Practices */}
              {currentGuide.userManual.proTips && currentGuide.userManual.proTips.length > 0 && (
                <div
                  style={{
                    background: '#F0FDF4',
                    border: '1px solid #BBF7D0',
                    borderRadius: 10,
                    padding: '14px 18px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <Lightbulb size={18} color="#16A34A" />
                    <strong style={{ fontSize: 13.5, color: '#166534' }}>Pro-Tips & Best Practices</strong>
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: '#15803D', lineHeight: 1.6 }}>
                    {currentGuide.userManual.proTips.map((tip, tidx) => (
                      <li key={tidx}>{tip}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Common Pitfalls to Avoid */}
              {currentGuide.userManual.pitfalls && currentGuide.userManual.pitfalls.length > 0 && (
                <div
                  style={{
                    background: '#FFF1F2',
                    border: '1px solid #FECDD3',
                    borderRadius: 10,
                    padding: '14px 18px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <AlertTriangle size={18} color="#E11D48" />
                    <strong style={{ fontSize: 13.5, color: '#9F1239' }}>Critical Pitfalls to Avoid</strong>
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: '#BE123C', lineHeight: 1.6 }}>
                    {currentGuide.userManual.pitfalls.map((pit, pidx) => (
                      <li key={pidx}>{pit}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer Bar ── */}
        <div
          style={{
            padding: '12px 24px',
            borderTop: '1px solid #E2E8F0',
            background: '#F8FAFC',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ fontSize: 12, color: '#64748B', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>Shortcut: Press <strong>Esc</strong> to close</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={onClose}
              style={{
                padding: '7px 18px',
                borderRadius: 7,
                border: '1px solid #CBD5E1',
                background: '#FFFFFF',
                color: '#334155',
                fontSize: 12.5,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              Done / Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
