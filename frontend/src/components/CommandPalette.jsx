import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, ArrowRight, Building2, BarChart3, FileText, 
  Users, CheckCircle2, Shield, Sparkles, X, CornerDownLeft
} from 'lucide-react';

const PALETTE_ITEMS = [
  // Navigation
  { id: 'nav-dash', type: 'Navigation', title: 'Executive Overview Dashboard', subtitle: 'Consolidated ESG & GHG emissions KPIs', url: '/', icon: BarChart3 },
  { id: 'nav-entry', type: 'Navigation', title: 'Project Data Entry & Evidence', subtitle: 'Submit monthly operational packs & upload bills', url: '/collection', icon: FileText },
  { id: 'nav-workflow', type: 'Navigation', title: '4-Eyes Verification & BU Review', subtitle: 'Review, approve, or return project submissions', url: '/workflow', icon: CheckCircle2 },
  { id: 'nav-bu-disc', type: 'Navigation', title: 'BU-Level Disclosures & Targets', subtitle: 'Capital initiatives & multi-year targets', url: '/disclosure/bu', icon: Building2 },
  { id: 'nav-sub-disc', type: 'Navigation', title: 'Subsidiary BRSR Disclosures', subtitle: 'Section A statutory, Section B principles P1-P9', url: '/disclosure/subsidiary', icon: Building2 },
  { id: 'nav-group-disc', type: 'Navigation', title: 'Group Net-Zero Commitments', subtitle: 'Enterprise boundary & board assurance', url: '/disclosure/group', icon: Shield },
  { id: 'nav-consolidation', type: 'Navigation', title: 'Consolidation & Calculation Engine', subtitle: 'Trigger GHG Protocol Scope 1, 2, 3 calculations', url: '/consolidation', icon: Sparkles },
  { id: 'nav-reports', type: 'Navigation', title: 'BRSR Reporting & Lineage', subtitle: 'Compile regulatory report & inspect data lineage', url: '/reporting', icon: FileText },
  { id: 'nav-users', type: 'Navigation', title: 'User Management & Hierarchical Delegation', subtitle: 'Manage admins, scoped invitations & audit log', url: '/admin/users', icon: Users },
  { id: 'nav-proj-sum', type: 'Navigation', title: 'Project Read-Model Summary', subtitle: 'Operational summary for project data entry users', url: '/project-summary', icon: BarChart3 },

  // Key ESG Metrics
  { id: 'metric-scope1', type: 'ESG Metric', title: 'Scope 1 Stationary Combustion (DG Genset)', subtitle: 'Diesel fuel consumption × CEA emission factor', url: '/collection', icon: BarChart3 },
  { id: 'metric-scope2', type: 'ESG Metric', title: 'Scope 2 Purchased Grid Electricity', subtitle: 'Kilowatt-hours (kWh) × Regional grid factor', url: '/collection', icon: BarChart3 },
  { id: 'metric-water', type: 'ESG Metric', title: 'Water Withdrawal & Consumption', subtitle: 'Municipal supply, borewell, tanker tracking', url: '/collection', icon: BarChart3 },
  { id: 'metric-ltir', type: 'ESG Metric', title: 'Lost Time Injury Frequency Rate (LTIFR)', subtitle: 'Safety incidents per million man-hours', url: '/collection', icon: BarChart3 },

  // Hierarchy Nodes
  { id: 'node-meil', type: 'Hierarchy Scope', title: 'MEIL Group Enterprise', subtitle: 'Level 1: Enterprise Group Root', url: '/', icon: Building2 },
  { id: 'node-hydro', type: 'Hierarchy Scope', title: 'MEIL Hydrocarbon & Energy Ltd', subtitle: 'Level 2: Subsidiary Entity', url: '/disclosure/subsidiary', icon: Building2 },
  { id: 'node-roads', type: 'Hierarchy Scope', title: 'Roads & Highways Division BU', subtitle: 'Level 3: Divisional Business Unit', url: '/disclosure/bu', icon: Building2 },
  { id: 'node-zojila', type: 'Hierarchy Scope', title: 'Zojila Tunnel Project Site', subtitle: 'Level 4: Major Infrastructure Project', url: '/collection', icon: Building2 },
];

export default function CommandPalette({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const filteredItems = PALETTE_ITEMS.filter(item => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return item.title.toLowerCase().includes(q) ||
           item.subtitle.toLowerCase().includes(q) ||
           item.type.toLowerCase().includes(q);
  });

  const handleSelect = (item) => {
    onClose();
    if (item.url) navigate(item.url);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, filteredItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        handleSelect(filteredItems[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="anim-fade"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '12vh'
      }}
      onClick={onClose}
    >
      <div 
        className="anim-slide"
        style={{
          width: '100%',
          maxWidth: '620px',
          background: 'var(--card-bg, #0f172a)',
          border: '1px solid var(--border-color, #334155)',
          borderRadius: '12px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '14px 18px',
          borderBottom: '1px solid var(--border-color, #334155)'
        }}>
          <Search size={18} color="var(--brand-400, #38bdf8)" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command, page, metric, or organizational unit..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary, #f8fafc)',
              fontSize: '15px'
            }}
          />
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '2px 6px',
            borderRadius: 4,
            background: 'rgba(255, 255, 255, 0.08)',
            fontSize: '11px',
            color: 'var(--text-muted, #94a3b8)'
          }}>
            <span>ESC</span>
          </div>
        </div>

        {/* Results List */}
        <div style={{ maxHeight: '360px', overflowY: 'auto', padding: '8px' }}>
          {filteredItems.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted, #94a3b8)', fontSize: '13px' }}>
              No matching commands or entities found for "{query}".
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 12px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    background: isSelected ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
                    border: `1px solid ${isSelected ? 'rgba(59, 130, 246, 0.3)' : 'transparent'}`,
                    transition: 'all 0.1s ease'
                  }}
                >
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: 6,
                    background: isSelected ? 'var(--brand-500, #3b82f6)' : 'rgba(255, 255, 255, 0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isSelected ? '#ffffff' : 'var(--text-secondary, #94a3b8)'
                  }}>
                    <Icon size={16} />
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary, #f8fafc)' }}>
                        {item.title}
                      </span>
                      <span style={{
                        fontSize: '10px',
                        padding: '1px 5px',
                        borderRadius: 3,
                        background: 'rgba(255, 255, 255, 0.08)',
                        color: 'var(--text-secondary, #94a3b8)'
                      }}>
                        {item.type}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)', marginTop: 2 }}>
                      {item.subtitle}
                    </div>
                  </div>

                  {isSelected && (
                    <CornerDownLeft size={14} color="var(--brand-400, #38bdf8)" />
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer Shortcut Guide */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 16px',
          borderTop: '1px solid var(--border-color, #334155)',
          background: 'rgba(0, 0, 0, 0.2)',
          fontSize: '11px',
          color: 'var(--text-muted, #94a3b8)'
        }}>
          <span>Navigate with <kbd>↑</kbd> <kbd>↓</kbd></span>
          <span>Open with <kbd>↵</kbd></span>
          <span>Close with <kbd>Esc</kbd></span>
        </div>
      </div>
    </div>
  );
}
