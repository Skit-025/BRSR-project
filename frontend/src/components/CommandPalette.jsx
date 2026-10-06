import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, FolderPlus, FileCheck, Layers, Cpu, ArrowRight, Shield, Building2, BookOpen, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { MOCK_PROJECTS, MOCK_PARAMETERS_CATALOG } from '../mock/mockData';

export default function CommandPalette({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const { switchPersona } = useAuth();

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const actions = [
    { id: 'act-new-prj', title: 'Create Project (Wizard)', category: 'Quick Actions', icon: FolderPlus, action: () => { navigate('/projects?new=true'); onClose(); } },
    { id: 'act-review', title: 'Review Pending Submissions', category: 'Quick Actions', icon: FileCheck, action: () => { navigate('/workflow'); onClose(); } },
    { id: 'act-calc', title: 'Open Calculation Pipeline & Lineage', category: 'Quick Actions', icon: Cpu, action: () => { navigate('/calculations'); onClose(); } },
    { id: 'act-brsr', title: 'View SEBI BRSR Core Disclosures', category: 'Quick Actions', icon: Layers, action: () => { navigate('/reporting'); onClose(); } },
    { id: 'act-switch-rev', title: 'Switch Persona: Priya (BU Reviewer)', category: 'Persona Switch', icon: Shield, action: () => { switchPersona('priya'); navigate('/workflow'); onClose(); } },
    { id: 'act-switch-maker', title: 'Switch Persona: Rahul (Project Maker)', category: 'Persona Switch', icon: Shield, action: () => { switchPersona('rahul'); navigate('/collection?prj=prj-101'); onClose(); } },
    { id: 'act-switch-exec', title: 'Switch Persona: Aditya (Executive)', category: 'Persona Switch', icon: Shield, action: () => { switchPersona('aditya'); navigate('/dashboard'); onClose(); } },
  ];

  const projects = MOCK_PROJECTS.slice(0, 10).map((p) => ({
    id: `prj-${p.id}`,
    title: `${p.name} (${p.code})`,
    category: 'Projects',
    icon: Building2,
    detail: `${p.subsidiary} · ${p.coverage}% coverage`,
    action: () => { navigate(`/projects/${p.id}`); onClose(); },
  }));

  const params = MOCK_PARAMETERS_CATALOG.map((m) => ({
    id: `param-${m.id}`,
    title: `${m.name} [${m.code}]`,
    category: 'ESG Parameters',
    icon: BookOpen,
    detail: `${m.unit} · ${m.brsrMapping}`,
    action: () => { navigate('/parameters'); onClose(); },
  }));

  const allItems = [...actions, ...projects, ...params];
  const filtered = query.trim() === ''
    ? allItems.slice(0, 12)
    : allItems.filter(item => item.title.toLowerCase().includes(query.toLowerCase()) || (item.detail && item.detail.toLowerCase().includes(query.toLowerCase()))).slice(0, 12);

  const handleKeyDownNav = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filtered.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + (filtered.length || 1)) % (filtered.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].action();
      }
    }
  };

  return (
    <div className="command-backdrop" onClick={onClose}>
      <div className="command-modal" onClick={(e) => e.stopPropagation()} onKeyDown={handleKeyDownNav}>
        <div className="command-input-wrap">
          <Search size={16} color="var(--text-tertiary)" />
          <input
            ref={inputRef}
            className="command-input"
            placeholder="Search projects, parameters, reports, or type an action…"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
          />
          <span className="kbd-badge">ESC</span>
        </div>

        <div className="command-list">
          {filtered.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>
              No matching commands or entities found.
            </div>
          ) : (
            filtered.map((item, idx) => {
              const Icon = item.icon || ArrowRight;
              const isSel = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  className={`command-item ${isSel ? 'selected' : ''}`}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Icon size={14} color={isSel ? 'var(--text-primary)' : 'var(--text-tertiary)'} />
                    <div>
                      <div style={{ fontWeight: isSel ? 600 : 450, fontSize: '13px' }}>{item.title}</div>
                      {item.detail && <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{item.detail}</div>}
                    </div>
                  </div>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                    {item.category}
                  </span>
                </div>
              );
            })
          )}
        </div>

        <div style={{ padding: '8px 16px', background: 'var(--bg-muted)', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-tertiary)' }}>
          <span>Navigation: <kbd style={{ padding: '1px 4px', border: '1px solid var(--border-default)', borderRadius: '3px' }}>↑</kbd> <kbd style={{ padding: '1px 4px', border: '1px solid var(--border-default)', borderRadius: '3px' }}>↓</kbd> to select</span>
          <span>Press <kbd style={{ padding: '1px 4px', border: '1px solid var(--border-default)', borderRadius: '3px' }}>↵</kbd> to execute</span>
        </div>
      </div>
    </div>
  );
}
