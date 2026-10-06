import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Building2, BookOpen, FileText,
  GitBranch, BarChart3, FileBarChart, Leaf,
  UserCheck, LogOut, ShieldCheck, Eye, ClipboardCheck,
  FolderOpen, Layers, Settings2
} from 'lucide-react';
import { useAuth, ROLE_META } from '../context/AuthContext';

/*
 * NAV CONFIG — Each item declares which permissions are needed to see it.
 * If `perms` is empty/undefined the item is visible to all authenticated users.
 * Section labels get `section: true`.
 */
const NAV_CONFIG = [
  // ── Dashboard ─────────────────────────────────────────────────
  {
    label: 'Overview',
    icon: LayoutDashboard,
    to: '/dashboard',
    perms: [],  // everyone sees the dashboard
  },

  // ── ADMINISTRATION ────────────────────────────────────────────
  { section: true, label: 'ADMINISTRATION', perms: ['user:manage'] },
  {
    label: 'User Provisioning',
    icon: UserCheck,
    to: '/admin/users',
    perms: ['user:manage'],
  },

  // ── ORG & METRICS ─────────────────────────────────────────────
  { section: true, label: 'CONFIGURATION', perms: ['org:read'] },
  {
    label: 'Org Hierarchy',
    icon: Building2,
    to: '/org',
    perms: ['org:read'],
  },
  {
    label: 'Metric Catalogue',
    icon: BookOpen,
    to: '/metrics',
    perms: ['metric:read'],
  },

  // ── DATA COLLECTION ───────────────────────────────────────────
  { section: true, label: 'DATA COLLECTION', perms: ['submission:create', 'submission:read'] },
  {
    label: 'Data Entry',
    icon: FileText,
    to: '/collection',
    perms: ['form:submit', 'submission:create'],
  },
  {
    label: 'Evidence Vault',
    icon: FolderOpen,
    to: '/evidence',
    perms: ['evidence:read'],
  },

  // ── ASSURANCE / WORKFLOW ──────────────────────────────────────
  { section: true, label: 'ASSURANCE', perms: ['submission:review', 'form:review', 'audit:read', 'assurance:write'] },
  {
    label: 'Workflow & Approvals',
    icon: GitBranch,
    to: '/workflow',
    perms: ['submission:review', 'form:review', 'submission:read'],
  },

  // ── REPORTING ─────────────────────────────────────────────────
  { section: true, label: 'REPORTING', perms: ['report:read'] },
  {
    label: 'Consolidation',
    icon: Layers,
    to: '/consolidation',
    perms: ['consolidation:read'],
  },
  {
    label: 'BRSR Report',
    icon: FileBarChart,
    to: '/reporting',
    perms: ['report:read'],
  },
];

function userCanSee(item, hasPermission) {
  if (!item.perms || item.perms.length === 0) return true;
  return item.perms.some((p) => hasPermission(p));
}

function getInitials(name) {
  if (!name) return 'U';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

export default function Sidebar() {
  const navigate = useNavigate();
  const { user, logout, hasPermission, role, roleMeta } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/landing');
  };

  // Build a filtered list based on current user's permissions
  const visibleItems = NAV_CONFIG.filter((item) => userCanSee(item, hasPermission));

  // Remove orphan section labels (section with no visible items below it)
  const cleanedItems = visibleItems.filter((item, idx) => {
    if (!item.section) return true;
    // Look ahead — is there at least one non-section item before the next section?
    const rest = visibleItems.slice(idx + 1);
    const nextSectionIdx = rest.findIndex((x) => x.section);
    const itemsBetween = nextSectionIdx === -1 ? rest : rest.slice(0, nextSectionIdx);
    return itemsBetween.length > 0;
  });

  return (
    <aside className="sidebar anim-slide">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Leaf size={18} color="#fff" />
        </div>
        <div className="sidebar-logo-text">
          <span className="sidebar-logo-title">MEIL ESG Portal</span>
          <span className="sidebar-logo-sub">BRSR · FY 2024-25</span>
        </div>
      </div>

      {/* Role Badge */}
      {roleMeta && (
        <div className="sidebar-role-badge" style={{ borderColor: roleMeta.color + '55' }}>
          <span className="sidebar-role-icon">{roleMeta.icon}</span>
          <span className="sidebar-role-label" style={{ color: roleMeta.color }}>
            {roleMeta.label}
          </span>
        </div>
      )}

      {/* Nav */}
      <nav className="sidebar-nav">
        {cleanedItems.map((item, i) => {
          if (item.section) {
            return (
              <span key={`sec-${i}`} className="nav-section-label">
                {item.label}
              </span>
            );
          }
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/dashboard'}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              <Icon size={15} className="nav-item-icon" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer user card & Sign Out */}
      <div className="sidebar-footer">
        <div className="user-card">
          <div className="user-avatar">
            {getInitials(user?.full_name || user?.email)}
          </div>
          <div className="user-info">
            <div className="user-name truncate" title={user?.full_name || user?.email}>
              {user?.full_name || user?.email || 'Authenticated User'}
            </div>
            <div className="user-role" style={{ textTransform: 'capitalize', color: roleMeta?.color }}>
              {roleMeta?.label || (user?.role?.replace(/_/g, ' ')) || 'Employee'}
            </div>
          </div>
          <button
            className="icon-btn text-rose"
            onClick={handleLogout}
            title="Sign Out of Portal"
            style={{ marginLeft: 'auto' }}
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
