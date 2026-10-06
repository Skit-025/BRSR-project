import React, { useState } from 'react';
import { X, Sparkles, CheckCircle2, ChevronRight, ChevronLeft, Building2, Layers } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ProjectWizardModal({ isOpen, onClose }) {
  const [step, setStep] = useState(1);
  const [projectName, setProjectName] = useState('Highway Expansion Phase III');
  const [description, setDescription] = useState('Construction of a 50 km four-lane access-controlled highway corridor including earthwork, concrete batching plants, and bituminous road paving.');
  const [projectType, setProjectType] = useState('Roads & Expressways');
  const [location, setLocation] = useState('Odisha');
  const [stage, setStage] = useState('Construction');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzed, setAnalyzed] = useState(true);
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleNext = () => {
    if (step === 3) {
      setIsAnalyzing(true);
      setTimeout(() => {
        setIsAnalyzing(false);
        setAnalyzed(true);
        setStep(4);
      }, 700);
    } else if (step < 5) {
      setStep(prev => prev + 1);
    }
  };

  const handleCreate = () => {
    onClose();
    navigate('/projects/prj-101');
  };

  return (
    <div className="command-backdrop" onClick={onClose} style={{ zIndex: 110 }}>
      <div 
        className="command-modal" 
        onClick={(e) => e.stopPropagation()} 
        style={{ maxWidth: '580px', padding: 0 }}
      >
        {/* Wizard Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-muted)' }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Create New Infrastructure Project
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
              Step {step} of 5 · Guided ESG Setup Wizard
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} style={{ width: '24px', height: '24px' }}>
            <X size={14} />
          </button>
        </div>

        {/* Wizard Body */}
        <div style={{ padding: '24px' }}>
          {/* Step 1 */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  What's the project called?
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Give your operational infrastructure project a clear, recognizable title.
                </p>
              </div>
              <div className="input-field">
                <label className="input-label">Project Name</label>
                <input
                  className="input-control"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g. Highway Expansion Phase III"
                />
              </div>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  Tell us about the project
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Provide an operational summary of civil works, facilities, and key scope items.
                </p>
              </div>
              <div className="input-field">
                <label className="input-label">Project Description</label>
                <textarea
                  className="input-control"
                  style={{ height: '100px', padding: '10px 12px', resize: 'vertical' }}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  Project operational parameters
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Specify the engineering domain and reporting geography.
                </p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="input-field">
                  <label className="input-label">Engineering Domain</label>
                  <select 
                    className="input-control"
                    value={projectType}
                    onChange={(e) => setProjectType(e.target.value)}
                  >
                    <option>Roads & Expressways</option>
                    <option>Renewable Solar & Wind</option>
                    <option>Urban Transit & Metro</option>
                    <option>Heavy Manufacturing</option>
                  </select>
                </div>
                <div className="input-field">
                  <label className="input-label">Location / State</label>
                  <input
                    className="input-control"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>
              </div>
              <div className="input-field">
                <label className="input-label">Project Lifecycle Stage</label>
                <select 
                  className="input-control"
                  value={stage}
                  onChange={(e) => setStage(e.target.value)}
                >
                  <option>Construction</option>
                  <option>Commissioning</option>
                  <option>Operational</option>
                  <option>Retrofit & Expansion</option>
                </select>
              </div>
            </div>
          )}

          {/* Step 4: AI Classification UX (Section 29) */}
          {step === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sparkles size={16} />
                  <span>AI Classification & ESG Mapping</span>
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Our automated classification engine analyzed the project scope against CPCB and SEBI frameworks.
                </p>
              </div>

              <div style={{ padding: '16px', background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', borderRadius: '6px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--status-ready-text)' }}>
                    <CheckCircle2 size={14} />
                    <span style={{ color: 'var(--text-primary)' }}>Project type identified: <strong>Heavy Civil & Linear Roadworks</strong></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--status-ready-text)' }}>
                    <CheckCircle2 size={14} />
                    <span style={{ color: 'var(--text-primary)' }}>Activities identified: <strong>Earthmoving, Asphalt Batching, GenSet Operation</strong></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--status-ready-text)' }}>
                    <CheckCircle2 size={14} />
                    <span style={{ color: 'var(--text-primary)' }}>Key inputs extracted: <strong>High Speed Diesel, Surface Water, Bitumen</strong></span>
                  </div>
                </div>

                <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Suggested Template</div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Road Construction v1</div>
                  </div>
                  <span style={{ fontSize: '12px', background: 'var(--status-ready-bg)', color: 'var(--status-ready-text)', border: '1px solid var(--status-ready-border)', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                    Confidence: 92%
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Step 5 */}
          {step === 5 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  Project ready for deployment
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  All collection templates and validation rules have been configured.
                </p>
              </div>

              <div style={{ padding: '16px', background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', borderRadius: '6px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Project:</span>
                    <span style={{ fontWeight: 600 }}>{projectName}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Assigned Template:</span>
                    <span style={{ fontWeight: 600 }}>Road Construction v1</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Active Parameters:</span>
                    <span style={{ fontWeight: 600 }}>Energy, Diesel, Water, Waste, Worker Safety</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Verification Boundary:</span>
                    <span style={{ fontWeight: 600 }}>Odisha Infrastructure / Construction BU</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
            <button 
              className="btn btn-secondary btn-sm" 
              onClick={() => setStep(prev => prev - 1)}
              disabled={step === 1}
              style={{ opacity: step === 1 ? 0.3 : 1 }}
            >
              <ChevronLeft size={13} />
              <span>Back</span>
            </button>

            {step < 5 ? (
              <button className="btn btn-primary btn-sm" onClick={handleNext}>
                <span>{step === 3 ? 'Analyze with AI' : 'Next Step'}</span>
                <ChevronRight size={13} />
              </button>
            ) : (
              <button className="btn btn-primary btn-sm" onClick={handleCreate}>
                <CheckCircle2 size={14} />
                <span>Create Project & Initialize</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
