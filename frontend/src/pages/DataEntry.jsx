import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import {
  FileText, Save, Send, Download, Upload, CheckCircle2,
  Building2, Calendar, RefreshCw, Layers, AlertCircle, X, Sparkles,
  Eye, Info, ShieldCheck, Clock, ExternalLink, Cpu, BookOpen, Edit3, ArrowRight,
  HelpCircle, RotateCcw, Trash2
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useOrgNodes, useOrgPeriods, useScopedForm, useSavePack, useSubmitPack } from '../hooks/useApi';
import { formsApi, collectionApi, evidenceApi, aiApi, API_BASE } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';

// ── BRSR Principles Knowledge Dictionary ─────────────────────────────────────
const BRSR_PRINCIPLES_MAP = {
  P1: {
    name: 'Principle 1: Ethics, Transparency & Accountability',
    pillar: 'Governance',
    desc: 'Businesses should conduct and govern themselves with integrity, and in a manner that is Ethical, Transparent and Accountable.'
  },
  P2: {
    name: 'Principle 2: Safe & Sustainable Goods & Services',
    pillar: 'Governance',
    desc: 'Businesses should provide goods and services in a manner that is sustainable and safe across all product and service lifecycles.'
  },
  P3: {
    name: 'Principle 3: Employee Well-being & Workplace Safety',
    pillar: 'Social',
    desc: 'Businesses should respect and promote the well-being of all employees and contractual workers, including occupational health, safety, and training.'
  },
  P4: {
    name: 'Principle 4: Stakeholder Inclusiveness & Grievances',
    pillar: 'Social',
    desc: 'Businesses should respect the interests of and be responsive to all its stakeholders, especially disadvantaged and vulnerable communities.'
  },
  P5: {
    name: 'Principle 5: Human Rights & Fair Labor Practices',
    pillar: 'Social',
    desc: 'Businesses should respect and promote human rights across all direct and supply-chain operational facilities.'
  },
  P6: {
    name: 'Principle 6: Environmental Protection, GHG & Waste',
    pillar: 'Environment',
    desc: 'Businesses should protect and restore the environment: energy conservation, GHG mitigation, water stewardship, and circular waste management.'
  },
  P7: {
    name: 'Principle 7: Responsible Public Policy Advocacy',
    pillar: 'Governance',
    desc: 'Businesses, when engaging in influencing public and regulatory policy, should do so in a manner that is responsible and transparent.'
  },
  P8: {
    name: 'Principle 8: Inclusive Growth & Social Development',
    pillar: 'Social',
    desc: 'Businesses should promote inclusive growth and equitable socio-economic development through CSR, local hiring, and community engagement.'
  },
  P9: {
    name: 'Principle 9: Consumer Value & Responsibility',
    pillar: 'Governance',
    desc: 'Businesses should engage with and provide true value to their consumers and clients in an honest, responsible, and transparent manner.'
  },
};

const KNOWN_CODE_EXPLANATIONS = {
  // ── Operational Metric Codes (Dual-Layer Architecture) ───────────────────────
  'ENV-ENERGY-001': {
    title: 'Principle 6: Essential Indicator 1 — Total Electricity Consumption (Grid & Captive)',
    meaning: 'Disclose total electricity consumed in MWh or GJ, including purchased grid electricity from DISCOMs and self-generated captive power (solar, DG).',
    evidence: 'DISCOM monthly HT/LT electricity invoices, HT substation meter logs, solar generation registers.',
  },
  'ENV-ENERGY-002': {
    title: 'Principle 6: Essential Indicator 1 — Fuel Consumption (Diesel, Petrol, Coal)',
    meaning: 'Capture physical fuel consumption (litres of diesel/petrol in gensets, vehicles, machinery, and tonnes of coal in thermal units) converted to Gigajoules (GJ) using calorific density factors.',
    evidence: 'Fuel supplier delivery vouchers, weighbridge tickets, diesel dispensing pump logs, coal consignment receipts.',
  },
  'ENV-GHG-001': {
    title: 'Principle 6: Essential Indicator 3 — Direct Scope 1 GHG Emissions',
    meaning: 'Gross direct greenhouse gas emissions resulting from stationary and mobile fuel combustion (diesel generators, heavy tunnel boring rigs, excavators, plant transport) in metric tons of CO₂ equivalent (tCO₂e).',
    evidence: 'Fuel weighbridge logs, generator run-hour logs, IPCC emission factor conversions.',
  },
  'ENV-GHG-002': {
    title: 'Principle 6: Essential Indicator 4 — Indirect Scope 2 GHG Emissions',
    meaning: 'Gross location-based indirect greenhouse gas emissions resulting from purchased grid electricity consumed at project sites, pumping stations, and corporate offices.',
    evidence: 'State DISCOM HT electricity bills, CEA Grid Emission Factor Database (v19/v20).',
  },
  'ENV-WATER-001': {
    title: 'Principle 6: Essential Indicator 6 — Water Consumption from All Sources',
    meaning: 'Total volume of water withdrawn and consumed across operational sites, labor colonies, and offices in Kiloliters (KL) or cubic meters (m³).',
    evidence: 'Municipal water bills, flow meter registers, tanker logbooks, groundwater extraction logs.',
  },
  'ENV-WASTE-001': {
    title: 'Principle 6: Essential Indicator 8 — Total Solid Waste Generated & Diverted',
    meaning: 'Total weight of solid waste generated across construction and project facilities in Metric Tons (MT), including metal scrap, concrete debris, and camp solid waste.',
    evidence: 'Hazardous/Non-hazardous waste disposal manifests, weighbridge tickets, authorized recycler receipts.',
  },
  'SOC-SAFE-001': {
    title: 'Principle 3: Essential Indicator 3 — Workplace Safety LTIFR',
    meaning: 'Critical workplace safety metric: Number of lost-time injuries resulting in permanent or temporary disability per million manhours worked.',
    evidence: 'Site safety committee logs, incident investigation reports, HSE monthly bulletin.',
  },
  'SOC-SAFE-002': {
    title: 'Principle 3: Essential Indicator 4 — Work-Related Fatalities',
    meaning: 'Total number of work-related fatal accidents among permanent staff and contract laborers across all operating project sites and fabrication yards.',
    evidence: 'Factories Act incident registers, statutory compensation claims.',
  },
  'SOC-EMP-001': {
    title: 'Principle 3: Essential Indicator 1 — Workforce Breakdown & Headcount',
    meaning: 'Total combined permanent and contractual workforce headcount across company operations, categorized by gender and job tier.',
    evidence: 'HR ERP roster (SAP/SuccessFactors), EPF/ESI statutory monthly returns.',
  },
  'SOC-WELF-001': {
    title: 'Principle 3: Essential Indicator 5 — Employee Training & Skill Development',
    meaning: 'Average training hours completed per employee/worker during the reporting period across health, safety, technical skills, and compliance.',
    evidence: 'LMS training logs, toolbox talk sign-off sheets, external certification records.',
  },
  'GOV-ETH-001': {
    title: 'Principle 1: Essential Indicator 1 — Anti-Corruption & Ethics Code Coverage',
    meaning: 'Measures what percentage of total workforce received formal training and signed acknowledgment of corporate anti-bribery, integrity, and ethical standards.',
    evidence: 'HR LMS training logs, employee acknowledgment signatures.',
  },
  'GOV-COMP-001': {
    title: 'Principle 1: Essential Indicator 2 — Stakeholder Grievances & Complaints Resolved',
    meaning: 'Discloses the total count of formal stakeholder grievances or vigilance complaints received and successfully investigated and resolved.',
    evidence: 'Audit Committee vigilance register, disciplinary hearing records, ombudsman log.',
  },

  // ── SEBI Statutory Metric Codes ──────────────────────────────────────────────
  'P1-E-01': {
    title: 'Code of Conduct & Ethics Coverage',
    meaning: 'Measures what percentage of total workforce received formal training and signed acknowledgment of corporate anti-bribery, integrity, and ethical standards.',
    evidence: 'HR LMS training logs, employee acknowledgment signatures.',
  },
  'P1-L-01': {
    title: 'Anti-Corruption & Bribery Cases Investigated',
    meaning: 'Discloses the total count of formal corruption or bribery complaints logged, investigated, or upheld by internal vigilance.',
    evidence: 'Audit Committee vigilance register, disciplinary hearing records.',
  },
  'P1-E-02': {
    title: 'Whistle-blower / Speak-Up Policy Coverage',
    meaning: 'Proportion of permanent and contractual staff having safe access to an independent, confidential grievance and whistle-blower hotline without retaliation.',
    evidence: 'Board Whistle-blower Policy document, ombudsman log.',
  },
  'P3-E-01': {
    title: 'Permanent Employees (Male)',
    meaning: 'Total headcount of male permanent employees on company payroll at the end of the reporting period.',
    evidence: 'HR ERP roster (SAP/SuccessFactors), EPF/ESI statutory monthly returns.',
  },
  'P3-E-02': {
    title: 'Permanent Employees (Female)',
    meaning: 'Total headcount of female permanent employees on company payroll at the end of the reporting period.',
    evidence: 'HR ERP roster, gender diversity census.',
  },
  'P3-E-03': {
    title: 'Lost-Time Injury Frequency Rate (LTIFR)',
    meaning: 'Critical workplace safety metric: Number of lost-time injuries resulting in permanent or temporary disability per million manhours worked.',
    evidence: 'Site safety committee logs, incident investigation reports, HSE monthly bulletin.',
  },
  'P3-E-04': {
    title: 'Work-Related Fatalities',
    meaning: 'Total number of work-related fatal accidents among permanent staff and contract laborers across all operating project sites and fabrication yards.',
    evidence: 'Factories Act incident registers, statutory compensation claims.',
  },
  'P3-L-01': {
    title: 'Health Insurance Coverage',
    meaning: 'Percentage of the workforce covered under group health insurance and personal accident compensation schemes.',
    evidence: 'Corporate group mediclaim policy schedule, active premium endorsement receipts.',
  },
  'P6-E-01': {
    title: 'Total Energy Consumed (Gross)',
    meaning: 'Total energy consumed across all operations (electricity drawn from grid + captive power + diesel fuel consumed in gensets & heavy equipment) converted to Gigajoules (GJ).',
    evidence: 'DISCOM electricity invoices, HT substation logs, diesel fuel supply receipts. (1 kWh = 0.0036 GJ; 1 L Diesel ≈ 0.038 GJ).',
  },
  'P6-E-02': {
    title: 'Energy Intensity per Turnover',
    meaning: 'Ratio of total energy consumed (in Gigajoules) to total gross revenue/turnover in Crore Rupees (GJ / ₹ Crore). Measures corporate energy efficiency.',
    evidence: 'Audited financial statements and consolidated utility energy logs.',
  },
  'P6-E-03': {
    title: 'Direct Scope 1 GHG Emissions',
    meaning: 'Gross direct greenhouse gas emissions resulting from stationary and mobile fuel combustion (diesel generators, heavy tunnel boring rigs, company transport) in metric tons of CO₂ equivalent (tCO₂e).',
    evidence: 'Fuel weighbridge logs, generator run-hour logs, IPCC emission factor conversions.',
  },
  'P6-E-04': {
    title: 'Indirect Scope 2 GHG Emissions',
    meaning: 'Gross indirect greenhouse gas emissions from generation of purchased grid electricity consumed at project sites, pumping stations, and corporate offices.',
    evidence: 'State DISCOM HT electricity bills, CEA Grid Emission Factor Database (v19/v20).',
  },
  'P6-E-05': {
    title: 'Total Gross GHG Emissions (Scope 1 + 2)',
    meaning: 'Combined total corporate carbon footprint: Direct Scope 1 emissions + Indirect Scope 2 emissions (tCO₂e). Key SEBI BRSR Core indicator.',
    evidence: 'Consolidated GHG inventory spreadsheet, third-party GHG verification statement.',
  },
  'P6-E-06': {
    title: 'Total Water Consumption',
    meaning: 'Total volume of water withdrawn and consumed across all operations, labor colonies, and sites in Kiloliters (KL).',
    evidence: 'Municipal water bills, flow meter registers, tanker logbooks, groundwater extraction logs.',
  },
  'P6-E-07': {
    title: 'Water Intensity per Turnover',
    meaning: 'Ratio of total water consumption (KL) to total gross revenue (₹ Crore). Measures water efficiency in industrial operations.',
    evidence: 'Water balance audit, audited financials.',
  },
  'P6-E-08': {
    title: 'Total Solid Waste Generated',
    meaning: 'Total weight of solid waste generated across construction and project facilities in Metric Tons (MT), including metal scrap, concrete debris, and camp solid waste.',
    evidence: 'Hazardous/Non-hazardous waste disposal manifests, weighbridge tickets, authorized recycler receipts.',
  },
  'P6-L-01': {
    title: 'Renewable Energy Share (%)',
    meaning: 'Percentage of total electricity and energy consumed that is derived from zero-emission renewable sources (rooftop solar, green open access tariffs).',
    evidence: 'Solar net-metering generation logs, green energy open access certificates.',
  },
  'P6-L-02': {
    title: 'Net-Zero Target Commitment Year',
    meaning: 'The designated calendar year by which executive board policy commits the company to reach net-zero greenhouse gas neutrality.',
    evidence: 'Board of Directors sustainability resolution, Climate Action transition roadmap.',
  },
  'P9-E-01': {
    title: 'Consumer Complaints Received',
    meaning: 'Total formal quality, safety, or service complaints received from clients or end consumers during the fiscal window.',
    evidence: 'CRM grievance register, customer service escalation log.',
  },
  'P9-E-02': {
    title: 'Consumer Complaints Resolved (%)',
    meaning: 'Percentage of total consumer grievances successfully investigated and resolved within agreed SLA timelines.',
    evidence: 'Grievance redressal tracking portal, customer sign-off reports.',
  },
};

function decodeMetricCode(code, field) {
  const parts = (code || '').split('-');
  
  // Resolve Principle key (P1 to P9)
  let pKey = 'P6';
  if (/^P[1-9]/i.test(parts[0])) {
    pKey = parts[0].toUpperCase();
  } else if (field?.principle) {
    pKey = String(field.principle).startsWith('P') ? String(field.principle) : `P${field.principle}`;
  } else if (parts[0] === 'ENV') {
    pKey = 'P6';
  } else if (parts[0] === 'SOC') {
    pKey = 'P3';
  } else if (parts[0] === 'GOV') {
    pKey = 'P1';
  }

  const principleInfo = BRSR_PRINCIPLES_MAP[pKey] || {
    name: `Principle ${pKey.replace('P', '')}`,
    pillar: parts[0] === 'ENV' ? 'Environment' : parts[0] === 'SOC' ? 'Social' : parts[0] === 'GOV' ? 'Governance' : 'General Sustainability',
    desc: 'Statutory Business Responsibility and Sustainability Principle.'
  };

  const isEssential = field?.is_mandatory ?? (parts[1] === 'E' || parts[0] === 'ENV' || parts[0] === 'SOC' || parts[0] === 'GOV');
  const typeLabel = isEssential ? 'Essential Indicator (Mandatory)' : 'Leadership Indicator (Voluntary)';
  const typeBadgeCls = isEssential ? 'badge-amber' : 'badge-purple';
  const typeDesc = isEssential 
    ? 'Mandatory statutory disclosure under SEBI BRSR Core for reasonable assurance by top listed entities.'
    : 'Aspirational leadership disclosure showcasing advanced ESG performance benchmarks.';

  const known = KNOWN_CODE_EXPLANATIONS[code] || {};
  // Prioritize indicator_disclosure_name so official description is never lost
  const title = field?.indicator_disclosure_name || known.title || field?.metric_name || field?.name || field?.label || `Indicator ${code}`;
  const meaning = known.meaning || field?.definition || field?.notes || 'Disclose measured sustainability indicator data for this reporting period.';
  const evidence = known.evidence || 'Utility bills, meter logs, HR records, or operational logbooks.';

  return {
    code,
    pKey,
    principleName: principleInfo.name,
    pillar: field?.pillar || principleInfo.pillar,
    principleDesc: principleInfo.desc,
    typeKey: parts[1] || 'E',
    typeLabel,
    typeBadgeCls,
    typeDesc,
    numKey: parts[2] || '01',
    title,
    meaning,
    evidence,
    unit: field?.unit || 'units',
    dataType: field?.data_type || field?.field_type || (field?.unit === '%' ? 'Percentage (%)' : field?.unit === 'count' ? 'Integer (Count)' : 'Numeric (Float)'),
    isMandatory: field?.is_mandatory ?? isEssential,
  };
}

// ── Hover Explainer Component for cryptic SEBI metric codes ──────────────────
function CodeHelpButton({ code, field }) {
  const [show, setShow] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);
  const info = decodeMetricCode(code, field);

  const handleMouseEnter = () => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const tooltipWidth = 360;
    const left = Math.max(12, Math.min(rect.left - 20, window.innerWidth - tooltipWidth - 20));
    const top = rect.bottom + 6;
    setCoords({ top, left });
    setShow(true);
  };

  const handleMouseLeave = () => {
    setShow(false);
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setShow(prev => !prev);
          handleMouseEnter();
        }}
        aria-label={`Explain code ${code}`}
        title="Hover or click to see what this SEBI metric code means"
        style={{
          width: 17,
          height: 17,
          borderRadius: '50%',
          border: '1px solid rgba(99, 102, 241, 0.5)',
          background: show ? 'var(--brand-500)' : 'rgba(99, 102, 241, 0.16)',
          color: show ? '#fff' : 'var(--brand-400)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '11px',
          fontWeight: 800,
          cursor: 'pointer',
          padding: 0,
          lineHeight: 1,
          flexShrink: 0,
          transition: 'all 0.15s ease',
          boxShadow: show ? '0 0 8px rgba(99,102,241,0.6)' : 'none',
        }}
      >
        ?
      </button>

      {show && typeof document !== 'undefined' && createPortal(
        <div
          onMouseEnter={() => setShow(true)}
          onMouseLeave={() => setShow(false)}
          style={{
            position: 'fixed',
            top: coords.top,
            left: coords.left,
            zIndex: 999999,
            width: 360,
            maxWidth: 'calc(100vw - 24px)',
            background: 'rgba(15, 17, 34, 0.98)',
            backdropFilter: 'blur(16px)',
            border: '1.5px solid var(--border-brand)',
            borderRadius: '10px',
            boxShadow: '0 12px 30px rgba(0, 0, 0, 0.75), 0 0 20px rgba(99, 102, 241, 0.25)',
            padding: '16px 18px',
            color: 'var(--text-primary)',
            fontSize: '12px',
            animation: 'fadeIn 0.15s ease-out',
            pointerEvents: 'auto',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>SEBI Code:</span>
              <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 800, fontSize: '13px', color: 'var(--brand-400)' }}>
                {info.code}
              </span>
            </div>
            <span className={`badge ${info.typeBadgeCls}`} style={{ fontSize: '10px', padding: '2px 8px' }}>
              {info.typeKey === 'E' ? 'Essential (Mandatory)' : 'Leadership (Voluntary)'}
            </span>
          </div>

          {/* Principle Bar */}
          <div style={{ background: 'rgba(99, 102, 241, 0.08)', borderRadius: 6, padding: '8px 10px', marginBottom: 10, border: '1px solid rgba(99, 102, 241, 0.2)' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#fff', marginBottom: 2 }}>
              {info.principleName}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.3 }}>
              {info.principleDesc}
            </div>
          </div>

          {/* Code Decomposition */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--brand-300)', textTransform: 'uppercase', marginBottom: 4 }}>
              Code Breakdown:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: 4, padding: '4px 6px', textAlign: 'center' }}>
                <div style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, color: 'var(--brand-400)', fontSize: '12px' }}>{info.pKey}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Principle {info.pKey.replace('P','')}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: 4, padding: '4px 6px', textAlign: 'center' }}>
                <div style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, color: info.typeKey === 'E' ? '#fbbf24' : '#a78bfa', fontSize: '12px' }}>
                  {info.typeKey === 'E' ? 'E (Essential)' : 'L (Leadership)'}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Statutory Level</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: 4, padding: '4px 6px', textAlign: 'center' }}>
                <div style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, color: '#34d399', fontSize: '12px' }}>#{info.numKey}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Indicator Seq</div>
              </div>
            </div>
          </div>

          {/* What is it? */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#fff', textTransform: 'uppercase', marginBottom: 3 }}>
              What is this Indicator?
            </div>
            <p style={{ margin: 0, fontSize: '11.5px', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
              {info.meaning}
            </p>
          </div>

          {/* Data Type & Evidence */}
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 4, fontSize: '11px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Measurement Unit:</span>
              <strong style={{ color: '#fff' }}>{info.unit}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Data Type:</span>
              <span className="badge badge-gray" style={{ fontSize: '10px', padding: '1px 6px' }}>{info.dataType}</span>
            </div>
            <div style={{ marginTop: 2, color: 'var(--text-muted)', fontSize: '10.5px' }}>
              <strong>Recommended Evidence:</strong> {info.evidence}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

// ── Backend metric code → BRSR form code mapping ─────────────────────────────
// Backend E1 engine uses semantic codes (ENV-ENERGY-001, ENV-WATER-001)
// BRSR form uses SEBI statutory codes (P6-E-01, P6-E-06)
// This map translates between them so OCR results auto-fill the right form fields.
const METRIC_CODE_MAP = {
  // Electricity / Energy
  'ENV-ENERGY-001': 'P6-E-01',   // Total electricity (kWh) → Total Energy Consumed (GJ)
  'ENV-ENERGY-002': 'P6-E-01',   // Diesel fuel energy → Total Energy Consumed (GJ)
  // GHG / Emissions
  'ENV-GHG-001': 'P6-E-03',      // Scope 1 GHG → Direct GHG Emissions
  'ENV-GHG-002': 'P6-E-04',      // Scope 2 GHG → Indirect GHG Emissions
  'ENV-GHG-003': 'P6-E-05',      // Total GHG → Total GHG Emissions
  // Water
  'ENV-WATER-001': 'P6-E-06',    // Water consumption → Total Water Consumption
  'ENV-WATER-002': 'P6-E-07',    // Water intensity → Water Intensity
  // Waste
  'ENV-WASTE-001': 'P6-E-08',    // Waste → Total Waste Generated
  // Safety / Social
  'SOC-SAFE-001': 'P3-E-03',     // LTI incidents → LTIFR
  'SOC-EMP-001': 'P3-E-01',      // Male employees
  'SOC-EMP-002': 'P3-E-02',      // Female employees
  'SOC-SAFE-002': 'P3-E-04',     // Fatalities
  // Fallback: direct P-code pass-through
};

/** Resolve a backend metric code to a BRSR form code */
function resolveMetricCode(backendCode) {
  if (!backendCode) return null;
  // Already in BRSR P-code format (P6-E-01 etc.)
  if (/^P\d+-[EL]-\d+$/.test(backendCode)) return backendCode;
  return METRIC_CODE_MAP[backendCode] || null;
}

// ── Energy Density Constants (standardised IPCC / MoPNG values) ─────────────
const FUEL_ENERGY_DENSITY = {
  petrol:  { density: 32.0,  unit_in: 'L',       unit_out: 'GJ', formula: 'Petrol Volume (L) × Energy Density (32.0 MJ/L) ÷ 1000',           factor: 0.032  },  // 32 MJ/L → GJ
  diesel:  { density: 35.8,  unit_in: 'L',       unit_out: 'GJ', formula: 'Diesel Volume (L) × Energy Density (35.8 MJ/L) ÷ 1000',           factor: 0.0358 },  // 35.8 MJ/L (HSD)
  coal:    { density: 25.0,  unit_in: 'tonnes',  unit_out: 'GJ', formula: 'Coal Mass (tonnes) × Energy Density (25.0 GJ/tonne)',              factor: 25.0   },  // 25 GJ/tonne bituminous avg
};

/**
 * Convert backend extracted_fields to BRSR form format,
 * applying the correct energy-density formula for each fuel sub-type.
 * @param {Array}  extractedFields - raw fields from E1 pipeline
 * @param {string} docType         - 'electricity_bill' | 'fuel_receipt' | etc.
 * @param {string} filename        - original file name (for notes)
 * @param {string} fuelSubType     - 'petrol' | 'diesel' | 'coal'  (only for fuel_receipt)
 * @param {string} targetIndicator - BRSR code to target (e.g. 'P6-E-01')
 */
function mapBackendFieldsToForm(extractedFields, docType, filename, fuelSubType = 'diesel', targetIndicator = null) {
  const DOC_TYPE_METRIC_NAMES = {
    'electricity_bill': { code: 'P6-E-01', name: 'Total Energy Consumed (Grid Electricity)', unit: 'GJ' },
    'fuel_receipt':     { code: 'P6-E-01', name: 'Total Energy Consumed (Fuel)', unit: 'GJ' },
    'water_manifest':   { code: 'P6-E-06', name: 'Total Water Consumption', unit: 'KL' },
    'waste_manifest':   { code: 'P6-E-08', name: 'Total Waste Generated', unit: 'MT' },
    'safety_log':       { code: 'P3-E-03', name: 'Lost-Time Injury Frequency Rate', unit: 'per million manhours' },
  };

  const fuelSpec = FUEL_ENERGY_DENSITY[fuelSubType] || FUEL_ENERGY_DENSITY.diesel;

  return (extractedFields || []).map(f => {
    // Resolve BRSR metric code — prefer user-selected indicator override
    const defaultCode = DOC_TYPE_METRIC_NAMES[docType]?.code || 'P6-E-01';
    const brsrCode = targetIndicator || resolveMetricCode(f.metric) || defaultCode;

    let value = parseFloat(f.value) || 0;
    let unit  = f.unit || 'units';
    let conversionNote = '';

    const unitLower = unit.toLowerCase().trim();

    if (docType === 'electricity_bill') {
      // ── Electricity: ALWAYS convert to GJ — OCR unit labels vary (kWh, units, kwhr, k.w.h, KWH, etc.)
      // We trust that electricity bills always report consumption in kWh.
      conversionNote = `${value.toFixed(2)} kWh × 0.0036 GJ/kWh`;
      value = parseFloat((value * 0.0036).toFixed(6));
      unit  = 'GJ';

    } else if (docType === 'fuel_receipt') {
      // ── Fuel: ALWAYS apply formula based on user-selected fuelSubType ───────────────────────
      // We NEVER store raw litres or tonnes. The user has explicitly chosen the fuel type.
      // OCR unit strings vary widely ("Ltr", "lts", "L", "MT", "Kg") — we must not rely on them.

      if (fuelSubType === 'coal') {
        // Coal Mass (tonnes) × Energy Density (GJ/tonne)
        // Handle kg → convert to tonnes first
        const isKg = /^k\.?g\.?s?$/.test(unitLower);
        const rawTonnes = isKg ? value / 1000 : value;
        const massDisplay = isKg
          ? `${value.toFixed(2)} kg ÷ 1000 = ${rawTonnes.toFixed(6)} tonnes`
          : `${rawTonnes.toFixed(4)} tonnes`;
        conversionNote = `Coal Mass (${massDisplay}) × Energy Density (25.0 GJ/tonne)`;
        value = parseFloat((rawTonnes * fuelSpec.factor).toFixed(6));  // factor = 25.0
        unit  = 'GJ';

      } else {
        // Petrol / Diesel: Volume (L) × Energy Density (MJ/L) ÷ 1000
        // Handle kL → multiply by 1000 to get litres first
        const isKL = /^k\.?l\.?s?$|^kilolitr/.test(unitLower);
        const rawLitres = isKL ? value * 1000 : value;
        const volDisplay = isKL
          ? `${value.toFixed(3)} kL × 1000 = ${rawLitres.toFixed(2)} L`
          : `${rawLitres.toFixed(2)} L`;
        const fuelName = fuelSubType === 'petrol' ? 'Petrol' : 'Diesel';
        conversionNote = `${fuelName} Volume (${volDisplay}) × Energy Density (${fuelSpec.density} MJ/L) ÷ 1000`;
        value = parseFloat((rawLitres * fuelSpec.factor).toFixed(6));  // factor = density / 1000
        unit  = 'GJ';
      }
    }

    const fuelLabel = docType === 'fuel_receipt'
      ? `${fuelSubType.charAt(0).toUpperCase() + fuelSubType.slice(1)} Fuel`
      : '';

    return {
      metric:     brsrCode,
      name:       f.name || DOC_TYPE_METRIC_NAMES[docType]?.name?.replace('Fuel', fuelLabel) || `Indicator ${brsrCode}`,
      value:      String(value),
      unit,
      confidence: f.confidence || 0.90,
      metadata:   f.metadata || {},
      conversionNote,
      fuelSubType: docType === 'fuel_receipt' ? fuelSubType : null,
    };
  });
}


export default function DataEntry() {
  const location = useLocation();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: nodes = [], isLoading: nodesLoading } = useOrgNodes();
  const { data: periods = [], isLoading: periodsLoading } = useOrgPeriods();

  const [selectedEntity, setSelectedEntity] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [formData, setFormData] = useState({});
  const [activeSubmissionId, setActiveSubmissionId] = useState(null);
  const [notice, setNotice] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [searchMetric, setSearchMetric] = useState('');
  const [showEntityDetails, setShowEntityDetails] = useState(false);
  const [showPeriodDetails, setShowPeriodDetails] = useState(false);

  // Bill Drag-and-Drop, Multi-Bill Accumulation & AI Scraping State
  const [billDragging, setBillDragging] = useState(false);
  const [billUploading, setBillUploading] = useState(false);
  const [billProgress, setBillProgress] = useState('');
  const [billModalOpen, setBillModalOpen] = useState(false);
  const [billType, setBillType] = useState('electricity_bill'); // user-selected bill type
  const [fuelSubType, setFuelSubType] = useState('diesel');    // petrol | diesel | coal
  const [selectedIndicator, setSelectedIndicator] = useState(''); // BRSR code the user targets
  const [scrapedBillFields, setScrapedBillFields] = useState([]);
  const [scrapedBillEvidence, setScrapedBillEvidence] = useState(null);
  const [accumulatedBills, setAccumulatedBills] = useState([]);
  const billFileRef = useRef();

  // Reset accumulated bills and clear digital form value for the metric
  const handleResetAccumulatedBills = (targetMetric = null) => {
    const DOC_TYPE_TO_CODE = {
      'electricity_bill': 'P6-E-01',
      'fuel_receipt': 'P6-E-01',
      'water_manifest': 'P6-E-06',
      'waste_manifest': 'P6-E-08',
      'safety_log': 'P3-E-03',
    };
    const targetCode = targetMetric || DOC_TYPE_TO_CODE[billType] || 'P6-E-01';

    let initialVal = '';
    if (formSchema?.sections) {
      for (const s of formSchema.sections) {
        const found = s.fields.find(f => f.metric_code === targetCode);
        if (found && found.current_value !== null && found.current_value !== undefined) {
          initialVal = found.current_value;
          break;
        }
      }
    }

    setFormData(prev => ({
      ...prev,
      [targetCode]: {
        ...(prev[targetCode] || { metric_code: targetCode }),
        value_numeric: initialVal,
        notes: '',
        ai_verified: false,
      },
    }));

    setAccumulatedBills(prev => prev.filter(b => b.metric !== targetCode));
    setNotice({
      type: 'success',
      text: `🔄 Successfully reset accumulated bills and restored indicator ${targetCode} to initial state.`,
    });
  };

  // Default entity and period
  useEffect(() => {
    if (!selectedEntity && nodes.length > 0) {
      const defaultNode = (user?.org_node_id && nodes.find(n => n.id === user.org_node_id)) ||
        nodes.find(n => n.type === 'subsidiary') || nodes[0];
      setSelectedEntity(defaultNode.id);
    }
    if (!selectedPeriod && periods.length > 0) {
      setSelectedPeriod(periods[0].id);
    }
  }, [nodes, periods, selectedEntity, selectedPeriod, user]);

  // Fetch the scoped digital form for this specific entity & period
  const { 
    data: formSchema, 
    isLoading: formLoading, 
    refetch: refetchForm, 
    isRefetching 
  } = useScopedForm(selectedPeriod, selectedEntity);

  const saveMutation = useSavePack();
  const submitMutation = useSubmitPack();

  // Populate formData and submission ID when formSchema changes
  useEffect(() => {
    if (formSchema?.sections) {
      const initial = {};
      formSchema.sections.forEach(sec => {
        sec.fields.forEach(f => {
          initial[f.metric_code] = {
            metric_code: f.metric_code,
            value_numeric: f.current_value !== null && f.current_value !== undefined ? f.current_value : '',
            value_text: '',
            unit: f.unit || 'units',
            status: 'ACTUAL',
            notes: f.notes || '',
          };
        });
      });
      setFormData(initial);

      if (formSchema.submission_id) {
        setActiveSubmissionId(formSchema.submission_id);
      }
    }
  }, [formSchema]);

  // Handle incoming prefill from Evidence Vault if user clicked "Send to Data Entry Form"
  useEffect(() => {
    if (location.state?.prefillMetric && location.state?.prefillValue !== undefined) {
      const code = location.state.prefillMetric;
      const val = location.state.prefillValue;
      const unit = location.state.prefillUnit || 'units';
      const file = location.state.filename || 'Evidence File';

      setFormData(prev => ({
        ...prev,
        [code]: {
          ...(prev[code] || { metric_code: code }),
          value_numeric: val,
          unit: unit,
          status: 'ACTUAL',
          notes: `[AI Verified from ${file}]`,
          ai_verified: true,
        }
      }));

      setNotice({
        type: 'success',
        text: `✨ Auto-filled ${code} with verified measurement ${val} ${unit} from evidence: ${file}!`
      });

      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const handleFieldChange = (code, field, val) => {
    setFormData(prev => ({
      ...prev,
      [code]: {
        ...(prev[code] || { metric_code: code }),
        [field]: val,
      },
    }));
  };

  // AI Bill Multi-Upload & Scraping Handler — accumulates multiple bills and adds up values
  const handleBillDropOrSelect = async (files) => {
    const fileList = Array.from(files || []);
    if (!fileList.length) return;

    setBillUploading(true);
    setNotice(null);

    let successCount = 0;
    const errors = [];
    const newBills = [];
    let lastMappedFields = [];
    let lastEvidence = null;

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      setBillProgress(`Extracting bill ${i + 1} of ${fileList.length}: ${file.name}...`);

      const fd = new FormData();
      fd.append('file', file);
      fd.append('run_ocr', 'true');
      fd.append('doc_type_hint', billType);

      try {
        const res = await evidenceApi.upload(fd);
        const evidence = res.data.evidence;
        const isRelevant = res.data.is_relevant !== false;
        const rejectionReason = res.data.rejection_reason;
        const rawFields = res.data.extracted_fields || [];

        if (!isRelevant) {
          errors.push(`"${file.name}": ${rejectionReason || 'Document type mismatch or unrelated document.'}`);
          continue;
        }

        // Pass fuelSubType + selectedIndicator for proper formula application
        const mappedFields = mapBackendFieldsToForm(
          rawFields,
          billType,
          file.name,
          fuelSubType,
          selectedIndicator || null
        );
        if (mappedFields.length === 0) {
          errors.push(`"${file.name}": Accepted as ${billType.replace(/_/g, ' ')} but no numeric consumption could be extracted.`);
          continue;
        }

        lastMappedFields = mappedFields;
        lastEvidence = evidence;
        successCount++;

        mappedFields.forEach(f => {
          const numVal = parseFloat(f.value);
          if (!isNaN(numVal) && numVal > 0) {
            newBills.push({
              id: evidence?.id || Math.random().toString(),
              filename: file.name,
              metric: f.metric,
              name: f.name,
              addedValue: numVal,
              unit: f.unit || 'units',
              invoiceNumber: f.metadata?.invoice_number || 'N/A',
              meterId: f.metadata?.meter_id || 'N/A',
              billingPeriod: f.metadata?.billing_period || 'Current',
              conversionNote: f.conversionNote || '',
              fuelSubType: f.fuelSubType || null,
            });
          }
        });
      } catch (err) {
        console.error(`Bill upload error for ${file.name}:`, err);
        errors.push(`"${file.name}": ${err.response?.data?.detail || err.message || 'Upload error'}`);
      }
    }

    if (newBills.length > 0) {
      setFormData(prev => {
        const updated = { ...prev };
        newBills.forEach(b => {
          const existing = parseFloat(updated[b.metric]?.value_numeric) || 0;
          const totalVal = parseFloat((existing + b.addedValue).toFixed(4));

          const allForMetric = [
            ...accumulatedBills.filter(item => item.metric === b.metric),
            ...newBills.filter(item => item.metric === b.metric)
          ];
          const summaryNote = `[AI OCR Accumulated (${allForMetric.length} bills)]: ${allForMetric.map(item => `${item.filename} (+${item.addedValue} ${item.unit})`).join(' + ')}`;

          updated[b.metric] = {
            ...(updated[b.metric] || { metric_code: b.metric }),
            value_numeric: totalVal,
            unit: b.unit || 'units',
            status: 'ACTUAL',
            notes: summaryNote,
            ai_verified: true,
          };
        });
        return updated;
      });

      setAccumulatedBills(prev => [...prev, ...newBills]);
      setScrapedBillEvidence(lastEvidence);
      setScrapedBillFields(lastMappedFields);

      let successMsg = `✨ AI OCR successfully parsed and accumulated ${successCount} bill(s) into digital form!`;
      if (errors.length > 0) {
        successMsg += ` (Note: ${errors.length} file(s) skipped: ${errors.join('; ')})`;
      }
      setNotice({
        type: errors.length > 0 && successCount === 0 ? 'error' : 'success',
        text: successMsg,
      });

      setBillModalOpen(true);
    } else {
      setNotice({
        type: 'error',
        text: errors.length > 0 ? `Upload failed: ${errors.join(' | ')}` : 'No valid ESG bill data could be extracted.',
      });
    }

    setBillUploading(false);
    setBillProgress('');
    if (billFileRef.current) billFileRef.current.value = '';
  };

  const handleBillFieldChange = (index, key, val) => {
    setScrapedBillFields(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [key]: val };
      return copy;
    });
  };

  const handleApplyBillFields = () => {
    if (!scrapedBillFields.length) return;

    setFormData(prev => {
      const updated = { ...prev };
      scrapedBillFields.forEach(f => {
        const numVal = parseFloat(f.value);
        if (!isNaN(numVal)) {
          updated[f.metric] = {
            ...(updated[f.metric] || { metric_code: f.metric }),
            value_numeric: numVal,
            unit: f.unit || 'units',
            status: 'ACTUAL',
            notes: `[AI OCR Scraped from ${scrapedBillEvidence?.original_name || 'Bill'}] Meter: ${f.metadata?.meter_id || 'N/A'}, Period: ${f.metadata?.billing_period || 'N/A'}`,
            ai_verified: true,
          };
        }
      });
      return updated;
    });

    setNotice({
      type: 'success',
      text: `✨ Successfully verified and applied ${scrapedBillFields.length} AI-scraped bill indicator(s) to the digital form! Document registered with SHA-256 in Evidence Vault.`
    });
    setBillModalOpen(false);
  };

  // 1. SAVE DRAFT
  const handleSaveDraft = async () => {
    setNotice(null);
    if (!selectedEntity || !selectedPeriod) {
      setNotice({ type: 'error', text: 'Please select both Subsidiary/Facility and Reporting Period.' });
      return;
    }

    const dataPoints = Object.values(formData)
      .filter(item => item.value_numeric !== '' && item.value_numeric !== null && !isNaN(parseFloat(item.value_numeric)))
      .map(item => ({
        metric_code: item.metric_code,
        value_numeric: parseFloat(item.value_numeric),
        value_text: item.value_text || null,
        unit: item.unit || 'units',
        status: item.status || 'ACTUAL',
      }));

    if (dataPoints.length === 0) {
      setNotice({ 
        type: 'error', 
        text: 'Validation Error: Cannot save an empty draft! Please input numeric data for at least one ESG indicator before saving.' 
      });
      return;
    }

    try {
      const res = await saveMutation.mutateAsync({
        entity_id: selectedEntity,
        period_id: selectedPeriod,
        data_points: dataPoints,
      });

      const newSubId = res.data?.id || res.id;
      if (newSubId) {
        setActiveSubmissionId(newSubId);
      }

      setNotice({ 
        type: 'success', 
        text: `Saved ${dataPoints.length} verified indicator(s) as DRAFT for review. (Pack ID: ${newSubId || 'active'})` 
      });

      qc.invalidateQueries({ queryKey: ['scoped-form', selectedPeriod, selectedEntity] });
      refetchForm();
    } catch (err) {
      console.error('Save error:', err);
      setNotice({ type: 'error', text: err.response?.data?.detail || err.message || 'Failed to save draft pack.' });
    }
  };

  // 2. SUBMIT TO CHECKER
  const handleSubmitPack = async () => {
    setNotice(null);
    if (!selectedEntity || !selectedPeriod) {
      setNotice({ type: 'error', text: 'Please select both Subsidiary/Facility and Reporting Period.' });
      return;
    }

    const dataPoints = Object.values(formData)
      .filter(item => item.value_numeric !== '' && item.value_numeric !== null && !isNaN(parseFloat(item.value_numeric)))
      .map(item => ({
        metric_code: item.metric_code,
        value_numeric: parseFloat(item.value_numeric),
        value_text: item.value_text || null,
        unit: item.unit || 'units',
        status: item.status || 'ACTUAL',
      }));

    if (dataPoints.length === 0) {
      setNotice({ 
        type: 'error', 
        text: 'Validation Error: Submit to Checker is disabled without data! Please enter valid numeric values for the required statutory indicators first.' 
      });
      return;
    }

    try {
      const saveRes = await saveMutation.mutateAsync({
        entity_id: selectedEntity,
        period_id: selectedPeriod,
        data_points: dataPoints,
      });

      const submissionIdToSubmit = saveRes.data?.id || saveRes.id || activeSubmissionId || formSchema?.submission_id;

      if (!submissionIdToSubmit) {
        throw new Error('Unable to find active submission pack ID.');
      }

      await submitMutation.mutateAsync(submissionIdToSubmit);

      setNotice({ 
        type: 'success', 
        text: `Monthly ESG Pack with ${dataPoints.length} indicators successfully FROZEN and SUBMITTED to Checker review queue!` 
      });

      qc.invalidateQueries({ queryKey: ['scoped-form', selectedPeriod, selectedEntity] });
      qc.invalidateQueries({ queryKey: ['workflow-queue'] });
      refetchForm();
    } catch (err) {
      console.error('Submit error:', err);
      setNotice({ type: 'error', text: err.response?.data?.detail || err.message || 'Submission failed.' });
    }
  };

  // 3. SPREADSHEET UPLOAD
  const handleSpreadsheetUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setNotice(null);

    const fd = new FormData();
    fd.append('file', file);

    try {
      await collectionApi.uploadSpreadsheet(selectedEntity, selectedPeriod, fd);
      setNotice({ type: 'success', text: `Successfully ingested spreadsheet data: ${file.name}` });
      qc.invalidateQueries({ queryKey: ['scoped-form', selectedPeriod, selectedEntity] });
      refetchForm();
    } catch (err) {
      setNotice({ type: 'error', text: err.response?.data?.detail || err.message || 'Spreadsheet parsing failed.' });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const selectedNodeObj = nodes.find(n => n.id === selectedEntity);
  const selectedPeriodObj = periods.find(p => p.id === selectedPeriod);

  // Authenticated CSV template download — sends JWT Bearer token
  const handleDownloadTemplate = async () => {
    if (!selectedEntity || !selectedPeriod) {
      setNotice({ type: 'error', text: 'Please select a subsidiary and period first.' });
      return;
    }
    const entityCode = selectedNodeObj?.code || selectedEntity;
    const periodCode = selectedPeriodObj?.code || selectedPeriod;
    const url = `${API_BASE}/forms/template/${encodeURIComponent(entityCode)}/${encodeURIComponent(periodCode)}`;
    const token = localStorage.getItem('brsr_token');
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `BRSR_Template_${entityCode}_${periodCode}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err) {
      setNotice({ type: 'error', text: `Template download failed: ${err.message}` });
    }
  };

  const filledCount = Object.values(formData)
    .filter(item => item.value_numeric !== '' && item.value_numeric !== null && !isNaN(parseFloat(item.value_numeric)))
    .length;

  return (
    <div className="page-content anim-fade">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-tag">DATA COLLECTION & MONTHLY PACKS</div>
          <h1 className="page-title">Digital Reporting Forms (Subsidiary-Scoped)</h1>
          <p className="page-subtitle">
            Dynamic parameter projection adapted to the selected subsidiary, project facts, and operational boundaries.
          </p>
        </div>

        {/* Action Controls */}
        <div className="page-actions" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div 
            className={`badge ${filledCount > 0 ? 'badge-emerald' : 'badge-amber'}`} 
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', fontSize: '12px' }}
            title={filledCount === 0 ? "Enter data for at least 1 indicator before submitting" : `${filledCount} indicators entered`}
          >
            <CheckCircle2 size={13} />
            <span>{filledCount} Indicator{filledCount === 1 ? '' : 's'} Filled</span>
          </div>

          <button
            onClick={handleDownloadTemplate}
            className="btn btn-secondary"
            title="Download CSV upload template (authenticated)"
          >
            <Download size={14} />
            <span>CSV Template</span>
          </button>

          <button
            type="button"
            onClick={() => billFileRef.current?.click()}
            disabled={billUploading}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: 6, borderColor: 'var(--brand-400)', color: 'var(--brand-400)' }}
            title="Upload utility bills (electricity, water, diesel) to automatically extract metrics"
          >
            <Sparkles size={14} />
            <span>{billUploading ? 'Scraping Bill...' : 'AI Bill Auto-Fill'}</span>
          </button>
          <input
            ref={billFileRef}
            type="file"
            accept="image/*, application/pdf"
            onChange={(e) => handleBillDropOrSelect(e.target.files)}
            style={{ display: 'none' }}
            disabled={billUploading}
          />

          <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
            <Upload size={14} />
            <span>{uploading ? 'Ingesting...' : 'Bulk Excel/CSV'}</span>
            <input 
              type="file" 
              accept=".csv, .xlsx, .xls" 
              onChange={handleSpreadsheetUpload} 
              style={{ display: 'none' }} 
              disabled={uploading}
            />
          </label>

          <button
            onClick={handleSaveDraft}
            disabled={saveMutation.isPending || filledCount === 0}
            className="btn btn-secondary"
          >
            <Save size={14} />
            <span>{saveMutation.isPending ? 'Saving...' : 'Save Draft'}</span>
          </button>

          <button
            onClick={handleSubmitPack}
            disabled={submitMutation.isPending || filledCount === 0}
            className="btn btn-primary"
            style={filledCount === 0 ? { opacity: 0.6 } : {}}
            title={filledCount === 0 ? "Enter at least 1 indicator value to enable submit to checker" : "Submit pack to checker queue"}
          >
            <Send size={14} />
            <span>{submitMutation.isPending ? 'Submitting...' : 'Submit to Checker'}</span>
          </button>
        </div>
      </div>

      {/* Scope Pickers Card - Large Dedicated Area */}
      <div className="card" style={{ padding: '22px 26px', background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Header Tag */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="page-tag" style={{ margin: 0 }}>ACTIVE REPORTING CONTEXT & OPERATIONAL BOUNDARY</span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>— Dynamic parameter projection adapted to selected entity</span>
            </div>
            <button 
              className="btn btn-secondary btn-sm" 
              onClick={() => refetchForm()} 
              disabled={isRefetching}
              title="Refresh form fields"
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <RefreshCw size={13} className={isRefetching ? 'spin' : ''} />
              <span>Refresh Scope</span>
            </button>
          </div>

          {/* Large Visible Selection Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1.4fr) minmax(280px, 1fr)', gap: '18px', alignItems: 'flex-start' }}>
            {/* Entity Selector Dedicated Area */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
                  <Building2 size={16} color="var(--brand-400)" />
                  <span>Subsidiary / Facility / Site</span>
                </label>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowEntityDetails(true)}
                  style={{ padding: '3px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: 5, color: 'var(--brand-400)' }}
                  title="Show complete details for this entity"
                >
                  <Eye size={12} />
                  <span>Show in Details</span>
                </button>
              </div>

              <select
                value={selectedEntity}
                onChange={(e) => setSelectedEntity(e.target.value)}
                className="form-control"
                style={{ width: '100%', height: '42px', fontSize: '13px', fontWeight: 600, background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)' }}
              >
                {nodes.map(n => (
                  <option key={n.id} value={n.id}>
                    [{n.type.toUpperCase()}] {n.name} ({n.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Period Selector Dedicated Area */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
                  <Calendar size={16} color="var(--brand-400)" />
                  <span>Statutory Reporting Period</span>
                </label>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowPeriodDetails(true)}
                  style={{ padding: '3px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: 5, color: 'var(--brand-400)' }}
                  title="Show complete details for this reporting period"
                >
                  <Eye size={12} />
                  <span>Show in Details</span>
                </button>
              </div>

              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="form-control"
                style={{ width: '100%', height: '42px', fontSize: '13px', fontWeight: 600, background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)' }}
              >
                {periods.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.code} — FY {p.financial_year} ({p.period_type?.toUpperCase()} PACK)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Context Details Summary Strip */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
            padding: '12px 18px',
            background: 'rgba(99, 102, 241, 0.06)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>
                {selectedNodeObj?.name || 'Selected Entity'}
              </span>
              <span className="badge badge-brand" style={{ fontFamily: 'JetBrains Mono', fontSize: '11px' }}>
                {selectedNodeObj?.code || selectedEntity}
              </span>
              <span className="badge badge-emerald">
                {selectedNodeObj?.type?.toUpperCase()}
              </span>
              {selectedNodeObj?.project_type && (
                <span className="badge badge-purple">
                  Sector: {selectedNodeObj.project_type.toUpperCase()}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {formSchema && (
                <span className="badge badge-brand" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Layers size={11} />
                  <span>{formSchema.total_metrics} Applicable Indicators</span>
                </span>
              )}
              <span className={`badge ${formSchema?.submission_status === 'SUBMITTED' ? 'badge-sky' : 'badge-amber'}`}>
                Status: {formSchema?.submission_status || 'DRAFT'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
           AI OCR Auto-Fill Panel  (E1 Engine)
           Step 1 → Indicator  |  Step 2 → Bill type
           Step 3 → Fuel sub-type (if fuel)  |  Step 4 → Upload
      ═══════════════════════════════════════════════════════════ */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
        background: 'linear-gradient(145deg, rgba(15,17,34,0.9), rgba(99,102,241,0.06))',
        border: '1px solid rgba(99, 102, 241, 0.30)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
      }}>

        {/* ── Header bar ── */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '14px 20px',
          background: 'rgba(99, 102, 241, 0.10)',
          borderBottom: '1px solid rgba(99,102,241,0.20)',
        }}>
          <div style={{ width: 34, height: 34, borderRadius: '9px', background: 'linear-gradient(135deg, var(--brand-600), var(--brand-400))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Sparkles size={17} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>AI Bill Auto-Fill (E1 OCR Engine)</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Select an indicator → pick bill type → upload bills — values auto-fill &amp; accumulate</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '18px 20px' }}>

          {/* ── STEP 1: Indicator Disclosure Name ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--brand-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800, color: '#fff', flexShrink: 0 }}>1</span>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Indicator Disclosure Name</span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>(which BRSR KPI should be filled?)</span>
            </div>
            <select
              value={selectedIndicator}
              onChange={e => {
                setSelectedIndicator(e.target.value);
                // Reset bill type so user picks fresh for the new indicator
                setBillType('');
                setFuelSubType('diesel');
              }}
              className="form-control"
              style={{ fontSize: '13px', fontWeight: 600, background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', height: '40px' }}
            >
              <option value="">— Select an indicator first —</option>
              {formSchema?.sections?.length ? (
                formSchema.sections.map(sec => (
                  <optgroup key={sec.principle} label={`${sec.principle} · ${sec.principle_name || sec.title}`}>
                    {sec.fields.map(f => (
                      <option key={f.metric_code} value={f.metric_code}>
                        {f.metric_code} · {f.indicator_disclosure_name || f.metric_name || f.label || f.metric_code} ({f.unit || 'units'})
                      </option>
                    ))}
                  </optgroup>
                ))
              ) : (
                <>
                  <optgroup label="⚡ Energy & Emissions (Principle 6)">
                    <option value="ENV-ENERGY-001">ENV-ENERGY-001 · Total Electricity Consumption (MWh/GJ)</option>
                    <option value="ENV-ENERGY-002">ENV-ENERGY-002 · Fuel Consumption - Petrol, Diesel, Coal (GJ)</option>
                    <option value="P6-E-01">P6-E-01 · Total Energy Consumed (Gross) (GJ)</option>
                    <option value="ENV-GHG-001">ENV-GHG-001 · Direct Scope 1 GHG Emissions (tCO₂e)</option>
                    <option value="ENV-GHG-002">ENV-GHG-002 · Indirect Scope 2 GHG Emissions (tCO₂e)</option>
                  </optgroup>
                  <optgroup label="💧 Water (Principle 6)">
                    <option value="ENV-WATER-001">ENV-WATER-001 · Total Water Consumption (KL)</option>
                    <option value="P6-E-06">P6-E-06 · Total Water Consumption (KL)</option>
                  </optgroup>
                  <optgroup label="♻️ Waste (Principle 6)">
                    <option value="ENV-WASTE-001">ENV-WASTE-001 · Total Waste Generated (MT)</option>
                    <option value="P6-E-08">P6-E-08 · Total Solid Waste Generated (MT)</option>
                  </optgroup>
                  <optgroup label="👷 Safety & Social (Principle 3)">
                    <option value="SOC-SAFE-001">SOC-SAFE-001 · Lost-Time Injury Frequency Rate (LTIFR)</option>
                    <option value="SOC-SAFE-002">SOC-SAFE-002 · Work-Related Fatalities (count)</option>
                    <option value="SOC-EMP-001">SOC-EMP-001 · Total Workforce Headcount (count)</option>
                    <option value="SOC-WELF-001">SOC-WELF-001 · Training Hours per Employee (hours)</option>
                  </optgroup>
                </>
              )}
            </select>
          </div>

          {/* ── STEP 2: Bill / Document Type Dropdown (only after indicator selected) ── */}
          {selectedIndicator && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--brand-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800, color: '#fff', flexShrink: 0 }}>2</span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bill / Document Type</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>(select the type of supporting document)</span>
              </div>
              <select
                value={billType}
                onChange={e => {
                  setBillType(e.target.value);
                  if (e.target.value !== 'fuel_receipt') setFuelSubType('diesel');
                }}
                className="form-control"
                style={{ fontSize: '13px', fontWeight: 600, background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', height: '40px' }}
              >
                <option value="">— Select bill / document type —</option>
                <option value="electricity_bill">⚡ Electricity Bill</option>
                <option value="fuel_receipt">🛢 Fuel Receipt</option>
                <option value="water_manifest">💧 Water Bill</option>
                <option value="waste_manifest">♻️ Waste Manifest</option>
                <option value="safety_log">🦺 Safety Log</option>
              </select>

              {/* Electricity formula hint */}
              {billType === 'electricity_bill' && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '9px 14px',
                  background: 'rgba(245,158,11,0.07)',
                  border: '1px solid rgba(245,158,11,0.22)',
                  borderRadius: '8px',
                  marginTop: 2,
                }}>
                  <span style={{ fontSize: '16px' }}>🧮</span>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#f59e0b' }}>Electricity → GJ Conversion Formula</div>
                    <div style={{ fontFamily: 'JetBrains Mono', fontSize: '12px', color: '#fff', marginTop: 2 }}>
                      Energy (GJ) = kWh × 0.0036
                    </div>
                    <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: 2 }}>
                      AI extracts kWh from DISCOM/EB bill → auto-converts to GJ (BRSR unit) and accumulates with fuel energy into the digital form
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 3: Fuel Sub-Type Dropdown (only when fuel_receipt selected) ── */}
          {billType === 'fuel_receipt' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800, color: '#fff', flexShrink: 0 }}>3</span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Type of Fuel</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>(select fuel type for correct energy density formula)</span>
              </div>
              <select
                value={fuelSubType}
                onChange={e => setFuelSubType(e.target.value)}
                className="form-control"
                style={{ fontSize: '13px', fontWeight: 600, background: 'var(--bg-elevated)', border: '1px solid rgba(239,68,68,0.4)', height: '40px', color: '#fff' }}
              >
                <option value="diesel">🛢 Diesel (HSD) — 35.8 MJ/L</option>
                <option value="petrol">⛽ Petrol (MS) — 32.0 MJ/L</option>
                <option value="coal">⛏ Coal (Bituminous) — 25.0 GJ/tonne</option>
              </select>

              {/* Formula Preview for selected fuel */}
              {(() => {
                const spec = FUEL_ENERGY_DENSITY[fuelSubType];
                if (!spec) return null;
                const fmtLabel = { diesel: 'Diesel (HSD)', petrol: 'Petrol (MS)', coal: 'Coal (Bituminous)' }[fuelSubType] || fuelSubType;
                const fuelColor = { diesel: '#ef4444', petrol: '#f97316', coal: '#a8a29e' }[fuelSubType] || '#ef4444';
                return (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '9px 14px',
                    background: `rgba(239,68,68,0.07)`,
                    border: `1px solid rgba(239,68,68,0.25)`,
                    borderRadius: '8px',
                    marginTop: 2,
                  }}>
                    <span style={{ fontSize: '16px' }}>🧮</span>
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: fuelColor }}>{fmtLabel} → GJ Conversion Formula</div>
                      <div style={{ fontFamily: 'JetBrains Mono', fontSize: '12px', color: '#fff', marginTop: 2 }}>
                        {spec.formula}
                      </div>
                      <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: 2 }}>
                        AI extracts raw {spec.unit_in === 'L' ? 'volume in litres' : 'mass in tonnes'} from bill → auto-converts to GJ and accumulates with electricity bills into the digital form
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* ── STEP 4: Drop Zone (only after indicator + bill type chosen) ── */}
          {selectedIndicator && billType && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--brand-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800, color: '#fff', flexShrink: 0 }}>{billType === 'fuel_receipt' ? '4' : '3'}</span>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Upload Bill(s)</span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>(multiple files supported — electricity + fuel values accumulate)</span>
            </div>

            {/* Drag & Drop Zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setBillDragging(true); }}
              onDragLeave={() => setBillDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setBillDragging(false);
                handleBillDropOrSelect(e.dataTransfer.files);
              }}
              style={{
                border: `2px dashed ${billDragging ? 'var(--brand-400)' : 'rgba(99, 102, 241, 0.35)'}`,
                borderRadius: 'var(--radius-md)',
                padding: '14px 18px',
                background: billDragging ? 'rgba(99, 102, 241, 0.10)' : 'rgba(99, 102, 241, 0.02)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                flexWrap: 'wrap',
                transition: 'all 0.2s ease',
                cursor: 'pointer',
              }}
              onClick={() => billFileRef.current?.click()}
            >
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Upload size={15} color="var(--brand-400)" />
                <span>
                  Drop your <strong style={{ color: '#fff' }}>{
                    { electricity_bill: 'Electricity Bill', fuel_receipt: 'Fuel / Diesel Receipt', water_manifest: 'Water Bill', waste_manifest: 'Waste Manifest', safety_log: 'Safety Log' }[billType]
                  }</strong> here, or click to browse (PDF, JPG, PNG)
                </span>
              </div>

              {/* Hidden Multi-File Upload Input */}
              <input
                ref={billFileRef}
                type="file"
                multiple
                accept=".pdf, .png, .jpg, .jpeg"
                onChange={(e) => handleBillDropOrSelect(e.target.files)}
                style={{ display: 'none' }}
                disabled={billUploading}
              />

              <button
                type="button"
                disabled={billUploading}
                className="btn btn-primary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '12px', flexShrink: 0 }}
                onClick={(e) => { e.stopPropagation(); billFileRef.current?.click(); }}
              >
                <Upload size={13} />
                <span>{billUploading ? (billProgress || 'Extracting with AI OCR...') : '📂 Browse & Upload Bills'}</span>
              </button>
            </div>
          </div>
          )}{/* end upload zone conditional */}

          {/* Accumulated Multi-Bill Summary Strip */}
          {accumulatedBills.length > 0 && (
            <div style={{
              background: 'rgba(16, 185, 129, 0.06)',
              border: '1px solid rgba(16, 185, 129, 0.28)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span className="badge badge-emerald" style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px' }}>
                    ✅ {accumulatedBills.length} Bill{accumulatedBills.length > 1 ? 's' : ''} Accumulated
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Combined Total: <strong style={{ color: '#fff', fontSize: '13px', fontFamily: 'JetBrains Mono' }}>
                      {accumulatedBills.reduce((acc, b) => acc + (parseFloat(b.addedValue) || 0), 0).toFixed(4)} {accumulatedBills[0]?.unit || 'GJ'}
                    </strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleResetAccumulatedBills()}
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '3px 10px', fontSize: '11px', borderColor: 'rgba(239, 68, 68, 0.4)', color: '#ef4444', display: 'flex', alignItems: 'center', gap: 5 }}
                  title="Reset all accumulated bills and clear digital form values"
                >
                  <RotateCcw size={11} />
                  <span>Reset All Bills</span>
                </button>
              </div>

              {/* Individual Bill Chips with conversion note */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {accumulatedBills.map((b, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: 'rgba(15, 23, 42, 0.85)',
                      border: '1px solid rgba(99, 102, 241, 0.28)',
                      borderRadius: '7px',
                      padding: '5px 11px',
                      fontSize: '11px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 2,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ color: 'var(--text-secondary)' }}>📄 {b.filename}</span>
                      <span style={{ color: '#34d399', fontWeight: 700, fontFamily: 'JetBrains Mono' }}>
                        +{b.addedValue} {b.unit}
                      </span>
                      {b.fuelSubType && (
                        <span style={{ fontSize: '10px', color: '#f97316', background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.25)', borderRadius: 4, padding: '1px 5px' }}>
                          {b.fuelSubType}
                        </span>
                      )}
                    </div>
                    {b.conversionNote && (
                      <div style={{ fontFamily: 'JetBrains Mono', fontSize: '9.5px', color: 'var(--text-muted)' }}>
                        = {b.conversionNote} = {b.addedValue} GJ
                      </div>
                    )}
                    {b.invoiceNumber && b.invoiceNumber !== 'N/A' && (
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Invoice: {b.invoiceNumber}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>{/* end inner padding wrapper */}
      </div>{/* end OCR panel */}

      {/* Notice Message Banner */}
      {notice && (
        <div style={{
          padding: '12px 18px',
          borderRadius: '8px',
          fontSize: '13px',
          fontWeight: 600,
          background: notice.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          color: notice.type === 'success' ? '#10b981' : '#ef4444',
          border: `1px solid ${notice.type === 'success' ? '#10b981' : '#ef4444'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span>{notice.text}</span>
          <button className="icon-btn" onClick={() => setNotice(null)} style={{ width: 24, height: 24 }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Dynamic Sections and Fields */}
      {formLoading ? (
        <div className="card" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <RefreshCw size={24} className="spin" style={{ margin: '0 auto 12px', display: 'block', color: 'var(--brand-400)' }} />
          <span>Deriving distinct statutory indicators for {selectedNodeObj?.name || 'facility'}...</span>
        </div>
      ) : !formSchema || formSchema.sections?.length === 0 ? (
        <div className="card" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <AlertCircle size={28} color="var(--amber-400)" style={{ margin: '0 auto 12px', display: 'block' }} />
          <h3 style={{ color: '#fff', fontSize: '16px', marginBottom: 4 }}>No Parameters Required for this Entity Boundary</h3>
          <p style={{ fontSize: '13px', maxWidth: 500, margin: '0 auto' }}>
            Under MEIL ESG governance rules, this organizational node has zero applicable reporting requirements for the selected period.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {formSchema.sections.map((section, sIdx) => (
            <div key={sIdx} className="card" style={{ padding: '20px' }}>
              <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--brand-400)' }}>
                    {section.principle}: {section.principle_name}
                  </h3>
                  <span className="badge badge-gray">{section.pillar}</span>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Statutory disclosures applicable to {selectedNodeObj?.name} ({section.fields.length} metrics)
                </p>
              </div>

              {/* Fields Table */}
              <div className="table-wrap" style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '145px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span>Code</span>
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 'normal' }}>(SEBI Ref)</span>
                        </div>
                      </th>
                      <th>Indicator Disclosure Name</th>
                      <th style={{ width: '180px' }}>Measured Value</th>
                      <th style={{ width: '120px' }}>Unit</th>
                      <th style={{ width: '140px' }}>Data Type</th>
                      <th>Notes / Evidence Ref</th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.fields.map((field) => {
                      const currentVal = formData[field.metric_code]?.value_numeric ?? '';
                      const currentNotes = formData[field.metric_code]?.notes ?? '';
                      const isAiVerified = formData[field.metric_code]?.ai_verified;

                      // Indicator Disclosure Name (supports both live and demo mode)
                      const disclosureName = field.indicator_disclosure_name || field.metric_name || field.name || field.label || (field.metric_code ? `Indicator ${field.metric_code}` : 'Unnamed Indicator');

                      // Data Type (supports both live and demo mode)
                      const dataType = field.data_type || field.field_type || (field.unit === '%' ? 'Percentage (%)' : field.unit === 'count' ? 'Integer (Count)' : 'Numeric (Float)');

                      return (
                        <tr key={field.metric_code}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: 'var(--brand-400)', fontWeight: 700 }}>
                                {field.metric_code}
                              </span>
                              <CodeHelpButton code={field.metric_code} field={field} />
                            </div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13px' }}>
                                  {disclosureName}
                                </span>
                                {isAiVerified && (
                                  <span className="badge badge-emerald" style={{ fontSize: '10px', padding: '2px 6px', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                    <Sparkles size={10} /> AI Verified
                                  </span>
                                )}
                              </div>
                              {field.definition && (
                                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.35 }}>
                                  {field.definition}
                                </span>
                              )}
                              {field.is_mandatory && (
                                <span style={{ fontSize: '10px', color: 'var(--amber-400)', fontWeight: 600, display: 'inline-block', marginTop: 2 }}>
                                  ★ SEBI BRSR Core Mandated
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <input
                                type="number"
                                step="any"
                                placeholder="0.00"
                                className="form-control"
                                style={{
                                  height: '32px',
                                  fontFamily: 'JetBrains Mono',
                                  fontSize: '12px',
                                  borderColor: isAiVerified ? '#10b981' : undefined,
                                  background: isAiVerified ? 'rgba(16, 185, 129, 0.08)' : undefined
                                }}
                                value={currentVal}
                                onChange={(e) => handleFieldChange(field.metric_code, 'value_numeric', e.target.value)}
                              />
                              {isAiVerified && (
                                <button
                                  type="button"
                                  onClick={() => handleResetAccumulatedBills(field.metric_code)}
                                  className="icon-btn"
                                  title={`Reset ${field.metric_code} value`}
                                  style={{
                                    width: 28,
                                    height: 28,
                                    color: '#ef4444',
                                    borderRadius: '4px',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    background: 'rgba(239, 68, 68, 0.08)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    flexShrink: 0,
                                  }}
                                >
                                  <RotateCcw size={12} />
                                </button>
                              )}
                            </div>
                          </td>
                          <td>
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                              {field.unit}
                            </span>
                          </td>
                          <td>
                            <span className="badge badge-indigo" style={{ fontSize: '11px', fontFamily: 'JetBrains Mono', letterSpacing: '-0.2px' }}>
                              {dataType}
                            </span>
                          </td>
                          <td>
                            <input
                              type="text"
                              placeholder="Invoice #, log, remarks..."
                              className="form-control"
                              style={{ height: '32px', fontSize: '12px' }}
                              value={currentNotes}
                              onChange={(e) => handleFieldChange(field.metric_code, 'notes', e.target.value)}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {/* Bottom Save & Submit Bar */}
          <div className="card" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Four-Eyes Validation Rule — Maker cannot self-approve.
              </span>
              {filledCount > 0 && (
                <span className="badge badge-emerald">
                  {filledCount} indicator{filledCount !== 1 ? 's' : ''} filled
                </span>
              )}
              {filledCount === 0 && (
                <span className="badge badge-amber">No data entered yet</span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleSaveDraft}
                disabled={saveMutation.isPending || filledCount === 0}
                className="btn btn-secondary"
                title={filledCount === 0 ? 'Enter at least one numeric indicator to save' : 'Save current data as draft'}
              >
                <Save size={14} />
                <span>{saveMutation.isPending ? 'Saving...' : 'Save Draft'}</span>
              </button>
              <button
                onClick={handleSubmitPack}
                disabled={submitMutation.isPending || filledCount === 0}
                className="btn btn-primary"
                title={filledCount === 0 ? 'Enter at least one numeric indicator before submitting' : 'Submit pack to checker queue'}
              >
                <Send size={14} />
                <span>{submitMutation.isPending ? 'Submitting...' : 'Submit to Checker'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Dedicated Subsidiary / Facility Details */}
      {showEntityDetails && selectedNodeObj && (
      <Modal 
        isOpen={Boolean(showEntityDetails && selectedNodeObj)} 
        onClose={() => setShowEntityDetails(false)} 
        maxWidth="640px"
      >
        <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="modal-header-icon">
                  <Building2 size={18} color="var(--brand-400)" />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', color: '#fff' }}>Subsidiary / Facility Profile</h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    7-Tier Hierarchy Operational Boundaries & ESG Scope
                  </p>
                </div>
              </div>
              <button className="icon-btn" onClick={() => setShowEntityDetails(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                <div style={{ background: 'var(--bg-elevated)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Legal Unit Name</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff', marginTop: 2 }}>{selectedNodeObj.name}</div>
                </div>

                <div style={{ background: 'var(--bg-elevated)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Unit Identifier / Code</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--brand-400)', fontFamily: 'JetBrains Mono', marginTop: 2 }}>{selectedNodeObj.code}</div>
                </div>

                <div style={{ background: 'var(--bg-elevated)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Hierarchy Level</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginTop: 2, textTransform: 'capitalize' }}>
                    {selectedNodeObj.type?.replace('_', ' ')}
                  </div>
                </div>

                <div style={{ background: 'var(--bg-elevated)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>SEBI Boundary Scope</div>
                  <div style={{ marginTop: 4 }}>
                    <span className={`badge ${selectedNodeObj.boundary ? 'badge-emerald' : 'badge-gray'}`}>
                      {selectedNodeObj.boundary ? 'In-Scope (Consolidated)' : 'Excluded'}
                    </span>
                  </div>
                </div>

                <div style={{ background: 'var(--bg-elevated)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Project Sector Baseline</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginTop: 2, textTransform: 'capitalize' }}>
                    {selectedNodeObj.project_type?.replace('_', ' ') || 'General Corporate'}
                  </div>
                </div>

                <div style={{ background: 'var(--bg-elevated)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Ownership & Control</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
                    {selectedNodeObj.ownership_pct}% ({selectedNodeObj.control_type?.replace('_', ' ') || 'operational control'})
                  </div>
                </div>
              </div>

              <div style={{ background: 'var(--bg-elevated)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>PostgreSQL ltree Materialized Path</div>
                <div style={{ fontSize: '12px', color: 'var(--brand-400)', fontFamily: 'JetBrains Mono' }}>
                  {selectedNodeObj.path || 'ROOT'}
                </div>
              </div>

              <div style={{ background: 'rgba(99, 102, 241, 0.08)', padding: '14px 18px', borderRadius: '8px', border: '1px solid var(--border-brand)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <ShieldCheck size={15} color="var(--brand-400)" />
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Scoped Digital Parameters</span>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                  This facility currently projects <strong>{formSchema?.total_metrics || 39} applicable indicators</strong>. Metrics are tailored dynamically to its industrial sector ({selectedNodeObj.project_type || 'corporate'}) and operational boundary.
                </p>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setShowEntityDetails(false)}
              >
                Close Details
              </button>
            </div>
      </Modal>
      )}

      {/* Modal: Dedicated Reporting Period Details */}
      {showPeriodDetails && selectedPeriodObj && (
      <Modal 
        isOpen={Boolean(showPeriodDetails && selectedPeriodObj)} 
        onClose={() => setShowPeriodDetails(false)} 
        maxWidth="640px"
      >
        <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="modal-header-icon">
                  <Calendar size={18} color="var(--brand-400)" />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', color: '#fff' }}>Reporting Period Details</h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Statutory Cycle & Data Ingestion Window: {selectedPeriodObj.code}
                  </p>
                </div>
              </div>
              <button className="icon-btn" onClick={() => setShowPeriodDetails(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                <div style={{ background: 'var(--bg-elevated)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Period Identifier</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--brand-400)', fontFamily: 'JetBrains Mono', marginTop: 2 }}>{selectedPeriodObj.code}</div>
                </div>

                <div style={{ background: 'var(--bg-elevated)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Fiscal Year</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff', marginTop: 2 }}>FY {selectedPeriodObj.financial_year}</div>
                </div>

                <div style={{ background: 'var(--bg-elevated)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Granularity</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
                    {selectedPeriodObj.period_type?.toUpperCase()} PACK
                  </div>
                </div>

                <div style={{ background: 'var(--bg-elevated)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Ingestion Status</div>
                  <div style={{ marginTop: 4 }}>
                    <span className={`badge ${selectedPeriodObj.status === 'LOCKED' ? 'badge-rose' : 'badge-emerald'}`}>
                      {selectedPeriodObj.status === 'LOCKED' ? 'LOCKED (Audit Freeze)' : 'OPEN (Submissions Active)'}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ background: 'var(--bg-elevated)', padding: '14px 18px', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <Clock size={14} color="var(--brand-400)" />
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Calendar Collection Window</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '13px', color: 'var(--text-secondary)' }}>
                  <span><strong>Start:</strong> {selectedPeriodObj.start_date}</span>
                  <span style={{ color: 'var(--text-muted)' }}>→</span>
                  <span><strong>End:</strong> {selectedPeriodObj.end_date}</span>
                </div>
              </div>

              <div style={{ background: 'rgba(99, 102, 241, 0.08)', padding: '14px 18px', borderRadius: '8px', border: '1px solid var(--border-brand)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <ShieldCheck size={15} color="var(--brand-400)" />
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Four-Eyes Verification Rule</span>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                  Submissions in this period are governed by Segregation of Duties (Maker cannot self-approve). Upon submitting, the pack advances to the Checker queue for verification.
                </p>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setShowPeriodDetails(false)}
              >
                Close Details
              </button>
            </div>
      </Modal>
      )}

      {/* Modal: AI Bill Document Scraped — Review & Auto-Fill Form */}
      {billModalOpen && (
      <Modal 
        isOpen={Boolean(billModalOpen)} 
        onClose={() => setBillModalOpen(false)} 
        maxWidth="780px"
      >
        <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="modal-header-icon" style={{ background: 'linear-gradient(135deg, var(--brand-600), var(--brand-400))' }}>
                  <Sparkles size={18} color="#fff" />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <h3 style={{ fontSize: '16px', color: '#fff', margin: 0 }}>
                      AI Bill Document Scraped — Verification & Auto-Fill
                    </h3>
                    <span className="badge badge-emerald" style={{ fontSize: '10px' }}>
                      Multimodal OCR E1
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                    File: <strong style={{ color: 'var(--text-primary)' }}>{scrapedBillEvidence?.original_name || 'Uploaded Invoice'}</strong> • SHA-256 Registered
                  </p>
                </div>
              </div>
              <button className="icon-btn" onClick={() => setBillModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ background: 'rgba(99, 102, 241, 0.08)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-brand)', fontSize: '12px', color: 'var(--text-secondary)' }}>
                Inspect the digitally scraped figures below. You can adjust any value, confirm its unit, and review SEBI statutory guidance before applying directly into your digital form.
              </div>

              {/* Scraped Fields List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {scrapedBillFields.map((field, idx) => {
                  return (
                    <div
                      key={idx}
                      style={{
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border-default)',
                        borderRadius: '10px',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 700, color: '#fff', fontSize: '14px' }}>
                            {field.metric === 'ENV-ENERGY-001' ? 'Principle 6: Total Electricity Consumption' : `Target Metric: ${field.metric}`}
                          </span>
                          <code style={{ fontSize: '11px', padding: '2px 6px', background: 'var(--bg-panel)', borderRadius: '4px', color: 'var(--brand-400)' }}>
                            {field.metric}
                          </code>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>AI Confidence:</span>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: '#10b981' }}>
                            {Math.round((field.confidence || 0.94) * 100)}%
                          </span>
                        </div>
                      </div>

                      {/* Inputs Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                        <div>
                          <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                            Scraped Measured Value:
                          </label>
                          <input
                            type="number"
                            value={field.value}
                            onChange={(e) => handleBillFieldChange(idx, 'value', e.target.value)}
                            className="form-control"
                            style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)', height: 38 }}
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                            Unit:
                          </label>
                          <input
                            type="text"
                            value={field.unit}
                            onChange={(e) => handleBillFieldChange(idx, 'unit', e.target.value)}
                            className="form-control"
                            style={{ height: 38 }}
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                            Metric Code:
                          </label>
                          <input
                            type="text"
                            value={field.metric}
                            onChange={(e) => handleBillFieldChange(idx, 'metric', e.target.value)}
                            className="form-control"
                            style={{ height: 38 }}
                          />
                        </div>
                      </div>

                      {/* Metadata tags */}
                      {field.metadata && Object.keys(field.metadata).length > 0 && (
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', fontSize: '11px' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Metadata Scraped:</span>
                          {Object.entries(field.metadata).map(([k, v]) => (
                            <span key={k} style={{ padding: '2px 8px', background: 'var(--bg-card)', borderRadius: 4, border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                              <strong style={{ color: 'var(--text-primary)' }}>{k.replace('_', ' ')}:</strong> {String(v)}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Regulatory Guidance Excerpt */}
                      <div style={{ background: 'rgba(16, 185, 129, 0.06)', borderLeft: '3px solid #10b981', padding: '10px 14px', borderRadius: 4, fontSize: '12px' }}>
                        <div style={{ fontWeight: 600, color: '#10b981', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                          <BookOpen size={13} />
                          <span>SEBI BRSR Guidance Note Grounding:</span>
                        </div>
                        <div style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                          Disclose total energy consumption in gigajoules (GJ). Supporting evidence: DISCOM electricity bills, utility invoices, and meter registers. 1 kWh = 0.0036 GJ.
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Four-Eyes Governance: Values applied to form will require Checker approval on submission.
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setBillModalOpen(false)}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={handleApplyBillFields}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <CheckCircle2 size={15} />
                  <span>Accept & Apply to Digital Form</span>
                </button>
              </div>
            </div>
      </Modal>
      )}
    </div>
  );
}

