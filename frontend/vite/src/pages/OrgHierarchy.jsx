import { useState } from 'react';
import { useOrgNodes, useOrgPeriods, useCreateNode, useCreatePeriod } from '../hooks/useApi';
import { Building2, ChevronRight, Plus, Calendar, Layers, Globe } from 'lucide-react';

// ── Mock fallback data ─────────────────────────────────────────
const MOCK_NODES = [
  { id: 1, name: 'MEIL Group (Consolidated)', node_type: 'group', path: 'meil', boundary: 'equity' },
  { id: 2, name: 'Hyderabad HQ', node_type: 'subsidiary', path: 'meil.hq', boundary: 'equity' },
  { id: 3, name: 'Chennai Manufacturing Plant', node_type: 'subsidiary', path: 'meil.chennai', boundary: 'equity' },
  { id: 4, name: 'Mumbai Regional Office', node_type: 'branch', path: 'meil.hq.mumbai', boundary: 'operational' },
  { id: 5, name: 'Bangalore Tech Centre', node_type: 'branch', path: 'meil.hq.bangalore', boundary: 'operational' },
  { id: 6, name: 'MEIL-Tata JV (35%)', node_type: 'joint_venture', path: 'meil.jv1', boundary: 'equity', jv_share: 35 },
];
const MOCK_PERIODS = [
  { id: 1, label: 'FY 2024-25', start_date: '2024-04-01', end_date: '2025-03-31', locked: false },
  { id: 2, label: 'FY 2023-24', start_date: '2023-04-01', end_date: '2024-03-31', locked: true },
];

const TYPE_BADGE = {
  group:         { label: 'Group',          cls: 'badge-brand' },
  subsidiary:    { label: 'Subsidiary',     cls: 'badge-green' },
  branch:        { label: 'Branch',         cls: 'badge-sky' },
  joint_venture: { label: 'Joint Venture',  cls: 'badge-amber' },
};

export default function OrgHierarchy() {
  const { data: nodes,   isLoading: loadN } = useOrgNodes();
  const { data: periods, isLoading: loadP } = useOrgPeriods();
  const createNode   = useCreateNode();
  const createPeriod = useCreatePeriod();

  const [showNodeForm,   setShowNodeForm]   = useState(false);
  const [showPeriodForm, setShowPeriodForm] = useState(false);
  const [nodeForm,   setNodeForm]   = useState({ name: '', node_type: 'subsidiary', path: '', boundary: 'equity' });
  const [periodForm, setPeriodForm] = useState({ label: '', start_date: '', end_date: '' });

  const displayNodes   = nodes   || MOCK_NODES;
  const displayPeriods = periods || MOCK_PERIODS;

  const handleCreateNode = async (e) => {
    e.preventDefault();
    try { await createNode.mutateAsync(nodeForm); setShowNodeForm(false); } catch { /* demo */ }
  };
  const handleCreatePeriod = async (e) => {
    e.preventDefault();
    try { await createPeriod.mutateAsync(periodForm); setShowPeriodForm(false); } catch { /* demo */ }
  };

  return (
    <div className="page-content anim-fade">
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Org Hierarchy</h1>
          <p className="page-subtitle">Define the boundary of consolidated ESG reporting</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary btn-sm" onClick={() => setShowPeriodForm(true)}>
            <Calendar size={13} /> New Period
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowNodeForm(true)}>
            <Plus size={13} /> Add Unit
          </button>
        </div>
      </div>

      {/* Reporting periods */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Reporting Periods</div>
            <div className="card-subtitle text-muted text-sm">Fiscal year windows for BRSR submission</div>
          </div>
        </div>
        <div className="card-body flex gap-3" style={{ flexWrap: 'wrap' }}>
          {displayPeriods.map((p) => (
            <div key={p.id} style={{
              background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)', padding: '14px 18px', minWidth: 200,
              position: 'relative', overflow: 'hidden'
            }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                background: p.locked ? 'var(--rose-500)' : 'var(--emerald-500)' }} />
              <div style={{ fontWeight: 700, fontSize: 14 }}>{p.label}</div>
              <div className="text-sm text-muted" style={{ marginTop: 3 }}>
                {p.start_date} → {p.end_date}
              </div>
              <div style={{ marginTop: 10 }}>
                {p.locked
                  ? <span className="badge badge-red">🔒 Locked</span>
                  : <span className="badge badge-green">🟢 Active</span>}
              </div>
            </div>
          ))}
          {showPeriodForm && (
            <form onSubmit={handleCreatePeriod} style={{
              background: 'var(--bg-elevated)', border: '1px solid var(--border-brand)',
              borderRadius: 'var(--radius-md)', padding: '14px 18px', minWidth: 260,
              display: 'flex', flexDirection: 'column', gap: 8
            }}>
              <input className="form-control" placeholder="Label e.g. FY 2025-26" required
                value={periodForm.label} onChange={e => setPeriodForm({...periodForm, label: e.target.value})} />
              <input type="date" className="form-control" required
                value={periodForm.start_date} onChange={e => setPeriodForm({...periodForm, start_date: e.target.value})} />
              <input type="date" className="form-control" required
                value={periodForm.end_date} onChange={e => setPeriodForm({...periodForm, end_date: e.target.value})} />
              <div className="flex gap-2">
                <button type="submit" className="btn btn-primary btn-sm">Save</button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowPeriodForm(false)}>Cancel</button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Org tree table */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Organisational Units</div>
            <div className="card-subtitle text-muted text-sm">{displayNodes.length} entities in reporting boundary</div>
          </div>
          <div className="flex gap-2 items-center">
            <span className="badge badge-brand"><Layers size={10} /> {displayNodes.filter(n => n.boundary === 'equity').length} Equity</span>
            <span className="badge badge-sky"><Globe size={10} /> {displayNodes.filter(n => n.boundary === 'operational').length} Operational</span>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Entity Name</th>
                <th>Type</th>
                <th>ltree Path</th>
                <th>Boundary</th>
                <th>JV Share</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {displayNodes.map((node) => {
                const depth = node.path.split('.').length - 1;
                const badge = TYPE_BADGE[node.node_type] || { label: node.node_type, cls: 'badge-gray' };
                return (
                  <tr key={node.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        {Array(depth).fill(null).map((_, i) => (
                          <span key={i} style={{ width: 14, display: 'inline-block', borderLeft: '1px dashed var(--border-default)', height: 16 }} />
                        ))}
                        {depth > 0 && <ChevronRight size={12} color="var(--text-muted)" />}
                        <Building2 size={14} color="var(--brand-400)" />
                        <span style={{ fontWeight: 500 }}>{node.name}</span>
                      </div>
                    </td>
                    <td><span className={`badge ${badge.cls}`}>{badge.label}</span></td>
                    <td><span className="mono text-muted">{node.path}</span></td>
                    <td>
                      <span className={`badge ${node.boundary === 'equity' ? 'badge-brand' : 'badge-sky'}`}>
                        {node.boundary}
                      </span>
                    </td>
                    <td className="muted">
                      {node.jv_share ? `${node.jv_share}%` : '—'}
                    </td>
                    <td><span className="badge badge-green">Active</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {showNodeForm && (
          <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-subtle)' }}>
            <div style={{ fontWeight: 600, marginBottom: 12 }}>Add Org Unit</div>
            <form onSubmit={handleCreateNode} style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr) auto', gap: 10, alignItems: 'end' }}>
              <div className="form-group">
                <label className="form-label">Name</label>
                <input className="form-control" required placeholder="Entity name"
                  value={nodeForm.name} onChange={e => setNodeForm({...nodeForm, name: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Type</label>
                <select className="form-control" value={nodeForm.node_type}
                  onChange={e => setNodeForm({...nodeForm, node_type: e.target.value})}>
                  <option value="subsidiary">Subsidiary</option>
                  <option value="branch">Branch</option>
                  <option value="joint_venture">Joint Venture</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">ltree Path</label>
                <input className="form-control" placeholder="meil.unit_name"
                  value={nodeForm.path} onChange={e => setNodeForm({...nodeForm, path: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Boundary</label>
                <select className="form-control" value={nodeForm.boundary}
                  onChange={e => setNodeForm({...nodeForm, boundary: e.target.value})}>
                  <option value="equity">Equity</option>
                  <option value="operational">Operational</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn btn-primary btn-sm">Add</button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowNodeForm(false)}>✕</button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
