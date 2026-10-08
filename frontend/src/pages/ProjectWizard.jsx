import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Check, Building2, MapPin,
  Tag, Layers, Zap, Droplets, Trash2, Users, Flame,
  Sparkles, RefreshCw, FolderPlus, ChevronDown, CheckSquare, Square
} from 'lucide-react';
import { useOrgNodes, useOrgPeriods } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { orgApi } from '../api/client';


/* ── Steps config ── */
const STEPS = [
  { id: 1, label: 'Name', title: 'What\'s the project called?' },
  { id: 2, label: 'Description', title: 'Tell us about the project' },
  { id: 3, label: 'Details', title: 'Project details' },
  { id: 4, label: 'Applicability', title: 'ESG applicability' },
  { id: 5, label: 'Confirm', title: 'Project ready' },
];

/* ── Sample templates ── */
const TEMPLATES = [
  {
    id: 'road-v2',
    name: 'Road Construction v2',
    applicability: ['energy', 'fuel', 'water', 'waste', 'safety', 'air_quality'],
    confidence: 94,
    description: 'Applies to highway, expressway, and road construction projects. Covers fuel, machinery, labour, and civil works.',
  },
  {
    id: 'ev-v1',
    name: 'Electric Mobility Operations v1',
    applicability: ['energy', 'water', 'waste', 'safety', 'training'],
    confidence: 88,
    description: 'For EV fleet operations including bus and vehicle fleets, depots and charging infrastructure.',
  },
  {
    id: 'power-v1',
    name: 'Power Transmission & Distribution v1',
    applicability: ['energy', 'fuel', 'safety', 'training'],
    confidence: 79,
    description: 'Applies to transmission line, substation, and distribution infrastructure projects.',
  },
];

const ESG_AREAS = [
  { id: 'energy',      label: 'Energy',               icon: Zap,       desc: 'Electricity, renewable energy' },
  { id: 'fuel',        label: 'Fuel',                  icon: Flame,     desc: 'Diesel, petrol, LPG' },
  { id: 'water',       label: 'Water',                 icon: Droplets,  desc: 'Water consumption, recycling' },
  { id: 'waste',       label: 'Waste',                 icon: Trash2,    desc: 'Solid, liquid, hazardous waste' },
  { id: 'safety',      label: 'Worker Safety',         icon: Users,     desc: 'Injuries, incidents, near-misses' },
  { id: 'training',    label: 'Employee Training',     icon: Users,     desc: 'Hours, certifications' },
  { id: 'air_quality', label: 'Air Quality',           icon: Zap,       desc: 'Dust, emissions monitoring' },
  { id: 'biodiversity',label: 'Biodiversity',          icon: Layers,    desc: 'Land use, ecological impact' },
];

// Backend-aligned project types — must match backend ProjectType enum exactly
const PROJECT_TYPES = [
  { label: 'Road / Highway Construction', value: 'road' },
  { label: 'Tunnel / Underground Works', value: 'tunnel' },
  { label: 'Irrigation / Canal / Dam', value: 'irrigation' },
  { label: 'Solar / Renewable Energy', value: 'solar' },
  { label: 'Electric Vehicle (EV) Bus Fleet', value: 'ev_bus' },
  { label: 'Hydrocarbon / Oil & Gas', value: 'hydrocarbon' },
  { label: 'Corporate / Office Operations', value: 'corporate' },
];

const BUS = [
  { id: 'bu-solar', name: 'Solar EPC Business Unit', subsidiary: 'Aarohan Renewable Energy' },
  { id: 'bu-wind', name: 'Wind Power Business Unit', subsidiary: 'Aarohan Renewable Energy' },
  { id: 'bu-civil', name: 'Civil Infrastructure BU', subsidiary: 'Aarohan Infrastructure Projects' },
  { id: 'bu-trans', name: 'Power Transmission BU', subsidiary: 'Aarohan Infrastructure Projects' },
];

function StepBar({ currentStep }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 40 }}>
      {STEPS.map((step, i) => (
        <React.Fragment key={step.id}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: i < STEPS.length - 1 ? 'none' : 'none' }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700,
              background: step.id < currentStep ? 'var(--success)' : step.id === currentStep ? 'var(--text-primary)' : 'var(--bg-muted)',
              color: step.id <= currentStep ? 'white' : 'var(--text-muted)',
              border: `2px solid ${step.id < currentStep ? 'var(--success)' : step.id === currentStep ? 'var(--text-primary)' : 'var(--border)'}`,
              transition: 'all 0.2s',
            }}>
              {step.id < currentStep ? <Check size={14} /> : step.id}
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, color: step.id === currentStep ? 'var(--text-primary)' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              {step.label}
            </div>
          </div>
          {i < STEPS.length - 1 && (
            <div style={{ flex: 1, height: 2, background: step.id < currentStep ? 'var(--success)' : 'var(--border)', margin: '-12px 8px 0', transition: 'background 0.2s' }} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

export default function ProjectWizard() {
  const navigate = useNavigate();
  const { canWriteOrg } = useAuth();
  const { data: nodes = [] } = useOrgNodes();
  const { data: periods = [] } = useOrgPeriods();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [form, setForm] = useState({
    name: '', description: '', type: '', location: '', stage: 'Planning', bu: '',
    activities: [], applicability: [], template: null, period: 'FY 2026',
  });
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiDone, setAiDone] = useState(false);

  const buNodes = useMemo(() => {
    const list = nodes.filter(n => n.type === 'business_unit' || n.type === 'bu');
    return list.length > 0 ? list : BUS;
  }, [nodes]);

  if (!canWriteOrg) {
    return (
      <div className="page-content anim-fade-up" style={{ maxWidth: 560, margin: '80px auto', textAlign: 'center', background: '#fff', padding: '40px 32px', borderRadius: 12, border: '1px solid #e2e8f0' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#09090b', margin: '0 0 8px' }}>Access Restricted</h2>
        <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 24px', lineHeight: 1.5 }}>
          You do not have permission to initialize or configure project entities. Project creation is restricted to Group Administrators and System Administrators.
        </p>
        <button className="btn btn-primary" onClick={() => navigate('/projects')}>
          Return to Projects
        </button>
      </div>
    );
  }

  const handleCreateProject = async () => {
    if (!canWriteOrg) return;
    setSubmitting(true);
    setCreateError(null);
    try {
      const code = 'PRJ-' + form.name.replace(/[^a-zA-Z0-9]/g, '-').toUpperCase().slice(0, 15) + '-' + Date.now().toString().slice(-4);
      const parentId = form.bu && form.bu.length > 10 ? form.bu : (buNodes[0]?.id || null);
      // Use the exact enum value from PROJECT_TYPES — never transform the value
      const projectType = form.type || 'corporate';

      const res = await orgApi.createNode({
        code,
        name: form.name,
        type: 'project',
        parent_id: parentId,
        project_type: projectType,
        project_description: form.description || 'Project created via wizard',
        location_state: form.location || 'India',
        enabled_activity_categories: form.applicability || []
      });
      const newId = res?.data?.id;
      navigate(newId ? `/projects/${newId}` : '/projects');
    } catch (err) {
      const detail = err?.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail :
        Array.isArray(detail) ? detail.map(d => d.msg || JSON.stringify(d)).join('; ') :
        'Failed to create project. Please check the form and try again.';
      setCreateError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const canNext = () => {
    if (step === 1) return form.name.trim().length >= 3;
    if (step === 2) return form.description.trim().length >= 10;
    if (step === 3) return form.type && form.bu && form.location;
    if (step === 4) return form.applicability.length > 0;
    return true;
  };


  const handleNext = () => {
    if (step === 3 && !aiDone) {
      // Simulate AI classification
      setAiAnalyzing(true);
      setTimeout(() => {
        const tmpl = TEMPLATES.find(t => form.type.toLowerCase().includes('road') ? t.id === 'road-v2' : form.type.toLowerCase().includes('electric') ? t.id === 'ev-v1' : t.id === 'power-v1') || TEMPLATES[0];
        setForm(f => ({ ...f, template: tmpl, applicability: tmpl.applicability }));
        setAiAnalyzing(false);
        setAiDone(true);
        setStep(4);
      }, 2000);
      return;
    }
    setStep(s => Math.min(s + 1, 5));
  };

  const toggleApplicability = (id) => {
    setForm(f => ({
      ...f,
      applicability: f.applicability.includes(id)
        ? f.applicability.filter(a => a !== id)
        : [...f.applicability, id],
    }));
  };

  return (
    <div className="page-content anim-fade-up">
      {/* Back */}
      <button
        onClick={() => navigate('/projects')}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13, marginBottom: 8, padding: 0 }}
      >
        <ArrowLeft size={14} /> Projects
      </button>

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Create Project</h1>
          <p className="page-subtitle">Set up a new project for ESG data collection.</p>
        </div>
      </div>

      {/* Wizard card */}
      <div className="card" style={{ maxWidth: 720 }}>
        <div className="card-body" style={{ padding: '32px 36px' }}>
          <StepBar currentStep={step} />

          {/* ── Step 1: Name ── */}
          {step === 1 && (
            <div className="anim-fade" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px', marginBottom: 6 }}>
                  What's the project called?
                </h2>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Give your project a clear, descriptive name.</p>
              </div>
              <div className="form-group">
                <input
                  className="form-control"
                  style={{ fontSize: 18, fontWeight: 600, padding: '14px 16px' }}
                  placeholder="e.g. NH-16 Odisha Highway Expansion"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  autoFocus
                />
                {form.name.length > 2 && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Check size={12} color="var(--success)" /> Looks good
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Step 2: Description ── */}
          {step === 2 && (
            <div className="anim-fade" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px', marginBottom: 6 }}>
                  Tell us about the project
                </h2>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                  A brief description helps identify the right ESG template and applicability rules.
                </p>
              </div>
              <div className="form-group">
                <textarea
                  className="form-control"
                  rows={5}
                  style={{ fontSize: 14, resize: 'vertical' }}
                  placeholder="Describe the project's scope, activities, and key characteristics..."
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  autoFocus
                />
                <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{form.description.length} characters</span>
              </div>
            </div>
          )}

          {/* ── Step 3: Details ── */}
          {step === 3 && (
            <div className="anim-fade" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px', marginBottom: 6 }}>
                  Project details
                </h2>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                  This helps us accurately assign the ESG template and applicability.
                </p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Project Type</label>
                  <select className="form-control" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                    <option value="">Select type...</option>
                    {PROJECT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Business Unit</label>
                  <select className="form-control" value={form.bu} onChange={e => setForm(f => ({ ...f, bu: e.target.value }))}>
                    <option value="">Select BU...</option>
                    {BUS.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Location / State</label>
                  <input
                    className="form-control"
                    placeholder="e.g. Odisha"
                    value={form.location}
                    onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Stage</label>
                  <select className="form-control" value={form.stage} onChange={e => setForm(f => ({ ...f, stage: e.target.value }))}>
                    <option>Planning</option>
                    <option>Pre-construction</option>
                    <option>Construction</option>
                    <option>Operations</option>
                    <option>Decommissioning</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Reporting Period</label>
                  <select className="form-control" value={form.period} onChange={e => setForm(f => ({ ...f, period: e.target.value }))}>
                    <option>FY 2026</option>
                    <option>FY 2025</option>
                  </select>
                </div>
              </div>

              {/* AI note */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)' }}>
                <Sparkles size={14} color="var(--accent)" />
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  Based on your project type and description, we'll suggest an ESG template and applicability in the next step.
                </span>
              </div>
            </div>
          )}

          {/* ── Step 4: Applicability ── */}
          {step === 4 && (
            <div className="anim-fade" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* AI classification result */}
              {form.template && (
                <div style={{ padding: '14px 16px', background: 'var(--accent-subtle)', border: '1px solid var(--accent-border)', borderRadius: 'var(--r-lg)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <Sparkles size={14} color="var(--accent)" />
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>AI Analysis Complete</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {['Project type identified', 'Activities identified', 'Resources identified'].map(item => (
                      <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                        <Check size={11} color="var(--success)" /> {item}
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Suggested template</div>
                      <div style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600 }}>{form.template.name}</div>
                    </div>
                    <span className="badge badge-green">Confidence: {form.template.confidence}%</span>
                  </div>
                </div>
              )}

              <div>
                <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px', marginBottom: 6 }}>
                  ESG applicability
                </h2>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                  Review and adjust the ESG areas that apply to this project. These will determine which data fields need to be filled.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {ESG_AREAS.map(area => {
                  const Icon = area.icon;
                  const checked = form.applicability.includes(area.id);
                  return (
                    <div
                      key={area.id}
                      onClick={() => toggleApplicability(area.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '12px 14px', border: '1px solid',
                        borderColor: checked ? 'var(--success-border)' : 'var(--border)',
                        background: checked ? 'var(--success-subtle)' : 'var(--bg-white)',
                        borderRadius: 'var(--r-md)', cursor: 'pointer',
                        transition: 'all 0.12s',
                      }}
                    >
                      <div style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: checked ? 'var(--success)' : 'var(--text-muted)' }}>
                        {checked ? <CheckSquare size={18} /> : <Square size={18} />}
                      </div>
                      <div style={{ width: 28, height: 28, borderRadius: 'var(--r-sm)', background: checked ? 'var(--success-subtle)' : 'var(--bg-muted)', border: `1px solid ${checked ? 'var(--success-border)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon size={13} color={checked ? 'var(--success)' : 'var(--text-muted)'} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{area.label}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{area.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Check size={13} color="var(--success)" />
                {form.applicability.length} area{form.applicability.length !== 1 ? 's' : ''} selected
              </div>
            </div>
          )}

          {/* ── Step 5: Confirm ── */}
          {step === 5 && (
            <div className="anim-fade" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ textAlign: 'center', padding: '20px 0 0' }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--success-subtle)', border: '1px solid var(--success-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <FolderPlus size={24} color="var(--success)" />
                </div>
                <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>Project ready</h2>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 420, margin: '0 auto' }}>
                  Review your project configuration before creating it.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Summary */}
                <div className="card">
                  <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[
                      { label: 'Project Name', value: form.name },
                      { label: 'Business Unit', value: BUS.find(b => b.id === form.bu)?.name || '-' },
                      { label: 'Type', value: form.type },
                      { label: 'Location', value: form.location },
                      { label: 'Stage', value: form.stage },
                      { label: 'Period', value: form.period },
                    ].map(d => (
                      <div key={d.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{d.label}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{d.value || '—'}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Template */}
                {form.template && (
                  <div style={{ padding: '12px 14px', background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Layers size={16} color="var(--accent)" />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>ESG Collection Template</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{form.template.name}</div>
                    </div>
                    <span className="badge badge-blue">{form.applicability.length} areas</span>
                  </div>
                )}

                {/* Applicability */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 8 }}>ESG Areas Required</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {form.applicability.map(id => {
                      const area = ESG_AREAS.find(a => a.id === id);
                      return area ? (
                        <span key={id} className="badge badge-green">
                          <Check size={10} /> {area.label}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── AI Analyzing overlay ── */}
          {aiAnalyzing && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.96)', borderRadius: 'inherit', gap: 16 }}>
              <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent)' }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Analyzing project...</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {['Identifying project type', 'Mapping activities', 'Selecting template'].map(item => (
                    <div key={item} style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Check size={12} color="var(--success)" /> {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Error Display ── */}
          {createError && (
            <div style={{
              marginTop: 16, padding: '12px 16px', borderRadius: 8,
              background: '#fef2f2', border: '1px solid #fca5a5',
              color: '#991b1b', fontSize: 13, fontWeight: 600,
            }}>
              ❌ {createError}
            </div>
          )}

          {/* ── Navigation ── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 32, paddingTop: 20, borderTop: '1px solid var(--border)', position: 'relative' }}>
            <button
              className="btn btn-secondary"
              onClick={() => step === 1 ? navigate('/projects') : setStep(s => s - 1)}
              disabled={aiAnalyzing}
            >
              <ArrowLeft size={14} /> {step === 1 ? 'Cancel' : 'Back'}
            </button>
            {step < 5 ? (
              <button
                className="btn btn-primary"
                onClick={handleNext}
                disabled={!canNext() || aiAnalyzing}
              >
                {step === 3 ? (
                  <><Sparkles size={14} /> Analyze & Continue</>
                ) : (
                  <>Continue <ArrowRight size={14} /></>
                )}
              </button>
            ) : (
              <button
                className="btn btn-primary"
                style={{ background: 'var(--success)', borderColor: 'var(--success)', opacity: submitting ? 0.7 : 1 }}
                onClick={handleCreateProject}
                disabled={submitting}
              >
                {submitting ? <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Creating...</> : <><Check size={14} /> Create Project</>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
