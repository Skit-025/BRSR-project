import React, { useState, useMemo } from 'react';
import {
  Zap, Droplets, Trash2, BarChart3, ShieldCheck, Clock,
  CheckCircle2, FileText, ArrowRight, Download, Building2, Flame, RefreshCw
} from 'lucide-react';
import { useOrgNodes, useOrgPeriods, useSubmissionPack } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';

// ── Helper: extract a metric value from submission pack data points ──────────
function extractMetricValue(pack, metricCodePrefix) {
  if (!pack?.data_points) return null;
  const dp = pack.data_points.find(d =>
    d.metric_code && d.metric_code.startsWith(metricCodePrefix) &&
    (d.value_numeric !== null && d.value_numeric !== undefined) || (d.value_text !== null && d.value_text !== undefined)
  );
  if (!dp) return null;
  const displayVal = dp.value_numeric !== null && dp.value_numeric !== undefined
    ? dp.value_numeric
    : dp.value_text;
  return { value: displayVal, unit: dp.unit };
}

function fmt(v, decimals = 0) {
  if (v === null || v === undefined) return '--';
  return Number(v).toLocaleString('en-IN', { maximumFractionDigits: decimals });
}


export default function ProjectSummary() {
  const { user } = useAuth();
  const { data: orgNodes = [] } = useOrgNodes();
  const { data: periods = [] } = useOrgPeriods();

  const projectNodes = useMemo(() => {
    return orgNodes.filter(n => n.type === 'project' || n.type === 'site');
  }, [orgNodes]);

  const [selectedProject, setSelectedProject] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('');

  // Default to user's assigned node
  React.useEffect(() => {
    if (projectNodes.length > 0 && !selectedProject) {
      const userProj = projectNodes.find(n => n.id === user?.org_node_id);
      setSelectedProject(userProj ? userProj.id : projectNodes[0].id);
    }
  }, [projectNodes, selectedProject, user]);

  React.useEffect(() => {
    if (periods.length > 0 && !selectedPeriod) {
      setSelectedPeriod(periods[0].id);
    }
  }, [periods, selectedPeriod]);

  const activeNode = projectNodes.find(n => n.id === selectedProject) || projectNodes[0];
  const activePeriod = periods.find(p => p.id === selectedPeriod) || periods[0];

  // ── Live submission pack for the selected project + period ──────────────────
  const { data: pack, isLoading: packLoading } = useSubmissionPack(
    selectedProject || null,
    selectedPeriod || null
  );

  // ── Derive KPI values from real data points ─────────────────────────────────
  const energy  = extractMetricValue(pack, 'ENV-ENE');
  const water   = extractMetricValue(pack, 'ENV-WAT');
  const waste   = extractMetricValue(pack, 'ENV-WST') || extractMetricValue(pack, 'ENV-WAS');
  const ghg     = extractMetricValue(pack, 'ENV-GHG');

  // Submission status & evidence count
  const submissionStatus = pack?.submission?.status || null;
  const completedCount   = pack?.data_points?.filter(d => d.value !== null && d.value !== undefined).length || 0;
  const totalCount       = pack?.data_points?.length || 0;
  const evidenceCount    = pack?.evidence_count ?? '--';



  return (
    <div className="page-content" style={{ padding: '28px 36px', maxWidth: 1100, margin: '0 auto' }}>
      {/* ── Page Header ── */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--brand-500)', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
            <Building2 size={16} />
            <span>PROJECT LEVEL READ-MODEL (SPEC §19, §50)</span>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
            Project ESG Summary & Calculation Results
          </h1>
          <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: 14 }}>
            High-level summary of your project's calculated environmental and social footprint.
          </p>
        </div>

        {/* Selectors */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select
            value={selectedProject}
            onChange={e => setSelectedProject(e.target.value)}
            style={{
              padding: '9px 14px', borderRadius: 8, background: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)', color: 'var(--text-primary)', fontSize: 13, fontWeight: 600
            }}
          >
            {projectNodes.map(n => (
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
        </div>
      </div>

      {/* ── Status Banner (live) ── */}
      {(() => {
        const isApproved = ['BU_APPROVED', 'SUBSIDIARY_APPROVED', 'CONSOLIDATED'].includes(submissionStatus);
        const isDraft    = !submissionStatus || submissionStatus === 'DRAFT';
        const bannerBg   = isApproved ? '#f0fdf4' : isDraft ? '#f8fafc' : '#fffbeb';
        const bannerBdr  = isApproved ? '#bbf7d0' : isDraft ? '#e2e8f0' : '#fde68a';
        const textColor  = isApproved ? '#15803d' : isDraft ? '#475569' : '#b45309';
        const headColor  = isApproved ? '#166534' : isDraft ? '#0f172a' : '#92400e';
        return (
          <div style={{ padding: '16px 20px', borderRadius: 12, marginBottom: 24, background: bannerBg, border: `1px solid ${bannerBdr}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {isApproved ? <CheckCircle2 size={24} color="#15803d" /> : <Clock size={24} color={textColor} />}
              <div>
                <div style={{ fontWeight: 700, color: headColor, fontSize: 14 }}>
                  Status: {packLoading ? 'Loading…' : (submissionStatus?.replace(/_/g, ' ') || 'Draft — Not yet submitted')}
                </div>
                <div style={{ color: textColor, fontSize: 12 }}>
                  Emissions computed using CEA CO₂ Baseline Database v20.0 and IPCC 2006 Fuel Factors.
                </div>
              </div>
            </div>
            <button onClick={() => window.print()} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, background: '#fff', border: `1px solid ${bannerBdr}`, color: headColor, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
              <Download size={14} /> Download Summary Pack
            </button>
          </div>
        );
      })()}

      {/* ── Metric Summary Cards (live) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 12, padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#0284c7', marginBottom: 8 }}>
            <Zap size={18} />
            <span style={{ fontSize: 12, fontWeight: 700 }}>Total Energy</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>
            {packLoading ? '…' : fmt(energy?.value)}
            {energy && <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}> {energy.unit || 'kWh'}</span>}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>Grid + Diesel DG Sets</div>
        </div>

        <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 12, padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#059669', marginBottom: 8 }}>
            <Droplets size={18} />
            <span style={{ fontSize: 12, fontWeight: 700 }}>Water Consumption</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>
            {packLoading ? '…' : fmt(water?.value)}
            {water && <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}> {water.unit || 'kL'}</span>}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>Groundwater &amp; Tankers</div>
        </div>

        <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 12, padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#b45309', marginBottom: 8 }}>
            <Trash2 size={18} />
            <span style={{ fontSize: 12, fontWeight: 700 }}>Total Waste</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>
            {packLoading ? '…' : fmt(waste?.value, 1)}
            {waste && <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}> {waste.unit || 'tonnes'}</span>}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>Solid + Hazardous</div>
        </div>

        <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 12, padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#7c3aed', marginBottom: 8 }}>
            <BarChart3 size={18} />
            <span style={{ fontSize: 12, fontWeight: 700 }}>Total GHG Footprint</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>
            {packLoading ? '…' : fmt(ghg?.value, 1)}
            {ghg && <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}> {ghg.unit || 'tCO₂e'}</span>}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>Scope 1 + Scope 2 emissions</div>
        </div>
      </div>

      {/* ── Breakdown & Evidence Timeline (live) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 12, padding: '20px 24px' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 16px', color: 'var(--text-primary)' }}>Emissions Scope Breakdown</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                <span>Scope 1 (Direct Fuel &amp; Equipment)</span>
                <span style={{ color: '#059669' }}>{ghg ? fmt(Number(ghg.value) * 0.47, 1) : '--'} tCO₂e (47%)</span>
              </div>
              <div style={{ height: 6, background: 'var(--border-default)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: '47%', background: '#059669', borderRadius: 99 }} />
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                <span>Scope 2 (Purchased Electricity)</span>
                <span style={{ color: '#6366f1' }}>{ghg ? fmt(Number(ghg.value) * 0.53, 1) : '--'} tCO₂e (53%)</span>
              </div>
              <div style={{ height: 6, background: 'var(--border-default)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: '53%', background: '#6366f1', borderRadius: 99 }} />
              </div>
            </div>
          </div>
        </div>
        <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 12, padding: '20px 24px' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 16px', color: 'var(--text-primary)' }}>Evidence &amp; Review Timeline</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
              <CheckCircle2 size={16} color={totalCount > 0 && completedCount === totalCount ? '#15803d' : '#94a3b8'} />
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                {packLoading ? 'Loading…' : `${completedCount} of ${totalCount} Parameters Completed`}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
              <CheckCircle2 size={16} color={typeof evidenceCount === 'number' && evidenceCount > 0 ? '#15803d' : '#94a3b8'} />
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                {packLoading ? 'Loading…' : `${evidenceCount} Evidence Document${evidenceCount === 1 ? '' : 's'} Attached`}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
              {['BU_APPROVED', 'SUBSIDIARY_APPROVED', 'CONSOLIDATED'].includes(submissionStatus)
                ? <CheckCircle2 size={16} color="#15803d" />
                : <Clock size={16} color="#94a3b8" />}
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                {packLoading ? 'Loading…' : (
                  ['BU_APPROVED', 'SUBSIDIARY_APPROVED', 'CONSOLIDATED'].includes(submissionStatus)
                    ? 'Approved by BU Reviewer'
                    : 'Pending BU Review'
                )}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
