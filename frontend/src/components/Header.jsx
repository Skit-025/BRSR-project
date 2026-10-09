import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Search, Bell, HelpCircle, User, CheckCircle2,
  ChevronDown, LogOut, Compass, Sparkles, Building2,
  Calendar, Shield, ArrowRight, X, Layers, GitMerge,
  FileSpreadsheet, PenLine, HardHat, ExternalLink
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth, ROLE_META } from '../context/AuthContext';
import CommandPalette from './CommandPalette';
import { notificationsApi } from '../api/client';

const PLATFORM_JOURNEY_STEPS = [
  { step: '01', title: 'Organization', desc: 'Enterprise structure & entity roll-up', route: '/dashboard', icon: Building2, role: 'Group Admin' },
  { step: '02', title: 'Subsidiary', desc: 'Aarohan Renewable Energy Pvt. Ltd.', route: '/disclosure/subsidiary', icon: Building2, role: 'Subsidiary Admin' },
  { step: '03', title: 'Business Unit', desc: 'Solar EPC & Operations BU oversight', route: '/disclosure/bu', icon: Layers, role: 'BU Admin' },
  { step: '04', title: 'Project Hub', desc: '250 MW Odisha Solar Park hero site', route: '/projects', icon: HardHat, role: 'Project Admin' },
  { step: '05', title: 'Data Entry', desc: 'Operational parameters & statutory vouchers', route: '/collection', icon: PenLine, role: 'Project Admin' },
  { step: '06', title: 'Review & Gate', desc: 'Four-eyes Segregation of Duties & audit check', route: '/workflow', icon: GitMerge, role: 'BU Admin' },
  { step: '07', title: 'Calculation', desc: 'Bottom-up boundary consolidation engine', route: '/consolidation', icon: Layers, role: 'Group Admin' },
  { step: '08', title: 'BRSR Report', desc: 'SEBI BRSR disclosures with full lineage drilldown', route: '/reporting', icon: FileSpreadsheet, role: 'Group Admin' },
];

const ACTIVE_PERSONAS = [
  {
    roleKey: 'system_admin',
    name: 'Dr. Deepa Nair',
    label: 'System Admin',
    email: 'admin@aarohan.in',
    org: 'Platform Administration',
    color: '#F43F5E',
    route: '/admin/users'
  },
  {
    roleKey: 'group_admin',
    name: 'Aditya Sharma',
    label: 'Group Admin',
    email: 'group.admin@aarohan.in',
    org: 'Aarohan Infrastructure & Energy Group',
    color: '#8B5CF6',
    route: '/dashboard'
  },
  {
    roleKey: 'subsidiary_admin',
    name: 'Meera Nair',
    label: 'Subsidiary Admin',
    email: 'sub.admin@aarohan.in',
    org: 'Aarohan Renewable Energy Pvt. Ltd.',
    color: '#6366F1',
    route: '/dashboard'
  },
  {
    roleKey: 'bu_admin',
    name: 'Rajesh V.',
    label: 'BU Admin',
    email: 'bu.admin@aarohan.in',
    org: 'Solar EPC & Operations',
    color: '#0EA5E9',
    route: '/workflow'
  },
  {
    roleKey: 'project_admin',
    name: 'Ravi Kumar',
    label: 'Project Admin',
    email: 'project.user@aarohan.in',
    org: '250 MW Odisha Solar Park',
    color: '#059669',
    route: '/collection'
  }
];

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { user, role, logout, login } = useAuth();

  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showJourneyModal, setShowJourneyModal] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifsLoading, setNotifsLoading] = useState(false);
  const [switchingPersona, setSwitchingPersona] = useState(false);

  const userMenuRef = useRef(null);
  const notifMenuRef = useRef(null);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
      if (notifMenuRef.current && !notifMenuRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Notifications fetch
  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;
    setNotifsLoading(true);
    try {
      const res = await notificationsApi.listForUser(user.id);
      const notifs = Array.isArray(res.data) ? res.data : [];
      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.is_read).length);
    } catch {
      // Graceful fallback
    } finally {
      setNotifsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60_000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const handleMarkRead = async (notifId) => {
    try {
      await notificationsApi.markRead(notifId);
      setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch { /* ignore */ }
  };

  const handleMarkAllRead = async () => {
    if (!user?.id) return;
    try {
      await notificationsApi.markAllRead(user.id);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch { /* ignore */ }
  };

  const handleNotifClick = (notif) => {
    handleMarkRead(notif.id);
    setShowNotifications(false);
    if (notif.link_url) {
      navigate(notif.link_url);
    }
  };

  // Robust Logout Implementation (Mandatory Spec §4)
  const handleLogout = () => {
    setShowUserMenu(false);
    try {
      queryClient.clear();
      logout();
    } catch (err) {
      console.warn('Logout cleanup notice:', err);
    } finally {
      navigate('/login', { replace: true });
    }
  };

  // Role Profile Switcher (platform demo & live workflow support)
  const handleSwitchPersona = async (persona) => {
    setSwitchingPersona(true);
    try {
      await login(persona.email, 'Password123!');
      setShowUserMenu(false);
      queryClient.invalidateQueries();
      navigate(persona.route);
    } catch (err) {
      console.error('Failed to switch persona:', err);
    } finally {
      setSwitchingPersona(false);
    }
  };

  const roleMeta = ROLE_META[user?.role] || {
    label: user?.role ? user.role.replace(/_/g, ' ') : 'User',
    color: '#0EA5E9',
    icon: '👤'
  };

  const userName = user?.full_name || 'Aditya Sharma';

  return (
    <>
      <header style={{
        height: 52,
        background: '#FFFFFF',
        borderBottom: '1px solid #E5E7EB',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        flexShrink: 0,
        userSelect: 'none',
        position: 'relative',
        zIndex: 50,
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        {/* ── Left: Search & Org Scope ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button
            type="button"
            onClick={() => setIsPaletteOpen(true)}
            style={{
              width: 260,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 12px',
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: 7,
              cursor: 'pointer',
              color: '#64748B',
              fontSize: 12.5,
              transition: 'border-color 120ms ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Search size={13.5} color="#94A3B8" />
              <span style={{ color: '#64748B' }}>Search or type ⌘K</span>
            </div>
            <span style={{
              fontSize: 10.5,
              fontFamily: 'monospace',
              color: '#94A3B8',
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              padding: '1px 5px',
              borderRadius: 4
            }}>
              ⌘K
            </span>
          </button>

          {/* Org & Live Status indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: '#F1F5F9',
              border: '1px solid #E2E8F0',
              padding: '3px 9px',
              borderRadius: 6,
              color: '#334155',
              fontWeight: 600
            }}>
              <Building2 size={12} color="#64748B" />
              <span>Aarohan Group</span>
            </div>

            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              background: '#ECFDF5',
              border: '1px solid #A7F3D0',
              color: '#065F46',
              padding: '2px 8px',
              borderRadius: 9999,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.04em'
            }}>
              <span className="status-beacon-live" />
              STATUTORY AUDIT ACTIVE
            </div>
          </div>
        </div>

        {/* ── Right Controls ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Statutory Workflow Quick Launcher */}
          <button
            onClick={() => setShowJourneyModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: '#F0FDF4',
              color: '#15803D',
              border: '1px solid #BBF7D0',
              padding: '4px 11px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            title="Open Complete ESG Assurance Workflow Guide"
          >
            <Compass size={14} color="#15803D" />
            <span>Assurance Workflow</span>
            <span style={{
              fontSize: 10,
              background: '#DCFCE7',
              color: '#166534',
              padding: '1px 5px',
              borderRadius: 4,
              fontWeight: 700
            }}>
              8 Pillars
            </span>
          </button>

          {/* Period selector badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            padding: '4px 10px',
            borderRadius: 6,
            fontSize: 12,
            color: '#475569',
            fontWeight: 500
          }}>
            <Calendar size={13} color="#64748B" />
            <span>FY 2025–26 (Mar)</span>
          </div>

          {/* Notification Bell */}
          <div style={{ position: 'relative' }} ref={notifMenuRef}>
            <button
              onClick={() => { setShowNotifications(p => !p); if (!showNotifications) fetchNotifications(); }}
              title="Notifications"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#64748B',
                padding: 6,
                display: 'flex',
                alignItems: 'center',
                borderRadius: 6
              }}
            >
              <Bell size={16} />
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute', top: 2, right: 2,
                  minWidth: 14, height: 14, borderRadius: 9999,
                  background: '#EF4444', border: '1.5px solid #FFFFFF',
                  fontSize: 9, fontWeight: 700, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 2px',
                }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div style={{
                position: 'absolute', right: 0, top: 38, width: 340,
                background: '#FFFFFF', border: '1px solid #E2E8F0',
                borderRadius: 8, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.12)',
                zIndex: 200,
              }}>
                <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F1F5F9' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#09090B' }}>
                    Notifications {unreadCount > 0 && <span style={{ color: '#EF4444', fontSize: 11 }}>({unreadCount} new)</span>}
                  </span>
                  {unreadCount > 0 && (
                    <button onClick={handleMarkAllRead} style={{ fontSize: 11, color: '#0284C7', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                      Mark all read
                    </button>
                  )}
                </div>
                <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                  {notifsLoading ? (
                    <div style={{ padding: '16px', textAlign: 'center', color: '#94A3B8', fontSize: 12 }}>Loading…</div>
                  ) : notifications.length === 0 ? (
                    <div style={{ padding: '24px 16px', textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
                      <CheckCircle2 size={24} style={{ marginBottom: 8, opacity: 0.4 }} />
                      <div>All caught up — no unread notifications.</div>
                    </div>
                  ) : (
                    notifications.slice(0, 8).map(notif => (
                      <div
                        key={notif.id}
                        onClick={() => handleNotifClick(notif)}
                        style={{
                          padding: '10px 16px', borderBottom: '1px solid #F8FAFC',
                          cursor: notif.link_url ? 'pointer' : 'default',
                          background: notif.is_read ? '#FFFFFF' : '#EFF6FF',
                        }}
                      >
                        <div style={{ fontSize: 12.5, fontWeight: notif.is_read ? 500 : 700, color: '#1E293B' }}>
                          {notif.title}
                        </div>
                        <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 2 }}>
                          {notif.message}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── User Avatar & Dropdown Menu (Mandatory Spec §4, §25) ── */}
          <div style={{ position: 'relative' }} ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(p => !p)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 6px',
                borderRadius: 7,
                transition: 'background 0.15s ease'
              }}
            >
              <div style={{
                width: 30,
                height: 30,
                borderRadius: '50%',
                background: roleMeta.color || '#0070F3',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: 12
              }}>
                {userName.charAt(0)}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.2 }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: '#09090B' }}>
                  {userName.split(' ')[0]} {userName.split(' ')[1]?.charAt(0)}.
                </span>
                <span style={{ fontSize: 11, color: '#64748B' }}>
                  {roleMeta.label}
                </span>
              </div>
              <ChevronDown size={12} color="#94A3B8" />
            </button>

            {showUserMenu && (
              <div style={{
                position: 'absolute',
                right: 0,
                top: 42,
                width: 290,
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: 10,
                boxShadow: '0 12px 30px -4px rgba(0,0,0,0.12)',
                zIndex: 300,
                overflow: 'hidden',
                animation: 'fadeIn 0.15s ease'
              }}>
                {/* User Info Header */}
                <div style={{ padding: '14px 16px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: 13.5, fontWeight: 800, color: '#0F172A' }}>{userName}</div>
                  <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{user?.email || 'authenticated'}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 9999,
                      background: '#EDE9FE',
                      color: roleMeta.color || '#7C3AED'
                    }}>
                      {roleMeta.icon} {roleMeta.label}
                    </span>
                    <span style={{ fontSize: 11, color: '#94A3B8' }}>Aarohan Scope</span>
                  </div>
                </div>

                {/* Switch Persona Quick Submenu */}
                <div style={{ padding: '8px 12px', borderBottom: '1px solid #F1F5F9' }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                    Switch Account / Role Profile
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                    {ACTIVE_PERSONAS.map(p => (
                      <button
                        key={p.roleKey}
                        onClick={() => handleSwitchPersona(p)}
                        disabled={switchingPersona || user?.email === p.email}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '6px 8px',
                          borderRadius: 6,
                          border: user?.email === p.email ? '1px solid #CBD5E1' : '1px solid transparent',
                          background: user?.email === p.email ? '#F1F5F9' : '#FFFFFF',
                          cursor: user?.email === p.email ? 'default' : 'pointer',
                          fontSize: 11.5,
                          fontWeight: 600,
                          color: user?.email === p.email ? '#0F172A' : '#475569',
                          textAlign: 'left'
                        }}
                      >
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: p.color }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quick Navigation Links */}
                <div style={{ padding: '6px 8px' }}>
                  <button
                    onClick={() => { setShowUserMenu(false); navigate('/admin/users'); }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 10px',
                      background: 'none',
                      border: 'none',
                      borderRadius: 6,
                      fontSize: 12.5,
                      color: '#334155',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <Shield size={14} color="#64748B" />
                    <span>Access Governance & Users</span>
                  </button>

                  <button
                    onClick={() => { setShowUserMenu(false); setShowJourneyModal(true); }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 10px',
                      background: 'none',
                      border: 'none',
                      borderRadius: 6,
                      fontSize: 12.5,
                      color: '#334155',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <Compass size={14} color="#64748B" />
                    <span>Explore Workflow (8 Steps)</span>
                  </button>
                </div>

                {/* Mandatory Logout Button */}
                <div style={{ padding: '6px 8px', borderTop: '1px solid #F1F5F9', background: '#FAFAFA' }}>
                  <button
                    onClick={handleLogout}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 10px',
                      background: 'none',
                      border: 'none',
                      borderRadius: 6,
                      fontSize: 12.5,
                      fontWeight: 600,
                      color: '#DC2626',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <LogOut size={14} color="#DC2626" />
                    <span>Sign Out (Logout)</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <CommandPalette isOpen={isPaletteOpen} onClose={() => setIsPaletteOpen(false)} />
      </header>

      {/* ── Platform Assurance Workflow Guided Navigation Modal ── */}
      {showJourneyModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(9, 9, 11, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 20
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: 12,
            maxWidth: 720,
            width: '100%',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            border: '1px solid #E2E8F0',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '90vh'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '18px 24px',
              borderBottom: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#F8FAFC'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: '#0070F3',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff'
                }}>
                  <Compass size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#09090B' }}>
                    Aarohan ESG Platform — Platform Workflow Architecture
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748B' }}>
                    Follow the complete workflow from raw site evidence to consolidated BRSR disclosure
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowJourneyModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', padding: 4 }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body: Scrollable Journey Grid */}
            <div style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{
                background: '#EFF6FF',
                border: '1px solid #BFDBFE',
                borderRadius: 8,
                padding: '12px 16px',
                fontSize: 12.5,
                color: '#1E40AF',
                lineHeight: 1.5
              }}>
                <strong>Platform Architecture &amp; Workflow Guide:</strong> Click any step below to inspect the live interface. Notice that project site engineers provide raw measurements, while the system deterministically calculates carbon intensities and rolls them up through the organizational boundary.
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 10, marginTop: 6 }}>
                {PLATFORM_JOURNEY_STEPS.map((s, idx) => {
                  const Icon = s.icon;
                  const isCurrent = location.pathname.startsWith(s.route);
                  return (
                    <div
                      key={s.step}
                      onClick={() => {
                        setShowJourneyModal(false);
                        navigate(s.route);
                      }}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 8,
                        border: isCurrent ? '1.5px solid #09090B' : '1px solid #E2E8F0',
                        background: isCurrent ? '#F8FAFC' : '#FFFFFF',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 12,
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{
                        fontSize: 12,
                        fontFamily: 'monospace',
                        fontWeight: 800,
                        color: isCurrent ? '#09090B' : '#94A3B8',
                        background: isCurrent ? '#E2E8F0' : '#F1F5F9',
                        padding: '4px 7px',
                        borderRadius: 6
                      }}>
                        {s.step}
                      </div>

                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 13.5, fontWeight: 700, color: '#0F172A' }}>{s.title}</span>
                          <span style={{
                            fontSize: 10.5,
                            fontWeight: 600,
                            color: '#64748B',
                            background: '#F1F5F9',
                            padding: '1px 6px',
                            borderRadius: 4
                          }}>
                            {s.role}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{s.desc}</div>
                      </div>

                      <ArrowRight size={14} color="#94A3B8" style={{ marginTop: 4 }} />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '14px 24px',
              borderTop: '1px solid #E2E8F0',
              background: '#F8FAFC',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span style={{ fontSize: 12, color: '#64748B' }}>
                Active Entity: <strong>Aarohan Infrastructure & Energy Group (FY 2025–26)</strong>
              </span>
              <button
                onClick={() => setShowJourneyModal(false)}
                style={{
                  padding: '7px 16px',
                  borderRadius: 6,
                  border: '1px solid #D1D5DB',
                  background: '#FFFFFF',
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: '#374151',
                  cursor: 'pointer'
                }}
              >
                Close Guide
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
