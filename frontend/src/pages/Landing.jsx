import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, ShieldCheck, Database, Layers, Cpu, FileCheck,
  CheckCircle2, Sparkles, Building2, Play, Lock, ChevronRight, FileText
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Landing() {
  const navigate = useNavigate();
  const { enterMockMode } = useAuth();

  const handleEnterApp = () => {
    enterMockMode('aditya');
    navigate('/dashboard');
  };

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', color: '#09090b', fontFamily: 'var(--font-sans)' }}>
      {/* Top Minimal Vercel-Style Navbar */}
      <header style={{ height: '64px', borderBottom: '1px solid #eaeaea', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 36px', maxWidth: '1280px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '15px' }}>
          <span style={{ fontSize: '16px' }}>▲</span>
          <span>ACME ESG</span>
          <span style={{ fontSize: '11px', color: '#71717a', marginLeft: '6px', borderLeft: '1px solid #eaeaea', paddingLeft: '8px' }}>
            Enterprise Operating System
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            className="btn btn-secondary btn-sm"
            onClick={handleEnterApp}
          >
            <span>Live Demo</span>
          </button>
          <button 
            className="btn btn-primary btn-sm"
            onClick={handleEnterApp}
          >
            <span>Enter Platform</span>
            <ArrowRight size={13} />
          </button>
        </div>
      </header>

      {/* Hero Section (Section 42 Specification) */}
      <section style={{ maxWidth: '980px', margin: '80px auto 40px', padding: '0 24px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', background: '#fafafa', border: '1px solid #eaeaea', borderRadius: '99px', fontSize: '12px', color: '#52525b', marginBottom: '24px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
          <span>Engineered for SEBI BRSR Core & GHG Protocol Corporate Standard</span>
        </div>

        <h1 style={{ fontSize: '56px', fontWeight: 700, letterSpacing: '-0.035em', lineHeight: 1.1, color: '#09090b', marginBottom: '24px' }}>
          ESG reporting,<br />without the spreadsheet chaos.
        </h1>

        <p style={{ fontSize: '18px', color: '#71717a', lineHeight: 1.6, maxWidth: '640px', margin: '0 auto 36px' }}>
          Collect evidence-backed ESG data from every project. Review it, calculate it, and turn it into trusted enterprise reporting.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
          <button 
            className="btn btn-primary btn-lg"
            onClick={handleEnterApp}
            style={{ fontSize: '14px', padding: '12px 24px' }}
          >
            <span>Launch Live Platform</span>
            <ArrowRight size={15} />
          </button>
          <button 
            className="btn btn-secondary btn-lg"
            onClick={handleEnterApp}
            style={{ fontSize: '14px', padding: '12px 24px' }}
          >
            <Play size={14} fill="currentColor" />
            <span>Interactive Demo Tour</span>
          </button>
        </div>
      </section>

      {/* Product Preview Card (Section 42 Specification) */}
      <section style={{ maxWidth: '1040px', margin: '40px auto 80px', padding: '0 24px' }}>
        <div style={{ background: '#ffffff', border: '1px solid #eaeaea', borderRadius: '12px', boxShadow: '0 20px 48px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          {/* Mock Window Titlebar */}
          <div style={{ height: '40px', background: '#fafafa', borderBottom: '1px solid #eaeaea', display: 'flex', alignItems: 'center', padding: '0 16px', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#eaeaea' }} />
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#eaeaea' }} />
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#eaeaea' }} />
            </div>
            <span style={{ fontSize: '11px', color: '#71717a', fontFamily: 'var(--font-mono)' }}>
              app.enterprise-esg.internal/overview
            </span>
            <div style={{ width: '40px' }} />
          </div>

          {/* Interactive Preview Dashboard */}
          <div style={{ padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#71717a', textTransform: 'uppercase', fontWeight: 600 }}>Enterprise ESG Dashboard</div>
                <div style={{ fontSize: '20px', fontWeight: 700, marginTop: '2px' }}>Consolidated Sustainability Portfolio</div>
              </div>
              <span className="badge badge-ready">● FY 2026 Live Telemetry</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
              <div style={{ padding: '16px', background: '#fafafa', border: '1px solid #eaeaea', borderRadius: '8px' }}>
                <div style={{ fontSize: '12px', color: '#71717a' }}>Data Coverage</div>
                <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '4px' }}>94.2%</div>
                <div style={{ fontSize: '11px', color: '#059669', marginTop: '4px' }}>↑ 4.2% across 32 Projects</div>
              </div>
              <div style={{ padding: '16px', background: '#fafafa', border: '1px solid #eaeaea', borderRadius: '8px' }}>
                <div style={{ fontSize: '12px', color: '#71717a' }}>Total Verified Emissions</div>
                <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '4px' }}>1,284.7 <span style={{ fontSize: '14px', fontWeight: 500 }}>tCO₂e</span></div>
                <div style={{ fontSize: '11px', color: '#71717a', marginTop: '4px' }}>Scope 1 & 2 GHG Protocol</div>
              </div>
              <div style={{ padding: '16px', background: '#fafafa', border: '1px solid #eaeaea', borderRadius: '8px' }}>
                <div style={{ fontSize: '12px', color: '#71717a' }}>Audit Lineage Proofs</div>
                <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '4px' }}>100%</div>
                <div style={{ fontSize: '11px', color: '#059669', marginTop: '4px' }}>✓ SHA-256 Hash Verified</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#f4f4f5', borderRadius: '6px', fontSize: '12px' }}>
              <span style={{ color: '#52525b' }}>Traceable all the way from Boardroom Disclosures down to original site receipts.</span>
              <button className="btn btn-secondary btn-sm" onClick={handleEnterApp}>
                <span>Explore Live Platform</span>
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Visual Story: The Product's Core Journey (Section 44 Specification) */}
      <section style={{ maxWidth: '1040px', margin: '0 auto 100px', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#71717a', fontWeight: 600, letterSpacing: '0.05em' }}>
            The Core Value Chain (Section 44)
          </div>
          <h2 style={{ fontSize: '32px', fontWeight: 700, letterSpacing: '-0.02em', marginTop: '4px' }}>
            From Project Site to Statutory Assurance
          </h2>
        </div>

        {/* 6-Step Story Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px', textAlign: 'center' }}>
          {[
            { step: '01', title: 'Project', desc: 'Ground-level operational boundary', icon: Building2 },
            { step: '02', title: 'Evidence', desc: 'Invoices, logs & OCR verification', icon: FileText },
            { step: '03', title: 'Review', desc: 'Maker-checker split screen audit', icon: FileCheck },
            { step: '04', title: 'Calculation', desc: 'Automated emission factors', icon: Cpu },
            { step: '05', title: 'Consolidation', desc: 'Multi-tier tree aggregation', icon: Layers },
            { step: '06', title: 'BRSR', desc: 'SEBI compliant export packet', icon: ShieldCheck },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} style={{ padding: '20px 14px', background: '#fafafa', border: '1px solid #eaeaea', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: '#a1a1aa' }}>{item.step}</span>
                <Icon size={20} color="#09090b" />
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#09090b' }}>{item.title}</div>
                <div style={{ fontSize: '11px', color: '#71717a', lineHeight: 1.4 }}>{item.desc}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Enterprise Capabilities Grid */}
      <section style={{ maxWidth: '1040px', margin: '0 auto 100px', padding: '0 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
          <div style={{ padding: '24px', border: '1px solid #eaeaea', borderRadius: '8px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>Signature Lineage Drill-down</h3>
            <p style={{ fontSize: '13px', color: '#71717a', lineHeight: 1.6 }}>
              Click any report disclosure to trace directly down to the contributing project, raw input litres, and signed PDF delivery voucher.
            </p>
          </div>

          <div style={{ padding: '24px', border: '1px solid #eaeaea', borderRadius: '8px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>Progressive Disclosure Forms</h3>
            <p style={{ fontSize: '13px', color: '#71717a', lineHeight: 1.6 }}>
              Never overwhelm engineers with 30-field forms. Progressive disclosure accompanied by our signature "Why is this required?" helper.
            </p>
          </div>

          <div style={{ padding: '24px', border: '1px solid #eaeaea', borderRadius: '8px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>Maker-Checker Split Screen</h3>
            <p style={{ fontSize: '13px', color: '#71717a', lineHeight: 1.6 }}>
              Reviewers validate data side-by-side with original OCR-extracted documentation without ever switching browser windows.
            </p>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <footer style={{ borderTop: '1px solid #eaeaea', padding: '60px 24px', textAlign: 'center', background: '#fafafa' }}>
        <h3 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '12px' }}>
          Experience the Enterprise ESG Platform
        </h3>
        <p style={{ fontSize: '14px', color: '#71717a', marginBottom: '24px' }}>
          Explore the live workspace pre-populated with 32 operational projects across 4 subsidiaries.
        </p>
        <button className="btn btn-primary btn-lg" onClick={handleEnterApp}>
          <span>Launch Platform</span>
          <ArrowRight size={14} />
        </button>
      </footer>
    </div>
  );
}
