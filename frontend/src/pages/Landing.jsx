import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, Leaf, Building2, Zap, Droplets, 
  Bus, Layers, Award, ArrowRight, Lock, CheckCircle2,
  FileCheck, Users, BarChart3, ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Landing() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="landing-page">
      {/* Navigation Bar */}
      <header className="landing-nav">
        <div className="landing-nav-container">
          <div className="landing-logo">
            <div className="landing-logo-icon">
              <Leaf size={22} color="#fff" />
            </div>
            <div className="landing-logo-text">
              <span className="landing-brand-name">MEIL</span>
              <span className="landing-brand-sub">ESG & BRSR PORTAL</span>
            </div>
          </div>

          <nav className="landing-nav-links">
            <a href="#about-meil">About MEIL</a>
            <a href="#brsr-framework">BRSR Framework</a>
            <a href="#hierarchy-levels">7-Tier Governance</a>
            <a href="#security">Assurance</a>
          </nav>

          <div className="landing-nav-actions">
            {user ? (
              <button 
                className="btn btn-primary"
                onClick={() => navigate(user.role === 'system_admin' ? '/admin/users' : '/')}
              >
                <span>Enter Workspace</span>
                <ArrowRight size={15} />
              </button>
            ) : (
              <button 
                className="btn btn-primary"
                onClick={() => navigate('/login')}
              >
                <Lock size={15} />
                <span>Portal Sign In</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="landing-hero">
        <div className="landing-hero-content">
          <div className="landing-badge">
            <ShieldCheck size={14} className="text-emerald" />
            <span>SEBI Mandated BRSR Core & NGRBC Framework</span>
          </div>

          <h1 className="landing-hero-title">
            Engineering Sustainable Infrastructure.<br />
            <span className="text-gradient">Quantifying ESG Excellence.</span>
          </h1>

          <p className="landing-hero-desc">
            Megha Engineering & Infrastructures Limited (MEIL) central ESG governance system.
            Empowering automated multi-tier consolidation across 7 organizational hierarchy tiers, 
            40 reporting dimensions, SHA-256 evidence chain verification, and SEBI-compliant reporting.
          </p>

          <div className="landing-hero-buttons">
            <button 
              className="btn btn-primary btn-lg"
              onClick={() => navigate(user ? '/' : '/login')}
            >
              <span>{user ? 'Open ESG Dashboard' : 'Sign In to Portal'}</span>
              <ArrowRight size={16} />
            </button>
            <a href="#about-meil" className="btn btn-secondary btn-lg">
              <span>Learn About MEIL</span>
            </a>
          </div>

          {/* Quick Metrics Strip */}
          <div className="landing-stats-grid">
            <div className="landing-stat-item">
              <span className="landing-stat-val">7</span>
              <span className="landing-stat-label">Hierarchy Tiers</span>
            </div>
            <div className="landing-stat-item">
              <span className="landing-stat-val">40</span>
              <span className="landing-stat-label">Reporting Dimensions</span>
            </div>
            <div className="landing-stat-item">
              <span className="landing-stat-val">9</span>
              <span className="landing-stat-label">NGRBC Principles</span>
            </div>
            <div className="landing-stat-item">
              <span className="landing-stat-val">100%</span>
              <span className="landing-stat-label">Audit Assurance</span>
            </div>
          </div>
        </div>

        {/* Hero Banner Visual */}
        <div className="landing-hero-media">
          <div className="hero-img-wrapper">
            <img 
              src="/meil_hero.jpg" 
              alt="MEIL Sustainable Infrastructure" 
              className="hero-img"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
            <div className="hero-img-overlay">
              <div className="hero-card-floating">
                <Leaf size={16} color="var(--emerald-400)" />
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Live Audit Trail</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>SHA-256 Tamper-Proof</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About MEIL Section */}
      <section id="about-meil" className="landing-section">
        <div className="landing-section-header">
          <span className="landing-section-tag">NATION BUILDING WITH ESG INTEGRITY</span>
          <h2>Megha Engineering & Infrastructures Limited (MEIL)</h2>
          <p>
            Established in 1989, MEIL is one of India's preeminent engineering conglomerates driving 
            landmark infrastructure that touches millions of lives across 18+ Indian states and globally.
          </p>
        </div>

        <div className="landing-features-grid">
          <div className="feature-card">
            <div className="feature-icon bg-blue-subtle">
              <Droplets size={24} color="#38bdf8" />
            </div>
            <h3>Irrigation & Clean Water</h3>
            <p>
              Constructed Asia's largest multi-stage lift irrigation system (Kaleshwaram Lift Irrigation Project),
              delivering clean drinking and irrigation water across thousands of rural kilometers.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon bg-emerald-subtle">
              <Zap size={24} color="#34d399" />
            </div>
            <h3>Renewable & Clean Energy</h3>
            <p>
              Leading gigawatt-scale solar parks, hydroelectric projects, and green hydrogen supply networks 
              powering India's transition to a net-zero carbon future.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon bg-purple-subtle">
              <Bus size={24} color="#a78bfa" />
            </div>
            <h3>Electric Mobility (Olectra)</h3>
            <p>
              Pioneering urban zero-emission transport through subsidiary Olectra Greentech, operating thousands 
              of electric buses across major municipal transport corporations.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon bg-amber-subtle">
              <Layers size={24} color="#fbbf24" />
            </div>
            <h3>Hydrocarbon & Strategic EPC</h3>
            <p>
              Delivering high-precision oil and gas refining units, deep drilling rigs, and high-altitude tunnels 
              such as the prestigious Zojila Tunnel in Jammu & Kashmir.
            </p>
          </div>
        </div>
      </section>

      {/* 7-Tier Architecture Section */}
      <section id="hierarchy-levels" className="landing-section bg-subtle">
        <div className="landing-section-header">
          <span className="landing-section-tag">MULTI-TIER ORGANIZATIONAL GOVERNANCE</span>
          <h2>7-Tier Hierarchy Data Aggregation</h2>
          <p>
            System Admins provision employee accounts and delegate granular roles down to the lowest 
            site levels, ensuring flawless Segregation of Duties (SoD).
          </p>
        </div>

        <div className="hierarchy-steps">
          <div className="h-step">
            <div className="h-step-num">L1</div>
            <div className="h-step-info">
              <h4>MEIL Group Executive</h4>
              <p>Overall group oversight & board-level SEBI BRSR lock</p>
            </div>
          </div>
          <div className="h-step">
            <div className="h-step-num">L2</div>
            <div className="h-step-info">
              <h4>Subsidiaries</h4>
              <p>Megha City Gas, Olectra Greentech, ICOMM Tele, Drillmec</p>
            </div>
          </div>
          <div className="h-step">
            <div className="h-step-num">L3</div>
            <div className="h-step-info">
              <h4>Associate Entities</h4>
              <p>Equity & operational boundary associates</p>
            </div>
          </div>
          <div className="h-step">
            <div className="h-step-num">L4</div>
            <div className="h-step-info">
              <h4>Joint Ventures (JV)</h4>
              <p>Shared control infrastructure projects & consortiums</p>
            </div>
          </div>
          <div className="h-step">
            <div className="h-step-num">L5</div>
            <div className="h-step-info">
              <h4>Business Units (BU)</h4>
              <p>Hydrocarbon, Solar, Power, Roads, and Water Division</p>
            </div>
          </div>
          <div className="h-step">
            <div className="h-step-num">L6</div>
            <div className="h-step-info">
              <h4>Projects</h4>
              <p>Designated projects (e.g. Kaleshwaram, Polavaram, Zojila)</p>
            </div>
          </div>
          <div className="h-step">
            <div className="h-step-num">L7</div>
            <div className="h-step-info">
              <h4>Operational Sites</h4>
              <p>Pumping stations, fabrication yards, regional depots</p>
            </div>
          </div>
        </div>
      </section>

      {/* Security & Assurance Section */}
      <section id="security" className="landing-section">
        <div className="landing-section-header">
          <span className="landing-section-tag">ASSURANCE & INTEGRITY</span>
          <h2>Enterprise Security & Audit Readiness</h2>
        </div>

        <div className="landing-features-grid">
          <div className="feature-card">
            <div className="feature-icon bg-emerald-subtle">
              <CheckCircle2 size={24} color="#34d399" />
            </div>
            <h3>Four-Eyes Maker-Checker</h3>
            <p>Data entered by Makers must be verified and approved by authorized Checkers prior to consolidation.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon bg-blue-subtle">
              <FileCheck size={24} color="#38bdf8" />
            </div>
            <h3>Cryptographic Evidence Seal</h3>
            <p>Every uploaded electricity bill, diesel log, and safety certificate is hashed with SHA-256 for non-repudiation.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon bg-purple-subtle">
              <Users size={24} color="#a78bfa" />
            </div>
            <h3>Exclusive System Admin Control</h3>
            <p>Only designated System Administrators can provision or revoke user IDs and define hierarchical boundaries.</p>
          </div>
        </div>
      </section>

      {/* Sign In CTA Banner */}
      <section className="landing-cta-banner">
        <div className="cta-banner-content">
          <h2>Ready to Access the MEIL BRSR Portal?</h2>
          <p>Sign in with your Employee ID or System Administrator credentials to get started.</p>
          <button 
            className="btn btn-primary btn-lg"
            onClick={() => navigate(user ? '/' : '/login')}
          >
            <Lock size={16} />
            <span>{user ? 'Go to Dashboard' : 'Sign In Now'}</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-footer-container">
          <div className="footer-col">
            <div className="landing-logo">
              <div className="landing-logo-icon">
                <Leaf size={18} color="#fff" />
              </div>
              <div className="landing-logo-text">
                <span className="landing-brand-name">MEIL</span>
                <span className="landing-brand-sub">ESG Portal</span>
              </div>
            </div>
            <p className="footer-text">
              Megha Engineering & Infrastructures Limited.<br />
              Corporate Headquarters: Hyderabad, Telangana, India.
            </p>
          </div>

          <div className="footer-col">
            <h4>Reporting & Compliance</h4>
            <ul>
              <li>SEBI BRSR Core Circular 2023</li>
              <li>National Guidelines for Responsible Business Conduct (NGRBC)</li>
              <li>GHG Protocol Corporate Standard (Scope 1, 2, 3)</li>
              <li>BEE PAT Designated Consumer Returns</li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>System Access</h4>
            <ul>
              <li>System Administrator Console</li>
              <li>Maker Data Submission</li>
              <li>Checker Review Queue</li>
              <li>Independent Auditor Vault</li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} Megha Engineering & Infrastructures Ltd. All rights reserved. Confidential & Proprietary.</p>
        </div>
      </footer>
    </div>
  );
}
