import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Users, UserPlus, Shield, CheckCircle2, 
  Copy, Check, AlertCircle, Building2, RefreshCw, X,
  Mail, Send, Trash2, Clock, CheckCircle, Ban, History,
  ChevronRight, ChevronDown, Award, Search, UserCheck, ShieldCheck,
  FilePlus, ThumbsUp, ThumbsDown, FileQuestion
} from 'lucide-react';
import { authApi, orgApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';

// All standard roles with display metadata (Five-Role Architecture)
export const ROLE_DEFINITIONS = {
  system_admin: { label: 'System Admin', tier: 'System', level: 0, badge: 'badge-purple', desc: 'Central infrastructure & platform root authority' },
  group_admin: { label: 'Group Admin', tier: 'Group', level: 1, badge: 'badge-purple', desc: 'Enterprise group ESG governance & consolidation' },
  subsidiary_admin: { label: 'Subsidiary Admin', tier: 'Subsidiary', level: 2, badge: 'badge-indigo', desc: 'Subsidiary administrator (BRSR sections A, B, C)' },
  bu_admin: { label: 'BU Admin', tier: 'BU', level: 3, badge: 'badge-sky', desc: 'Business Unit Admin (reviews & approves project data)' },
  project_admin: { label: 'Project Admin', tier: 'Project', level: 4, badge: 'badge-amber', desc: 'Project site administrator & operational data entry' },
};

// Default delegable permissions per role
const ROLE_PERMISSIONS_PREVIEW = {
  system_admin: ['Platform Administration', 'Full System Access', 'Security & Audit Oversight'],
  group_admin: ['Group ESG Consolidation', 'Subsidiary Admin Delegation', 'BRSR Report Approval', 'Audit Trail Oversight'],
  subsidiary_admin: ['Subsidiary ESG Governance', 'BU Admin Delegation', 'BRSR Sections A & B', 'Consolidated Review'],
  bu_admin: ['BU Data Review & Approval', 'Project Admin Delegation', 'Variance Analysis', 'BU Target Management'],
  project_admin: ['Project Site Governance', 'Monthly Operational Data Entry', 'Evidence Document Upload', 'Pre-Submission Checklist'],
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
  const [deactivatePassword, setDeactivatePassword] = useState('');
  const [deactivateError, setDeactivateError] = useState('');

  // Delete User Modal state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteReason, setDeleteReason] = useState('Administrative personnel offboarding');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');


  // User Creation Request state
  const [isUserReqOpen, setIsUserReqOpen] = useState(false);
  const [reqFullName, setReqFullName] = useState('');
  const [reqEmail, setReqEmail] = useState('');
  const [reqPhone, setReqPhone] = useState('');
  const [reqEmployeeId, setReqEmployeeId] = useState('');
  const [reqRole, setReqRole] = useState('');
  const [reqOrgNodeId, setReqOrgNodeId] = useState('');
  const [reqReason, setReqReason] = useState('');
  const [reqError, setReqError] = useState('');
  const [lastApproved, setLastApproved] = useState(null);
  const [copiedPwd, setCopiedPwd] = useState(false);
  const [reqStatusFilter, setReqStatusFilter] = useState('ALL');

  // Reject Request Modal state
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState('');

  // Notification Banner
  const [notice, setNotice] = useState(null);

  // Fetch Org Nodes
  const { data: nodes = [] } = useQuery({
    queryKey: ['org-nodes-list'],
    staleTime: 60_000,
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
    if (!currentUser?.org_node_id || currentUser.role === 'system_admin') {
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
    staleTime: 3_000,
    refetchInterval: 4_000,
    refetchOnWindowFocus: true,
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
    staleTime: 3_000,
    refetchInterval: 4_000,
    refetchOnWindowFocus: true,
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

  // Fetch User Creation Requests (PENDING requests from subsidiaries)
  const { data: userRequests = [], isLoading: userReqLoading, refetch: refetchUserRequests } = useQuery({
    queryKey: ['user-creation-requests', currentUser?.id],
    staleTime: 3_000,
    refetchInterval: 4_000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      if (localStorage.getItem('brsr_mock_mode') === 'true') return [];
      try {
        const res = await authApi.listUserRequests();
        return res.data;
      } catch (err) {
        return [];
      }
    },
  });

  const pendingUserRequestsCount = userRequests.filter(r => r.status === 'PENDING').length;

  // Fetch Admin Audit Log (lazy-loaded on demand when audit tab is visited)
  const { data: auditLogs = [], isLoading: auditLoading, refetch: refetchAudit } = useQuery({
    queryKey: ['admin-audit-log', currentUser?.id],
    enabled: activeTab === 'audit',
    staleTime: 5_000,
    refetchInterval: 6_000,
    refetchOnWindowFocus: true,
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

  // Determine allowed nodes for the selected request role
  const eligibleNodesForReqRole = useMemo(() => {
    if (!reqRole) return [];
    const roleDef = ROLE_DEFINITIONS[reqRole];
    if (!roleDef) return [];

    let filtered = nodes;
    if (authorizedNodeIds) {
      filtered = filtered.filter(n => authorizedNodeIds.has(String(n.id)));
    }

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
  }, [reqRole, nodes, authorizedNodeIds]);

  const handleReqRoleSelect = (roleVal) => {
    setReqRole(roleVal);
    const roleDef = ROLE_DEFINITIONS[roleVal];
    if (!roleDef) return;

    if (currentUser?.org_node_id && (
      (currentRole === 'subsidiary_admin' && roleVal === 'subsidiary_admin') ||
      (currentRole === 'bu_admin' && roleVal === 'bu_admin') ||
      (currentRole === 'project_admin' && roleVal === 'project_admin')
    )) {
      setReqOrgNodeId(String(currentUser.org_node_id));
      return;
    }

    const eligible = nodes.filter(n => {
      if (authorizedNodeIds && !authorizedNodeIds.has(String(n.id))) return false;
      if (roleDef.tier === 'BU') return ['business_unit', 'bu'].includes(n.type?.toLowerCase());
      if (roleDef.tier === 'Project') return ['project', 'site'].includes(n.type?.toLowerCase());
      if (roleDef.tier === 'Subsidiary') return ['subsidiary', 'company'].includes(n.type?.toLowerCase());
      return true;
    });

    if (eligible.length > 0) {
      setReqOrgNodeId(String(eligible[0].id));
    } else {
      setReqOrgNodeId('');
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
    mutationFn: async ({ id, reason, admin_password }) => authApi.deactivateUser(id, reason, admin_password),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-scoped-users'] });
      qc.invalidateQueries({ queryKey: ['admin-invitations'] });
      qc.invalidateQueries({ queryKey: ['admin-audit-log'] });
      const name = deactivateTarget?.full_name || deactivateTarget?.email;
      setNotice({
        type: 'success',
        text: `Account for ${name} has been deactivated. Historical ESG records remain preserved.`
      });
      setDeactivateTarget(null);
      setDeactivatePassword('');
    },
    onError: (err) => {
      setDeactivateError(err.response?.data?.detail || 'Failed to deactivate user.');
    }
  });

  // Activate User Mutation
  const activateMutation = useMutation({
    mutationFn: async (id) => authApi.activateUser(id),
    onSuccess: (res, id) => {
      qc.invalidateQueries({ queryKey: ['admin-scoped-users'] });
      qc.invalidateQueries({ queryKey: ['admin-invitations'] });
      qc.invalidateQueries({ queryKey: ['admin-audit-log'] });
      setNotice({ type: 'success', text: 'User account reactivated successfully.' });
    },
    onError: (err) => {
      setNotice({ type: 'error', text: err.response?.data?.detail || 'Failed to reactivate user.' });
    }
  });

  // Delete User Mutation (requires password and reason)
  const deleteMutation = useMutation({
    mutationFn: async ({ id, admin_password, reason }) => authApi.deleteUser(id, admin_password, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-scoped-users'] });
      qc.invalidateQueries({ queryKey: ['admin-invitations'] });
      qc.invalidateQueries({ queryKey: ['admin-audit-log'] });
      const name = deleteTarget?.full_name || deleteTarget?.email;
      setNotice({
        type: 'success',
        text: `User ${name} has been safely deleted. Historical audit trail preserved.`
      });
      setDeleteTarget(null);
      setDeletePassword('');
      setDeleteReason('Administrative personnel offboarding');
    },
    onError: (err) => {
      setDeleteError(err.response?.data?.detail || 'Failed to delete user.');
    }
  });

  // Submit User Creation Request Mutation (subsidiary_admin)
  const submitUserReqMutation = useMutation({
    mutationFn: async (payload) => authApi.submitUserRequest(payload),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['user-creation-requests'] });
      setIsUserReqOpen(false);
      setReqFullName(''); setReqEmail(''); setReqPhone('');
      setReqEmployeeId(''); setReqRole(''); setReqOrgNodeId(''); setReqReason('');
      setNotice({
        type: 'success',
        text: `User creation request ${res.data.request_number} submitted successfully. Awaiting approval from Group Admin.`
      });
    },
    onError: (err) => {
      setReqError(err.response?.data?.detail || 'Failed to submit user creation request.');
    }
  });

  // Approve User Request Mutation (group_admin / system_admin)
  const approveUserReqMutation = useMutation({
    mutationFn: async (requestId) => authApi.approveUserRequest(requestId),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['user-creation-requests'] });
      qc.invalidateQueries({ queryKey: ['admin-scoped-users'] });
      qc.invalidateQueries({ queryKey: ['admin-audit-log'] });
      setLastApproved(res.data);
      setNotice({
        type: 'success',
        text: `User '${res.data.request?.full_name}' created successfully with 6-character initial password.`
      });
    },
    onError: (err) => {
      setNotice({ type: 'error', text: err.response?.data?.detail || 'Failed to approve request.' });
    }
  });

  // Reject User Request Mutation (group_admin / system_admin)
  const rejectUserReqMutation = useMutation({
    mutationFn: async ({ requestId, reason }) => authApi.rejectUserRequest(requestId, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user-creation-requests'] });
      qc.invalidateQueries({ queryKey: ['admin-audit-log'] });
      setRejectTarget(null);
      setRejectReason('');
      setNotice({ type: 'success', text: 'User creation request has been rejected.' });
    },
    onError: (err) => {
      setRejectError(err.response?.data?.detail || 'Failed to reject request.');
    }
  });

  // Handler: open submit-request modal (subsidiary_admin)
  const handleOpenUserReqModal = () => {
    setReqError('');
    setReqFullName(''); setReqEmail(''); setReqPhone('');
    setReqEmployeeId(''); setReqReason('');
    if (allowedRolesForInvite.length > 0) {
      handleReqRoleSelect(allowedRolesForInvite[0].value);
    }
    setIsUserReqOpen(true);
  };

  // Handler: submit user creation request form
  const handleSubmitUserReq = (e) => {
    e.preventDefault();
    if (!reqFullName.trim()) { setReqError('Full name is required.'); return; }
    if (!reqEmail.trim() || !reqEmail.includes('@')) { setReqError('A valid corporate email is required.'); return; }
    if (!reqRole) { setReqError('Please select a role.'); return; }
    setReqError('');
    submitUserReqMutation.mutate({
      full_name: reqFullName.trim(),
      email: reqEmail.trim(),
      phone: reqPhone.trim() || null,
      employee_id: reqEmployeeId.trim() || null,
      requested_role: reqRole,
      org_node_id: reqOrgNodeId || null,
      reason: reqReason.trim() || null,
    });
  };

  // Filter active users
  const filteredUsers = users.filter((u) => {
    // 1-level down rule for scoped admins
    if (currentRole === 'group_admin' && u.role !== 'subsidiary_admin') return false;
    if (currentRole === 'subsidiary_admin' && u.role !== 'bu_admin') return false;
    if (currentRole === 'bu_admin' && u.role !== 'project_admin') return false;

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

  // Set of lowercase emails of active users currently in the DB
  const activeUserEmailSet = useMemo(() => {
    return new Set(users.filter(u => !u.is_deleted).map(u => (u.email || '').toLowerCase().trim()));
  }, [users]);

  // Exclude deleted user invitations and ensure accepted invitations strictly map to active DB users
  const visibleInvitations = useMemo(() => {
    return invitations.filter(inv => {
      if (inv.is_deleted) return false;
      const email = (inv.email || '').toLowerCase().trim();
      if (inv.status === 'ACCEPTED') {
        return activeUserEmailSet.has(email);
      }
      return true;
    });
  }, [invitations, activeUserEmailSet]);

  // Filter user creation requests by status filter
  const filteredRequests = useMemo(() => {
    if (reqStatusFilter === 'ALL') return userRequests;
    return userRequests.filter(r => r.status === reqStatusFilter);
  }, [userRequests, reqStatusFilter]);

  const activeUsersCount = users.filter(u => u.is_active !== false && !u.is_deleted).length;
  const pendingInvitesCount = visibleInvitations.filter(i => ['PENDING', 'SENT'].includes(i.status)).length;
  const suspendedUsersCount = users.filter(u => u.is_active === false && !u.is_deleted).length;

  // Whether current user is a subsidiary_admin (request workflow) or approver
  const isSubsidiaryAdmin = currentRole === 'subsidiary_admin';
  const canApproveRequests = ['system_admin', 'group_admin'].includes(currentRole);

  if (currentRole === 'project_admin') {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <Shield size={48} color="#ef4444" style={{ margin: '0 auto 16px' }} />
        <h2 style={{ color: '#09090b', fontSize: 20 }}>Access Restricted</h2>
        <p style={{ color: '#64748b', maxWidth: 440, margin: '8px auto' }}>
          Project Admins are operational data contributors and cannot manage user accounts.
        </p>
      </div>
    );
  }

  return (
    <div className="page-content anim-fade-up" style={{ background: '#f8fafc' }}>
      {/* ── Status Ticker ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8,
        fontSize: 11, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748b'
      }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#15803d' }}>
          <span className="status-beacon-live" style={{ marginRight: 2 }} />
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
              refetchUserRequests();
              refetchAudit();
            }}
          >
            <RefreshCw size={13} />
            <span>Refresh</span>
          </button>

          {allowedRolesForInvite.length > 0 && (
            <button
              className="btn btn-primary"
              style={{ borderRadius: 6, background: '#0070F3', color: '#fff', border: 'none', fontWeight: 600 }}
              onClick={handleOpenInvite}
            >
              <UserPlus size={14} />
              <span>
                {currentRole === 'group_admin' ? '+ Invite Subsidiary Admin' :
                 currentRole === 'subsidiary_admin' ? '+ Invite BU Admin' :
                 currentRole === 'bu_admin' ? '+ Invite Project Admin' :
                 '+ Add Administrator'}
              </span>
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
          background: notice.type === 'success' ? '#ecfdf5' : '#fef2f2',
          color: notice.type === 'success' ? '#065f46' : '#991b1b',
          border: `1px solid ${notice.type === 'success' ? '#a7f3d0' : '#fca5a5'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px'
        }}>
          <span>{typeof notice.text === 'object' ? JSON.stringify(notice.text) : (notice.text || notice.message || notice.msg)}</span>
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
              <CheckCircle2 size={20} color="#059669" />
            </div>
            <div>
              <h3 style={{ color: '#09090B', fontSize: '15px' }}>Administrator Invitation Dispatched</h3>
              <p style={{ color: '#64748B', fontSize: '12px' }}>
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

      {/* Approved User Initial Credentials Card (Shown ONCE) */}
      {lastApproved && (
        <div className="credential-success-card anim-slide" style={{ marginBottom: 20, borderLeft: '4px solid #10b981', background: '#f0fdf4' }}>
          <div className="credential-success-header">
            <div className="credential-icon" style={{ background: '#d1fae5' }}>
              <CheckCircle2 size={20} color="#059669" />
            </div>
            <div>
              <h3 style={{ color: '#065f46', fontSize: '15px', margin: 0, fontWeight: 700 }}>
                User Creation Approved &amp; Initial Password Generated
              </h3>
              <p style={{ color: '#047857', fontSize: '12px', margin: '3px 0 0' }}>
                Account for <strong>{lastApproved.request?.full_name}</strong> ({lastApproved.request?.email}) has been provisioned.
                This initial 6-character password is <strong>displayed only once</strong>. Securely communicate it to the user.
              </p>
            </div>
            <button className="icon-btn" onClick={() => setLastApproved(null)} style={{ marginLeft: 'auto' }}>
              <X size={16} />
            </button>
          </div>

          <div className="credential-details-grid" style={{ marginTop: 14 }}>
            <div className="cred-box">
              <span className="cred-label">Approved User</span>
              <span className="cred-val highlight">{lastApproved.request?.full_name}</span>
            </div>
            <div className="cred-box">
              <span className="cred-label">Email</span>
              <span className="cred-val">{lastApproved.request?.email}</span>
            </div>
            <div className="cred-box">
              <span className="cred-label">Assigned Role</span>
              <span className="cred-val role-pill">
                {ROLE_DEFINITIONS[lastApproved.request?.requested_role]?.label || lastApproved.request?.requested_role}
              </span>
            </div>
            <div className="cred-box">
              <span className="cred-label">Scope</span>
              <span className="cred-val">{getNodeDisplay(lastApproved.request?.org_node_id)}</span>
            </div>
            <div className="cred-box" style={{ gridColumn: 'span 2', background: '#ffffff', border: '1px solid #a7f3d0', padding: '10px 14px', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span className="cred-label" style={{ color: '#065f46', fontWeight: 600 }}>Initial 6-Character Password (One-Time Display)</span>
                <div style={{ fontFamily: 'monospace', fontSize: '18px', fontWeight: 700, letterSpacing: '0.15em', color: '#0f172a', marginTop: 4 }}>
                  {lastApproved.initial_password}
                </div>
              </div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  navigator.clipboard.writeText(lastApproved.initial_password);
                  setCopiedPwd(true);
                  setTimeout(() => setCopiedPwd(false), 2000);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
              >
                {copiedPwd ? <Check size={14} color="#059669" /> : <Copy size={14} />}
                <span>{copiedPwd ? 'Copied' : 'Copy Password'}</span>
              </button>
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
          <div className="stat-label">Pending Requests</div>
          <div className="stat-value text-indigo" style={{ color: '#6366f1' }}>{pendingUserRequestsCount}</div>
          <div className="stat-desc">Subsidiary creation workflow</div>
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
        {(isSubsidiaryAdmin || canApproveRequests) && (
          <button
            className={`btn ${activeTab === 'requests' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ borderRadius: '8px 8px 0 0', borderBottom: 'none' }}
            onClick={() => setActiveTab('requests')}
          >
            <FileQuestion size={14} />
            <span>Pending Requests {pendingUserRequestsCount > 0 ? `(${pendingUserRequestsCount})` : ''}</span>
          </button>
        )}
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
                          ) : !(currentRole === 'system_admin' ||
                              (currentRole === 'group_admin' && u.role === 'subsidiary_admin') ||
                              (currentRole === 'subsidiary_admin' && u.role === 'bu_admin') ||
                              (currentRole === 'bu_admin' && u.role === 'project_admin')) ? (
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>View Only</span>
                          ) : (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                              {u.is_active !== false ? (
                                <button
                                  className="btn btn-secondary btn-sm"
                                  style={{ color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.3)', padding: '3px 8px', fontSize: 11 }}
                                  title="Deactivate Account"
                                  onClick={() => {
                                    setDeactivateError('');
                                    setDeactivateReason('Administrative delegation transition');
                                    setDeactivatePassword('');
                                    setDeactivateTarget(u);
                                  }}
                                >
                                  <Ban size={12} style={{ marginRight: 4 }} />
                                  Deactivate
                                </button>
                              ) : (
                                <button
                                  className="btn btn-secondary btn-sm"
                                  style={{ color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.3)', padding: '3px 8px', fontSize: 11 }}
                                  title="Reactivate Account"
                                  disabled={activateMutation.isPending}
                                  onClick={() => activateMutation.mutate(u.id)}
                                >
                                  <CheckCircle size={12} style={{ marginRight: 4 }} />
                                  Activate
                                </button>
                              )}
                              <button
                                className="btn btn-secondary btn-sm"
                                style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)', padding: '3px 8px', fontSize: 11 }}
                                title="Delete User (Soft-delete with password & reason)"
                                onClick={() => {
                                  setDeleteError('');
                                  setDeleteReason('Administrative personnel offboarding');
                                  setDeletePassword('');
                                  setDeleteTarget(u);
                                }}
                              >
                                <Trash2 size={12} style={{ marginRight: 4 }} />
                                Delete
                              </button>
                            </div>
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
                ) : visibleInvitations.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                      No pending invitations currently active.
                    </td>
                  </tr>
                ) : (
                  visibleInvitations.map((inv) => {
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
                          {inv.status === 'ACCEPTED' ? (
                            <span className="badge badge-green" style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0' }}>
                              ✓ Accepted &amp; Active
                            </span>
                          ) : inv.status === 'REVOKED' ? (
                            <span className="badge badge-rose" style={{ background: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca' }}>
                              Revoked
                            </span>
                          ) : (
                            <span className="badge badge-amber">Pending Activation</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          {inv.status === 'ACCEPTED' ? (
                            <span style={{ fontSize: 12, color: '#15803d', fontWeight: 600 }}>Active User</span>
                          ) : (
                            <>
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
                            </>
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

      {/* TAB: PENDING REQUESTS (Subsidiary Admin -> Group/System Admin Approval Workflow) */}
      {activeTab === 'requests' && (
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileQuestion size={16} color="#6366f1" />
              <h3 className="card-title">User Creation Requests &amp; Approval Queue</h3>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.04)', padding: '3px', borderRadius: 6, fontSize: 12 }}>
                {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((st) => (
                  <button
                    key={st}
                    className={`btn btn-sm ${reqStatusFilter === st ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '3px 10px', fontSize: 11, borderRadius: 4 }}
                    onClick={() => setReqStatusFilter(st)}
                  >
                    {st === 'ALL' ? `All (${userRequests.length})` : 
                     st === 'PENDING' ? `Pending (${userRequests.filter(r => r.status === 'PENDING').length})` :
                     st === 'APPROVED' ? `Approved (${userRequests.filter(r => r.status === 'APPROVED').length})` :
                     `Rejected (${userRequests.filter(r => r.status === 'REJECTED').length})`}
                  </button>
                ))}
              </div>
              {isSubsidiaryAdmin && (
                <button className="btn btn-primary btn-sm" onClick={handleOpenUserReqModal}>
                  <FilePlus size={13} />
                  <span>+ Submit Creation Request</span>
                </button>
              )}
            </div>
          </div>

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Request # &amp; Candidate</th>
                  <th>Requested Role</th>
                  <th>Assigned Scope</th>
                  <th>Submitted By</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {userReqLoading ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '32px' }}>
                      Loading user creation requests...
                    </td>
                  </tr>
                ) : filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                      No {reqStatusFilter !== 'ALL' ? reqStatusFilter.toLowerCase() : ''} user requests found.
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((req) => {
                    const roleDef = ROLE_DEFINITIONS[req.requested_role] || { label: req.requested_role, badge: 'badge-gray' };
                    return (
                      <tr key={req.id}>
                        <td>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                              <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: 'var(--brand-400)', background: 'rgba(99,102,241,0.1)', padding: '1px 6px', borderRadius: 4 }}>
                                {req.request_number}
                              </span>
                            </div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{req.full_name}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{req.email}</div>
                            {req.employee_id && (
                              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Emp ID: {req.employee_id}</div>
                            )}
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
                            <span>{getNodeDisplay(req.org_node_id)}</span>
                          </div>
                          {req.reason && (
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2, fontStyle: 'italic', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={req.reason}>
                              "{req.reason}"
                            </div>
                          )}
                        </td>
                        <td style={{ fontSize: '12px' }}>
                          <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{req.requested_by_name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{req.requested_by_role}</div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                            {new Date(req.created_at || Date.now()).toLocaleDateString()}
                          </div>
                        </td>
                        <td>
                          {req.status === 'PENDING' ? (
                            <span className="badge badge-amber" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <Clock size={11} /> Pending Approval
                            </span>
                          ) : req.status === 'APPROVED' ? (
                            <div>
                              <span className="badge badge-green" style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <CheckCircle size={11} /> Approved
                              </span>
                              {req.approved_by_name && (
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: 2 }}>
                                  by {req.approved_by_name}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div>
                              <span className="badge badge-rose" style={{ background: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <Ban size={11} /> Rejected
                              </span>
                              {req.rejection_reason && (
                                <div style={{ fontSize: '10px', color: '#b91c1c', marginTop: 2, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={req.rejection_reason}>
                                  {req.rejection_reason}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          {req.status === 'PENDING' && canApproveRequests ? (
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                              <button
                                className="btn btn-primary btn-sm"
                                style={{ background: '#16a34a', borderColor: '#16a34a', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                onClick={() => approveUserReqMutation.mutate(req.id)}
                                disabled={approveUserReqMutation.isPending}
                                title="Approve and generate credentials"
                              >
                                <ThumbsUp size={12} />
                                <span>{approveUserReqMutation.isPending ? 'Approving...' : 'Approve'}</span>
                              </button>
                              <button
                                className="btn btn-secondary btn-sm"
                                style={{ color: 'var(--rose-400)', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                onClick={() => {
                                  setRejectError('');
                                  setRejectReason('');
                                  setRejectTarget(req);
                                }}
                                disabled={rejectUserReqMutation.isPending}
                                title="Reject request"
                              >
                                <ThumbsDown size={12} />
                                <span>Reject</span>
                              </button>
                            </div>
                          ) : req.status === 'PENDING' ? (
                            <span style={{ fontSize: 12, color: 'var(--amber-400)', fontStyle: 'italic' }}>
                              Awaiting Approval
                            </span>
                          ) : (
                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                              Processed
                            </span>
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
            <span>{typeof inviteError === 'string' ? inviteError : JSON.stringify(inviteError)}</span>
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
                  placeholder="priya.das@aarohan.in"
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
              <label className="form-label">
                Assigned Organizational Unit * {inviteRole === 'subsidiary_admin' ? '(Select Subsidiary)' : inviteRole === 'bu_admin' ? '(Select Business Unit)' : inviteRole === 'project_admin' ? '(Select Project / Site)' : ''}
              </label>
              <select
                className="form-control"
                value={inviteOrgNodeId}
                onChange={(e) => setInviteOrgNodeId(e.target.value)}
                required
              >
                <option value="">-- Choose Assigned {inviteRole === 'subsidiary_admin' ? 'Subsidiary' : inviteRole === 'bu_admin' ? 'Business Unit' : inviteRole === 'project_admin' ? 'Project / Site' : 'Unit'} --</option>
                {eligibleNodesForInviteRole.map(n => (
                  <option key={n.id} value={n.id}>
                    {n.name} ({n.type?.toUpperCase()})
                  </option>
                ))}
              </select>
              {eligibleNodesForInviteRole.length === 0 ? (
                <div style={{ fontSize: '12px', color: '#ef4444', marginTop: 6, fontWeight: 500 }}>
                  ⚠️ No compatible {inviteRole === 'subsidiary_admin' ? 'subsidiary' : inviteRole === 'bu_admin' ? 'business unit' : 'project'} found! You must first create it under <strong>Org Hierarchy</strong> before assigning an admin.
                </div>
              ) : (
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 4 }}>
                  The invited administrator will be permanently scoped and restricted to this selected unit.
                </div>
              )}
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

      {/* MODAL: Deactivate User (system_admin / group_admin only — requires admin password) */}
      <Modal
        isOpen={!!deactivateTarget}
        onClose={() => { setDeactivateTarget(null); setDeactivatePassword(''); }}
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
                Preserves historical ESG submissions &amp; audit trail
              </p>
            </div>
          </div>
          <button className="icon-btn" onClick={() => { setDeactivateTarget(null); setDeactivatePassword(''); }}>
            <X size={18} />
          </button>
        </div>

        {deactivateError && (
          <div className="login-error-banner" style={{ margin: '16px 20px 0' }}>
            <AlertCircle size={16} />
            <span>{typeof deactivateError === 'string' ? deactivateError : JSON.stringify(deactivateError)}</span>
          </div>
        )}

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto', maxHeight: '70vh' }}>
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

          {/* Password Confirmation — security gate */}
          <div className="form-group">
            <label className="form-label" style={{ color: 'var(--rose-400)', fontWeight: 600 }}>
              Your Administrator Password *
            </label>
            <input
              type="password"
              className="form-control"
              value={deactivatePassword}
              onChange={(e) => setDeactivatePassword(e.target.value)}
              placeholder="Enter your own login password to confirm"
              autoComplete="current-password"
              style={{ border: '1px solid rgba(239,68,68,0.4)' }}
            />
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 4 }}>
              Only System Admin or Group Admin can deactivate accounts. Password verification is mandatory.
            </div>
          </div>

          <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4, paddingBottom: 4 }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => { setDeactivateTarget(null); setDeactivatePassword(''); }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              style={{ background: '#dc2626', borderColor: '#dc2626' }}
              disabled={deactivateMutation.isPending || !deactivatePassword.trim() || !deactivateReason.trim()}
              onClick={() => deactivateMutation.mutate({
                id: deactivateTarget.id,
                reason: deactivateReason,
                admin_password: deactivatePassword,
              })}
            >
              {deactivateMutation.isPending ? 'Deactivating...' : '⚠ Confirm Deactivation'}
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL: Delete User (system_admin / group_admin only — requires admin password & mandatory reason) */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => { setDeleteTarget(null); setDeletePassword(''); setDeleteReason(''); }}
        maxWidth="500px"
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="modal-header-icon" style={{ background: 'rgba(239, 68, 68, 0.2)' }}>
              <Trash2 size={18} color="#ef4444" />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', color: '#fff' }}>Delete User Account</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Audit-controlled soft deletion with credential revocation
              </p>
            </div>
          </div>
          <button className="icon-btn" onClick={() => { setDeleteTarget(null); setDeletePassword(''); setDeleteReason(''); }}>
            <X size={18} />
          </button>
        </div>

        {deleteError && (
          <div className="login-error-banner" style={{ margin: '16px 20px 0' }}>
            <AlertCircle size={16} />
            <span>{typeof deleteError === 'string' ? deleteError : JSON.stringify(deleteError)}</span>
          </div>
        )}

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto', maxHeight: '70vh' }}>
          <p style={{ fontSize: '13px', lineHeight: 1.5 }}>
            Are you sure you want to permanently delete the account for{' '}
            <strong style={{ color: '#fff' }}>{deleteTarget?.full_name || deleteTarget?.email}</strong>?
          </p>

          <div style={{ padding: '12px 14px', borderRadius: 6, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', fontSize: '12px', color: 'var(--text-secondary)' }}>
            <div style={{ fontWeight: 600, color: '#ef4444', marginBottom: 4 }}>Audit &amp; Data Preservation Notice:</div>
            Account credentials and role assignments will be immediately revoked for{' '}
            <strong>{getNodeDisplay(deleteTarget?.org_node_id)}</strong>.
            All historical business submissions, reviews, and audit logs will remain intact and auditable.
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600 }}>Deletion Reason *</label>
            <input
              type="text"
              className="form-control"
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              placeholder="e.g. Personnel offboarding, contract termination"
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ color: '#ef4444', fontWeight: 600 }}>
              Your Administrator Password *
            </label>
            <input
              type="password"
              className="form-control"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="Enter your login password to authorize deletion"
              autoComplete="current-password"
              style={{ border: '1px solid rgba(239,68,68,0.5)' }}
            />
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 4 }}>
              System Admin or Group Admin password verification is mandatory for user deletion.
            </div>
          </div>

          <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4, paddingBottom: 4 }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => { setDeleteTarget(null); setDeletePassword(''); setDeleteReason(''); }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              style={{ background: '#b91c1c', borderColor: '#b91c1c' }}
              disabled={deleteMutation.isPending || !deletePassword.trim() || !deleteReason.trim()}
              onClick={() => deleteMutation.mutate({
                id: deleteTarget.id,
                reason: deleteReason,
                admin_password: deletePassword,
              })}
            >
              {deleteMutation.isPending ? 'Deleting...' : '🗑 Confirm Deletion'}
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL: Submit User Creation Request (Subsidiary Admin) */}
      <Modal
        isOpen={isUserReqOpen}
        onClose={() => setIsUserReqOpen(false)}
        maxWidth="580px"
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="modal-header-icon" style={{ background: 'rgba(99, 102, 241, 0.15)' }}>
              <FilePlus size={18} color="#6366f1" />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', color: '#fff' }}>Request User Access</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Submit user creation request to Group Admin for approval &amp; auto-generated password
              </p>
            </div>
          </div>
          <button className="icon-btn" onClick={() => setIsUserReqOpen(false)}>
            <X size={18} />
          </button>
        </div>

        {reqError && (
          <div className="login-error-banner" style={{ margin: '16px 20px 0' }}>
            <AlertCircle size={16} />
            <span>{typeof reqError === 'string' ? reqError : JSON.stringify(reqError)}</span>
          </div>
        )}

        <form onSubmit={handleSubmitUserReq} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Section 1: Personal Information */}
          <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: 16 }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--brand-400)', textTransform: 'uppercase', marginBottom: 12 }}>
              1. Requested User Information
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Full Name *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Ananya Sen"
                  value={reqFullName}
                  onChange={(e) => setReqFullName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Corporate Email *</label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="user@enterprise.com"
                  value={reqEmail}
                  onChange={(e) => setReqEmail(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Phone Number (Optional)</label>
                <input
                  type="tel"
                  className="form-control"
                  placeholder="+91 98765 43210"
                  value={reqPhone}
                  onChange={(e) => setReqPhone(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Employee ID (Optional)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. EMP-2024-8841"
                  value={reqEmployeeId}
                  onChange={(e) => setReqEmployeeId(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Role & Hierarchy Scope */}
          <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: 16 }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--brand-400)', textTransform: 'uppercase', marginBottom: 12 }}>
              2. Requested Role &amp; Unit Boundary
            </div>
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label">Requested Role *</label>
              <select
                className="form-control"
                value={reqRole}
                onChange={(e) => handleReqRoleSelect(e.target.value)}
                required
              >
                {allowedRolesForInvite.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label} ({r.tier})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Organizational Unit *</label>
              <select
                className="form-control"
                value={reqOrgNodeId}
                onChange={(e) => setReqOrgNodeId(e.target.value)}
              >
                {eligibleNodesForReqRole.length === 0 ? (
                  <option value="">No eligible units in branch</option>
                ) : (
                  eligibleNodesForReqRole.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.name} ({n.type?.toUpperCase()})
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* Section 3: Justification */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--brand-400)', textTransform: 'uppercase', marginBottom: 8 }}>
              3. Business Justification
            </div>
            <div className="form-group">
              <label className="form-label">Justification / Operational Need (Optional)</label>
              <textarea
                className="form-control"
                rows={3}
                placeholder="Describe operational responsibilities (e.g. BRSR Principle 6 emission data reporting for BU Plant A)..."
                value={reqReason}
                onChange={(e) => setReqReason(e.target.value)}
                style={{ resize: 'vertical' }}
              />
            </div>
          </div>

          <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsUserReqOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitUserReqMutation.isPending}>
              <Send size={14} />
              <span>{submitUserReqMutation.isPending ? 'Submitting Request...' : 'Submit Request for Approval'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Reject User Creation Request (Mandatory Reason) */}
      <Modal
        isOpen={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        maxWidth="500px"
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="modal-header-icon" style={{ background: 'rgba(239, 68, 68, 0.15)' }}>
              <ThumbsDown size={18} color="var(--rose-400)" />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', color: '#fff' }}>Reject User Creation Request</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {rejectTarget?.request_number} — Mandatory rejection audit justification
              </p>
            </div>
          </div>
          <button className="icon-btn" onClick={() => setRejectTarget(null)}>
            <X size={18} />
          </button>
        </div>

        {rejectError && (
          <div className="login-error-banner" style={{ margin: '16px 20px 0' }}>
            <AlertCircle size={16} />
            <span>{typeof rejectError === 'string' ? rejectError : JSON.stringify(rejectError)}</span>
          </div>
        )}

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ fontSize: '13px', lineHeight: 1.5, margin: 0 }}>
            You are rejecting the user creation request for{' '}
            <strong style={{ color: '#fff' }}>{rejectTarget?.full_name}</strong> ({rejectTarget?.email})
            for role <strong style={{ color: 'var(--brand-400)' }}>{ROLE_DEFINITIONS[rejectTarget?.requested_role]?.label || rejectTarget?.requested_role}</strong>.
          </p>

          <div className="form-group">
            <label className="form-label">Mandatory Rejection Reason *</label>
            <textarea
              className="form-control"
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Duplicate person already exists in another unit, or incorrect role level requested..."
              required
              style={{ resize: 'vertical' }}
            />
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 4 }}>
              Minimum 3 characters. This reason will be recorded in the audit log and visible to the requesting subsidiary admin.
            </div>
          </div>

          <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
            <button type="button" className="btn btn-secondary" onClick={() => setRejectTarget(null)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              style={{ background: 'var(--rose-600)', borderColor: 'var(--rose-600)' }}
              disabled={rejectUserReqMutation.isPending || !rejectReason.trim() || rejectReason.trim().length < 3}
              onClick={() => {
                if (!rejectReason.trim() || rejectReason.trim().length < 3) {
                  setRejectError('A rejection reason of at least 3 characters is required.');
                  return;
                }
                rejectUserReqMutation.mutate({ requestId: rejectTarget.id, reason: rejectReason.trim() });
              }}
            >
              {rejectUserReqMutation.isPending ? 'Rejecting...' : 'Confirm Rejection'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
