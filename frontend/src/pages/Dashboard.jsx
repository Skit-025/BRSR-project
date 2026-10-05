import React, { useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar,
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend
} from 'recharts';
import {
  TrendingUp, AlertTriangle, CheckCircle, Clock,
  Building2, FileText, Shield, BarChart3, ArrowUpRight, Zap, RefreshCw, Award, Activity
} from 'lucide-react';
import { useDashboardSummary, useOrgPeriods, useOrgNodes } from '../hooks/useApi';

export default function Dashboard() {
  const { data: periods = [] } = useOrgPeriods();
  const { data: nodes = [] } = useOrgNodes();

  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [selectedEntity, setSelectedEntity] = useState('');

  // Default to first period and root group entity if not set
  const activePeriodId = selectedPeriod || (periods.length > 0 ? periods[0].id : '');
  const activeEntityId = selectedEntity || (nodes.length > 0 ? nodes.find(n => n.type === 'group')?.id || nodes[0].id : '');

  const { data: summary, isLoading, refetch, isRefetching } = useDashboardSummary(activePeriodId, activeEntityId);

  const subProgress = summary?.submission_progress || {
    total_entities: 0,
    total_submissions: 0,
    approved: 0,
    in_review: 0,
    draft: 0,
    rejected: 0,
    overall_progress_pct: 0,
  };

  const envKpis = summary?.key_environmental_kpis || {
    total_energy_gj: 0,
    scope1_emissions_tco2e: 0,
    scope2_emissions_tco2e: 0,
    total_ghg_tco2e: 0,
    water_consumption_kl: 0,
    waste_generated_mt: 0,
  };

  const socKpis = summary?.key_social_kpis || {
    ltifr: 0,
    fatalities: 0,
    total_employees: 0,
  };

  const principles = summary?.principles || [];

  const chartData = principles.map(p => ({
    name: `P${p.principle}`,
    total: p.total_metrics,
    reported: p.reported_metrics,
    quality: p.data_quality_score,
  }));

  return (
    <div className="page-content anim-fade">
      {/* Top Banner / Filter Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
            Executive ESG & BRSR Dashboard
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '4px 0 0 0' }}>
            Real-time multi-tier consolidation and SEBI Core compliance analytics.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Period selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Period:</span>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="select-input"
              style={{ padding: '6px 12px', borderRadius: '6px', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', fontSize: '13px' }}
            >
              {periods.map(p => (
                <option key={p.id} value={p.id}>{p.code} ({p.status})</option>
              ))}
            </select>
          </div>

          {/* Entity selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Entity:</span>
            <select
              value={selectedEntity}
              onChange={(e) => setSelectedEntity(e.target.value)}
              className="select-input"
              style={{ padding: '6px 12px', borderRadius: '6px', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', fontSize: '13px' }}
            >
              {nodes.map(n => (
                <option key={n.id} value={n.id}>{n.name} [{n.type.toUpperCase()}]</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '6px' }}
          >
            <RefreshCw size={13} className={isRefetching ? 'spin' : ''} />
            {isRefetching ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {/* Quality Score */}
        <div className="card" style={{ padding: '18px', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-default)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Data Quality Score</span>
            <Award size={18} color="var(--brand-400)" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-primary)' }}>
              {summary ? summary.data_quality_score : '--'}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--brand-400)', fontWeight: 700 }}>
              Grade {summary ? summary.data_quality_grade : 'N/A'}
            </span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px' }}>
            Weighted integrity & primary evidence index
          </div>
        </div>

        {/* Total GHG */}
        <div className="card" style={{ padding: '18px', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-default)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Total GHG Emissions</span>
            <Zap size={18} color="#f59e0b" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-primary)' }}>
              {envKpis.total_ghg_tco2e.toLocaleString()}
            </span>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>tCO₂e</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '6px' }}>
            Scope 1: {envKpis.scope1_emissions_tco2e.toLocaleString()} | Scope 2: {envKpis.scope2_emissions_tco2e.toLocaleString()}
          </div>
        </div>

        {/* Energy Consumption */}
        <div className="card" style={{ padding: '18px', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-default)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Energy Consumption</span>
            <TrendingUp size={18} color="#10b981" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-primary)' }}>
              {envKpis.total_energy_gj.toLocaleString()}
            </span>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>GJ</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '6px' }}>
            Fuel + Purchased Grid Electricity (CEA v20)
          </div>
        </div>

        {/* Safety & Workforce */}
        <div className="card" style={{ padding: '18px', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-default)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Safety & LTIFR</span>
            <Shield size={18} color="#38bdf8" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-primary)' }}>
              {socKpis.ltifr}
            </span>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>/ 1M hrs</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '6px' }}>
            Fatalities: {socKpis.fatalities} | Total Workforce: {socKpis.total_employees.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Progress & Submission Funnel */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        {/* Submission Funnel Card */}
        <div className="card" style={{ padding: '20px', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-default)' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={16} color="var(--brand-400)" />
            Submission Completion Funnel
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Overall Approved Progress</span>
            <span style={{ fontSize: '16px', fontWeight: '700', color: '#10b981' }}>{subProgress.overall_progress_pct}%</span>
          </div>
          <div style={{ width: '100%', height: '8px', background: 'var(--bg-elevated)', borderRadius: '4px', overflow: 'hidden', marginBottom: '20px' }}>
            <div style={{ width: `${subProgress.overall_progress_pct}%`, height: '100%', background: '#10b981', transition: 'width 0.5s ease' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', textAlign: 'center' }}>
            <div style={{ padding: '10px', background: 'var(--bg-elevated)', borderRadius: '8px' }}>
              <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>{subProgress.total_submissions}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Total Packs</div>
            </div>
            <div style={{ padding: '10px', background: 'var(--bg-elevated)', borderRadius: '8px' }}>
              <div style={{ fontSize: '18px', fontWeight: '700', color: '#10b981' }}>{subProgress.approved}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Approved</div>
            </div>
            <div style={{ padding: '10px', background: 'var(--bg-elevated)', borderRadius: '8px' }}>
              <div style={{ fontSize: '18px', fontWeight: '700', color: '#f59e0b' }}>{subProgress.in_review}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>In Review</div>
            </div>
            <div style={{ padding: '10px', background: 'var(--bg-elevated)', borderRadius: '8px' }}>
              <div style={{ fontSize: '18px', fontWeight: '700', color: '#64748b' }}>{subProgress.draft}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Draft</div>
            </div>
          </div>
        </div>

        {/* Principle Coverage Chart */}
        <div className="card" style={{ padding: '20px', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-default)' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart3 size={16} color="var(--brand-400)" />
            BRSR Principles 1 - 9 Metric Coverage
          </h3>
          <div style={{ height: '200px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" opacity={0.5} />
                <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={11} />
                <YAxis stroke="var(--text-secondary)" fontSize={11} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: '8px', color: 'var(--text-primary)' }}
                />
                <Bar dataKey="total" fill="var(--brand-400)" name="Total Metrics" radius={[4, 4, 0, 0]} />
                <Bar dataKey="quality" fill="#10b981" name="Quality Score" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Principles Grid */}
      <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', color: 'var(--text-primary)' }}>
        National Guidelines for Responsible Business Conduct (NGRBC Principles)
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
        {principles.map((p) => (
          <div key={p.principle} className="card" style={{ padding: '16px', background: 'var(--bg-card)', borderRadius: '10px', border: '1px solid var(--border-default)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontWeight: '700', fontSize: '14px', color: 'var(--brand-400)' }}>Principle {p.principle}</span>
              <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                {p.reported_metrics} / {p.total_metrics} Metrics
              </span>
            </div>
            <div style={{ width: '100%', height: '6px', background: 'var(--bg-elevated)', borderRadius: '3px', overflow: 'hidden', margin: '8px 0' }}>
              <div style={{ width: `${p.completion_percentage}%`, height: '100%', background: 'var(--brand-400)' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)' }}>
              <span>Completion: {p.completion_percentage}%</span>
              <span>Data Quality: {p.data_quality_score}/100</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
