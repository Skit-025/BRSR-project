import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, Bell, RefreshCw, LogOut, User, Shield, FlaskConical } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';

const LABELS = {
  '/':            ['Dashboard'],
  '/admin/users': ['Administration', 'User Provisioning'],
  '/org':         ['Org Hierarchy'],
  '/metrics':     ['Metric Catalogue'],
  '/collection':  ['Data Entry'],
  '/evidence':    ['Evidence Vault'],
  '/workflow':    ['Workflow & Approvals'],
  '/consolidation':['Consolidation Engine'],
  '/reporting':   ['BRSR Report'],
};

export default function Header() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user, logout, mockMode, exitMockMode } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const crumbs = LABELS[pathname] || [pathname.replace('/', '')];

  const handleLogout = () => {
    logout();
    navigate('/landing');
  };

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      await qc.invalidateQueries();
    } finally {
      setTimeout(() => setIsRefreshing(false), 750);
    }
  };

  return (
    <header className="header">
      {/* Breadcrumb */}
      <div className="header-breadcrumb">
        <span className="crumb">MEIL ESG</span>
        <span className="crumb-sep">
          <svg width="12" height="12" viewBox="0 0 12 12">
            <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
          </svg>
        </span>
        {crumbs.map((c, i) => (
          <span key={i} className={i === crumbs.length - 1 ? 'crumb-current' : 'crumb'}>{c}</span>
        ))}
      </div>

      <div className="header-spacer" />

      {/* Mock Mode Alert Banner */}
      {mockMode && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.35)', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', color: '#f59e0b' }}>
          <FlaskConical size={13} />
          <span style={{ fontWeight: 600 }}>Demo / Mock Mode</span>
          <button 
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              exitMockMode();
              navigate('/login');
            }}
            style={{ padding: '2px 8px', fontSize: '11px', height: '22px', border: '1px solid rgba(245, 158, 11, 0.4)' }}
          >
            Exit to Live Mode
          </button>
        </div>
      )}

      {/* User profile pill */}
      {user && (
        <div className="header-user-pill">
          <div className="header-user-role-badge">
            {user.role === 'system_admin' ? (
              <Shield size={12} color="var(--rose-400)" />
            ) : (
              <User size={12} color="var(--brand-400)" />
            )}
            <span>{user.role?.replace('_', ' ').toUpperCase()}</span>
          </div>
          <span className="header-user-id" title={user.email}>
            {user.email}
          </span>
        </div>
      )}

      {/* Refresh */}
      <button 
        className="icon-btn" 
        onClick={handleRefresh} 
        disabled={isRefreshing}
        title="Refresh all data across workspace"
      >
        <RefreshCw size={14} className={isRefreshing ? 'spin' : ''} />
      </button>

      {/* Logout button */}
      <button className="icon-btn text-rose" onClick={handleLogout} title="Sign Out">
        <LogOut size={14} />
      </button>

      {/* API status */}
      <div className="status-dot" title="Backend connected" />
    </header>
  );
}
