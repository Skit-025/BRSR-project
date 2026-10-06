import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Check, Clock, Circle, Info, UploadCloud, FileText,
  Sparkles, CheckCircle2, ArrowRight, ShieldCheck, Download,
  ExternalLink, Eye, ChevronRight, Calculator, ArrowUpRight
} from 'lucide-react';
import WhyRequiredModal from '../components/WhyRequiredModal';
import { useAuth } from '../context/AuthContext';

export default function DataEntry() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { switchPersona } = useAuth();

  const [activeSection, setActiveSection] = useState('fuel');
  const [consumption, setConsumption] = useState('12500');
  const [source, setSource] = useState('Fuel Register Logbook');
  const [period, setPeriod] = useState('April 2026');
  const [hasEvidence, setHasEvidence] = useState(true);
  const [aiConfirmed, setAiConfirmed] = useState(true);
  const [whyModalOpen, setWhyModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(searchParams.get('submitted') ? '✓ Submission sent for review' : null);

  useEffect(() => {
    if (toastMessage) {
      const t = setTimeout(() => setToastMessage(null), 4000);
      return () => clearTimeout(t);
    }
  }, [toastMessage]);

  const handleSaveDraft = () => {
    setToastMessage('✓ Submission saved as draft');
  };

  const handleSubmit = () => {
    setToastMessage('✓ Submission sent for review (PRJ-101)');
    setTimeout(() => {
      // Auto-switch to BU reviewer Priya for the demo flow
      switchPersona('priya');
      navigate('/workflow?prj=prj-101');
    }, 1200);
  };

  return (
    <div className="page-content">
      {/* Toast alert */}
      {toastMessage && (
        <div className="toast-container">
          <div className="toast">
            <CheckCircle2 size={15} color="var(--status-ready-text)" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Header (Section 14 Specification) */}
      <div className="page-header" style={{ marginBottom: '20px' }}>
        <div>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontWeight: 600 }}>
            ESG Data Collection
          </div>
          <h1 className="page-title" style={{ marginTop: '2px' }}>
            Highway Expansion (PRJ-101)
          </h1>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            FY 2026 Reporting Cycle · 82% Complete
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button className="btn btn-secondary btn-sm" onClick={handleSaveDraft}>
            Save Draft
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleSubmit}>
            Submit for Review
          </button>
        </div>
      </div>

      {/* Progressive Form Layout (Left section navigation + Right form card) */}
      <div className="esg-form-container">
        {/* Left Navigation for Sections (Section 14 Specification) */}
        <div className="form-section-nav">
          <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-tertiary)', padding: '6px 10px', fontWeight: 600 }}>
            ENERGY
          </div>
          <button
            className={`form-nav-btn ${activeSection === 'electricity' ? 'active' : ''}`}
            onClick={() => setActiveSection('electricity')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Check size={13} color="var(--status-ready-text)" />
              <span>Electricity</span>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>184.2k</span>
          </button>

          <button
            className={`form-nav-btn ${activeSection === 'fuel' ? 'active' : ''}`}
            onClick={() => setActiveSection('fuel')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Check size={13} color="var(--status-ready-text)" />
              <span>Fuel / Diesel</span>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>12.5k L</span>
          </button>

          <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-tertiary)', padding: '12px 10px 6px', fontWeight: 600 }}>
            WATER
          </div>
          <button
            className={`form-nav-btn ${activeSection === 'water' ? 'active' : ''}`}
            onClick={() => setActiveSection('water')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={13} color="var(--status-review-text)" />
              <span>Water Consumption</span>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>48k kL</span>
          </button>

          <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-tertiary)', padding: '12px 10px 6px', fontWeight: 600 }}>
            WASTE
          </div>
          <button
            className={`form-nav-btn ${activeSection === 'waste' ? 'active' : ''}`}
            onClick={() => setActiveSection('waste')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Circle size={12} color="var(--text-tertiary)" />
              <span>Waste Generated</span>
            </div>
          </button>

          <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-tertiary)', padding: '12px 10px 6px', fontWeight: 600 }}>
            SOCIAL & SAFETY
          </div>
          <button
            className={`form-nav-btn ${activeSection === 'safety' ? 'active' : ''}`}
            onClick={() => setActiveSection('safety')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Check size={13} color="var(--status-ready-text)" />
              <span>Worker Safety / LTIFR</span>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>0.12</span>
          </button>
        </div>

        {/* Right Form Card (Sections 15, 16, 17 Specification) */}
        <div className="form-card">
          {/* Form Header with "Why is this required?" (Section 16) */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Fuel Consumption (Diesel)
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                High speed diesel consumed during the reporting period for mobile equipment and batching plants.
              </p>
            </div>

            {/* Signature UX: "Why is this required?" (Section 16 Specification) */}
            <button 
              className="why-required-trigger"
              onClick={() => setWhyModalOpen(true)}
              style={{ border: '1px solid var(--border-default)', background: 'var(--bg-subtle)' }}
            >
              <Info size={13} color="var(--text-secondary)" />
              <span>Why is this required?</span>
            </button>
          </div>

          {/* AI Extraction Banner (Section 17 Specification) */}
          {hasEvidence && (
            <div style={{ padding: '14px 16px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Sparkles size={16} color="#0f172a" />
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a' }}>
                    AI OCR Extraction Verified
                  </div>
                  <div style={{ fontSize: '12px', color: '#475569' }}>
                    Detected <strong>12,500 litres</strong> diesel consumption from <em>Fuel_Register_April.pdf</em> (Confidence 98.4%)
                  </div>
                </div>
              </div>

              <span className="badge badge-ready" style={{ fontSize: '11px' }}>
                ✓ Value Confirmed
              </span>
            </div>
          )}

          {/* Input Controls (Stripe / Ramp Feel) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="input-field">
              <label className="input-label">Consumption (Litres)</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="input-control font-mono"
                  style={{ width: '100%', fontSize: '14px', fontWeight: 600 }}
                  value={consumption}
                  onChange={(e) => setConsumption(e.target.value)}
                />
                <span style={{ position: 'absolute', right: '12px', top: '10px', fontSize: '12px', color: 'var(--text-tertiary)' }}>
                  litres
                </span>
              </div>
            </div>

            <div className="input-field">
              <label className="input-label">Reporting Period</label>
              <input
                type="text"
                className="input-control"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              />
            </div>
          </div>

          <div className="input-field">
            <label className="input-label">Source Register / Log Reference</label>
            <select 
              className="input-control"
              value={source}
              onChange={(e) => setSource(e.target.value)}
            >
              <option>Fuel Register Logbook</option>
              <option>Direct Tanker Delivery Invoice</option>
              <option>Site IOCL Dispenser Telemetry</option>
            </select>
          </div>

          {/* Live Statutory Calculation Preview */}
          <div style={{ padding: '12px 14px', background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '4px', background: 'var(--accent-black)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Calculator size={14} color="#ffffff" />
              </div>
              <div>
                <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontWeight: 600 }}>
                  Statutory Calculation (Scope 1 Direct Emissions)
                </div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', marginTop: '1px' }}>
                  {(Number(String(consumption).replace(/,/g, '')) * 0.00268).toFixed(2)} tCO₂e <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--text-secondary)', fontFamily: 'var(--font-sans)' }}>(BEE PAT Factor: 0.00268 tCO₂e/L)</span>
                </div>
              </div>
            </div>
            <button 
              className="btn btn-ghost btn-sm" 
              onClick={() => navigate('/calculations')}
              style={{ fontSize: '11px', gap: '4px' }}
            >
              <span>Inspect Math Rails</span>
              <ArrowUpRight size={11} />
            </button>
          </div>

          {/* Evidence Upload Section (Section 17 Specification) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Supporting Evidence
            </div>

            {/* Uploaded Document Card */}
            {hasEvidence && (
              <div className="evidence-file-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FileText size={18} color="var(--text-primary)" />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>Fuel_Register_April.pdf</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                      PDF · 1.8 MB · Uploaded 2 minutes ago · SHA-256: 8f3a21b4…
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button 
                    className="btn btn-secondary btn-sm"
                    onClick={() => navigate('/workflow?prj=prj-101')}
                  >
                    <Eye size={12} />
                    <span>Preview in Split View</span>
                  </button>
                  <button 
                    className="btn btn-ghost btn-sm"
                    onClick={() => alert('Downloading Fuel_Register_April.pdf...')}
                  >
                    <Download size={12} />
                  </button>
                </div>
              </div>
            )}

            {/* Drag & Drop Zone */}
            <div 
              className="dropzone"
              onClick={() => { setHasEvidence(true); setToastMessage('✓ Evidence uploaded'); }}
            >
              <UploadCloud size={20} color="var(--text-secondary)" />
              <div style={{ fontSize: '13px', fontWeight: 550, color: 'var(--text-primary)' }}>
                Drag files here or click to browse
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                PDF, XLSX, CSV, JPG · Max 50 MB
              </div>
            </div>
          </div>

          {/* Form Actions Footer */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
              Auto-saved locally 1 minute ago
            </span>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-secondary btn-sm" onClick={handleSaveDraft}>
                Save
              </button>
              <button className="btn btn-primary btn-sm" onClick={handleSubmit}>
                <span>Submit for Review</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Signature UX: "Why is this required?" Modal */}
      <WhyRequiredModal 
        parameterKey="diesel"
        isOpen={whyModalOpen}
        onClose={() => setWhyModalOpen(false)}
      />
    </div>
  );
}
