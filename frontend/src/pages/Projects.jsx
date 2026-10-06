import React, { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search, Plus, Filter, ArrowUpDown, ChevronRight,
  Building2, Layers, CheckCircle2, Clock, AlertTriangle, ShieldCheck
} from 'lucide-react';
import { useProjects } from '../hooks/useApi';
import ProjectWizardModal from '../components/ProjectWizardModal';

export default function Projects() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { data: projects = [] } = useProjects();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isWizardOpen, setIsWizardOpen] = useState(searchParams.get('new') === 'true');

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.code.toLowerCase().includes(search.toLowerCase()) ||
        p.subsidiary.toLowerCase().includes(search.toLowerCase()) ||
        p.bu_name.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || p.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [projects, search, statusFilter]);

  return (
    <div className="page-content">
      {/* Header (Section 12 Specification) */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-sub">
            Manage ESG data collection across all projects and operational sites.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button 
            className="btn btn-primary"
            onClick={() => setIsWizardOpen(true)}
          >
            <Plus size={14} />
            <span>Add Project</span>
          </button>
        </div>
      </div>

      {/* Filter / Search Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '280px' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '340px' }}>
            <Search size={14} color="var(--text-tertiary)" style={{ position: 'absolute', left: '10px', top: '12px' }} />
            <input
              type="text"
              placeholder="Search projects by name, code, subsidiary…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-control"
              style={{ width: '100%', paddingLeft: '32px' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-control"
              style={{ height: '38px', padding: '0 10px', fontSize: '12px' }}
            >
              <option value="all">All Statuses ({projects.length})</option>
              <option value="ready">Ready (18)</option>
              <option value="review">In Review (8)</option>
              <option value="attention">Needs Attention (4)</option>
              <option value="complete">Complete (2)</option>
            </select>
          </div>
        </div>

        <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
          Showing {filtered.length} of {projects.length} projects
        </div>
      </div>

      {/* Projects Table (Section 12 Specification) */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Project</th>
              <th>Business Unit</th>
              <th>Subsidiary</th>
              <th>Status</th>
              <th>Coverage</th>
              <th>Stage</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              let badgeClass = 'badge-ready';
              if (p.status === 'review') badgeClass = 'badge-review';
              if (p.status === 'attention') badgeClass = 'badge-attention';
              if (p.status === 'complete') badgeClass = 'badge-approved';

              return (
                <tr 
                  key={p.id} 
                  onClick={() => navigate(`/projects/${p.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                      {p.code} · {p.location}
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>
                    {p.bu_name}
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>
                    {p.subsidiary}
                  </td>
                  <td>
                    <span className={`badge ${badgeClass}`}>
                      <span className="status-dot" />
                      {p.status === 'review' ? 'In Review' : p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '56px', height: '6px', background: 'var(--bg-subtle)', borderRadius: '99px', overflow: 'hidden' }}>
                        <div style={{ width: `${p.coverage}%`, height: '100%', background: 'var(--accent-black)' }} />
                      </div>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 600 }}>{p.coverage}%</span>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                    {p.stage}
                  </td>
                  <td>
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={(e) => { e.stopPropagation(); navigate(`/projects/${p.id}`); }}
                      style={{ height: '26px', fontSize: '11px', padding: '0 8px' }}
                    >
                      <span>View</span>
                      <ChevronRight size={12} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Project Creation Wizard */}
      <ProjectWizardModal 
        isOpen={isWizardOpen} 
        onClose={() => setIsWizardOpen(false)} 
      />
    </div>
  );
}
