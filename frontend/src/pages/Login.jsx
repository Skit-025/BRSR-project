import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Lock, User, Eye, EyeOff, ShieldCheck, ArrowRight,
  Leaf, AlertCircle, Building2, Layers,
  HardHat, GitMerge, CheckCircle2, ChevronRight, Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const PLATFORM_ROLES = [
  {
    role: 'Group Admin',
    name: 'Aditya Sharma',
    email: 'group.admin@aarohan.in',
    desc: 'Full enterprise visibility across all subsidiaries, corporate consolidation & SEBI reporting.',
    icon: Building2,
    badgeColor: '#7C3AED',
    route: '/dashboard',
    highlight: 'Executive View'
  },
  {
    role: 'Subsidiary Admin',
    name: 'Meera Nair',
    email: 'sub.admin@aarohan.in',
    desc: 'Oversight for Aarohan Renewable Energy Pvt. Ltd. (Solar & Wind business units).',
    icon: Building2,
    badgeColor: '#2563EB',
    route: '/dashboard',
    highlight: 'Subsidiary View'
  },
  {
    role: 'BU Admin / Reviewer',
    name: 'Rajesh V.',
    email: 'bu.admin@aarohan.in',
    desc: 'Solar EPC & Operations review queue, Segregation of Duties approval & change requests.',
    icon: GitMerge,
    badgeColor: '#0284C7',
    route: '/workflow',
    highlight: 'Review Queue'
  },
  {
    role: 'Project User',
    name: 'Ravi Kumar',
    email: 'project.user@aarohan.in',
    desc: '250 MW Odisha Solar Park raw operational fact entry, statutory voucher uploads & draft submission.',
    icon: HardHat,
    badgeColor: '#059669',
    route: '/projects/PRJ-ODISHA-SOLAR',
    highlight: 'Hero Site Flow'
  }
];

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authenticatingPersona, setAuthenticatingPersona] = useState(null);
  const [error, setError] = useState('');

  const handleLoginSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!identifier.trim() || !password) {
      setError('Please provide both Employee ID / Username and Password.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const loggedUser = await login(identifier, password);
      if (loggedUser.role === 'system_admin') {
        navigate('/admin/users');
      } else if (loggedUser.role === 'project_data_entry_user' || loggedUser.role === 'maker') {
        navigate('/projects');
      } else if (loggedUser.role === 'bu_admin' || loggedUser.role === 'bu_reviewer' || loggedUser.role === 'checker') {
        navigate('/workflow');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Login error:', err);
      const msg = err.response?.data?.detail || 'Authentication failed. Please verify your credentials.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickPersonaLogin = async (persona) => {
    setError('');
    setAuthenticatingPersona(persona.email);
    try {
      await login(persona.email, 'Password123!');
      navigate(persona.route);
    } catch (err) {
      console.error('Quick login error:', err);
      setError(err.response?.data?.detail || 'Authentication failed for selected profile.');
    } finally {
      setAuthenticatingPersona(null);
    }
  };

  const fillQuickAdmin = (adminUser, pass) => {
    setIdentifier(adminUser);
    setPassword(pass);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: '#F8FAFC',
      color: '#0F172A',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      position: 'relative',
      overflowX: 'hidden'
    }}>
      {/* Subtle light ambient background & grid lines */}
      <div style={{
        position: 'fixed',
        inset: 0,
        backgroundImage: `
          radial-gradient(circle at 50% 0%, rgba(37, 99, 235, 0.08) 0%, transparent 60%),
          radial-gradient(circle at 85% 30%, rgba(16, 185, 129, 0.06) 0%, transparent 50%),
          linear-gradient(to right, rgba(0, 0, 0, 0.03) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(0, 0, 0, 0.03) 1px, transparent 1px)
        `,
        backgroundSize: '100% 100%, 100% 100%, 48px 48px, 48px 48px',
        pointerEvents: 'none',
        zIndex: 0
      }} />

      {/* Top Bar */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 36px',
        borderBottom: '1px solid #E2E8F0',
        backdropFilter: 'blur(16px)',
        background: 'rgba(255, 255, 255, 0.9)',
        position: 'relative',
        zIndex: 10
      }}>
        <Link to="/landing" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
          <img
            src="/aarohan-logo.png"
            alt="Aarohan – Intelligent Sustainable Growth"
            style={{ height: 44, width: 'auto', objectFit: 'contain', display: 'block' }}
          />
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            background: '#ECFDF5',
            border: '1px solid #A7F3D0',
            color: '#065F46',
            padding: '5px 12px',
            borderRadius: 9999,
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.02em'
          }}>
            <span className="status-beacon-live" />
            Statutory Assurance Vault
          </div>
          <Link
            to="/landing"
            style={{
              textDecoration: 'none',
              fontSize: 12.5,
              fontWeight: 600,
              color: '#334155',
              padding: '6px 14px',
              borderRadius: 6,
              border: '1px solid #E2E8F0',
              background: '#FFFFFF',
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.color = '#0F172A'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.color = '#334155'; }}
          >
            ← Back to Home
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '36px 24px 60px',
        position: 'relative',
        zIndex: 5
      }}>
        <div
          className="anim-fade-up"
          style={{
            width: '100%',
            maxWidth: 1060,
            display: 'grid',
            gridTemplateColumns: '1.18fr 0.82fr',
            gap: 24,
            alignItems: 'stretch'
          }}
        >
          {/* ── Left Column: Platform Role Launchers ── */}
          <div style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 14,
            padding: '30px 26px',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.04), 0 2px 4px -2px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Layers size={15} color="#4F46E5" />
                <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#4F46E5' }}>
                  QUICK ACCESS — ASSURANCE PROFILES
                </span>
              </div>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: '#09090B', margin: '4px 0 8px', letterSpacing: '-0.02em' }}>
                Select Your Role
              </h2>
              <p style={{ fontSize: 13, color: '#64748B', margin: 0, lineHeight: 1.5 }}>
                Click a role below for instant one-click authentication into the Aarohan ESG statutory workspace.
              </p>

              {/* Persona Cards Grid */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>
                {PLATFORM_ROLES.map(p => {
                  const Icon = p.icon;
                  const isLogging = authenticatingPersona === p.email;
                  return (
                    <button
                      key={p.email}
                      type="button"
                      onClick={() => handleQuickPersonaLogin(p)}
                      disabled={loading || !!authenticatingPersona}
                      style={{
                        padding: '13px 16px',
                        borderRadius: 10,
                        border: '1px solid #E2E8F0',
                        background: '#F8FAFC',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        textAlign: 'left',
                        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = p.badgeColor;
                        e.currentTarget.style.background = '#FFFFFF';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.04)';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#E2E8F0';
                        e.currentTarget.style.background = '#F8FAFC';
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                        <div style={{
                          width: 38,
                          height: 38,
                          borderRadius: 8,
                          background: `${p.badgeColor}15`,
                          border: `1px solid ${p.badgeColor}30`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: p.badgeColor,
                          flexShrink: 0,
                          marginTop: 2
                        }}>
                          <Icon size={18} />
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: '#09090B' }}>{p.name}</span>
                            <span style={{
                              fontSize: 10.5,
                              fontWeight: 700,
                              color: p.badgeColor,
                              background: `${p.badgeColor}15`,
                              border: `1px solid ${p.badgeColor}30`,
                              padding: '1px 7px',
                              borderRadius: 4
                            }}>
                              {p.role}
                            </span>
                            <span style={{ fontSize: 10, color: '#94A3B8' }}>{p.highlight}</span>
                          </div>
                          <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 2, lineHeight: 1.4 }}>
                            {p.desc}
                          </div>
                          <div style={{ fontSize: 11, color: '#0284C7', marginTop: 3, fontFamily: 'monospace' }}>
                            {p.email}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, paddingLeft: 12 }}>
                        {isLogging ? (
                          <span style={{ fontSize: 11, color: '#2563EB', fontWeight: 600 }}>Signing in...</span>
                        ) : (
                          <div style={{
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            background: '#FFFFFF',
                            border: '1px solid #CBD5E1',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#64748B'
                          }}>
                            <ArrowRight size={13} />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{
              marginTop: 20,
              padding: '12px 14px',
              borderRadius: 8,
              background: '#F1F5F9',
              border: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 11.5,
              color: '#475569'
            }}>
              <span style={{ fontWeight: 600 }}>Reporting Entity:</span>
              <span style={{ fontWeight: 700, color: '#09090B', letterSpacing: '0.01em' }}>
                Aarohan Infrastructure & Energy Group (FY 2025–26)
              </span>
            </div>
          </div>

          {/* ── Right Column: Manual Sign In Form ── */}
          <div style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 14,
            padding: '30px 26px',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.04), 0 2px 4px -2px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Lock size={15} color="#2563EB" />
                <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#2563EB' }}>
                  SECURE ACCESS
                </span>
              </div>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: '#09090B', margin: '4px 0 8px', letterSpacing: '-0.02em' }}>
                Sign In With Credentials
              </h2>
              <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 18px', lineHeight: 1.5 }}>
                Enter custom credentials or select a system administrator profile below.
              </p>

              {error && (
                <div style={{
                  padding: '11px 14px',
                  borderRadius: 8,
                  background: '#FEF2F2',
                  border: '1px solid #FCA5A5',
                  color: '#B91C1C',
                  fontSize: 12.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 16
                }}>
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    Employee ID or Email
                  </label>
                  <div style={{ position: 'relative' }}>
                    <User size={15} color="#94A3B8" style={{ position: 'absolute', left: 12, top: 12 }} />
                    <input
                      type="text"
                      placeholder="e.g. group.admin@aarohan.in or Skit-025"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '10px 12px 10px 36px',
                        borderRadius: 7,
                        border: '1px solid #CBD5E1',
                        background: '#F8FAFC',
                        color: '#09090B',
                        fontSize: 13,
                        boxSizing: 'border-box',
                        outline: 'none',
                        transition: 'border-color 0.15s ease'
                      }}
                      onFocus={(e) => { e.target.style.borderColor = '#2563EB'; e.target.style.background = '#FFFFFF'; }}
                      onBlur={(e) => { e.target.style.borderColor = '#CBD5E1'; e.target.style.background = '#F8FAFC'; }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={15} color="#94A3B8" style={{ position: 'absolute', left: 12, top: 12 }} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter account password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '10px 36px 10px 36px',
                        borderRadius: 7,
                        border: '1px solid #CBD5E1',
                        background: '#F8FAFC',
                        color: '#09090B',
                        fontSize: 13,
                        boxSizing: 'border-box',
                        outline: 'none',
                        transition: 'border-color 0.15s ease'
                      }}
                      onFocus={(e) => { e.target.style.borderColor = '#2563EB'; e.target.style.background = '#FFFFFF'; }}
                      onBlur={(e) => { e.target.style.borderColor = '#CBD5E1'; e.target.style.background = '#F8FAFC'; }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(p => !p)}
                      style={{
                        position: 'absolute',
                        right: 10,
                        top: 10,
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#94A3B8'
                      }}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '11px',
                    borderRadius: 7,
                    border: 'none',
                    background: '#0070F3',
                    color: '#FFFFFF',
                    fontSize: 13.5,
                    fontWeight: 700,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    marginTop: 6,
                    boxShadow: '0 2px 8px rgba(0, 112, 243, 0.28)',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = '#005bb5'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#0070F3'; }}
                >
                  {loading ? (
                    <span>Authenticating...</span>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight size={15} />
                    </>
                  )}
                </button>
              </form>

              {/* Technical Admin Accounts */}
              <div style={{ marginTop: 22, paddingTop: 18, borderTop: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                  System Administrator Accounts
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => fillQuickAdmin('Skit-025', 'Skit@2409006')}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 6,
                      border: '1px solid #E2E8F0',
                      background: '#F8FAFC',
                      fontSize: 11.5,
                      fontWeight: 600,
                      color: '#475569',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'border-color 0.15s ease'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.background = '#FFFFFF'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.background = '#F8FAFC'; }}
                  >
                    Admin: <strong style={{ color: '#09090B' }}>Skit-025</strong>
                  </button>
                  <button
                    type="button"
                    onClick={() => fillQuickAdmin('adtshrm007', 'adtshrm@2409007')}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 6,
                      border: '1px solid #E2E8F0',
                      background: '#F8FAFC',
                      fontSize: 11.5,
                      fontWeight: 600,
                      color: '#475569',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'border-color 0.15s ease'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.background = '#FFFFFF'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.background = '#F8FAFC'; }}
                  >
                    Admin: <strong style={{ color: '#09090B' }}>adtshrm007</strong>
                  </button>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#64748B', marginTop: 22 }}>
              <ShieldCheck size={14} color="#10B981" />
              <span>Argon2id password hashing · Role-Based Access Control</span>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
