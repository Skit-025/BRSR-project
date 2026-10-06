import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Bell, HelpCircle, User, ChevronDown, CheckCircle2,
  ExternalLink, Command
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import CommandPalette from './CommandPalette';

export default function Header() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

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

      {/* ── Right Controls: Methodology pill, Help, Bell, User ── */}
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
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#64748B',
            padding: 4,
            display: 'flex',
            alignItems: 'center',
            borderRadius: '50%'
          }}
        >
          <HelpCircle size={16} />
        </button>

        {/* Notification Bell */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowNotifications(p => !p)}
            title="Notifications"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#64748B',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
              position: 'relative'
            }}
          >
            <Bell size={16} />
            {/* Red alert dot */}
            <span style={{
              position: 'absolute',
              top: 3,
              right: 3,
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: '#EF4444',
              border: '1.5px solid #FFFFFF'
            }} />
          </button>

          {showNotifications && (
            <div style={{
              position: 'absolute',
              right: 0,
              top: 32,
              width: 320,
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: 8,
              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
              zIndex: 100,
              padding: '12px'
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#09090B', marginBottom: 8 }}>
                Notifications
              </div>
              <div style={{ fontSize: 11.5, color: '#475569', lineHeight: 1.5, padding: '8px 0', borderBottom: '1px solid #F1F5F9' }}>
                <strong>Project P-103 Highway</strong> submitted Q2 diesel logs awaiting review.
              </div>
              <div style={{ fontSize: 11.5, color: '#475569', lineHeight: 1.5, padding: '8px 0' }}>
                <strong>Manufacturing BU</strong> has 4 flagged variances exceeding 5% standard deviation.
              </div>
            </div>
          )}
        </div>

        {/* User Profile */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          paddingLeft: 6,
          borderLeft: '1px solid #E5E7EB'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: 1.2 }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: '#09090B' }}>
              {userName}
            </span>
            <span style={{ fontSize: 11, color: '#64748B' }}>
              {userRole}
            </span>
          </div>

          {/* User circular avatar */}
          <div style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: '#09090B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF'
          }}>
            <User size={15} />
          </div>
        </div>
      </div>

      <CommandPalette isOpen={isPaletteOpen} onClose={() => setIsPaletteOpen(false)} />
    </header>
  );
}
