import { useState } from 'react';
import { GitBranch, CheckCircle, XCircle, Clock, AlertTriangle, Send, ThumbsUp, ThumbsDown, Lock, ChevronRight } from 'lucide-react';

const MOCK_ITEMS = [
  { id: 1, metric: 'E01 – Total Energy', org_unit: 'Hyderabad HQ', value: '42,850 GJ', maker: 'Ravi K.', submitted_at: '2024-10-01', stage: 'checker_review', errors: [] },
  { id: 2, metric: 'E03 – GHG Scope 1', org_unit: 'Hyderabad HQ', value: '3,120 tCO₂e', maker: 'Priya S.', submitted_at: '2024-10-02', stage: 'validation_failed', errors: ['Value exceeds 10% YoY variance threshold', 'Evidence not linked'] },
  { id: 3, metric: 'S01 – Total Employees', org_unit: 'MEIL Group', value: '12,480', maker: 'Sneha R.', submitted_at: '2024-09-28', stage: 'approved', errors: [] },
  { id: 4, metric: 'E05 – Water Withdrawal', org_unit: 'Chennai Plant', value: '18,500 kL', maker: 'Anand M.', submitted_at: '2024-10-03', stage: 'draft', errors: [] },
  { id: 5, metric: 'G02 – CSR Expenditure', org_unit: 'MEIL Group', value: '8.4 INR Cr', maker: 'Kavya L.', submitted_at: '2024-10-04', stage: 'checker_review', errors: [] },
];

const STAGE_CFG = {
  draft:            { label: 'Draft',          badge: 'badge-gray',  icon: Clock,         color: 'var(--text-muted)' },
  validation_failed:{ label: 'Validation Fail',badge: 'badge-red',   icon: AlertTriangle, color: 'var(--rose-400)' },
  checker_review:   { label: 'Checker Review', badge: 'badge-amber', icon: GitBranch,     color: 'var(--amber-400)' },
  approved:         { label: 'Approved',       badge: 'badge-green', icon: CheckCircle,   color: 'var(--emerald-400)' },
  rejected:         { label: 'Rejected',       badge: 'badge-red',   icon: XCircle,       color: 'var(--rose-400)' },
};

const PIPELINE_STEPS = [
  { key: 'draft',             label: 'Draft' },
  { key: 'submitted',         label: 'Submitted' },
  { key: 'validation_failed', label: 'Validation' },
  { key: 'checker_review',    label: 'Checker Review' },
  { key: 'approved',          label: 'Approved' },
];

function PipelineViz({ stage }) {
  const idx = PIPELINE_STEPS.findIndex(s => s.key === stage);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, margin: '8px 0' }}>
      {PIPELINE_STEPS.map((s, i) => {
        const done    = i < idx;
        const current = i === idx;
        const fail    = stage === 'validation_failed' && s.key === 'validation_failed';
        return (
          <div key={s.key} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <div style={{
              width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
              background: fail ? 'var(--rose-500)' : done || current ? 'var(--brand-500)' : 'var(--bg-elevated)',
              border: `2px solid ${fail ? 'var(--rose-500)' : done || current ? 'var(--brand-500)' : 'var(--border-default)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9, color: '#fff', fontWeight: 700
            }}>
              {done ? '✓' : i + 1}
            </div>
            {i < PIPELINE_STEPS.length - 1 && (
              <div style={{ flex: 1, height: 2, background: done ? 'var(--brand-500)' : 'var(--border-subtle)', margin: '0 2px' }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function Workflow() {
  const [selected, setSelected] = useState(null);
  const [filter, setFilter]   = useState('All');
  const [comment, setComment] = useState('');

  const stages = ['All', ...Object.keys(STAGE_CFG)];
  const items  = filter === 'All' ? MOCK_ITEMS : MOCK_ITEMS.filter(i => i.stage === filter);

  const selectedItem = MOCK_ITEMS.find(i => i.id === selected);

  return (
    <div className="page-content anim-fade">
      <div className="page-header">
        <div>
          <h1 className="page-title">Workflow</h1>
          <p className="page-subtitle">Maker-Checker SoD · Validation gates · Period locking</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-danger btn-sm">
            <Lock size={13} /> Lock Period
          </button>
        </div>
      </div>

      {/* Stage summary */}
      <div className="grid-4">
        {Object.entries(STAGE_CFG).map(([key, cfg]) => {
          const count = MOCK_ITEMS.filter(i => i.stage === key).length;
          const Icon  = cfg.icon;
          return (
            <div key={key} className="card" style={{ padding: '14px 18px', cursor: 'pointer', borderColor: filter === key ? 'var(--brand-500)' : 'var(--border-subtle)' }}
              onClick={() => setFilter(filter === key ? 'All' : key)}>
              <div className="flex items-center gap-2">
                <Icon size={14} color={cfg.color} />
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>{cfg.label}</span>
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, marginTop: 4 }}>{count}</div>
            </div>
          );
        })}
      </div>

      {/* Main panel */}
      <div className="grid-2" style={{ alignItems: 'start' }}>
        {/* Left: items list */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Pending Items</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {items.map((item) => {
              const cfg  = STAGE_CFG[item.stage] || {};
              const Icon = cfg.icon || Clock;
              return (
                <div key={item.id}
                  onClick={() => setSelected(selected === item.id ? null : item.id)}
                  style={{
                    padding: '14px 18px',
                    borderBottom: '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    background: selected === item.id ? 'var(--bg-hover)' : 'transparent',
                    transition: 'background 0.15s ease'
                  }}
                >
                  <div className="flex justify-between items-center">
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{item.metric}</div>
                    <span className={`badge ${cfg.badge}`}><Icon size={10} /> {cfg.label}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                    {item.org_unit} · {item.value}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    Maker: {item.maker} · {item.submitted_at}
                  </div>
                  {item.errors.length > 0 && (
                    <div className="alert alert-error" style={{ marginTop: 8, padding: '6px 10px' }}>
                      <AlertTriangle size={12} />
                      <span style={{ fontSize: 11 }}>{item.errors[0]}{item.errors.length > 1 ? ` +${item.errors.length - 1} more` : ''}</span>
                    </div>
                  )}
                  {selected === item.id && (
                    <div style={{ marginTop: 10 }}>
                      <PipelineViz stage={item.stage} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: action panel */}
        <div className="card">
          {selectedItem ? (
            <>
              <div className="card-header">
                <div className="card-title">Review: {selectedItem.metric}</div>
              </div>
              <div className="card-body flex-col gap-3">
                {/* Details */}
                {[
                  { l: 'Org Unit', v: selectedItem.org_unit },
                  { l: 'Value', v: selectedItem.value },
                  { l: 'Maker', v: selectedItem.maker },
                  { l: 'Submitted', v: selectedItem.submitted_at },
                  { l: 'Stage', v: <span className={`badge ${STAGE_CFG[selectedItem.stage]?.badge}`}>{STAGE_CFG[selectedItem.stage]?.label}</span> },
                ].map(({l, v}) => (
                  <div key={l} className="flex justify-between items-center" style={{ paddingBottom: 10, borderBottom: '1px solid var(--border-subtle)' }}>
                    <span className="text-muted text-sm">{l}</span>
                    <span style={{ fontWeight: 500 }}>{v}</span>
                  </div>
                ))}

                {/* Errors */}
                {selectedItem.errors.length > 0 && (
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 6 }}>Validation Errors</div>
                    {selectedItem.errors.map((e, i) => (
                      <div key={i} className="alert alert-error" style={{ marginBottom: 6 }}>
                        <AlertTriangle size={12} /> {e}
                      </div>
                    ))}
                  </div>
                )}

                {/* Comment box */}
                <div className="form-group">
                  <label className="form-label">Checker Comment</label>
                  <textarea className="form-control" rows={3} placeholder="Add review comments…"
                    value={comment} onChange={e => setComment(e.target.value)} />
                </div>

                {/* Actions */}
                {selectedItem.stage === 'checker_review' && (
                  <div className="flex gap-2">
                    <button className="btn btn-success btn-sm" style={{ flex: 1 }}>
                      <ThumbsUp size={13} /> Approve
                    </button>
                    <button className="btn btn-danger btn-sm" style={{ flex: 1 }}>
                      <ThumbsDown size={13} /> Reject
                    </button>
                  </div>
                )}
                {selectedItem.stage === 'draft' && (
                  <button className="btn btn-primary btn-sm w-full">
                    <Send size={13} /> Submit for Review
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="card-body" style={{ textAlign: 'center', padding: '60px 20px' }}>
              <GitBranch size={36} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
              <div style={{ color: 'var(--text-secondary)' }}>Select an item to review</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
