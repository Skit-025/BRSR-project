import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, CheckCircle2, ChevronRight, ChevronLeft, Sparkles, X, ArrowUpRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const DEMO_STEPS = [
  {
    step: 1,
    title: 'Group Executive Dashboard',
    summary: 'Inspect the executive ESG overview showing 94.2% corporate reporting coverage, real-time status across 4 subsidiaries, and executive ESG charts.',
    actionLabel: 'Go to Group Overview',
    persona: 'aditya',
    route: '/dashboard',
    highlight: 'Data Coverage 94.2% (↑ 4.2%), 17 Pending Reviews, 8/8 ESG Reports Ready',
  },
  {
    step: 2,
    title: 'Hierarchical Organization Explorer',
    summary: 'Traverse the 7-tier corporate governance structure: Group → Subsidiary (Odisha Infrastructure) → BU (Construction BU) → Project (Highway Expansion).',
    actionLabel: 'Explore Org Hierarchy',
    persona: 'aditya',
    route: '/org',
    highlight: 'Expand/collapse multi-level tree with instant operational ownership metrics',
  },
  {
    step: 3,
    title: 'Project Overview & Applicability',
    summary: 'Open the Highway Expansion project. Review project boundary, construction stage, and AI-mapped applicable ESG parameters.',
    actionLabel: 'View Highway Expansion',
    persona: 'rahul',
    route: '/projects/prj-101',
    highlight: 'Infrastructure / Construction BU · Status: In Review · 87% Complete',
  },
  {
    step: 4,
    title: 'Progressive ESG Form & Signature UX',
    summary: 'Open the Diesel Fuel consumption entry. Inspect the "Why is this required?" signature popover explaining business and Scope 1 calculation needs.',
    actionLabel: 'Open Dynamic ESG Form',
    persona: 'rahul',
    route: '/collection?prj=prj-101&section=fuel',
    highlight: 'Diesel input: 12,500 L · Signature Popover: Why this data matters & Accepted evidence',
  },
  {
    step: 5,
    title: 'Evidence Upload & AI Extraction',
    summary: 'View the uploaded Fuel_Register_April.pdf evidence file and confirm the AI automated extraction banner before submitting.',
    actionLabel: 'Inspect Evidence & OCR',
    persona: 'rahul',
    route: '/collection?prj=prj-101&section=fuel&evidence=true',
    highlight: 'Fuel_Register_April.pdf (1.8 MB) · AI detected: 12,500 litres [Confirmed]',
  },
  {
    step: 6,
    title: 'Submission for Assurance Review',
    summary: 'Submit the completed project ESG pack into the maker-checker governance queue with tamper-evident SHA-256 audit timestamp.',
    actionLabel: 'Trigger Submission',
    persona: 'rahul',
    route: '/collection?prj=prj-101&submitted=true',
    highlight: 'Status transition: Draft → Submitted with toast confirmation',
  },
  {
    step: 7,
    title: 'Split-Screen Reviewer Interface',
    summary: 'Switch to BU Reviewer persona (Priya). Side-by-side inspection of submitted data against embedded PDF evidence document, then Approve.',
    actionLabel: 'Open Split-Screen Review',
    persona: 'priya',
    route: '/workflow?prj=prj-101',
    highlight: 'Side-by-side: Submitted Data (12,500 L) vs PDF Document Preview [Approve Action]',
  },
  {
    step: 8,
    title: 'Asynchronous Calculation Pipeline',
    summary: 'Witness the automated calculation pipeline: Project data approved → Metrics calculated → BU rollup → Subsidiary aggregation → Group report ready.',
    actionLabel: 'Watch Calculation Pipeline',
    persona: 'aditya',
    route: '/calculations',
    highlight: 'Real-time pipeline stepper advancing across all 5 aggregation layers',
  },
  {
    step: 9,
    title: 'Consolidated SEBI BRSR Report',
    summary: 'Review the completed enterprise BRSR report with Section A, Section B, and Principle 1-9 performance disclosures.',
    actionLabel: 'Open BRSR Report',
    persona: 'aditya',
    route: '/reporting',
    highlight: 'SEBI Annexure II Core Indicators · Principle 6 Environment: 1,284.7 tCO₂e',
  },
  {
    step: 10,
    title: 'Calculation Lineage Drill-Down',
    summary: 'The Signature "Wow" Moment: Click "View calculation lineage" on any report figure to drill all the way from Group Emissions down to Fuel_Register.pdf.',
    actionLabel: 'Trace Calculation Lineage',
    persona: 'aditya',
    route: '/calculations?lineage=true',
    highlight: 'Group (1,284.7) → Odisha (724.3) → BU (412.6) → Project (187.4) → Diesel (12.5k L) → Fuel_Register.pdf',
  },
];

export default function DemoTourModal({ isOpen, onClose }) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const navigate = useNavigate();
  const { switchPersona } = useAuth();

  if (!isOpen) return null;

  const step = DEMO_STEPS[currentStepIndex];

  const handleExecuteStep = () => {
    if (step.persona) {
      switchPersona(step.persona);
    }
    navigate(step.route);
    onClose();
  };

  const handleNext = () => {
    if (currentStepIndex < DEMO_STEPS.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  return (
    <div className="command-backdrop" onClick={onClose} style={{ zIndex: 110 }}>
      <div 
        className="command-modal" 
        onClick={(e) => e.stopPropagation()} 
        style={{ maxWidth: '680px', padding: 0, overflow: 'hidden' }}
      >
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-muted)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--status-ready-text)' }} />
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
              10-Step Executive Demo Walkthrough (Section 46)
            </span>
          </div>
          <button className="icon-btn" onClick={onClose} style={{ width: '24px', height: '24px' }}>
            <X size={14} />
          </button>
        </div>

        {/* Step Navigation Pills */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', overflowX: 'auto', padding: '8px 12px', gap: '4px' }}>
          {DEMO_STEPS.map((s, idx) => (
            <button
              key={s.step}
              onClick={() => setCurrentStepIndex(idx)}
              style={{
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: idx === currentStepIndex ? 600 : 450,
                background: idx === currentStepIndex ? 'var(--accent-black)' : 'transparent',
                color: idx === currentStepIndex ? '#ffffff' : 'var(--text-secondary)',
                border: 'none',
                whiteSpace: 'nowrap',
                transition: 'all 120ms',
              }}
            >
              {s.step}. {s.title.split(' ')[0]}
            </button>
          ))}
        </div>

        {/* Body Content */}
        <div style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)' }}>
              Step {step.step} of 10
            </span>
            <span style={{ fontSize: '11px', background: 'var(--bg-subtle)', border: '1px solid var(--border-default)', padding: '2px 8px', borderRadius: '4px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
              Persona: {step.persona.toUpperCase()}
            </span>
          </div>

          <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '10px' }}>
            {step.title}
          </h3>

          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '16px' }}>
            {step.summary}
          </p>

          <div style={{ padding: '12px 16px', background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', borderRadius: '6px', marginBottom: '24px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '4px' }}>
              Key Verification Moment
            </div>
            <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)' }}>
              {step.highlight}
            </div>
          </div>

          {/* Action Row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                className="btn btn-secondary btn-sm" 
                onClick={handlePrev} 
                disabled={currentStepIndex === 0}
                style={{ opacity: currentStepIndex === 0 ? 0.4 : 1 }}
              >
                <ChevronLeft size={13} />
                <span>Previous</span>
              </button>
              <button 
                className="btn btn-secondary btn-sm" 
                onClick={handleNext} 
                disabled={currentStepIndex === DEMO_STEPS.length - 1}
                style={{ opacity: currentStepIndex === DEMO_STEPS.length - 1 ? 0.4 : 1 }}
              >
                <span>Next</span>
                <ChevronRight size={13} />
              </button>
            </div>

            <button className="btn btn-primary" onClick={handleExecuteStep}>
              <span>{step.actionLabel}</span>
              <ArrowUpRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
