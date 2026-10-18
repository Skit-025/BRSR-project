import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Trash2, FileText, Calendar, User, Search, RefreshCw, AlertCircle,
  RotateCcw, Shield, Check, Clock, CheckCircle2, X, Building2, Layers, Eye,
  Info, Filter, ExternalLink, HardHat
} from 'lucide-react';
import { evidenceApi, orgApi } from '../api/client';
import { useAuth, ROLE_META } from '../context/AuthContext';
import Modal from '../components/Modal';
import PageHelpButton from '../components/PageHelpButton';

export default function Trash() {
  const qc = useQueryClient();
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('evidence'); // 'evidence' | 'org'
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [restoreTarget, setRestoreTarget] = useState(null);
  const [restoreReason, setRestoreReason] = useState('Restoration to active ESG ledger');
  const [orgRestoreTarget, setOrgRestoreTarget] = useState(null);
  const [selectedEvidence, setSelectedEvidence] = useState(null);
  const [notice, setNotice] = useState(null);

  // System Admin Clean Trash State
  const [showCleanModal, setShowCleanModal] = useState(false);
  const [cleanPassword, setCleanPassword] = useState('');
  const [cleanError, setCleanError] = useState('');
  const [cleanPending, setCleanPending] = useState(false);

  const userRole = currentUser?.role || 'user';
  const roleMeta = ROLE_META[userRole] || { label: userRole.toUpperCase(), color: '#2563EB', icon: '👤', scopeLabel: 'Scoped' };
  const canManageOrgTrash = userRole !== 'project_admin';

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
    },
    enabled: canManageOrgTrash
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

  // Filter evidence items
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
    <div className="page-content anim-fade-up" style={{
      maxWidth: '1600px',
      margin: '0 auto',
      width: '100%',
      boxSizing: 'border-box',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* ── Page Header ── */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 20
      }}>
        <div style={{ minWidth: 280, flex: 1 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 6,
            fontSize: 11,
            fontFamily: 'monospace',
            fontWeight: 700,
            color: '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '0.04em'
          }}>
            <Shield size={13} color="#dc2626" />
            <span>Audit-Controlled Recovery Vault</span>
            <span>•</span>
            <span>Hierarchical Scope Isolation</span>
          </div>
          <h1 style={{
            margin: 0,
            fontSize: 'clamp(20px, 2.2vw, 26px)',
            fontWeight: 800,
            color: '#0F172A',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            letterSpacing: '-0.02em'
          }}>
            <div style={{
              background: '#FEE2E2',
              padding: '8px 10px',
              borderRadius: 8,
              color: '#EF4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 1px 2px rgba(239, 68, 68, 0.15)'
            }}>
              <Trash2 size={22} />
            </div>
            Hierarchical Trash Can
          </h1>
          <p style={{ margin: '6px 0 0 0', color: '#64748B', fontSize: 13, lineHeight: 1.5 }}>
            Controlled archive of soft-deleted records within your authorized organizational boundary.
            {!canManageOrgTrash && (
              <span style={{ display: 'inline-block', marginLeft: 6, color: '#059669', fontWeight: 600 }}>
                (Project Isolation: Showing documents assigned to your site)
              </span>
            )}
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <PageHelpButton title="Trash Guide" route="/trash" />

          {currentUser?.role === 'system_admin' && (
            <button
              onClick={() => {
                setShowCleanModal(true);
                setCleanPassword('');
                setCleanError('');
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                padding: '8px 16px',
                background: '#FEE2E2',
                border: '1px solid #FCA5A5',
                borderRadius: 7,
                fontSize: 13,
                fontWeight: 700,
                color: '#DC2626',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: '0 1px 2px rgba(220, 38, 38, 0.08)'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#FCDADA'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#FEE2E2'; }}
              title="Permanently purge all soft-deleted records"
            >
              <Trash2 size={14} />
              <span>Clean Trash (Purge All)</span>
            </button>
          )}

          <button
            onClick={() => { refetch(); if (canManageOrgTrash) refetchOrgTrash(); }}
            disabled={isRefetching || orgRefetching}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              padding: '8px 16px',
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: 7,
              fontSize: 13,
              fontWeight: 600,
              color: '#475569',
              cursor: isRefetching || orgRefetching ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
            }}
            onMouseEnter={(e) => { if (!isRefetching && !orgRefetching) e.currentTarget.style.borderColor = '#CBD5E1'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; }}
          >
            <RefreshCw size={14} className={isRefetching || orgRefetching ? 'spin' : ''} />
            {isRefetching || orgRefetching ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* ── Notification Banner ── */}
      {notice && (
        <div style={{
          padding: '12px 18px',
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 600,
          background: notice.type === 'success' ? '#ECFDF5' : '#FEF2F2',
          color: notice.type === 'success' ? '#065F46' : '#991B1B',
          border: `1px solid ${notice.type === 'success' ? '#A7F3D0' : '#FCA5A5'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 20,
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
            {notice.type === 'success' ? <CheckCircle2 size={18} color="#059669" /> : <AlertCircle size={18} color="#DC2626" />}
            <span style={{ wordBreak: 'break-word' }}>
              {typeof notice.text === 'object' ? JSON.stringify(notice.text) : (notice.text || notice.message || notice.msg)}
            </span>
          </div>
          <button
            onClick={() => setNotice(null)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'inherit',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 4
            }}
            title="Dismiss notification"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── Stats Strip (Responsive & Dynamic per Role/Tab) ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 14,
        marginBottom: 20
      }}>
        {/* Card 1: Evidence in Scope */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 8,
          padding: '14px 18px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Evidence in Scope
            </span>
            <FileText size={15} color="#2563EB" />
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#0F172A', marginTop: 4 }}>
            {isLoading ? '...' : trashItems.length}
          </div>
          <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
            Soft-deleted evidence files
          </div>
        </div>

        {/* Card 2: Org Units in Scope (or Project Boundary) */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 8,
          padding: '14px 18px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {canManageOrgTrash ? 'Org Units in Scope' : 'Assigned Boundary'}
            </span>
            {canManageOrgTrash ? <Building2 size={15} color="#6366F1" /> : <HardHat size={15} color="#059669" />}
          </div>
          <div style={{ fontSize: canManageOrgTrash ? 24 : 16, fontWeight: 800, color: canManageOrgTrash ? '#4F46E5' : '#059669', marginTop: 4 }}>
            {canManageOrgTrash ? (orgTrashLoading ? '...' : orgTrashItems.length) : (currentUser?.assigned_project || 'Site Bound')}
          </div>
          <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
            {canManageOrgTrash ? 'Soft-deleted organizational units' : 'Project-level isolated view'}
          </div>
        </div>

        {/* Card 3: Active Session Scope / Role */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 8,
          padding: '14px 18px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Active Session Scope
            </span>
            <User size={15} color={roleMeta.color || '#2563EB'} />
          </div>
          <div style={{
            fontSize: 14,
            fontWeight: 700,
            color: roleMeta.color || '#2563EB',
            marginTop: 6,
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}>
            <span>{roleMeta.icon}</span>
            <span>{roleMeta.label}</span>
          </div>
          <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>
            {roleMeta.scopeLabel} scope enforced on server
          </div>
        </div>

        {/* Card 4: Audit Lineage & Protection */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 8,
          padding: '14px 18px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Audit &amp; Recovery
            </span>
            <Shield size={15} color="#059669" />
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#059669', marginTop: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
            <Check size={14} />
            <span>1-Click Verified Restore</span>
          </div>
          <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>
            Immutable audit record on action
          </div>
        </div>
      </div>

      {/* ── Tab Switcher (Evidence vs Org Units) ── */}
      {canManageOrgTrash && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => { setActiveTab('evidence'); setSearchTerm(''); }}
            style={{
              padding: '9px 18px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              border: activeTab === 'evidence' ? '1px solid #2563EB' : '1px solid #E2E8F0',
              background: activeTab === 'evidence' ? '#EFF6FF' : '#FFFFFF',
              color: activeTab === 'evidence' ? '#1D4ED8' : '#64748B',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.15s ease',
              boxShadow: activeTab === 'evidence' ? '0 1px 2px rgba(37, 99, 235, 0.1)' : 'none'
            }}
          >
            <FileText size={15} color={activeTab === 'evidence' ? '#2563EB' : '#94A3B8'} />
            <span>Evidence Documents</span>
            <span style={{
              background: activeTab === 'evidence' ? '#2563EB' : '#F1F5F9',
              color: activeTab === 'evidence' ? '#FFFFFF' : '#64748B',
              fontSize: 11,
              padding: '1px 8px',
              borderRadius: 99,
              fontWeight: 700
            }}>
              {trashItems.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('org'); setSearchTerm(''); }}
            style={{
              padding: '9px 18px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              border: activeTab === 'org' ? '1px solid #4F46E5' : '1px solid #E2E8F0',
              background: activeTab === 'org' ? '#EEF2FF' : '#FFFFFF',
              color: activeTab === 'org' ? '#4338CA' : '#64748B',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.15s ease',
              boxShadow: activeTab === 'org' ? '0 1px 2px rgba(99, 102, 241, 0.1)' : 'none'
            }}
          >
            <Building2 size={15} color={activeTab === 'org' ? '#4F46E5' : '#94A3B8'} />
            <span>Organization Units</span>
            <span style={{
              background: activeTab === 'org' ? '#4F46E5' : '#F1F5F9',
              color: activeTab === 'org' ? '#FFFFFF' : '#64748B',
              fontSize: 11,
              padding: '1px 8px',
              borderRadius: 99,
              fontWeight: 700
            }}>
              {orgTrashItems.length}
            </span>
          </button>
        </div>
      )}

      {/* ── Search and Filter Bar ── */}
      <div style={{
        display: 'flex',
        gap: 12,
        marginBottom: 16,
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <div style={{ flex: 1, minWidth: 260, position: 'relative' }}>
          <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: 14, top: 11 }} />
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
              width: '100%',
              padding: '9px 36px 9px 40px',
              border: '1px solid #CBD5E1',
              borderRadius: 8,
              fontSize: 13,
              outline: 'none',
              color: '#0F172A',
              background: '#FFFFFF',
              boxSizing: 'border-box',
              transition: 'border-color 0.15s ease'
            }}
            onFocus={(e) => { e.target.style.borderColor = '#2563EB'; }}
            onBlur={(e) => { e.target.style.borderColor = '#CBD5E1'; }}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              style={{
                position: 'absolute',
                right: 12,
                top: 10,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#94A3B8',
                padding: 0
              }}
              title="Clear search"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {activeTab === 'evidence' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              style={{
                width: 190,
                padding: '9px 12px',
                border: '1px solid #CBD5E1',
                borderRadius: 8,
                fontSize: 13,
                color: '#0F172A',
                background: '#FFFFFF',
                outline: 'none',
                cursor: 'pointer',
                boxSizing: 'border-box'
              }}
            >
              <option value="ALL">All Document Types ({trashItems.length})</option>
              {availableTypes.map(t => {
                const count = trashItems.filter(i => (i.bill_type || i.doc_type) === t).length;
                return (
                  <option key={t} value={t}>{t} ({count})</option>
                );
              })}
            </select>
          </div>
        )}

        {/* Results Counter Badge */}
        <div style={{
          fontSize: 12,
          color: '#64748B',
          fontWeight: 600,
          background: '#F1F5F9',
          padding: '6px 12px',
          borderRadius: 6,
          whiteSpace: 'nowrap'
        }}>
          {activeTab === 'evidence'
            ? `Showing ${filteredItems.length} of ${trashItems.length} records`
            : `Showing ${filteredOrgItems.length} of ${orgTrashItems.length} units`}
        </div>
      </div>

      {/* ── Table Content: Evidence Documents ── */}
      {activeTab === 'evidence' && (
        isLoading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#94A3B8' }}>
            <RefreshCw size={24} className="spin" style={{ margin: '0 auto 12px', display: 'block', color: '#2563EB' }} />
            Loading authorized trash records...
          </div>
        ) : error ? (
          <div style={{
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            padding: 16,
            borderRadius: 8,
            color: '#DC2626',
            display: 'flex',
            alignItems: 'center',
            gap: 12
          }}>
            <AlertCircle size={20} />
            <span>
              Failed to load Trash Can records. {typeof (error.response?.data?.detail || error.message) === 'object'
                ? JSON.stringify(error.response?.data?.detail || error.message)
                : (error.response?.data?.detail || error.message)}
            </span>
          </div>
        ) : filteredItems.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '70px 20px',
            border: '1px dashed #CBD5E1',
            borderRadius: 12,
            background: '#F8FAFC'
          }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: '#F1F5F9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <Trash2 size={28} color="#94A3B8" />
            </div>
            <h3 style={{ margin: '0 0 6px 0', color: '#334155', fontSize: 16, fontWeight: 700 }}>
              No deleted evidence files found
            </h3>
            <p style={{ margin: '0 0 16px 0', color: '#64748B', fontSize: 13 }}>
              {searchTerm || filterType !== 'ALL'
                ? 'No deleted records matched your filter criteria.'
                : 'There are no deleted evidence files in your authorized organizational scope.'}
            </p>
            {(searchTerm || filterType !== 'ALL') && (
              <button
                type="button"
                onClick={() => { setSearchTerm(''); setFilterType('ALL'); }}
                style={{
                  padding: '7px 16px',
                  borderRadius: 6,
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  color: '#2563EB',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Reset Search Filters
              </button>
            )}
          </div>
        ) : (
          /* Table Wrapper: Smooth horizontal scroll for smaller screens, responsive fit */
          <div
            className="custom-scrollbar"
            style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: 10,
              overflowX: 'auto',
              WebkitOverflowScrolling: 'touch',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              width: '100%',
              maxWidth: '100%'
            }}
          >
            <table style={{
              width: '100%',
              minWidth: '1120px',
              borderCollapse: 'collapse',
              textAlign: 'left',
              fontSize: 13
            }}>
              <thead>
                <tr style={{
                  background: '#F8FAFC',
                  borderBottom: '1px solid #E2E8F0',
                  color: '#475569',
                  fontWeight: 700,
                  fontSize: 12,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em'
                }}>
                  <th style={{ padding: '13px 16px', whiteSpace: 'nowrap', width: '13%' }}>Evidence ID</th>
                  <th style={{ padding: '13px 16px', whiteSpace: 'nowrap', width: '20%' }}>Document Name</th>
                  <th style={{ padding: '13px 16px', whiteSpace: 'nowrap', width: '11%' }}>Type / Category</th>
                  <th style={{ padding: '13px 16px', whiteSpace: 'nowrap', width: '15%' }}>Scope &amp; Project</th>
                  <th style={{ padding: '13px 16px', whiteSpace: 'nowrap', width: '13%' }}>Deleted By</th>
                  <th style={{ padding: '13px 16px', whiteSpace: 'nowrap', width: '15%' }}>Deletion Reason</th>
                  <th style={{ padding: '13px 16px', whiteSpace: 'nowrap', width: '13%' }}>Deleted At</th>
                  <th style={{ padding: '13px 16px', whiteSpace: 'nowrap', textAlign: 'right', minWidth: 160 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map(item => (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedEvidence(item)}
                    style={{
                      borderBottom: '1px solid #F1F5F9',
                      transition: 'background 0.15s ease',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8FAFC'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    {/* Evidence Display ID */}
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      <span
                        style={{
                          fontFamily: 'monospace',
                          color: '#2563EB',
                          fontWeight: 700,
                          fontSize: 12,
                          background: '#EFF6FF',
                          padding: '3px 8px',
                          borderRadius: 6,
                          border: '1px solid #DBEAFE',
                          display: 'inline-block'
                        }}
                        title="Click row to inspect full evidence details"
                      >
                        {item.evidence_display_id || item.id.substring(0, 8)}
                      </span>
                    </td>

                    {/* Document Name */}
                    <td style={{ padding: '12px 16px', maxWidth: 260 }}>
                      <div
                        style={{
                          fontWeight: 600,
                          color: '#0F172A',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                        title={item.original_name}
                      >
                        {item.original_name}
                      </div>
                      <div style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'monospace', marginTop: 2 }}>
                        SHA: {item.sha256 ? item.sha256.substring(0, 10) + '...' : '—'}
                      </div>
                    </td>

                    {/* Type / Category */}
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        background: '#F1F5F9',
                        padding: '3px 9px',
                        borderRadius: 5,
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#475569'
                      }}>
                        <FileText size={11} color="#64748B" />
                        {item.bill_type || item.doc_type || 'OTHER'}
                      </span>
                    </td>

                    {/* Scope & Project */}
                    <td style={{ padding: '12px 16px', maxWidth: 220 }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        <Building2 size={13} color="#94A3B8" style={{ flexShrink: 0 }} />
                        <span
                          style={{ fontWeight: 600, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis' }}
                          title={item.project_name || item.project_id || 'Group-Wide'}
                        >
                          {item.project_name || item.project_id || 'Group-Wide'}
                        </span>
                      </div>
                      {item.subsidiary_name && (
                        <div
                          style={{
                            fontSize: 11,
                            color: '#64748B',
                            marginLeft: 19,
                            marginTop: 1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                          title={item.subsidiary_name}
                        >
                          {item.subsidiary_name}
                        </div>
                      )}
                    </td>

                    {/* Deleted By */}
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 26,
                          height: 26,
                          borderRadius: '50%',
                          background: '#FEE2E2',
                          color: '#DC2626',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 11,
                          fontWeight: 700,
                          flexShrink: 0
                        }}>
                          {(item.deleted_by_name || 'U').substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ color: '#0F172A', fontWeight: 600, fontSize: 12 }}>
                            {item.deleted_by_name || 'Administrator'}
                          </div>
                          <div style={{ color: '#94A3B8', fontSize: 10, textTransform: 'uppercase', fontWeight: 600 }}>
                            {item.deleted_by_role || 'User'}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Reason - scrollable container with clean scrollbar */}
                    <td style={{ padding: '12px 16px', maxWidth: 240, verticalAlign: 'top' }}>
                      <div
                        className="custom-scrollbar"
                        style={{
                          color: '#334155',
                          fontSize: 12,
                          lineHeight: 1.45,
                          maxHeight: 64,
                          overflowY: 'auto',
                          paddingRight: 4,
                          wordBreak: 'break-word',
                          whiteSpace: 'normal'
                        }}
                        title={item.deletion_reason}
                      >
                        {item.deletion_reason || <span style={{ color: '#94A3B8', fontStyle: 'italic' }}>No reason recorded</span>}
                      </div>
                    </td>

                    {/* Date */}
                    <td style={{ padding: '12px 16px', color: '#64748B', fontSize: 12, whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Calendar size={13} color="#94A3B8" />
                        <span>{item.deleted_at ? new Date(item.deleted_at).toLocaleString() : '—'}</span>
                      </div>
                    </td>

                    {/* Actions: Details & Restore */}
                    <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <button
                          type="button"
                          style={{
                            color: '#2563EB',
                            borderColor: '#BFDBFE',
                            background: '#EFF6FF',
                            border: '1px solid #BFDBFE',
                            borderRadius: 6,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '5px 10px',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEvidence(item);
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = '#DBEAFE'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = '#EFF6FF'; }}
                          title="Inspect full evidence details"
                        >
                          <Eye size={13} />
                          Details
                        </button>

                        <button
                          type="button"
                          style={{
                            color: '#065F46',
                            borderColor: '#A7F3D0',
                            background: '#ECFDF5',
                            border: '1px solid #A7F3D0',
                            borderRadius: 6,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '5px 12px',
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setRestoreTarget(item);
                            setRestoreReason('Restoration to active ESG ledger');
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = '#D1FAE5'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = '#ECFDF5'; }}
                          title="Restore this file to active evidence vault"
                        >
                          <RotateCcw size={13} />
                          Restore
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* ── Table Content: Organization Units ── */}
      {activeTab === 'org' && canManageOrgTrash && (
        orgTrashLoading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#94A3B8' }}>
            <RefreshCw size={24} className="spin" style={{ margin: '0 auto 12px', display: 'block', color: '#4F46E5' }} />
            Loading deleted organization units...
          </div>
        ) : filteredOrgItems.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '70px 20px',
            border: '1px dashed #CBD5E1',
            borderRadius: 12,
            background: '#F8FAFC'
          }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: '#F1F5F9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <Building2 size={28} color="#94A3B8" />
            </div>
            <h3 style={{ margin: '0 0 6px 0', color: '#334155', fontSize: 16, fontWeight: 700 }}>
              No deleted organization units found
            </h3>
            <p style={{ margin: '0 0 16px 0', color: '#64748B', fontSize: 13 }}>
              {searchTerm
                ? 'No deleted organization units matched your search query.'
                : 'There are no deleted organization units in the trash can.'}
            </p>
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                style={{
                  padding: '7px 16px',
                  borderRadius: 6,
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  color: '#4F46E5',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Clear Search
              </button>
            )}
          </div>
        ) : (
          /* Table Wrapper for Organization Units: Horizontal scroll enabled */
          <div
            className="custom-scrollbar"
            style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: 10,
              overflowX: 'auto',
              WebkitOverflowScrolling: 'touch',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              width: '100%',
              maxWidth: '100%'
            }}
          >
            <table style={{
              width: '100%',
              minWidth: '980px',
              borderCollapse: 'collapse',
              textAlign: 'left',
              fontSize: 13
            }}>
              <thead>
                <tr style={{
                  background: '#F8FAFC',
                  borderBottom: '1px solid #E2E8F0',
                  color: '#475569',
                  fontWeight: 700,
                  fontSize: 12,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em'
                }}>
                  <th style={{ padding: '13px 16px', whiteSpace: 'nowrap' }}>Entity / Unit Name</th>
                  <th style={{ padding: '13px 16px', whiteSpace: 'nowrap' }}>Code</th>
                  <th style={{ padding: '13px 16px', whiteSpace: 'nowrap' }}>Hierarchy Level</th>
                  <th style={{ padding: '13px 16px', whiteSpace: 'nowrap' }}>ltree Path</th>
                  <th style={{ padding: '13px 16px', whiteSpace: 'nowrap' }}>Sector / Portfolio</th>
                  <th style={{ padding: '13px 16px', whiteSpace: 'nowrap' }}>Ownership</th>
                  <th style={{ padding: '13px 16px', whiteSpace: 'nowrap', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrgItems.map(node => (
                  <tr key={node.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Building2 size={15} color="#4F46E5" />
                        <span>{node.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#4F46E5', fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap' }}>
                      {node.code}
                    </td>
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 700,
                        background: '#EEF2FF',
                        color: '#4338CA',
                        textTransform: 'uppercase'
                      }}>
                        {node.type?.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#64748B', fontSize: 11, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={node.path}>
                      {node.path || '—'}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#475569', whiteSpace: 'nowrap' }}>
                      {node.project_type || '—'}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#475569', whiteSpace: 'nowrap' }}>
                      {node.ownership_pct != null ? `${node.ownership_pct}%` : '—'}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button
                        type="button"
                        style={{
                          color: '#065F46',
                          borderColor: '#A7F3D0',
                          background: '#ECFDF5',
                          border: '1px solid #A7F3D0',
                          borderRadius: 6,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          padding: '5px 12px',
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                        onClick={() => setOrgRestoreTarget(node)}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#D1FAE5'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = '#ECFDF5'; }}
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

      {/* ── Modal: Restore Evidence ── */}
      <Modal
        isOpen={!!restoreTarget}
        onClose={() => setRestoreTarget(null)}
        maxWidth="500px"
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="modal-header-icon" style={{ background: '#ECFDF5', border: '1px solid #A7F3D0' }}>
              <RotateCcw size={18} color="#059669" />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: 0 }}>Restore Evidence File</h3>
              <p style={{ fontSize: 12, color: '#64748B', margin: '2px 0 0 0' }}>
                Re-activates document in active vault and preserves audit lineage
              </p>
            </div>
          </div>
          <button className="icon-btn" onClick={() => setRestoreTarget(null)} title="Close">
            <X size={18} color="#64748B" />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ fontSize: 13, lineHeight: 1.5, margin: 0, color: '#334155' }}>
            Are you sure you want to restore{' '}
            <strong style={{ color: '#0F172A' }}>{restoreTarget?.original_name}</strong> (
            <span style={{ fontFamily: 'monospace', color: '#2563EB', fontWeight: 600 }}>{restoreTarget?.evidence_display_id}</span>)?
          </p>

          <div style={{
            padding: '10px 14px',
            borderRadius: 6,
            background: '#ECFDF5',
            border: '1px solid #A7F3D0',
            fontSize: 12,
            color: '#065F46',
            lineHeight: 1.5
          }}>
            This document will reappear in all active evidence listings, project submissions, and calculation traces. An immutable audit record will log this restoration.
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontWeight: 700, color: '#334155', fontSize: 12, display: 'block', marginBottom: 6 }}>
              Restoration Reason / Justification <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <input
              type="text"
              className="form-control"
              value={restoreReason}
              onChange={(e) => setRestoreReason(e.target.value)}
              placeholder="e.g. Inadvertent deletion, verified supporting document"
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 6,
                border: '1px solid #CBD5E1',
                fontSize: 13,
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setRestoreTarget(null)}
              style={{ padding: '8px 16px', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={restoreMutation.isPending || !restoreReason.trim()}
              onClick={() => restoreMutation.mutate({
                id: restoreTarget.id,
                reason: restoreReason
              })}
              style={{
                background: '#059669',
                color: '#FFFFFF',
                border: 'none',
                padding: '8px 18px',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 700,
                cursor: restoreMutation.isPending ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 1px 3px rgba(5, 150, 105, 0.25)'
              }}
            >
              {restoreMutation.isPending ? 'Restoring...' : '✓ Confirm Restoration'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Modal: Restore Org Unit ── */}
      {orgRestoreTarget && (
        <Modal
          isOpen={!!orgRestoreTarget}
          onClose={() => setOrgRestoreTarget(null)}
          maxWidth="500px"
        >
          <div className="modal-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="modal-header-icon" style={{ background: '#EEF2FF', border: '1px solid #C7D2FE' }}>
                <RotateCcw size={18} color="#4F46E5" />
              </div>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: 0 }}>Restore Organization Unit</h3>
                <p style={{ fontSize: 12, color: '#64748B', margin: '2px 0 0 0' }}>
                  Re-activates unit within the 4-tier MEIL hierarchy structure
                </p>
              </div>
            </div>
            <button className="icon-btn" onClick={() => setOrgRestoreTarget(null)} title="Close">
              <X size={18} color="#64748B" />
            </button>
          </div>

          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ fontSize: 13, lineHeight: 1.5, margin: 0, color: '#334155' }}>
              Are you sure you want to restore{' '}
              <strong style={{ color: '#0F172A' }}>{orgRestoreTarget?.name}</strong> (
              <span style={{ fontFamily: 'monospace', color: '#4F46E5', fontWeight: 600 }}>{orgRestoreTarget?.code}</span>)?
            </p>

            <div style={{
              padding: '10px 14px',
              borderRadius: 6,
              background: '#EEF2FF',
              border: '1px solid #C7D2FE',
              fontSize: 12,
              color: '#3730A3',
              lineHeight: 1.5
            }}>
              This unit will be restored to the active hierarchy tree. All child relations and boundary assignments will be preserved.
            </div>

            <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setOrgRestoreTarget(null)}
                style={{ padding: '8px 16px', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={restoreOrgMutation.isPending}
                onClick={() => restoreOrgMutation.mutate(orgRestoreTarget.id)}
                style={{
                  background: '#4F46E5',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '8px 18px',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: restoreOrgMutation.isPending ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: '0 1px 3px rgba(79, 70, 229, 0.25)'
                }}
              >
                {restoreOrgMutation.isPending ? 'Restoring...' : '✓ Confirm Restoration'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Modal: Clean / Empty Trash (System Admin Only) ── */}
      {showCleanModal && (
        <Modal
          isOpen={showCleanModal}
          onClose={() => { setShowCleanModal(false); setCleanError(''); setCleanPassword(''); }}
          maxWidth="500px"
        >
          <div className="modal-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="modal-header-icon" style={{ background: '#FEE2E2', border: '1px solid #FECACA' }}>
                <Trash2 size={18} color="#DC2626" />
              </div>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Purge {activeTab === 'org' ? 'Organization' : 'Evidence'} Trash Can
                </h3>
                <p style={{ fontSize: 12, color: '#64748B', margin: '2px 0 0 0' }}>
                  Permanently purge all soft-deleted records (irreversible)
                </p>
              </div>
            </div>
            <button className="icon-btn" onClick={() => { setShowCleanModal(false); setCleanError(''); setCleanPassword(''); }} title="Close">
              <X size={18} color="#64748B" />
            </button>
          </div>

          <form onSubmit={handleCleanTrash} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{
              padding: '10px 14px',
              borderRadius: 6,
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              fontSize: 12,
              color: '#991B1B',
              lineHeight: 1.5
            }}>
              ⚠️ <strong>Warning:</strong> This will permanently delete all {activeTab === 'org' ? 'organization units' : 'evidence files'} currently in the Trash Can. This action is irreversible.
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontWeight: 700, color: '#334155', fontSize: 12, display: 'block', marginBottom: 6 }}>
                System Administrator Password <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <input
                type="password"
                className="form-control"
                value={cleanPassword}
                onChange={(e) => setCleanPassword(e.target.value)}
                placeholder="Enter administrator password to authorize purge"
                required
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 6,
                  border: '1px solid #CBD5E1',
                  fontSize: 13,
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {cleanError && (
              <div style={{
                padding: '10px 12px',
                borderRadius: 6,
                background: '#FEF2F2',
                border: '1px solid #FCA5A5',
                color: '#B91C1C',
                fontSize: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                <span>{typeof cleanError === 'string' ? cleanError : JSON.stringify(cleanError)}</span>
              </div>
            )}

            <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => { setShowCleanModal(false); setCleanError(''); setCleanPassword(''); }}
                style={{ padding: '8px 16px', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={cleanPending || !cleanPassword}
                style={{
                  background: '#DC2626',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '8px 18px',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: cleanPending || !cleanPassword ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: '0 1px 3px rgba(220, 38, 38, 0.25)'
                }}
              >
                {cleanPending ? 'Purging...' : 'Purge All / Empty Trash'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Modal: Inspect Deleted Evidence Details ── */}
      {selectedEvidence && (
        <Modal
          isOpen={Boolean(selectedEvidence)}
          onClose={() => setSelectedEvidence(null)}
          maxWidth="700px"
        >
          <div className="modal-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="modal-header-icon" style={{ background: '#FEE2E2', border: '1px solid #FECACA' }}>
                <Trash2 size={18} color="#DC2626" />
              </div>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: 0 }}>Deleted Evidence Details</h3>
                <p style={{ fontSize: 12, color: '#64748B', margin: '2px 0 0 0' }}>
                  Lineage audit information &amp; deletion justification
                </p>
              </div>
            </div>
            <button className="icon-btn" onClick={() => setSelectedEvidence(null)} title="Close">
              <X size={18} color="#64748B" />
            </button>
          </div>

          <div
            className="modal-body custom-scrollbar"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              maxHeight: 'calc(85vh - 120px)',
              overflowY: 'auto'
            }}
          >
            {/* Top Identity banner */}
            <div style={{
              padding: '12px 16px',
              background: '#F8FAFC',
              borderRadius: 8,
              border: '1px solid #E2E8F0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 10
            }}>
              <div>
                <div style={{ fontSize: 11, color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Evidence Display ID</div>
                <div style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 800, color: '#2563EB', marginTop: 2 }}>
                  {selectedEvidence.evidence_display_id || selectedEvidence.id}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Category / Type</div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#EEF2FF', color: '#4338CA', fontWeight: 700, fontSize: 12, padding: '3px 8px', borderRadius: 4, marginTop: 2 }}>
                  <FileText size={12} />
                  {selectedEvidence.bill_type || selectedEvidence.doc_type || 'OTHER'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Status</div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#FEE2E2', color: '#DC2626', fontWeight: 700, fontSize: 12, padding: '3px 8px', borderRadius: 4, marginTop: 2 }}>
                  <Trash2 size={12} />
                  Soft Deleted
                </div>
              </div>
            </div>

            {/* Document metadata responsive grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              <div style={{ padding: '10px 14px', borderRadius: 8, background: '#FFFFFF', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>Document Name</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', marginTop: 3, wordBreak: 'break-word' }}>
                  {selectedEvidence.original_name}
                </div>
              </div>
              <div style={{ padding: '10px 14px', borderRadius: 8, background: '#FFFFFF', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>Assigned Project / Site</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', marginTop: 3 }}>
                  {selectedEvidence.project_name || selectedEvidence.project_id || 'Group-Wide'}
                </div>
              </div>
              <div style={{ padding: '10px 14px', borderRadius: 8, background: '#FFFFFF', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>Subsidiary / BU</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginTop: 3 }}>
                  {selectedEvidence.subsidiary_name || selectedEvidence.bu_name || 'MEIL Enterprise'}
                </div>
              </div>
              <div style={{ padding: '10px 14px', borderRadius: 8, background: '#FFFFFF', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>SHA256 Fingerprint</div>
                <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#64748B', marginTop: 3, wordBreak: 'break-all' }}>
                  {selectedEvidence.sha256 || '—'}
                </div>
              </div>
            </div>

            {/* Deletion Lineage Box */}
            <div style={{ padding: '14px 16px', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13, color: '#991B1B' }}>
                  <AlertCircle size={15} color="#DC2626" />
                  Deletion Justification &amp; Audit Lineage
                </div>
                <div style={{ fontSize: 11, color: '#B91C1C', fontWeight: 600 }}>
                  {selectedEvidence.deleted_at ? new Date(selectedEvidence.deleted_at).toLocaleString() : '—'}
                </div>
              </div>
              <div
                className="custom-scrollbar"
                style={{
                  maxHeight: 140,
                  overflowY: 'auto',
                  background: '#FFFFFF',
                  padding: '10px 12px',
                  borderRadius: 6,
                  border: '1px solid #FCA5A5',
                  fontSize: 13,
                  color: '#334155',
                  lineHeight: 1.5,
                  wordBreak: 'break-word',
                  whiteSpace: 'pre-wrap'
                }}
              >
                {selectedEvidence.deletion_reason || 'No deletion reason recorded.'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontSize: 12, color: '#7F1D1D' }}>
                <span>Deleted by:</span>
                <strong style={{ color: '#991B1B' }}>{selectedEvidence.deleted_by_name || 'Administrator'}</strong>
                <span style={{ textTransform: 'uppercase', fontSize: 10, background: '#FEE2E2', padding: '1px 6px', borderRadius: 4, fontWeight: 700, color: '#DC2626' }}>
                  {selectedEvidence.deleted_by_role || 'User'}
                </span>
              </div>
            </div>

            {/* Extracted Metadata if present */}
            {selectedEvidence.extracted_data && Object.keys(selectedEvidence.extracted_data).length > 0 && (
              <div style={{ padding: '12px 14px', borderRadius: 8, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>
                  Extracted Audit Values
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
                  {Object.entries(selectedEvidence.extracted_data).map(([k, v]) => (
                    <div key={k} style={{ padding: '6px 10px', background: '#FFFFFF', borderRadius: 6, border: '1px solid #E2E8F0' }}>
                      <div style={{ fontSize: 10, color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>{k.replace(/_/g, ' ')}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', marginTop: 2 }}>{String(v)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="modal-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, flexWrap: 'wrap', gap: 10 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setSelectedEvidence(null)}
                style={{ padding: '8px 16px', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}
              >
                Close
              </button>
              <button
                type="button"
                style={{
                  background: '#059669',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 6,
                  padding: '8px 18px',
                  fontSize: 13,
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(5, 150, 105, 0.25)'
                }}
                onClick={() => {
                  const ev = selectedEvidence;
                  setSelectedEvidence(null);
                  setRestoreTarget(ev);
                  setRestoreReason('Restoration to active ESG ledger');
                }}
              >
                <RotateCcw size={14} />
                Restore This Document
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
