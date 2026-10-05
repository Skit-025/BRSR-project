import { useState, useRef } from 'react';
import { useEvidenceList, useUploadEvidence } from '../hooks/useApi';
import { Upload, Shield, Eye, Hash, CheckCircle, AlertTriangle, Cpu, FileText, Image, File, X, CloudUpload } from 'lucide-react';

const MOCK_EVIDENCE = [
  { id: 1, filename: 'energy_bill_oct24.pdf', file_type: 'application/pdf', size_bytes: 245760, sha256: 'a3f8c1d2...4e9b', status: 'verified', metric_codes: ['E01'], uploaded_by: 'Ravi K.', uploaded_at: '2024-10-01', ai_extracted: true, ocr_confidence: 94 },
  { id: 2, filename: 'ghg_audit_report.pdf', file_type: 'application/pdf', size_bytes: 1048576, sha256: 'b7e2a9f1...3c5d', status: 'verified', metric_codes: ['E03', 'E04'], uploaded_by: 'Priya S.', uploaded_at: '2024-10-02', ai_extracted: true, ocr_confidence: 88 },
  { id: 3, filename: 'water_meter_sep24.png', file_type: 'image/png', size_bytes: 512000, sha256: 'c5d1e7b3...8f2a', status: 'pending', metric_codes: ['E05'], uploaded_by: 'Anand M.', uploaded_at: '2024-10-03', ai_extracted: false, ocr_confidence: null },
  { id: 4, filename: 'employee_headcount.xlsx', file_type: 'application/vnd.ms-excel', size_bytes: 98304, sha256: 'd9f3a2c8...1e6b', status: 'verified', metric_codes: ['S01', 'S02'], uploaded_by: 'Sneha R.', uploaded_at: '2024-09-28', ai_extracted: false, ocr_confidence: null },
  { id: 5, filename: 'ltifr_calculation.pdf', file_type: 'application/pdf', size_bytes: 184320, sha256: 'e2b8d4f7...9c1a', status: 'hash_mismatch', metric_codes: ['S04'], uploaded_by: 'Vijay T.', uploaded_at: '2024-10-01', ai_extracted: false, ocr_confidence: null },
];

const STATUS_CFG = {
  verified:     { label: 'Verified',      badge: 'badge-green', icon: CheckCircle },
  pending:      { label: 'Pending',       badge: 'badge-amber', icon: Shield },
  hash_mismatch:{ label: 'Hash Mismatch', badge: 'badge-red',   icon: AlertTriangle },
};

function FileTypeIcon({ mime }) {
  if (mime?.includes('pdf'))   return <FileText size={16} color="var(--rose-400)" />;
  if (mime?.includes('image')) return <Image    size={16} color="var(--sky-400)" />;
  return <File size={16} color="var(--text-muted)" />;
}

function fmtBytes(b) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b/1024).toFixed(1)} KB`;
  return `${(b/1024/1024).toFixed(1)} MB`;
}

export default function EvidenceVault() {
  const { data } = useEvidenceList({});
  const uploadEvidence = useUploadEvidence();
  const evidence = data?.items || MOCK_EVIDENCE;

  const [dragging, setDragging]   = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selected, setSelected]   = useState(null);
  const fileRef = useRef();

  const handleDrop = async (e) => {
    e.preventDefault();
    setDragging(false);
    const files = [...e.dataTransfer.files];
    if (!files.length) return;
    setUploading(true);
    const fd = new FormData();
    files.forEach(f => fd.append('file', f));
    try { await uploadEvidence.mutateAsync(fd); } catch { /* demo */ }
    setUploading(false);
  };

  return (
    <div className="page-content anim-fade">
      <div className="page-header">
        <div>
          <h1 className="page-title">Evidence Vault</h1>
          <p className="page-subtitle">SHA-256 verified document repository · AI OCR extraction</p>
        </div>
        <div className="page-actions">
          <span className="badge badge-green"><Shield size={10} /> All hashes valid</span>
          <button className="btn btn-primary btn-sm" onClick={() => fileRef.current?.click()}>
            <Upload size={13} /> Upload File
          </button>
          <input ref={fileRef} type="file" multiple hidden onChange={(e) => {
            const fd = new FormData();
            [...e.target.files].forEach(f => fd.append('file', f));
            uploadEvidence.mutateAsync(fd).catch(() => {});
          }} />
        </div>
      </div>

      {/* Upload drop zone */}
      <div
        className="card"
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${dragging ? 'var(--brand-500)' : 'var(--border-default)'}`,
          background: dragging ? 'rgba(99,102,241,0.06)' : 'var(--bg-card)',
          transition: 'all 0.2s ease',
          cursor: 'pointer'
        }}
        onClick={() => fileRef.current?.click()}
      >
        <div className="card-body" style={{ textAlign: 'center', padding: '36px 20px' }}>
          <CloudUpload size={36} color={dragging ? 'var(--brand-400)' : 'var(--text-muted)'} style={{ margin: '0 auto 12px' }} />
          <div style={{ fontWeight: 600, color: dragging ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
            {uploading ? 'Uploading…' : 'Drop files here or click to upload'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
            PDF, PNG, XLSX, JPG · SHA-256 hash auto-generated · AI OCR on PDFs/Images
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid-4">
        {[
          { label: 'Total Files', value: evidence.length, icon: File, color: 'var(--brand-400)' },
          { label: 'Verified',    value: evidence.filter(e => e.status === 'verified').length, icon: CheckCircle, color: 'var(--emerald-400)' },
          { label: 'AI Extracted', value: evidence.filter(e => e.ai_extracted).length, icon: Cpu, color: 'var(--sky-400)' },
          { label: 'Issues',      value: evidence.filter(e => e.status === 'hash_mismatch').length, icon: AlertTriangle, color: 'var(--rose-400)' },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="card" style={{ padding: '16px 18px' }}>
              <div className="flex items-center gap-2">
                <Icon size={15} color={s.color} />
                <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>{s.label}</span>
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, marginTop: 4 }}>{s.value}</div>
            </div>
          );
        })}
      </div>

      {/* Evidence table */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Uploaded Evidence</div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>File</th>
                <th>Linked Metrics</th>
                <th>SHA-256</th>
                <th>Size</th>
                <th>Status</th>
                <th>AI OCR</th>
                <th>Uploaded By</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {evidence.map((ev) => {
                const cfg = STATUS_CFG[ev.status] || { label: ev.status, badge: 'badge-gray', icon: Shield };
                const Icon = cfg.icon;
                return (
                  <tr key={ev.id} onClick={() => setSelected(selected === ev.id ? null : ev.id)} style={{ cursor: 'pointer' }}>
                    <td>
                      <div className="flex items-center gap-2">
                        <FileTypeIcon mime={ev.file_type} />
                        <span style={{ fontWeight: 500, fontSize: 12 }}>{ev.filename}</span>
                      </div>
                    </td>
                    <td>
                      <div className="flex gap-1" style={{ flexWrap: 'wrap' }}>
                        {ev.metric_codes.map(c => (
                          <span key={c} className="badge badge-brand" style={{ fontSize: 10 }}>{c}</span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <span className="mono text-muted" style={{ fontSize: 10 }}>{ev.sha256}</span>
                    </td>
                    <td className="muted">{fmtBytes(ev.size_bytes)}</td>
                    <td><span className={`badge ${cfg.badge}`}><Icon size={10} /> {cfg.label}</span></td>
                    <td>
                      {ev.ai_extracted
                        ? <span className="badge badge-sky"><Cpu size={10} /> {ev.ocr_confidence}%</span>
                        : <span className="badge badge-gray">—</span>}
                    </td>
                    <td className="muted">{ev.uploaded_by}</td>
                    <td className="muted text-xs">{ev.uploaded_at}</td>
                    <td>
                      <button className="btn btn-ghost btn-sm btn-icon" onClick={e => e.stopPropagation()}>
                        <Eye size={12} />
                      </button>
                    </td>
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
