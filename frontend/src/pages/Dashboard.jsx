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
import ProjectSummary from './ProjectSummary';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: periods = [] } = useOrgPeriods();
  const { data: nodes = [] } = useOrgNodes();

  // Phase 11: Project Admin sees project BRSR disclosure as their Overview
  if (user?.role === 'project_admin') {
    return <ProjectSummary />;
  }

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

  const selectedNode = nodes.find(n => n.id === activeEntityId) || rootNode;
  const isRailwayProject = Boolean(
    selectedNode && (
      (selectedNode.name || '').toLowerCase().includes('railway') ||
      (selectedNode.code || '').toLowerCase().includes('railway') ||
      (selectedNode.code || '').includes('--6477')
    )
  );

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

  const displayEnergy = !isRailwayProject && envKpis.total_energy_gj != null && envKpis.total_energy_gj > 0
    ? `${Number(envKpis.total_energy_gj).toLocaleString()} GJ`
    : '—';

  const displayWater = !isRailwayProject && envKpis.water_consumption_kl != null && envKpis.water_consumption_kl > 0
    ? `${Number(envKpis.water_consumption_kl).toLocaleString()} kL`
    : '—';

  const displayGhg = !isRailwayProject && envKpis.total_ghg_tco2e != null && envKpis.total_ghg_tco2e > 0
    ? Number(envKpis.total_ghg_tco2e).toLocaleString()
    : '—';

  const displayScope1 = !isRailwayProject && envKpis.scope1_emissions_tco2e != null && envKpis.scope1_emissions_tco2e > 0
    ? `${Number(envKpis.scope1_emissions_tco2e).toLocaleString()} t`
    : '—';

  const displayScope2 = !isRailwayProject && envKpis.scope2_emissions_tco2e != null && envKpis.scope2_emissions_tco2e > 0
    ? `${Number(envKpis.scope2_emissions_tco2e).toLocaleString()} t`
    : '—';

  const displayLtifr = !isRailwayProject && socKpis.ltifr != null && socKpis.ltifr > 0 ? Number(socKpis.ltifr).toFixed(2) : '—';
  const displayFatalities = !isRailwayProject && socKpis.fatalities != null ? `${socKpis.fatalities} Fatalities` : '0 Fatalities';
  const displayWaste = !isRailwayProject && envKpis.waste_generated_mt != null && envKpis.waste_generated_mt > 0
    ? `${Number(envKpis.waste_generated_mt).toLocaleString()} MT`
    : '—';

  const operatingUnits = React.useMemo(() => {
    const icons = [Building2, Factory, HardHat, Truck];
    if (summary?.operating_units && summary.operating_units.length > 0) {
      return summary.operating_units.map((unit, idx) => ({
        icon: icons[idx % icons.length],
        name: unit.name,
        type: unit.type,
        coverage: `${unit.coverage_pct}%`,
        coveragePct: Number(unit.coverage_pct || 0),
        evidence: unit.evidence || '0/0',
        status: unit.status || 'Draft',
        statusType: unit.statusType || 'neutral',
        action: 'Inspect ›',
        route: unit.route || '#'
      }));
    }

    const subNodes = nodes.filter(n => ['subsidiary', 'business_unit', 'bu', 'project'].includes(n.type?.toLowerCase()));
    if (subNodes.length > 0) {
      return subNodes.map((node, idx) => {
        const pct = summary?.submission_progress?.overall_progress_pct != null ? summary.submission_progress.overall_progress_pct : 0;
        return {
          icon: icons[idx % icons.length],
          name: node.name,
          type: node.type?.toUpperCase() === 'BU' ? 'Business Unit' : (node.type?.toUpperCase() === 'PROJECT' ? 'Project Site' : 'Subsidiary Entity'),
          coverage: `${pct}%`,
          coveragePct: Number(pct),
          evidence: summary?.submission_progress ? `${summary.submission_progress.approved}/${summary.submission_progress.total_entities || 1}` : '0/0',
          status: summary?.submission_progress?.in_review > 0 ? 'In Review' : (summary?.submission_progress?.approved > 0 ? 'Ready' : 'Draft'),
          statusType: summary?.submission_progress?.in_review > 0 ? 'neutral' : (summary?.submission_progress?.approved > 0 ? 'success' : 'neutral'),
          action: 'Inspect ›',
          route: node.type?.toLowerCase() === 'project' ? `/projects/${node.id}` : `/disclosure/bu?nodeId=${node.id}`
        };
      });
    }
    return [];
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
                  cursor: 'pointer',
                  maxWidth: '240px'
                }}
              >
                {/* Enterprise Group */}
                {nodes.filter(n => n.type === 'group' || n.is_root).map(g => (
                  <option key={g.id} value={g.id}>{g.name} (GROUP)</option>
                ))}

                {/* Subsidiaries */}
                {nodes.filter(n => n.type === 'subsidiary').length > 0 && (
                  <optgroup label="Subsidiaries">
                    {nodes.filter(n => n.type === 'subsidiary').map(s => (
                      <option key={s.id} value={s.id}>{s.name} (SUBSIDIARY)</option>
                    ))}
                  </optgroup>
                )}

                {/* Business Units and their nested Projects */}
                {nodes.filter(n => ['business_unit', 'bu'].includes(n.type?.toLowerCase())).map(bu => {
                  const buProjects = nodes.filter(p => ['project', 'site', 'plant'].includes(p.type?.toLowerCase()) && p.parent_id === bu.id);
                  return (
                    <optgroup key={bu.id} label={`BU: ${bu.name}`}>
                      <option value={bu.id}>{bu.name} (Entire BU)</option>
                      {buProjects.map(p => (
                        <option key={p.id} value={p.id}>↳ Project: {p.name}</option>
                      ))}
                    </optgroup>
                  );
                })}
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
                {selectedNode?.name || summary?.entity_name || 'Aarohan Infrastructure & Energy Group'}
              </span>
            </div>
            <div style={{ fontSize: 12, color: '#64748B', fontWeight: 500 }}>
              Audit Boundary: <strong>Operational Control (100%)</strong>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8 }}>
            {[
              { label: 'Project Data Collection', status: isRailwayProject ? 'pending' : 'done', note: selectedNode?.name || '250 MW Odisha Solar Park', icon: isRailwayProject ? '○' : '✓', route: '/collection' },
              { label: 'Evidence Submitted', status: isRailwayProject ? 'pending' : 'done', note: isRailwayProject ? 'Awaiting initial vouchers' : 'Statutory vouchers attached', icon: isRailwayProject ? '○' : '✓', route: '/evidence' },
              { label: 'BU Review & Gate', status: isRailwayProject ? 'pending' : 'done', note: isRailwayProject ? 'Pending review' : 'Review gate verified', icon: isRailwayProject ? '○' : '✓', route: '/workflow' },
              { label: 'Calculation Engine', status: isRailwayProject ? 'pending' : 'done', note: 'GHG emission factors', icon: isRailwayProject ? '○' : '✓', route: '/consolidation' },
              { label: 'BU Aggregation', status: isRailwayProject ? 'pending' : 'done', note: 'Operating BUs rolled up', icon: isRailwayProject ? '○' : '✓', route: '/disclosure/bu' },
              { label: 'Subsidiary Aggregation', status: isRailwayProject ? 'pending' : 'done', note: 'Corporate entity roll-up', icon: isRailwayProject ? '○' : '✓', route: '/disclosure/subsidiary' },
              { label: 'Group Aggregation', status: isRailwayProject ? 'pending' : 'done', note: 'Enterprise post-order roll-up', icon: isRailwayProject ? '○' : '✓', route: '/consolidation' },
              { label: 'BRSR Report Ready', status: isRailwayProject ? 'pending' : 'done', note: isRailwayProject ? 'Awaiting disclosures' : 'SEBI Core disclosure locked', icon: isRailwayProject ? '○' : '✓', route: '/reporting' }
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
                {summary?.data_coverage_pct != null ? summary.data_coverage_pct : (summary?.data_quality_score != null ? summary.data_quality_score : 0)}<span style={{ fontSize: 22, fontWeight: 600, color: '#64748B' }}>%</span>
              </span>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: '#64748B', fontFamily: 'ui-monospace, monospace' }}>
                {summary?.submission_progress?.total_entities ? `${summary.submission_progress.total_submissions}/${summary.submission_progress.total_entities} entities` : '0/0 entities'}
              </span>
            </div>

            {/* Progress bar */}
            <div>
              <div style={{ height: 4, width: '100%', background: '#F1F5F9', borderRadius: 99, overflow: 'hidden', marginBottom: 8 }}>
                <div style={{ height: '100%', width: `${summary?.data_coverage_pct ?? summary?.data_quality_score ?? 0}%`, background: '#0070F3', borderRadius: 99 }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748B' }}>
                <span>Target baseline: 90.0%</span>
                <span style={{ color: ((summary?.data_coverage_pct ?? summary?.data_quality_score ?? 0) >= 70) ? '#15803D' : '#D97706', fontWeight: 600 }}>
                  {(summary?.data_coverage_pct ?? summary?.data_quality_score ?? 0) >= 90 ? 'Aligned with SEBI standard' : ((summary?.data_coverage_pct ?? summary?.data_quality_score ?? 0) >= 70 ? 'On pace to target' : 'Data collection pending')}
                </span>
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
                background: (summary?.submission_progress?.in_review ?? 0) > 0 ? '#FEF3C7' : '#DCFCE7',
                color: (summary?.submission_progress?.in_review ?? 0) > 0 ? '#92400E' : '#15803D',
                fontSize: 11,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 9999,
                border: `1px solid ${(summary?.submission_progress?.in_review ?? 0) > 0 ? '#FDE68A' : '#BBF7D0'}`
              }}>
                {(summary?.submission_progress?.in_review ?? 0) > 0 ? `${summary.submission_progress.in_review} queued` : 'Queue cleared'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontSize: 34, fontWeight: 800, color: '#09090B', letterSpacing: '-0.02em', lineHeight: 1 }}>
                  {summary?.submission_progress?.in_review != null ? summary.submission_progress.in_review : 0}
                </span>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#64748B' }}>
                  {summary?.submission_progress?.in_review === 1 ? 'pack in review' : 'packs in review'}
                </span>
              </div>
              {summary?.submission_progress?.draft > 0 && (
                <span style={{
                  background: '#F1F5F9',
                  color: '#475569',
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 9999,
                  border: '1px solid #E2E8F0'
                }}>
                  {summary.submission_progress.draft} draft
                </span>
              )}
            </div>

            <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748B' }}>
              <span>{summary?.submission_progress?.approved ?? 0} approved submissions</span>
              <span style={{ fontFamily: 'ui-monospace, monospace' }}>{summary?.submission_progress?.overall_progress_pct ?? 0}% complete</span>
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
                background: (summary?.submission_progress?.approved ?? 0) > 0 ? '#DCFCE7' : '#F1F5F9',
                color: (summary?.submission_progress?.approved ?? 0) > 0 ? '#15803D' : '#64748B',
                fontSize: 11,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 9999,
                border: `1px solid ${(summary?.submission_progress?.approved ?? 0) > 0 ? '#BBF7D0' : '#E2E8F0'}`
              }}>
                {(summary?.submission_progress?.approved ?? 0) > 0 ? '● SEBI Aligned' : '● Submissions Pending'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontSize: 34, fontWeight: 800, color: '#09090B', letterSpacing: '-0.02em', lineHeight: 1 }}>
                  {summary?.principles ? summary.principles.filter(p => p.reported_metrics > 0).length : 0}
                </span>
                <span style={{ fontSize: 18, fontWeight: 600, color: '#94A3B8' }}>
                  / {summary?.principles ? summary.principles.length : 9}
                </span>
              </div>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: (summary?.submission_progress?.overall_progress_pct ?? 0) > 0 ? '#15803D' : '#64748B' }}>
                {summary?.submission_progress?.overall_progress_pct ?? 0}% Attested
              </span>
            </div>

            <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748B' }}>
              <span>Assurance readiness</span>
              <span>{summary?.assurance_score != null && summary.assurance_score > 0 ? `${summary.assurance_score}% (Ready)` : (summary?.data_quality_grade ? `Grade ${summary.data_quality_grade}` : 'In progress')}</span>
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
                <div style={{ width: (!isRailwayProject && envKpis.total_energy_gj > 0) ? '82%' : '0%', background: '#0070F3' }} />
                <div style={{ width: (!isRailwayProject && envKpis.total_energy_gj > 0) ? '6%' : '0%', background: '#EF4444' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: '#64748B' }}>
                <span>Target: 450.0 GWh (FY End Target)</span>
                <span>{isRailwayProject ? 'Trajectory: No Data' : 'Trajectory: On Pace'}</span>
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
                    {isRailwayProject ? '—' : '84.1% recycled'}
                  </span>
                </div>
              </div>
              <div style={{ height: 6, width: '100%', background: '#F1F5F9', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: (!isRailwayProject && envKpis.water_consumption_kl > 0) ? '84.1%' : '0%', background: '#0070F3', borderRadius: 99 }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: '#64748B' }}>
                <span>Zero untreated discharge mandate</span>
                <span>{isRailwayProject ? 'Closed-loop efficiency: —' : 'Closed-loop efficiency: 91%'}</span>
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
                <div style={{ width: (!isRailwayProject && envKpis.total_ghg_tco2e > 0) ? '40.5%' : '0%', background: '#0070F3' }} title={`Scope 1: ${displayScope1}`} />
                <div style={{ width: (!isRailwayProject && envKpis.total_ghg_tco2e > 0) ? '32.1%' : '0%', background: '#3B82F6' }} title={`Scope 2: ${displayScope2}`} />
                <div style={{ width: (!isRailwayProject && envKpis.total_ghg_tco2e > 0) ? '27.4%' : '0%', background: '#93C5FD' }} title="Scope 3" />
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
                  <div style={{ color: '#09090B', fontWeight: 700, fontFamily: 'ui-monospace, monospace' }}>{isRailwayProject ? '—' : '352.7 t'}</div>
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
              {operatingUnits.length} Operating Unit{operatingUnits.length !== 1 ? 's' : ''}
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
                {operatingUnits.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '32px 12px', textAlign: 'center', color: '#64748B' }}>
                      No operating units found under this entity scope.
                    </td>
                  </tr>
                ) : operatingUnits.map((row, idx) => {
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
                        color: row.coveragePct >= 70 ? '#15803D' : (row.coveragePct > 0 ? '#09090B' : '#94A3B8'),
                        fontFamily: 'ui-monospace, monospace'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                          <span>{row.coverage}</span>
                          <div style={{ width: 44, height: 5, background: '#E2E8F0', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{
                              width: `${Math.min(row.coveragePct || 0, 100)}%`,
                              height: '100%',
                              background: (row.coveragePct || 0) >= 80 ? '#10B981' : ((row.coveragePct || 0) > 0 ? '#0070F3' : '#CBD5E1')
                            }} />
                          </div>
                        </div>
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
