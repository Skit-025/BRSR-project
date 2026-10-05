import { useState } from 'react';
import { useConsolidationJobs, useRunConsolidation } from '../hooks/useApi';
import { BarChart3, Play, GitMerge, CheckCircle, Clock, AlertTriangle, ChevronRight, Layers, Link } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const MOCK_JOBS = [
  { id: 1, node: 'MEIL Group', period: 'FY 2024-25', status: 'completed', triggered_at: '2024-10-04 14:30', duration_s: 12, metrics_rolled: 42 },
  { id: 2, node: 'MEIL Group', period: 'FY 2023-24', status: 'completed', triggered_at: '2024-09-01 09:00', duration_s: 8, metrics_rolled: 38 },
  { id: 3, node: 'Hyderabad HQ', period: 'FY 2024-25', status: 'failed', triggered_at: '2024-10-03 16:00', duration_s: null, metrics_rolled: 0 },
];

const MOCK_RESULT = [
  { metric: 'E01 – Energy', hq: 42850, chennai: 31200, mumbai: 8400, consolidated: 82450 },
  { metric: 'E03 – GHG S1', hq: 3120, chennai: 2800, mumbai: 560, consolidated: 6480 },
  { metric: 'E05 – Water', hq: 18500, chennai: 24000, mumbai: 3200, consolidated: 45700 },
  { metric: 'S01 – Employees', hq: 5200, chennai: 4800, mumbai: 2480, consolidated: 12480 },
];

const JOB_STATUS = {
  completed: { badge: 'badge-green', icon: CheckCircle },
  running:   { badge: 'badge-sky',   icon: Clock },
  failed:    { badge: 'badge-red',   icon: AlertTriangle },
};

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#38bdf8'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: '10px 14px' }}>
      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ fontSize: 12, color: p.fill || p.color }}>
          <strong>{Number(p.value).toLocaleString()}</strong> {p.name}
        </div>
      ))}
    </div>
  );
};

export default function Consolidation() {
  const { data: jobs } = useConsolidationJobs();
  const runConsol = useRunConsolidation();
  const [running, setRunning] = useState(false);

  const displayJobs = jobs || MOCK_JOBS;

  const handleRun = async () => {
    setRunning(true);
    try {
      await runConsol.mutateAsync({ node_id: 1, period_id: 1 });
    } catch { /* demo */ }
    setTimeout(() => setRunning(false), 2000);
  };

  return (
    <div className="page-content anim-fade">
      <div className="page-header">
        <div>
          <h1 className="page-title">Consolidation</h1>
          <p className="page-subtitle">Hierarchical boundary roll-up · JV equity share · Lineage tracing</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary btn-sm" onClick={handleRun} disabled={running}>
            <Play size={13} /> {running ? 'Running…' : 'Run Roll-up'}
          </button>
        </div>
      </div>

      {/* How it works banner */}
      <div className="alert alert-info">
        <Layers size={14} />
        <span>
          <strong>Consolidation Engine:</strong> Sums additive metrics (energy, GHG, water) across equity-boundary entities.
          Ratios are <em>recomputed from sums</em> (not averaged). JV contributions are equity-share weighted.
          Full audit lineage is preserved in the <code style={{ fontFamily: 'JetBrains Mono', fontSize: 11 }}>lineage</code> table.
        </span>
      </div>

      {/* Roll-up chart */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Consolidated Results – FY 2024-25</div>
            <div className="card-subtitle text-muted text-sm">MEIL Group (Equity Boundary)</div>
          </div>
        </div>
        <div className="card-body" style={{ paddingTop: 8 }}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={MOCK_RESULT} margin={{ top: 8, right: 8, left: -10, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
              <XAxis dataKey="metric" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} axisLine={false} tickLine={false} angle={-15} textAnchor="end" />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="hq"      name="Hyderabad HQ"  stackId="a" fill={COLORS[0]} radius={[0,0,0,0]} />
              <Bar dataKey="chennai" name="Chennai Plant"  stackId="a" fill={COLORS[1]} radius={[0,0,0,0]} />
              <Bar dataKey="mumbai"  name="Mumbai Office"  stackId="a" fill={COLORS[2]} radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Lineage table */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Roll-up Detail</div>
          <span className="badge badge-brand"><Link size={10} /> Lineage Traced</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Metric</th>
                <th style={{ textAlign: 'right' }}>HQ</th>
                <th style={{ textAlign: 'right' }}>Chennai</th>
                <th style={{ textAlign: 'right' }}>Mumbai</th>
                <th style={{ textAlign: 'right' }}>Consolidated</th>
                <th>Method</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_RESULT.map((r) => (
                <tr key={r.metric}>
                  <td style={{ fontWeight: 500 }}>{r.metric}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'JetBrains Mono', fontSize: 12 }}>{r.hq.toLocaleString()}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'JetBrains Mono', fontSize: 12 }}>{r.chennai.toLocaleString()}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'JetBrains Mono', fontSize: 12 }}>{r.mumbai.toLocaleString()}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'JetBrains Mono', fontSize: 12, fontWeight: 700, color: 'var(--brand-400)' }}>
                    {r.consolidated.toLocaleString()}
                  </td>
                  <td><span className="badge badge-sky">sum</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Jobs history */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Job History</div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Job ID</th>
                <th>Node</th>
                <th>Period</th>
                <th>Status</th>
                <th>Triggered</th>
                <th>Duration</th>
                <th>Metrics Rolled</th>
              </tr>
            </thead>
            <tbody>
              {displayJobs.map((j) => {
                const cfg = JOB_STATUS[j.status] || {};
                const Icon = cfg.icon || Clock;
                return (
                  <tr key={j.id}>
                    <td className="mono text-muted">#{j.id}</td>
                    <td style={{ fontWeight: 500 }}>{j.node}</td>
                    <td className="muted">{j.period}</td>
                    <td><span className={`badge ${cfg.badge}`}><Icon size={10} /> {j.status}</span></td>
                    <td className="muted text-xs">{j.triggered_at}</td>
                    <td className="muted">{j.duration_s ? `${j.duration_s}s` : '—'}</td>
                    <td style={{ fontWeight: 600 }}>{j.metrics_rolled || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
