import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck, Leaf, Building2, Zap, Droplets,
  Bus, Layers, Award, ArrowRight, Lock, CheckCircle2,
  FileCheck, Users, BarChart3, ChevronRight, Sparkles,
  Shield, Check, ExternalLink, HardHat, FileSpreadsheet,
  Cpu, GitMerge, ArrowUpRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Landing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeStoryTab, setActiveStoryTab] = useState('pipeline');

  const governanceLevels = [
    { level: 'Tier 1', title: 'Group Executive', role: 'Group Admin / ESG Director', desc: 'Consolidated BRSR reporting, board assurance, and group ESG target tracking.', color: '#111111' },
    { level: 'Tier 2', title: 'Subsidiaries', role: 'Subsidiary Admin', desc: 'Olectra Greentech, Megha City Gas, Drilex — boundary consolidation and entity reporting.', color: '#0070F3' },
    { level: 'Tier 3', title: 'Business Units', role: 'BU Reviewer / Checker', desc: 'Four-eyes verification of operational site logs, anomaly detection, and approval workflow.', color: '#00A63E' },
    { level: 'Tier 4', title: 'Projects & Sites', role: 'Site Engineer / Maker', desc: 'Direct entry of raw fuel, electricity, water, and safety logs backed by SHA-256 evidence.', color: '#B45309' },
  ];

  const features = [
    {
      icon: Cpu,
      title: 'Statutory Formula Engine',
      desc: 'Central Electricity Authority (CEA v19) grid emission factors (0.716 kgCO₂e/kWh) and DEFRA fuel combustion formulas applied deterministically.'
    },
    {
      icon: ShieldCheck,
      title: 'SHA-256 Evidence Vault',
      desc: 'Every electricity bill, weighbridge receipt, and fuel invoice is cryptographically hashed with non-repudiation verification for statutory audit.'
    },
    {
      icon: GitMerge,
      title: 'Hierarchical Delegation',
      desc: 'Administrators can only create users at their level or exactly one tier below, strictly preserving corporate governance boundaries.'
    },
    {
      icon: BarChart3,
      title: 'SEBI BRSR Core Mandate',
      desc: 'Full 9 Principles of NGRBC plus 40 mandatory KPIs mapped directly into downloadable SEBI disclosure packages.'
    },
    {
      icon: Users,
      title: 'Four-Eyes Maker-Checker',
      desc: 'No operational data can bypass BU review. Segregation of Duties (SoD) enforced across all 7 operational tiers.'
    },
    {
      icon: Sparkles,
      title: 'Automated Anomaly Detection',
      desc: 'Historical variance checks flag unusual spikes in diesel consumption or water withdrawal before submissions reach consolidation.'
    }
  ];

  return (
    <div style={{ background: '#FAFAFA', minHeight: '100vh', color: '#111111', fontFamily: 'Inter, -apple-system, sans-serif' }}>
      
      {/* ── Navbar ──────────────────────────────────────────────────────── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100, background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(12px)', borderBottom: '1px solid #EAEAEA', height: 60
      }}>
        <div style={{
          maxWidth: 1200, margin: '0 auto', height: '100%', padding: '0 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => navigate('/')}>
            <div style={{
              width: 28, height: 28, borderRadius: 6, background: '#111111',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Leaf size={16} color="#FFFFFF" />
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.3px', color: '#111111' }}>MEIL</span>
              <span style={{ fontSize: 12, fontWeight: 500, color: '#666666' }}>ESG & BRSR Platform</span>
            </div>
          </div>

          <nav style={{ display: 'flex', alignItems: 'center', gap: 24, fontSize: 13, fontWeight: 500, color: '#666666' }}>
            <a href="#pipeline" style={{ transition: 'color 0.15s' }}>Data Pipeline</a>
            <a href="#governance" style={{ transition: 'color 0.15s' }}>Governance</a>
            <a href="#features" style={{ transition: 'color 0.15s' }}>Assurance</a>
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {user ? (
              <button
                className="btn btn-primary"
                onClick={() => navigate(user.role === 'system_admin' ? '/admin/users' : '/')}
                style={{ height: 34, fontSize: 13, padding: '0 14px' }}
              >
                <span>Launch Workspace</span>
                <ArrowRight size={13} />
              </button>
            ) : (
              <button
                className="btn btn-primary"
                onClick={() => navigate('/login')}
                style={{ height: 34, fontSize: 13, padding: '0 14px' }}
              >
                <Lock size={13} />
                <span>Portal Sign In</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Hero Section ────────────────────────────────────────────────── */}
      <section style={{ padding: '80px 24px 60px', maxWidth: 1100, margin: '0 auto', textAlign: 'center' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '4px 12px', borderRadius: 99, background: '#F0F0F0', border: '1px solid #EAEAEA',
          fontSize: 12, fontWeight: 500, color: '#444444', marginBottom: 24
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00A63E' }} />
          <span>SEBI Mandated BRSR Core & NGRBC Framework</span>
        </div>

        <h1 style={{
          fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: 800, letterSpacing: '-1.5px',
          lineHeight: 1.1, color: '#111111', margin: '0 0 20px'
        }}>
          Enterprise ESG Management &<br />
          <span style={{
            background: 'linear-gradient(135deg, #0070F3 0%, #00A63E 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
          }}>
            Multi-Tier BRSR Reporting.
          </span>
        </h1>

        <p style={{
          fontSize: 16, color: '#666666', maxWidth: 720, margin: '0 auto 32px',
          lineHeight: 1.6
        }}>
          Collect evidence-backed operational ESG data at the infrastructure project level, review and aggregate at Business Units, consolidate at Subsidiaries, and produce audit-ready Group SEBI BRSR Core reports.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 48 }}>
          <button
            className="btn btn-primary btn-lg"
            onClick={() => navigate(user ? '/' : '/login')}
            style={{ height: 44, padding: '0 24px', fontSize: 14, fontWeight: 600 }}
          >
            <span>{user ? 'Open Executive Dashboard' : 'Sign In with Employee ID'}</span>
            <ArrowRight size={15} />
          </button>
          <a
            href="#pipeline"
            className="btn btn-secondary btn-lg"
            style={{ height: 44, padding: '0 20px', fontSize: 14 }}
          >
            Explore Architecture
          </a>
        </div>

        {/* ── Interactive Pipeline Mockup Preview ───────────────────────── */}
        <div style={{
          background: '#FFFFFF', borderRadius: 16, border: '1px solid #EAEAEA',
          boxShadow: '0 20px 40px rgba(0,0,0,0.06)', overflow: 'hidden', textAlign: 'left'
        }}>
          {/* Mockup Header */}
          <div style={{
            padding: '12px 18px', background: '#F7F7F7', borderBottom: '1px solid #EAEAEA',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#EAEAEA' }} />
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#EAEAEA' }} />
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#EAEAEA' }} />
              <span style={{ fontSize: 11, color: '#999999', fontFamily: 'JetBrains Mono, monospace', marginLeft: 8 }}>
                app.meil.esg/dashboard — Group Consolidated (FY 2024-25)
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="badge badge-success" style={{ fontSize: 10 }}>SHA-256 Vault Active</span>
            </div>
          </div>

          {/* Mockup Body: 4-Tier Data Pipeline Visual */}
          <div style={{ padding: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
              
              <div style={{ padding: '16px', background: '#FAFAFA', borderRadius: 10, border: '1px solid #EAEAEA' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#B45309', textTransform: 'uppercase', marginBottom: 4 }}>
                  STEP 1 · PROJECT LEVEL
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#111111' }}>Raw Operational Facts</div>
                <div style={{ fontSize: 11, color: '#666666', marginTop: 4 }}>
                  Diesel (liters), electricity (kWh), water (kL) entered with required supplier invoices.
                </div>
                <div style={{ marginTop: 10, fontSize: 10, color: '#00A63E', fontWeight: 600 }}>
                  ✓ SHA-256 Hashed
                </div>
              </div>

              <div style={{ padding: '16px', background: '#FAFAFA', borderRadius: 10, border: '1px solid #EAEAEA' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#0070F3', textTransform: 'uppercase', marginBottom: 4 }}>
                  STEP 2 · BU LEVEL
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#111111' }}>Four-Eyes Verification</div>
                <div style={{ fontSize: 11, color: '#666666', marginTop: 4 }}>
                  BU Reviewers inspect evidence, validate consumption thresholds, approve or return with comments.
                </div>
                <div style={{ marginTop: 10, fontSize: 10, color: '#0070F3', fontWeight: 600 }}>
                  ✓ Maker-Checker Enforced
                </div>
              </div>

              <div style={{ padding: '16px', background: '#FAFAFA', borderRadius: 10, border: '1px solid #EAEAEA' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#00A63E', textTransform: 'uppercase', marginBottom: 4 }}>
                  STEP 3 · SUBSIDIARY
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#111111' }}>Formula Engine Calc</div>
                <div style={{ fontSize: 11, color: '#666666', marginTop: 4 }}>
                  CEA grid factor (0.716 kgCO₂e/kWh) converts raw activity data to statutory Scope 1 & Scope 2.
                </div>
                <div style={{ marginTop: 10, fontSize: 10, color: '#00A63E', fontWeight: 600 }}>
                  ✓ Deterministic GHG Engine
                </div>
              </div>

              <div style={{ padding: '16px', background: '#FAFAFA', borderRadius: 10, border: '1px solid #EAEAEA' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#111111', textTransform: 'uppercase', marginBottom: 4 }}>
                  STEP 4 · GROUP LEVEL
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#111111' }}>SEBI BRSR Core</div>
                <div style={{ fontSize: 11, color: '#666666', marginTop: 4 }}>
                  Consolidated multi-subsidiary reporting across all 9 NGRBC principles ready for auditor lock.
                </div>
                <div style={{ marginTop: 10, fontSize: 10, color: '#111111', fontWeight: 600 }}>
                  ✓ XBRL / PDF Export
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Quick Stats Strip */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16,
          marginTop: 32, padding: '20px 24px', background: '#FFFFFF', borderRadius: 12, border: '1px solid #EAEAEA'
        }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#111111', fontFamily: 'JetBrains Mono, monospace' }}>7 Tiers</div>
            <div style={{ fontSize: 11, color: '#666666', marginTop: 2 }}>Hierarchical Governance</div>
          </div>
          <div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#111111', fontFamily: 'JetBrains Mono, monospace' }}>40 KPIs</div>
            <div style={{ fontSize: 11, color: '#666666', marginTop: 2 }}>BRSR Core Dimensions</div>
          </div>
          <div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#111111', fontFamily: 'JetBrains Mono, monospace' }}>SHA-256</div>
            <div style={{ fontSize: 11, color: '#666666', marginTop: 2 }}>Tamper-Proof Audit Vault</div>
          </div>
          <div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#111111', fontFamily: 'JetBrains Mono, monospace' }}>100%</div>
            <div style={{ fontSize: 11, color: '#666666', marginTop: 2 }}>Reasonable Assurance Ready</div>
          </div>
        </div>
      </section>

      {/* ── 4-Tier Governance Section ───────────────────────────────────── */}
      <section id="governance" style={{ padding: '60px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#0070F3', letterSpacing: '0.05em' }}>
            ORGANIZATIONAL STRUCTURE
          </span>
          <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', margin: '6px 0 10px' }}>
            Four-Tier Enterprise Governance
          </h2>
          <p style={{ fontSize: 14, color: '#666666', maxWidth: 640, margin: '0 auto' }}>
            Strict administrative delegation: an admin can only create users at their own organizational scope or exactly one tier below them.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {governanceLevels.map((g, i) => (
            <div key={i} className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#666666', textTransform: 'uppercase' }}>
                {g.level}
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#111111', marginTop: 2 }}>
                {g.title}
              </div>
              <div style={{
                fontSize: 11, fontWeight: 600, color: '#0070F3', background: '#EBF4FF',
                padding: '2px 6px', borderRadius: 4, alignSelf: 'flex-start', marginTop: 6
              }}>
                {g.role}
              </div>
              <p style={{ fontSize: 12, color: '#666666', marginTop: 10, lineHeight: 1.5, flex: 1 }}>
                {g.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Feature Grid ────────────────────────────────────────────────── */}
      <section id="features" style={{ padding: '60px 24px 80px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#0070F3', letterSpacing: '0.05em' }}>
            ENTERPRISE CAPABILITIES
          </span>
          <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', margin: '6px 0 10px' }}>
            Engineered for Regulatory Assurance
          </h2>
          <p style={{ fontSize: 14, color: '#666666', maxWidth: 600, margin: '0 auto' }}>
            Built to withstand rigorous statutory audits from the Big 4 and independent carbon assurance providers.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <div key={i} className="card" style={{ padding: '20px' }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 8, background: '#F7F7F7',
                  border: '1px solid #EAEAEA', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 12
                }}>
                  <Icon size={18} color="#111111" />
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#111111', marginBottom: 6 }}>
                  {f.title}
                </div>
                <div style={{ fontSize: 12, color: '#666666', lineHeight: 1.6 }}>
                  {f.desc}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid #EAEAEA', padding: '32px 24px', background: '#FFFFFF' }}>
        <div style={{
          maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', fontSize: 12, color: '#666666'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Leaf size={14} color="#111111" />
            <span>Megha Engineering & Infrastructures Ltd (MEIL) — Central ESG Portal</span>
          </div>
          <div>
            SEBI Circular SEBI/HO/CFD/CFD-SEC-2/P/CIR/2023/122 Compliant
          </div>
        </div>
      </footer>

    </div>
  );
}
