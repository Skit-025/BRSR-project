import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, Bell, RefreshCw, LogOut, Play, User, Shield, HelpCircle, ChevronDown, Check } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import CommandPalette from './CommandPalette';
import DemoTourModal from './DemoTourModal';

const LABELS = {
  '/dashboard':      ['Overview'],
  '/org':            ['Organization', 'Explorer'],
  '/projects':       ['Projects'],
  '/collection':     ['ESG Data', 'Data Entry'],
  '/parameters':     ['ESG', 'Parameters Admin'],
  '/templates':      ['ESG', 'Templates Builder'],
  '/evidence':       ['ESG', 'Evidence Vault'],
  '/workflow':       ['Workflow', 'Reviews'],
  '/reporting':      ['Reporting', 'BRSR Disclosures'],
  '/calculations':   ['Reporting', 'Calculations & Lineage'],
  '/data-quality':   ['System', 'Data Quality'],
  '/audit-log':      ['System', 'Audit Log'],
  '/admin/users':    ['Administration', 'User Provisioning'],
};

export default function Header() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user, logout, switchPersona, DEMO_PERSONAS } = useAuth();
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [isPersonaOpen, setIsPersonaOpen] = useState(false);

  const crumbs = LABELS[pathname] || [pathname.replace('/', '').toUpperCase() || 'OVERVIEW'];

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await qc.invalidateQueries();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  return (
    <>
      <header className="header">
        {/* Left: Breadcrumbs & Search Trigger */}
        <div className="header-left">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>▲ ACME ESG</span>
            <span style={{ color: 'var(--text-tertiary)' }}>/</span>
            {crumbs.map((c, i) => (
              <React.Fragment key={i}>
                <span style={{ color: i === crumbs.length - 1 ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: i === crumbs.length - 1 ? 550 : 450 }}>
                  {c}
                </span>
                {i < crumbs.length - 1 && <span style={{ color: 'var(--text-tertiary)' }}>/</span>}
              </React.Fragment>
            ))}
          </div>

          {/* ⌘K Command Palette Trigger */}
          <div className="header-search-trigger" onClick={() => setIsCommandOpen(true)}>
            <Search size={13} color="var(--text-tertiary)" />
            <span>Search anything…</span>
            <span className="kbd-badge">⌘ K</span>
          </div>
        </div>

        {/* Right: Demo Tour, Persona Switcher, Notifications, User */}
        <div className="header-right">
          {/* 10-Step Interactive Demo Walkthrough Launcher */}
          <button 
            className="btn btn-secondary btn-sm" 
            onClick={() => setIsTourOpen(true)}
            title="Launch 10-step guided demo scenario (Section 46)"
            style={{ fontWeight: 550, gap: '6px' }}
          >
            <Play size={11} fill="currentColor" />
            <span>10-Step Demo Tour</span>
          </button>

          {/* Live Backend Connection Indicator */}
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              padding: '4px 9px', 
              borderRadius: '9999px', 
              fontSize: '11px', 
              fontWeight: 550,
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
            }}
            title="FastAPI Backend Live on port 8000 with seeded SQLite database (brsr_portal.db)"
          >
            <span style={{ 
              width: '6px', 
              height: '6px', 
              borderRadius: '50%', 
              background: '#10b981', 
              boxShadow: '0 0 6px rgba(16, 185, 129, 0.6)',
              display: 'inline-block' 
            }} />
            <span>API Live :8000</span>
          </div>

          {/* Persona Switcher Dropdown */}
          <div style={{ position: 'relative' }}>
            <button 
              className="btn btn-ghost btn-sm"
              onClick={() => setIsPersonaOpen(!isPersonaOpen)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid var(--border-subtle)', background: 'var(--bg-subtle)' }}
            >
              <User size={12} />
              <span style={{ fontSize: '12px', fontWeight: 550 }}>
                {user?.full_name?.split(' ')[0] || 'Aditya'} ({user?.role?.replace('_', ' ')})
              </span>
              <ChevronDown size={11} color="var(--text-tertiary)" />
            </button>

            {isPersonaOpen && (
              <div 
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '6px',
                  width: '260px',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-default)',
                  borderRadius: '8px',
                  boxShadow: 'var(--shadow-md)',
                  zIndex: 50,
                  padding: '6px',
                }}
              >
                <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-tertiary)', padding: '6px 8px 4px', fontWeight: 600 }}>
                  Switch Role / Persona
                </div>

                {Object.values(DEMO_PERSONAS).map((p) => {
                  const isCurrent = user?.email === p.email;
                  return (
                    <div
                      key={p.key}
                      onClick={() => { switchPersona(p.key); setIsPersonaOpen(false); }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 8px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        background: isCurrent ? 'var(--bg-subtle)' : 'transparent',
                      }}
                      onMouseEnter={(e) => { if (!isCurrent) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                      onMouseLeave={(e) => { if (!isCurrent) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 550, color: 'var(--text-primary)' }}>{p.full_name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{p.title}</div>
                      </div>
                      {isCurrent && <Check size={13} color="var(--status-ready-text)" />}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Refresh Data */}
          <button 
            className="icon-btn" 
            onClick={handleRefresh} 
            disabled={isRefreshing}
            title="Refresh workspace telemetry"
          >
            <RefreshCw size={13} style={{ transform: isRefreshing ? 'rotate(180deg)' : 'none', transition: 'transform 500ms' }} />
          </button>

          {/* Keyboard Shortcuts Help */}
          <button 
            className="icon-btn"
            onClick={() => setIsCommandOpen(true)}
            title="Command shortcuts (⌘K)"
          >
            <HelpCircle size={14} />
          </button>

          {/* User Sign Out */}
          <button 
            className="icon-btn" 
            onClick={() => { logout(); navigate('/landing'); }}
            title="Sign out to landing page"
          >
            <LogOut size={13} />
          </button>
        </div>
      </header>

      {/* Global Command Palette (⌘K) */}
      <CommandPalette isOpen={isCommandOpen} onClose={() => setIsCommandOpen(false)} />

      {/* 10-Step Interactive Demo Walkthrough Modal */}
      <DemoTourModal isOpen={isTourOpen} onClose={() => setIsTourOpen(false)} />
    </>
  );
}
