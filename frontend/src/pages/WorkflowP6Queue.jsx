import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle, Clock, Download, Eye, RefreshCw, Search, XCircle } from 'lucide-react';
import { p6FormsApi } from '../api/client';
import PageHelpButton from '../components/PageHelpButton';

const P = {
  surface: '#fff', bg: '#f5f7fb', border: '#e2e8f0', ink: '#0f172a', muted: '#64748b',
  green: '#047857', greenBg: '#d1fae5', blue: '#1d4ed8', blueBg: '#dbeafe',
  amber: '#b45309', amberBg: '#fef3c7', red: '#b91c1c', redBg: '#fee2e2',
};
const labelStatus = (status) => ({ submitted: 'Awaiting verification', accepted: 'Accepted', rejected: 'Returned for correction', draft: 'Draft' }[status] || status || 'Draft');
const statusColor = (status) => status === 'accepted' ? [P.green, P.greenBg] : status === 'rejected' ? [P.red, P.redBg] : status === 'submitted' ? [P.amber, P.amberBg] : [P.muted, '#f1f5f9'];
const titleCase = (s = '') => s.replace(/_/g, ' ').replace(/\b\w/g, (x) => x.toUpperCase());

export default function WorkflowP6Queue({ user }) {
  const [snapshot, setSnapshot] = useState({ blocks: [], root_node: null });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [selectedId, setSelectedId] = useState('');
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [evidence, setEvidence] = useState([]);

  const load = async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      const { data } = await p6FormsApi.getDescendants();
      setSnapshot(data || { blocks: [], root_node: null });
    } catch (e) {
      setError(e.response?.data?.detail || 'Unable to load submissions for your entity scope.');
    } finally { setLoading(false); setRefreshing(false); }
  };
  useEffect(() => {
    load();
    const timer = window.setInterval(() => load(true), 15000);
    return () => window.clearInterval(timer);
  }, [user?.id, user?.role]);

  const reports = useMemo(() => (snapshot.blocks || []).map((b) => {
    const node = b.node || {};
    const status = b.status?.status || 'draft';
    const fields = Object.entries(b.entries || {}).filter(([, v]) => v && (v.current !== null && v.current !== '' || v.previous !== null && v.previous !== ''));
    const first = fields[0]?.[0] || '';
    const indicator = first.split('_').slice(0, 1)[0]?.toUpperCase() || 'P6';
    const id = `${node.id || 'node'}:${b.ownerRole}`;
    const canReview = ['project_admin', 'bu_esg_manager', 'bu_supervisor', 'bu_admin', 'subsidiary_esg_manager', 'subsidiary_supervisor', 'subsidiary_admin', 'group_esg_manager', 'group_supervisor', 'group_admin', 'system_admin'].includes(user?.role)
      && status === 'submitted' && b.ownerRole !== user?.role;
    return { ...b, node, status, fields, first, indicator, id, canReview };
  }).filter((r) => statusFilter === 'active' ? ['submitted', 'rejected'].includes(r.status) : statusFilter === 'history' ? ['accepted', 'rejected'].includes(r.status) : true)
    .filter((r) => !query.trim() || `${r.node.name} ${r.node.id} ${r.formTitle} ${r.indicator}`.toLowerCase().includes(query.toLowerCase())), [snapshot, statusFilter, query, user?.role]);
  const selected = reports.find((r) => r.id === selectedId) || reports[0] || null;
  useEffect(() => { if (selected && !reports.some((r) => r.id === selectedId)) setSelectedId(selected.id); }, [selected?.id, selectedId]);
  useEffect(() => {
    let active = true;
    setEvidence([]);
    if (!selected) return () => { active = false; };
    Promise.all(selected.fields.map(async ([fieldId]) => {
      try {
        const { data } = await p6FormsApi.getFieldEvidence(selected.node.id, fieldId);
        return Object.values(data.evidence || {}).flat().map((record) => ({ ...record, fieldId }));
      } catch { return []; }
    })).then((groups) => { if (active) setEvidence(groups.flat()); });
    return () => { active = false; };
  }, [selected?.id]);

  const pending = (snapshot.blocks || []).filter((b) => b.status?.status === 'submitted').length;
  const accepted = (snapshot.blocks || []).filter((b) => b.status?.status === 'accepted').length;
  const returned = (snapshot.blocks || []).filter((b) => b.status?.status === 'rejected').length;
  const requestDate = (r) => r?.status?.history?.at(-1)?.created_at || '';

  const review = async (decision) => {
    if (!selected?.canReview || busy) return;
    if ((decision === 'rejected') && !comment.trim()) { setError('Add a correction reason before returning this report.'); return; }
    const action = decision === 'accepted' ? 'accept' : 'return it for correction';
    if (!window.confirm(`Are you sure you want to ${action} for ${selected.node.name}?`)) return;
    setBusy(true); setError('');
    try {
      await p6FormsApi.review({ node_id: selected.node.id, target_role: selected.ownerRole, decision, reason: comment.trim() || undefined });
      setComment('');
      await load(true);
    } catch (e) { setError(e.response?.data?.detail || 'Review action failed.'); }
    finally { setBusy(false); }
  };

  const exportRegister = () => {
    const rows = [['Entity', 'Form', 'Owner Role', 'Status', 'Fields submitted'], ...reports.map((r) => [r.node.name, r.formTitle, r.ownerRole, r.status, r.fields.length])];
    const csv = rows.map((row) => row.map((v) => `"${String(v ?? '').replaceAll('"', '""')}"`).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = 'review-register.csv'; a.click(); URL.revokeObjectURL(url);
  };

  const inspectEvidence = async (file) => {
    try {
      const { data } = await p6FormsApi.downloadEvidence(selected.node.id, file.fieldId, file.evidence_id);
      const url = URL.createObjectURL(data);
      const link = document.createElement('a'); link.href = url; link.download = file.file_name || 'evidence'; link.target = '_blank'; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) { setError(e.response?.data?.detail || 'Unable to open this evidence file.'); }
  };

  return <div style={{ background: P.bg, color: P.ink, borderRadius: 10, padding: 16 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
      <div><div style={{ fontSize: 11, color: P.muted, textTransform: 'uppercase', letterSpacing: '.08em' }}>Workflow Engine / Review Queue</div><h2 style={{ margin: '5px 0 2px', fontSize: 24 }}>Reviews &amp; Workflow Engine</h2><div style={{ fontSize: 12, color: P.muted }}>Manage incoming requests and verify submitted reports across your authorized hierarchy.</div></div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><PageHelpButton title="Workflow Guide" route="/workflow" /><button onClick={() => load(true)} disabled={refreshing} style={buttonStyle}><RefreshCw size={13} /> {refreshing ? 'Refreshing…' : 'Refresh Queue'}</button><button onClick={exportRegister} style={{ ...buttonStyle, background: '#111827', color: '#fff' }}><Download size={13} /> Export Register</button></div>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(145px,1fr))', gap: 10, marginBottom: 12 }}>
      {[["TOTAL REPORTS", snapshot.blocks?.length || 0, `In ${snapshot.root_node?.name || 'your scope'}`, P.blue], ['PENDING REVIEW', pending, 'Awaiting verification', P.amber], ['ACCEPTED', accepted, 'Accepted in your scope', P.green], ['RETURNED', returned, 'Correction requested', P.red]].map(([t, n, sub, c]) => <div key={t} style={{ background: P.surface, border: `1px solid ${P.border}`, borderTop: `3px solid ${c}`, borderRadius: 8, padding: '12px 14px' }}><div style={{ fontSize: 10, fontWeight: 700, color: P.muted }}>{t}</div><div style={{ fontSize: 26, fontWeight: 800, margin: '4px 0' }}>{n}</div><div style={{ fontSize: 11, color: P.muted }}>{sub}</div></div>)}
    </div>
    <div style={{ display: 'flex', gap: 8, background: '#eef2ff', borderRadius: 8, padding: 5, width: 'fit-content', marginBottom: 12 }}>
      {[['active', `Current Requests (${pending})`], ['history', 'Request History']].map(([k, t]) => <button key={k} onClick={() => setStatusFilter(k)} style={{ ...buttonStyle, border: 0, background: statusFilter === k ? '#fff' : 'transparent', boxShadow: statusFilter === k ? '0 1px 3px #cbd5e1' : 'none' }}>{t}</button>)}
    </div>
    {error && <div style={{ padding: '9px 12px', background: P.redBg, color: P.red, borderRadius: 6, fontSize: 12, marginBottom: 10 }}>{error}</div>}
    <div className="workflow-review-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.55fr) minmax(320px, .95fr)', gap: 12, alignItems: 'start' }}>
      <div>
        <div style={{ background: P.surface, border: `1px solid ${P.border}`, borderRadius: 8, padding: 10, marginBottom: 9, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 180px', display: 'flex', alignItems: 'center', gap: 7, border: `1px solid ${P.border}`, borderRadius: 6, padding: '7px 9px' }}><Search size={14} color={P.muted} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search entity or form…" style={{ border: 0, outline: 0, width: '100%', fontSize: 12 }} /></div>
          <select value={statusFilter === 'history' ? 'history' : 'active'} onChange={(e) => setStatusFilter(e.target.value)} style={selectStyle}><option value="active">All active requests</option><option value="history">Request history</option></select>
          <span style={{ alignSelf: 'center', fontSize: 11, color: P.muted }}>Scope: {snapshot.root_node?.name || 'Assigned entities'}</span>
        </div>
        <div style={{ background: P.surface, border: `1px solid ${P.border}`, borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ padding: '10px 12px', background: '#eef2ff', fontSize: 12, fontWeight: 700 }}>Request ID &amp; Metric / Origin Entity / Type &amp; Status</div>
          {loading ? <div style={emptyStyle}>Loading scoped reports…</div> : reports.length === 0 ? <div style={emptyStyle}>No submitted reports in this view yet.</div> : reports.map((r) => { const [fg, bg] = statusColor(r.status); return <button key={r.id} onClick={() => setSelectedId(r.id)} style={{ width: '100%', textAlign: 'left', border: 0, borderBottom: `1px solid ${P.border}`, padding: '11px 12px', background: selected?.id === r.id ? '#eff6ff' : '#fff', display: 'grid', gridTemplateColumns: '1.15fr 1fr auto', gap: 8, alignItems: 'center', cursor: 'pointer', color: P.ink }}><div><b style={{ fontSize: 11, fontFamily: 'monospace' }}>P6-{r.node.id}-{r.ownerRole}</b><div style={{ fontSize: 12, fontWeight: 650, marginTop: 3 }}>{r.formTitle}</div></div><div><div style={{ fontSize: 12 }}>{r.node.name}</div><div style={{ fontSize: 10, color: P.muted }}>{titleCase(r.ownerRole)} · {r.fields.length} populated fields</div></div><span style={{ color: fg, background: bg, borderRadius: 5, padding: '4px 7px', fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap' }}>{labelStatus(r.status)}</span></button>; })}
          <div style={{ padding: '8px 12px', fontSize: 10, color: P.muted }}>Showing {reports.length} records scoped to {snapshot.root_node?.name || 'your assigned hierarchy'}.</div>
        </div>
        <div style={{ marginTop: 9, padding: 12, borderRadius: 8, background: '#eef2ff', fontSize: 11, lineHeight: 1.5, color: '#334155' }}><b>Maker-checker control:</b> A user cannot review their own submission. Reports are shown only within the authenticated user’s assigned hierarchy.</div>
      </div>
      <div style={{ background: P.surface, border: `1px solid ${P.border}`, borderRadius: 9, padding: 14, boxShadow: '0 2px 5px #0f172a0d', maxHeight: 'calc(100vh - 220px)', overflowY: 'auto' }}>
        {!selected ? <div style={emptyStyle}>Select a report to inspect its submitted data.</div> : <>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}><b style={{ fontSize: 14 }}>Request Details</b><span style={{ fontSize: 10, background: P.blueBg, color: P.blue, padding: '4px 7px', borderRadius: 4 }}>{titleCase(selected.ownerRole)}</span></div>
          <div style={{ fontSize: 19, fontWeight: 800, marginTop: 10, overflowWrap: 'anywhere' }}>{selected.node.name}</div>
          {(() => { const [fg, bg] = statusColor(selected.status); return <span style={{ display: 'inline-block', margin: '5px 0 12px', color: fg, background: bg, borderRadius: 5, padding: '4px 8px', fontSize: 10, fontWeight: 700 }}>{labelStatus(selected.status)}</span>; })()}
          <div style={{ background: '#eef2ff', borderRadius: 7, padding: 10, marginBottom: 12 }}><div style={sectionTitle}>ROUTING &amp; GOVERNANCE</div><div style={detailGrid}><span>Source entity</span><b>{selected.node.name}</b><span>Destination / reviewer scope</span><b>{snapshot.root_node?.name || 'Assigned entity'}</b><span>Submitted by role</span><b>{titleCase(selected.ownerRole)}</b><span>Submission status</span><b>{labelStatus(selected.status)}</b></div></div>
          <div style={sectionTitle}>SUBMITTED DATA</div>
          {selected.fields.length ? <div style={{ border: `1px solid ${P.border}`, borderRadius: 7, overflow: 'hidden', margin: '7px 0 12px' }}>{selected.fields.map(([fid, v]) => <div key={fid} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 8, padding: '7px 9px', borderBottom: `1px solid ${P.border}`, fontSize: 11 }}><span style={{ color: P.muted }}>{fid}</span><b>{typeof v.current === 'object' ? JSON.stringify(v.current) : (v.current ?? '—')}<span style={{ color: P.muted, fontWeight: 400 }}>{v.previous != null ? ` · Prev: ${v.previous}` : ''}</span></b></div>)}</div> : <div style={{ ...emptyStyle, padding: 12 }}>No populated fields in this report.</div>}
          <div style={sectionTitle}>ATTACHED EVIDENCE ({evidence.length})</div>{evidence.length ? <div style={{ margin: '7px 0 12px' }}>{evidence.map((file) => <div key={file.evidence_id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', padding: '8px', marginBottom: 5, background: '#f8fafc', border: `1px solid ${P.border}`, borderRadius: 6 }}><div style={{ minWidth: 0 }}><div style={{ fontSize: 10, fontWeight: 650, overflowWrap: 'anywhere' }}>{file.file_name}</div><div style={{ fontSize: 9, color: P.muted }}>{file.mime_type || 'File'} · {file.uploaded_by || 'Submitter'}</div></div><button type="button" onClick={() => inspectEvidence(file)} style={buttonStyle}><Eye size={11} /> Inspect</button></div>)}</div> : <div style={{ fontSize: 11, color: P.muted, padding: '7px 0 12px' }}>No evidence attached.</div>}
          <div style={sectionTitle}>CHRONOLOGICAL REVIEW RECORD</div><div style={{ borderLeft: `2px solid ${P.border}`, margin: '8px 0 14px 5px', paddingLeft: 12, fontSize: 11, color: P.muted }}>{(selected.status?.history || []).length ? [...selected.status.history].reverse().map((event, i) => <div key={`${event.created_at}-${i}`} style={{ marginBottom: 9, position: 'relative' }}><span style={{ position: 'absolute', left: -17, top: 2, width: 8, height: 8, borderRadius: 20, background: event.event === 'accepted' ? P.green : event.event === 'rejected' ? P.red : P.blue }} /><b style={{ color: P.ink }}>{event.event === 'submitted' ? `Submitted${event.revision ? ` (revision ${event.revision})` : ''}` : titleCase(event.event)}</b><div>{event.actor_name || event.actor_id || 'System'}{event.created_at ? ` · ${new Date(event.created_at).toLocaleString()}` : ''}</div>{event.reason && <div>Reason: {event.reason}</div>}{event.snapshot && <div>{Object.keys(event.snapshot).length} fields captured in this submission version.</div>}</div>) : <div>No audit events have been recorded for this report yet.</div>}</div>
          {selected.canReview && <><textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Correction reason (required when returning)" rows={3} style={{ width: '100%', boxSizing: 'border-box', border: `1px solid ${P.border}`, borderRadius: 6, padding: 9, resize: 'vertical', font: '12px inherit', marginBottom: 8 }} /><div style={{ display: 'flex', gap: 7 }}><button disabled={busy} onClick={() => review('accepted')} style={{ ...buttonStyle, flex: 1, justifyContent: 'center', background: P.green, color: '#fff' }}><CheckCircle size={13} /> Accept</button><button disabled={busy || !comment.trim()} onClick={() => review('rejected')} style={{ ...buttonStyle, flex: 1, justifyContent: 'center', color: P.red }}><XCircle size={13} /> Return</button></div><div style={{ fontSize: 10, color: P.muted, marginTop: 7 }}>Acceptance updates the current review status. Later hierarchy approvals remain separate.</div></>}
        </>}
      </div>
    </div>
  </div>;
}

const buttonStyle = { border: '1px solid #cbd5e1', borderRadius: 6, padding: '7px 10px', background: '#fff', color: '#334155', fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' };
const selectStyle = { border: '1px solid #e2e8f0', borderRadius: 6, padding: '7px 9px', background: '#fff', color: '#334155', fontSize: 11 };
const emptyStyle = { padding: 24, textAlign: 'center', fontSize: 12, color: '#64748b' };
const sectionTitle = { fontSize: 9, fontWeight: 800, letterSpacing: '.06em', color: '#64748b' };
const detailGrid = { display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '6px 9px', fontSize: 10, marginTop: 7 };
