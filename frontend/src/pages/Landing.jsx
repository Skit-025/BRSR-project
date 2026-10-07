import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck, Leaf, Building2, Zap, Droplets,
  Layers, Award, ArrowRight, Lock, CheckCircle2,
  FileCheck, Users, BarChart3, ChevronRight, Sparkles,
  Shield, Check, ExternalLink, HardHat, FileSpreadsheet,
  Cpu, GitMerge, ArrowUpRight, AlertTriangle, Scale,
  Eye, FileText, Search, Database, Terminal, Flame,
  CheckCircle, RefreshCw, Compass, ArrowDownRight,
  TrendingDown, FileCode, CheckSquare, CornerDownRight,
  Calculator, Activity
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Landing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Tab states
  const [activeMainPillar, setActiveMainPillar] = useState('what'); // 'what' | 'why' | 'how'
  const [activeProblemTab, setActiveProblemTab] = useState('spreadsheets');
  const [activeAuditStep, setActiveAuditStep] = useState(1);
  
  // Interactive Calculator State (CEA v19 Emission Factor = 0.716 kgCO2e/kWh)
  const [calcKwh, setCalcKwh] = useState(125000);
  const calcScope2Tonnes = ((calcKwh * 0.716) / 1000).toFixed(2);
  const calcEnergyGJ = (calcKwh * 0.0036).toFixed(2);
  const calcTreesNeeded = Math.round(calcScope2Tonnes * 45).toLocaleString();

  // 9 SEBI BRSR Core Mandatory KPIs
  const brsrCoreMetrics = [
    { code: 'P6-E1', name: 'GHG Scope 1 Emissions', value: '1,281.8 tCO₂e', unit: 'Metric Tonnes CO₂e', rule: 'IPCC NCV × Statutory EF', icon: Flame, color: '#D97706' },
    { code: 'P6-E2', name: 'GHG Scope 2 (Grid)', value: '648.5 tCO₂e', unit: 'Metric Tonnes CO₂e', rule: 'CEA v19 (0.716 kgCO₂e/kWh)', icon: Zap, color: '#0284C7' },
    { code: 'P6-E3', name: 'Total Energy Consumed', value: '348,250 GJ', unit: 'Gigajoules (GJ)', rule: 'Grid + Diesel + Solar', icon: Zap, color: '#059669' },
    { code: 'P6-E4', name: 'Water Withdrawal & Use', value: '42,800 kL', unit: 'Kilolitres (kL)', rule: 'Municipal + Ground + Tanker', icon: Droplets, color: '#0891B2' },
    { code: 'P3-E1', name: 'Permanent Workforce', value: '14,250', unit: 'Employees & Workers', rule: 'Gender parity & statutory wage', icon: Users, color: '#7C3AED' },
    { code: 'P3-E2', name: 'Lost Time Injury Rate', value: '0.12 LTIFR', unit: 'Per Million Man-Hours', rule: 'Zero Fatalities Monitored', icon: HardHat, color: '#DB2777' },
  ];

  const problemComparisons = {
    spreadsheets: {
      badge: 'THE SPREADSHEET TRAP',
      title: 'Fragmented Excel Sheets Break Under Regulatory Assurance',
      subtitle: '84% of Indian enterprises aggregate ESG metrics using emailed spreadsheets. When auditors arrive, the data collapses.',
      traditional: [
        'Unversioned spreadsheets emailed across 14 subsidiaries and dozens of remote sites',
        'Broken VLOOKUPs and manual copy-pasting overwrite operational metrics',
        'Equity boundary adjustments for Joint Ventures (35%-49%) calculated by hand',
        'No record of who modified a number, when, or why — zero audit defensibility'
      ],
      aarohan: [
        'PostgreSQL ltree materialized paths strictly encode the 7-tier corporate structure',
        'Deterministic calculation engines enforce CEA v19 and IPCC formulas automatically',
        'Automated Equity Share % and Operational Control boundary consolidation',
        'Every keystroke and state transition immutably logged with user, IP, and timestamp'
      ]
    },
    evidence: {
      badge: 'THE AUDIT VOID',
      title: 'Unverified Data Points Cannot Survive Reasonable Assurance',
      subtitle: 'SEBI Circular SEBI/HO/CFD/CMD-2/P/CIR/2023/00122 mandates external assurance for Top 150 listed entities. Unsubstantiated numbers trigger regulatory penalties.',
      traditional: [
        'Electricity and diesel receipts stored in scattered physical binders at plant sites',
        'Auditors take weeks to verify a single reported metric against source paper',
        'Invoices can be replaced, lost, or doctored after reporting deadlines',
        'No cryptographic tie between the number reported in the annual report and the invoice'
      ],
      aarohan: [
        'Every utility bill, meter log, and diesel slip is cryptographically hashed with SHA-256',
        'AI Engine E1 automatically OCR-extracts quantities and auto-converts to statutory Gigajoules',
        '3-click audit drilldown: auditors click any metric in the report to inspect the raw document',
        'Non-repudiation vault: files cannot be altered without breaking the cryptographic seal'
      ]
    },
    governance: {
      badge: 'GOVERNANCE COLLAPSE',
      title: 'Lack of Segregation of Duties (SoD) Invalidates Internal Controls',
      subtitle: 'Without strict Maker-Checker controls, operational site engineers approve their own entries, creating severe conflict of interest.',
      traditional: [
        'Site supervisors enter raw fuel logs and submit directly to corporate sustainability',
        'No four-eyes verification before numbers enter company-wide consolidation',
        'Generic AI tools hallucinate emission factors or qualitative disclosures',
        'Corporate directors sign off on unverified roll-ups with personal statutory liability'
      ],
      aarohan: [
        'Strict Four-Eyes Segregation of Duties: site engineers (Makers) cannot approve submissions',
        'BU Reviewers (Checkers) inspect variance anomalies before forwarding to subsidiaries',
        'AI Engine E5 with Number-Lock guardrail: AST parser blocks any hallucinated numbers',
        'Multi-stage sign-offs by Subsidiary Admins and Group ESG Directors prior to board compile'
      ]
    }
  };

  const auditSteps = [
    {
      step: 1,
      title: 'Board Disclosure',
      subtitle: 'Group BRSR Report',
      detail: 'SEBI BRSR Core Section C Principle 6 discloses 187.40 tCO₂e for Scope 1 Stationary Combustion.',
      code: 'REPORT_ROW_P6_E1 = 187.40 tCO2e (Consolidated Group Level)',
      tag: 'Statutory Board Summary'
    },
    {
      step: 2,
      title: 'Consolidation Tree',
      subtitle: 'Hierarchical Lineage',
      detail: 'Drilldown traces 187.40 tCO₂e to Aarohan Renewable Energy → Solar EPC BU → 250 MW Odisha Solar Park.',
      code: 'PATH: AAROHAN-GROUP.AAROHAN-RENEW.AAROHAN-BU-SOLAR.AAROHAN-SOLAR-01',
      tag: '4-Tier Materialized Lineage'
    },
    {
      step: 3,
      title: 'Cryptographic Voucher',
      subtitle: 'Verified Source Document',
      detail: 'Inspect the raw IOCL Bulk Fuel Challan #IOCL-2024-0518 with SHA-256 hash match and OCR validation badge.',
      code: 'SHA-256: 774ea8cf9d12... MATCHED (Immutable Non-Repudiation)',
      tag: 'SHA-256 Evidence Ledger'
    }
  ];

  const aiEngines = [
    { code: 'E1', name: 'OCR Ingestion Engine', desc: 'Auto-extracts kWh, litres, and bill dates from utility invoices with conversion to statutory Gigajoules.', badge: 'Extraction' },
    { code: 'E2', name: 'Regulatory Anomaly Engine', desc: 'Detects spikes exceeding historical baseline variance (±5%) before BU review sign-off.', badge: 'Quality Gate' },
    { code: 'E3', name: 'Emissions Auto-Calculator', desc: 'Deterministic CEA v19 (0.716 kgCO₂e/kWh) and IPCC 2006 stationary combustion factor runner.', badge: 'Statutory Engine' },
    { code: 'E4', name: 'Double-Materiality Evaluator', desc: 'Scores financial impact and stakeholder ESG materiality per GRI and SEBI NGRBC standards.', badge: 'Materiality' },
    { code: 'E5', name: 'Statutory Narrative Copilot', desc: 'Drafts Section B & C BRSR management commentary with AST Number-Lock: zero hallucinated figures.', badge: 'Guardrailed NLP' },
    { code: 'E6', name: 'XBRL Taxonomy Engine', desc: 'Maps Group data points to Ministry of Corporate Affairs / SEBI XBRL taxonomies for filing.', badge: 'Filing Standard' },
    { code: 'E7', name: 'Reasonable Assurance Lineage', desc: 'Produces auditor workpapers proving complete trail from board table back to site evidence.', badge: 'Big 4 Audit' }
  ];

  return (
    <div style={{
      minHeight: '100%',
      background: '#F8FAFC',
      color: '#0F172A',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      position: 'relative',
      overflowX: 'hidden'
    }}>
      
      {/* Soft Ambient Light Gradient & Grid */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '750px',
        background: 'radial-gradient(ellipse 65% 55% at 50% -15%, rgba(37, 99, 235, 0.08), rgba(16, 185, 129, 0.05) 40%, transparent 80%)',
        pointerEvents: 'none',
        zIndex: 0
      }} />

      {/* Grid overlay */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '800px',
        backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.035) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.035) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
        pointerEvents: 'none',
        maskImage: 'radial-gradient(ellipse 60% 60% at 50% 20%, #000 60%, transparent 100%)',
        WebkitMaskImage: 'radial-gradient(ellipse 60% 60% at 50% 20%, #000 60%, transparent 100%)',
        zIndex: 0
      }} />

      {/* ── Top Regulatory Ribbon ────────────────────────────────────────── */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        background: '#FFFFFF',
        borderBottom: '1px solid #E2E8F0',
        color: '#475569',
        fontSize: 12,
        padding: '9px 24px',
        textAlign: 'center',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
      }}>
        <span className="status-beacon-live" />
        <span style={{ color: '#059669', fontWeight: 700, fontSize: 11, letterSpacing: '0.04em' }}>
          SEBI MANDATE · CIRCULAR SEBI/HO/CFD/CMD-2/P/CIR/2023/00122
        </span>
        <span style={{ color: '#CBD5E1' }}>|</span>
        <span style={{ color: '#334155', fontWeight: 500 }}>
          Statutory Reasonable External Assurance Architecture for Top Listed Enterprises
        </span>
      </div>

      {/* ── Sticky Navigation Header ────────────────────────────────────── */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid #E2E8F0',
        height: 64
      }}>
        <div style={{
          maxWidth: 1240,
          margin: '0 auto',
          height: '100%',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => navigate('/')}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'linear-gradient(135deg, #2563EB, #10B981)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)'
            }}>
              <Leaf size={18} color="#FFFFFF" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.3px', color: '#09090B' }}>AAROHAN</span>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: '#2563EB', background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '1px 6px', borderRadius: 4 }}>
                  ESG OS
                </span>
              </div>
              <div style={{ fontSize: 10, color: '#64748B', marginTop: -1 }}>Enterprise BRSR Assurance Platform</div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: 28, fontSize: 13, fontWeight: 600, color: '#475569' }}>
            <a href="#what-why-how" style={{ transition: 'color 0.15s' }}>Architecture (What / Why / How)</a>
            <a href="#calculator" style={{ transition: 'color 0.15s' }}>Statutory Calculator</a>
            <a href="#metrics" style={{ transition: 'color 0.15s' }}>BRSR Core KPIs</a>
            <a href="#assurance" style={{ transition: 'color 0.15s' }}>3-Click Audit</a>
            <a href="#ai-engines" style={{ transition: 'color 0.15s' }}>7 AI Engines</a>
          </nav>

          {/* Action Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {user ? (
              <button
                className="btn btn-primary"
                onClick={() => navigate(user.role === 'system_admin' ? '/admin/users' : '/dashboard')}
                style={{
                  height: 38,
                  fontSize: 13,
                  padding: '0 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: '#0070F3',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 6,
                  boxShadow: '0 1px 3px rgba(0, 112, 243, 0.3)'
                }}
              >
                <span>Launch Workspace</span>
                <ArrowRight size={14} />
              </button>
            ) : (
              <button
                className="btn btn-primary"
                onClick={() => navigate('/login')}
                style={{
                  height: 38,
                  fontSize: 13,
                  padding: '0 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: '#0070F3',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 6,
                  boxShadow: '0 1px 3px rgba(0, 112, 243, 0.3)'
                }}
              >
                <Lock size={13} />
                <span>Sign In to Platform</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Hero Section ────────────────────────────────────────────────── */}
      <section style={{
        position: 'relative',
        zIndex: 1,
        padding: '70px 24px 60px',
        maxWidth: 1240,
        margin: '0 auto',
        textAlign: 'center'
      }}>
        
        {/* Shimmer Badge */}
        <div className="anim-fade-up" style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 16px',
          borderRadius: 9999,
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
          fontSize: 12,
          fontWeight: 600,
          color: '#334155',
          marginBottom: 24
        }}>
          <Sparkles size={14} color="#2563EB" />
          <span>Statutory ESG Operating System for Indian Conglomerates</span>
          <span style={{ color: '#CBD5E1' }}>·</span>
          <span style={{ color: '#059669', fontWeight: 700 }}>SEBI BRSR Core Compliant</span>
        </div>

        {/* Hero Title */}
        <h1 className="anim-fade-up delay-1" style={{
          fontSize: 'clamp(38px, 5.4vw, 68px)',
          fontWeight: 800,
          letterSpacing: '-2px',
          lineHeight: 1.08,
          color: '#09090B',
          margin: '0 auto 20px',
          maxWidth: 1040
        }}>
          The Operating System for <br />
          <span style={{
            background: 'linear-gradient(135deg, #2563EB 0%, #059669 50%, #7C3AED 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            display: 'inline-block'
          }}>
            SEBI BRSR Core &amp; Statutory Reasonable Assurance.
          </span>
        </h1>

        {/* Hero Subtitle */}
        <p className="anim-fade-up delay-2" style={{
          fontSize: 17,
          color: '#475569',
          maxWidth: 860,
          margin: '0 auto 36px',
          lineHeight: 1.6
        }}>
          Indian infrastructure and renewable energy enterprises face mandatory reasonable assurance for ESG disclosures. Aarohan captures raw meter vouchers at project sites, enforces Four-Eyes maker-checker governance, applies deterministic CEA &amp; IPCC statutory formulas, and delivers a <strong>tamper-proof, 3-click audit trail</strong> directly to Big 4 statutory auditors.
        </p>

        {/* Action Buttons */}
        <div className="anim-fade-up delay-3" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 56, flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate('/login')}
            className="hover-glow"
            style={{
              height: 48,
              padding: '0 26px',
              fontSize: 14,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: '#0070F3',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(0, 112, 243, 0.3)'
            }}
          >
            <span>Enter Enterprise Portal</span>
            <ArrowRight size={16} />
          </button>
          
          <a
            href="#what-why-how"
            style={{
              height: 48,
              padding: '0 22px',
              fontSize: 14,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: '#FFFFFF',
              color: '#0F172A',
              border: '1px solid #E2E8F0',
              borderRadius: 8,
              cursor: 'pointer',
              textDecoration: 'none',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              transition: 'border-color 0.15s, background 0.15s'
            }}
          >
            <Compass size={16} color="#2563EB" />
            <span>Explore Architecture (What / Why / How)</span>
          </a>
        </div>

        {/* ── Hero Metric Counters (4 Clean Light Cards) ────────────────────── */}
        <div className="anim-fade-up delay-4" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 16,
          textAlign: 'left',
          marginBottom: 40
        }}>
          <div style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 12,
            padding: '22px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }} className="hover-glow">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Statutory Depth</span>
              <Building2 size={16} color="#2563EB" />
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, color: '#09090B', letterSpacing: '-0.5px', fontFamily: 'JetBrains Mono, monospace' }}>7 Tiers</div>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
              PostgreSQL <code style={{ fontFamily: 'monospace', color: '#2563EB' }}>ltree</code> boundary logic from Holding Group to remote site meters.
            </div>
          </div>

          <div style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 12,
            padding: '22px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }} className="hover-glow-emerald">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Cryptographic Integrity</span>
              <ShieldCheck size={16} color="#059669" />
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, color: '#09090B', letterSpacing: '-0.5px', fontFamily: 'JetBrains Mono, monospace' }}>100% SHA-256</div>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
              Every utility bill, weighbridge receipt, and diesel voucher has immutable non-repudiation.
            </div>
          </div>

          <div style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 12,
            padding: '22px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }} className="hover-glow">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>National Grid Precision</span>
              <Cpu size={16} color="#D97706" />
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, color: '#09090B', letterSpacing: '-0.5px', fontFamily: 'JetBrains Mono, monospace' }}>0.716 kgCO₂e</div>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
              CEA v19 baseline statutory grid factor applied deterministically without LLM math.
            </div>
          </div>

          <div style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 12,
            padding: '22px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }} className="hover-glow">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>AI Hallucination Guard</span>
              <Lock size={16} color="#7C3AED" />
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, color: '#09090B', letterSpacing: '-0.5px', fontFamily: 'JetBrains Mono, monospace' }}>0 Hallucinations</div>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
              Mathematical AST Number-Lock parser guarantees zero unverified values enter disclosures.
            </div>
          </div>
        </div>

      </section>

      {/* ── THE WHAT / WHY / HOW ARCHITECTURE SECTION ────────────────────── */}
      <section id="what-why-how" style={{
        position: 'relative',
        zIndex: 1,
        padding: '70px 24px',
        maxWidth: 1240,
        margin: '0 auto',
        borderTop: '1px solid #E2E8F0'
      }}>
        
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: '#EFF6FF',
            color: '#1D4ED8',
            fontSize: 11,
            fontWeight: 800,
            padding: '3px 12px',
            borderRadius: 9999,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: 12,
            border: '1px solid #DBEAFE'
          }}>
            <Terminal size={12} />
            Platform Architecture
          </div>
          <h2 style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-1px', color: '#09090B', margin: '0 0 12px' }}>
            What We Do · Why We Do It · How We Do It
          </h2>
          <p style={{ fontSize: 15.5, color: '#475569', maxWidth: 740, margin: '0 auto', lineHeight: 1.6 }}>
            Understand the fundamental regulatory necessity, multi-tiered enterprise architecture, and deterministic audit mechanics of Aarohan.
          </p>

          {/* Interactive What / Why / How Selector */}
          <div style={{
            display: 'inline-flex',
            gap: 6,
            padding: 5,
            background: '#F1F5F9',
            border: '1px solid #E2E8F0',
            borderRadius: 10,
            marginTop: 24
          }}>
            <button
              onClick={() => setActiveMainPillar('what')}
              style={{
                padding: '9px 20px',
                borderRadius: 7,
                fontSize: 13,
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: activeMainPillar === 'what' ? '#0070F3' : 'transparent',
                color: activeMainPillar === 'what' ? '#FFFFFF' : '#64748B',
                boxShadow: activeMainPillar === 'what' ? '0 2px 6px rgba(0, 112, 243, 0.25)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              1. WHAT We Are Doing
            </button>
            <button
              onClick={() => setActiveMainPillar('why')}
              style={{
                padding: '9px 20px',
                borderRadius: 7,
                fontSize: 13,
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: activeMainPillar === 'why' ? '#0070F3' : 'transparent',
                color: activeMainPillar === 'why' ? '#FFFFFF' : '#64748B',
                boxShadow: activeMainPillar === 'why' ? '0 2px 6px rgba(0, 112, 243, 0.25)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              2. WHY We Are Doing It
            </button>
            <button
              onClick={() => setActiveMainPillar('how')}
              style={{
                padding: '9px 20px',
                borderRadius: 7,
                fontSize: 13,
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: activeMainPillar === 'how' ? '#0070F3' : 'transparent',
                color: activeMainPillar === 'how' ? '#FFFFFF' : '#64748B',
                boxShadow: activeMainPillar === 'how' ? '0 2px 6px rgba(0, 112, 243, 0.25)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              3. HOW We Are Doing It
            </button>
          </div>
        </div>

        {/* Dynamic Display Panel for What / Why / How */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: 16,
          padding: '36px 40px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.04), 0 2px 4px -2px rgba(0,0,0,0.02)'
        }} className="anim-fade">
          {activeMainPillar === 'what' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 32, alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  CORE MISSION &amp; DEFINITION
                </span>
                <h3 style={{ fontSize: 24, fontWeight: 800, color: '#09090B', margin: '8px 0 12px' }}>
                  An Enterprise ESG Operating System Engineered for Heavy Conglomerates
                </h3>
                <p style={{ fontSize: 14.5, color: '#475569', lineHeight: 1.6, marginBottom: 16 }}>
                  Aarohan is a specialized, end-to-end statutory ESG data platform. It bridges the deep operational gap between raw physical assets (solar parks, highway packages, pump stations) and the statutory boardroom SEBI BRSR Core disclosures.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, color: '#334155' }}>
                    <CheckCircle2 size={16} color="#059669" />
                    <span><strong>Captures Raw Operational Realities:</strong> Diesel receipts, meter logs, water bills, workforce timesheets.</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, color: '#334155' }}>
                    <CheckCircle2 size={16} color="#059669" />
                    <span><strong>Consolidates Multi-Tier Entities:</strong> Wholly-owned subsidiaries, JVs (35%-49%), and operational divisions.</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, color: '#334155' }}>
                    <CheckCircle2 size={16} color="#059669" />
                    <span><strong>Guarantees Audit Proof:</strong> Eliminates human math errors and Big 4 auditor rejections.</span>
                  </div>
                </div>
              </div>
              <div style={{ background: '#F8FAFC', borderRadius: 12, padding: '24px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 12 }}>Scope of Delivery</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ padding: '12px 14px', background: '#EFF6FF', borderRadius: 8, border: '1px solid #BFDBFE' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1D4ED8' }}>9 Mandatory SEBI BRSR Core KPIs</div>
                    <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>Assurance-ready KPIs including Scope 1, Scope 2, Water, Energy Intensity &amp; LTIFR.</div>
                  </div>
                  <div style={{ padding: '12px 14px', background: '#ECFDF5', borderRadius: 8, border: '1px solid #A7F3D0' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#065F46' }}>40 Regulatory Dimensions</div>
                    <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>Comprehensive mapping covering all 9 Principles of NGRBC statutory format.</div>
                  </div>
                  <div style={{ padding: '12px 14px', background: '#FAF5FF', borderRadius: 8, border: '1px solid #E9D5FF' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#6B21A8' }}>XBRL &amp; PDF Statutory Export</div>
                    <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>One-click compilation of board-signed BRSR annexures ready for BSE/NSE filing.</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeMainPillar === 'why' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 32, alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#DC2626', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  THE STATUTORY IMPERATIVE
                </span>
                <h3 style={{ fontSize: 24, fontWeight: 800, color: '#09090B', margin: '8px 0 12px' }}>
                  SEBI Mandate Circular 2023/122 Makes Spreadsheets Illegal for Audit
                </h3>
                <p style={{ fontSize: 14.5, color: '#475569', lineHeight: 1.6, marginBottom: 16 }}>
                  Under SEBI regulations, Indian top listed companies must achieve <strong>Reasonable External Assurance</strong>. Unlike generic voluntary ESG reporting, reasonable assurance carries the same statutory legal weight as a financial audit.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, color: '#334155' }}>
                    <AlertTriangle size={16} color="#DC2626" />
                    <span><strong>Auditors Reject Spreadsheets:</strong> Excel has no tamper-proofing, no user delegation rules, and no cryptographic hash.</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, color: '#334155' }}>
                    <AlertTriangle size={16} color="#DC2626" />
                    <span><strong>Complex Holding Boundaries:</strong> Multi-layered joint ventures cannot be resolved accurately in ad-hoc email chains.</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, color: '#334155' }}>
                    <AlertTriangle size={16} color="#DC2626" />
                    <span><strong>Personal Board Liability:</strong> ESG Directors and CFOs face regulatory penalties for unsubstantiated claims.</span>
                  </div>
                </div>
              </div>
              <div style={{ background: '#FEF2F2', borderRadius: 12, padding: '24px', border: '1px solid #FECACA' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#B91C1C', marginBottom: 12 }}>The High Stakes of Non-Compliance</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ padding: '12px 14px', background: '#FFFFFF', borderRadius: 8, border: '1px solid #FCA5A5' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#991B1B' }}>Auditor Qualification</div>
                    <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>Statutory auditors qualify the annual report if reported energy or GHG data lacks invoice vouchers.</div>
                  </div>
                  <div style={{ padding: '12px 14px', background: '#FFFFFF', borderRadius: 8, border: '1px solid #FCA5A5' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#991B1B' }}>SEBI Enforcement Actions</div>
                    <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>Notice and penalties under LODR regulations for misrepresentation of ESG disclosures.</div>
                  </div>
                  <div style={{ padding: '12px 14px', background: '#FFFFFF', borderRadius: 8, border: '1px solid #FCA5A5' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#991B1B' }}>Global Capital Downgrade</div>
                    <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>Institutional investors exclude non-compliant listed firms from ESG funds and credit facilities.</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeMainPillar === 'how' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 32, alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  THE 5-PILLAR ARCHITECTURE
                </span>
                <h3 style={{ fontSize: 24, fontWeight: 800, color: '#09090B', margin: '8px 0 12px' }}>
                  Deterministic Math, Cryptographic Proof, and 4-Eyes Governance
                </h3>
                <p style={{ fontSize: 14.5, color: '#475569', lineHeight: 1.6, marginBottom: 16 }}>
                  Aarohan does not use generic black-box AI to calculate statutory emissions. It pairs rigid deterministic national engineering factors with specialized, guardrailed AI assistants.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, color: '#334155' }}>
                    <CheckCircle2 size={16} color="#059669" />
                    <span><strong>Pillar 1:</strong> PostgreSQL <code style={{ fontFamily: 'monospace', color: '#2563EB' }}>ltree</code> hierarchy for 7-tier legal boundary aggregation.</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, color: '#334155' }}>
                    <CheckCircle2 size={16} color="#059669" />
                    <span><strong>Pillar 2:</strong> SHA-256 evidence hashing directly upon upload at remote site edge.</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, color: '#334155' }}>
                    <CheckCircle2 size={16} color="#059669" />
                    <span><strong>Pillar 3:</strong> Four-Eyes Maker-Checker Segregation of Duties enforcing review gates.</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, color: '#334155' }}>
                    <CheckCircle2 size={16} color="#059669" />
                    <span><strong>Pillar 4:</strong> CEA v19 statutory grid factor (0.716 kgCO₂e/kWh) calculation engine.</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, color: '#334155' }}>
                    <CheckCircle2 size={16} color="#059669" />
                    <span><strong>Pillar 5:</strong> 3-Click line-item drilldown from board report to DISCOM electricity invoice.</span>
                  </div>
                </div>
              </div>
              <div style={{ background: '#F0FDF4', borderRadius: 12, padding: '24px', border: '1px solid #BBF7D0' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#065F46', marginBottom: 12 }}>Statutory Calculation Flow</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontFamily: 'monospace', fontSize: 12, color: '#334155' }}>
                  <div style={{ padding: '9px 12px', background: '#FFFFFF', borderRadius: 6, borderLeft: '3px solid #2563EB', border: '1px solid #E2E8F0', borderLeftWidth: 3 }}>
                    1. Site Vouchers [kWh, Litres] + SHA-256
                  </div>
                  <div style={{ textAlign: 'center', color: '#94A3B8', fontSize: 11 }}>↓ (Maker-Checker Review)</div>
                  <div style={{ padding: '9px 12px', background: '#FFFFFF', borderRadius: 6, borderLeft: '3px solid #D97706', border: '1px solid #E2E8F0', borderLeftWidth: 3 }}>
                    2. BU Approval Gate (SoD Enforced)
                  </div>
                  <div style={{ textAlign: 'center', color: '#94A3B8', fontSize: 11 }}>↓ (Deterministic Math)</div>
                  <div style={{ padding: '9px 12px', background: '#FFFFFF', borderRadius: 6, borderLeft: '3px solid #059669', border: '1px solid #E2E8F0', borderLeftWidth: 3 }}>
                    3. CEA (0.716) × kWh = Scope 2 (tCO₂e)
                  </div>
                  <div style={{ textAlign: 'center', color: '#94A3B8', fontSize: 11 }}>↓ (Consolidation Engine)</div>
                  <div style={{ padding: '9px 12px', background: '#FFFFFF', borderRadius: 6, borderLeft: '3px solid #7C3AED', border: '1px solid #E2E8F0', borderLeftWidth: 3 }}>
                    4. Group Board Disclosure Sealed
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

      </section>

      {/* ── INTERACTIVE STATUTORY EMISSION CALCULATOR ───────────────────── */}
      <section id="calculator" style={{
        position: 'relative',
        zIndex: 1,
        padding: '70px 24px',
        maxWidth: 1240,
        margin: '0 auto',
        borderTop: '1px solid #E2E8F0'
      }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: '#ECFDF5',
            color: '#065F46',
            fontSize: 11,
            fontWeight: 800,
            padding: '3px 12px',
            borderRadius: 9999,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: 10,
            border: '1px solid #A7F3D0'
          }}>
            <Calculator size={12} />
            Live Statutory Engine
          </div>
          <h2 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.8px', color: '#09090B', margin: '0 0 10px' }}>
            Interactive Statutory Emission Converter
          </h2>
          <p style={{ fontSize: 14.5, color: '#475569', maxWidth: 640, margin: '0 auto' }}>
            Experience the deterministic CEA v19 grid emission engine live. Adjust the project electricity consumption to view statutory Scope 2 tCO₂e and Gigajoule outputs.
          </p>
        </div>

        <div style={{
          background: '#FFFFFF',
          borderRadius: 16,
          padding: '36px',
          maxWidth: 960,
          margin: '0 auto',
          border: '1px solid #E2E8F0',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.04), 0 2px 4px -2px rgba(0,0,0,0.02)'
        }}>
          {/* Slider & Input */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
                Operational Grid Electricity Consumption:
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="number"
                  value={calcKwh}
                  onChange={(e) => setCalcKwh(Math.max(0, Number(e.target.value)))}
                  style={{
                    background: '#F8FAFC',
                    border: '1px solid #CBD5E1',
                    borderRadius: 6,
                    padding: '6px 12px',
                    color: '#09090B',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 15,
                    fontWeight: 700,
                    width: 140,
                    textAlign: 'right'
                  }}
                />
                <span style={{ fontSize: 13, color: '#64748B', fontWeight: 600 }}>kWh</span>
              </div>
            </div>

            <input
              type="range"
              min="1000"
              max="1000000"
              step="5000"
              value={calcKwh}
              onChange={(e) => setCalcKwh(Number(e.target.value))}
              style={{
                width: '100%',
                height: 6,
                borderRadius: 99,
                appearance: 'none',
                background: 'linear-gradient(to right, #2563EB, #10B981)',
                outline: 'none',
                cursor: 'pointer'
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748B', marginTop: 6, fontFamily: 'monospace' }}>
              <span>1,000 kWh (Site Office)</span>
              <span>250,000 kWh (Solar Substation)</span>
              <span>1,000,000 kWh (Plant Operations)</span>
            </div>
          </div>

          {/* Real-time Calculation Outputs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            <div style={{ padding: '20px', background: '#EFF6FF', borderRadius: 12, border: '1px solid #BFDBFE' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#1D4ED8', textTransform: 'uppercase' }}>Scope 2 GHG Emissions</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#09090B', fontFamily: 'JetBrains Mono, monospace', margin: '6px 0' }}>
                {calcScope2Tonnes} <span style={{ fontSize: 14, fontWeight: 500, color: '#64748B' }}>tCO₂e</span>
              </div>
              <div style={{ fontSize: 11, color: '#2563EB' }}>
                Formula: {calcKwh.toLocaleString()} × 0.716 ÷ 1000
              </div>
            </div>

            <div style={{ padding: '20px', background: '#ECFDF5', borderRadius: 12, border: '1px solid #A7F3D0' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#065F46', textTransform: 'uppercase' }}>Statutory Energy Intensity</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#09090B', fontFamily: 'JetBrains Mono, monospace', margin: '6px 0' }}>
                {calcEnergyGJ} <span style={{ fontSize: 14, fontWeight: 500, color: '#64748B' }}>GJ</span>
              </div>
              <div style={{ fontSize: 11, color: '#059669' }}>
                Standard Factor: 0.0036 GJ per kWh
              </div>
            </div>

            <div style={{ padding: '20px', background: '#FAF5FF', borderRadius: 12, border: '1px solid #E9D5FF' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#6B21A8', textTransform: 'uppercase' }}>Equiv. Offset Trees Required</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#09090B', fontFamily: 'JetBrains Mono, monospace', margin: '6px 0' }}>
                {calcTreesNeeded} <span style={{ fontSize: 14, fontWeight: 500, color: '#64748B' }}>trees</span>
              </div>
              <div style={{ fontSize: 11, color: '#7C3AED' }}>
                Based on Indian broadleaf sequestration
              </div>
            </div>
          </div>

          <div style={{ marginTop: 20, padding: '12px 16px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 12, color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Regulatory Benchmark: <strong>CEA Baseline Database for Indian Power Sector (User Guide v19, Oct 2024)</strong></span>
            <span style={{ color: '#059669', fontWeight: 700 }}>✓ Verified CEA Factor</span>
          </div>
        </div>
      </section>

      {/* ── THE PROBLEM WE ARE SOLVING SECTION ──────────────────────────── */}
      <section id="problem" style={{
        position: 'relative',
        zIndex: 1,
        padding: '70px 24px',
        maxWidth: 1240,
        margin: '0 auto',
        borderTop: '1px solid #E2E8F0'
      }}>
        
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: '#FEF2F2',
            color: '#B91C1C',
            fontSize: 11,
            fontWeight: 800,
            padding: '3px 12px',
            borderRadius: 9999,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: 10,
            border: '1px solid #FECACA'
          }}>
            <AlertTriangle size={12} />
            The Regulatory Crisis
          </div>
          <h2 style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-0.8px', color: '#09090B', margin: '0 0 12px' }}>
            Why Legacy Enterprise Software Fails SEBI BRSR Assurance
          </h2>
          <p style={{ fontSize: 15, color: '#475569', maxWidth: 740, margin: '0 auto', lineHeight: 1.6 }}>
            Traditional carbon accounting apps were built for tech offices in California. Indian infrastructure conglomerates operate mines, solar parks, highways, and high-voltage transmission lines where field realities break standard ESG tools.
          </p>

          {/* Interactive Problem Tabs */}
          <div style={{
            display: 'inline-flex',
            gap: 6,
            padding: 4,
            background: '#F1F5F9',
            border: '1px solid #E2E8F0',
            borderRadius: 10,
            marginTop: 22
          }}>
            <button
              onClick={() => setActiveProblemTab('spreadsheets')}
              style={{
                padding: '8px 18px',
                borderRadius: 7,
                fontSize: 12.5,
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: activeProblemTab === 'spreadsheets' ? '#0070F3' : 'transparent',
                color: activeProblemTab === 'spreadsheets' ? '#FFFFFF' : '#64748B',
                boxShadow: activeProblemTab === 'spreadsheets' ? '0 2px 6px rgba(0, 112, 243, 0.25)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              1. The Spreadsheet Trap
            </button>
            <button
              onClick={() => setActiveProblemTab('evidence')}
              style={{
                padding: '8px 18px',
                borderRadius: 7,
                fontSize: 12.5,
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: activeProblemTab === 'evidence' ? '#0070F3' : 'transparent',
                color: activeProblemTab === 'evidence' ? '#FFFFFF' : '#64748B',
                boxShadow: activeProblemTab === 'evidence' ? '0 2px 6px rgba(0, 112, 243, 0.25)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              2. The Audit Void
            </button>
            <button
              onClick={() => setActiveProblemTab('governance')}
              style={{
                padding: '8px 18px',
                borderRadius: 7,
                fontSize: 12.5,
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: activeProblemTab === 'governance' ? '#0070F3' : 'transparent',
                color: activeProblemTab === 'governance' ? '#FFFFFF' : '#64748B',
                boxShadow: activeProblemTab === 'governance' ? '0 2px 6px rgba(0, 112, 243, 0.25)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              3. Governance &amp; SoD Breakdown
            </button>
          </div>
        </div>

        {/* Tab Detail Box: Side by Side Comparison */}
        {(() => {
          const tab = problemComparisons[activeProblemTab];
          return (
            <div style={{
              background: '#FFFFFF',
              borderRadius: 16,
              border: '1px solid #E2E8F0',
              overflow: 'hidden',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.04)'
            }}>
              {/* Header */}
              <div style={{ padding: '24px 30px', borderBottom: '1px solid #E2E8F0', background: '#F8FAFC' }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#DC2626', letterSpacing: '0.06em' }}>
                  {tab.badge}
                </span>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: '#09090B', margin: '4px 0 6px' }}>
                  {tab.title}
                </h3>
                <p style={{ fontSize: 13.5, color: '#475569', margin: 0 }}>
                  {tab.subtitle}
                </p>
              </div>

              {/* Comparison columns */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                {/* Left: What Companies Do Today */}
                <div style={{ padding: '28px 30px', borderRight: '1px solid #E2E8F0', background: '#FFF5F5' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
                    <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <AlertTriangle size={12} color="#DC2626" />
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 800, color: '#991B1B' }}>Traditional Way (Spreadsheet Hell)</span>
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {tab.traditional.map((item, idx) => (
                      <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, color: '#7F1D1D', lineHeight: 1.5 }}>
                        <span style={{ color: '#DC2626', fontWeight: 800, fontSize: 15, lineHeight: 1 }}>✕</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Right: The Aarohan Solution */}
                <div style={{ padding: '28px 30px', background: '#F0FDF4' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
                    <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CheckCircle2 size={13} color="#059669" />
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 800, color: '#166534' }}>Aarohan Statutory ESG Engine</span>
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {tab.aarohan.map((item, idx) => (
                      <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, color: '#14532D', lineHeight: 1.5, fontWeight: 500 }}>
                        <span style={{ color: '#059669', fontWeight: 800, fontSize: 15, lineHeight: 1 }}>✓</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          );
        })()}

      </section>

      {/* ── SEBI BRSR CORE 9 MANDATORY METRICS SHOWCASE ─────────────────── */}
      <section id="metrics" style={{
        position: 'relative',
        zIndex: 1,
        padding: '70px 24px',
        maxWidth: 1240,
        margin: '0 auto',
        borderTop: '1px solid #E2E8F0'
      }}>
        
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#2563EB', letterSpacing: '0.05em' }}>
              MANDATORY STATUTORY SCOPE
            </span>
            <h2 style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.7px', color: '#09090B', margin: '4px 0 6px' }}>
              SEBI BRSR Core: 9 Assurance-Ready Indicators
            </h2>
            <p style={{ fontSize: 14, color: '#475569', margin: 0 }}>
              Every metric calculated below is linked to an immutable SHA-256 evidence trail and statutory formula.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#065F46', background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '4px 10px', borderRadius: 6 }}>
              Reasonable Assurance Level
            </span>
          </div>
        </div>

        {/* Metrics Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 18 }}>
          {brsrCoreMetrics.map((m) => {
            const Icon = m.icon;
            return (
              <div key={m.code} style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: 12,
                padding: '22px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
              }} className="hover-glow">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#1D4ED8', background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '2px 8px', borderRadius: 4 }}>
                      {m.code}
                    </span>
                    <Icon size={16} color={m.color} />
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#09090B', marginBottom: 4 }}>
                    {m.name}
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#09090B', letterSpacing: '-0.5px', fontFamily: 'JetBrains Mono, monospace' }}>
                    {m.value}
                  </div>
                  <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 2 }}>
                    {m.unit}
                  </div>
                </div>

                <div style={{
                  marginTop: 18,
                  paddingTop: 12,
                  borderTop: '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: 11,
                  color: '#475569'
                }}>
                  <span>Methodology: <strong>{m.rule}</strong></span>
                  <span style={{ color: '#059669', fontWeight: 700 }}>✓ Verified</span>
                </div>
              </div>
            );
          })}
        </div>

      </section>

      {/* ── 3-CLICK AUDITOR DRILLDOWN SHOWCASE ─────────────────────────── */}
      <section id="assurance" style={{
        position: 'relative',
        zIndex: 1,
        padding: '70px 24px',
        maxWidth: 1240,
        margin: '0 auto',
        borderTop: '1px solid #E2E8F0'
      }}>
        
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: '#059669', letterSpacing: '0.05em' }}>
            STATUTORY ASSURANCE TRACEABILITY
          </span>
          <h2 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.8px', color: '#09090B', margin: '4px 0 10px' }}>
            Auditor-Ready in 3 Clicks
          </h2>
          <p style={{ fontSize: 14.5, color: '#475569', maxWidth: 680, margin: '0 auto' }}>
            When a statutory auditor challenges a reported carbon metric in the annual report, Aarohan resolves the entire lineage trail in under 10 seconds.
          </p>
        </div>

        {/* 3 Step Interactive Card */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: 16,
          border: '1px solid #E2E8F0',
          overflow: 'hidden',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.04)'
        }}>
          {/* Step Selector Ribbon */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            borderBottom: '1px solid #E2E8F0',
            background: '#F8FAFC'
          }}>
            {auditSteps.map((s) => (
              <div
                key={s.step}
                onClick={() => setActiveAuditStep(s.step)}
                style={{
                  padding: '16px 20px',
                  cursor: 'pointer',
                  borderBottom: activeAuditStep === s.step ? '3px solid #09090B' : '3px solid transparent',
                  background: activeAuditStep === s.step ? '#FFFFFF' : 'transparent',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ fontSize: 10.5, fontWeight: 800, color: activeAuditStep === s.step ? '#2563EB' : '#64748B', textTransform: 'uppercase' }}>
                  CLICK 0{s.step}
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#09090B', marginTop: 2 }}>
                  {s.title}
                </div>
              </div>
            ))}
          </div>

          {/* Active Step Visual Window */}
          {(() => {
            const current = auditSteps.find(s => s.step === activeAuditStep);
            return (
              <div style={{ padding: '36px 40px', display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#1D4ED8', background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '3px 8px', borderRadius: 4 }}>
                      {current.tag}
                    </span>
                    <h3 style={{ fontSize: 22, fontWeight: 800, color: '#09090B', margin: '8px 0 4px' }}>
                      {current.subtitle}
                    </h3>
                  </div>
                  <code style={{
                    padding: '6px 12px',
                    borderRadius: 6,
                    background: '#F1F5F9',
                    color: '#0F172A',
                    fontSize: 11.5,
                    fontFamily: 'JetBrains Mono, monospace',
                    border: '1px solid #CBD5E1'
                  }}>
                    {current.code}
                  </code>
                </div>

                <p style={{ fontSize: 15, color: '#475569', margin: 0, lineHeight: 1.6 }}>
                  {current.detail}
                </p>

                <div style={{
                  padding: '16px 20px',
                  borderRadius: 10,
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 12
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <ShieldCheck size={20} color="#059669" />
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: '#09090B' }}>
                        Cryptographically Sealed Lineage Hash
                      </div>
                      <div style={{ fontSize: 11, color: '#64748B', fontFamily: 'monospace' }}>
                        sha256-verified-tamperproof-node-774ea8cf
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => navigate('/reporting')}
                      className="btn btn-secondary"
                      style={{ fontSize: 12, height: 32, padding: '0 12px', background: '#FFFFFF', color: '#09090B', border: '1px solid #CBD5E1' }}
                    >
                      View in Report
                    </button>
                    <button
                      onClick={() => navigate('/evidence')}
                      className="btn btn-primary"
                      style={{ fontSize: 12, height: 32, padding: '0 12px', background: '#0070F3', color: '#FFFFFF', border: 'none', boxShadow: '0 1px 3px rgba(0, 112, 243, 0.3)' }}
                    >
                      Inspect Vault
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

      </section>

      {/* ── 7 SPECIALIZED AI ENGINES SHOWCASE ───────────────────────────── */}
      <section id="ai-engines" style={{
        position: 'relative',
        zIndex: 1,
        padding: '70px 24px',
        maxWidth: 1240,
        margin: '0 auto',
        borderTop: '1px solid #E2E8F0'
      }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: '#7C3AED', letterSpacing: '0.05em' }}>
            DETERMINISTIC INTELLIGENCE
          </span>
          <h2 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.8px', color: '#09090B', margin: '4px 0 10px' }}>
            7 Specialized AI Engines with Number-Lock
          </h2>
          <p style={{ fontSize: 14.5, color: '#475569', maxWidth: 680, margin: '0 auto' }}>
            Every AI engine in Aarohan operates under strict mathematical boundaries. Unlike general-purpose LLMs, our architecture rejects hallucinated numbers through AST verification.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {aiEngines.map((e) => (
            <div key={e.code} style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: 12,
              padding: '22px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }} className="hover-glow">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: '#2563EB', fontFamily: 'JetBrains Mono, monospace' }}>
                  Engine {e.code}
                </span>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: '#6B21A8', background: '#FAF5FF', border: '1px solid #E9D5FF', padding: '2px 8px', borderRadius: 4 }}>
                  {e.badge}
                </span>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#09090B', marginBottom: 6 }}>
                {e.name}
              </div>
              <p style={{ fontSize: 12.5, color: '#475569', lineHeight: 1.5, margin: 0 }}>
                {e.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FINAL CALL TO ACTION ────────────────────────────────────────── */}
      <section style={{
        position: 'relative',
        zIndex: 1,
        padding: '70px 24px 90px',
        maxWidth: 1000,
        margin: '0 auto',
        textAlign: 'center'
      }}>
        <div style={{
          borderRadius: 20,
          padding: '54px 36px',
          border: '1px solid #BFDBFE',
          background: 'linear-gradient(135deg, #EFF6FF 0%, #ECFDF5 100%)',
          boxShadow: '0 10px 30px -5px rgba(37, 99, 235, 0.08)'
        }}>
          <h2 style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-0.8px', margin: '0 0 14px', color: '#09090B' }}>
            Ready to Inspect the Working Platform?
          </h2>
          <p style={{ fontSize: 15.5, color: '#475569', maxWidth: 620, margin: '0 auto 30px', lineHeight: 1.6 }}>
            Explore the live Aarohan Infrastructure &amp; Energy Group dataset. Experience the complete 8-step pipeline from site evidence upload to statutory BRSR report generation.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate('/login')}
              className="hover-glow"
              style={{
                background: '#0070F3',
                color: '#FFFFFF',
                height: 48,
                padding: '0 28px',
                fontSize: 14.5,
                fontWeight: 700,
                border: 'none',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(0, 112, 243, 0.3)'
              }}
            >
              <span>Access Live Portal</span>
              <ArrowRight size={15} />
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              style={{
                background: '#FFFFFF',
                color: '#09090B',
                height: 48,
                padding: '0 24px',
                fontSize: 14.5,
                fontWeight: 600,
                border: '1px solid #CBD5E1',
                borderRadius: 8,
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
              }}
            >
              Explore Dashboard
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer style={{
        position: 'relative',
        zIndex: 1,
        borderTop: '1px solid #E2E8F0',
        padding: '36px 24px',
        background: '#FFFFFF'
      }}>
        <div style={{
          maxWidth: 1240,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 12,
          color: '#64748B',
          flexWrap: 'wrap',
          gap: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Leaf size={15} color="#059669" />
            <span style={{ fontWeight: 600, color: '#09090B' }}>Aarohan Infrastructure &amp; Energy Group</span>
            <span>— Central ESG &amp; BRSR Statutory Reporting Portal</span>
          </div>
          <div>
            SEBI/HO/CFD/CMD-2/P/CIR/2023/00122 &amp; National GHG Baseline Framework Compliant
          </div>
        </div>
      </footer>

    </div>
  );
}
