import React, { useEffect, useRef, useState, useCallback } from 'react';
import { aarohanApi, evidenceApi, getFriendlyErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';

// ─── Colour tokens ────────────────────────────────────────────────────────────
const C = {
  blue:    '#2563EB',
  blueLt:  '#EFF6FF',
  blueBdr: '#BFDBFE',
  green:   '#059669',
  greenLt: '#ECFDF5',
  greenBdr:'#A7F3D0',
  amber:   '#D97706',
  amberLt: '#FFFBEB',
  red:     '#DC2626',
  redLt:   '#FEF2F2',
  ink:     '#0F172A',
  slate:   '#475569',
  muted:   '#94A3B8',
  border:  '#E2E8F0',
  surface: '#F8FAFC',
  white:   '#FFFFFF',
  purple:  '#7C3AED',
  purpleLt:'#F5F3FF',
};

// ─── ENGINE METADATA ─────────────────────────────────────────────────────────
const ENGINE_META = {
  E1: {
    label: 'Evidence Extraction',
    tag:   'OCR + Field Extraction',
    icon:  '🔍',
    color: C.blue,
    colorLt: C.blueLt,
    help: {
      what: 'Scans any ESG evidence document (electricity bill, fuel receipt, water invoice, etc.) and extracts values directly relevant to BRSR reporting.',
      when: 'Use when you have uploaded an evidence file and want to auto-populate metric fields — saving manual data-entry time.',
      outputs: 'Extracted field names, their values, units, and the corresponding BRSR/GRI indicator each maps to.',
      tip: 'For best results, select the document type before running — the model calibrates its field list accordingly.',
    },
  },
  E2: {
    label: 'Anomaly Detection',
    tag:   'Statistical Outlier Check',
    icon:  '📊',
    color: C.amber,
    colorLt: C.amberLt,
    help: {
      what: 'Runs statistical tests (robust Z-score, IQR, Isolation Forest) plus domain rules to decide whether a submitted metric value is plausible.',
      when: 'Use on any newly submitted or consolidated figure before locking it into the report — catches data-entry errors and unit mismatches early.',
      outputs: 'Anomaly score (0–1), severity flag, list of triggered rules, and a plain-language explanation for reviewers.',
      tip: 'Provide at least 3–4 historical readings and peer values for the most accurate outlier signal.',
    },
  },
  E3: {
    label: 'BRSR Guidance',
    tag:   'Grounded RAG Q&A',
    icon:  '💡',
    color: C.purple,
    colorLt: C.purpleLt,
    help: {
      what: 'Retrieves and synthesises answers from SEBI BRSR, GRI, and NGRBC knowledge bases — grounded, cited, no hallucinations.',
      when: 'Use when you are unsure how to interpret a disclosure requirement, which boundary applies, or how to calculate a specific indicator.',
      outputs: 'Structured answer with source citations, relevant BRSR section references, and actionable next steps.',
      tip: 'Be specific — ask "What boundary applies to Scope 2 energy under BRSR Core?" rather than "Explain energy."',
    },
  },
  E4: {
    label: 'Policy Checker',
    tag:   'Evidence Compliance Scan',
    icon:  '📋',
    color: C.green,
    colorLt: C.greenLt,
    help: {
      what: 'Cross-checks the text of a policy document against SEBI-required checklist criteria for that policy type, flagging gaps and partial coverage.',
      when: 'Use before uploading a policy as evidence — ensures auditors will not flag mandatory clauses as missing.',
      outputs: 'Per-criterion pass/partial/fail table, overall coverage score, and gap remediation hints.',
      tip: 'Paste the full policy text — even if it is long. The model focuses only on the required checklist items.',
    },
  },
  E5: {
    label: 'Narrative Draft',
    tag:   'Number-Locked Drafting',
    icon:  '✍️',
    color: '#0891B2',
    colorLt: '#ECFEFF',
    help: {
      what: 'Drafts the descriptive narrative paragraph for a BRSR section using the approved KPI numbers — those numbers are locked and never altered.',
      when: 'Use after the reporting period is closed and all KPIs are finalised, to speed up the qualitative writing step.',
      outputs: 'Ready-to-use narrative paragraph with locked numbers highlighted and a word-count summary.',
      tip: 'Add bullet context notes (e.g., "major driver was new solar plant") to guide the draft tone.',
    },
  },
  E6: {
    label: 'Value Chain Estimator',
    tag:   'Scope 3 Emission Calc',
    icon:  '🏭',
    color: '#0D9488',
    colorLt: '#F0FDFA',
    help: {
      what: 'Estimates Scope 3 GHG emissions for a value-chain work category using SEBI / GHG Protocol spend-based or activity-based methods.',
      when: 'Use for each contracted work category to produce the Scope 3 line items required under BRSR Core.',
      outputs: 'Estimated tCO₂e, the emission factor used, method (spend vs activity), and confidence level.',
      tip: 'Select the correct work category — the factor database is calibrated per SEBI-recognised categories.',
    },
  },
  E7: {
    label: 'Number Explainer',
    tag:   'Driver & Lineage Analysis',
    icon:  '🔢',
    color: '#DB2777',
    colorLt: '#FDF2F8',
    help: {
      what: 'Explains why a consolidated metric moved the way it did — which entity or event drove the change, and by how much.',
      when: 'Use when reviewers, auditors, or board members ask "why did our emissions increase by 12%?" — produces a cite-able explanation.',
      outputs: 'Driver attribution table, share-of-change bar chart, and a plain-English explanation paragraph.',
      tip: 'Provide delta and entity share data from the consolidation module for the most accurate attribution.',
    },
  },
};

// ─── BILL TYPES for E1 ────────────────────────────────────────────────────────
const BILL_TYPES = [
  { value: 'electricity_bill',     label: '⚡  Electricity Bill',        brsr: 'ENV-ENERGY-001' },
  { value: 'fuel_receipt',         label: '⛽  Fuel / Diesel Receipt',    brsr: 'ENV-EMISSIONS-001' },
  { value: 'water_bill',           label: '💧  Water Invoice',            brsr: 'ENV-WATER-001' },
  { value: 'gas_bill',             label: '🔥  PNG / LPG Bill',           brsr: 'ENV-ENERGY-002' },
  { value: 'waste_disposal',       label: '🗑️   Waste Disposal Invoice',  brsr: 'ENV-WASTE-001' },
  { value: 'travel_expense',       label: '✈️   Travel / Fleet Expense',  brsr: 'ENV-EMISSIONS-003' },
  { value: 'renewable_energy',     label: '☀️   Renewable Energy Cert',   brsr: 'ENV-ENERGY-003' },
  { value: 'carbon_credit',        label: '🌿  Carbon Credit Statement',  brsr: 'ENV-EMISSIONS-004' },
  { value: 'environment_penalty',  label: '⚠️   Environment Penalty',     brsr: 'GOV-LEGAL-001' },
  { value: 'other',                label: '📄  Other Document',           brsr: '' },
];

// ─── METRIC CODES for E2 / E7 ─────────────────────────────────────────────────
const METRIC_CODES = [
  'ENV-ENERGY-001', 'ENV-ENERGY-002', 'ENV-ENERGY-003',
  'ENV-EMISSIONS-001', 'ENV-EMISSIONS-002', 'ENV-EMISSIONS-003',
  'ENV-WATER-001', 'ENV-WATER-002',
  'ENV-WASTE-001', 'ENV-WASTE-002',
  'SOC-SAFETY-001', 'SOC-TRAINING-001', 'SOC-DIVERSITY-001',
  'GOV-LEGAL-001', 'GOV-BOARD-001',
];

// ─── POLICY TYPES for E4 ─────────────────────────────────────────────────────
const POLICY_TYPES = [
  'Environmental Policy',
  'Energy Management Policy',
  'Water Conservation Policy',
  'Waste Management Policy',
  'Climate Change / GHG Policy',
  'Biodiversity Policy',
  'Human Rights Policy',
  'Health & Safety Policy',
  'Supplier / Value Chain Policy',
  'Whistleblower / Grievance Policy',
  'Anti-Bribery & Corruption Policy',
  'Data Privacy Policy',
  'Community Development Policy',
];

// ─── BRSR SECTIONS for E5 ────────────────────────────────────────────────────
const BRSR_SECTIONS = [
  'Section A — General Disclosures',
  'Section B — Management Disclosure',
  'Section C — Principle 1 — Business Conduct',
  'Section C — Principle 2 — Products & Services',
  'Section C — Principle 3 — Employee Wellbeing',
  'Section C — Principle 4 — Stakeholder Engagement',
  'Section C — Principle 5 — Human Rights',
  'Section C — Principle 6 — Environment',
  'Section C — Principle 7 — Policy Advocacy',
  'Section C — Principle 8 — Inclusive Growth',
  'Section C — Principle 9 — Customer Responsibility',
  'BRSR Core — Essential Indicators',
];

// ─── VALUE CHAIN CATEGORIES for E6 ───────────────────────────────────────────
const VC_CATEGORIES = [
  'Civil & Structural Works',
  'Electrical Installation Works',
  'Solar EPC Contract Work',
  'Wind Turbine Installation',
  'HVAC & MEP Works',
  'IT / Technology Services',
  'Logistics & Transportation',
  'Catering & Facility Management',
  'Waste Management Services',
  'Security Services',
  'Professional Services (Legal / Audit)',
  'Equipment Supply & Manufacturing',
  'Raw Material Supply',
];

const VC_UNITS = ['INR Lakhs', 'INR Crores', 'USD', 'EUR', 'Tonnes', 'kWh', 'GJ', 'km', 'Units'];

// ─── QUICK QUESTIONS for E3 ──────────────────────────────────────────────────
const QUICK_QUESTIONS = [
  'What is the reporting boundary for Scope 2 emissions under BRSR Core?',
  'Which BRSR principle covers employee health and safety disclosures?',
  'How should I calculate water intensity under BRSR?',
  'What is the difference between Scope 1, Scope 2, and Scope 3 emissions?',
  'What does "top 75% by value" mean in SEBI value chain rules?',
  'How are renewable energy certificates (RECs) accounted for?',
  'What governance disclosures are mandatory under BRSR Core?',
  'How do I disclose child labour and forced labour compliance?',
];

// ─── PERSISTENT STATE & BACKGROUND JOB RUNNER ─────────────────────────────────
// Ensures calculations/OCR run to completion in the background across tab navigation,
// and user input & generated answers stay intact upon page reload.

export function usePersistentInput(key, defaultValue) {
  const [val, setVal] = useState(() => {
    try {
      const saved = localStorage.getItem(`aarohan_inp_${key}`);
      return saved !== null ? JSON.parse(saved) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const setPersistentVal = useCallback((newVal) => {
    setVal(newVal);
    try {
      localStorage.setItem(`aarohan_inp_${key}`, JSON.stringify(newVal));
    } catch {}
  }, [key]);

  return [val, setPersistentVal];
}

const backgroundJobs = {
  active: new Map(), // engine -> Promise
  listeners: new Set(),
  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  },
  notify() {
    this.listeners.forEach(fn => {
      try { fn(); } catch {}
    });
  },
  start(engine, runnerPromise) {
    this.active.set(engine, runnerPromise);
    try {
      localStorage.setItem(`aarohan_running_${engine}`, 'true');
    } catch {}
    this.notify();

    runnerPromise
      .then((data) => {
        this.active.delete(engine);
        try {
          localStorage.setItem(`aarohan_res_${engine}`, JSON.stringify(data));
          localStorage.removeItem(`aarohan_err_${engine}`);
          localStorage.removeItem(`aarohan_running_${engine}`);
        } catch {}
        this.notify();
      })
      .catch((err) => {
        this.active.delete(engine);
        const friendly = getFriendlyErrorMessage(err, `${engine} engine could not complete the request. Please check inputs and retry.`);
        try {
          localStorage.setItem(`aarohan_err_${engine}`, friendly);
          localStorage.removeItem(`aarohan_res_${engine}`);
          localStorage.removeItem(`aarohan_running_${engine}`);
        } catch {}
        this.notify();
      });
  },
  isRunning(engine) {
    return this.active.has(engine);
  },
  getResult(engine) {
    try {
      const s = localStorage.getItem(`aarohan_res_${engine}`);
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  },
  getError(engine) {
    try {
      return localStorage.getItem(`aarohan_err_${engine}`) || '';
    } catch {
      return '';
    }
  },
  clear(engine) {
    this.active.delete(engine);
    try {
      localStorage.removeItem(`aarohan_res_${engine}`);
      localStorage.removeItem(`aarohan_err_${engine}`);
      localStorage.removeItem(`aarohan_running_${engine}`);
    } catch {}
    this.notify();
  }
};

// ─── SHARED UI PRIMITIVES ─────────────────────────────────────────────────────

function Label({ children, required }) {
  return (
    <div style={{ fontSize: 12, fontWeight: 700, color: C.slate, marginBottom: 5, display: 'flex', gap: 3 }}>
      {children}{required && <span style={{ color: C.red }}>*</span>}
    </div>
  );
}

function Inp({ value, onChange, placeholder, type = 'text', min, max, step, style = {} }) {
  return (
    <input
      type={type} value={value} onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder} min={min} max={max} step={step}
      style={{
        width: '100%', boxSizing: 'border-box', padding: '9px 12px',
        border: `1px solid ${C.border}`, borderRadius: 8,
        fontSize: 13, color: C.ink, background: C.white, outline: 'none',
        transition: 'border-color 0.15s',
        ...style,
      }}
      onFocus={(e) => { e.target.style.borderColor = C.blue; }}
      onBlur={(e) => { e.target.style.borderColor = C.border; }}
    />
  );
}

function Sel({ value, onChange, children, style = {} }) {
  return (
    <select
      value={value} onChange={(e) => onChange(e.target.value)}
      style={{
        width: '100%', boxSizing: 'border-box', padding: '9px 12px',
        border: `1px solid ${C.border}`, borderRadius: 8,
        fontSize: 13, color: C.ink, background: C.white, outline: 'none',
        cursor: 'pointer', ...style,
      }}
    >
      {children}
    </select>
  );
}

function TextArea({ value, onChange, placeholder, rows = 5 }) {
  return (
    <textarea
      value={value} onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder} rows={rows}
      style={{
        width: '100%', boxSizing: 'border-box', padding: '10px 12px',
        border: `1px solid ${C.border}`, borderRadius: 8,
        fontSize: 13, color: C.ink, background: C.white, outline: 'none',
        resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6,
        transition: 'border-color 0.15s',
      }}
      onFocus={(e) => { e.target.style.borderColor = C.blue; }}
      onBlur={(e) => { e.target.style.borderColor = C.border; }}
    />
  );
}

function Tag({ label, color = C.blue, bg = C.blueLt, border = C.blueBdr }) {
  return (
    <span style={{
      display: 'inline-block', fontSize: 11, fontWeight: 700,
      padding: '2px 8px', borderRadius: 999, color, background: bg, border: `1px solid ${border}`,
    }}>
      {label}
    </span>
  );
}

function RunBtn({ onClick, loading, disabled = false, engine, color }) {
  const isDisabled = loading || disabled;
  return (
    <button
      type="button" onClick={onClick} disabled={isDisabled}
      style={{
        padding: '11px 28px', borderRadius: 10, border: 'none',
        background: isDisabled ? C.muted : color, color: '#fff',
        fontWeight: 700, fontSize: 14, cursor: isDisabled ? 'not-allowed' : 'pointer',
        display: 'flex', alignItems: 'center', gap: 8, transition: 'opacity 0.15s',
        opacity: isDisabled ? 0.7 : 1, boxShadow: isDisabled ? 'none' : `0 4px 14px ${color}44`,
      }}
    >
      {loading ? (
        <><SpinIcon /> Analysing...</>
      ) : (
        `▶  Run ${engine}`
      )}
    </button>
  );
}

function SpinIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      style={{ animation: 'spin 0.8s linear infinite' }}>
      <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" />
    </svg>
  );
}

function HelpPanel({ meta }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(p => !p)}
        style={{
          width: 26, height: 26, borderRadius: '50%',
          border: `1.5px solid ${C.border}`, background: C.surface,
          fontSize: 12, fontWeight: 700, color: C.slate,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
        title={`How does ${meta.label} work?`}
      >?</button>
      {open && (
        <div style={{
          position: 'absolute', top: 32, right: 0, zIndex: 999,
          width: 340, background: C.white,
          border: `1px solid ${C.border}`, borderRadius: 12,
          boxShadow: '0 16px 40px rgba(15,23,42,0.12)',
          padding: 18,
        }}>
          <div style={{ fontWeight: 800, color: C.ink, fontSize: 13, marginBottom: 10 }}>
            {meta.icon} {meta.label}
          </div>
          {[
            { k: 'What it does', v: meta.help.what },
            { k: 'When to use', v: meta.help.when },
            { k: 'What you get', v: meta.help.outputs },
            { k: '💡 Tip', v: meta.help.tip },
          ].map(({ k, v }) => (
            <div key={k} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2 }}>{k}</div>
              <div style={{ fontSize: 12, color: C.slate, lineHeight: 1.6 }}>{v}</div>
            </div>
          ))}
          <button onClick={() => setOpen(false)}
            style={{ marginTop: 8, fontSize: 11, color: C.muted, border: 'none', background: 'none', cursor: 'pointer' }}>
            Close ✕
          </button>
        </div>
      )}
    </div>
  );
}

// ─── OUTPUT RENDERERS ─────────────────────────────────────────────────────────

function ResultCard({ title, value, sub, color = C.green }) {
  return (
    <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{title}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color, fontFamily: 'ui-monospace, monospace' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: C.slate }}>{sub}</div>}
    </div>
  );
}

function FieldTable({ rows }) {
  // rows: [{field, value, unit, indicator, confidence}]
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: C.surface }}>
            {['Field', 'Extracted Value', 'Unit', 'BRSR Indicator', 'Confidence'].map(h => (
              <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: C.slate, borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
              <td style={{ padding: '8px 12px', fontWeight: 600, color: C.ink }}>{r.field}</td>
              <td style={{ padding: '8px 12px', color: C.blue, fontFamily: 'ui-monospace, monospace', fontWeight: 700 }}>{r.value ?? '—'}</td>
              <td style={{ padding: '8px 12px', color: C.slate }}>{r.unit ?? '—'}</td>
              <td style={{ padding: '8px 12px' }}>
                {r.indicator ? <Tag label={r.indicator} /> : <span style={{ color: C.muted }}>—</span>}
              </td>
              <td style={{ padding: '8px 12px' }}>
                <ConfBar value={r.confidence} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ConfBar({ value }) {
  if (value == null) return <span style={{ color: C.muted }}>—</span>;
  const pct = Math.round(value * 100);
  const col = pct >= 80 ? C.green : pct >= 60 ? C.amber : C.red;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ flex: 1, height: 6, background: C.border, borderRadius: 999, overflow: 'hidden', minWidth: 60 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: col, borderRadius: 999, transition: 'width 0.6s ease' }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color: col, minWidth: 30 }}>{pct}%</span>
    </div>
  );
}

function ChecklistTable({ items }) {
  const icon = { present: '✓', partial: '!', absent: '×' };
  const color = { present: C.green, partial: C.amber, absent: C.red };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {items.map((item, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'flex-start', gap: 10,
          padding: '10px 14px', borderRadius: 8, background: C.surface,
          border: `1px solid ${C.border}`,
        }}>
          <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{icon[item.status] || '—'}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{item.element}</div>
            {item.quote && <div style={{ fontSize: 12, color: C.slate, marginTop: 2, lineHeight: 1.5 }}>{item.quote}</div>}
            {item.page != null && <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Page {item.page}{item.verified ? ' · Quote verified' : ''}</div>}
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: color[item.status] || C.muted, flexShrink: 0, marginTop: 2 }}>
            {item.status?.toUpperCase()}
          </span>
        </div>
      ))}
    </div>
  );
}

function DriverBar({ drivers }) {
  // drivers: [{entity, delta, share}]
  if (!drivers?.length) return null;
  const max = Math.max(...drivers.map(d => Math.abs(d.delta || 0)));
  const colors = [C.blue, C.purple, '#0D9488', C.amber, C.red];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {drivers.map((d, i) => (
        <div key={i}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
            <span style={{ fontWeight: 600, color: C.ink }}>{d.entity}</span>
            <div style={{ display: 'flex', gap: 10 }}>
              <span style={{ color: C.slate }}>{d.delta > 0 ? '+' : ''}{Number(d.delta).toFixed(1)}</span>
              <span style={{ fontWeight: 700, color: colors[i % colors.length] }}>{Math.round((d.share || 0) * 100)}%</span>
            </div>
          </div>
          <div style={{ height: 10, background: C.border, borderRadius: 999, overflow: 'hidden' }}>
            <div style={{
              width: `${max > 0 ? (Math.abs(d.delta) / max) * 100 : 0}%`,
              height: '100%', background: colors[i % colors.length], borderRadius: 999,
              transition: 'width 0.8s ease',
            }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function NarrativeBox({ text }) {
  // highlight locked numbers
  if (!text) return null;
  const parts = text.split(/(\b\d[\d,.]*\s*(?:tCO2e|kWh|GJ|%|m³|tonnes?|MT|INR|crore|lakh|MW|litre|L|KL|MWh)\b)/gi);
  return (
    <div style={{
      background: '#FAFCFF', border: `1px solid ${C.blueBdr}`, borderRadius: 10,
      padding: '16px 20px', fontSize: 14, color: C.ink, lineHeight: 1.85,
      fontFamily: 'Georgia, "Times New Roman", serif',
    }}>
      {parts.map((part, i) =>
        /\d/.test(part) && i % 2 === 1
          ? <strong key={i} style={{ color: C.blue, background: C.blueLt, borderRadius: 3, padding: '0 3px' }}>{part}</strong>
          : <span key={i}>{part}</span>
      )}
    </div>
  );
}

function SectionTitle({ children }) {
  return <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>{children}</div>;
}

function Divider() {
  return <div style={{ height: 1, background: C.border, margin: '16px 0' }} />;
}

function ErrorBox({ msg }) {
  const clean = getFriendlyErrorMessage(msg);
  return (
    <div style={{ background: C.redLt, border: `1px solid #FECACA`, borderRadius: 10, padding: '12px 16px', fontSize: 13, color: C.red, display: 'flex', gap: 10, alignItems: 'center' }}>
      <span style={{ fontSize: 16 }}>⚠️</span>
      <div style={{ flex: 1, lineHeight: 1.5 }}>{clean}</div>
    </div>
  );
}

function EmptyState({ icon, msg }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 260, gap: 10, color: C.muted }}>
      <span style={{ fontSize: 36 }}>{icon}</span>
      <span style={{ fontSize: 13, maxWidth: 240, textAlign: 'center', lineHeight: 1.6 }}>{msg}</span>
    </div>
  );
}

// ─── ENGINE INPUT FORMS ───────────────────────────────────────────────────────

function E1Form({ onRun, loading }) {
  const [mode, setMode] = usePersistentInput('e1_mode', 'sha'); // 'sha' | 'upload'
  const [shaInput, setShaInput] = usePersistentInput('e1_shaInput', '');
  const [resolving, setResolving] = useState(false);
  const [resolvedDoc, setResolvedDoc] = useState(null);
  const [resolveError, setResolveError] = useState('');
  const [billType, setBillType] = usePersistentInput('e1_billType', 'electricity_bill');
  const [customType, setCustomType] = usePersistentInput('e1_customType', '');
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef(null);

  const bt = BILL_TYPES.find(b => b.value === billType);

  // Resolve SHA-256 hash → evidence metadata
  const handleResolve = useCallback(async () => {
    const sha = shaInput.trim();
    if (!sha) return;
    setResolving(true); setResolveError(''); setResolvedDoc(null);
    try {
      const res = await evidenceApi.bySha(sha);
      setResolvedDoc(res.data);
    } catch (err) {
      setResolveError(err.response?.data?.detail || 'No document found with that SHA-256 hash. Check the Evidence Vault.');
    } finally {
      setResolving(false);
    }
  }, [shaInput]);

  const handleRun = () => {
    if (mode === 'sha' && resolvedDoc) {
      onRun({
        evidence_id: resolvedDoc.id,
        doc_type_hint: resolvedDoc.doc_type || billType,
        filename: resolvedDoc.original_name || resolvedDoc.filename,
        mime_type: resolvedDoc.mime_type,
        file_path: resolvedDoc.storage_key || '/vault/' + resolvedDoc.id,
        _sha256: resolvedDoc.sha256,
      });
    } else if (mode === 'upload' && file) {
      onRun({ file, doc_type_hint: billType === 'other' ? customType : billType });
    }
  };

  const canRun = (mode === 'sha' && resolvedDoc) || (mode === 'upload' && file);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Mode toggle */}
      <div style={{ display: 'flex', gap: 8 }}>
        {[['sha', '🔗 Load by Document ID or SHA-256 (from Vault)'], ['upload', '📤 Upload New File']].map(([m, label]) => (
          <button key={m} type="button" onClick={() => { setMode(m); setResolvedDoc(null); setResolveError(''); setFile(null); }}
            style={{ flex: 1, padding: '9px 12px', borderRadius: 8, fontSize: 12.5, cursor: 'pointer', border: `1.5px solid ${mode === m ? C.blue : C.border}`, background: mode === m ? C.blueLt : C.white, color: mode === m ? C.blue : C.ink, fontWeight: mode === m ? 700 : 500, transition: 'all 0.12s' }}>
            {label}
          </button>
        ))}
      </div>

      {/* Path A — Document ID or SHA lookup */}
      {mode === 'sha' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ background: C.blueLt, border: `1px solid ${C.blueBdr}`, borderRadius: 8, padding: '9px 14px', fontSize: 12, color: C.blue }}>
            📋 Go to <strong>Evidence Vault</strong> → copy either the <strong>Document ID</strong> or the <strong>SHA-256 hash</strong> → paste it here to immediately load the original bill image and run OCR analysis.
          </div>
          <Label required>Document ID (UUID) or SHA-256 Hash</Label>
          <div style={{ display: 'flex', gap: 8 }}>
            <Inp value={shaInput} onChange={(v) => { setShaInput(v); setResolvedDoc(null); setResolveError(''); }}
              placeholder="Paste Document ID (UUID) or SHA-256 hash (64 hex characters)…"
              style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12 }} />
            <button type="button" onClick={async () => {
              const query = shaInput.trim();
              if (!query) return;
              setResolving(true); setResolveError(''); setResolvedDoc(null);
              try {
                let res = null;
                // Try SHA-256 first if length is 64 hex
                if (/^[a-fA-F0-9]{64}$/.test(query)) {
                  try {
                    res = await evidenceApi.bySha(query);
                  } catch (e) {
                    res = await evidenceApi.get(query);
                  }
                } else {
                  try {
                    res = await evidenceApi.get(query);
                  } catch (e) {
                    res = await evidenceApi.bySha(query);
                  }
                }
                setResolvedDoc(res.data);
                if (res.data.doc_type) {
                  setBillType(res.data.doc_type);
                }
              } catch (err) {
                setResolveError(err.response?.data?.detail || 'No document found with that Document ID or SHA-256 hash in the Evidence Vault.');
              } finally {
                setResolving(false);
              }
            }} disabled={resolving || !shaInput.trim()}
              style={{ padding: '9px 16px', borderRadius: 8, border: 'none', background: C.blue, color: '#fff', fontWeight: 700, fontSize: 12, cursor: resolving || !shaInput.trim() ? 'not-allowed' : 'pointer', opacity: resolving || !shaInput.trim() ? 0.6 : 1, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5 }}>
              {resolving ? <><SpinIcon /> Loading…</> : 'Load Image →'}
            </button>
          </div>
          {resolveError && <div style={{ background: C.redLt, border: '1px solid #FECACA', borderRadius: 7, padding: '9px 13px', fontSize: 12, color: C.red }}>⚠️ {typeof resolveError === 'string' ? resolveError : JSON.stringify(resolveError)}</div>}
          {resolvedDoc && (
            <div style={{ background: C.greenLt, border: `1px solid ${C.greenBdr}`, borderRadius: 8, padding: '12px 14px', fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontWeight: 700, color: C.green, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>✓ Document Loaded Directly from Vault</div>
                <a href={evidenceApi.getViewUrl(resolvedDoc.id)} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: C.blue, textDecoration: 'none', fontWeight: 600 }}>
                  Open Full File ↗
                </a>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                <div><span style={{ color: C.muted }}>File: </span><strong style={{ color: C.ink }}>{resolvedDoc.original_name || resolvedDoc.filename}</strong></div>
                <div><span style={{ color: C.muted }}>Type: </span><strong style={{ color: C.ink }}>{(resolvedDoc.doc_type || '—').replace(/_/g, ' ')}</strong></div>
                <div><span style={{ color: C.muted }}>Size: </span>{resolvedDoc.size_bytes ? `${(resolvedDoc.size_bytes / 1024).toFixed(1)} KB` : '—'}</div>
                <div><span style={{ color: C.muted }}>Doc ID: </span><code style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10 }}>{resolvedDoc.id?.slice(0, 16)}…</code></div>
              </div>

              {/* Directly load the original bill image / document preview */}
              <div style={{
                borderRadius: 8, overflow: 'hidden', border: `1px solid ${C.greenBdr}`,
                background: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center',
                minHeight: 180, maxHeight: 340, position: 'relative'
              }}>
                {resolvedDoc.mime_type?.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(resolvedDoc.original_name || '') ? (
                  <img
                    src={evidenceApi.getViewUrl(resolvedDoc.id)}
                    alt={resolvedDoc.original_name || 'Bill Preview'}
                    style={{ maxWidth: '100%', maxHeight: 330, objectFit: 'contain' }}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  <iframe
                    src={evidenceApi.getViewUrl(resolvedDoc.id)}
                    title={resolvedDoc.original_name || 'Document Preview'}
                    style={{ width: '100%', height: 320, border: 'none' }}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Path B — Upload new file */}
      {mode === 'upload' && (
        <>
          <div>
            <Label required>Document / Bill Type</Label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(185px, 1fr))', gap: 8 }}>
              {BILL_TYPES.map(b => (
                <button key={b.value} type="button" onClick={() => setBillType(b.value)}
                  style={{ textAlign: 'left', padding: '9px 12px', borderRadius: 8, fontSize: 12.5, cursor: 'pointer', border: `1.5px solid ${billType === b.value ? C.blue : C.border}`, background: billType === b.value ? C.blueLt : C.white, color: billType === b.value ? C.blue : C.ink, fontWeight: billType === b.value ? 700 : 500, transition: 'all 0.12s' }}>
                  {b.label}
                  {b.brsr && <span style={{ display: 'block', fontSize: 10, color: C.muted, marginTop: 2 }}>{b.brsr}</span>}
                </button>
              ))}
            </div>
          </div>

          {billType === 'other' && (
            <div>
              <Label required>Describe the document type</Label>
              <Inp value={customType} onChange={setCustomType} placeholder="e.g. Boiler fuel log, flight receipt…" />
            </div>
          )}

          <div>
            <Label required>Document File</Label>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)} style={{ display: 'none' }} />
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); setFile(e.dataTransfer.files?.[0] || null); }}
              onClick={() => fileRef.current?.click()}
              style={{ border: `1.5px dashed ${dragging ? C.blue : C.border}`, borderRadius: 8, padding: '22px 16px', textAlign: 'center', background: dragging ? C.blueLt : C.surface, cursor: 'pointer' }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{file?.name || 'Drop a document here or click to browse'}</div>
              <div style={{ fontSize: 11, marginTop: 5, color: C.slate }}>PDF, JPEG, PNG, or WEBP — the E1 engine will OCR and extract BRSR-relevant fields</div>
            </div>
          </div>

          {bt?.brsr && (
            <div style={{ background: C.blueLt, border: `1px solid ${C.blueBdr}`, borderRadius: 8, padding: '10px 14px', fontSize: 12, color: C.blue, display: 'flex', gap: 8 }}>
              <span>🎯</span>
              <span>Maps to BRSR indicator <strong>{bt.brsr}</strong> — the engine calibrates field extraction accordingly.</span>
            </div>
          )}
        </>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <RunBtn onClick={handleRun} loading={loading} engine="E1 — Evidence Extraction" color={C.blue} disabled={!canRun} />
      </div>
    </div>
  );
}


function E2Form({ onRun, loading }) {
  const [metricCode, setMetricCode] = usePersistentInput('e2_metricCode', 'ENV-ENERGY-001');
  const [currentValue, setCurrentValue] = usePersistentInput('e2_currentValue', '');
  const [unit, setUnit] = usePersistentInput('e2_unit', 'kWh');
  const [h1, setH1] = usePersistentInput('e2_h1', ''); const [h2, setH2] = usePersistentInput('e2_h2', '');
  const [h3, setH3] = usePersistentInput('e2_h3', ''); const [h4, setH4] = usePersistentInput('e2_h4', '');
  const [p1, setP1] = usePersistentInput('e2_p1', ''); const [p2, setP2] = usePersistentInput('e2_p2', '');
  const [p3, setP3] = usePersistentInput('e2_p3', '');
  const [site, setSite] = usePersistentInput('e2_site', '');

  const handleRun = () => {
    if (!currentValue || !Number.isFinite(Number(currentValue))) return;
    const history = [h1, h2, h3, h4].map(Number).filter(Boolean);
    const peers = [p1, p2, p3].map(Number).filter(Boolean);
    onRun({
      metric_code: metricCode,
      current_value: Number(currentValue),
      unit,
      history,
      peer_values: peers,
      extra_context: site ? { site } : {},
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <Label required>Metric Code</Label>
          <Sel value={metricCode} onChange={setMetricCode}>
            {METRIC_CODES.map(m => <option key={m} value={m}>{m}</option>)}
          </Sel>
        </div>
        <div>
          <Label required>Unit</Label>
          <Inp value={unit} onChange={setUnit} placeholder="kWh, tCO2e, m³, etc." />
        </div>
      </div>

      <div>
        <Label required>Current Period Value (the value being checked)</Label>
        <Inp type="number" value={currentValue} onChange={setCurrentValue} placeholder="e.g. 2850" />
      </div>

      <div>
        <Label>Site / Context (optional)</Label>
        <Inp value={site} onChange={setSite} placeholder="e.g. Odisha Solar Park, Plant Unit 3" />
      </div>

      <Divider />
      <SectionTitle>Historical Readings (at least 3 recommended — oldest → newest)</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        {[['Period −4', h1, setH1], ['Period −3', h2, setH2], ['Period −2', h3, setH3], ['Period −1', h4, setH4]].map(([label, val, setter]) => (
          <div key={label}>
            <Label>{label}</Label>
            <Inp type="number" value={val} onChange={setter} placeholder="—" />
          </div>
        ))}
      </div>

      <Divider />
      <SectionTitle>Peer / Benchmark Values (optional — same industry)</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {[['Peer 1', p1, setP1], ['Peer 2', p2, setP2], ['Peer 3', p3, setP3]].map(([label, val, setter]) => (
          <div key={label}>
            <Label>{label}</Label>
            <Inp type="number" value={val} onChange={setter} placeholder="—" />
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <RunBtn onClick={handleRun} loading={loading} disabled={!currentValue || !Number.isFinite(Number(currentValue))} engine="E2 — Anomaly Check" color={C.amber} />
      </div>
    </div>
  );
}

function E3Form({ onRun, loading }) {
  const [topic, setTopic] = usePersistentInput('e3_topic', '');
  const [question, setQuestion] = usePersistentInput('e3_question', '');
  const [indicatorCode, setIndicatorCode] = usePersistentInput('e3_indicatorCode', '');

  const handleQuick = (q) => { setQuestion(q); setTopic(''); };

  const handleRun = () => {
    if (!question.trim()) return;
    onRun({
      indicator_code: indicatorCode || 'GENERAL',
      question: question,
      topic: topic || undefined,
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <Label>Quick Questions (click to populate)</Label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
          {QUICK_QUESTIONS.map(q => (
            <button key={q} type="button" onClick={() => handleQuick(q)}
              style={{
                padding: '6px 12px', borderRadius: 999, fontSize: 12, cursor: 'pointer', border: `1px solid ${C.border}`,
                background: question === q ? C.purpleLt : C.surface,
                color: question === q ? C.purple : C.slate,
                fontWeight: question === q ? 700 : 500, transition: 'all 0.12s',
              }}>
              {q}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label required>Your Question</Label>
        <TextArea value={question} onChange={setQuestion} rows={4}
          placeholder="e.g. What boundary applies to Scope 2 energy emissions under BRSR Core reporting?" />
      </div>

      <div>
        <Label>Specific BRSR Indicator (optional)</Label>
        <Sel value={indicatorCode} onChange={setIndicatorCode}>
          <option value="">— Any / General —</option>
          {METRIC_CODES.map(m => <option key={m} value={m}>{m}</option>)}
        </Sel>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <RunBtn onClick={handleRun} loading={loading} disabled={!question.trim()} engine="E3 — Get Guidance" color={C.purple} />
      </div>
    </div>
  );
}

function E4Form({ onRun, loading }) {
  const [policyType, setPolicyType] = usePersistentInput('e4_policyType', POLICY_TYPES[0]);
  const [policyText, setPolicyText] = usePersistentInput('e4_policyText', '');
  const [evidenceId, setEvidenceId] = usePersistentInput('e4_evidenceId', '');

  const handleRun = () => {
    if (!evidenceId.trim()) return;
    onRun({
      evidence_id: evidenceId.trim(),
      policy_type: policyType,
      text_content: policyText,
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <Label required>Policy Type</Label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 8 }}>
          {POLICY_TYPES.map(pt => (
            <button key={pt} type="button" onClick={() => setPolicyType(pt)}
              style={{
                textAlign: 'left', padding: '8px 12px', borderRadius: 8, fontSize: 12.5, cursor: 'pointer',
                border: `1.5px solid ${policyType === pt ? C.green : C.border}`,
                background: policyType === pt ? C.greenLt : C.white,
                color: policyType === pt ? C.green : C.ink,
                fontWeight: policyType === pt ? 700 : 500, transition: 'all 0.12s',
              }}>
              {pt}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label required>Evidence ID (upload the policy to Evidence Vault first)</Label>
        <Inp value={evidenceId} onChange={setEvidenceId} placeholder="e.g. ev-9f3a2..." />
      </div>

      <div>
        <Label required>Paste Policy Text</Label>
        <TextArea value={policyText} onChange={setPolicyText} rows={8}
          placeholder={`Paste the full text of your "${policyType}" here. The engine will check it against SEBI-required clauses.`} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <RunBtn onClick={handleRun} loading={loading} disabled={!evidenceId.trim()} engine="E4 — Check Policy" color={C.green} />
      </div>
    </div>
  );
}

function E5Form({ onRun, loading }) {
  const [section, setSection] = usePersistentInput('e5_section', BRSR_SECTIONS[11]);
  const [period, setPeriod] = usePersistentInput('e5_period', '');
  const [kpis, setKpis] = usePersistentInput('e5_kpis', []);
  const [bullets, setBullets] = usePersistentInput('e5_bullets', '');

  const addKpi = () => setKpis(k => [...k, { key: '', value: '' }]);
  const removeKpi = (i) => setKpis(k => k.filter((_, idx) => idx !== i));
  const updateKpi = (i, field, val) => setKpis(k => k.map((item, idx) => idx === i ? { ...item, [field]: val } : item));

  const handleRun = () => {
    if (!period.trim() || !kpis.some(({ key, value }) => key.trim() && value.trim())) return;
    const approvedKpis = {};
    kpis.forEach(({ key, value }) => { if (key && value) approvedKpis[key] = value; });
    onRun({
      section,
      period,
      approved_kpis: approvedKpis,
      bullets: bullets.split('\n').map(s => s.trim()).filter(Boolean),
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
        <div>
          <Label required>BRSR Section</Label>
          <Sel value={section} onChange={setSection}>
            {BRSR_SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </Sel>
        </div>
        <div>
          <Label required>Reporting Period</Label>
          <Inp value={period} onChange={setPeriod} placeholder="FY 2025-26" />
        </div>
      </div>

      <Divider />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <SectionTitle>Approved KPIs (numbers are locked — AI will not change them)</SectionTitle>
        <button type="button" onClick={addKpi}
          style={{ fontSize: 12, color: C.blue, background: C.blueLt, border: `1px solid ${C.blueBdr}`, borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontWeight: 700 }}>
          + Add KPI
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {kpis.map((kpi, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, alignItems: 'center' }}>
            <Inp value={kpi.key} onChange={v => updateKpi(i, 'key', v)} placeholder="KPI name (e.g. Total Water Withdrawn)" />
            <Inp value={kpi.value} onChange={v => updateKpi(i, 'value', v)} placeholder="Value (e.g. 18,500 m³)" />
            <button type="button" onClick={() => removeKpi(i)}
              style={{ padding: '8px 10px', borderRadius: 6, border: `1px solid ${C.border}`, background: C.white, color: C.red, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>✕</button>
          </div>
        ))}
      </div>

      <div>
        <Label>Context Bullets (one per line — guides the narrative tone)</Label>
        <TextArea value={bullets} onChange={setBullets} rows={3}
          placeholder="New solar plant commissioned in Q2&#10;Target of net-zero Scope 2 by 2030&#10;Energy intensity improved 8% vs prior year" />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <RunBtn onClick={handleRun} loading={loading} disabled={!period.trim() || !kpis.some(({ key, value }) => key.trim() && value.trim())} engine="E5 — Draft Narrative" color="#0891B2" />
      </div>
    </div>
  );
}

function E6Form({ onRun, loading }) {
  const [category, setCategory] = usePersistentInput('e6_category', VC_CATEGORIES[0]);
  const [quantity, setQuantity] = usePersistentInput('e6_quantity', '');
  const [unit, setUnit] = usePersistentInput('e6_unit', 'INR Lakhs');

  const handleRun = () => {
    if (!quantity || !Number.isFinite(Number(quantity))) return;
    onRun({ work_category: category, billed_quantity: Number(quantity), billed_unit: unit });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <Label required>Value Chain Work Category</Label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 8 }}>
          {VC_CATEGORIES.map(cat => (
            <button key={cat} type="button" onClick={() => setCategory(cat)}
              style={{
                textAlign: 'left', padding: '9px 12px', borderRadius: 8, fontSize: 12.5, cursor: 'pointer',
                border: `1.5px solid ${category === cat ? '#0D9488' : C.border}`,
                background: category === cat ? '#F0FDFA' : C.white,
                color: category === cat ? '#0D9488' : C.ink,
                fontWeight: category === cat ? 700 : 500, transition: 'all 0.12s',
              }}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
        <div>
          <Label required>Billed Quantity / Amount</Label>
          <Inp type="number" value={quantity} onChange={setQuantity} placeholder="e.g. 250" />
        </div>
        <div>
          <Label required>Unit</Label>
          <Sel value={unit} onChange={setUnit}>
            {VC_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
          </Sel>
        </div>
      </div>

      <div style={{ background: '#F0FDFA', border: '1px solid #99F6E4', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#0D9488' }}>
        <strong>SEBI Rule:</strong> Scope 3 emissions must be estimated for contracted partners that fall within your top 75% by value boundary. This engine applies the GHG Protocol spend-based / activity-based factor for the selected category.
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <RunBtn onClick={handleRun} loading={loading} disabled={!quantity || !Number.isFinite(Number(quantity))} engine="E6 — Estimate Scope 3" color="#0D9488" />
      </div>
    </div>
  );
}

function E7Form({ onRun, loading }) {
  const [consolidatedValueId, setConsolidatedValueId] = usePersistentInput('e7_consolidatedValueId', '');
  const [metricCode, setMetricCode] = usePersistentInput('e7_metricCode', '');
  const [period, setPeriod] = usePersistentInput('e7_period', '');
  const [question, setQuestion] = usePersistentInput('e7_question', '');
  const [entity, setEntity] = usePersistentInput('e7_entity', '');
  const [delta, setDelta] = usePersistentInput('e7_delta', '');
  const [share, setShare] = usePersistentInput('e7_share', '');

  const handleRun = () => {
    if (!consolidatedValueId.trim() || !metricCode || !period.trim()) return;
    onRun({
      consolidated_value_id: consolidatedValueId.trim(),
      metric_code: metricCode,
      period,
      question: question || `Explain the main driver of change in ${metricCode} for ${period}.`,
      lineage_data: entity ? {
        entity,
        delta: Number(delta),
        share: Number(share),
        drivers: entity ? [{ entity, delta: Number(delta), share: Number(share) }] : [],
      } : {},
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <Label required>Consolidated Value ID</Label>
        <Inp value={consolidatedValueId} onChange={setConsolidatedValueId} placeholder="ID from the Consolidation module" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <Label required>Metric Code</Label>
          <Sel value={metricCode} onChange={setMetricCode}>
            <option value="">Select a metric</option>
            {METRIC_CODES.map(m => <option key={m} value={m}>{m}</option>)}
          </Sel>
        </div>
        <div>
          <Label required>Reporting Period</Label>
          <Inp value={period} onChange={setPeriod} placeholder="FY 2025-26" />
        </div>
      </div>

      <div>
        <Label required>Question / Focus</Label>
        <TextArea value={question} onChange={setQuestion} rows={3}
          placeholder="e.g. Why did total energy consumption increase by 12%? Which entity drove the change?" />
      </div>

      <Divider />
      <SectionTitle>Known Driver Data (from Consolidation module — optional but improves accuracy)</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 10 }}>
        <div>
          <Label>Top Contributing Entity</Label>
          <Inp value={entity} onChange={setEntity} placeholder="e.g. Odisha Wind Farm BU" />
        </div>
        <div>
          <Label>Delta (absolute change)</Label>
          <Inp type="number" value={delta} onChange={setDelta} placeholder="e.g. 320" />
        </div>
        <div>
          <Label>Share (0–1)</Label>
          <Inp type="number" value={share} onChange={setShare} placeholder="e.g. 0.62" min="0" max="1" step="0.01" />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <RunBtn onClick={handleRun} loading={loading} disabled={!consolidatedValueId.trim() || !metricCode || !period.trim()} engine="E7 — Explain Number" color="#DB2777" />
      </div>
    </div>
  );
}

// ─── OUTPUT PANELS ────────────────────────────────────────────────────────────

function calcEsgImpact(docType, fields) {
  if (!fields || !fields.length) return null;
  const primaryField = fields.find(f => {
    const val = Number(f.value);
    return Number.isFinite(val) && val > 0;
  });
  if (!primaryField) return null;
  const q = Number(primaryField.value);
  const u = (primaryField.unit || '').toLowerCase();
  const dt = (docType || '').toLowerCase();

  if (dt.includes('electric') || u.includes('kwh') || u.includes('mwh')) {
    const kwh = u.includes('mwh') ? q * 1000 : q;
    return {
      energy_gj: (kwh * 3.6 / 1000).toFixed(2),
      ghg_tco2e: (kwh * 0.000708).toFixed(4),
      scope: 'Scope 2 (Electricity Grid)',
      factor: '0.708 kgCO₂e/kWh (India Central Electricity Authority 2023)',
      metric: 'ENV-ENERGY-001',
      consumed: `${kwh.toLocaleString()} kWh`,
    };
  }
  if (dt.includes('diesel') || dt.includes('fuel')) {
    return {
      energy_gj: (q * 35.8 / 1000).toFixed(2),
      ghg_tco2e: (q * 2.6841 / 1000).toFixed(4),
      scope: 'Scope 1 (Direct Fuel Combustion)',
      factor: '2.6841 kgCO₂e/L (GHG Protocol / IPCC EFDB)',
      metric: 'ENV-EMISSIONS-001',
      consumed: `${q.toLocaleString()} Litres`,
    };
  }
  if (dt.includes('petrol')) {
    return {
      energy_gj: (q * 32.0 / 1000).toFixed(2),
      ghg_tco2e: (q * 2.3153 / 1000).toFixed(4),
      scope: 'Scope 1 (Direct Combustion)',
      factor: '2.3153 kgCO₂e/L (GHG Protocol)',
      metric: 'ENV-EMISSIONS-001',
      consumed: `${q.toLocaleString()} Litres`,
    };
  }
  if (dt.includes('coal')) {
    return {
      energy_gj: (q * 26.4 / 1000).toFixed(2),
      ghg_tco2e: (q * 2.3 / 1000).toFixed(4),
      scope: 'Scope 1 (Direct Combustion)',
      factor: '2.3000 kgCO₂e/kg (IPCC Default)',
      metric: 'ENV-EMISSIONS-001',
      consumed: `${q.toLocaleString()} kg`,
    };
  }
  if (dt.includes('gas') || u.includes('scm')) {
    return {
      energy_gj: (q * 35.9 / 1000).toFixed(2),
      ghg_tco2e: (q * 2.0 / 1000).toFixed(4),
      scope: 'Scope 1 (Direct Combustion)',
      factor: '2.0000 kgCO₂e/SCM (CEA / MoPNG)',
      metric: 'ENV-ENERGY-002',
      consumed: `${q.toLocaleString()} SCM`,
    };
  }
  if (dt.includes('water') || u.includes('kl') || u.includes('m³')) {
    return {
      energy_gj: null,
      ghg_tco2e: (q * 0.000344).toFixed(4),
      scope: 'Scope 3 (Municipal Water Supply)',
      factor: '0.344 kgCO₂e/m³ (Water UK / DEFRA standard)',
      metric: 'ENV-WATER-001',
      consumed: `${q.toLocaleString()} m³`,
    };
  }
  return null;
}

function E1Result({ result }) {
  if (!result) return null;
  const fields = result.extracted_fields || result.fields || [];
  const confidenceValues = fields.map(field => field.confidence).filter(value => Number.isFinite(value));
  const confidence = confidenceValues.length
    ? confidenceValues.reduce((total, value) => total + value, 0) / confidenceValues.length
    : null;
  const notes = result.notes || result.extraction_notes;
  const esg = calcEsgImpact(result.doc_type, fields);
  const evidenceId = result.evidence_id || result.evidence?.id;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        <ResultCard title="Fields Extracted" value={fields.length} color={C.blue} />
        <ResultCard title="Mean Confidence" value={confidence == null ? '—' : `${Math.round(confidence * 100)}%`} color={confidence == null ? C.slate : confidence >= 0.8 ? C.green : C.amber} />
        <ResultCard title="Document Type" value={(result.doc_type || '—').replace(/_/g, ' ')} color={C.slate} />
      </div>

      {/* Calculated Energy Consumption & GHG Emissions */}
      {esg && (
        <div style={{ background: '#F0FDF4', border: `1.5px solid ${C.greenBdr}`, borderRadius: 12, padding: '16px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: C.green, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>🌱</span> BRSR Energy & GHG Consumption Calculation
            </div>
            <Tag label={esg.scope} color={C.green} bg="#DCFCE7" border={C.greenBdr} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: esg.energy_gj ? '1fr 1fr' : '1fr', gap: 12 }}>
            {esg.energy_gj && (
              <div style={{ background: '#FFFFFF', padding: '12px 14px', borderRadius: 8, border: `1px solid ${C.greenBdr}` }}>
                <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: 'uppercase' }}>Energy Consumption</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#047857', fontFamily: 'ui-monospace, monospace' }}>
                  {esg.energy_gj} <span style={{ fontSize: 13 }}>GJ</span>
                </div>
                <div style={{ fontSize: 11, color: C.slate, marginTop: 2 }}>From {esg.consumed}</div>
              </div>
            )}
            <div style={{ background: '#FFFFFF', padding: '12px 14px', borderRadius: 8, border: `1px solid ${C.greenBdr}` }}>
              <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: 'uppercase' }}>GHG Emissions</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#047857', fontFamily: 'ui-monospace, monospace' }}>
                {esg.ghg_tco2e} <span style={{ fontSize: 13 }}>tCO₂e</span>
              </div>
              <div style={{ fontSize: 11, color: C.slate, marginTop: 2 }}>Factor: {esg.factor}</div>
            </div>
          </div>
        </div>
      )}

      {/* Document preview if evidence file attached */}
      {evidenceId && (() => {
        const mime = result.mime_type || result.evidence?.mime_type || '';
        const name = result.original_name || result.evidence?.original_name || result.filename || '';
        const isMimeImage = mime.startsWith('image/');
        const isNameImage = /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(name);
        const isImage = isMimeImage || isNameImage;
        const viewUrl = evidenceApi.getViewUrl(evidenceId);
        const displayUrl = result._localObjectUrl || viewUrl;
        return (
          <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: C.ink }}>Original Document Image / Preview</span>
              <a href={viewUrl} target="_blank" rel="noreferrer"
                style={{ fontSize: 11, color: C.blue, textDecoration: 'none', fontWeight: 600 }}>
                Open Original in New Tab ↗
              </a>
            </div>
            <div style={{ borderRadius: 6, overflow: 'hidden', background: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 180 }}>
              {isImage ? (
                <img
                  src={displayUrl}
                  alt="Document Evidence"
                  style={{ maxWidth: '100%', maxHeight: 260, objectFit: 'contain' }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              ) : (
                <iframe
                  src={displayUrl}
                  title="Document Preview"
                  style={{ width: '100%', height: 280, border: 'none' }}
                  onError={() => {}}
                />
              )}
            </div>
          </div>
        );
      })()}

      {result.is_relevant === false && <ErrorBox msg={result.rejection_reason || result.message || 'The backend classified this document as unrelated to the requested evidence type.'} />}
      {fields.length > 0 ? (
        <>
          <SectionTitle>Extracted BRSR Fields</SectionTitle>
          <FieldTable rows={fields.map(f => ({
            field: f.metric || f.field_name || f.field || f.name,
            value: f.value,
            unit: f.unit,
            indicator: f.metric || f.brsr_indicator || f.indicator,
            confidence: f.confidence,
          }))} />

          {/* Detailed per-field breakdown — no raw JSON */}
          <SectionTitle>Detailed Field Breakdown</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {fields.map((field, index) => {
              const meta = field.metadata || {};
              const metaEntries = Object.entries(meta).filter(([, v]) => v != null && v !== '' && v !== false);
              const fieldLabel = field.metric || field.field_name || field.field || field.name || `Field ${index + 1}`;
              const pageInfo = field.page != null ? `Page ${field.page}` : null;
              const runInfo = (field.run_id || result.run_id) ? `Run ID: ${(field.run_id || result.run_id).slice(0, 12)}…` : null;
              const confPct = field.confidence != null ? Math.round(field.confidence * 100) : null;
              const confColor = confPct == null ? C.muted : confPct >= 80 ? C.green : confPct >= 60 ? C.amber : C.red;
              return (
                <div key={`${fieldLabel}-${index}`} style={{
                  border: `1px solid ${C.border}`, borderRadius: 10,
                  overflow: 'hidden', background: C.white,
                  boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
                }}>
                  {/* Field header */}
                  <div style={{
                    padding: '10px 14px',
                    borderBottom: `1px solid ${C.border}`,
                    background: C.surface,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: C.ink }}>{fieldLabel}</span>
                      {field.unit && (
                        <span style={{ fontSize: 11, padding: '1px 7px', borderRadius: 999, background: C.blueLt, color: C.blue, fontWeight: 700, border: `1px solid ${C.blueBdr}` }}>
                          {field.unit}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      {confPct != null && (
                        <span style={{ fontSize: 11, fontWeight: 800, color: confColor }}
                          title={`AI Confidence: ${confPct}%`}>
                          {confPct}% conf.
                        </span>
                      )}
                      {pageInfo && <span style={{ fontSize: 10, color: C.muted }}>{pageInfo}</span>}
                    </div>
                  </div>

                  {/* Extracted value highlight */}
                  <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                      <span style={{ fontSize: 11, color: C.muted, fontWeight: 600, minWidth: 100 }}>Extracted Value</span>
                      <span style={{
                        fontFamily: 'ui-monospace, monospace', fontWeight: 800,
                        fontSize: 18, color: C.blue,
                      }}>
                        {field.value != null ? field.value : '—'}
                        {field.unit && <span style={{ fontSize: 13, fontWeight: 600, color: C.slate, marginLeft: 4 }}>{field.unit}</span>}
                      </span>
                    </div>

                    {/* Metadata key-value pairs as clean chips/rows */}
                    {metaEntries.length > 0 && (
                      <div style={{
                        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                        gap: 6, paddingTop: 8, borderTop: `1px dashed ${C.border}`,
                      }}>
                        {metaEntries.map(([key, val]) => {
                          const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                          const displayVal = typeof val === 'boolean' ? (val ? '✓ Yes' : '✗ No') : String(val);
                          return (
                            <div key={key} style={{
                              padding: '6px 10px', borderRadius: 7,
                              background: C.surface, border: `1px solid ${C.border}`,
                              display: 'flex', flexDirection: 'column', gap: 1,
                            }}>
                              <span style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
                              <span style={{ fontSize: 12.5, fontWeight: 600, color: C.ink, wordBreak: 'break-word' }}>{displayVal}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Footer provenance */}
                    {runInfo && (
                      <div style={{ fontSize: 10, color: C.muted, fontFamily: 'ui-monospace, monospace', paddingTop: 4 }}>
                        {runInfo}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <ErrorBox msg={result.rejection_reason || 'The backend completed extraction but returned no structured fields for this document.'} />
      )}
      {notes && (
        <>
          <SectionTitle>Extraction Notes</SectionTitle>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: '12px 16px', fontSize: 13, color: C.slate, lineHeight: 1.7 }}>
            {notes}
          </div>
        </>
      )}
    </div>
  );
}

function E2Result({ result }) {
  if (!result) return null;
  const score = result.score;
  const severity = result.severity;
  const sevColor = { error: C.red, warning: C.amber, info: C.green }[severity] || C.slate;
  const reasons = result.reasons || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        <ResultCard title="Anomaly Score" value={score == null ? '—' : `${(score * 100).toFixed(0)}%`} color={sevColor} sub={result.is_anomaly == null ? undefined : result.is_anomaly ? 'Anomaly detected' : 'No anomaly detected'} />
        <ResultCard title="Severity" value={severity || '—'} color={sevColor} />
        <ResultCard title="Reasons" value={reasons.length} color={reasons.length > 0 ? C.red : C.slate} />
      </div>

      {reasons.length > 0 && (
        <>
          <SectionTitle>Triggered Rules</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {reasons.map((f, i) => (
              <div key={i} style={{ padding: '10px 14px', borderRadius: 8, background: C.redLt, border: `1px solid #FECACA`, fontSize: 13, color: C.red, display: 'flex', gap: 8 }}>
                <span>{f.feature ? `${f.feature}: ` : ''}{f.message}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {result.suggested_correction != null && (
        <>
          <SectionTitle>Suggested Correction</SectionTitle>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: '14px 18px', fontSize: 13, color: C.ink, lineHeight: 1.75 }}>
            {result.suggested_correction}
          </div>
        </>
      )}

    </div>
  );
}

function FormattedAnswer({ text }) {
  if (!text) return null;
  const lines = text.split('\n');
  const renderedElements = [];
  let currentBullets = [];

  const flushBullets = () => {
    if (currentBullets.length > 0) {
      renderedElements.push(
        <ul key={`ul-${renderedElements.length}`} style={{ margin: '8px 0 14px 20px', padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {currentBullets.map((b, bi) => (
            <li key={bi} style={{ fontSize: 13.5, color: C.ink, lineHeight: 1.75 }}>
              {formatInline(b)}
            </li>
          ))}
        </ul>
      );
      currentBullets = [];
    }
  };

  const formatInline = (str) => {
    const parts = str.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} style={{ color: C.ink, fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  lines.forEach((rawLine, idx) => {
    const line = rawLine.trim();
    if (!line) {
      flushBullets();
      return;
    }

    // Caution blockquote
    if (line.startsWith('>') || line.toLowerCase().includes('caution:')) {
      flushBullets();
      const cleanLine = line.replace(/^>\s*/, '');
      renderedElements.push(
        <div key={`caution-${idx}`} style={{
          marginTop: 14, marginBottom: 10,
          background: '#FFFBEB', border: '1.5px solid #FCD34D', borderRadius: 8,
          padding: '12px 16px', fontSize: 13, color: '#92400E', lineHeight: 1.65,
          display: 'flex', gap: 10, alignItems: 'flex-start'
        }}>
          <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>⚠️</span>
          <div>
            <strong style={{ color: '#78350F' }}>Regulatory Caution Notice:</strong>{' '}
            {cleanLine.replace(/^[>*\s]*⚠️?\s*\*?caution:?\*?/i, '').replace(/\*+/g, '')}
          </div>
        </div>
      );
      return;
    }

    // Heading
    if (line.startsWith('###') || line.startsWith('##')) {
      flushBullets();
      const hText = line.replace(/^#+\s*/, '');
      renderedElements.push(
        <div key={`h-${idx}`} style={{ fontSize: 14.5, fontWeight: 800, color: C.ink, marginTop: 12, marginBottom: 4 }}>
          {formatInline(hText)}
        </div>
      );
      return;
    }

    // Bullet points (-, *, •, or numbered)
    if (line.startsWith('•') || line.startsWith('* ') || line.startsWith('- ') || /^\d+\.\s/.test(line)) {
      const bContent = line.replace(/^[•*\-\d.]\s*/, '');
      currentBullets.push(bContent);
      return;
    }

    // Normal paragraph
    flushBullets();
    renderedElements.push(
      <p key={`p-${idx}`} style={{ margin: '6px 0 10px', fontSize: 13.5, color: C.ink, lineHeight: 1.75 }}>
        {formatInline(line)}
      </p>
    );
  });

  flushBullets();
  return <div>{renderedElements}</div>;
}

function E3Result({ result }) {
  if (!result) return null;
  const answer = result.answer;
  const sources = result.citations || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <SectionTitle>Guidance Answer</SectionTitle>
        <Tag
          label={result.grounded ? '✓ Grounded in SEBI Note' : '⚡ AI Regulatory Synthesis'}
          color={result.grounded ? C.green : C.amber}
          bg={result.grounded ? C.greenLt : C.amberLt}
          border={result.grounded ? C.greenBdr : '#FCD34D'}
        />
      </div>

      <div style={{
        background: result.grounded ? C.purpleLt : '#FAFAFA',
        border: `1px solid ${result.grounded ? '#DDD6FE' : C.border}`,
        borderRadius: 10,
        padding: '18px 22px',
      }}>
        <FormattedAnswer text={answer} />
      </div>

      {sources.length > 0 && (
        <>
          <SectionTitle>Statutory Source Passages</SectionTitle>
          {sources.map((s, i) => (
            <div key={i} style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 14px', fontSize: 12, color: C.slate, lineHeight: 1.65, borderLeft: `3px solid ${C.purple}` }}>
              <><strong>{s.doc} · {s.version} · {s.section}</strong><br />{s.text}</>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function E4Result({ result }) {
  if (!result) return null;
  const items = result.items || [];
  const score = result.completeness_score;
  const passCount = items.filter(i => i.status === 'present').length;
  const failCount = items.filter(i => i.status === 'absent').length;
  const partialCount = items.filter(i => i.status === 'partial').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        <ResultCard title="Completeness" value={score != null ? `${Math.round(score * 100)}%` : '—'} color={score == null ? C.slate : score >= 0.8 ? C.green : score >= 0.5 ? C.amber : C.red} />
        <ResultCard title="Present" value={passCount} color={C.green} />
        <ResultCard title="Partial" value={partialCount} color={C.amber} />
        <ResultCard title="Absent" value={failCount} color={C.red} />
      </div>

      {items.length > 0 && (
        <>
          <SectionTitle>Compliance Checklist</SectionTitle>
          <ChecklistTable items={items} />
        </>
      )}

    </div>
  );
}

function E5Result({ result }) {
  if (!result) return null;
  const narrative = result.draft || '';
  const wordCount = narrative.split(/\s+/).filter(Boolean).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        <ResultCard title="Word Count" value={wordCount} color="#0891B2" />
        <ResultCard title="Number Lock" value={result.number_lock_passed ? 'Passed' : 'Review'} color={result.number_lock_passed ? C.green : C.amber} />
        <ResultCard title="Unapproved Numbers" value={result.numbers_unapproved?.length ?? 0} color={result.numbers_unapproved?.length ? C.red : C.slate} />
      </div>

      <SectionTitle>Draft Narrative (locked numbers highlighted in blue)</SectionTitle>
      <NarrativeBox text={narrative} />

      {result.numbers_found?.length > 0 && (
        <>
          <SectionTitle>Locked Number Registry</SectionTitle>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {result.numbers_found.map((n, i) => (
              <div key={i} style={{ padding: '4px 10px', borderRadius: 6, background: C.blueLt, border: `1px solid ${C.blueBdr}`, fontSize: 12, fontWeight: 700, color: C.blue, fontFamily: 'ui-monospace, monospace' }}>
                {n}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function E6Result({ result }) {
  if (!result) return null;
  const formulaEstimate = result.estimated_emissions_tco2e;
  const llmAdjusted     = result.llm_adjusted_tco2e;
  const llmValidated    = result.llm_validated;
  const factor          = result.proxy_factor;
  const confidence      = result.confidence;

  const bestEstimate = (llmAdjusted != null) ? llmAdjusted : formulaEstimate;
  const wasAdjusted  = llmAdjusted != null && Math.abs(llmAdjusted - formulaEstimate) > 0.0001;

  const methodColors = {
    'spend-based':    { bg: '#EFF6FF', border: '#BFDBFE', text: '#1D4ED8' },
    'activity-based': { bg: '#F0FDF4', border: '#A7F3D0', text: '#065F46' },
    'hybrid':         { bg: '#FFF7ED', border: '#FED7AA', text: '#9A3412' },
  };
  const mc = methodColors[result.llm_suggested_method] || { bg: C.surface, border: C.border, text: C.slate };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* Top metric cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        <ResultCard
          title={wasAdjusted ? 'Formula Estimate' : 'Estimated Scope 3'}
          value={`${Number(formulaEstimate).toFixed(4)} tCO\u2082e`}
          color={wasAdjusted ? C.slate : '#0D9488'}
          sub={wasAdjusted ? 'Before LLM adjustment' : result.proxy_factor_unit}
        />
        {wasAdjusted ? (
          <ResultCard
            title="LLM-Adjusted Estimate \u2713"
            value={`${Number(llmAdjusted).toFixed(4)} tCO\u2082e`}
            color="#0D9488"
            sub="Validated & adjusted by AI"
          />
        ) : (
          <ResultCard
            title="Proxy Factor"
            value={factor != null ? Number(factor).toFixed(4) : '\u2014'}
            sub={result.proxy_factor_unit || 'Unit not provided'}
            color={C.slate}
          />
        )}
        <ResultCard
          title="Confidence"
          value={confidence == null ? '\u2014' : `${Math.round(confidence * 100)}%`}
          color={confidence == null ? C.slate : confidence >= 0.8 ? C.green : C.amber}
          sub={llmValidated ? 'LLM-informed' : 'Formula only'}
        />
      </div>

      {/* Category + badges */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {result.work_category && (
          <span style={{ fontSize: 12, color: C.slate }}>
            Category: <strong style={{ color: C.ink }}>{result.work_category}</strong>
          </span>
        )}
        {result.llm_suggested_method && (
          <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: mc.bg, border: `1px solid ${mc.border}`, color: mc.text }}>
            {result.llm_suggested_method.toUpperCase()} METHOD
          </span>
        )}
        {result.llm_brsr_reference && (
          <span style={{ fontSize: 11, color: C.purple, background: C.purpleLt, border: '1px solid #DDD6FE', padding: '3px 10px', borderRadius: 999, fontWeight: 600 }}>
            \uD83D\uDCCB {result.llm_brsr_reference}
          </span>
        )}
      </div>

      {/* LLM Validation Panel */}
      {llmValidated && result.llm_reasoning && (
        <div style={{ background: '#FAFAFA', border: `1.5px solid ${wasAdjusted ? '#FCD34D' : C.greenBdr}`, borderRadius: 12, overflow: 'hidden' }}>
          <div style={{
            padding: '10px 16px',
            background: wasAdjusted ? '#FFFBEB' : C.greenLt,
            borderBottom: `1px solid ${wasAdjusted ? '#FCD34D' : C.greenBdr}`,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ fontSize: 14 }}>{wasAdjusted ? '\u26A0\uFE0F' : '\u2705'}</span>
            <span style={{ fontWeight: 700, fontSize: 12, color: wasAdjusted ? C.amber : C.green }}>
              {wasAdjusted
                ? `LLM Adjusted \u2014 Formula was off by ${Math.abs(llmAdjusted - formulaEstimate).toFixed(4)} tCO\u2082e`
                : 'LLM Confirmed \u2014 Formula estimate is appropriate for this work category'}
            </span>
          </div>
          <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>

            <div>
              <SectionTitle>AI Reasoning &amp; Method Justification</SectionTitle>
              <div style={{ fontSize: 13.5, color: C.ink, lineHeight: 1.85, background: C.white, padding: '12px 16px', borderRadius: 8, border: `1px solid ${C.border}` }}>
                {result.llm_reasoning}
              </div>
            </div>

            {result.llm_confidence_note && (
              <div style={{ background: C.amberLt, border: '1px solid #FCD34D', borderRadius: 8, padding: '10px 14px', fontSize: 12.5, color: '#78350F' }}>
                <span style={{ fontWeight: 700 }}>📊 Reliability Assessment: </span>
                {result.llm_confidence_note}
              </div>
            )}

            {result.llm_data_gaps && result.llm_data_gaps.length > 0 && (
              <div>
                <SectionTitle>Data Gaps \u2014 Collect These to Improve Accuracy</SectionTitle>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {result.llm_data_gaps.map((gap, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 12px', borderRadius: 7, background: C.white, border: `1px solid ${C.border}`, fontSize: 13, color: C.ink }}>
                      <span style={{ color: C.amber, flexShrink: 0, fontWeight: 700, marginTop: 1 }}>#{i + 1}</span>
                      {gap}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* LLM unavailable notice */}
      {!llmValidated && (
        <div style={{ background: C.amberLt, border: '1px solid #FCD34D', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#78350F', display: 'flex', gap: 8 }}>
          <span>\u26A0\uFE0F</span>
          <span>
            <strong>Formula-only estimate.</strong> LLM validation was unavailable (API key not configured or timed out).
            Result is based on India GHG Program proxy factors only. Treat as indicative.
          </span>
        </div>
      )}

      {/* Audit trail */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 18px' }}>
        <SectionTitle>Calculation Audit Trail</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, fontSize: 12 }}>
          {[
            ['Proxy Factor', `\u00D7\u00A0${factor}`, result.proxy_factor_unit],
            ['Formula Result', `= ${formulaEstimate} tCO\u2082e`, ''],
            ...(wasAdjusted ? [['LLM Adjusted To', `\u2192\u00A0${llmAdjusted} tCO\u2082e`, '(better factor applied)']] : []),
          ].map(([label, val, sub]) => (
            <div key={label} style={{ padding: '8px 10px', borderRadius: 7, background: C.white, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
              <div style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 700, fontSize: 13, color: C.ink, marginTop: 2 }}>{val}</div>
              {sub && <div style={{ fontSize: 10, color: C.slate, marginTop: 1 }}>{sub}</div>}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 10, fontSize: 11, color: C.muted }}>
          Proxy factors from India GHG Program, IPCC AR6 defaults, and SEBI BRSR Core.
          LLM validation cross-checks factor selection and may apply GHG Protocol Scope 3 Category 1/4 factors where applicable.
        </div>
      </div>

    </div>
  );
}

function E7Result({ result }) {
  if (!result) return null;
  const drivers = result.drivers || [];
  const explanation = result.summary;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {drivers.length > 0 && (
        <>
          <SectionTitle>Driver Attribution (share of total change)</SectionTitle>
          <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 10, padding: '16px 20px' }}>
            <DriverBar drivers={drivers} />
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: C.surface }}>
                  {['Entity / BU', 'Absolute Delta', 'Share of Change'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: C.slate, borderBottom: `1px solid ${C.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {drivers.map((d, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: '8px 12px', fontWeight: 600, color: C.ink }}>{d.entity}</td>
                    <td style={{ padding: '8px 12px', fontFamily: 'ui-monospace, monospace', color: d.delta > 0 ? C.red : C.green }}>
                      {d.delta > 0 ? '+' : ''}{Number(d.delta).toFixed(1)}
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <ConfBar value={d.share} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {explanation && (
        <>
          <SectionTitle>Plain-Language Explanation</SectionTitle>
          <div style={{ background: '#FDF2F8', border: '1px solid #FBCFE8', borderRadius: 10, padding: '16px 20px', fontSize: 14, color: C.ink, lineHeight: 1.85 }}>
            {explanation}
          </div>
        </>
      )}
      {result.lineage_url && <a href={result.lineage_url} target="_blank" rel="noreferrer">Open metric lineage</a>}
    </div>
  );
}

// ─── ENGINE FORM + RESULT DISPATCHER ─────────────────────────────────────────

const INPUT_FORMS = { E1: E1Form, E2: E2Form, E3: E3Form, E4: E4Form, E5: E5Form, E6: E6Form, E7: E7Form };
const OUTPUT_PANELS = { E1: E1Result, E2: E2Result, E3: E3Result, E4: E4Result, E5: E5Result, E6: E6Result, E7: E7Result };

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function AarohanAI() {
  const { roleMeta, role } = useAuth();
  const [engines, setEngines] = useState([]);
  const [selectedEngine, setSelectedEngineState] = useState(() => {
    try {
      return localStorage.getItem('aarohan_selected_engine') || null;
    } catch {
      return null;
    }
  });

  const setSelectedEngine = useCallback((eng) => {
    setSelectedEngineState(eng);
    try {
      localStorage.setItem('aarohan_selected_engine', eng);
    } catch {}
  }, []);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(() => selectedEngine ? backgroundJobs.isRunning(selectedEngine) : false);
  const [result, setResult] = useState(() => selectedEngine ? backgroundJobs.getResult(selectedEngine) : null);
  const [error, setError] = useState(() => selectedEngine ? backgroundJobs.getError(selectedEngine) : '');

  // Keep state synced with backgroundJobs singleton (updates even when navigating back from other tabs)
  useEffect(() => {
    const syncState = () => {
      if (!selectedEngine) return;
      setSubmitting(backgroundJobs.isRunning(selectedEngine));
      setResult(backgroundJobs.getResult(selectedEngine));
      setError(backgroundJobs.getError(selectedEngine));
    };

    syncState();
    return backgroundJobs.subscribe(syncState);
  }, [selectedEngine]);

  useEffect(() => {
    let mounted = true;
    aarohanApi.listEngines()
      .then((res) => {
        const available = Array.isArray(res.data) ? res.data : [];
        if (!mounted) return;
        setEngines(available);
        if (available.length > 0 && !selectedEngine) {
          const defaultEng = available[0].engine;
          setSelectedEngine(defaultEng);
        }
      })
      .catch((err) => {
        setError(getFriendlyErrorMessage(err, 'Could not load engine catalog from server.'));
      })
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [selectedEngine, setSelectedEngine]);

  const handleRun = useCallback((payload) => {
    if (!selectedEngine) return;
    setError('');

    const runnerPromise = (async () => {
      if (selectedEngine === 'E1') {
        if (payload.file) {
          const formData = new FormData();
          formData.append('file', payload.file);
          formData.append('run_ocr', 'true');
          formData.append('doc_type_hint', payload.doc_type_hint || '');
          const response = await evidenceApi.upload(formData);
          return {
            ...response.data,
            fields: response.data.extracted_fields || [],
            doc_type: response.data.evidence?.doc_type || payload.doc_type_hint,
            run_id: response.data.extracted_fields?.[0]?.run_id,
            evidence_id: response.data.evidence?.id,
            original_name: response.data.evidence?.original_name || payload.file.name,
            mime_type: response.data.evidence?.mime_type || payload.file.type,
            _localObjectUrl: URL.createObjectURL(payload.file),
          };
        } else if (payload.evidence_id) {
          const response = await aarohanApi.runEngine('E1', payload);
          return {
            ...response.data,
            evidence_id: payload.evidence_id,
          };
        }
      } else {
        const response = await aarohanApi.runEngine(selectedEngine, payload);
        return response.data;
      }
    })();

    // Launches job in background — continues running if user navigates to another page
    backgroundJobs.start(selectedEngine, runnerPromise);
  }, [selectedEngine]);

  const meta = selectedEngine ? ENGINE_META[selectedEngine] : null;
  const InputForm = selectedEngine ? INPUT_FORMS[selectedEngine] : null;
  const OutputPanel = selectedEngine ? OUTPUT_PANELS[selectedEngine] : null;
  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 24, minHeight: '100%', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', color: C.blue, textTransform: 'uppercase', marginBottom: 6 }}>
              Ask AAROHAN AI
            </div>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: C.ink, lineHeight: 1.2 }}>
              AI-Powered BRSR Intelligence
            </h1>
            <div style={{ marginTop: 6, fontSize: 13, color: C.slate, lineHeight: 1.6 }}>
              Select an engine, fill in the form — no JSON required. Every result is structured, cited, and audit-logged.
            </div>
          </div>
          <div style={{ padding: '8px 14px', borderRadius: 999, background: meta?.colorLt || C.blueLt, border: `1px solid ${meta?.color || C.blue}33`, color: meta?.color || C.blue, fontWeight: 700, fontSize: 12 }}>
            {roleMeta?.icon} {roleMeta?.label || role}
          </div>
        </div>

        {/* ── Engine Selector ── */}
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: C.muted, fontSize: 13 }}>
            <SpinIcon /> Loading available engines for your role…
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
            {engines.map((item) => {
              const m = ENGINE_META[item.engine];
              const isActive = selectedEngine === item.engine;
              return (
                <button key={item.engine} type="button"
                  onClick={() => { setSelectedEngine(item.engine); setResult(null); setError(''); }}
                  style={{
                    textAlign: 'left', border: `1.5px solid ${isActive ? m?.color || C.blue : C.border}`,
                    background: isActive ? (m?.colorLt || C.blueLt) : C.white,
                    borderRadius: 12, padding: '14px 16px', cursor: 'pointer',
                    boxShadow: isActive ? `0 4px 20px ${m?.color || C.blue}22` : '0 1px 3px rgba(15,23,42,0.04)',
                    transition: 'all 0.15s',
                  }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <span style={{ fontSize: 20 }}>{m?.icon}</span>
                    <span style={{ fontSize: 10, fontWeight: 800, color: m?.color || C.blue, letterSpacing: '0.08em' }}>{item.engine}</span>
                  </div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: C.ink, marginBottom: 4, lineHeight: 1.3 }}>{item.label}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>{m?.tag || item.description}</div>
                </button>
              );
            })}
          </div>
        )}

        {/* ── Active Engine Workspace ── */}
        {selectedEngine && meta && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 20, alignItems: 'start' }}>

            {/* Input Panel */}
            <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 8px rgba(15,23,42,0.05)' }}>
              <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 18 }}>{meta.icon}</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>{meta.label}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>{meta.tag}</div>
                  </div>
                </div>
                <HelpPanel meta={meta} />
              </div>
              <div style={{ padding: 20 }}>
                {InputForm && <InputForm onRun={handleRun} loading={submitting} />}
              </div>
            </div>

            {/* Output Panel */}
            <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 8px rgba(15,23,42,0.05)', minHeight: 400 }}>
              <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>Analysis Result</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {result && (
                    <>
                      <Tag label={selectedEngine === 'E1' ? 'Evidence Stored' : 'Audit Logged'} color={C.green} bg={C.greenLt} border={C.greenBdr} />
                      <Tag label="Proposed" color={C.blue} bg={C.blueLt} border={C.blueBdr} />
                    </>
                  )}
                  {(result || error) && (
                    <button
                      type="button"
                      onClick={() => backgroundJobs.clear(selectedEngine)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        padding: '4px 10px', borderRadius: 6,
                        border: `1px solid ${C.border}`, background: C.surface,
                        color: C.slate, fontSize: 11.5, fontWeight: 600,
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}
                      title="Clear this result"
                    >
                      ✕ Clear Result
                    </button>
                  )}
                </div>
              </div>
              <div style={{ padding: 20 }}>
                {submitting && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300, gap: 12 }}>
                    <div style={{ fontSize: 36 }}>{meta.icon}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: meta.color, fontWeight: 600 }}>
                      <SpinIcon /> Running {meta.label}…
                    </div>
                    <div style={{ fontSize: 12, color: C.muted }}>AI is analysing your input — this usually takes 5–20 seconds</div>
                  </div>
                )}
                {!submitting && error && <ErrorBox msg={error} />}
                {!submitting && !error && result && OutputPanel && <OutputPanel result={result} />}
                {!submitting && !error && !result && (
                  <EmptyState
                    icon={meta.icon}
                    msg={`Fill in the ${meta.label} form on the left and click Run to see structured BRSR analysis here.`}
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {!loading && engines.length === 0 && (
          <div style={{ background: C.amberLt, border: `1px solid #FCD34D`, borderRadius: 12, padding: '20px 24px', color: C.amber, fontSize: 13 }}>
            <strong>No AI engines available for your role.</strong> Ask a Group Admin or System Admin to grant AI engine permissions.
          </div>
        )}

      </div>
    </>
  );
}
