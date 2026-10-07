/**
 * AarohanReview.jsx
 * AI Run Review Dashboard ("Aarohan" – the one who sets things in motion).
 * Accessible to: checker, esg_manager, group_admin, system_admin (ai:review permission).
 *
 * Features:
 * - Live list of AI proposals from all 7 engines with status badges
 * - Filter by engine / status
 * - Inline Accept / Edit-and-Accept / Reject with optional remarks
 * - Optimistic UI updates via react-query mutations
 */
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';

// ─── API helpers ──────────────────────────────────────────────────────────────
const aiApi = {
  listRuns: (engine, statusFilter, limit = 100) => {
    const params = { limit };
    if (engine) params.engine = engine;
    if (statusFilter) params.status = statusFilter;
    return api.get('/ai/runs', { params });
  },
  decide: (runId, payload) =>
    api.post(`/ai/runs/${runId}/decision`, payload),
};

// ─── Constants ────────────────────────────────────────────────────────────────
const ENGINE_LABELS = {
  E1: { label: 'E1 · Extraction', color: '#6366f1' },
  E2: { label: 'E2 · Anomaly',    color: '#f59e0b' },
  E3: { label: 'E3 · RAG',        color: '#10b981' },
  E4: { label: 'E4 · Policy',     color: '#3b82f6' },
  E5: { label: 'E5 · Narrative',  color: '#8b5cf6' },
  E6: { label: 'E6 · ValueChain', color: '#14b8a6' },
  E7: { label: 'E7 · Explainer',  color: '#f43f5e' },
};

const STATUS_META = {
  proposed:  { label: 'Pending Review', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  accepted:  { label: 'Accepted',       color: '#22c55e', bg: 'rgba(34,197,94,0.12)'  },
  edited:    { label: 'Edited',         color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  rejected:  { label: 'Rejected',       color: '#f43f5e', bg: 'rgba(244,63,94,0.12)'  },
};

// ─── Tiny badge component ─────────────────────────────────────────────────────
function Badge({ label, color, bg }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 10px', borderRadius: '999px',
      fontSize: '11px', fontWeight: 600, letterSpacing: '0.03em',
      color, background: bg, border: `1px solid ${color}33`,
    }}>{label}</span>
  );
}

// ─── Decision modal ───────────────────────────────────────────────────────────
function DecisionModal({ run, onClose, onSubmit, busy }) {
  const [decision, setDecision] = useState('accepted');
  const [remarks, setRemarks] = useState('');
  const [finalVal, setFinalVal] = useState('');
  if (!run) return null;

  const eng = ENGINE_LABELS[run.engine] || { label: run.engine, color: '#94a3b8' };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.65)', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'var(--surface, #1e293b)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '16px', padding: '32px 36px',
        width: '560px', maxHeight: '85vh', overflowY: 'auto',
        boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
        display: 'flex', flexDirection: 'column', gap: '20px',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '11px', color: eng.color, fontWeight: 700, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {eng.label}
            </div>
            <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--text-primary, #f1f5f9)', fontWeight: 600 }}>
              Review AI Proposal
            </h3>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary, #64748b)', marginTop: '4px', fontFamily: 'monospace' }}>
              {run.id}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '20px', padding: '0 4px' }}>×</button>
        </div>

        {/* Output preview */}
        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '14px 16px' }}>
          <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>AI Output</div>
          <pre style={{ margin: 0, fontSize: '12px', color: '#cbd5e1', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: '180px', overflowY: 'auto' }}>
            {JSON.stringify(run.output, null, 2)}
          </pre>
        </div>

        {/* Decision selector */}
        <div>
          <label style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Decision</label>
          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            {['accepted', 'edited', 'rejected'].map((d) => (
              <button
                key={d}
                onClick={() => setDecision(d)}
                id={`decision-${d}`}
                style={{
                  flex: 1, padding: '10px', borderRadius: '8px', cursor: 'pointer',
                  fontWeight: 600, fontSize: '13px', transition: 'all 0.15s',
                  border: decision === d ? '2px solid' : '2px solid transparent',
                  borderColor: decision === d ? STATUS_META[d].color : 'rgba(255,255,255,0.08)',
                  background: decision === d ? STATUS_META[d].bg : 'rgba(255,255,255,0.04)',
                  color: decision === d ? STATUS_META[d].color : '#94a3b8',
                  textTransform: 'capitalize',
                }}
              >
                {d === 'accepted' ? '✓ Accept' : d === 'edited' ? '✎ Edit' : '✕ Reject'}
              </button>
            ))}
          </div>
        </div>

        {/* Optional final value (for edited) */}
        {decision === 'edited' && (
          <div>
            <label style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Corrected Value
            </label>
            <input
              id="decision-final-value"
              value={finalVal}
              onChange={(e) => setFinalVal(e.target.value)}
              placeholder="Enter corrected value or reference..."
              style={{
                width: '100%', marginTop: '8px', padding: '10px 12px',
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px', color: '#f1f5f9', fontSize: '13px',
                boxSizing: 'border-box',
              }}
            />
          </div>
        )}

        {/* Remarks */}
        <div>
          <label style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Remarks <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span>
          </label>
          <textarea
            id="decision-remarks"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            rows={3}
            placeholder="Reason for this decision..."
            style={{
              width: '100%', marginTop: '8px', padding: '10px 12px',
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px', color: '#f1f5f9', fontSize: '13px',
              boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit',
            }}
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)',
              background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
            }}
          >
            Cancel
          </button>
          <button
            id="decision-submit"
            disabled={busy}
            onClick={() => onSubmit({
              decision,
              remarks: remarks || null,
              final_value: decision === 'edited' ? finalVal || null : null,
            })}
            style={{
              padding: '10px 24px', borderRadius: '8px', border: 'none',
              background: busy
                ? 'rgba(99,102,241,0.4)'
                : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#fff', cursor: busy ? 'not-allowed' : 'pointer',
              fontSize: '13px', fontWeight: 600, transition: 'opacity 0.15s',
            }}
          >
            {busy ? 'Submitting…' : 'Submit Decision'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AarohanReview() {
  const qc = useQueryClient();
  const [engineFilter, setEngineFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('proposed');
  const [selectedRun, setSelectedRun] = useState(null);

  const { data: runs = [], isLoading, isError } = useQuery({
    queryKey: ['aiRuns', engineFilter, statusFilter],
    queryFn: async () => {
      const res = await aiApi.listRuns(engineFilter || null, statusFilter || null);
      return res.data;
    },
    refetchInterval: 30_000,
  });

  const mutation = useMutation({
    mutationFn: ({ runId, payload }) => aiApi.decide(runId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['aiRuns'] });
      setSelectedRun(null);
    },
  });

  const handleSubmit = (payload) => {
    if (!selectedRun) return;
    mutation.mutate({ runId: selectedRun.id, payload });
  };

  const pendingCount = runs.filter((r) => r.status === 'proposed').length;

  return (
    <div style={{
      padding: '28px 32px',
      minHeight: '100%',
      background: 'var(--bg, #0f172a)',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '18px',
          }}>🤖</div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: 'var(--text-primary, #f1f5f9)' }}>
            Aarohan · AI Review
          </h1>
          {pendingCount > 0 && (
            <span style={{
              padding: '3px 10px', borderRadius: '999px',
              background: 'rgba(245,158,11,0.15)', color: '#f59e0b',
              fontSize: '12px', fontWeight: 700, border: '1px solid rgba(245,158,11,0.3)',
            }}>
              {pendingCount} pending
            </span>
          )}
        </div>
        <p style={{ margin: 0, color: 'var(--text-secondary, #94a3b8)', fontSize: '13px' }}>
          Review and approve AI-proposed extractions, anomaly flags, narrative drafts, and policy analyses.
          AI proposes — you dispose.
        </p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <select
          id="filter-engine"
          value={engineFilter}
          onChange={(e) => setEngineFilter(e.target.value)}
          style={selectStyle}
        >
          <option value="">All Engines</option>
          {Object.entries(ENGINE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>

        <select
          id="filter-status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={selectStyle}
        >
          <option value="">All Statuses</option>
          {Object.entries(STATUS_META).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* Content */}
      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState />
      ) : runs.length === 0 ? (
        <EmptyState statusFilter={statusFilter} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {runs.map((run) => (
            <RunCard
              key={run.id}
              run={run}
              onReview={() => setSelectedRun(run)}
            />
          ))}
        </div>
      )}

      {/* Decision modal */}
      {selectedRun && (
        <DecisionModal
          run={selectedRun}
          onClose={() => setSelectedRun(null)}
          onSubmit={handleSubmit}
          busy={mutation.isPending}
        />
      )}
    </div>
  );
}

// ─── Run card ─────────────────────────────────────────────────────────────────
function RunCard({ run, onReview }) {
  const eng = ENGINE_LABELS[run.engine] || { label: run.engine, color: '#94a3b8' };
  const sm = STATUS_META[run.status] || STATUS_META.proposed;
  const isPending = run.status === 'proposed';

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: `1px solid ${isPending ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.06)'}`,
      borderRadius: '12px',
      padding: '16px 20px',
      display: 'flex', alignItems: 'center', gap: '16px',
      transition: 'border-color 0.15s',
    }}>
      {/* Engine badge */}
      <div style={{
        width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0,
        background: `${eng.color}20`, border: `1px solid ${eng.color}40`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '12px', fontWeight: 800, color: eng.color,
      }}>
        {run.engine}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600, fontSize: '14px', color: '#f1f5f9' }}>{eng.label}</span>
          <Badge label={sm.label} color={sm.color} bg={sm.bg} />
        </div>
        <div style={{ display: 'flex', gap: '16px', marginTop: '5px', flexWrap: 'wrap' }}>
          {run.input_ref && (
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              📎 <span style={{ fontFamily: 'monospace', fontSize: '11px' }}>{run.input_ref}</span>
            </span>
          )}
          {run.model && (
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              🔬 {run.model}
            </span>
          )}
          {run.latency_ms != null && (
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              ⚡ {run.latency_ms}ms
            </span>
          )}
          <span style={{ fontSize: '12px', color: '#475569' }}>
            🕒 {run.created_at ? new Date(run.created_at).toLocaleString() : '—'}
          </span>
        </div>
      </div>

      {/* Action */}
      {isPending ? (
        <button
          id={`review-btn-${run.id.slice(0, 8)}`}
          onClick={onReview}
          style={{
            padding: '8px 18px', borderRadius: '8px', border: 'none',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '13px',
            flexShrink: 0, transition: 'opacity 0.15s',
            whiteSpace: 'nowrap',
          }}
        >
          Review →
        </button>
      ) : (
        <button
          onClick={onReview}
          style={{
            padding: '8px 18px', borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'transparent', color: '#64748b',
            cursor: 'pointer', fontWeight: 600, fontSize: '13px',
            flexShrink: 0, whiteSpace: 'nowrap',
          }}
        >
          View
        </button>
      )}
    </div>
  );
}

// ─── State components ─────────────────────────────────────────────────────────
const selectStyle = {
  padding: '8px 14px', borderRadius: '8px',
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.05)', color: '#cbd5e1',
  fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit',
};

function LoadingState() {
  return (
    <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
      <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
      <p style={{ margin: 0, fontSize: '14px' }}>Loading AI proposals…</p>
    </div>
  );
}

function ErrorState() {
  return (
    <div style={{ textAlign: 'center', padding: '60px 0', color: '#f43f5e' }}>
      <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚠️</div>
      <p style={{ margin: 0, fontSize: '14px' }}>Failed to load AI runs. Ensure you have ai:review permission.</p>
    </div>
  );
}

function EmptyState({ statusFilter }) {
  return (
    <div style={{
      textAlign: 'center', padding: '60px 0', color: '#64748b',
      border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '12px',
    }}>
      <div style={{ fontSize: '40px', marginBottom: '14px' }}>✅</div>
      <p style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 600, color: '#94a3b8' }}>
        {statusFilter === 'proposed' ? 'No pending AI proposals' : 'No matching AI runs'}
      </p>
      <p style={{ margin: 0, fontSize: '13px' }}>
        {statusFilter === 'proposed'
          ? 'All AI proposals have been reviewed. Great work!'
          : 'Try changing the engine or status filter.'}
      </p>
    </div>
  );
}
