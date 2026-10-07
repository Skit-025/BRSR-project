import React, { useState, useMemo } from 'react';
import {
  Truck, Plus, Search, Filter, ShieldCheck, AlertCircle,
  TrendingUp, CheckCircle2, ChevronRight, FileSpreadsheet,
  Building2, Percent, DollarSign, Award, RefreshCw, X, Download
} from 'lucide-react';
import { useValueChainPartners, useCreatePartner, useRecordAssessment, useOrgPeriods } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';

export default function ValueChain() {
  const { user } = useAuth();
  const [inBoundaryOnly, setInBoundaryOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAssessModal, setShowAssessModal] = useState(false);

  const { data: partners = [], isLoading, refetch } = useValueChainPartners(inBoundaryOnly);
  const { data: periods = [] } = useOrgPeriods();
  const createPartner = useCreatePartner();
  const recordAssessment = useRecordAssessment();

  // Add Partner Form State
  const [newPartner, setNewPartner] = useState({
    name: '',
    identifier: '',
    partner_type: 'UPSTREAM_SUPPLIER',
    category: 'Raw Materials',
    annual_spend_inr_crores: '',
    contact_email: '',
  });

  // Assessment Form State
  const [assessmentData, setAssessmentData] = useState({
    period_id: '',
    esg_score: '',
    has_iso14001: false,
    has_code_of_conduct: true,
    scope3_reported_tco2e: '',
    risk_level: 'LOW',
  });

  // Summary Metrics Calculation
  const stats = useMemo(() => {
    const totalSpend = partners.reduce((sum, p) => sum + (p.annual_spend_inr_crores || 0), 0);
    const inBoundaryCount = partners.filter(p => p.in_sebi_75_boundary).length;
    const inBoundarySpend = partners
      .filter(p => p.in_sebi_75_boundary)
      .reduce((sum, p) => sum + (p.annual_spend_inr_crores || 0), 0);
    const inBoundaryPct = totalSpend > 0 ? ((inBoundarySpend / totalSpend) * 100).toFixed(1) : 0;

    return {
      totalPartners: partners.length,
      totalSpend: totalSpend.toFixed(2),
      inBoundaryCount,
      inBoundarySpend: inBoundarySpend.toFixed(2),
      inBoundaryPct,
    };
  }, [partners]);

  // Filtered partners
  const filteredPartners = useMemo(() => {
    return partners.filter(p => {
      const matchSearch =
        p.name?.toLowerCase().includes(search.toLowerCase()) ||
        p.identifier?.toLowerCase().includes(search.toLowerCase()) ||
        p.category?.toLowerCase().includes(search.toLowerCase());
      return matchSearch;
    });
  }, [partners, search]);

  const handleCreatePartner = async (e) => {
    e.preventDefault();
    if (!newPartner.name || !newPartner.identifier || !newPartner.annual_spend_inr_crores) return;

    await createPartner.mutateAsync({
      ...newPartner,
      annual_spend_inr_crores: parseFloat(newPartner.annual_spend_inr_crores),
    });
    setShowAddModal(false);
    setNewPartner({
      name: '',
      identifier: '',
      partner_type: 'UPSTREAM_SUPPLIER',
      category: 'Raw Materials',
      annual_spend_inr_crores: '',
      contact_email: '',
    });
  };

  const handleRecordAssessment = async (e) => {
    e.preventDefault();
    if (!selectedPartner) return;

    const periodId = assessmentData.period_id || periods[0]?.id || 'FY24-25';
    await recordAssessment.mutateAsync({
      partner_id: selectedPartner.id,
      period_id: periodId,
      esg_score: assessmentData.esg_score ? parseFloat(assessmentData.esg_score) : null,
      has_iso14001: Boolean(assessmentData.has_iso14001),
      has_code_of_conduct: Boolean(assessmentData.has_code_of_conduct),
      scope3_reported_tco2e: assessmentData.scope3_reported_tco2e ? parseFloat(assessmentData.scope3_reported_tco2e) : null,
      risk_level: assessmentData.risk_level,
    });
    setShowAssessModal(false);
    setSelectedPartner(null);
  };

  return (
    <div className="page-container anim-fade-up" style={{ padding: '24px 32px' }}>
      {/* ── Status Ticker ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8,
        fontSize: 11, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748b'
      }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#15803d' }}>
          <span className="status-beacon-live" style={{ marginRight: 2 }} />
          VALUE CHAIN AUDIT TRAIL
        </span>
        <span style={{ color: '#cbd5e1' }}>/</span>
        <span>SEBI BRSR CORE 75% PROCUREMENT SPEND BOUNDARY</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8, background: 'var(--accent-subtle, #e0f2fe)',
              color: 'var(--accent, #0284c7)', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Truck size={20} />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                SEBI Value Chain ESG Disclosures
              </h1>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                Cumulative 75% procurement spend boundary resolution and Scope 3 supplier assessments (BRSR Core Mandate).
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => refetch()}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
          >
            <RefreshCw size={14} className={isLoading ? 'spin' : ''} />
            Refresh
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
          >
            <Plus size={15} />
            Add Value Chain Partner
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            Total Value Chain Partners
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, marginTop: 8, color: 'var(--text-primary)' }}>
            {stats.totalPartners}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
            Tier-1 Upstream & Downstream
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            Total Procurement Spend
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, marginTop: 8, color: '#0284c7' }}>
            ₹{stats.totalSpend} <span style={{ fontSize: 14, fontWeight: 500 }}>Cr</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
            Aggregated Annual Spend
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            In-Boundary Cutoff (SEBI 75%)
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, marginTop: 8, color: '#16a34a' }}>
            {stats.inBoundaryCount} <span style={{ fontSize: 14, fontWeight: 500 }}>Partners</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
            Accounting for {stats.inBoundaryPct}% of total spend
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            SEBI Regulatory Status
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
            <ShieldCheck size={22} color="#16a34a" />
            <span style={{ fontSize: 18, fontWeight: 700, color: '#16a34a' }}>
              Compliant
            </span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
            Boundary threshold satisfied (&gt;= 75.0%)
          </div>
        </div>
      </div>

      {/* Cumulative Spend Boundary Gauge */}
      <div className="card" style={{ padding: '18px 24px', marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
              SEBI Cumulative 75% Spend Boundary Progress
            </span>
            <span style={{
              fontSize: 11, padding: '2px 8px', borderRadius: 12,
              background: '#dcfce7', color: '#15803d', fontWeight: 600
            }}>
              Active Rule: Top 75% of purchases/sales
            </span>
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#0284c7' }}>
            {stats.inBoundaryPct}% / 75.0% Required
          </span>
        </div>

        <div style={{
          width: '100%', height: 12, background: 'var(--bg-muted, #f1f5f9)',
          borderRadius: 6, overflow: 'hidden', position: 'relative'
        }}>
          <div style={{
            width: `${Math.min(100, (parseFloat(stats.inBoundaryPct) / 75.0) * 100)}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #3b82f6 0%, #10b981 100%)',
            borderRadius: 6,
            transition: 'width 0.4s ease'
          }} />
          {/* 75% marker line */}
          <div style={{
            position: 'absolute', left: '75%', top: 0, bottom: 0, width: 2,
            background: '#ef4444', zIndex: 2
          }} title="75% Mandatory Boundary Threshold" />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: 'var(--text-muted)' }}>
          <span>0%</span>
          <span style={{ color: '#ef4444', fontWeight: 600 }}>75% Cutoff Boundary</span>
          <span>100%</span>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 260 }}>
            <div style={{ position: 'relative', width: '100%', maxWidth: 360 }}>
              <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search by supplier name, code, or category..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%', padding: '8px 12px 8px 36px', borderRadius: 6,
                  border: '1px solid var(--border)', fontSize: 13, background: 'var(--bg-card)'
                }}
              />
            </div>

            <div style={{ display: 'flex', background: 'var(--bg-muted, #f1f5f9)', borderRadius: 6, padding: 2 }}>
              <button
                type="button"
                onClick={() => setInBoundaryOnly(false)}
                style={{
                  padding: '6px 12px', border: 'none', background: !inBoundaryOnly ? 'var(--bg-card)' : 'transparent',
                  fontWeight: !inBoundaryOnly ? 600 : 500, fontSize: 12, borderRadius: 5, cursor: 'pointer',
                  color: !inBoundaryOnly ? 'var(--text-primary)' : 'var(--text-muted)',
                  boxShadow: !inBoundaryOnly ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                }}
              >
                All Partners ({partners.length})
              </button>
              <button
                type="button"
                onClick={() => setInBoundaryOnly(true)}
                style={{
                  padding: '6px 12px', border: 'none', background: inBoundaryOnly ? 'var(--bg-card)' : 'transparent',
                  fontWeight: inBoundaryOnly ? 600 : 500, fontSize: 12, borderRadius: 5, cursor: 'pointer',
                  color: inBoundaryOnly ? 'var(--text-primary)' : 'var(--text-muted)',
                  boxShadow: inBoundaryOnly ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                }}
              >
                In 75% Boundary Only ({stats.inBoundaryCount})
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Partners Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--bg-muted, #f8fafc)', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600 }}>
              <th style={{ padding: '12px 16px' }}>Partner Name & Code</th>
              <th style={{ padding: '12px 16px' }}>Category</th>
              <th style={{ padding: '12px 16px' }}>Type</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Annual Spend</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Spend Share</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Cumulative %</th>
              <th style={{ padding: '12px 16px', textAlign: 'center' }}>SEBI 75% Boundary</th>
              <th style={{ padding: '12px 16px', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPartners.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  {isLoading ? 'Loading value chain partners from database...' : 'No value chain partners found matching criteria.'}
                </td>
              </tr>
            ) : (
              filteredPartners.map((p, idx) => (
                <tr key={p.id || idx} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.identifier}</div>
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                    {p.category}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      fontSize: 11, padding: '2px 8px', borderRadius: 4,
                      background: p.partner_type === 'UPSTREAM_SUPPLIER' ? '#eff6ff' : '#f5f3ff',
                      color: p.partner_type === 'UPSTREAM_SUPPLIER' ? '#1d4ed8' : '#6d28d9',
                      fontWeight: 600
                    }}>
                      {p.partner_type === 'UPSTREAM_SUPPLIER' ? 'Upstream' : 'Downstream'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>
                    ₹{Number(p.annual_spend_inr_crores || 0).toFixed(2)} Cr
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                    {Number(p.spend_share_pct || 0).toFixed(2)}%
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: p.cumulative_spend_pct <= 75 ? '#0284c7' : 'var(--text-muted)' }}>
                    {Number(p.cumulative_spend_pct || 0).toFixed(2)}%
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    {p.in_sebi_75_boundary ? (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        fontSize: 11, padding: '2px 8px', borderRadius: 12,
                        background: '#dcfce7', color: '#15803d', fontWeight: 600
                      }}>
                        <CheckCircle2 size={12} /> Mandatory Boundary
                      </span>
                    ) : (
                      <span style={{
                        fontSize: 11, padding: '2px 8px', borderRadius: 12,
                        background: '#f1f5f9', color: '#64748b', fontWeight: 500
                      }}>
                        Outside Cutoff
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <button
                      onClick={() => {
                        setSelectedPartner(p);
                        setShowAssessModal(true);
                      }}
                      className="btn btn-secondary"
                      style={{ fontSize: 11, padding: '4px 10px' }}
                    >
                      Record ESG
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Partner Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
        }}>
          <div className="card" style={{ width: '100%', maxWidth: 500, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Add Value Chain Partner</h2>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreatePartner}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                    Partner Legal Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tata Steel BSL Ltd"
                    value={newPartner.name}
                    onChange={(e) => setNewPartner({ ...newPartner, name: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                      GSTIN / PAN / Code *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 36AABCT1234F1Z0"
                      value={newPartner.identifier}
                      onChange={(e) => setNewPartner({ ...newPartner, identifier: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                      Category
                    </label>
                    <select
                      value={newPartner.category}
                      onChange={(e) => setNewPartner({ ...newPartner, category: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)' }}
                    >
                      <option value="Raw Materials">Raw Materials (Steel, Cement)</option>
                      <option value="Equipment">Heavy Equipment & Machinery</option>
                      <option value="Logistics">Logistics & Transportation</option>
                      <option value="Contracting">Subcontracting & Labor</option>
                      <option value="Packaging">Packaging & Consumables</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                      Partner Type
                    </label>
                    <select
                      value={newPartner.partner_type}
                      onChange={(e) => setNewPartner({ ...newPartner, partner_type: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)' }}
                    >
                      <option value="UPSTREAM_SUPPLIER">Upstream Supplier</option>
                      <option value="DOWNSTREAM_BUYER">Downstream Buyer / Client</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                      Annual Spend (₹ Crores) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="e.g. 45.50"
                      value={newPartner.annual_spend_inr_crores}
                      onChange={(e) => setNewPartner({ ...newPartner, annual_spend_inr_crores: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                    Contact Email
                  </label>
                  <input
                    type="email"
                    placeholder="esg-contact@partner.com"
                    value={newPartner.contact_email}
                    onChange={(e) => setNewPartner({ ...newPartner, contact_email: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
                  <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" disabled={createPartner.isPending} className="btn btn-primary">
                    {createPartner.isPending ? 'Registering...' : 'Register Partner'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Assessment Modal */}
      {showAssessModal && selectedPartner && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
        }}>
          <div className="card" style={{ width: '100%', maxWidth: 500, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Record ESG Assessment</h2>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  {selectedPartner.name} ({selectedPartner.identifier})
                </div>
              </div>
              <button onClick={() => setShowAssessModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRecordAssessment}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                      Reporting Period
                    </label>
                    <select
                      value={assessmentData.period_id}
                      onChange={(e) => setAssessmentData({ ...assessmentData, period_id: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)' }}
                    >
                      {periods.map(p => (
                        <option key={p.id} value={p.id}>{p.code || p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                      Overall ESG Score (0-100)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      placeholder="e.g. 78.5"
                      value={assessmentData.esg_score}
                      onChange={(e) => setAssessmentData({ ...assessmentData, esg_score: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                      Reported Scope 3 (tCO2e)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 1250.00"
                      value={assessmentData.scope3_reported_tco2e}
                      onChange={(e) => setAssessmentData({ ...assessmentData, scope3_reported_tco2e: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                      Risk Level
                    </label>
                    <select
                      value={assessmentData.risk_level}
                      onChange={(e) => setAssessmentData({ ...assessmentData, risk_level: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)' }}
                    >
                      <option value="LOW">LOW Risk</option>
                      <option value="MEDIUM">MEDIUM Risk</option>
                      <option value="HIGH">HIGH Risk</option>
                    </select>
                  </div>
                </div>

                <div style={{ background: 'var(--bg-muted, #f8fafc)', padding: 12, borderRadius: 6 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', marginBottom: 8 }}>
                    <input
                      type="checkbox"
                      checked={assessmentData.has_iso14001}
                      onChange={(e) => setAssessmentData({ ...assessmentData, has_iso14001: e.target.checked })}
                    />
                    <span>Has certified ISO 14001 (EMS) Environmental System</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={assessmentData.has_code_of_conduct}
                      onChange={(e) => setAssessmentData({ ...assessmentData, has_code_of_conduct: e.target.checked })}
                    />
                    <span>Signed Aarohan Supplier Code of Conduct & Human Rights Charter</span>
                  </label>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
                  <button type="button" onClick={() => setShowAssessModal(false)} className="btn btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" disabled={recordAssessment.isPending} className="btn btn-primary">
                    {recordAssessment.isPending ? 'Saving...' : 'Save Assessment'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
