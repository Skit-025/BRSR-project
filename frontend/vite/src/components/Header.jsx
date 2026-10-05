import { useLocation } from 'react-router-dom';
import { Search, Bell, RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

const LABELS = {
  '/':            ['Dashboard'],
  '/org':         ['Org Hierarchy'],
  '/metrics':     ['Metric Catalogue'],
  '/collection':  ['Data Entry'],
  '/evidence':    ['Evidence Vault'],
  '/workflow':    ['Workflow'],
  '/consolidation':['Consolidation'],
  '/reporting':   ['BRSR Report'],
};

export default function Header() {
  const { pathname } = useLocation();
  const qc = useQueryClient();
  const crumbs = LABELS[pathname] || [pathname.replace('/', '')];

  return (
    <header className="header">
      {/* Breadcrumb */}
      <div className="header-breadcrumb">
        <span className="crumb">MEIL ESG</span>
        <span className="crumb-sep"><svg width="12" height="12" viewBox="0 0 12 12"><path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg></span>
        {crumbs.map((c, i) => (
          <span key={i} className={i === crumbs.length - 1 ? 'crumb-current' : 'crumb'}>{c}</span>
        ))}
      </div>

      <div className="header-spacer" />

      {/* Search */}
      <div className="header-search">
        <Search size={13} color="var(--text-muted)" />
        <input placeholder="Search metrics, reports…" />
      </div>

      {/* Refresh */}
      <button className="icon-btn" onClick={() => qc.invalidateQueries()} title="Refresh all data">
        <RefreshCw size={14} />
      </button>

      {/* Notifications */}
      <button className="icon-btn" title="Notifications">
        <Bell size={14} />
      </button>

      {/* API status */}
      <div className="status-dot" title="Backend connected" />
    </header>
  );
}
