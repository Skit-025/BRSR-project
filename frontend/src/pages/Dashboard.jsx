import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, TrendingDown, CheckCircle2, Clock, Building2,
  FileText, Shield, BarChart3, ArrowUpRight, ArrowRight,
  Zap, Droplets, Cloud, AlertCircle, AlertTriangle, Play,
  Download, Calendar, Check, RefreshCw, ChevronRight,
  ShieldCheck, ExternalLink, HardHat, Factory, Truck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useOrgPeriods, useOrgNodes, useDashboardSummary } from '../hooks/useApi';
import DataLineageDrawer from '../components/DataLineageDrawer';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: periods = [] } = useOrgPeriods();
  const { data: nodes = [] } = useOrgNodes();

  const [selectedPeriodId, setSelectedPeriodId] = useState('');
  const [selectedEntityId, setSelectedEntityId] = useState('');
  const [lineageDrawerOpen, setLineageDrawerOpen] = useState(false);
  const [lineageMetricCode, setLineageMetricCode] = useState('ENV-ENERGY-001');

  const rootNode = React.useMemo(() => {
    if (user?.org_node_id) {
      const userNode = nodes.find(n => n.id === user.org_node_id);
      if (userNode) return userNode;
    }
    return nodes.find(n => n.code === 'AAROHAN-GROUP') || nodes.find(n => n.type === 'group' || n.is_root) || nodes[0];
  }, [nodes, user?.org_node_id]);

  const activePeriodId = selectedPeriodId || periods.find(p => p.code === 'FY2025-26-M03')?.id || periods[0]?.id;
  const activeEntityId = selectedEntityId || rootNode?.id;

  const { data: summary, isLoading: summaryLoading } = useDashboardSummary(
    activePeriodId,
    activeEntityId
  );

  const openLineage = (code = 'ENV-ENERGY-001') => {
    setLineageMetricCode(code);
    setLineageDrawerOpen(true);
  };

  const currentPeriodId = activePeriodId || 'FY2025-26-M03';

  // Extract real metrics from backend ExecutiveDashboardSummary
  const envKpis = summary?.key_environmental_kpis || {};
  const socKpis = summary?.key_social_kpis || {};

  const displayEnergy = envKpis.total_energy_gj != null && envKpis.total_energy_gj > 0
    ? `${Number(envKpis.total_energy_gj).toLocaleString()} GJ`
    : '482.4 GWh';

  const displayWater = envKpis.water_consumption_kl != null && envKpis.water_consumption_kl > 0
    ? `${Number(envKpis.water_consumption_kl).toLocaleString()} kL`
    : '1.84M kL';

  const displayGhg = envKpis.total_ghg_tco2e != null && envKpis.total_ghg_tco2e > 0
    ? Number(envKpis.total_ghg_tco2e).toLocaleString()
    : '1,284.7';

  const displayScope1 = envKpis.scope1_emissions_tco2e != null && envKpis.scope1_emissions_tco2e > 0
    ? `${Number(envKpis.scope1_emissions_tco2e).toLocaleString()} t`
    : '520.0 t';

  const displayScope2 = envKpis.scope2_emissions_tco2e != null && envKpis.scope2_emissions_tco2e > 0
    ? `${Number(envKpis.scope2_emissions_tco2e).toLocaleString()} t`
    : '412.0 t';

  const displayLtifr = socKpis.ltifr != null ? Number(socKpis.ltifr).toFixed(2) : '0.08';
  const displayFatalities = socKpis.fatalities != null ? `${socKpis.fatalities} Fatalities` : '0 Fatalities';
  const displayWaste = envKpis.waste_generated_mt != null && envKpis.waste_generated_mt > 0
    ? `${Number(envKpis.waste_generated_mt).toLocaleString()} MT`
    : '92.4%';

  const operatingUnits = React.useMemo(() => {
    const subNodes = nodes.filter(n => ['subsidiary', 'business_unit', 'bu'].includes(n.type?.toLowerCase()));
    if (subNodes.length > 0) {
      return subNodes.map((node, idx) => {
        const icons = [Building2, Factory, HardHat, Truck];
        return {
          icon: icons[idx % icons.length],
          name: node.name,
          type: node.type?.toUpperCase() === 'BU' ? 'Business Unit' : 'Subsidiary Entity',
          coverage: `${summary?.submission_progress?.overall_progress_pct ? Math.min(100, Math.round(summary.submission_progress.overall_progress_pct + (idx * 2))) : 95}%`,
          evidence: `${35 + idx}/${40}`,
          status: summary?.submission_progress?.in_review > 0 ? 'In Review' : 'Ready',
          statusType: summary?.submission_progress?.in_review > 0 ? 'neutral' : 'success',
          action: 'Inspect BU ›',
          route: `/disclosure/bu?nodeId=${node.id}`
        };
      });
    }
    return [
      {
        icon: Building2,
        name: 'Odisha Infrastructure',
        type: 'Primary Infra',
        coverage: '98%',
        evidence: '41/42',
        status: 'Ready',
        statusType: 'success',
        action: 'Inspect BU ›',
        route: '/disclosure/bu'
      },
      {
        icon: Factory,
        name: 'Energy Systems',
        type: 'Renewables',
        coverage: '94%',
        evidence: '28/30',
        status: 'In Review',
        statusType: 'neutral',
        action: 'Inspect BU ›',
        route: '/disclosure/bu'
      },
      {
        icon: HardHat,
        name: 'Manufacturing',
        type: 'Heavy Industry',
        coverage: '88%',
        evidence: '19/24',
        status: 'Attention',
        statusType: 'danger',
        action: 'Resolve Blockers ⚠',
        route: '/data-quality',
        isWarning: true
      },
      {
        icon: Truck,
        name: 'Services & Logistics',
        type: 'Fleet & Warehousing',
        coverage: '100%',
        evidence: '16/16',
        status: 'Ready',
        statusType: 'success',
        action: 'View Report ›',
        route: '/reporting'
      }
    ];
  }, [nodes, summary]);


  return (
    <div className="page-content anim-fade-up" style={{
      background: '#F8FAFC',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── Top Status Line ── */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          fontSize: 11,
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          color: '#64748B',
          letterSpacing: '0.04em'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: '#09090B' }}>
            <span className="status-beacon-live" />
            <span>LIVE FEED ACTIVE</span>
          </div>
          <span style={{ color: '#CBD5E1' }}>•</span>
          <span style={{ color: '#64748B' }}>Q2 AUDIT LOCK-IN T-14D</span>
        </div>

        {/* ── Page Header Row ── */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16
        }}>
          <div>
            <h1 style={{
              fontSize: 26,
              fontWeight: 800,
              color: '#09090B',
              margin: '0 0 4px',
              letterSpacing: '-0.02em'
            }}>
              Overview
            </h1>
            <p style={{
              fontSize: 13,
              color: '#64748B',
              margin: 0
            }}>
              Good morning, {user?.full_name?.split(' ')[0] || 'Aditya'}. Here's the current ESG reporting status across your organization.
            </p>
          </div>

          {/* Action controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {/* FY selector */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              padding: '4px 10px',
              borderRadius: 6,
              fontSize: 12.5,
              fontWeight: 600,
              color: '#09090B',
            }}>
              <Calendar size={13} color="#64748B" />
              <select
                value={activePeriodId || ''}
                onChange={(e) => setSelectedPeriodId(e.target.value)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  fontWeight: 600,
                  fontSize: 12.5,
                  color: '#09090B',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                {periods.map(p => (
                  <option key={p.id} value={p.id}>{p.code || p.label || p.financial_year}</option>
                ))}
              </select>
            </div>

            {/* Entity selector */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              padding: '4px 10px',
              borderRadius: 6,
              fontSize: 12.5,
              fontWeight: 600,
              color: '#09090B',
            }}>
              <Building2 size={13} color="#64748B" />
              <select
                value={activeEntityId || ''}
                onChange={(e) => setSelectedEntityId(e.target.value)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  fontWeight: 600,
                  fontSize: 12.5,
                  color: '#09090B',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                {nodes
                  .filter(n => ['group', 'subsidiary', 'company'].includes(n.type?.toLowerCase()))
                  .map(n => (
                    <option key={n.id} value={n.id}>{n.name} ({n.type?.toUpperCase()})</option>
                  ))}
              </select>
            </div>

            {/* Export BRSR Pack */}
            <button
              onClick={() => navigate('/reporting')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                padding: '6px 12px',
                borderRadius: 6,
                fontSize: 12.5,
                fontWeight: 600,
                color: '#09090B',
                cursor: 'pointer'
              }}
            >
              <Download size={13} color="#64748B" />
              <span>Export BRSR Pack</span>
            </button>

            {/* Actions button */}
            <button
              onClick={() => {
                const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true });
                window.dispatchEvent(event);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: '#0070F3',
                border: 'none',
                padding: '6px 14px',
                borderRadius: 6,
                fontSize: 12.5,
                fontWeight: 600,
                color: '#FFFFFF',
                cursor: 'pointer'
              }}
            >
              <Play size={11} fill="#FFFFFF" />
              <span>Actions</span>
              <span style={{
                fontSize: 9.5,
                background: 'rgba(255,255,255,0.2)',
                padding: '1px 4px',
                borderRadius: 3,
                fontFamily: 'monospace',
                marginLeft: 2
              }}>
                ⌘K
              </span>
            </button>
          </div>
        </div>

        {/* ── ESG REPORTING WORKFLOW PIPELINE (Spec §11) ── */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 10,
          padding: '16px 20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#0F172A' }}>
                ESG REPORTING WORKFLOW PIPELINE
              </span>
              <span style={{
                fontSize: 11,
                background: '#DCFCE7',
                color: '#15803D',
                padding: '1px 8px',
                borderRadius: 9999,
                fontWeight: 700,
                border: '1px solid #BBF7D0'
              }}>
                Aarohan Infrastructure & Energy Group
              </span>
            </div>
            <div style={{ fontSize: 12, color: '#64748B', fontWeight: 500 }}>
              Audit Boundary: <strong>Operational Control (100%)</strong>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8 }}>
            {[
              { label: 'Project Data Collection', status: 'done', note: '250 MW Odisha Solar Park', icon: '✓', route: '/collection' },
              { label: 'Evidence Submitted', status: 'done', note: 'Statutory vouchers attached', icon: '✓', route: '/evidence' },
              { label: 'BU Review & Gate', status: 'done', note: 'Solar EPC review verified', icon: '✓', route: '/workflow' },
              { label: 'Calculation Engine', status: 'done', note: 'GHG emission factors', icon: '✓', route: '/consolidation' },
              { label: 'BU Aggregation', status: 'done', note: 'Solar & Wind BUs rolled up', icon: '✓', route: '/disclosure/bu' },
              { label: 'Subsidiary Aggregation', status: 'done', note: 'Renewable Energy Pvt Ltd', icon: '✓', route: '/disclosure/subsidiary' },
              { label: 'Group Aggregation', status: 'done', note: 'Enterprise post-order roll-up', icon: '✓', route: '/consolidation' },
              { label: 'BRSR Report Ready', status: 'done', note: 'SEBI Core disclosure locked', icon: '✓', route: '/reporting' }
            ].map((st, i) => (
              <div
                key={i}
                onClick={() => navigate(st.route)}
                style={{
                  padding: '9px 12px',
                  borderRadius: 7,
                  border: '1px solid #BBF7D0',
                  background: '#F0FDF4',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#15803D' }}>
                  <span>{st.icon}</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{st.label}</span>
                </div>
                <div style={{ fontSize: 11, color: '#64748B', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {st.note}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Top 3 Executive KPI Cards ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 16
        }}>
          {/* Card 1: DATA COVERAGE */}
          <div className="hover-glow" style={{
            background: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: 8,
            padding: '16px 20px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: 12
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: 'ui-monospace, monospace' }}>
                DATA COVERAGE
              </span>
              <span style={{
                background: '#DCFCE7',
                color: '#15803D',
                fontSize: 11,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 9999,
                border: '1px solid #BBF7D0'
              }}>
                ↗ +4.2% YoY
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 34, fontWeight: 800, color: '#09090B', letterSpacing: '-0.02em', lineHeight: 1 }}>
                {summary?.data_quality_score != null ? summary.data_quality_score : 94.2}<span style={{ fontSize: 22, fontWeight: 600, color: '#64748B' }}>%</span>
              </span>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: '#64748B', fontFamily: 'ui-monospace, monospace' }}>
                {summary?.submission_progress?.total_entities ? `${summary.submission_progress.total_submissions}/${summary.submission_progress.total_entities} entities` : '38/40 projects'}
              </span>
            </div>

            {/* Progress bar */}
            <div>
              <div style={{ height: 4, width: '100%', background: '#F1F5F9', borderRadius: 99, overflow: 'hidden', marginBottom: 8 }}>
                <div style={{ height: '100%', width: `${summary?.data_quality_score ?? 94.2}%`, background: '#0070F3', borderRadius: 99 }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748B' }}>
                <span>Target baseline: 90.0%</span>
                <span style={{ color: '#15803D', fontWeight: 600 }}>Over-indexed (+4.2%)</span>
              </div>
            </div>
          </div>

          {/* Card 2: PENDING REVIEW */}
          <div className="hover-glow" style={{
            background: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: 8,
            padding: '16px 20px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: 12
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: 'ui-monospace, monospace' }}>
                PENDING REVIEW
              </span>
              <span style={{
                background: '#DCFCE7',
                color: '#15803D',
                fontSize: 11,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 9999,
                border: '1px solid #BBF7D0'
              }}>
                ↘ -12% backlog
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontSize: 34, fontWeight: 800, color: '#09090B', letterSpacing: '-0.02em', lineHeight: 1 }}>
                  {summary?.submission_progress?.in_review != null ? summary.submission_progress.in_review : 17}
                </span>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#64748B' }}>
                  {summary?.submission_progress?.in_review === 1 ? 'pack in review' : 'packs in review'}
                </span>
              </div>
              <span style={{
                background: '#FEE2E2',
                color: '#B91C1C',
                fontSize: 11,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 9999,
                border: '1px solid #FECACA'
              }}>
                4 urgent
              </span>
            </div>

            <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748B' }}>
              <span>Infra & Energy sectors</span>
              <span style={{ fontFamily: 'ui-monospace, monospace' }}>avg 18h SLA</span>
            </div>
          </div>

          {/* Card 3: BRSR CORE STATUS */}
          <div className="hover-glow" style={{
            background: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: 8,
            padding: '16px 20px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: 12
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: 'ui-monospace, monospace' }}>
                BRSR CORE STATUS
              </span>
              <span style={{
                background: '#DCFCE7',
                color: '#15803D',
                fontSize: 11,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 9999,
                border: '1px solid #BBF7D0'
              }}>
                ● SEBI Aligned
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontSize: 34, fontWeight: 800, color: '#09090B', letterSpacing: '-0.02em', lineHeight: 1 }}>
                  8
                </span>
                <span style={{ fontSize: 18, fontWeight: 600, color: '#94A3B8' }}>
                  / 8
                </span>
              </div>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: '#15803D' }}>
                100% Attested
              </span>
            </div>

            <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748B' }}>
              <span>Third-party assurance</span>
              <span>Scheduled May 18</span>
            </div>
          </div>
        </div>

        {/* ── Middle 2-Column Section ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1.55fr 1fr',
          gap: 16
        }}>

          {/* ── LEFT COLUMN: ESG Performance & Trajectory ── */}
          <div style={{
            background: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: 8,
            padding: '20px 22px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: 18
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: '#09090B', margin: 0 }}>
                  ESG Performance & Trajectory
                </h2>
                <p style={{ fontSize: 12, color: '#64748B', margin: '3px 0 0' }}>
                  Cross-entity environmental and workforce benchmarks for FY 2026
                </p>
              </div>
              <span
                onClick={() => navigate('/reporting')}
                style={{ fontSize: 11.5, fontWeight: 600, color: '#15803D', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                Methodology audit →
              </span>
            </div>

            {/* Metric 1: Total Energy Consumption */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <Zap size={14} color="#09090B" />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#09090B' }}>
                    Total Energy Consumption
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#09090B', fontFamily: 'ui-monospace, monospace' }}>
                    {displayEnergy}
                  </span>
                  <span style={{
                    background: '#DCFCE7',
                    color: '#15803D',
                    fontSize: 10.5,
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: 4
                  }}>
                    -6.2% vs base
                  </span>
                </div>
              </div>
              {/* Segmented/target progress bar */}
              <div style={{ height: 6, width: '100%', background: '#F1F5F9', borderRadius: 99, overflow: 'hidden', display: 'flex' }}>
                <div style={{ width: '82%', background: '#0070F3' }} />
                <div style={{ width: '6%', background: '#EF4444' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: '#64748B' }}>
                <span>Target: 450.0 GWh (FY End Target)</span>
                <span>Trajectory: On Pace</span>
              </div>
            </div>

            {/* Metric 2: Water Withdrawal & Closed Loop */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <Droplets size={14} color="#09090B" />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#09090B' }}>
                    Water Withdrawal & Closed Loop
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#09090B', fontFamily: 'ui-monospace, monospace' }}>
                    {displayWater}
                  </span>
                  <span style={{
                    background: '#F1F5F9',
                    color: '#475569',
                    fontSize: 10.5,
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: 4
                  }}>
                    84.1% recycled
                  </span>
                </div>
              </div>
              <div style={{ height: 6, width: '100%', background: '#F1F5F9', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: '84.1%', background: '#0070F3', borderRadius: 99 }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: '#64748B' }}>
                <span>Zero untreated discharge mandate</span>
                <span>Closed-loop efficiency: 91%</span>
              </div>
            </div>

            {/* Metric 3: Gross GHG Emissions with segmented scope bar */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              borderTop: '1px solid #F1F5F9',
              paddingTop: 12
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <Cloud size={14} color="#09090B" />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#09090B' }}>
                    Gross GHG Emissions
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{ fontSize: 17, fontWeight: 800, color: '#09090B', fontFamily: 'ui-monospace, monospace' }}>
                    {displayGhg}
                  </span>
                  <span style={{ fontSize: 11, color: '#64748B' }}>tCO₂e</span>
                </div>
              </div>

              {/* Segmented bar */}
              <div style={{ height: 10, width: '100%', background: '#F1F5F9', borderRadius: 3, overflow: 'hidden', display: 'flex' }}>
                <div style={{ width: '40.5%', background: '#0070F3' }} title={`Scope 1: ${displayScope1}`} />
                <div style={{ width: '32.1%', background: '#3B82F6' }} title={`Scope 2: ${displayScope2}`} />
                <div style={{ width: '27.4%', background: '#93C5FD' }} title="Scope 3: 352.7 t" />
              </div>

              {/* Labels */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, fontSize: 10.5 }}>
                <div>
                  <div style={{ color: '#64748B', fontWeight: 600 }}>SCOPE 1 (DIRECT)</div>
                  <div style={{ color: '#09090B', fontWeight: 700, fontFamily: 'ui-monospace, monospace' }}>{displayScope1}</div>
                </div>
                <div>
                  <div style={{ color: '#64748B', fontWeight: 600 }}>SCOPE 2 (GRID)</div>
                  <div style={{ color: '#09090B', fontWeight: 700, fontFamily: 'ui-monospace, monospace' }}>{displayScope2}</div>
                </div>
                <div>
                  <div style={{ color: '#64748B', fontWeight: 600 }}>SCOPE 3 (VALUE)</div>
                  <div style={{ color: '#09090B', fontWeight: 700, fontFamily: 'ui-monospace, monospace' }}>352.7 t</div>
                </div>
              </div>

              <div style={{ textAlign: 'right', marginTop: 2 }}>
                <span
                  onClick={() => openLineage('GHG-SCOPE1-COMB')}
                  style={{ fontSize: 11, fontWeight: 600, color: '#15803D', cursor: 'pointer' }}
                >
                  View calculation lineage →
                </span>
              </div>
            </div>

            {/* Sub-cards row: Waste and Safety */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 12,
              borderTop: '1px solid #F1F5F9',
              paddingTop: 14
            }}>
              <div style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: 6,
                padding: '12px 14px'
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#64748B', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  CIRCULAR WASTE DIVERTED
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: '4px 0 2px' }}>
                  <span style={{ fontSize: 18, fontWeight: 800, color: '#09090B' }}>{displayWaste}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#15803D' }}>Zero-landfill cert</span>
                </div>
                <div style={{ fontSize: 11, color: '#64748B' }}>Industrial hazardous co-processed</div>
              </div>

              <div style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: 6,
                padding: '12px 14px'
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#64748B', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  WORKER SAFETY (LTIFR)
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: '4px 0 2px' }}>
                  <span style={{ fontSize: 18, fontWeight: 800, color: '#09090B' }}>{displayLtifr}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#15803D' }}>{displayFatalities}</span>
                </div>
                <div style={{ fontSize: 11, color: '#64748B' }}>Across 4.2M logged man-hours</div>
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN: Calculation Pipeline & Audit Stream ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Calculation Pipeline Card */}
            <div style={{
              background: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: 8,
              padding: '18px 20px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              gap: 12
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#09090B' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981' }} />
                  <span>Calculation Pipeline</span>
                </div>
                <span style={{ fontSize: 11, color: '#64748B', fontFamily: 'ui-monospace, monospace' }}>
                  Engine v2.1
                </span>
              </div>
              <p style={{ fontSize: 11.5, color: '#64748B', margin: 0, lineHeight: 1.4 }}>
                Distributed GHG protocol emission factor recalculation across scope ledgers.
              </p>

              {/* Steps list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
                {/* Step 1 */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: 4, background: '#DCFCE7',
                    color: '#15803D', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, flexShrink: 0, marginTop: 1
                  }}>
                    ✓
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, color: '#09090B' }}>
                      <span>Project P-103 Highway</span>
                      <span style={{ color: '#15803D', fontSize: 11 }}>Approved</span>
                    </div>
                    <div style={{ fontSize: 10.5, color: '#64748B' }}>
                      Activity data audited & signed off by BU Manager
                    </div>
                  </div>
                </div>

                {/* Step 2 */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: 4, background: '#DCFCE7',
                    color: '#15803D', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, flexShrink: 0, marginTop: 1
                  }}>
                    ✓
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, color: '#09090B' }}>
                      <span>Infrastructure BU Aggregation</span>
                      <span style={{ color: '#15803D', fontSize: 11 }}>Calculated</span>
                    </div>
                    <div style={{ fontSize: 10.5, color: '#64748B' }}>
                      Scope 1 & Scope 2 intensity metrics compiled
                    </div>
                  </div>
                </div>

                {/* Step 3: Running with dark active box */}
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  background: '#F8FAFC',
                  padding: '8px 10px',
                  borderRadius: 6,
                  border: '1px solid #E2E8F0'
                }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: 4, background: '#0070F3',
                    color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, flexShrink: 0, marginTop: 1
                  }}>
                    ◐
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: '#09090B' }}>
                      <span>Odisha Subsidiary Aggregation</span>
                      <span style={{
                        background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE',
                        fontSize: 10, padding: '1px 5px', borderRadius: 3
                      }}>
                        Running (42s)
                      </span>
                    </div>
                    <div style={{ fontSize: 10.5, color: '#64748B', marginTop: 2 }}>
                      Reconciling grid emission factors with CEA v19.0 dataset
                    </div>
                  </div>
                </div>

                {/* Step 4: Queued */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: 4, border: '1px dashed #CBD5E1',
                    color: '#94A3B8', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, flexShrink: 0, marginTop: 1
                  }}>
                    ○
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 500, color: '#64748B' }}>
                      <span>Group Consolidation</span>
                      <span style={{ fontSize: 11, color: '#94A3B8' }}>Queued</span>
                    </div>
                    <div style={{ fontSize: 10.5, color: '#94A3B8' }}>
                      Final inter-company netting and equity share weighting
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 2 }}>
                <span
                  onClick={() => navigate('/consolidation')}
                  style={{ fontSize: 11, fontWeight: 600, color: '#09090B', cursor: 'pointer' }}
                >
                  View calculation pipeline & lineage →
                </span>
              </div>
            </div>

            {/* Audit & Activity Stream Card */}
            <div style={{
              background: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: 8,
              padding: '18px 20px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              gap: 12
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#09090B' }}>
                  Audit & Activity Stream
                </span>
                <span
                  onClick={() => navigate('/audit')}
                  style={{ fontSize: 11, color: '#64748B', cursor: 'pointer' }}
                >
                  Full log
                </span>
              </div>

              {/* Feed items */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  {
                    time: '2m ago',
                    title: 'Project P-103 submitted ESG data',
                    desc: 'Diesel ledger (4,820 L) & Industrial Water draw'
                  },
                  {
                    time: '12m ago',
                    title: 'BU Manager Vikram approved',
                    desc: 'Project P-98 Solar Plant generation figures'
                  },
                  {
                    time: '31m ago',
                    title: 'Calculation run completed',
                    desc: 'Odisha BU consolidated (Methodology v2.1)'
                  },
                  {
                    time: '1h ago',
                    title: 'Evidence uploaded',
                    desc: 'Fuel_Register_April.pdf (AI extracted 12,500 L)'
                  },
                  {
                    time: '2h ago',
                    title: 'Subsidiary BRSR draft generated',
                    desc: 'Energy Systems compiled for compliance lead review'
                  }
                ].map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 11 }}>
                    <span style={{ width: 44, color: '#94A3B8', fontFamily: 'ui-monospace, monospace', flexShrink: 0 }}>
                      {item.time}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: '#09090B' }}>
                        ● {item.title}
                      </div>
                      <div style={{ color: '#64748B', fontFamily: 'ui-monospace, monospace', fontSize: 10.5, marginTop: 1 }}>
                        {item.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Lower Section: Reporting Coverage by Subsidiary ── */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E5E7EB',
          borderRadius: 8,
          padding: '20px 22px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#09090B', margin: 0 }}>
                Reporting Coverage by Subsidiary
              </h2>
              <p style={{ fontSize: 12, color: '#64748B', margin: '3px 0 0' }}>
                Consolidated BRSR principle alignment and document completeness
              </p>
            </div>
            <span style={{
              background: '#F1F5F9',
              color: '#475569',
              fontSize: 11,
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: 4,
              border: '1px solid #E2E8F0'
            }}>
              4 Operating Units
            </span>
          </div>

          {/* Clean Enterprise Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead>
                <tr style={{
                  borderBottom: '1px solid #E5E7EB',
                  color: '#64748B',
                  fontSize: 10.5,
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase'
                }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>ENTITY NAME</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>TYPE</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center' }}>DATA COVERAGE</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center' }}>EVIDENCE FILES</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center' }}>REVIEW STATUS</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {operatingUnits.map((row, idx) => {
                  const RowIcon = row.icon;
                  return (
                    <tr
                      key={idx}
                      style={{
                        borderBottom: '1px solid #F1F5F9',
                        transition: 'background 120ms ease'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '12px', fontWeight: 600, color: '#09090B' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <RowIcon size={14} color="#64748B" />
                          <span>{row.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px', color: '#64748B' }}>
                        {row.type}
                      </td>
                      <td style={{
                        padding: '12px',
                        textAlign: 'center',
                        fontWeight: 700,
                        color: row.isWarning ? '#DC2626' : (row.coverage === '100%' ? '#15803D' : '#09090B'),
                        fontFamily: 'ui-monospace, monospace'
                      }}>
                        {row.coverage}
                      </td>
                      <td style={{
                        padding: '12px',
                        textAlign: 'center',
                        color: row.isWarning ? '#DC2626' : '#64748B',
                        fontFamily: 'ui-monospace, monospace'
                      }}>
                        {row.evidence}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <span style={{
                          background: row.statusType === 'success' ? '#DCFCE7' : row.statusType === 'danger' ? '#FEE2E2' : '#F1F5F9',
                          color: row.statusType === 'success' ? '#15803D' : row.statusType === 'danger' ? '#B91C1C' : '#475569',
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 9999,
                          border: `1px solid ${row.statusType === 'success' ? '#BBF7D0' : row.statusType === 'danger' ? '#FECACA' : '#E2E8F0'}`
                        }}>
                          ● {row.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        <span
                          onClick={() => navigate(row.route)}
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: row.isWarning ? '#DC2626' : '#09090B',
                            cursor: 'pointer'
                          }}
                        >
                          {row.action}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Bottom Notice Banner: Data Quality Notice ── */}
        <div style={{
          background: '#FEF2F2',
          border: '1px solid #FECACA',
          borderRadius: 8,
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: '#FEE2E2',
              color: '#DC2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <AlertCircle size={16} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#991B1B' }}>
                Data Quality Notice: 12 missing evidence files and 4 flagged variances across Manufacturing
              </div>
              <div style={{ fontSize: 11.5, color: '#B91C1C', marginTop: 1 }}>
                Variances exceed 5% standard deviation against the previous reporting cycle.
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate('/data-quality')}
            style={{
              background: '#0070F3',
              color: '#FFFFFF',
              border: 'none',
              padding: '8px 16px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 1px 2px rgba(0, 112, 243, 0.2)'
            }}
          >
            <span>Review 16 items in Data Quality</span>
            <span>→</span>
          </button>
        </div>

      </div>

      {/* 4-Tier Lineage Drawer */}
      <DataLineageDrawer
        isOpen={lineageDrawerOpen}
        onClose={() => setLineageDrawerOpen(false)}
        metricCode={lineageMetricCode}
        periodId={currentPeriodId}
      />
    </div>
  );
}
