import React, { useState, useMemo } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Building2, BookOpen, Layers,
  ChevronDown, LogOut, BarChart3,
  Shield, GitMerge, PenLine,
  AlertTriangle, ClipboardList,
  FileSpreadsheet, ClipboardCheck,
  Settings, Command,
  HardHat, Factory, Truck, RefreshCw, Leaf
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useOrgPeriods, useOrgNodes, useWorkflowQueue } from '../hooks/useApi';

export default function Sidebar() {
  const navigate = useNavigate();
  const { user, logout, role, hasPermission } = useAuth();
  const { data: nodes = [] } = useOrgNodes();
  const { data: wfQueue = [] } = useWorkflowQueue();

  // Live entity list: derive meaningful display names from org nodes
  const entityOptions = useMemo(() => {
    const ordered = [];
    const grouped = { group: [], company: [], subsidiary: [], business_unit: [], bu: [], project: [], site: [] };
    nodes.forEach(n => { if (grouped[n.type]) grouped[n.type].push(n); });
    [...grouped.group, ...grouped.company, ...grouped.subsidiary,
     ...grouped.business_unit, ...grouped.bu,
     ...grouped.project, ...grouped.site
    ].forEach(n => ordered.push({ id: n.id, label: n.name, type: n.type }));
    return ordered.slice(0, 12); // max 12 in dropdown
  }, [nodes]);

  const [selectedEntity, setSelectedEntity] = useState('');
  const [entityMenuOpen, setEntityMenuOpen] = useState(false);

  // Pending reviews count from live queue
  const pendingReviewsCount = useMemo(() => {
    return wfQueue.filter(item => ['SUBMITTED', 'UNDER_BU_REVIEW'].includes(item.status)).length;
  }, [wfQueue]);

  const handleLogout = () => {
    logout();
    navigate('/landing');
  };

  // Role-filtered navigation
  const navGroups = useMemo(() => {
    const groups = [
      {
        section: 'OVERVIEW',
        items: [
          { to: '/dashboard', label: 'Group Overview', icon: LayoutDashboard, perm: null }
        ]
      },
      {
        section: 'ORGANIZATION',
        items: [
          hasPermission('subsidiary_disclosure:read') && { to: '/disclosure/subsidiary', label: 'Subsidiaries', icon: Building2 },
          hasPermission('bu_disclosure:read') && { to: '/disclosure/bu', label: 'Business Units', icon: Factory },
          { to: '/projects', label: 'Projects', icon: HardHat },
        ].filter(Boolean)
      },
      {
        section: 'ESG WORKSPACE',
        items: [
          hasPermission('form:submit') && { to: '/collection', label: 'Data Collection', icon: PenLine },
          { to: '/metrics', label: 'Parameters', icon: BookOpen },
          hasPermission('evidence:read') && { to: '/evidence', label: 'Evidence Repository', icon: ClipboardList },
          hasPermission('report:read') && { to: '/valuechain', label: 'Value Chain (75%)', icon: Truck },
        ].filter(Boolean)
      },
      hasPermission('submission:review') && {
        section: 'WORKFLOW',
        items: [
          { to: '/workflow', label: 'Reviews', icon: GitMerge, badge: pendingReviewsCount > 0 ? String(pendingReviewsCount) : null },
          hasPermission('consolidation:read') && { to: '/consolidation', label: 'Calculation Pipeline', icon: Layers },
          { to: '/data-quality', label: 'Data Quality & Desk', icon: AlertTriangle },
        ].filter(Boolean)
      },
      hasPermission('report:read') && {
        section: 'REPORTING',
        items: [
          { to: '/reporting', label: 'BRSR Disclosures', icon: FileSpreadsheet },
          hasPermission('group_disclosure:read') && { to: '/disclosure/group', label: 'Consolidated Reports', icon: BarChart3 },
          hasPermission('audit:read') && { to: '/assurance', label: 'Reasonable Assurance', icon: ClipboardCheck },
          hasPermission('audit:read') && { to: '/audit', label: 'Audit Trail', icon: Shield },
        ].filter(Boolean)
      },
      (hasPermission('ai:e1:use') || hasPermission('ai:e2:use') || hasPermission('ai:e3:use') || hasPermission('ai:e4:use') || hasPermission('ai:e5:use') || hasPermission('ai:e6:use') || hasPermission('ai:e7:use')) && {
        section: 'AI ASSISTANCE',
        items: [
          { to: '/aarohan', label: 'Ask AAROHAN AI', icon: Command },
        ]
      },
      (hasPermission('user:manage') || hasPermission('consolidation:read')) && {
        section: 'ADMINISTRATION',
        items: [
          hasPermission('user:manage') && { to: '/admin/users', label: 'User Governance', icon: Settings },
          hasPermission('consolidation:read') && { to: '/admin/jobs', label: 'Pipeline Tasks', icon: RefreshCw },
        ].filter(Boolean)
      },
    ].filter(Boolean);
    return groups.filter(g => g.items && g.items.length > 0);
  }, [hasPermission, pendingReviewsCount]);

  const initials = user?.full_name
    ? user.full_name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
    : (user?.email?.[0] || 'U').toUpperCase();

  return (
    <aside style={{
      width: 240,
      flexShrink: 0,
      background: '#FFFFFF',
      borderRight: '1px solid #EAEAEA',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      userSelect: 'none',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      position: 'relative',
      zIndex: 20,
    }}>

      {/* ── Brand Logo Bar ── */}
      <div style={{
        padding: '14px 14px 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #F1F5F9'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          {/* Logo mark */}
          <div style={{
            width: 28,
            height: 28,
            borderRadius: 7,
            background: 'linear-gradient(135deg, #0070F3 0%, #10B981 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 1px 3px rgba(0, 112, 243, 0.25)',
          }}>
            <Leaf size={14} color="#FFFFFF" />
          </div>
          <div>
            <span style={{
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: '-0.01em',
              color: '#09090B',
              fontFamily: 'Inter, sans-serif',
              display: 'block',
              lineHeight: 1.1,
            }}>
              AAROHAN ESG
            </span>
            <span style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.06em',
              color: '#94A3B8',
              textTransform: 'uppercase',
              display: 'block',
              lineHeight: 1.2,
              marginTop: 1,
            }}>
              SEBI BRSR CORE
            </span>
          </div>
        </div>

        {/* Live indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span className="status-beacon-live" />
        </div>
      </div>

      {/* ── Entity Selection Pill ── */}
      <div style={{ padding: '10px 12px 6px', position: 'relative' }}>
        <button
          onClick={() => setEntityMenuOpen(p => !p)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '7px 10px',
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: 7,
            fontSize: 12,
            fontWeight: 600,
            color: '#0F172A',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.background = '#FFFFFF'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.background = '#F8FAFC'; }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, overflow: 'hidden' }}>
            <Building2 size={13} color="#64748B" />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {selectedEntity
                ? (entityOptions.find(e => e.id === selectedEntity)?.label || selectedEntity)
                : (user?.full_name?.split(' ')[0] + "'s View" || 'Select Entity')}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', color: '#94A3B8' }}>
            <ChevronDown size={11} />
          </div>
        </button>

        {entityMenuOpen && (
          <div style={{
            position: 'absolute',
            top: 46,
            left: 12,
            right: 12,
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 8,
            boxShadow: '0 8px 24px -4px rgba(0,0,0,0.12)',
            zIndex: 100,
            padding: '4px',
            fontSize: 12,
            maxHeight: 220,
            overflowY: 'auto'
          }}>
            {entityOptions.length > 0 ? entityOptions.map((e) => (
              <div
                key={e.id}
                onClick={() => { setSelectedEntity(e.id); setEntityMenuOpen(false); }}
                style={{
                  padding: '7px 10px',
                  borderRadius: 5,
                  cursor: 'pointer',
                  color: selectedEntity === e.id ? '#09090B' : '#475569',
                  background: selectedEntity === e.id ? '#F1F5F9' : 'transparent',
                  fontWeight: selectedEntity === e.id ? 700 : 500,
                  transition: 'background 0.1s',
                }}
                onMouseEnter={(ev) => { if (selectedEntity !== e.id) ev.currentTarget.style.background = '#F8FAFC'; }}
                onMouseLeave={(ev) => { if (selectedEntity !== e.id) ev.currentTarget.style.background = 'transparent'; }}
              >
                {e.label}
              </div>
            )) : (
              <div style={{ padding: '7px 10px', color: '#94A3B8', fontSize: 11 }}>Loading entities...</div>
            )}
          </div>
        )}
      </div>

      {/* ── Navigation Tree ── */}
      <nav style={{
        flex: 1,
        overflowY: 'auto',
        padding: '4px 8px',
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
      }}>
        {navGroups.map((grp) => (
          <div key={grp.section} style={{ marginBottom: 4 }}>
            <div style={{
              fontSize: 9.5,
              fontWeight: 700,
              letterSpacing: '0.08em',
              color: '#C1C7D0',
              padding: '8px 8px 3px',
              textTransform: 'uppercase',
            }}>
              {grp.section}
            </div>
            {grp.items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  style={({ isActive }) => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 8px',
                    borderRadius: 6,
                    fontSize: 12.5,
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? '#09090B' : '#64748B',
                    background: isActive ? '#F1F5F9' : 'transparent',
                    textDecoration: 'none',
                    marginBottom: 1,
                    transition: 'all 120ms ease',
                    borderLeft: isActive ? '2px solid #09090B' : '2px solid transparent',
                    paddingLeft: isActive ? 6 : 8,
                  })}
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        size={14}
                        color={isActive ? '#09090B' : '#94A3B8'}
                        style={{ flexShrink: 0 }}
                      />
                      <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.label}
                      </span>
                      {item.badge && (
                        <span style={{
                          background: '#DCFCE7',
                          color: '#15803D',
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: 9999,
                          border: '1px solid #BBF7D0',
                          animation: 'statusPulse 2s ease-in-out infinite',
                        }}>
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* ── Bottom Section ── */}
      <div style={{
        padding: '10px 12px 14px',
        borderTop: '1px solid #F1F5F9',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}>
        {/* Data Quality Bar */}
        <div style={{
          background: '#F8FAFC',
          border: '1px solid #E2E8F0',
          borderRadius: 8,
          padding: '9px 11px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Assurance Score</span>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#10B981', fontFamily: 'JetBrains Mono, monospace' }}>94.2%</span>
          </div>
          <div style={{ height: 4, width: '100%', background: '#E2E8F0', borderRadius: 99, overflow: 'hidden', marginBottom: 5 }}>
            <div style={{
              height: '100%',
              width: '94.2%',
              background: 'linear-gradient(90deg, #10B981, #059669)',
              borderRadius: 99,
              transition: 'width 1s ease',
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#94A3B8' }}>
            <span>Target: 96%</span>
            <span style={{ color: '#10B981', fontWeight: 600 }}>● Audited</span>
          </div>
        </div>

        {/* Settings & Command Menu */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <button
            onClick={() => navigate('/admin/users')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 8px',
              borderRadius: 6,
              background: 'none',
              border: 'none',
              fontSize: 12,
              fontWeight: 500,
              color: '#64748B',
              cursor: 'pointer',
              width: '100%',
              textAlign: 'left',
              transition: 'background 0.12s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#F1F5F9'; e.currentTarget.style.color = '#09090B'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#64748B'; }}
          >
            <Settings size={13} color="currentColor" />
            <span>Settings</span>
          </button>

          <div
            onClick={() => {
              const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true });
              window.dispatchEvent(event);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 8px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 500,
              color: '#64748B',
              cursor: 'pointer',
              transition: 'background 0.12s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#F1F5F9'; e.currentTarget.style.color = '#09090B'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#64748B'; }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Command size={13} color="currentColor" />
              <span>Command Menu</span>
            </div>
            <span style={{
              fontSize: 10,
              color: '#94A3B8',
              background: '#F1F5F9',
              border: '1px solid #E2E8F0',
              padding: '1px 5px',
              borderRadius: 4,
              fontFamily: 'JetBrains Mono, monospace',
            }}>
              ⌘K
            </span>
          </div>

          {/* User Profile & Logout Row */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 4,
            padding: '6px 8px',
            borderRadius: 6,
            border: '1px solid #F1F5F9',
            background: '#FAFAFA',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{
                width: 26,
                height: 26,
                borderRadius: '50%',
                background: '#0070F3',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10,
                fontWeight: 700,
                flexShrink: 0,
              }}>
                {initials}
              </div>
              <div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: '#09090B', lineHeight: 1.2 }}>
                  {user?.full_name?.split(' ')[0] || 'User'}
                </div>
                <div style={{ fontSize: 10, color: '#94A3B8', lineHeight: 1.2 }}>
                  {role?.replace(/_/g, ' ') || 'Authenticated'}
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#94A3B8',
                padding: 4,
                borderRadius: 5,
                display: 'flex',
                alignItems: 'center',
                transition: 'all 0.12s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#FEF2F2'; e.currentTarget.style.color = '#EF4444'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#94A3B8'; }}
              title="Sign Out"
            >
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
