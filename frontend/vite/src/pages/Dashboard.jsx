import {
  AreaChart, Area, BarChart, Bar, RadialBarChart, RadialBar,
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend
} from 'recharts';
import {
  TrendingUp, AlertTriangle, CheckCircle, Clock,
  Building2, FileText, Shield, BarChart3, ArrowUpRight, Zap
} from 'lucide-react';

// ── Mock data ──────────────────────────────────────────────────
const completionData = [
  { month: 'Apr', submitted: 45, verified: 30 },
  { month: 'May', submitted: 60, verified: 50 },
  { month: 'Jun', submitted: 55, verified: 48 },
  { month: 'Jul', submitted: 80, verified: 70 },
  { month: 'Aug', submitted: 72, verified: 65 },
  { month: 'Sep', submitted: 90, verified: 82 },
  { month: 'Oct', submitted: 88, verified: 80 },
];

const sectionData = [
  { section: 'Sec A', coverage: 92, fill: '#6366f1' },
  { section: 'Sec B', coverage: 78, fill: '#10b981' },
  { section: 'Sec C', coverage: 65, fill: '#f59e0b' },
  { section: 'Principle 1', coverage: 85, fill: '#38bdf8' },
  { section: 'Principle 2', coverage: 70, fill: '#fb7185' },
  { section: 'Principle 9', coverage: 58, fill: '#a78bfa' },
];

const radialData = [
  { name: 'Overall', value: 74, fill: '#6366f1' },
];

const recentActivity = [
  { id: 1, action: 'Submission verified', unit: 'Hyderabad HQ', time: '2 min ago', type: 'success' },
  { id: 2, action: 'Evidence uploaded', unit: 'Chennai Plant', time: '14 min ago', type: 'info' },
  { id: 3, action: 'Validation error', unit: 'Mumbai Office', time: '1 hr ago', type: 'error' },
  { id: 4, action: 'Period locked', unit: 'All units', time: '3 hr ago', type: 'warning' },
  { id: 5, action: 'Report compiled', unit: 'Consolidated', time: 'Yesterday', type: 'success' },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="custom-tooltip" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: '10px 14px' }}>
      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ fontSize: 12, color: p.color, display: 'flex', gap: 6 }}>
          <span style={{ fontWeight: 600 }}>{p.value}%</span>
          <span style={{ color: 'var(--text-secondary)' }}>{p.name}</span>
        </div>
      ))}
    </div>
  );
};

export default function Dashboard() {
  return (
    <div className="page-content anim-fade">
      {/* Header */}
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">ESG Dashboard</h1>
          <p className="page-subtitle">MEIL · BRSR Reporting Portal · FY 2024–25</p>
        </div>
        <div className="page-actions">
          <span className="badge badge-amber"><Clock size={10} /> Q2 Deadline: Oct 31</span>
          <button className="btn btn-primary btn-sm">
            <Zap size={13} /> Compile Report
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="stat-grid">
        <StatCard
          label="Overall Completion"
          value="74%"
          change="+6% vs last month"
          up
          icon={<TrendingUp size={16} color="var(--brand-400)" />}
          accent="var(--brand-500)"
          accentGlow="rgba(99,102,241,0.20)"
        />
        <StatCard
          label="Org Units Active"
          value="18"
          change="3 pending setup"
          icon={<Building2 size={16} color="var(--sky-400)" />}
          accent="var(--sky-500)"
          accentGlow="rgba(14,165,233,0.20)"
        />
        <StatCard
          label="Submissions"
          value="142"
          change="87 verified · 55 pending"
          icon={<FileText size={16} color="var(--emerald-400)" />}
          accent="var(--emerald-500)"
          accentGlow="rgba(16,185,129,0.20)"
        />
        <StatCard
          label="Validation Errors"
          value="23"
          change="↓ 12 from last week"
          down
          icon={<AlertTriangle size={16} color="var(--amber-400)" />}
          accent="var(--amber-500)"
          accentGlow="rgba(245,158,11,0.20)"
        />
        <StatCard
          label="Evidence Files"
          value="347"
          change="All SHA-256 verified"
          icon={<Shield size={16} color="var(--brand-400)" />}
          accent="var(--brand-500)"
          accentGlow="rgba(99,102,241,0.20)"
        />
        <StatCard
          label="Reports Compiled"
          value="6"
          change="Last: 2h ago"
          up
          icon={<BarChart3 size={16} color="var(--emerald-400)" />}
          accent="var(--emerald-500)"
          accentGlow="rgba(16,185,129,0.20)"
        />
      </div>

      {/* Charts row */}
      <div className="grid-2">
        {/* Area chart */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Submission Progress</div>
              <div className="card-subtitle text-sm text-muted">Monthly submitted vs verified</div>
            </div>
            <span className="badge badge-green"><CheckCircle size={10} /> On Track</span>
          </div>
          <div className="card-body" style={{ paddingTop: 8 }}>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={completionData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradSub" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradVer" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis dataKey="month" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="submitted" stroke="#6366f1" strokeWidth={2} fill="url(#gradSub)" name="Submitted" />
                <Area type="monotone" dataKey="verified"  stroke="#10b981" strokeWidth={2} fill="url(#gradVer)"  name="Verified" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar chart */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Section Coverage</div>
              <div className="card-subtitle text-sm text-muted">BRSR sections & principles</div>
            </div>
          </div>
          <div className="card-body" style={{ paddingTop: 8 }}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={sectionData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                <XAxis dataKey="section" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="coverage" radius={[4, 4, 0, 0]} name="Coverage">
                  {sectionData.map((entry, index) => (
                    <rect key={index} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom row: pipeline + activity */}
      <div className="grid-2">
        {/* Pipeline status */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Reporting Pipeline</div>
          </div>
          <div className="card-body flex-col gap-3">
            {[
              { label: 'Data Collection',  pct: 74, color: 'green' },
              { label: 'Evidence Upload',  pct: 68, color: '' },
              { label: 'Maker-Checker Review', pct: 55, color: 'amber' },
              { label: 'Consolidation',    pct: 40, color: 'amber' },
              { label: 'BRSR Compilation', pct: 20, color: 'red' },
            ].map((s) => (
              <div key={s.label}>
                <div className="flex justify-between items-center" style={{ marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 500 }}>{s.label}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{s.pct}%</span>
                </div>
                <div className="progress-bar-wrap">
                  <div className={`progress-bar-fill ${s.color}`} style={{ width: `${s.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Recent Activity</div>
            <button className="btn btn-ghost btn-sm">View all <ArrowUpRight size={11} /></button>
          </div>
          <div className="card-body" style={{ padding: '12px 0' }}>
            <div className="timeline">
              {recentActivity.map((item, i) => (
                <div key={item.id} className="timeline-item">
                  <div className="timeline-line">
                    <div className="timeline-dot" style={{ background: typeColor(item.type) }} />
                    {i < recentActivity.length - 1 && <div className="timeline-connector" />}
                  </div>
                  <div className="timeline-content" style={{ paddingLeft: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{item.action}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{item.unit} · {item.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, change, up, down, icon, accent, accentGlow }) {
  return (
    <div className="stat-card" style={{ '--accent': accent, '--accent-glow': accentGlow }}>
      <div className="stat-card-glow" />
      <div className="stat-icon-wrap">{icon}</div>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className={`stat-change ${up ? 'up' : down ? 'down' : ''}`}>{change}</div>
    </div>
  );
}

function typeColor(t) {
  return { success: 'var(--emerald-500)', info: 'var(--sky-500)', error: 'var(--rose-500)', warning: 'var(--amber-500)' }[t] || 'var(--brand-500)';
}
