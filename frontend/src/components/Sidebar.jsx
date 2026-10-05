import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Building2, BookOpen, FileText,
  GitBranch, BarChart3, FileBarChart, Settings, Leaf,
  UserCheck, ShieldAlert, LogOut, ArrowLeft
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar() {
  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/landing');
  };

  const navItems = [
    { label: 'Overview', icon: LayoutDashboard, to: '/' },
    ...(isAdmin ? [
      { label: 'ADMINISTRATION' },
      { label: 'User Provisioning', icon: UserCheck, to: '/admin/users' },
    ] : []),
    { label: 'DATA COLLECTION' },
    { label: 'Org Hierarchy', icon: Building2, to: '/org' },
    { label: 'Metric Catalogue', icon: BookOpen, to: '/metrics' },
    { label: 'Data Entry', icon: FileText, to: '/collection' },
    { label: 'ASSURANCE' },
    { label: 'Evidence Vault', icon: FileBarChart, to: '/evidence' },
    { label: 'Workflow', icon: GitBranch, to: '/workflow' },
    { label: 'REPORTING' },
    { label: 'Consolidation', icon: BarChart3, to: '/consolidation' },
    { label: 'BRSR Report', icon: FileBarChart, to: '/reporting' },
  ];

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

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

      {/* Nav */}
      <nav className="sidebar-nav">
        {navItems.map((item, i) => {
          if (!item.to) {
            return (
              <span key={i} className="nav-section-label">{item.label}</span>
            );
          }
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
            <div className="user-role" style={{ textTransform: 'capitalize' }}>
              {user?.role?.replace('_', ' ') || 'Employee'}
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
