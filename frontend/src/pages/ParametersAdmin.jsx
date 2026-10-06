import React, { useState } from 'react';
import { Search, Sliders, CheckCircle2, BookOpen, ExternalLink, Plus, Code2 } from 'lucide-react';
import { useParametersCatalog } from '../hooks/useApi';

export default function ParametersAdmin() {
  const { data: parameters = [] } = useParametersCatalog();
  const [search, setSearch] = useState('');
  const [selectedParam, setSelectedParam] = useState(parameters[0] || null);

  const filtered = parameters.filter((p) => {
    return p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.code.toLowerCase().includes(search.toLowerCase()) ||
      p.definition.toLowerCase().includes(search.toLowerCase());
  });

  const active = selectedParam || filtered[0] || parameters[0];

  return (
    <div className="page-content">
      {/* Header (Section 26 Specification) */}
      <div className="page-header">
        <div>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontWeight: 600 }}>
            System Configuration
          </div>
          <h1 className="page-title" style={{ marginTop: '2px' }}>
            ESG Parameter Administration
          </h1>
          <p className="page-sub">
            Configure enterprise definitions, regulatory unit conversions, calculation roles, and evidence requirements.
          </p>
        </div>

        <button className="btn btn-primary btn-sm" onClick={() => alert('New parameter creation modal')}>
          <Plus size={13} />
          <span>New Parameter</span>
        </button>
      </div>

      {/* 2-Column Admin Interface: Left Search List + Right Detail Specs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', alignItems: 'flex-start' }}>
        {/* Left List */}
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} color="var(--text-tertiary)" style={{ position: 'absolute', left: '10px', top: '12px' }} />
              <input
                type="text"
                placeholder="Search parameters by name, code, definition…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-control"
                style={{ width: '100%', paddingLeft: '32px' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {filtered.map((p) => {
              const isSelected = active?.id === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedParam(p)}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--border-subtle)',
                    background: isSelected ? 'var(--bg-subtle)' : 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {p.name}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                      {p.code} · {p.unit}
                    </div>
                  </div>
                  <span style={{ fontSize: '10px', background: 'var(--bg-muted)', border: '1px solid var(--border-default)', padding: '2px 6px', borderRadius: '4px', color: 'var(--text-secondary)' }}>
                    {p.version}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Detail Pane (Section 26 Specification) */}
        {active && (
          <div className="card">
            <div className="card-header">
              <div>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                  Parameter Definition Spec
                </span>
                <div className="card-title" style={{ fontSize: '18px', marginTop: '2px' }}>
                  {active.name}
                </div>
              </div>
              <span className="badge badge-ready">{active.version} Active</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '2px' }}>Regulatory Definition</div>
                <div style={{ color: 'var(--text-primary)', lineHeight: 1.5 }}>{active.definition}</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', padding: '12px', background: 'var(--bg-subtle)', borderRadius: '6px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Standard Unit</div>
                  <div style={{ fontWeight: 600, fontFamily: 'var(--font-mono)', marginTop: '2px' }}>{active.unit}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>BRSR Mapping</div>
                  <div style={{ fontWeight: 600, fontFamily: 'var(--font-mono)', marginTop: '2px' }}>{active.brsrMapping}</div>
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '2px' }}>Calculation Role</div>
                <div style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{active.calculationRole}</div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '2px' }}>Evidence Requirements</div>
                <div style={{ color: 'var(--text-primary)' }}>{active.evidenceReq}</div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '2px' }}>Sector Applicability</div>
                <div style={{ color: 'var(--text-secondary)' }}>{active.applicability}</div>
              </div>
            </div>

            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => alert('View version history diff...')}>
                Version History
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => alert('Parameter updated')}>
                Edit Configuration
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
