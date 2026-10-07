import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Bell, HelpCircle, User, CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import CommandPalette from './CommandPalette';
import { notificationsApi } from '../api/client';

export default function Header() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifsLoading, setNotifsLoading] = useState(false);

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

  // Fetch real notifications for the current user
  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;
    setNotifsLoading(true);
    try {
      const res = await notificationsApi.listForUser(user.id);
      const notifs = Array.isArray(res.data) ? res.data : [];
      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.is_read).length);
    } catch {
      // Silently ignore — notifications are non-critical
    } finally {
      setNotifsLoading(false);
    }
  }, [user?.id]);

  // Fetch on mount and every 60 seconds
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

  const userName = user?.full_name || 'Aditya S.';
  const userRole = user?.role === 'system_admin' || user?.role === 'group_esg_manager'
    ? 'ESG Director'
    : (user?.role ? user.role.replace(/_/g, ' ') : 'ESG Lead');

  return (
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
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* ── Left: Search Box ── */}
      <div style={{ display: 'flex', alignItems: 'center', width: 340 }}>
        <button
          type="button"
          onClick={() => setIsPaletteOpen(true)}
          style={{
            width: '100%',
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
      </div>

      {/* ── Right Controls ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {/* Methodology badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: '#DCFCE7',
          color: '#15803D',
          border: '1px solid #BBF7D0',
          padding: '3px 10px',
          borderRadius: 9999,
          fontSize: 11.5,
          fontWeight: 600,
          cursor: 'pointer'
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981' }} />
          <span>Methodology v2.1</span>
        </div>

        {/* Help icon */}
        <button
          title="Regulatory & Documentation Help"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', padding: 4, display: 'flex', alignItems: 'center', borderRadius: '50%' }}
        >
          <HelpCircle size={16} />
        </button>

        {/* Notification Bell — connected to real backend */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => { setShowNotifications(p => !p); if (!showNotifications) fetchNotifications(); }}
            title="Notifications"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', padding: 4, display: 'flex', alignItems: 'center', position: 'relative' }}
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: 0, right: 0,
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
              position: 'absolute', right: 0, top: 32, width: 340,
              background: '#FFFFFF', border: '1px solid #E2E8F0',
              borderRadius: 8, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
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
              <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                {notifsLoading ? (
                  <div style={{ padding: '16px', textAlign: 'center', color: '#94A3B8', fontSize: 12 }}>Loading…</div>
                ) : notifications.length === 0 ? (
                  <div style={{ padding: '24px 16px', textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
                    <CheckCircle2 size={24} style={{ marginBottom: 8, opacity: 0.4 }} />
                    <div>All caught up — no notifications.</div>
                  </div>
                ) : (
                  notifications.slice(0, 10).map(notif => (
                    <div
                      key={notif.id}
                      onClick={() => handleNotifClick(notif)}
                      style={{
                        padding: '10px 16px', borderBottom: '1px solid #F8FAFC',
                        cursor: notif.link_url ? 'pointer' : 'default',
                        background: notif.is_read ? '#FFFFFF' : '#EFF6FF',
                        transition: 'background 0.15s',
                      }}
                    >
                      <div style={{ fontSize: 12.5, fontWeight: notif.is_read ? 500 : 700, color: '#1E293B', lineHeight: 1.4 }}>
                        {notif.title}
                      </div>
                      <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 2, lineHeight: 1.4 }}>
                        {notif.message}
                      </div>
                      {!notif.is_read && (
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#3B82F6', display: 'inline-block', marginTop: 4 }} />
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 6, borderLeft: '1px solid #E5E7EB' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: 1.2 }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: '#09090B' }}>{userName}</span>
            <span style={{ fontSize: 11, color: '#64748B' }}>{userRole}</span>
          </div>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#09090B', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF' }}>
            <User size={15} />
          </div>
        </div>
      </div>

      <CommandPalette isOpen={isPaletteOpen} onClose={() => setIsPaletteOpen(false)} />
    </header>
  );
}
