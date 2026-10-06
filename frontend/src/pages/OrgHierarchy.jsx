import React, { useState } from 'react';
import { 
  Building2, ChevronRight, Plus, Calendar, Layers, 
  Globe, AlertCircle, CheckCircle2, X, RefreshCw, Filter, Search, Lock, Unlock,
  Info, Eye, ExternalLink, ShieldCheck, Clock, FileText, Edit3, ShieldAlert
} from 'lucide-react';
import { useOrgNodes, useOrgPeriods, useCreateNode, useCreatePeriod, useUpdateNode, useUpdatePeriod } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/client';
import Modal from '../components/Modal';

const NODE_TYPES = [
  { value: 'group', label: 'Group (Level 1)', cls: 'badge-brand' },
  { value: 'subsidiary', label: 'Subsidiary (Level 2)', cls: 'badge-emerald' },
  { value: 'associate', label: 'Associate Entity (Level 3)', cls: 'badge-sky' },
  { value: 'jv', label: 'Joint Venture / JV (Level 4)', cls: 'badge-amber' },
  { value: 'business_unit', label: 'Business Unit / BU (Level 5)', cls: 'badge-indigo' },
  { value: 'project', label: 'Project (Level 6)', cls: 'badge-purple' },
  { value: 'site', label: 'Operational Site (Level 7)', cls: 'badge-teal' },
];

const PROJECT_TYPES = [
  { value: 'irrigation', label: 'Lift Irrigation & Water' },
  { value: 'hydrocarbon', label: 'Hydrocarbon & Refinery' },
  { value: 'solar', label: 'Solar & Renewable Power' },
  { value: 'road', label: 'Roads & Highways' },
  { value: 'tunnel', label: 'High Altitude Tunnels' },
  { value: 'ev_bus', label: 'Electric Mobility (EV Buses)' },
  { value: 'corporate', label: 'Corporate Office' },
];

export default function OrgHierarchy() {
  const { data: nodes = [], isLoading: loadN, refetch: refetchNodes } = useOrgNodes();
  const { data: periods = [], isLoading: loadP, refetch: refetchPeriods } = useOrgPeriods();
  const { user, isAdmin } = useAuth();
  const createNode = useCreateNode();
  const updateNode = useUpdateNode();
  const createPeriod = useCreatePeriod();
  const updatePeriod = useUpdatePeriod();

  // Modals & Detail states
  const [showNodeModal, setShowNodeModal] = useState(false);
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [selectedPeriodDetail, setSelectedPeriodDetail] = useState(null);
  const [showAllPeriodsModal, setShowAllPeriodsModal] = useState(false);
  const [selectedNodeDetail, setSelectedNodeDetail] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Admin Edit Unit & Period States
  const [editingNode, setEditingNode] = useState(null);
  const [editNodeForm, setEditNodeForm] = useState({});
  const [adminPasswordForNode, setAdminPasswordForNode] = useState('');
  const [nodeUpdateError, setNodeUpdateError] = useState('');
  const [updatingNodePending, setUpdatingNodePending] = useState(false);

  const [notice, setNotice] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const [searchNode, setSearchNode] = useState('');
  const [filterType, setFilterType] = useState('ALL');

  // Node form
  const [nodeForm, setNodeForm] = useState({
    code: '',
    name: '',
    type: 'subsidiary',
    parent_id: '',
    ownership_pct: 100.0,
    control_type: 'operational_control',
    boundary: true,
    project_type: 'corporate',
    location_state: '',
    location_country: 'India',
  });

  // Period form
  const [periodForm, setPeriodForm] = useState({
    code: '',
    financial_year: '2025-2026',
    period_type: 'month',
    month: 4,
    quarter: 1,
    start_date: '2025-04-01',
    end_date: '2025-04-30',
    status: 'OPEN',
  });

  const handleCreateNode = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!nodeForm.code.trim() || !nodeForm.name.trim()) {
      setErrorMsg('Entity Code and Name are required.');
      return;
    }

    try {
      await createNode.mutateAsync({
        code: nodeForm.code.trim().toUpperCase(),
        name: nodeForm.name.trim(),
        type: nodeForm.type,
        parent_id: nodeForm.parent_id || null,
        ownership_pct: parseFloat(nodeForm.ownership_pct) || 100.0,
        control_type: nodeForm.control_type,
        boundary: Boolean(nodeForm.boundary),
        project_type: nodeForm.project_type,
        location_state: nodeForm.location_state || null,
        location_country: nodeForm.location_country || 'India',
      });

      setNotice({ type: 'success', text: `Entity '${nodeForm.name}' successfully added to hierarchy.` });
      setShowNodeModal(false);
      setNodeForm({
        code: '',
        name: '',
        type: 'subsidiary',
        parent_id: '',
        ownership_pct: 100.0,
        control_type: 'operational_control',
        boundary: true,
        project_type: 'corporate',
        location_state: '',
        location_country: 'India',
      });
      refetchNodes();
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || err.message || 'Failed to create organization node.');
    }
  };

  const handleCreatePeriod = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!periodForm.code.trim() || !periodForm.financial_year.trim()) {
      setErrorMsg('Period Code and Financial Year are required.');
      return;
    }

    try {
      await createPeriod.mutateAsync({
        code: periodForm.code.trim(),
        financial_year: periodForm.financial_year.trim(),
        period_type: periodForm.period_type,
        month: periodForm.period_type === 'month' ? parseInt(periodForm.month) : null,
        quarter: periodForm.period_type === 'quarter' ? parseInt(periodForm.quarter) : null,
        start_date: periodForm.start_date,
        end_date: periodForm.end_date,
        status: periodForm.status,
      });

      setNotice({ type: 'success', text: `Reporting Period '${periodForm.code}' successfully created.` });
      setShowPeriodModal(false);
      setPeriodForm({
        code: '',
        financial_year: '2025-2026',
        period_type: 'month',
        month: 5,
        quarter: 1,
        start_date: '2025-05-01',
        end_date: '2025-05-31',
        status: 'OPEN',
      });
      refetchPeriods();
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || err.message || 'Failed to create reporting period.');
    }
  };

  // ── Admin Edit Functions ──
  const handleOpenEditNode = (node) => {
    setEditingNode(node);
    setEditNodeForm({
      name: node.name || '',
      code: node.code || '',
      boundary: node.boundary !== undefined ? node.boundary : true,
      ownership_pct: node.ownership_pct !== undefined ? node.ownership_pct : 100,
      project_type: node.project_type || 'corporate',
      location_state: node.location_state || '',
    });
    setAdminPasswordForNode('');
    setNodeUpdateError('');
  };

  const handleSaveEditNode = async (e) => {
    e.preventDefault();
    setNodeUpdateError('');
    setUpdatingNodePending(true);
    try {
      if (isAdmin) {
        if (!adminPasswordForNode.trim()) {
          throw new Error('Please enter your Administrator password to authorize this modification.');
        }
        await authApi.verifyPassword(adminPasswordForNode.trim());
      }
      await updateNode.mutateAsync({
        id: editingNode.id,
        data: editNodeForm
      });
      setNotice({ type: 'success', text: `Unit "${editNodeForm.name}" updated successfully.` });
      setEditingNode(null);
      if (selectedNodeDetail && selectedNodeDetail.id === editingNode.id) {
        setSelectedNodeDetail({ ...selectedNodeDetail, ...editNodeForm });
      }
      refetchNodes();
    } catch (err) {
      setNodeUpdateError(err.response?.data?.detail || err.message || 'Failed to update unit.');
    } finally {
      setUpdatingNodePending(false);
    }
  };

  const handleTogglePeriodStatus = async (period) => {
    const newStatus = period.status === 'LOCKED' ? 'OPEN' : 'LOCKED';
    try {
      await updatePeriod.mutateAsync({
        id: period.id,
        data: { status: newStatus }
      });
      setNotice({ type: 'success', text: `Reporting period ${period.code} is now ${newStatus}.` });
      if (selectedPeriodDetail && selectedPeriodDetail.id === period.id) {
        setSelectedPeriodDetail({ ...selectedPeriodDetail, status: newStatus });
      }
      refetchPeriods();
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || err.message || 'Failed to update period.');
    }
  };

  // Safe array guards
  const nodeList = Array.isArray(nodes) ? nodes : [];
  const periodList = Array.isArray(periods) ? periods : [];

  // Filtered nodes
  const filteredNodes = nodeList.filter((n) => {
    const matchType = filterType === 'ALL' || n.type === filterType;
    const term = (searchNode || '').toLowerCase();
    const matchSearch = !term || 
      (n.name && n.name.toLowerCase().includes(term)) || 
      (n.code && n.code.toLowerCase().includes(term)) ||
      (n.path && n.path.toLowerCase().includes(term));
    return matchType && matchSearch;
  });

  return (
    <div className="page-content anim-fade">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <div className="page-tag">ENTERPRISE STRUCTURE & AUDIT BOUNDARY</div>
          <h1 className="page-title">7-Tier Organization Hierarchy & Reporting Periods</h1>
          <p className="page-subtitle">
            Define corporate nodes, subsidiaries, projects, and operational reporting periods across MEIL Group.
          </p>
        </div>
        <div className="header-actions">
          <button 
            className="btn btn-secondary" 
            onClick={async () => {
              setIsRefreshing(true);
              try {
                await Promise.all([refetchNodes(), refetchPeriods()]);
              } finally {
                setTimeout(() => setIsRefreshing(false), 700);
              }
            }}
            disabled={isRefreshing || loadN || loadP}
          >
            <RefreshCw size={14} className={isRefreshing || loadN || loadP ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
          <button className="btn btn-secondary" onClick={() => { setShowPeriodModal(true); setErrorMsg(''); }}>
            <Calendar size={14} />
            <span>+ New Period</span>
          </button>
          <button className="btn btn-primary" onClick={() => { setShowNodeModal(true); setErrorMsg(''); }}>
            <Plus size={15} />
            <span>+ Add Entity Unit</span>
          </button>
        </div>
      </div>

      {/* Notice Alert */}
      {notice && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '8px',
          fontSize: '13px',
          fontWeight: 600,
          background: notice.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          color: notice.type === 'success' ? '#10b981' : '#ef4444',
          border: `1px solid ${notice.type === 'success' ? '#10b981' : '#ef4444'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span>{notice.text}</span>
          <button className="icon-btn" onClick={() => setNotice(null)} style={{ width: 24, height: 24 }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Reporting Periods Large Dedicated Area */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, padding: '18px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div>
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '16px' }}>
              <Calendar size={18} color="var(--brand-400)" />
              <span>Reporting Periods & Statutory Audit Windows ({periodList.length})</span>
            </div>
            <div className="card-subtitle text-muted text-sm" style={{ marginTop: '2px' }}>
              Fiscal timelines, monthly collection packs, and SEBI BRSR compliance audit windows
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button 
              className="btn btn-secondary btn-sm"
              onClick={() => setShowAllPeriodsModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Eye size={13} color="var(--brand-400)" />
              <span>Dedicated Periods Console</span>
            </button>
            <button 
              className="btn btn-primary btn-sm"
              onClick={() => { setShowPeriodModal(true); setErrorMsg(''); }}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Plus size={13} />
              <span>+ Add Period</span>
            </button>
          </div>
        </div>

        {/* Large Prominent Grid */}
        <div 
          style={{ 
            padding: '20px 24px', 
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
            gap: '16px',
            background: 'rgba(11, 13, 26, 0.4)'
          }}
        >
          {loadP ? (
            <div style={{ padding: '30px', color: 'var(--text-muted)', gridColumn: '1 / -1', textAlign: 'center' }}>
              <RefreshCw size={20} className="spin" style={{ margin: '0 auto 8px', display: 'block' }} />
              Loading reporting periods...
            </div>
          ) : periodList.length === 0 ? (
            <div style={{ padding: '36px 20px', color: 'var(--text-muted)', gridColumn: '1 / -1', textAlign: 'center', background: 'rgba(255,255,255,0.015)', borderRadius: '8px', border: '1px dashed var(--border-default)' }}>
              <Calendar size={28} color="var(--brand-400)" style={{ margin: '0 auto 8px', display: 'block' }} />
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff', marginBottom: 4 }}>No Reporting Periods Configured</div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', maxWidth: 420, margin: '0 auto 12px' }}>
                Create a reporting period (e.g. FY 2025-26) to establish statutory collection cycles and enable ESG data submissions.
              </p>
              <button 
                type="button" 
                className="btn btn-primary btn-sm"
                onClick={() => { setShowPeriodModal(true); setErrorMsg(''); }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <Plus size={14} />
                <span>+ Create First Period</span>
              </button>
            </div>
          ) : (
            periodList.map((p) => {
              const isLocked = p.status === 'LOCKED';
              return (
                <div 
                  key={p.id} 
                  style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-md)',
                    padding: '16px 20px',
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '12px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                  }}
                >
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 3,
                    background: isLocked ? 'var(--rose-500)' : 'var(--emerald-500)'
                  }} />

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: '15px', color: '#fff', fontFamily: 'JetBrains Mono', letterSpacing: '-0.2px' }}>
                        {p.code}
                      </span>
                      {isLocked ? (
                        <span className="badge badge-rose" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Lock size={10} /> Locked
                        </span>
                      ) : (
                        <span className="badge badge-emerald" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Unlock size={10} /> Open
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span className="badge badge-brand" style={{ fontSize: '11px' }}>
                        FY {p.financial_year}
                      </span>
                      <span className="badge badge-indigo" style={{ fontSize: '11px' }}>
                        {p.period_type?.toUpperCase()} PACK
                      </span>
                    </div>
                  </div>

                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Clock size={12} color="var(--brand-400)" />
                    <span>{p.start_date}</span>
                    <span style={{ color: 'var(--text-muted)' }}>→</span>
                    <span>{p.end_date}</span>
                  </div>

                  <button 
                    className="btn btn-secondary btn-sm" 
                    onClick={() => setSelectedPeriodDetail(p)} 
                    style={{ width: '100%', justifyContent: 'center', gap: '6px', marginTop: '4px' }}
                    title="Inspect complete statutory details for this reporting period"
                  >
                    <Info size={13} color="var(--brand-400)" />
                    <span>Show in Details</span>
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Org Hierarchy Table Card */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Building2 size={16} color="var(--brand-400)" />
              <span>7-Tier Organizational Boundary ({filteredNodes.length} Units)</span>
            </div>
            <div className="card-subtitle text-muted text-sm">
              Tree path mapping with PostgreSQL ltree resolution and automatic applicability derivation
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* Search */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search name, code, path..."
                className="form-control"
                style={{ paddingLeft: 30, width: 220, height: 32, fontSize: '12px' }}
                value={searchNode}
                onChange={(e) => setSearchNode(e.target.value)}
              />
            </div>

            {/* Filter by Type */}
            <select
              className="form-control"
              style={{ width: 170, height: 32, fontSize: '12px' }}
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="ALL">All Hierarchy Levels</option>
              {NODE_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>

            <button 
              className="btn btn-primary btn-sm"
              onClick={() => { setShowNodeModal(true); setErrorMsg(''); }}
            >
              <Plus size={13} /> Add Unit
            </button>
          </div>
        </div>

        {/* Scrollable Table Container */}
        <div className="table-wrap" style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Entity / Unit Name</th>
                <th>Code</th>
                <th>Hierarchy Level</th>
                <th>ltree Path</th>
                <th>Boundary</th>
                <th>Project Sector</th>
                <th>Ownership</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loadN ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    Loading organization nodes...
                  </td>
                </tr>
              ) : filteredNodes.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '48px 24px' }}>
                    <div style={{ maxWidth: 440, margin: '0 auto' }}>
                      <Building2 size={32} color="var(--brand-400)" style={{ margin: '0 auto 10px', display: 'block' }} />
                      <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff', marginBottom: 6 }}>
                        {nodeList.length === 0 ? 'No Organization Units Configured' : 'No Matching Units Found'}
                      </div>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.5 }}>
                        {nodeList.length === 0 
                          ? 'Start by creating your Root Group Entity (e.g. MEIL-GROUP) or subsidiary units to establish statutory audit boundaries.'
                          : 'Try changing your search term or filtering options.'}
                      </p>
                      {nodeList.length === 0 && (
                        <button 
                          type="button" 
                          className="btn btn-primary btn-sm"
                          onClick={() => { setShowNodeModal(true); setErrorMsg(''); }}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                        >
                          <Plus size={14} />
                          <span>+ Add Root Group Unit</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredNodes.map((node) => {
                  const depth = (node.path || '').split('.').length - 1;
                  const typeObj = NODE_TYPES.find(t => t.value === node.type) || { label: node.type, cls: 'badge-gray' };
                  const projObj = PROJECT_TYPES.find(p => p.value === node.project_type);

                  return (
                    <tr key={node.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {Array(Math.max(0, depth)).fill(null).map((_, i) => (
                            <span 
                              key={i} 
                              style={{ 
                                width: 14, 
                                display: 'inline-block', 
                                borderLeft: '1px dashed var(--border-default)', 
                                height: 16 
                              }} 
                            />
                          ))}
                          {depth > 0 && <ChevronRight size={12} color="var(--text-muted)" />}
                          <Building2 size={14} color="var(--brand-400)" />
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            {node.name}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: 'var(--brand-400)' }}>
                          {node.code}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${typeObj.cls}`}>
                          {typeObj.label}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: 'var(--text-secondary)' }}>
                          {node.path}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${node.boundary ? 'badge-emerald' : 'badge-gray'}`}>
                          {node.boundary ? 'In Boundary' : 'Excluded'}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {projObj?.label || node.project_type}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {node.ownership_pct}% ({node.control_type?.replace('_', ' ')})
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button 
                          className="btn btn-secondary btn-sm"
                          onClick={() => setSelectedNodeDetail(node)}
                          style={{ padding: '4px 10px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          title="Show unit details"
                        >
                          <Eye size={12} color="var(--brand-400)" />
                          <span>Details</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add Org Unit */}
      <Modal 
        isOpen={showNodeModal} 
        onClose={() => setShowNodeModal(false)} 
        maxWidth="560px"
      >
        <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="modal-header-icon">
                  <Building2 size={18} color="var(--brand-400)" />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', color: '#fff' }}>Add Organization Unit</h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Create a new node within MEIL's 7-tier hierarchy structure
                  </p>
                </div>
              </div>
              <button className="icon-btn" onClick={() => setShowNodeModal(false)}>
                <X size={18} />
              </button>
            </div>

            {errorMsg && (
              <div className="login-error-banner" style={{ margin: '16px 24px 0' }}>
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateNode} className="modal-body">
              <div className="form-group">
                <label>Unit Code <span className="text-rose">*</span></label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. MEIL-HYDRO-02, PRJ-KALESH-PUMP, SITE-04"
                  value={nodeForm.code}
                  onChange={(e) => setNodeForm({ ...nodeForm, code: e.target.value })}
                  required
                />
                <span className="form-help">Unique uppercase identifier used for PostgreSQL ltree materialized path.</span>
              </div>

              <div className="form-group">
                <label>Unit Name <span className="text-rose">*</span></label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Dhamra LNG Terminal Phase 2, Kaleshwaram Unit 4"
                  value={nodeForm.name}
                  onChange={(e) => setNodeForm({ ...nodeForm, name: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label>Hierarchy Level</label>
                  <select
                    className="form-control"
                    value={nodeForm.type}
                    onChange={(e) => setNodeForm({ ...nodeForm, type: e.target.value })}
                  >
                    {NODE_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Parent Entity Unit</label>
                  <select
                    className="form-control"
                    value={nodeForm.parent_id}
                    onChange={(e) => setNodeForm({ ...nodeForm, parent_id: e.target.value })}
                  >
                    <option value="">None (Root Node)</option>
                    {nodeList.map(n => (
                      <option key={n.id} value={n.id}>[{n.type.toUpperCase()}] {n.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label>Project Sector</label>
                  <select
                    className="form-control"
                    value={nodeForm.project_type}
                    onChange={(e) => setNodeForm({ ...nodeForm, project_type: e.target.value })}
                  >
                    {PROJECT_TYPES.map(p => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Ownership %</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    className="form-control"
                    value={nodeForm.ownership_pct}
                    onChange={(e) => setNodeForm({ ...nodeForm, ownership_pct: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label>Control Type</label>
                  <select
                    className="form-control"
                    value={nodeForm.control_type}
                    onChange={(e) => setNodeForm({ ...nodeForm, control_type: e.target.value })}
                  >
                    <option value="operational_control">Operational Control</option>
                    <option value="financial_control">Financial Control</option>
                    <option value="equity_share">Equity Share</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>State / Region</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Telangana, Odisha, Gujarat"
                    value={nodeForm.location_state}
                    onChange={(e) => setNodeForm({ ...nodeForm, location_state: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowNodeModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={createNode.isPending}
                >
                  {createNode.isPending ? 'Creating...' : 'Save Entity Unit'}
                </button>
              </div>
            </form>
      </Modal>

      {/* Modal: New Reporting Period */}
      <Modal 
        isOpen={showPeriodModal} 
        onClose={() => setShowPeriodModal(false)} 
        maxWidth="560px"
      >
        <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="modal-header-icon">
                  <Calendar size={18} color="var(--brand-400)" />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', color: '#fff' }}>Create Reporting Period</h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Open a new monthly or quarterly ESG submission window
                  </p>
                </div>
              </div>
              <button className="icon-btn" onClick={() => setShowPeriodModal(false)}>
                <X size={18} />
              </button>
            </div>

            {errorMsg && (
              <div className="login-error-banner" style={{ margin: '16px 24px 0' }}>
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreatePeriod} className="modal-body">
              <div className="form-group">
                <label>Period Code <span className="text-rose">*</span></label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. FY2025-26-M06, FY2025-26-Q2"
                  value={periodForm.code}
                  onChange={(e) => setPeriodForm({ ...periodForm, code: e.target.value })}
                  required
                />
                <span className="form-help">Unique reporting window code.</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label>Financial Year <span className="text-rose">*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. 2025-2026"
                    value={periodForm.financial_year}
                    onChange={(e) => setPeriodForm({ ...periodForm, financial_year: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Period Type</label>
                  <select
                    className="form-control"
                    value={periodForm.period_type}
                    onChange={(e) => setPeriodForm({ ...periodForm, period_type: e.target.value })}
                  >
                    <option value="month">Monthly Entry</option>
                    <option value="quarter">Quarterly Review</option>
                    <option value="financial_year">Annual BRSR</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label>Start Date <span className="text-rose">*</span></label>
                  <input
                    type="date"
                    className="form-control"
                    value={periodForm.start_date}
                    onChange={(e) => setPeriodForm({ ...periodForm, start_date: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>End Date <span className="text-rose">*</span></label>
                  <input
                    type="date"
                    className="form-control"
                    value={periodForm.end_date}
                    onChange={(e) => setPeriodForm({ ...periodForm, end_date: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowPeriodModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={createPeriod.isPending}
                >
                  {createPeriod.isPending ? 'Creating...' : 'Create Period'}
                </button>
              </div>
            </form>
      </Modal>

      {/* Modal: Period Details Inspector */}
      {selectedPeriodDetail && (
        <Modal 
          isOpen={Boolean(selectedPeriodDetail)} 
          onClose={() => setSelectedPeriodDetail(null)} 
          maxWidth="640px"
        >
          <div className="modal-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="modal-header-icon">
                <Calendar size={18} color="var(--brand-400)" />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', color: '#fff' }}>Reporting Period Details</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Statutory configuration & SEBI compliance window for {selectedPeriodDetail?.code}
                </p>
              </div>
            </div>
            <button className="icon-btn" onClick={() => setSelectedPeriodDetail(null)}>
              <X size={18} />
            </button>
          </div>

          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Highlight Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              <div style={{ background: 'var(--bg-elevated)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Period Code</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--brand-400)', fontFamily: 'JetBrains Mono', marginTop: 2 }}>
                  {selectedPeriodDetail?.code}
                </div>
              </div>

              <div style={{ background: 'var(--bg-elevated)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Status & Security</div>
                <div style={{ marginTop: 4 }}>
                  {selectedPeriodDetail?.status === 'LOCKED' ? (
                    <span className="badge badge-rose" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Lock size={11} /> LOCKED (Audit Frozen)
                    </span>
                  ) : (
                    <span className="badge badge-emerald" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Unlock size={11} /> OPEN (Submissions Active)
                    </span>
                  )}
                </div>
              </div>

              <div style={{ background: 'var(--bg-elevated)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Financial Year</div>
                <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
                  FY {selectedPeriodDetail?.financial_year}
                </div>
              </div>

              <div style={{ background: 'var(--bg-elevated)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Period Granularity</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
                  {selectedPeriodDetail?.period_type?.toUpperCase()} PACK {selectedPeriodDetail?.month ? `(Month ${selectedPeriodDetail.month})` : selectedPeriodDetail?.quarter ? `(Q${selectedPeriodDetail.quarter})` : ''}
                </div>
              </div>
            </div>

            {/* Date Window */}
            <div style={{ background: 'var(--bg-elevated)', padding: '14px 18px', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Clock size={14} color="var(--brand-400)" />
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Calendar Collection Window</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '13px', color: 'var(--text-secondary)' }}>
                <span><strong>Start:</strong> {selectedPeriodDetail?.start_date}</span>
                <span style={{ color: 'var(--text-muted)' }}>→</span>
                <span><strong>End:</strong> {selectedPeriodDetail?.end_date}</span>
              </div>
            </div>

            {/* SEBI Compliance Scope */}
            <div style={{ background: 'rgba(99, 102, 241, 0.08)', padding: '14px 18px', borderRadius: '8px', border: '1px solid var(--border-brand)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <ShieldCheck size={15} color="var(--brand-400)" />
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>SEBI BRSR Statutory Governance</span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                This period covers all 39 BRSR indicators across 7 hierarchy tiers. Maker data entries submitted during this window are cryptographically hashed and gated by Four-Eyes Checker verification.
              </p>
            </div>
          </div>

          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              {isAdmin && (
                <button 
                  type="button"
                  className={`btn btn-sm ${selectedPeriodDetail?.status === 'LOCKED' ? 'btn-success' : 'btn-danger'}`}
                  onClick={() => handleTogglePeriodStatus(selectedPeriodDetail)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  {selectedPeriodDetail?.status === 'LOCKED' ? <Unlock size={13} /> : <Lock size={13} />}
                  <span>{selectedPeriodDetail?.status === 'LOCKED' ? 'Unlock Period (Admin)' : 'Audit Freeze Period (Admin)'}</span>
                </button>
              )}
            </div>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => setSelectedPeriodDetail(null)}
            >
              Close Details
            </button>
          </div>
        </Modal>
      )}

      {/* Modal: Dedicated All Periods Console */}
      <Modal 
        isOpen={showAllPeriodsModal} 
        onClose={() => setShowAllPeriodsModal(false)} 
        maxWidth="840px"
      >
        <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="modal-header-icon">
                  <Calendar size={18} color="var(--brand-400)" />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', color: '#fff' }}>Dedicated Reporting Periods Console</h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Complete catalog of fiscal cycles, statutory deadlines, and locking states
                  </p>
                </div>
              </div>
              <button className="icon-btn" onClick={() => setShowAllPeriodsModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ overflowY: 'auto', flex: 1, padding: '20px 24px' }}>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Period Code</th>
                      <th>Financial Year</th>
                      <th>Type</th>
                      <th>Date Range</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {periodList.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                          No reporting periods configured.
                        </td>
                      </tr>
                    ) : (
                      periodList.map(p => (
                      <tr key={p.id}>
                        <td>
                          <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, color: '#fff' }}>
                            {p.code}
                          </span>
                        </td>
                        <td>FY {p.financial_year}</td>
                        <td>
                          <span className="badge badge-brand">
                            {p.period_type?.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {p.start_date} → {p.end_date}
                        </td>
                        <td>
                          {p.status === 'LOCKED' ? (
                            <span className="badge badge-rose"><Lock size={10} /> Locked</span>
                          ) : (
                            <span className="badge badge-emerald"><Unlock size={10} /> Open</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button 
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                              setSelectedPeriodDetail(p);
                              setShowAllPeriodsModal(false);
                            }}
                            style={{ padding: '4px 10px', fontSize: '11px' }}
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    )))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setShowAllPeriodsModal(false)}
              >
                Close Console
              </button>
            </div>
      </Modal>

      {/* Modal: Entity Unit Details Inspector */}
      {selectedNodeDetail && (
        <Modal 
          isOpen={Boolean(selectedNodeDetail)} 
          onClose={() => setSelectedNodeDetail(null)} 
          maxWidth="640px"
        >
          <div className="modal-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="modal-header-icon">
                <Building2 size={18} color="var(--brand-400)" />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', color: '#fff' }}>Entity Unit Details</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  7-Tier Hierarchy Node: {selectedNodeDetail?.name}
                </p>
              </div>
            </div>
            <button className="icon-btn" onClick={() => setSelectedNodeDetail(null)}>
              <X size={18} />
            </button>
          </div>

          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              <div style={{ background: 'var(--bg-elevated)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Entity Name</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff', marginTop: 2 }}>{selectedNodeDetail?.name}</div>
              </div>

              <div style={{ background: 'var(--bg-elevated)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Unique Code</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--brand-400)', fontFamily: 'JetBrains Mono', marginTop: 2 }}>{selectedNodeDetail?.code}</div>
              </div>

              <div style={{ background: 'var(--bg-elevated)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Hierarchy Level</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginTop: 2, textTransform: 'capitalize' }}>
                  {selectedNodeDetail?.type?.replace('_', ' ')}
                </div>
              </div>

              <div style={{ background: 'var(--bg-elevated)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Audit Boundary</div>
                <div style={{ marginTop: 4 }}>
                  <span className={`badge ${selectedNodeDetail?.boundary ? 'badge-emerald' : 'badge-gray'}`}>
                    {selectedNodeDetail?.boundary ? 'SEBI In-Scope' : 'Excluded'}
                  </span>
                </div>
              </div>

              <div style={{ background: 'var(--bg-elevated)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Project Sector</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginTop: 2, textTransform: 'capitalize' }}>
                  {PROJECT_TYPES.find(p => p.value === selectedNodeDetail?.project_type)?.label || selectedNodeDetail?.project_type}
                </div>
              </div>

              <div style={{ background: 'var(--bg-elevated)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Ownership & Control</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
                  {selectedNodeDetail?.ownership_pct}% ({selectedNodeDetail?.control_type?.replace('_', ' ')})
                </div>
              </div>
            </div>

            <div style={{ background: 'var(--bg-elevated)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>PostgreSQL ltree Materialized Path</div>
              <div style={{ fontSize: '12px', color: 'var(--brand-400)', fontFamily: 'JetBrains Mono' }}>
                {selectedNodeDetail?.path || 'ROOT'}
              </div>
            </div>

            <div style={{ background: 'var(--bg-elevated)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>Geographical Location</div>
              <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                {selectedNodeDetail?.location_state ? `${selectedNodeDetail.location_state}, ` : ''}{selectedNodeDetail?.location_country || 'India'}
              </div>
            </div>
          </div>

          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              {isAdmin && (
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={() => {
                    handleOpenEditNode(selectedNodeDetail);
                  }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <Edit3 size={14} />
                  <span>Edit Unit Details (Admin)</span>
                </button>
              )}
            </div>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => setSelectedNodeDetail(null)}
            >
              Close Details
            </button>
          </div>
        </Modal>
      )}

      {/* Modal: System Admin Edit Organization Unit */}
      {editingNode && (
        <Modal
          isOpen={Boolean(editingNode)}
          onClose={() => setEditingNode(null)}
          maxWidth="580px"
        >
          <div className="modal-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="modal-header-icon" style={{ background: 'rgba(99, 102, 241, 0.15)', color: 'var(--brand-400)' }}>
                <Edit3 size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', color: '#fff', margin: 0 }}>System Admin: Edit Unit</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                  Modify unit details & SEBI statutory boundaries ({editingNode?.code})
                </p>
              </div>
            </div>
            <button className="icon-btn" onClick={() => setEditingNode(null)}>
              <X size={18} />
            </button>
          </div>

          {nodeUpdateError && (
            <div className="login-error-banner" style={{ margin: '16px 24px 0' }}>
              <AlertCircle size={16} />
              <span>{nodeUpdateError}</span>
            </div>
          )}

          <form onSubmit={handleSaveEditNode} className="modal-body">
            <div className="form-group">
              <label>Unit Name <span className="text-rose">*</span></label>
              <input
                type="text"
                className="form-control"
                value={editNodeForm.name || ''}
                onChange={(e) => setEditNodeForm({ ...editNodeForm, name: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Unit Code</label>
              <input
                type="text"
                className="form-control"
                value={editNodeForm.code || ''}
                onChange={(e) => setEditNodeForm({ ...editNodeForm, code: e.target.value.toUpperCase() })}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label>SEBI Audit Boundary</label>
                <select
                  className="form-control"
                  value={editNodeForm.boundary ? 'true' : 'false'}
                  onChange={(e) => setEditNodeForm({ ...editNodeForm, boundary: e.target.value === 'true' })}
                >
                  <option value="true">SEBI In-Scope (Consolidated)</option>
                  <option value="false">Excluded from Audit</option>
                </select>
              </div>

              <div className="form-group">
                <label>Ownership Share (%)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  className="form-control"
                  value={editNodeForm.ownership_pct !== undefined ? editNodeForm.ownership_pct : 100}
                  onChange={(e) => setEditNodeForm({ ...editNodeForm, ownership_pct: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label>Project Sector</label>
                <select
                  className="form-control"
                  value={editNodeForm.project_type || 'corporate'}
                  onChange={(e) => setEditNodeForm({ ...editNodeForm, project_type: e.target.value })}
                >
                  {PROJECT_TYPES.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Operational State / UT</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Telangana, Andhra Pradesh"
                  value={editNodeForm.location_state || ''}
                  onChange={(e) => setEditNodeForm({ ...editNodeForm, location_state: e.target.value })}
                />
              </div>
            </div>

            {/* Administrator Password Authorization Gate */}
            <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '8px', padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, color: '#ef4444', fontWeight: 600, fontSize: '13px' }}>
                <ShieldAlert size={16} />
                <span>Administrator Password Required</span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 10px 0', lineHeight: 1.4 }}>
                Enter your System Administrator password to cryptographically authorize this hierarchy update.
              </p>
              <input
                type="password"
                className="form-control"
                placeholder="Enter your administrator password"
                value={adminPasswordForNode}
                onChange={(e) => setAdminPasswordForNode(e.target.value)}
                required
              />
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid var(--border-default)', paddingTop: 14, marginTop: 10 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setEditingNode(null)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={updatingNodePending}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                {updatingNodePending ? <RefreshCw size={14} className="spin" /> : <CheckCircle2 size={14} />}
                <span>{updatingNodePending ? 'Authorizing...' : 'Authorize & Save Changes'}</span>
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
