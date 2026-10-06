import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Users, UserPlus, Shield, CheckCircle2, 
  Copy, Check, AlertCircle, Building2, RefreshCw, X,
  Mail, Send, Trash2, Clock, CheckCircle, Ban, History,
  ChevronRight, ChevronDown, Award, Search, UserCheck, ShieldCheck
} from 'lucide-react';
import { authApi, orgApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import { MOCK_USERS, MOCK_ORG_NODES } from '../mock/mockData';

// All standard roles with display metadata
export const ROLE_DEFINITIONS = {
  system_admin: { label: 'System Admin', tier: 'System', level: 0, badge: 'badge-purple', desc: 'Central infrastructure & platform root authority' },
  super_admin: { label: 'Super Admin', tier: 'System', level: 0, badge: 'badge-purple', desc: 'Enterprise super administrator' },
  group_admin: { label: 'Group Admin', tier: 'Group', level: 1, badge: 'badge-purple', desc: 'Enterprise group ESG governance & consolidation' },
  group_esg_manager: { label: 'Group ESG Manager', tier: 'Group', level: 1, badge: 'badge-purple', desc: 'Group methodology & disclosure compilation' },
  subsidiary_admin: { label: 'Subsidiary Admin', tier: 'Subsidiary', level: 2, badge: 'badge-indigo', desc: 'Subsidiary administrator (BRSR sections A, B, C)' },
  subsidiary_esg_manager: { label: 'Subsidiary ESG Manager', tier: 'Subsidiary', level: 2, badge: 'badge-indigo', desc: 'Subsidiary review & aggregation lead' },
  bu_admin: { label: 'BU Admin', tier: 'BU', level: 3, badge: 'badge-sky', desc: 'Business Unit Admin (reviews project data)' },
  bu_esg_manager: { label: 'BU ESG Manager', tier: 'BU', level: 3, badge: 'badge-sky', desc: 'BU multi-year targets & target tracking' },
  bu_reviewer: { label: 'BU Reviewer', tier: 'BU', level: 3, badge: 'badge-sky', desc: 'Four-Eyes BU data reviewer' },
  project_admin: { label: 'Project Admin', tier: 'Project', level: 4, badge: 'badge-amber', desc: 'Project site administrator' },
  project_data_entry_user: { label: 'Project Data Entry', tier: 'Project', level: 4, badge: 'badge-amber', desc: 'Operational raw fact entry & evidence upload' },
  maker: { label: 'Maker (Data Entry)', tier: 'Project', level: 4, badge: 'badge-amber', desc: 'Operational ESG data entry' },
  checker: { label: 'Checker (Reviewer)', tier: 'Project', level: 4, badge: 'badge-sky', desc: 'Operational data reviewer' },
  auditor: { label: 'Independent Auditor', tier: 'External', level: 5, badge: 'badge-teal', desc: 'Third-party assurance & verification' },
  read_only_viewer: { label: 'Read-Only Viewer', tier: 'All', level: 5, badge: 'badge-gray', desc: 'Read-only analytics and reports' },
  viewer: { label: 'Viewer', tier: 'All', level: 5, badge: 'badge-gray', desc: 'General read-only viewer' },
};

// Default delegable permissions per role
const ROLE_PERMISSIONS_PREVIEW = {
  group_admin: ['Group ESG Consolidation', 'Subsidiary Admin Delegation', 'BRSR Report Approval', 'Audit Trail Oversight'],
  group_esg_manager: ['Group Net-Zero Targets', 'Consolidation Pipeline', 'Report Compilation'],
  subsidiary_admin: ['Subsidiary ESG Governance', 'BU Admin Delegation', 'BRSR Sections A & B', 'Consolidated Review'],
  subsidiary_esg_manager: ['Subsidiary Metrics Aggregation', 'BU Review Oversight', 'Evidence Validation'],
  bu_admin: ['BU Data Review', 'Project Admin Delegation', 'Variance Analysis', 'BU Target Management'],
  bu_esg_manager: ['BU Target Entry', 'Initiatives Tracking', 'Monthly Pack Review'],
  bu_reviewer: ['BU Reviewer 4-Eyes Check', 'Sign-Off / Return with Comments'],
  project_admin: ['Project Site Governance', 'Data Entry User Delegation', 'Readiness Checklist Sign-Off'],
  project_data_entry_user: ['Monthly Operational Data Entry', 'Evidence Document Upload', 'Pre-Submission Checklist'],
  maker: ['Operational Metric Entry', 'Evidence File Upload', 'Pre-Submission Checklist'],
  checker: ['Project Verification', 'Approve / Reject Data Rows'],
};

export default function UserManagement() {
  const qc = useQueryClient();
  const { user: currentUser, role: currentRole, manageableRoles } = useAuth();

  // Tab State: 'active' | 'pending' | 'audit' | 'tree'
  const [activeTab, setActiveTab] = useState('active');

  // Search and filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('ALL');

  // Invite Modal state
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteFullName, setInviteFullName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteRole, setInviteRole] = useState('');
  const [inviteOrgNodeId, setInviteOrgNodeId] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [lastInvited, setLastInvited] = useState(null);

  // Deactivate Modal state
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [deactivateReason, setDeactivateReason] = useState('Administrative transition');
  const [deactivateError, setDeactivateError] = useState('');

  // Notification Banner
  const [notice, setNotice] = useState(null);

  // Fetch Org Nodes
  const { data: nodes = [] } = useQuery({
    queryKey: ['org-nodes-list'],
    queryFn: async () => {
      if (localStorage.getItem('brsr_mock_mode') === 'true') return MOCK_ORG_NODES;
      try {
        const res = await orgApi.getNodes();
        return res.data;
      } catch (err) {
        return MOCK_ORG_NODES;
      }
    },
  });

  // Calculate descendant node IDs for the current user to enforce scope isolation
  const authorizedNodeIds = useMemo(() => {
    if (!currentUser?.org_node_id || ['system_admin', 'super_admin'].includes(currentUser.role)) {
      return null; // All nodes authorized
    }

    const currentId = String(currentUser.org_node_id);
    const result = new Set([currentId]);

    // Recursive helper to collect children
    const addChildren = (parentId) => {
      nodes.filter(n => String(n.parent_id) === String(parentId)).forEach(child => {
        result.add(String(child.id));
        addChildren(child.id);
      });
    };
    addChildren(currentId);
    return result;
  }, [currentUser, nodes]);

  // Fetch Scoped Users
  const { data: users = [], isLoading: usersLoading, refetch: refetchUsers } = useQuery({
    queryKey: ['admin-scoped-users', currentUser?.id],
    queryFn: async () => {
      if (localStorage.getItem('brsr_mock_mode') === 'true') return MOCK_USERS;
      try {
        const res = await authApi.getScopedUsers();
        return res.data;
      } catch (err) {
        // Fallback to general admin users or mock
        try {
          const res2 = await authApi.getAdminUsers();
          return res2.data;
        } catch {
          return MOCK_USERS;
        }
      }
    },
  });

  // Fetch Pending Invitations
  const { data: invitations = [], isLoading: invLoading, refetch: refetchInvitations } = useQuery({
    queryKey: ['admin-invitations', currentUser?.id],
    queryFn: async () => {
      if (localStorage.getItem('brsr_mock_mode') === 'true') return [];
      try {
        const res = await authApi.getInvitations();
        return res.data;
      } catch (err) {
        return [];
      }
    },
  });

  // Fetch Admin Audit Log
  const { data: auditLogs = [], isLoading: auditLoading, refetch: refetchAudit } = useQuery({
    queryKey: ['admin-audit-log', currentUser?.id],
    queryFn: async () => {
      if (localStorage.getItem('brsr_mock_mode') === 'true') return [];
      try {
        const res = await authApi.getAdminAuditLog(50);
        return res.data;
      } catch (err) {
        return [];
      }
    },
  });

  // Filtered Roles caller is allowed to invite/delegate
  const allowedRolesForInvite = useMemo(() => {
    const roles = manageableRoles || [];
    return roles.filter(r => ROLE_DEFINITIONS[r]).map(r => ({
      value: r,
      ...ROLE_DEFINITIONS[r]
    }));
  }, [manageableRoles]);

  // Determine allowed nodes for the selected invite role
  const eligibleNodesForInviteRole = useMemo(() => {
    if (!inviteRole) return [];
    const roleDef = ROLE_DEFINITIONS[inviteRole];
    if (!roleDef) return [];

    let filtered = nodes;
    // Filter by hierarchy branch if caller is restricted
    if (authorizedNodeIds) {
      filtered = filtered.filter(n => authorizedNodeIds.has(String(n.id)));
    }

    // Filter by role level compatibility
    if (roleDef.tier === 'Group') {
      return filtered.filter(n => ['group', 'company'].includes(n.type?.toLowerCase()));
    } else if (roleDef.tier === 'Subsidiary') {
      return filtered.filter(n => ['subsidiary', 'company'].includes(n.type?.toLowerCase()));
    } else if (roleDef.tier === 'BU') {
      return filtered.filter(n => ['business_unit', 'bu'].includes(n.type?.toLowerCase()));
    } else if (roleDef.tier === 'Project') {
      return filtered.filter(n => ['project', 'site'].includes(n.type?.toLowerCase()));
    }
    return filtered;
  }, [inviteRole, nodes, authorizedNodeIds]);

  // Auto-select node when role changes
  const handleRoleSelect = (roleVal) => {
    setInviteRole(roleVal);
    const roleDef = ROLE_DEFINITIONS[roleVal];
    if (!roleDef) return;

    // If caller has an assigned org node and target is own level, prefill caller node
    if (currentUser?.org_node_id && (
      (currentRole === 'subsidiary_admin' && roleVal === 'subsidiary_admin') ||
      (currentRole === 'bu_admin' && roleVal === 'bu_admin') ||
      (currentRole === 'project_admin' && roleVal === 'project_admin')
    )) {
      setInviteOrgNodeId(String(currentUser.org_node_id));
      return;
    }

    // Default to first eligible node
    const eligible = nodes.filter(n => {
      if (authorizedNodeIds && !authorizedNodeIds.has(String(n.id))) return false;
      if (roleDef.tier === 'BU') return ['business_unit', 'bu'].includes(n.type?.toLowerCase());
      if (roleDef.tier === 'Project') return ['project', 'site'].includes(n.type?.toLowerCase());
      if (roleDef.tier === 'Subsidiary') return ['subsidiary', 'company'].includes(n.type?.toLowerCase());
      return true;
    });

    if (eligible.length > 0) {
      setInviteOrgNodeId(String(eligible[0].id));
    } else {
      setInviteOrgNodeId('');
    }
  };

  // Open invite modal
  const handleOpenInvite = () => {
    setInviteError('');
    setInviteFullName('');
    setInviteEmail('');
    setInvitePhone('');
    if (allowedRolesForInvite.length > 0) {
      const initialRole = allowedRolesForInvite[0].value;
      handleRoleSelect(initialRole);
    }
    setIsInviteOpen(true);
  };

  // Invite Mutation
  const inviteMutation = useMutation({
    mutationFn: async (payload) => {
      if (localStorage.getItem('brsr_mock_mode') === 'true') {
        await new Promise(r => setTimeout(r, 600));
        return {
          data: {
            id: 'mock-inv-' + Date.now(),
            full_name: payload.full_name,
            email: payload.email,
            role: payload.role,
            org_node_id: payload.org_node_id,
            status: 'PENDING',
            created_at: new Date().toISOString(),
          }
        };
      }
      return authApi.inviteUser(payload);
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['admin-invitations'] });
      qc.invalidateQueries({ queryKey: ['admin-audit-log'] });
      setLastInvited(res.data);
      setIsInviteOpen(false);
      setNotice({
        type: 'success',
        text: `Invitation sent to ${res.data.email} as ${ROLE_DEFINITIONS[res.data.role]?.label || res.data.role}.`
      });
    },
    onError: (err) => {
      const msg = err.response?.data?.detail || err.message || 'Failed to send invitation.';
      setInviteError(msg);
    }
  });

  const handleSubmitInvite = (e) => {
    e.preventDefault();
    if (!inviteFullName.trim()) {
      setInviteError('Full Name is required.');
      return;
    }
    if (!inviteEmail.trim() || !inviteEmail.includes('@')) {
      setInviteError('A valid corporate email address is required.');
      return;
    }
    if (!inviteRole) {
      setInviteError('Please select a delegated role.');
      return;
    }

    setInviteError('');
    inviteMutation.mutate({
      full_name: inviteFullName.trim(),
      email: inviteEmail.trim(),
      role: inviteRole,
      org_node_id: inviteOrgNodeId || null,
      phone: invitePhone.trim() || null,
    });
  };

  // Resend Invitation
  const resendMutation = useMutation({
    mutationFn: async (id) => authApi.resendInvitation(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-invitations'] });
      qc.invalidateQueries({ queryKey: ['admin-audit-log'] });
      setNotice({ type: 'success', text: 'Invitation resent with new 7-day expiration link.' });
    },
    onError: (err) => {
      setNotice({ type: 'error', text: err.response?.data?.detail || 'Failed to resend invitation.' });
    }
  });

  // Revoke Invitation
  const revokeMutation = useMutation({
    mutationFn: async (id) => authApi.revokeInvitation(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-invitations'] });
      qc.invalidateQueries({ queryKey: ['admin-audit-log'] });
      setNotice({ type: 'success', text: 'Invitation successfully revoked.' });
    },
    onError: (err) => {
      setNotice({ type: 'error', text: err.response?.data?.detail || 'Failed to revoke invitation.' });
    }
  });

  // Deactivate User Mutation
  const deactivateMutation = useMutation({
    mutationFn: async ({ id, reason }) => authApi.deactivateUser(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-scoped-users'] });
      qc.invalidateQueries({ queryKey: ['admin-audit-log'] });
      setNotice({
        type: 'success',
        text: `Account for ${deactivateTarget?.full_name || deactivateTarget?.email} has been deactivated. Historical ESG records remain preserved.`
      });
      setDeactivateTarget(null);
    },
    onError: (err) => {
      setDeactivateError(err.response?.data?.detail || 'Failed to deactivate user.');
    }
  });

  // Filter active users
  const filteredUsers = users.filter((u) => {
    const matchRole = filterRole === 'ALL' || u.role === filterRole;
    const term = searchTerm.toLowerCase();
    const matchTerm = !term ||
      (u.email && u.email.toLowerCase().includes(term)) ||
      (u.full_name && u.full_name.toLowerCase().includes(term));
    return matchRole && matchTerm;
  });

  // Helper to format node scope display
  const getNodeDisplay = (nodeId) => {
    if (!nodeId) return 'Group-Wide Scope';
    const node = nodes.find(n => String(n.id) === String(nodeId));
    if (!node) return nodeId.substring(0, 8);
    const parent = nodes.find(n => String(n.id) === String(node.parent_id));
    return parent ? `${node.name} (${parent.name})` : node.name;
  };

  const activeUsersCount = users.filter(u => u.is_active !== false).length;
  const pendingInvitesCount = invitations.filter(i => i.status === 'PENDING').length;
  const suspendedUsersCount = users.filter(u => u.is_active === false).length;

  return (
    <div className="page-content anim-fade" style={{ background: '#f8fafc' }}>
      {/* ── Status Ticker ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8,
        fontSize: 11, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748b'
      }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#15803d' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#15803d', display: 'inline-block' }}></span>
          HIERARCHICAL ACCESS CONTROL
        </span>
        <span style={{ color: '#cbd5e1' }}>/</span>
        <span>4-TIER BOUNDED RBAC ENFORCEMENT</span>
      </div>

      {/* Top Breadcrumb & Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#09090b', margin: 0, letterSpacing: '-0.02em' }}>
            User Management &amp; Role Delegation
          </h1>
          <p style={{ color: '#64748b', fontSize: '13px', margin: '4px 0 0 0' }}>
            Enforces strict 4-level delegation: administrators can only delegate roles within their authorized organizational branch.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-secondary"
            style={{ borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', color: '#09090b', fontWeight: 600 }}
            onClick={() => {
              refetchUsers();
              refetchInvitations();
              refetchAudit();
            }}
          >
            <RefreshCw size={13} />
            <span>Refresh</span>
          </button>

          {allowedRolesForInvite.length > 0 && (
            <button
              className="btn btn-primary"
              style={{ borderRadius: 6, background: '#18181b', color: '#fff', border: 'none', fontWeight: 600 }}
              onClick={handleOpenInvite}
            >
              <UserPlus size={14} />
              <span>+ Add Administrator</span>
            </button>
          )}
        </div>
      </div>

      {/* Notice Banner */}
      {notice && (
        <div style={{
          padding: '12px 18px',
          borderRadius: '8px',
          fontSize: '13px',
          fontWeight: 600,
          background: notice.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          color: notice.type === 'success' ? '#10b981' : '#ef4444',
          border: `1px solid ${notice.type === 'success' ? '#10b981' : '#ef4444'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px'
        }}>
          <span>{notice.text}</span>
          <button className="icon-btn" onClick={() => setNotice(null)} style={{ width: 24, height: 24 }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Invitation Success Notification Card */}
      {lastInvited && (
        <div className="credential-success-card anim-slide" style={{ marginBottom: 20 }}>
          <div className="credential-success-header">
            <div className="credential-icon">
              <CheckCircle2 size={20} color="var(--emerald-400)" />
            </div>
            <div>
              <h3 style={{ color: '#fff', fontSize: '15px' }}>Administrator Invitation Dispatched</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                An invitation email has been issued to {lastInvited.email}. The user will set their own secure credentials upon verification.
              </p>
            </div>
            <button className="icon-btn" onClick={() => setLastInvited(null)} style={{ marginLeft: 'auto' }}>
              <X size={16} />
            </button>
          </div>

          <div className="credential-details-grid">
            <div className="cred-box">
              <span className="cred-label">Invited Administrator</span>
              <span className="cred-val highlight">{lastInvited.full_name}</span>
            </div>
            <div className="cred-box">
              <span className="cred-label">Email</span>
              <span className="cred-val">{lastInvited.email}</span>
            </div>
            <div className="cred-box">
              <span className="cred-label">Delegated Role</span>
              <span className="cred-val role-pill">{ROLE_DEFINITIONS[lastInvited.role]?.label || lastInvited.role}</span>
            </div>
            <div className="cred-box">
              <span className="cred-label">Organizational Scope</span>
              <span className="cred-val">{getNodeDisplay(lastInvited.org_node_id)}</span>
            </div>
          </div>
        </div>
      )}

      {/* KPI Counters Strip */}
      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">Total Governed Users</div>
          <div className="stat-value">{users.length}</div>
          <div className="stat-desc">Within your organizational boundary</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Active Users</div>
          <div className="stat-value text-emerald">{activeUsersCount}</div>
          <div className="stat-desc">Operational & reporting access</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pending Invitations</div>
          <div className="stat-value text-amber">{pendingInvitesCount}</div>
          <div className="stat-desc">Awaiting secure onboarding</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Deactivated / Suspended</div>
          <div className="stat-value text-rose">{suspendedUsersCount}</div>
          <div className="stat-desc">Historical ESG audit intact</div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: 12, borderBottom: '1px solid var(--border-color)', marginBottom: 20 }}>
        <button
          className={`btn ${activeTab === 'active' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderRadius: '8px 8px 0 0', borderBottom: 'none' }}
          onClick={() => setActiveTab('active')}
        >
          <Users size={14} />
          <span>Active Users ({activeUsersCount})</span>
        </button>
        <button
          className={`btn ${activeTab === 'pending' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderRadius: '8px 8px 0 0', borderBottom: 'none' }}
          onClick={() => setActiveTab('pending')}
        >
          <Mail size={14} />
          <span>Pending Invitations ({pendingInvitesCount})</span>
        </button>
        <button
          className={`btn ${activeTab === 'tree' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderRadius: '8px 8px 0 0', borderBottom: 'none' }}
          onClick={() => setActiveTab('tree')}
        >
          <Building2 size={14} />
          <span>Organization Tree</span>
        </button>
        <button
          className={`btn ${activeTab === 'audit' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderRadius: '8px 8px 0 0', borderBottom: 'none' }}
          onClick={() => setActiveTab('audit')}
        >
          <History size={14} />
          <span>Admin Audit Log</span>
        </button>
      </div>

      {/* TAB 1: ACTIVE USERS */}
      {activeTab === 'active' && (
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Users size={16} color="var(--brand-400)" />
              <h3 className="card-title">Active Personnel & Role Access</h3>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="text"
                placeholder="Search by name or email..."
                className="form-control"
                style={{ width: 220, height: 32, fontSize: '12px' }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <select
                className="form-control"
                style={{ width: 180, height: 32, fontSize: '12px' }}
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
              >
                <option value="ALL">All Roles</option>
                {Object.entries(ROLE_DEFINITIONS).map(([val, def]) => (
                  <option key={val} value={val}>{def.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="table-wrap" style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>User & Identity</th>
                  <th>Assigned Role</th>
                  <th>Organizational Scope</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {usersLoading ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '32px' }}>
                      Loading authorized user records...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                      No users found within your authorized scope matching these filters.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const roleDef = ROLE_DEFINITIONS[u.role] || { label: u.role, badge: 'badge-gray', tier: 'Unknown' };
                    const isSelf = String(u.id) === String(currentUser?.id) || u.email === currentUser?.email;
                    const isRoot = ['Skit-025', 'adtshrm007'].includes(u.email);

                    return (
                      <tr key={u.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div className="user-avatar-sm">
                              {(u.full_name || u.email || 'U').substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{u.full_name || u.email}</div>
                              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div>
                            <span className={`badge ${roleDef.badge}`}>
                              {roleDef.label.toUpperCase()}
                            </span>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: 2 }}>
                              Level: {roleDef.tier}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '12px' }}>
                            <Building2 size={13} color="var(--text-muted)" />
                            <span>{getNodeDisplay(u.org_node_id)}</span>
                          </div>
                        </td>
                        <td>
                          {u.is_active !== false ? (
                            <span className="badge badge-emerald">Active</span>
                          ) : (
                            <span className="badge badge-rose">Suspended</span>
                          )}
                        </td>
                        <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'System Seed'}
                        </td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          {isSelf ? (
                            <span style={{ fontSize: '11px', color: 'var(--brand-400)' }}>Current User</span>
                          ) : isRoot ? (
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Root Protected</span>
                          ) : (
                            <button
                              className="btn btn-secondary btn-sm"
                              style={{ color: 'var(--rose-400)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                              onClick={() => {
                                setDeactivateError('');
                                setDeactivateReason('Administrative delegation transition');
                                setDeactivateTarget(u);
                              }}
                            >
                              <Ban size={12} style={{ marginRight: 4 }} />
                              Deactivate
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: PENDING INVITATIONS */}
      {activeTab === 'pending' && (
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Mail size={16} color="var(--amber-400)" />
              <h3 className="card-title">Pending Administrator & User Invitations</h3>
            </div>
            {allowedRolesForInvite.length > 0 && (
              <button className="btn btn-primary btn-sm" onClick={handleOpenInvite}>
                <UserPlus size={13} />
                <span>+ Invite Administrator</span>
              </button>
            )}
          </div>

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invited Person</th>
                  <th>Delegated Role</th>
                  <th>Assigned Scope</th>
                  <th>Invited Date</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invLoading ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '32px' }}>
                      Checking pending invitations...
                    </td>
                  </tr>
                ) : invitations.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                      No pending invitations currently active.
                    </td>
                  </tr>
                ) : (
                  invitations.map((inv) => {
                    const roleDef = ROLE_DEFINITIONS[inv.role] || { label: inv.role, badge: 'badge-gray' };
                    return (
                      <tr key={inv.id}>
                        <td>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{inv.full_name}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{inv.email}</div>
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${roleDef.badge}`}>
                            {roleDef.label.toUpperCase()}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '12px' }}>
                            <Building2 size={13} color="var(--text-muted)" />
                            <span>{getNodeDisplay(inv.org_node_id)}</span>
                          </div>
                        </td>
                        <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {new Date(inv.created_at || Date.now()).toLocaleDateString()}
                        </td>
                        <td>
                          <span className="badge badge-amber">Pending Activation</span>
                        </td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ marginRight: 8 }}
                            onClick={() => resendMutation.mutate(inv.id)}
                            disabled={resendMutation.isPending}
                          >
                            Resend
                          </button>
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ color: 'var(--rose-400)' }}
                            onClick={() => revokeMutation.mutate(inv.id)}
                            disabled={revokeMutation.isPending}
                          >
                            Revoke
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
      )}

      {/* TAB 3: ORGANIZATION TREE VIEW */}
      {activeTab === 'tree' && (
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Building2 size={16} color="var(--brand-400)" />
              <h3 className="card-title">Hierarchical Enterprise Scope & Personnel Mapping</h3>
            </div>
          </div>
          <div style={{ padding: 20 }}>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: 20 }}>
              Visualizing the active governance hierarchy. Click on any organizational entity to review
              bound administrators and operational staff.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {nodes.filter(n => !n.parent_id || ['group', 'company'].includes(n.type?.toLowerCase())).map(root => {
                const rootUsers = users.filter(u => String(u.org_node_id) === String(root.id));
                const childrenSubs = nodes.filter(n => String(n.parent_id) === String(root.id));

                return (
                  <div key={root.id} style={{ border: '1px solid var(--border-color)', borderRadius: 8, padding: 16, background: 'var(--card-bg)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <ShieldCheck size={18} color="var(--purple-400)" />
                        <span style={{ fontWeight: 700, fontSize: '15px' }}>{root.name}</span>
                        <span className="badge badge-purple">{root.type.toUpperCase()}</span>
                      </div>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {rootUsers.length} Users Assigned
                      </span>
                    </div>

                    {/* Child Subsidiaries */}
                    <div style={{ paddingLeft: 24, borderLeft: '2px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {childrenSubs.map(sub => {
                        const subUsers = users.filter(u => String(u.org_node_id) === String(sub.id));
                        const bus = nodes.filter(n => String(n.parent_id) === String(sub.id));

                        return (
                          <div key={sub.id} style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: 6 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Building2 size={15} color="var(--indigo-400)" />
                                <span style={{ fontWeight: 600, fontSize: '13px' }}>{sub.name}</span>
                                <span className="badge badge-indigo">SUBSIDIARY</span>
                              </div>
                              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                {subUsers.length} Admins
                              </span>
                            </div>

                            {/* BUs under Subsidiary */}
                            {bus.length > 0 && (
                              <div style={{ paddingLeft: 20, marginTop: 8, borderLeft: '1px dashed rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {bus.map(bu => {
                                  const buUsers = users.filter(u => String(u.org_node_id) === String(bu.id));
                                  const projects = nodes.filter(n => String(n.parent_id) === String(bu.id));

                                  return (
                                    <div key={bu.id} style={{ fontSize: '12px', padding: '6px 10px', background: 'rgba(0,0,0,0.2)', borderRadius: 4 }}>
                                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                          <span style={{ color: 'var(--sky-400)' }}>•</span>
                                          <span style={{ fontWeight: 500 }}>{bu.name}</span>
                                          <span className="badge badge-sky" style={{ fontSize: '10px' }}>BU</span>
                                        </div>
                                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                          {buUsers.length} BU Users / {projects.length} Projects
                                        </span>
                                      </div>

                                      {/* Projects under BU */}
                                      {projects.length > 0 && (
                                        <div style={{ paddingLeft: 16, marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                          {projects.map(proj => (
                                            <span key={proj.id} className="badge badge-amber" style={{ fontSize: '10px' }}>
                                              {proj.name}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: AUDIT LOG */}
      {activeTab === 'audit' && (
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <History size={16} color="var(--brand-400)" />
              <h3 className="card-title">Administrative Actions & Delegation Audit Log</h3>
            </div>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Administrator</th>
                  <th>Action</th>
                  <th>Target User</th>
                  <th>Assigned Role</th>
                  <th>Scope</th>
                </tr>
              </thead>
              <tbody>
                {auditLoading ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '32px' }}>
                      Retrieving audit log...
                    </td>
                  </tr>
                ) : auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                      No administrative audit records logged yet.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id}>
                      <td style={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {new Date(log.created_at || Date.now()).toLocaleString()}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{log.actor_name}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{log.actor_role}</div>
                      </td>
                      <td>
                        <span className="badge badge-gray">{log.action}</span>
                      </td>
                      <td>{log.target_name || log.target_user_id || '—'}</td>
                      <td>
                        {log.target_role ? (
                          <span className={`badge ${ROLE_DEFINITIONS[log.target_role]?.badge || 'badge-gray'}`}>
                            {ROLE_DEFINITIONS[log.target_role]?.label || log.target_role}
                          </span>
                        ) : '—'}
                      </td>
                      <td style={{ fontSize: '12px' }}>
                        {getNodeDisplay(log.target_scope_id)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: Add Administrator (Invitation-Based) */}
      <Modal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        maxWidth="580px"
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="modal-header-icon">
              <UserPlus size={18} color="var(--brand-400)" />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', color: '#fff' }}>Add Administrator</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Hierarchical invitation within your authorized organizational boundary
              </p>
            </div>
          </div>
          <button className="icon-btn" onClick={() => setIsInviteOpen(false)}>
            <X size={18} />
          </button>
        </div>

        {inviteError && (
          <div className="login-error-banner" style={{ margin: '16px 20px 0' }}>
            <AlertCircle size={16} />
            <span>{inviteError}</span>
          </div>
        )}

        <form onSubmit={handleSubmitInvite} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Section 1: Personal Information */}
          <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: 16 }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--brand-400)', textTransform: 'uppercase', marginBottom: 12 }}>
              1. Personal Information
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Full Name *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Priya Das"
                  value={inviteFullName}
                  onChange={(e) => setInviteFullName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Corporate Email *</label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="priya.das@meil.in"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Phone Number (Optional)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="+91 98765 43210"
                  value={invitePhone}
                  onChange={(e) => setInvitePhone(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Delegated Role (Dynamically Restricted) */}
          <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: 16 }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--brand-400)', textTransform: 'uppercase', marginBottom: 8 }}>
              2. Delegated Role (Restricted to Your Level & Immediate Sub-Level)
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {allowedRolesForInvite.map(r => (
                <label
                  key={r.value}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: `1px solid ${inviteRole === r.value ? 'var(--brand-500)' : 'var(--border-color)'}`,
                    background: inviteRole === r.value ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
                    cursor: 'pointer'
                  }}
                >
                  <input
                    type="radio"
                    name="role"
                    value={r.value}
                    checked={inviteRole === r.value}
                    onChange={() => handleRoleSelect(r.value)}
                    style={{ marginTop: 3 }}
                  />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 600, fontSize: '13px' }}>{r.label}</span>
                      <span className={`badge ${r.badge}`} style={{ fontSize: '10px' }}>{r.tier}</span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{r.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Section 3: Organizational Scope (Inherited & Bound) */}
          <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: 16 }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--brand-400)', textTransform: 'uppercase', marginBottom: 12 }}>
              3. Organizational Scope (Bound to Subtree)
            </div>
            <div className="form-group">
              <label className="form-label">Assigned Organizational Unit *</label>
              <select
                className="form-control"
                value={inviteOrgNodeId}
                onChange={(e) => setInviteOrgNodeId(e.target.value)}
                required
              >
                {eligibleNodesForInviteRole.length === 0 ? (
                  <option value="">No compatible nodes within your authorized branch</option>
                ) : (
                  eligibleNodesForInviteRole.map(n => (
                    <option key={n.id} value={n.id}>
                      {n.name} ({n.type?.toUpperCase()})
                    </option>
                  ))
                )}
              </select>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 4 }}>
                Administrators cannot delegate authority outside their own organizational branch.
              </div>
            </div>
          </div>

          {/* Section 4: Delegable Permissions Preview */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--brand-400)', textTransform: 'uppercase', marginBottom: 8 }}>
              4. Delegated Permissions Template
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {(ROLE_PERMISSIONS_PREVIEW[inviteRole] || ['Operational Scope Access']).map(p => (
                <span key={p} style={{ fontSize: '11px', padding: '3px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.06)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Check size={11} color="var(--emerald-400)" />
                  {p}
                </span>
              ))}
            </div>
          </div>

          <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsInviteOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={inviteMutation.isPending}>
              <Send size={14} />
              <span>{inviteMutation.isPending ? 'Sending Invitation...' : 'Send Administrator Invitation'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Deactivate User (Preserves ESG History) */}
      <Modal
        isOpen={!!deactivateTarget}
        onClose={() => setDeactivateTarget(null)}
        maxWidth="500px"
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="modal-header-icon" style={{ background: 'rgba(239, 68, 68, 0.15)' }}>
              <Ban size={18} color="var(--rose-400)" />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', color: '#fff' }}>Deactivate User Account</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Preserves historical ESG submissions & audit trail
              </p>
            </div>
          </div>
          <button className="icon-btn" onClick={() => setDeactivateTarget(null)}>
            <X size={18} />
          </button>
        </div>

        {deactivateError && (
          <div className="login-error-banner" style={{ margin: '16px 20px 0' }}>
            <AlertCircle size={16} />
            <span>{deactivateError}</span>
          </div>
        )}

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ fontSize: '13px', lineHeight: 1.5 }}>
            Are you sure you want to deactivate{' '}
            <strong style={{ color: '#fff' }}>{deactivateTarget?.full_name || deactivateTarget?.email}</strong>?
          </p>

          <div style={{ padding: '12px 14px', borderRadius: 6, background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', fontSize: '12px', color: 'var(--text-secondary)' }}>
            <div style={{ fontWeight: 600, color: 'var(--rose-400)', marginBottom: 4 }}>Access Revocation Notice:</div>
            They will immediately lose login access to{' '}
            <strong>{getNodeDisplay(deactivateTarget?.org_node_id)}</strong>.
            All submitted operational ESG data, review logs, and audit entries will remain permanently preserved.
          </div>

          <div className="form-group">
            <label className="form-label">Deactivation Reason *</label>
            <input
              type="text"
              className="form-control"
              value={deactivateReason}
              onChange={(e) => setDeactivateReason(e.target.value)}
              placeholder="e.g. Project completion, role reassignment"
            />
          </div>

          <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
            <button type="button" className="btn btn-secondary" onClick={() => setDeactivateTarget(null)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              style={{ background: 'var(--rose-600)', borderColor: 'var(--rose-600)' }}
              disabled={deactivateMutation.isPending}
              onClick={() => deactivateMutation.mutate({ id: deactivateTarget.id, reason: deactivateReason })}
            >
              {deactivateMutation.isPending ? 'Deactivating...' : 'Confirm Deactivation'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
