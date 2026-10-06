import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Download, ArrowUpRight, ArrowDownRight, CheckCircle2,
  Clock, AlertTriangle, Layers, Building2, TrendingUp,
  FileText, ExternalLink, Calendar, ShieldCheck
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar,
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';
import {
  useSubsidiariesHealth,
  useActivityFeed,
  useProjects
} from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import CalculationLineageModal from '../components/CalculationLineageModal';

// Clean monochrome & restrained accent chart colors
const ENERGY_DATA = [
  { month: 'Apr', renewable: 4200, fossil: 8100 },
  { month: 'May', renewable: 4800, fossil: 7900 },
  { month: 'Jun', renewable: 5400, fossil: 7600 },
  { month: 'Jul', renewable: 5900, fossil: 7100 },
  { month: 'Aug', renewable: 6300, fossil: 6800 },
  { month: 'Sep', renewable: 6800, fossil: 6400 },
];

const EMISSIONS_DATA = [
  { category: 'Diesel (Scope 1)', emissions: 412.6 },
  { category: 'Grid Power (Scope 2)', emissions: 548.2 },
  { category: 'Transport (Scope 1)', emissions: 184.5 },
  { category: 'Process Fugitive', emissions: 139.4 },
];

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: subs = [] } = useSubsidiariesHealth();
  const { data: activity = [] } = useActivityFeed();
  const { data: projects = [] } = useProjects();
  const [selectedPeriod, setSelectedPeriod] = useState('FY 2026');
  const [lineageOpen, setLineageOpen] = useState(false);

  const firstName = user?.full_name?.split(' ')[0] || 'Aditya';

  return (
    <div className="page-content">
      {/* Page Header (Section 7 Specification) */}
      <div className="page-header">
        <div>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-tertiary)', letterSpacing: '0.05em', fontWeight: 600 }}>
            Overview
          </div>
          <h1 className="page-title" style={{ marginTop: '2px' }}>
            Good morning, {firstName}.
          </h1>
          <p className="page-sub">
            Here's the current ESG reporting status across your organization.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: '6px', padding: '0 8px', height: '32px' }}>
            <Calendar size={13} color="var(--text-tertiary)" />
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              style={{ border: 'none', background: 'transparent', fontSize: '12px', fontWeight: 550, outline: 'none' }}
            >
              <option value="FY 2026">Reporting Period: FY 2026</option>
              <option value="FY 2025">Reporting Period: FY 2025</option>
            </select>
          </div>

          <button 
            className="btn btn-secondary btn-sm"
            onClick={() => alert('Exporting Executive ESG Consolidation Brief (PDF / XLSX)...')}
          >
            <Download size={13} />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid (Section 7: Subtle, precise cards) */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">
            <span>Data Coverage</span>
            <ShieldCheck size={14} color="var(--text-tertiary)" />
          </div>
          <div className="kpi-value">94.2%</div>
          <div className="kpi-footer">
            <span className="trend-up">↑ 4.2%</span>
            <span>vs previous quarter</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">
            <span>Pending Review</span>
            <Clock size={14} color="var(--text-tertiary)" />
          </div>
          <div className="kpi-value">17</div>
          <div className="kpi-footer">
            <span className="trend-up">↓ 12%</span>
            <span>reduction in queue cycle time</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">
            <span>ESG Reports</span>
            <CheckCircle2 size={14} color="var(--status-ready-text)" />
          </div>
          <div className="kpi-value">8 / 8</div>
          <div className="kpi-footer">
            <span className="badge badge-ready" style={{ fontSize: '10px' }}>● Ready for Board Sign-off</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">
            <span>Active Projects</span>
            <Layers size={14} color="var(--text-tertiary)" />
          </div>
          <div className="kpi-value">32</div>
          <div className="kpi-footer">
            <span>100% operational boundary linked</span>
          </div>
        </div>
      </div>

      {/* ESG Performance Charts & Lineage Trigger (Section 8 Specification) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '20px', marginBottom: '24px' }}>
        {/* Executive ESG Overview Card */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">ESG Performance — FY 2026</div>
              <div className="card-sub">Energy mix transition & Scope 1/2 GHG profile across operations</div>
            </div>
            <button 
              className="btn btn-ghost btn-sm"
              onClick={() => setLineageOpen(true)}
              style={{ fontSize: '12px', gap: '4px' }}
            >
              <span>ⓘ View calculation lineage</span>
            </button>
          </div>

          <div style={{ height: '240px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={ENERGY_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="renewGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#18181b" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#18181b" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="fossilGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#71717a" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#71717a" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                <XAxis dataKey="month" stroke="var(--text-tertiary)" fontSize={11} tickLine={false} />
                <YAxis stroke="var(--text-tertiary)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ background: '#ffffff', border: '1px solid var(--border-default)', borderRadius: '6px', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="renewable" stroke="#18181b" strokeWidth={2} fillOpacity={1} fill="url(#renewGrad)" name="Renewable (GJ)" />
                <Area type="monotone" dataKey="fossil" stroke="#71717a" strokeWidth={1.5} fillOpacity={1} fill="url(#fossilGrad)" name="Grid/Fossil (GJ)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)', fontSize: '12px', color: 'var(--text-secondary)' }}>
            <div style={{ display: 'flex', gap: '16px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', background: '#18181b', borderRadius: '2px' }} />
                <span>Clean Energy: <strong>51.5%</strong></span>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', background: '#71717a', borderRadius: '2px' }} />
                <span>Grid Thermal: <strong>48.5%</strong></span>
              </span>
            </div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>Total Consumed: 348,250 GJ</span>
          </div>
        </div>

        {/* GHG Scope Breakdown Card */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Scope 1 & 2 Emissions by Stream</div>
              <div className="card-sub">Total verified footprint: 1,284.7 tCO₂e</div>
            </div>
          </div>

          <div style={{ height: '240px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={EMISSIONS_DATA} layout="vertical" margin={{ top: 10, right: 20, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-subtle)" />
                <XAxis type="number" stroke="var(--text-tertiary)" fontSize={11} tickLine={false} />
                <YAxis dataKey="category" type="category" stroke="var(--text-secondary)" fontSize={11} tickLine={false} axisLine={false} width={110} />
                <Tooltip 
                  contentStyle={{ background: '#ffffff', border: '1px solid var(--border-default)', borderRadius: '6px', fontSize: '12px' }}
                />
                <Bar dataKey="emissions" fill="#18181b" radius={[0, 4, 4, 0]} name="tCO₂e" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={{ paddingTop: '12px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)' }}>
            <span>Verified with IPCC Guidelines</span>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>1,284.7 tCO₂e</span>
          </div>
        </div>
      </div>

      {/* Bottom Grid: Organization Health Table & Linear Activity Feed */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '20px' }}>
        {/* Section 9: Organization Health / Reporting Coverage */}
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="card-title">Reporting Coverage</div>
              <div className="card-sub">Consolidated status across subsidiary operational boundaries</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/org')}>
              <span>View All</span>
              <ArrowUpRight size={13} />
            </button>
          </div>

          <table className="table">
            <thead>
              <tr>
                <th>Subsidiary</th>
                <th>Coverage</th>
                <th>Emissions</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {subs.map((sub) => {
                let badgeClass = 'badge-ready';
                if (sub.statusKey === 'review') badgeClass = 'badge-review';
                if (sub.statusKey === 'attention') badgeClass = 'badge-attention';

                return (
                  <tr key={sub.id} style={{ cursor: 'pointer' }} onClick={() => navigate('/org')}>
                    <td>
                      <div style={{ fontWeight: 550, color: 'var(--text-primary)' }}>{sub.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{sub.code} · {sub.projectCount} Projects</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '60px', height: '6px', background: 'var(--bg-subtle)', borderRadius: '99px', overflow: 'hidden' }}>
                          <div style={{ width: `${sub.coverage}%`, height: '100%', background: 'var(--accent-black)' }} />
                        </div>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 600 }}>{sub.coverage}%</span>
                      </div>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                      {sub.totalEmissions} tCO₂e
                    </td>
                    <td>
                      <span className={`badge ${badgeClass}`}>
                        <span className="status-dot" />
                        {sub.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Section 10: Linear-Style Activity Feed */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Recent activity</div>
              <div className="card-sub">Real-time enterprise telemetry events</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/audit-log')}>
              <span>Audit Log</span>
            </button>
          </div>

          <div className="activity-feed">
            {activity.slice(0, 5).map((act) => (
              <div key={act.id} className="activity-item">
                <span className="activity-dot" style={{ background: act.dotColor }} />
                <span className="activity-time">{act.time}</span>
                <div className="activity-text">
                  <div style={{ color: 'var(--text-primary)', fontSize: '13px' }}>
                    {act.text}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                    by {act.author}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Calculation Lineage Modal */}
      <CalculationLineageModal 
        isOpen={lineageOpen} 
        onClose={() => setLineageOpen(false)} 
      />
    </div>
  );
}
