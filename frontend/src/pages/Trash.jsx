import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Trash2, FileText, Calendar, User, Search, RefreshCw, AlertCircle,
  RotateCcw, Shield, Check, Clock, CheckCircle2, X, Building2, Layers
} from 'lucide-react';
import { evidenceApi, orgApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';

export default function Trash() {
  const qc = useQueryClient();
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('evidence'); // 'evidence' | 'org'
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [restoreTarget, setRestoreTarget] = useState(null);
  const [restoreReason, setRestoreReason] = useState('Restoration to active ESG ledger');
  const [orgRestoreTarget, setOrgRestoreTarget] = useState(null);
  const [notice, setNotice] = useState(null);

  // System Admin Clean Trash State
  const [showCleanModal, setShowCleanModal] = useState(false);
  const [cleanPassword, setCleanPassword] = useState('');
  const [cleanError, setCleanError] = useState('');
  const [cleanPending, setCleanPending] = useState(false);

  const canManageOrgTrash = currentUser?.role !== 'project_admin';

  // Fetch hierarchical trash can records
  const { data: trashItems = [], isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['evidence-trash'],
    queryFn: async () => {
      const res = await evidenceApi.getTrash();
      return res.data;
    }
  });

  // Fetch Org Nodes Trash
  const { data: orgTrashItems = [], isLoading: orgTrashLoading, refetch: refetchOrgTrash, isRefetching: orgRefetching } = useQuery({
    queryKey: ['org-trash'],
    queryFn: async () => {
      try {
        const res = await orgApi.getTrash();
        return res.data;
      } catch {
        return [];
      }
    }
  });

  // Restore Mutation (Evidence)
  const restoreMutation = useMutation({
    mutationFn: async ({ id, reason }) => evidenceApi.restore(id, reason),
    onSuccess: (res, vars) => {
      qc.invalidateQueries({ queryKey: ['evidence-trash'] });
      qc.invalidateQueries({ queryKey: ['evidence-list'] });
      qc.invalidateQueries({ queryKey: ['admin-audit-log'] });
      const name = restoreTarget?.original_name || 'Document';
      setNotice({
        type: 'success',
        text: `Document "${name}" was successfully restored to the active Evidence Vault.`
      });
      setRestoreTarget(null);
      setRestoreReason('Restoration to active ESG ledger');
    },
    onError: (err) => {
      setNotice({
        type: 'error',
        text: err.response?.data?.detail || err.message || 'Failed to restore document.'
      });
    }
  });

  // Restore Org Node Mutation
  const restoreOrgMutation = useMutation({
    mutationFn: (nodeId) => orgApi.restoreNode(nodeId),
    onSuccess: (res, nodeId) => {
      qc.invalidateQueries({ queryKey: ['org-trash'] });
      qc.invalidateQueries({ queryKey: ['org-nodes'] });
      setNotice({ type: 'success', text: `Organization unit restored successfully.` });
      setOrgRestoreTarget(null);
    },
    onError: (err) => {
      setNotice({ type: 'error', text: err.response?.data?.detail || err.message || 'Failed to restore organization unit.' });
    }
  });

  // Clean / Empty Trash Handler for System Admin
  const handleCleanTrash = async (e) => {
    e.preventDefault();
    if (!cleanPassword) return;
    setCleanPending(true);
    setCleanError('');
    try {
      if (activeTab === 'org') {
        const res = await orgApi.cleanTrash(cleanPassword);
        setNotice({ type: 'success', text: res.data.message || 'Organization Trash Can cleaned successfully.' });
      } else {
        const res = await evidenceApi.cleanTrash(cleanPassword);
        setNotice({ type: 'success', text: res.data.message || 'Evidence Trash Can cleaned successfully.' });
      }
      setShowCleanModal(false);
      setCleanPassword('');
      qc.invalidateQueries({ queryKey: ['evidence-trash'] });
      qc.invalidateQueries({ queryKey: ['org-trash'] });
    } catch (err) {
      setCleanError(err.response?.data?.detail || err.message || 'Failed to clean trash can.');
    } finally {
      setCleanPending(false);
    }
  };

  // Filter items
  const filteredItems = trashItems.filter(item => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      !term ||
      (item.original_name && item.original_name.toLowerCase().includes(term)) ||
      (item.evidence_display_id && item.evidence_display_id.toLowerCase().includes(term)) ||
      (item.project_id && item.project_id.toLowerCase().includes(term)) ||
      (item.project_name && item.project_name.toLowerCase().includes(term)) ||
      (item.deletion_reason && item.deletion_reason.toLowerCase().includes(term)) ||
      (item.deleted_by_name && item.deleted_by_name.toLowerCase().includes(term));

    const matchesType =
      filterType === 'ALL' ||
      (item.bill_type && item.bill_type.toLowerCase() === filterType.toLowerCase()) ||
      (item.doc_type && item.doc_type.toLowerCase() === filterType.toLowerCase());

    return matchesSearch && matchesType;
  });

  // Distinct types for filter dropdown
  const availableTypes = Array.from(new Set(trashItems.map(i => i.bill_type || i.doc_type).filter(Boolean)));

  // Filter Org Units
  const filteredOrgItems = orgTrashItems.filter(node => {
    const term = searchTerm.toLowerCase();
    return (
      !term ||
      (node.name && node.name.toLowerCase().includes(term)) ||
      (node.code && node.code.toLowerCase().includes(term)) ||
      (node.path && node.path.toLowerCase().includes(term)) ||
      (node.type && node.type.toLowerCase().includes(term)) ||
      (node.project_type && node.project_type.toLowerCase().includes(term))
    );
  });

  return (
    <div style={{ padding: '32px 40px', maxWidth: '1300px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6,
            fontSize: 11, fontFamily: 'monospace', fontWeight: 600, color: '#64748b', textTransform: 'uppercase'
          }}>
            <Shield size={12} color="#dc2626" />
            <span>Audit-Controlled Recovery Vault</span>
            <span>•</span>
            <span>Hierarchical Scope Isolation</span>
          </div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ background: '#FEE2E2', padding: 8, borderRadius: 8, color: '#EF4444' }}>
              <Trash2 size={20} />
            </div>
            Hierarchical Trash Can
          </h1>
          <p style={{ margin: '4px 0 0 0', color: '#64748B', fontSize: 13 }}>
            Controlled archive of soft-deleted records within your authorized organizational boundary.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {currentUser?.role === 'system_admin' && (
            <button
              onClick={() => {
                setShowCleanModal(true);
                setCleanPassword('');
                setCleanError('');
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 16px', background: '#FEE2E2', border: '1px solid #FCA5A5',
                borderRadius: 6, fontSize: 13, fontWeight: 700, color: '#DC2626',
                cursor: 'pointer'
              }}
              title="Permanently delete all soft-deleted records"
            >
              <Trash2 size={14} />
              <span>Clean Trash (Delete All)</span>
            </button>
          )}
          <button
            onClick={() => { refetch(); refetchOrgTrash(); }}
            disabled={isRefetching || orgRefetching}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 16px', background: '#FFFFFF', border: '1px solid #E2E8F0',
              borderRadius: 6, fontSize: 13, fontWeight: 600, color: '#475569',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={14} className={isRefetching || orgRefetching ? 'spin' : ''} />
            {isRefetching || orgRefetching ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Notification Banner */}
      {notice && (
        <div style={{
          padding: '12px 18px',
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 600,
          background: notice.type === 'success' ? '#ecfdf5' : '#fef2f2',
          color: notice.type === 'success' ? '#065f46' : '#991b1b',
          border: `1px solid ${notice.type === 'success' ? '#a7f3d0' : '#fca5a5'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {notice.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{notice.text}</span>
          </div>
          <button
            onClick={() => setNotice(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Stats Cards Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '14px 18px' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Archived In Scope</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', marginTop: 4 }}>{trashItems.length}</div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>Soft-deleted evidence files</div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '14px 18px' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Current Role</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#2563eb', marginTop: 8 }}>
            {(currentUser?.role || 'User').toUpperCase()}
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>Boundary enforced on server</div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '14px 18px' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Restorable Files</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#059669', marginTop: 4 }}>{trashItems.length}</div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>1-click restoration with audit</div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '14px 18px' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Security Policy</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#7c3aed', marginTop: 8 }}>Password &amp; Reason Verified</div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>Zero permanent data loss</div>
        </div>
      </div>

      {/* Tab Switcher */}
      {canManageOrgTrash && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <button
            type="button"
            onClick={() => { setActiveTab('evidence'); setSearchTerm(''); }}
            style={{
              padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              border: activeTab === 'evidence' ? '1px solid #2563EB' : '1px solid #E2E8F0',
              background: activeTab === 'evidence' ? '#EFF6FF' : '#FFFFFF',
              color: activeTab === 'evidence' ? '#1D4ED8' : '#64748B',
              display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.15s'
            }}
          >
            <FileText size={15} color={activeTab === 'evidence' ? '#2563EB' : '#94A3B8'} />
            <span>Evidence Documents</span>
            <span style={{
              background: activeTab === 'evidence' ? '#2563EB' : '#F1F5F9',
              color: activeTab === 'evidence' ? '#FFFFFF' : '#64748B',
              fontSize: 11, padding: '1px 7px', borderRadius: 99, fontWeight: 700
            }}>
              {trashItems.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('org'); setSearchTerm(''); }}
            style={{
              padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              border: activeTab === 'org' ? '1px solid #2563EB' : '1px solid #E2E8F0',
              background: activeTab === 'org' ? '#EFF6FF' : '#FFFFFF',
              color: activeTab === 'org' ? '#1D4ED8' : '#64748B',
              display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.15s'
            }}
          >
            <Building2 size={15} color={activeTab === 'org' ? '#2563EB' : '#94A3B8'} />
            <span>Organization Units</span>
            <span style={{
              background: activeTab === 'org' ? '#2563EB' : '#F1F5F9',
              color: activeTab === 'org' ? '#FFFFFF' : '#64748B',
              fontSize: 11, padding: '1px 7px', borderRadius: 99, fontWeight: 700
            }}>
              {orgTrashItems.length}
            </span>
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: 14, top: 12 }} />
          <input
            type="text"
            placeholder={
              activeTab === 'evidence'
                ? "Search by Evidence ID, Document Name, Project, Reason, or Deleted By..."
                : "Search by Unit Name, Code, ltree Path, or Type..."
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%', padding: '9px 14px 9px 40px', border: '1px solid #E2E8F0',
              borderRadius: 8, fontSize: 13, outline: 'none', color: '#0F172A', background: '#FFFFFF'
            }}
          />
        </div>
        {activeTab === 'evidence' && (
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{
              width: 180, padding: '9px 12px', border: '1px solid #E2E8F0',
              borderRadius: 8, fontSize: 13, color: '#0F172A', background: '#FFFFFF', outline: 'none'
            }}
          >
            <option value="ALL">All Document Types</option>
            {availableTypes.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        )}
      </div>

      {/* Table Content */}
      {activeTab === 'evidence' && (
        isLoading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#94A3B8' }}>Loading authorized trash records...</div>
      ) : error ? (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', padding: 16, borderRadius: 8, color: '#DC2626', display: 'flex', alignItems: 'center', gap: 12 }}>
          <AlertCircle size={20} />
          <span>Failed to load Trash Can records. {error.response?.data?.detail || error.message}</span>
        </div>
      ) : filteredItems.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', border: '1px dashed #E2E8F0', borderRadius: 12, background: '#F8FAFC' }}>
          <Trash2 size={40} color="#CBD5E1" style={{ marginBottom: 16 }} />
          <h3 style={{ margin: '0 0 8px 0', color: '#334155', fontSize: 16 }}>No deleted evidence files found</h3>
          <p style={{ margin: 0, color: '#94A3B8', fontSize: 13 }}>
            {searchTerm || filterType !== 'ALL'
              ? 'No deleted records matched your filter criteria.'
              : 'There are no deleted evidence files in your authorized organizational scope.'}
          </p>
        </div>
      ) : (
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontWeight: 600 }}>
                <th style={{ padding: '12px 16px' }}>Evidence ID</th>
                <th style={{ padding: '12px 16px' }}>Document Name</th>
                <th style={{ padding: '12px 16px' }}>Type / Category</th>
                <th style={{ padding: '12px 16px' }}>Scope &amp; Project</th>
                <th style={{ padding: '12px 16px' }}>Deleted By</th>
                <th style={{ padding: '12px 16px' }}>Deletion Reason</th>
                <th style={{ padding: '12px 16px' }}>Deleted At</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map(item => (
                <tr key={item.id} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.15s' }}>
                  {/* Evidence Display ID */}
                  <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#2563eb', fontWeight: 600, fontSize: 12 }}>
                    {item.evidence_display_id || item.id.substring(0, 8)}
                  </td>

                  {/* Document Name */}
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 600, color: '#0F172A' }}>{item.original_name}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>
                      SHA: {item.sha256 ? item.sha256.substring(0, 10) + '...' : '—'}
                    </div>
                  </td>

                  {/* Type */}
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      background: '#F1F5F9', padding: '2px 8px', borderRadius: 4,
                      fontSize: 11, fontWeight: 600, color: '#475569'
                    }}>
                      <FileText size={11} />
                      {item.bill_type || item.doc_type || 'OTHER'}
                    </span>
                  </td>

                  {/* Scope & Project */}
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Building2 size={13} color="#94A3B8" />
                      <span style={{ fontWeight: 500, color: '#0F172A' }}>
                        {item.project_name || item.project_id || 'Group-Wide'}
                      </span>
                    </div>
                    {item.subsidiary_name && (
                      <div style={{ fontSize: 11, color: '#94a3b8', marginLeft: 19 }}>
                        {item.subsidiary_name}
                      </div>
                    )}
                  </td>

                  {/* Deleted By */}
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div style={{
                        width: 24, height: 24, borderRadius: '50%', background: '#FEE2E2',
                        color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, fontWeight: 700
                      }}>
                        {(item.deleted_by_name || 'U').substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ color: '#0F172A', fontWeight: 500, fontSize: 12 }}>
                          {item.deleted_by_name || 'Administrator'}
                        </div>
                        <div style={{ color: '#94A3B8', fontSize: 10, textTransform: 'uppercase' }}>
                          {item.deleted_by_role || 'User'}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Reason */}
                  <td style={{ padding: '12px 16px', maxWidth: 220 }}>
                    <div
                      style={{
                        color: '#334155', fontSize: 12, lineHeight: 1.4,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                      }}
                      title={item.deletion_reason}
                    >
                      {item.deletion_reason || '—'}
                    </div>
                  </td>

                  {/* Date */}
                  <td style={{ padding: '12px 16px', color: '#64748B', fontSize: 12, whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Calendar size={12} color="#94A3B8" />
                      {item.deleted_at ? new Date(item.deleted_at).toLocaleString() : '—'}
                    </div>
                  </td>

                  {/* Action: Restore */}
                  <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{
                        color: '#059669', borderColor: 'rgba(5, 150, 105, 0.3)',
                        display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', fontSize: 12
                      }}
                      onClick={() => {
                        setRestoreTarget(item);
                        setRestoreReason('Restoration to active ESG ledger');
                      }}
                    >
                      <RotateCcw size={12} />
                      Restore
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    )}

      {/* Active Tab: Organization Units Table */}
      {activeTab === 'org' && (
        orgTrashLoading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#94A3B8' }}>Loading deleted organization units...</div>
        ) : filteredOrgItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', border: '1px dashed #E2E8F0', borderRadius: 12, background: '#F8FAFC' }}>
            <Building2 size={40} color="#CBD5E1" style={{ marginBottom: 16 }} />
            <h3 style={{ margin: '0 0 8px 0', color: '#334155', fontSize: 16 }}>No deleted organization units found</h3>
            <p style={{ margin: 0, color: '#94A3B8', fontSize: 13 }}>
              {searchTerm ? 'No deleted units match your search query.' : 'There are no deleted organization units in the trash can.'}
            </p>
          </div>
        ) : (
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontWeight: 600 }}>
                  <th style={{ padding: '12px 16px' }}>Entity / Unit Name</th>
                  <th style={{ padding: '12px 16px' }}>Code</th>
                  <th style={{ padding: '12px 16px' }}>Hierarchy Level</th>
                  <th style={{ padding: '12px 16px' }}>ltree Path</th>
                  <th style={{ padding: '12px 16px' }}>Sector / Portfolio</th>
                  <th style={{ padding: '12px 16px' }}>Ownership</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrgItems.map(node => (
                  <tr key={node.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Building2 size={14} color="#6366f1" />
                        <span>{node.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#6366f1', fontWeight: 600, fontSize: 12 }}>
                      {node.code}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700,
                        background: '#EEF2FF', color: '#4F46E5', textTransform: 'uppercase'
                      }}>
                        {node.type?.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#64748B', fontSize: 11 }}>
                      {node.path || '—'}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#475569' }}>
                      {node.project_type || '—'}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#475569' }}>
                      {node.ownership_pct != null ? `${node.ownership_pct}%` : '—'}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{
                          color: '#059669', borderColor: 'rgba(5, 150, 105, 0.3)',
                          display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', fontSize: 12
                        }}
                        onClick={() => setOrgRestoreTarget(node)}
                      >
                        <RotateCcw size={12} />
                        Restore
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Confirmation Modal: Restore Evidence */}
      <Modal
        isOpen={!!restoreTarget}
        onClose={() => setRestoreTarget(null)}
        maxWidth="480px"
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="modal-header-icon" style={{ background: 'rgba(16, 185, 129, 0.15)' }}>
              <RotateCcw size={18} color="#059669" />
            </div>
            <div>
              <h3 style={{ fontSize: 16, color: '#fff', margin: 0 }}>Restore Evidence File</h3>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                Re-activates document in active vault and preserves audit lineage
              </p>
            </div>
          </div>
          <button className="icon-btn" onClick={() => setRestoreTarget(null)}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ fontSize: 13, lineHeight: 1.5, margin: 0 }}>
            Are you sure you want to restore{' '}
            <strong style={{ color: '#fff' }}>{restoreTarget?.original_name}</strong> (
            <span style={{ fontFamily: 'monospace', color: '#38bdf8' }}>{restoreTarget?.evidence_display_id}</span>)?
          </p>

          <div style={{ padding: '10px 14px', borderRadius: 6, background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', fontSize: 12, color: 'var(--text-secondary)' }}>
            This document will reappear in all active evidence listings, project submissions, and calculation traces. An immutable audit record will log this restoration.
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600 }}>Restoration Reason / Justification</label>
            <input
              type="text"
              className="form-control"
              value={restoreReason}
              onChange={(e) => setRestoreReason(e.target.value)}
              placeholder="e.g. Inadvertent deletion, verified supporting document"
            />
          </div>

          <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setRestoreTarget(null)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              style={{ background: '#059669', borderColor: '#059669' }}
              disabled={restoreMutation.isPending}
              onClick={() => restoreMutation.mutate({
                id: restoreTarget.id,
                reason: restoreReason
              })}
            >
              {restoreMutation.isPending ? 'Restoring...' : '✓ Confirm Restoration'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Confirmation Modal: Restore Org Unit */}
      {orgRestoreTarget && (
        <Modal
          isOpen={!!orgRestoreTarget}
          onClose={() => setOrgRestoreTarget(null)}
          maxWidth="480px"
        >
          <div className="modal-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="modal-header-icon" style={{ background: 'rgba(16, 185, 129, 0.15)' }}>
                <RotateCcw size={18} color="#059669" />
              </div>
              <div>
                <h3 style={{ fontSize: 16, color: '#fff', margin: 0 }}>Restore Organization Unit</h3>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                  Re-activates unit within the 4-tier MEIL hierarchy structure
                </p>
              </div>
            </div>
            <button className="icon-btn" onClick={() => setOrgRestoreTarget(null)}>
              <X size={18} />
            </button>
          </div>

          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ fontSize: 13, lineHeight: 1.5, margin: 0 }}>
              Are you sure you want to restore{' '}
              <strong style={{ color: '#fff' }}>{orgRestoreTarget?.name}</strong> (
              <span style={{ fontFamily: 'monospace', color: '#38bdf8' }}>{orgRestoreTarget?.code}</span>)?
            </p>

            <div style={{ padding: '10px 14px', borderRadius: 6, background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', fontSize: 12, color: 'var(--text-secondary)' }}>
              This unit will be restored to the active hierarchy tree. All child relations and boundary assignments will be preserved.
            </div>

            <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setOrgRestoreTarget(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ background: '#059669', borderColor: '#059669' }}
                disabled={restoreOrgMutation.isPending}
                onClick={() => restoreOrgMutation.mutate(orgRestoreTarget.id)}
              >
                {restoreOrgMutation.isPending ? 'Restoring...' : '✓ Confirm Restoration'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirmation Modal: Clean / Empty Trash */}
      {showCleanModal && (
        <Modal
          isOpen={showCleanModal}
          onClose={() => { setShowCleanModal(false); setCleanError(''); setCleanPassword(''); }}
          maxWidth="480px"
        >
          <div className="modal-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="modal-header-icon" style={{ background: 'rgba(239, 68, 68, 0.15)' }}>
                <Trash2 size={18} color="#ef4444" />
              </div>
              <div>
                <h3 style={{ fontSize: 16, color: '#fff', margin: 0 }}>
                  Clean {activeTab === 'org' ? 'Organization' : 'Evidence'} Trash Can
                </h3>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                  Permanently purge all soft-deleted records (no recovery)
                </p>
              </div>
            </div>
            <button className="icon-btn" onClick={() => { setShowCleanModal(false); setCleanError(''); setCleanPassword(''); }}>
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleCleanTrash} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ padding: '10px 14px', borderRadius: 6, background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', fontSize: 12, color: 'var(--text-secondary)' }}>
              ⚠️ <strong>Warning:</strong> This will permanently delete all {activeTab === 'org' ? 'organization units' : 'evidence files'} currently in the Trash Can. This action is irreversible.
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>System Administrator Password <span style={{ color: '#ef4444' }}>*</span></label>
              <input
                type="password"
                className="form-control"
                value={cleanPassword}
                onChange={(e) => setCleanPassword(e.target.value)}
                placeholder="Enter administrator password to authorize purge"
                required
              />
            </div>

            {cleanError && (
              <div className="login-error-banner" style={{ margin: 0 }}>
                <AlertCircle size={15} />
                <span>{cleanError}</span>
              </div>
            )}

            <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => { setShowCleanModal(false); setCleanError(''); setCleanPassword(''); }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn"
                disabled={cleanPending || !cleanPassword}
                style={{ background: '#dc2626', color: '#fff', border: 'none' }}
              >
                {cleanPending ? 'Purging...' : 'Delete All / Empty Trash'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
