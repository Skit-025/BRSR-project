import { useState } from 'react';
import { useReports, useCompileReport } from '../hooks/useApi';
import { FileBarChart, Download, Play, CheckCircle, Hash, Calendar, Building2, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';

const MOCK_REPORTS = [
  {
    id: 1, name: 'MEIL BRSR FY 2024-25', period: 'FY 2024-25', node: 'MEIL Group',
    status: 'compiled', compiled_at: '2024-10-04 14:45',
    sha256_seal: 'f3a9c2b1d8e74f65a2309b4c7d1e8f29a43c56b7d8e90f123456789abcdef01',
    sections: ['Section A', 'Section B', 'Section C – P1 to P9'],
    completeness: 74,
    highlights: [
      'Total GHG (Scope 1+2): 6,480 tCO₂e',
      'Renewable Energy Share: 18%',
      'Total Employees: 12,480 (28% female)',
      'LTIFR: 0.34 per million hours',
      'CSR Expenditure: ₹8.4 Cr',
    ]
  },
  {
    id: 2, name: 'MEIL BRSR FY 2023-24', period: 'FY 2023-24', node: 'MEIL Group',
    status: 'compiled', compiled_at: '2024-09-01 10:00',
    sha256_seal: 'a1b2c3d4e5f6789012345678abcdef0123456789abcdef0123456789abcdef01',
    sections: ['Section A', 'Section B', 'Section C – P1 to P9'],
    completeness: 91,
    highlights: [
      'Total GHG (Scope 1+2): 7,100 tCO₂e',
      'Renewable Energy Share: 12%',
      'Total Employees: 11,200 (24% female)',
    ]
  },
];

const SECTION_A = [
  { field: 'Corporate Identity Number (CIN)', value: 'U40300TG1981PLC002978' },
  { field: 'Registered Name', value: 'Megha Engineering & Infrastructures Ltd.' },
  { field: 'Year of Incorporation', value: '1989' },
  { field: 'Registered Office', value: 'Hyderabad, Telangana, India' },
  { field: 'Total Employees (Permanent)', value: '12,480' },
  { field: 'Total Workers', value: '4,200' },
  { field: 'Reporting Period', value: 'April 1, 2024 – March 31, 2025' },
  { field: 'Reporting Boundary', value: 'Consolidated (Equity Basis)' },
  { field: 'Stock Exchange(s)', value: 'BSE, NSE' },
];

const SECTION_B_PRINCIPLES = [
  { p: 'P1', label: 'Business Ethics & Transparency', coverage: 85 },
  { p: 'P2', label: 'Sustainable Products & Services', coverage: 72 },
  { p: 'P3', label: 'Employee Wellbeing', coverage: 90 },
  { p: 'P4', label: 'Stakeholder Engagement', coverage: 68 },
  { p: 'P5', label: 'Human Rights', coverage: 78 },
  { p: 'P6', label: 'Environment', coverage: 82 },
  { p: 'P7', label: 'Policy Advocacy', coverage: 55 },
  { p: 'P8', label: 'Inclusive Growth (CSR)', coverage: 94 },
  { p: 'P9', label: 'Customer Value', coverage: 70 },
];

export default function Reporting() {
  const { data } = useReports();
  const compileReport = useCompileReport();
  const reports = data || MOCK_REPORTS;

  const [selected, setSelected] = useState(reports[0]?.id || null);
  const [section, setSection]   = useState('overview');
  const [compiling, setCompiling] = useState(false);

  const report = reports.find(r => r.id === selected) || reports[0];

  const handleCompile = async () => {
    setCompiling(true);
    try { await compileReport.mutateAsync({ node_id: 1, period_id: 1 }); } catch {}
    setTimeout(() => setCompiling(false), 2500);
  };

  const handleExport = (type) => {
    alert(`Export as ${type.toUpperCase()} – in production this downloads the file from /reporting/export/${type}/${report?.id}`);
  };

  return (
    <div className="page-content anim-fade">
      <div className="page-header">
        <div>
          <h1 className="page-title">BRSR Report</h1>
          <p className="page-subtitle">SEBI Business Responsibility & Sustainability Report · Cryptographically sealed</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary btn-sm" onClick={() => handleExport('html')}>
            <Download size={13} /> HTML
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => handleExport('pdf')}>
            <Download size={13} /> PDF
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleCompile} disabled={compiling}>
            <Play size={13} /> {compiling ? 'Compiling…' : 'Recompile'}
          </button>
        </div>
      </div>

      <div className="grid-2" style={{ alignItems: 'start', gridTemplateColumns: '300px 1fr' }}>
        {/* Report list */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Reports</div>
          </div>
          {reports.map((r) => (
            <div key={r.id}
              onClick={() => setSelected(r.id)}
              style={{
                padding: '14px 18px',
                borderBottom: '1px solid var(--border-subtle)',
                cursor: 'pointer',
                background: selected === r.id ? 'var(--bg-hover)' : 'transparent',
                transition: 'background 0.15s',
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 13 }}>{r.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 3 }}>
                <Building2 size={10} style={{ display: 'inline', marginRight: 4 }} />{r.node}
              </div>
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="badge badge-green"><CheckCircle size={10} /> {r.status}</span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{r.completeness}% complete</span>
              </div>
              <div className="progress-bar-wrap" style={{ marginTop: 6 }}>
                <div className="progress-bar-fill" style={{ width: `${r.completeness}%` }} />
              </div>
            </div>
          ))}
        </div>

        {/* Report viewer */}
        {report && (
          <div className="flex-col gap-4">
            {/* Seal */}
            <div className="card" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(16,185,129,0.05))', border: '1px solid var(--border-brand)' }}>
              <div className="card-body" style={{ padding: '16px 20px' }}>
                <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
                  <Hash size={14} color="var(--brand-400)" />
                  <span style={{ fontWeight: 700, fontSize: 13 }}>Cryptographic Seal</span>
                  <span className="badge badge-green" style={{ marginLeft: 'auto' }}><CheckCircle size={10} /> SHA-256 Valid</span>
                </div>
                <div className="mono text-sm" style={{ color: 'var(--text-secondary)', wordBreak: 'break-all', fontSize: 10 }}>
                  {report.sha256_seal}
                </div>
                <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}>
                  <Calendar size={10} style={{ display: 'inline', marginRight: 4 }} />
                  Compiled: {report.compiled_at}
                </div>
              </div>
            </div>

            {/* Section tabs */}
            <div className="tabs">
              {['overview', 'section_a', 'section_b', 'highlights'].map(s => (
                <button key={s} className={`tab-btn ${section === s ? 'active' : ''}`}
                  onClick={() => setSection(s)}>
                  {s === 'section_a' ? 'Section A' : s === 'section_b' ? 'Section B' : s === 'highlights' ? 'Key Data' : 'Overview'}
                </button>
              ))}
            </div>

            {/* Overview */}
            {section === 'overview' && (
              <div className="card anim-scale">
                <div className="card-header"><div className="card-title">Report Overview</div></div>
                <div className="card-body flex-col gap-3">
                  {[
                    { l: 'Report Name', v: report.name },
                    { l: 'Period', v: report.period },
                    { l: 'Boundary Node', v: report.node },
                    { l: 'Completeness', v: `${report.completeness}%` },
                    { l: 'Sections Covered', v: report.sections.join(', ') },
                  ].map(({l, v}) => (
                    <div key={l} className="flex justify-between" style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: 10 }}>
                      <span className="text-muted text-sm">{l}</span>
                      <span style={{ fontWeight: 500, textAlign: 'right', maxWidth: '60%' }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Section A */}
            {section === 'section_a' && (
              <div className="card anim-scale">
                <div className="card-header">
                  <div>
                    <div className="card-title">Section A – Company Overview</div>
                    <div className="card-subtitle text-muted text-sm">General disclosures as per SEBI BRSR format</div>
                  </div>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Field</th><th>Disclosure</th></tr></thead>
                    <tbody>
                      {SECTION_A.map(r => (
                        <tr key={r.field}>
                          <td className="text-muted" style={{ fontWeight: 500 }}>{r.field}</td>
                          <td style={{ fontWeight: 600 }}>{r.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Section B */}
            {section === 'section_b' && (
              <div className="card anim-scale">
                <div className="card-header">
                  <div>
                    <div className="card-title">Section B – Management Declaration</div>
                    <div className="card-subtitle text-muted text-sm">Coverage by BRSR principle</div>
                  </div>
                </div>
                <div className="card-body flex-col gap-3">
                  {SECTION_B_PRINCIPLES.map((p) => (
                    <div key={p.p}>
                      <div className="flex justify-between items-center" style={{ marginBottom: 5 }}>
                        <div className="flex items-center gap-2">
                          <span className="badge badge-brand" style={{ minWidth: 32 }}>{p.p}</span>
                          <span style={{ fontSize: 12, fontWeight: 500 }}>{p.label}</span>
                        </div>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono' }}>{p.coverage}%</span>
                      </div>
                      <div className="progress-bar-wrap">
                        <div className={`progress-bar-fill ${p.coverage >= 80 ? 'green' : p.coverage >= 60 ? 'amber' : 'red'}`}
                          style={{ width: `${p.coverage}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Key highlights */}
            {section === 'highlights' && (
              <div className="card anim-scale">
                <div className="card-header">
                  <div className="card-title">Key ESG Highlights</div>
                </div>
                <div className="card-body flex-col gap-2">
                  {report.highlights.map((h, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 14px',
                      background: 'var(--bg-elevated)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)'
                    }}>
                      <CheckCircle size={14} color="var(--emerald-400)" />
                      <span style={{ fontSize: 13 }}>{h}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
