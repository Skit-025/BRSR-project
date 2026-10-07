import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Building2, BookOpen, FileText,
  GitBranch, BarChart3, FileBarChart, Settings, Leaf, ChevronRight
} from 'lucide-react';

const NAV = [
  { label: 'Overview',       icon: LayoutDashboard, to: '/' },
  { label: 'Divider' },
  { label: 'DATA COLLECTION' },
  { label: 'Org Hierarchy',  icon: Building2,    to: '/org' },
  { label: 'Metric Catalogue', icon: BookOpen,   to: '/metrics' },
  { label: 'Data Entry',     icon: FileText,     to: '/collection' },
  { label: 'Divider' },
  { label: 'ASSURANCE' },
  { label: 'Evidence Vault', icon: FileBarChart, to: '/evidence' },
  { label: 'Workflow',       icon: GitBranch,    to: '/workflow' },
  { label: 'Divider' },
  { label: 'REPORTING' },
  { label: 'Consolidation',  icon: BarChart3,    to: '/consolidation' },
  { label: 'BRSR Report',    icon: FileBarChart, to: '/reporting' },
  { label: 'Divider' },
  { label: 'AI GOVERNANCE' },
  { label: 'Aarohan Review', icon: BarChart3,    to: '/ai-review' },
];

export default function Sidebar() {
  return (
    <aside className="sidebar anim-slide">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Leaf size={18} color="#fff" />
        </div>
        <div className="sidebar-logo-text">
          <span className="sidebar-logo-title">MEIL ESG Portal</span>
          <span className="sidebar-logo-sub">BRSR Â· FY 2024-25</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {NAV.map((item, i) => {
          if (item.label === 'Divider') return <div key={i} className="divider" />;
          if (!item.to) return (
            <span key={i} className="nav-section-label">{item.label}</span>
          );
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              <Icon size={15} className="nav-item-icon" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer user card */}
      <div className="sidebar-footer">
        <div className="user-card">
          <div className="user-avatar">AM</div>
          <div className="user-info">
            <div className="user-name truncate">Admin User</div>
            <div className="user-role">ESG Manager</div>
          </div>
          <Settings size={14} color="var(--text-muted)" />
        </div>
      </div>
    </aside>
  );
}

