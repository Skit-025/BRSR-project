import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Building2, BookOpen, FileText,
  GitBranch, FileBarChart, Leaf, ChevronLeft, ChevronRight,
  ShieldCheck, FolderOpen, Layers, Settings2, Sliders,
  CheckCircle2, AlertCircle, Database, History, Cpu
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NAV_SECTIONS = [
  {
    title: '',
    items: [
      { label: 'Overview', icon: LayoutDashboard, to: '/dashboard' },
    ],
  },
  {
    title: 'ORGANIZATION',
    items: [
      { label: 'Organization', icon: Building2, to: '/org' },
      { label: 'Projects', icon: Layers, to: '/projects' },
    ],
  },
  {
    title: 'ESG',
    items: [
      { label: 'ESG Data', icon: FileText, to: '/collection' },
      { label: 'Parameters', icon: Sliders, to: '/parameters' },
      { label: 'Templates', icon: BookOpen, to: '/templates' },
      { label: 'Evidence', icon: FolderOpen, to: '/evidence' },
    ],
  },
  {
    title: 'WORKFLOW',
    items: [
      { label: 'Reviews', icon: GitBranch, to: '/workflow' },
    ],
  },
  {
    title: 'REPORTING',
    items: [
      { label: 'Reports', icon: FileBarChart, to: '/reporting?tab=reports' },
      { label: 'BRSR', icon: Database, to: '/reporting' },
      { label: 'Calculations', icon: Cpu, to: '/calculations' },
    ],
  },
  {
    title: 'SYSTEM',
    items: [
      { label: 'Data Quality', icon: AlertCircle, to: '/data-quality' },
      { label: 'Audit Log', icon: History, to: '/audit-log' },
    ],
  },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, roleMeta } = useAuth();
  const navigate = useNavigate();

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Sidebar Header */}
      <div className="sidebar-header">
        {!collapsed && (
          <NavLink to="/dashboard" className="sidebar-logo">
            <div className="sidebar-logo-icon">▲</div>
            <div className="sidebar-logo-text">
              <span className="sidebar-logo-title">Enterprise ESG</span>
              <span className="sidebar-logo-sub">OS v2.4 · SEBI Core</span>
            </div>
          </NavLink>
        )}
        <button 
          className="sidebar-collapse-btn" 
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>
      </div>

      {/* Navigation Sections */}
      <nav className="sidebar-nav">
        {NAV_SECTIONS.map((sec, i) => (
          <React.Fragment key={i}>
            {!collapsed && sec.title && (
              <span className="nav-section-label">{sec.title}</span>
            )}
            {sec.items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/dashboard'}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon size={14} className="nav-item-icon" />
                  {!collapsed && <span>{item.label}</span>}
                </NavLink>
              );
            })}
          </React.Fragment>
        ))}
      </nav>

      {/* Footer User Info */}
      {!collapsed && (
        <div className="sidebar-footer">
          <div className="user-card">
            <div className="user-avatar">
              {user?.full_name ? user.full_name.charAt(0) : 'A'}
            </div>
            <div className="user-info">
              <div className="user-name" title={user?.full_name}>
                {user?.full_name || 'Aditya Varma'}
              </div>
              <div className="user-role">
                {user?.title || 'Group ESG Executive'}
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
