import { useState } from 'react';
import { useSubmissions, useCreateSubmission } from '../hooks/useApi';
import { FileText, Plus, Save, CheckCircle, AlertTriangle, Clock, Edit3 } from 'lucide-react';

const MOCK_SUBMISSIONS = [
  { id: 1, metric_code: 'E01', metric_name: 'Total Energy Consumption', org_unit: 'Hyderabad HQ', period: 'FY 2024-25', value: 42850, unit: 'GJ', status: 'verified', submitted_by: 'Ravi K.', submitted_at: '2024-10-01' },
  { id: 2, metric_code: 'E03', metric_name: 'GHG Scope 1 Emissions', org_unit: 'Hyderabad HQ', period: 'FY 2024-25', value: 3120, unit: 'tCO₂e', status: 'under_review', submitted_by: 'Priya S.', submitted_at: '2024-10-02' },
  { id: 3, metric_code: 'E05', metric_name: 'Water Withdrawal', org_unit: 'Chennai Plant', period: 'FY 2024-25', value: 18500, unit: 'kL', status: 'draft', submitted_by: 'Anand M.', submitted_at: '2024-10-03' },
  { id: 4, metric_code: 'S01', metric_name: 'Total Employees', org_unit: 'MEIL Group', period: 'FY 2024-25', value: 12480, unit: 'count', status: 'verified', submitted_by: 'Sneha R.', submitted_at: '2024-09-28' },
  { id: 5, metric_code: 'S04', metric_name: 'LTIFR', org_unit: 'Chennai Plant', period: 'FY 2024-25', value: 0.34, unit: 'per M hrs', status: 'rejected', submitted_by: 'Vijay T.', submitted_at: '2024-10-01' },
  { id: 6, metric_code: 'G02', metric_name: 'CSR Expenditure', org_unit: 'MEIL Group', period: 'FY 2024-25', value: 8.4, unit: 'INR Cr', status: 'draft', submitted_by: 'Kavya L.', submitted_at: '2024-10-04' },
];

const STATUS_CFG = {
  draft:        { label: 'Draft',        badge: 'badge-gray',  icon: Edit3 },
  under_review: { label: 'Under Review', badge: 'badge-amber', icon: Clock },
  verified:     { label: 'Verified',     badge: 'badge-green', icon: CheckCircle },
  rejected:     { label: 'Rejected',     badge: 'badge-red',   icon: AlertTriangle },
};

const METRICS = [
  { code: 'E01', name: 'Total Energy Consumption', unit: 'GJ' },
  { code: 'E03', name: 'GHG Scope 1 Emissions', unit: 'tCO₂e' },
  { code: 'E05', name: 'Water Withdrawal', unit: 'kL' },
  { code: 'E06', name: 'Waste Generated', unit: 'MT' },
  { code: 'S01', name: 'Total Employees', unit: 'count' },
  { code: 'S04', name: 'LTIFR', unit: 'per M hrs' },
  { code: 'G02', name: 'CSR Expenditure', unit: 'INR Cr' },
];

export default function DataEntry() {
  const { data, isLoading } = useSubmissions({});
  const createSubmission = useCreateSubmission();
  const submissions = data?.items || MOCK_SUBMISSIONS;

  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState('All');
  const [form, setForm] = useState({
    metric_code: 'E01', org_unit: 'Hyderabad HQ', period: 'FY 2024-25', value: '', notes: ''
  });

  const statuses = ['All', 'draft', 'under_review', 'verified', 'rejected'];
  const filtered = filter === 'All' ? submissions : submissions.filter(s => s.status === filter);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createSubmission.mutateAsync(form);
      setShowForm(false);
    } catch { /* demo mode */ }
  };

  return (
    <div className="page-content anim-fade">
      <div className="page-header">
        <div>
          <h1 className="page-title">Data Entry</h1>
          <p className="page-subtitle">Submit and track metric values by org unit</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
            <Plus size={13} /> New Submission
          </button>
        </div>
      </div>

      {/* Summary badges */}
      <div className="flex gap-3" style={{ flexWrap: 'wrap' }}>
        {Object.entries(STATUS_CFG).map(([key, cfg]) => {
          const count = submissions.filter(s => s.status === key).length;
          const Icon = cfg.icon;
          return (
            <div key={key} className="card" style={{ padding: '14px 20px', minWidth: 140, flex: 1 }}>
              <div className="flex items-center gap-2">
                <Icon size={14} color={key === 'verified' ? 'var(--emerald-400)' : key === 'rejected' ? 'var(--rose-400)' : key === 'under_review' ? 'var(--amber-400)' : 'var(--text-muted)'} />
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>{cfg.label}</span>
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, marginTop: 4 }}>{count}</div>
            </div>
          );
        })}
      </div>

      {/* New submission form */}
      {showForm && (
        <div className="card anim-scale">
          <div className="card-header">
            <div className="card-title">New Submission</div>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>✕</button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="card-body">
              <div className="grid-3" style={{ gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Metric</label>
                  <select className="form-control" value={form.metric_code}
                    onChange={e => setForm({...form, metric_code: e.target.value})}>
                    {METRICS.map(m => <option key={m.code} value={m.code}>{m.code} – {m.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Org Unit</label>
                  <select className="form-control" value={form.org_unit}
                    onChange={e => setForm({...form, org_unit: e.target.value})}>
                    <option>Hyderabad HQ</option>
                    <option>Chennai Plant</option>
                    <option>Mumbai Office</option>
                    <option>MEIL Group</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Period</label>
                  <select className="form-control" value={form.period}
                    onChange={e => setForm({...form, period: e.target.value})}>
                    <option>FY 2024-25</option>
                    <option>FY 2023-24</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Value</label>
                  <input type="number" step="any" className="form-control" required
                    placeholder="Numeric value" value={form.value}
                    onChange={e => setForm({...form, value: e.target.value})} />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Notes / Source</label>
                  <input className="form-control" placeholder="Data source, notes…"
                    value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
                </div>
              </div>
            </div>
            <div style={{ padding: '0 20px 16px', display: 'flex', gap: 8 }}>
              <button type="submit" className="btn btn-primary btn-sm">
                <Save size={13} /> Save Submission
              </button>
              <button type="button" className="btn btn-secondary btn-sm">Save as Draft</button>
            </div>
          </form>
        </div>
      )}

      {/* Submissions table */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Submissions</div>
          <div className="tabs" style={{ maxWidth: 500 }}>
            {statuses.map(s => (
              <button key={s} className={`tab-btn ${filter === s ? 'active' : ''}`}
                onClick={() => setFilter(s)}>
                {s === 'All' ? 'All' : STATUS_CFG[s]?.label || s}
              </button>
            ))}
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Metric</th>
                <th>Org Unit</th>
                <th>Period</th>
                <th style={{ textAlign: 'right' }}>Value</th>
                <th>Unit</th>
                <th>Status</th>
                <th>Submitted By</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const cfg = STATUS_CFG[s.status] || {};
                return (
                  <tr key={s.id}>
                    <td>
                      <div>
                        <span className="mono" style={{ color: 'var(--brand-400)', fontWeight: 600 }}>{s.metric_code}</span>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{s.metric_name}</div>
                      </div>
                    </td>
                    <td style={{ fontWeight: 500 }}>{s.org_unit}</td>
                    <td className="muted">{s.period}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>
                      {Number(s.value).toLocaleString()}
                    </td>
                    <td><span className="badge badge-gray">{s.unit}</span></td>
                    <td><span className={`badge ${cfg.badge}`}>{cfg.label}</span></td>
                    <td className="muted">{s.submitted_by}</td>
                    <td className="muted text-xs">{s.submitted_at}</td>
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
