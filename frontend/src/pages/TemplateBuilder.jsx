import React, { useState } from 'react';
import { BookOpen, CheckSquare, Square, Plus, Save, Layers } from 'lucide-react';
import { useTemplatesCatalog } from '../hooks/useApi';

export default function TemplateBuilder() {
  const { data: templates = [] } = useTemplatesCatalog();
  const [selectedTemplate, setSelectedTemplate] = useState(templates[0] || null);
  const [activeParams, setActiveParams] = useState(templates[0]?.parameters || []);
  const [toast, setToast] = useState(null);

  const handleSelectTemplate = (tpl) => {
    setSelectedTemplate(tpl);
    setActiveParams(tpl.parameters);
  };

  const handleToggle = (id) => {
    setActiveParams(prev => prev.map(p => p.id === id ? { ...p, checked: !p.checked } : p));
  };

  const handleSave = () => {
    setToast('✓ Template rules saved and applied to projects');
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="page-content">
      {/* Toast Alert */}
      {toast && (
        <div className="toast-container">
          <div className="toast">
            <span>{toast}</span>
          </div>
        </div>
      )}

      {/* Header (Section 27 Specification) */}
      <div className="page-header">
        <div>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontWeight: 600 }}>
            System Configuration
          </div>
          <h1 className="page-title" style={{ marginTop: '2px' }}>
            ESG Template Builder
          </h1>
          <p className="page-sub">
            Configure dynamic applicability schemas for project domains without code changes.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => alert('New template wizard')}>
            <Plus size={13} />
            <span>Create Template</span>
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleSave}>
            <Save size={13} />
            <span>Save Schema</span>
          </button>
        </div>
      </div>

      {/* 2-Column Template Editor: Left Templates List + Right Parameter Checkbox Config */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '24px', alignItems: 'flex-start' }}>
        {/* Left: Templates */}
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-subtle)', fontWeight: 600, fontSize: '12px' }}>
            Domain Templates
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {templates.map((t) => {
              const isSelected = selectedTemplate?.id === t.id;
              return (
                <div
                  key={t.id}
                  onClick={() => handleSelectTemplate(t)}
                  style={{
                    padding: '14px 16px',
                    borderBottom: '1px solid var(--border-subtle)',
                    background: isSelected ? 'var(--bg-subtle)' : 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {t.name}
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                      {t.code}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Covers: {t.applicableProjectTypes.join(', ')}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Parameter Applicability Checkbox List (Section 27 Specification) */}
        {selectedTemplate && (
          <div className="card">
            <div className="card-header">
              <div>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                  Active Applicability Rules
                </span>
                <div className="card-title" style={{ fontSize: '16px', marginTop: '2px' }}>
                  {selectedTemplate.name}
                </div>
              </div>
              <span className="badge badge-ready">In Production</span>
            </div>

            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Check parameters to mandate evidence and forms for projects inheriting this schema:
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {activeParams.map((param) => (
                <div
                  key={param.id}
                  onClick={() => handleToggle(param.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: '6px',
                    background: param.checked ? 'var(--bg-subtle)' : 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    transition: 'all 120ms',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {param.checked ? (
                      <CheckSquare size={16} color="var(--accent-black)" />
                    ) : (
                      <Square size={16} color="var(--text-tertiary)" />
                    )}
                    <span style={{ fontSize: '13px', fontWeight: param.checked ? 600 : 450, color: 'var(--text-primary)' }}>
                      {param.name}
                    </span>
                  </div>

                  <span style={{ fontSize: '11px', color: param.required ? 'var(--status-warn-text)' : 'var(--text-tertiary)' }}>
                    {param.required ? 'Mandatory Input' : 'Optional Disclosure'}
                  </span>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                Rule updates take effect immediately on project dashboards
              </span>
              <button className="btn btn-primary btn-sm" onClick={handleSave}>
                Save Applicability Schema
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
