import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Users, UserPlus, Shield, Trash2, CheckCircle2, 
  Copy, Check, AlertCircle, Key, Building2, Eye, Filter, RefreshCw, X,
  Lock, EyeOff, ShieldAlert
} from 'lucide-react';
import { authApi, orgApi } from '../api/client';
import { useAuth } from '../context/AuthContext';

const HIERARCHY_TIERS = [
  { level: 1, name: 'Level 1: Group Executive', type: 'group', desc: 'Enterprise-wide group consolidation oversight' },
  { level: 2, name: 'Level 2: Subsidiary', type: 'subsidiary', desc: 'MEIL Hydrocarbon, Olectra, Megha City Gas, etc.' },
  { level: 3, name: 'Level 3: Associate Entity', type: 'associate', desc: 'Associated corporate entities' },
  { level: 4, name: 'Level 4: Joint Venture (JV)', type: 'jv', desc: 'Strategic consortia and JV projects' },
  { level: 5, name: 'Level 5: Business Unit (BU)', type: 'business_unit', desc: 'Divisional Business Units' },
  { level: 6, name: 'Level 6: Project', type: 'project', desc: 'Major capital infrastructure projects' },
  { level: 7, name: 'Level 7: Operational Site', type: 'site', desc: 'Pumping stations, depots, fabrication yards' },
];

const ROLES = [
  { value: 'maker', label: 'Maker (Data Entry)', desc: 'Enters data, submits monthly pack, uploads evidence', badge: 'badge-amber' },
  { value: 'checker', label: 'Checker (4-Eyes Approval)', desc: 'Reviews and approves/rejects submissions (Maker != Checker)', badge: 'badge-sky' },
  { value: 'esg_manager', label: 'ESG Manager', desc: 'Policy formulation, consolidation engine, calculations', badge: 'badge-emerald' },
  { value: 'subsidiary_admin', label: 'Subsidiary Admin', desc: 'Governs submissions and operations for a specific subsidiary', badge: 'badge-indigo' },
  { value: 'group_admin', label: 'Group Executive Admin', desc: 'Group-level oversight and reporting period closure', badge: 'badge-purple' },
  { value: 'auditor', label: 'Independent Auditor', desc: 'Third-party assurance, read-only audit logs & SHA-256 seal', badge: 'badge-teal' },
  { value: 'viewer', label: 'Viewer', desc: 'Read-only analytics and executive dashboard access', badge: 'badge-gray' },
  { value: 'system_admin', label: 'System Administrator', desc: 'Sole authority to provision users and manage credentials', badge: 'badge-rose' },
];

export default function UserManagement() {
  const qc = useQueryClient();
  const { user: currentUser } = useAuth();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState(null);
  const [copied, setCopied] = useState(false);
  const [formError, setFormError] = useState('');
  const [filterRole, setFilterRole] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Delete authorization state
  const [deleteTargetUser, setDeleteTargetUser] = useState(null);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [deleteNotice, setDeleteNotice] = useState(null);

  // Form fields
  const [employeeId, setEmployeeId] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedTier, setSelectedTier] = useState(6); // Default Level 6 Project
  const [selectedNodeId, setSelectedNodeId] = useState('');
  const [selectedRole, setSelectedRole] = useState('maker');
  const [customPassword, setCustomPassword] = useState('');

  // Fetch all users
  const { data: users = [], isLoading: usersLoading, isRefetching: usersRefetching, refetch: refetchUsers } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const res = await authApi.getAdminUsers();
      return res.data;
    },
  });

  // Fetch org nodes to associate with user
  const { data: nodes = [] } = useQuery({
    queryKey: ['org-nodes-list'],
    queryFn: async () => {
      const res = await orgApi.getNodes();
      return res.data;
    },
  });

  // Provision user mutation
  const provisionMutation = useMutation({
    mutationFn: (data) => authApi.provisionUser(data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      setCreatedCredentials(res.data);
      setIsModalOpen(false);
      // Reset form
      setEmployeeId('');
      setFullName('');
      setCustomPassword('');
      setFormError('');
    },
    onError: (err) => {
      const msg = err.response?.data?.detail || err.message || 'Failed to provision user';
      setFormError(msg);
    },
  });

  // Delete user mutation with administrator password verification
  const deleteMutation = useMutation({
    mutationFn: ({ id, password }) => authApi.deleteUser(id, password),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      setDeleteNotice({
        type: 'success',
        text: `User ${deleteTargetUser?.email} (${deleteTargetUser?.full_name}) successfully deleted.`
      });
      setDeleteTargetUser(null);
      setAdminPasswordInput('');
      setDeleteError('');
    },
    onError: (err) => {
      const msg = err.response?.data?.detail || err.message || 'Incorrect administrator password. Deletion unauthorized.';
      setDeleteError(msg);
      setAdminPasswordInput('');
    },
  });

  const handleConfirmDelete = (e) => {
    e.preventDefault();
    if (!adminPasswordInput.trim()) {
      setDeleteError('Please enter your administrator password to proceed.');
      return;
    }
    setDeleteError('');
    deleteMutation.mutate({
      id: deleteTargetUser.id,
      password: adminPasswordInput
    });
  };

  const handleCreateUser = (e) => {
    e.preventDefault();
    if (!employeeId.trim()) {
      setFormError('Employee ID or Username is required.');
      return;
    }
    if (!fullName.trim()) {
      setFormError('Employee Full Name is required.');
      return;
    }

    setFormError('');
    provisionMutation.mutate({
      employee_id: employeeId.trim(),
      username: employeeId.trim(),
      email: employeeId.trim(),
      full_name: fullName.trim(),
      role: selectedRole,
      org_node_id: selectedNodeId || null,
      initial_password: customPassword.trim() || undefined,
    });
  };

  const copyCredentials = () => {
    if (!createdCredentials) return;
    const text = `MEIL ESG Portal Credentials\nEmployee ID: ${createdCredentials.email}\nFull Name: ${createdCredentials.full_name}\nRole: ${createdCredentials.role}\nInitial Password: ${createdCredentials.initial_password}\nPortal URL: ${window.location.origin}/login`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  // Filtered users
  const filteredUsers = users.filter((u) => {
    const matchRole = filterRole === 'ALL' || u.role === filterRole;
    const term = searchTerm.toLowerCase();
    const matchTerm = !term || 
      (u.email && u.email.toLowerCase().includes(term)) ||
      (u.full_name && u.full_name.toLowerCase().includes(term));
    return matchRole && matchTerm;
  });

  return (
    <div className="page-content anim-fade">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <div className="page-tag">SYSTEM ADMINISTRATOR CONSOLE</div>
          <h1 className="page-title">User Provisioning & 7-Tier Access Governance</h1>
          <p className="page-desc">
            Sole authority to provision employee identities, bind permanent roles, and assign organizational 
            hierarchy scopes from Group Executive down to Operational Site levels.
          </p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={() => refetchUsers()} disabled={usersRefetching}>
            <RefreshCw size={14} className={usersRefetching ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
          <button className="btn btn-primary" onClick={() => { setIsModalOpen(true); setFormError(''); }}>
            <UserPlus size={15} />
            <span>+ Provision New User</span>
          </button>
        </div>
      </div>

      {/* Credentials Banner on Success */}
      {createdCredentials && (
        <div className="credential-success-card anim-slide">
          <div className="credential-success-header">
            <div className="credential-icon">
              <CheckCircle2 size={20} color="var(--emerald-400)" />
            </div>
            <div>
              <h3 style={{ color: '#fff', fontSize: '15px' }}>User Account Provisioned Successfully</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                Hand these initial credentials directly to the employee. They can sign in immediately at the portal login screen.
              </p>
            </div>
            <button className="icon-btn" onClick={() => setCreatedCredentials(null)} style={{ marginLeft: 'auto' }}>
              <X size={16} />
            </button>
          </div>

          <div className="credential-details-grid">
            <div className="cred-box">
              <span className="cred-label">Employee ID / Username</span>
              <span className="cred-val highlight">{createdCredentials.email}</span>
            </div>
            <div className="cred-box">
              <span className="cred-label">Full Name</span>
              <span className="cred-val">{createdCredentials.full_name}</span>
            </div>
            <div className="cred-box">
              <span className="cred-label">Permanent Role</span>
              <span className="cred-val role-pill">{createdCredentials.role.toUpperCase()}</span>
            </div>
            <div className="cred-box">
              <span className="cred-label">Initial Password</span>
              <span className="cred-val password-mono">{createdCredentials.initial_password}</span>
            </div>
          </div>

          <div className="credential-actions">
            <button className="btn btn-primary btn-sm" onClick={copyCredentials}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span>{copied ? 'Copied to Clipboard!' : 'Copy Credentials to Hand Over'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Delete Notice Banner */}
      {deleteNotice && (
        <div style={{
          padding: '12px 18px',
          borderRadius: '8px',
          fontSize: '13px',
          fontWeight: 600,
          background: deleteNotice.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          color: deleteNotice.type === 'success' ? '#10b981' : '#ef4444',
          border: `1px solid ${deleteNotice.type === 'success' ? '#10b981' : '#ef4444'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px'
        }}>
          <span>{deleteNotice.text}</span>
          <button className="icon-btn" onClick={() => setDeleteNotice(null)} style={{ width: 24, height: 24 }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Hierarchy Info Strip */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">Active Provisioned Users</div>
          <div className="stat-value">{users.length}</div>
          <div className="stat-desc">Permanent role bindings</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">System Administrators</div>
          <div className="stat-value text-rose">{users.filter(u => u.role === 'system_admin').length}</div>
          <div className="stat-desc">Skit-025 & adtshrm007</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Makers & Checkers</div>
          <div className="stat-value text-emerald">
            {users.filter(u => u.role === 'maker' || u.role === 'checker').length}
          </div>
          <div className="stat-desc">Four-Eyes Data Pipeline</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Org Scope Entities</div>
          <div className="stat-value text-brand">{nodes.length}</div>
          <div className="stat-desc">Across 7 hierarchy levels</div>
        </div>
      </div>

      {/* Directory Table */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={16} color="var(--brand-400)" />
            <h3 className="card-title">Employee Directory & Role Access</h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Search */}
            <input
              type="text"
              placeholder="Search by ID or name..."
              className="form-control"
              style={{ width: 220, height: 32, fontSize: '12px' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            {/* Filter by role */}
            <select
              className="form-control"
              style={{ width: 170, height: 32, fontSize: '12px' }}
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
            >
              <option value="ALL">All Roles</option>
              {ROLES.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="table-wrap" style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee ID / Username</th>
                <th>Full Name</th>
                <th>Assigned Role</th>
                <th>Org Node Scope</th>
                <th>Status</th>
                <th>Provisioned At</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {usersLoading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '32px' }}>
                    Loading user records from database...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    No users found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const roleObj = ROLES.find(r => r.value === u.role);
                  const isCurrentAdmin = u.email === currentUser?.email || u.id === currentUser?.id;
                  const isRootAdmin = u.email === 'Skit-025' || u.email === 'adtshrm007';

                  return (
                    <tr key={u.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className="user-avatar-sm">
                            {(u.email || 'U').substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{u.email}</div>
                            {isRootAdmin && (
                              <span style={{ fontSize: '10px', color: 'var(--brand-400)' }}>Primary System Admin</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>{u.full_name}</td>
                      <td>
                        <span className={`badge ${roleObj?.badge || 'badge-gray'}`}>
                          {roleObj?.label || u.role}
                        </span>
                      </td>
                      <td>
                        {u.org_node_id ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '12px' }}>
                            <Building2 size={13} color="var(--text-muted)" />
                            <span>{nodes.find(n => n.id === u.org_node_id)?.name || u.org_node_id.substring(0, 8)}</span>
                          </div>
                        ) : (
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Group Wide Access</span>
                        )}
                      </td>
                      <td>
                        <span className="badge badge-emerald">
                          Active
                        </span>
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'System Seed'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {isRootAdmin || isCurrentAdmin ? (
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Protected</span>
                        ) : (
                          <button
                            className="icon-btn text-rose"
                            title="Delete / Revoke User"
                            onClick={() => {
                              setDeleteTargetUser(u);
                              setAdminPasswordInput('');
                              setDeleteError('');
                            }}
                          >
                            <Trash2 size={14} />
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

      {/* Modal: Provision New User */}
      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-dialog anim-slide">
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="modal-header-icon">
                  <UserPlus size={18} color="var(--brand-400)" />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', color: '#fff' }}>Provision New Employee User</h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Assign permanent credentials and 7-tier organizational scope
                  </p>
                </div>
              </div>
              <button className="icon-btn" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="login-error-banner" style={{ margin: '16px 20px 0' }}>
                <AlertCircle size={16} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="modal-body">
              {/* Employee ID */}
              <div className="form-group">
                <label>Employee ID / Username <span className="text-rose">*</span></label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. MEIL-1049, rajesh.site, kaleshwaram.maker"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  required
                />
                <span className="form-help">Will be used by the employee to log in to the portal.</span>
              </div>

              {/* Full Name */}
              <div className="form-group">
                <label>Full Employee Name <span className="text-rose">*</span></label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Ramesh Chandra (Site Lead)"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              {/* Hierarchy Tier Selector (1 to 7) */}
              <div className="form-group">
                <label>Hierarchy Level (7-Tier Model)</label>
                <select
                  className="form-control"
                  value={selectedTier}
                  onChange={(e) => setSelectedTier(Number(e.target.value))}
                >
                  {HIERARCHY_TIERS.map(t => (
                    <option key={t.level} value={t.level}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <span className="form-help">
                  {HIERARCHY_TIERS.find(t => t.level === selectedTier)?.desc}
                </span>
              </div>

              {/* Org Node Scope */}
              <div className="form-group">
                <label>Assigned Organizational Node / Entity</label>
                <select
                  className="form-control"
                  value={selectedNodeId}
                  onChange={(e) => setSelectedNodeId(e.target.value)}
                >
                  <option value="">Group-Wide Access (No Entity Restriction)</option>
                  {nodes.map(n => (
                    <option key={n.id} value={n.id}>
                      [{n.type.toUpperCase()}] {n.name} ({n.code})
                    </option>
                  ))}
                </select>
                <span className="form-help">Scopes user's data entry, review, and visibility to this entity.</span>
              </div>

              {/* Role Selection */}
              <div className="form-group">
                <label>Designated Role <span className="text-rose">*</span></label>
                <select
                  className="form-control"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  required
                >
                  {ROLES.map(r => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
                <div className="role-desc-preview">
                  {ROLES.find(r => r.value === selectedRole)?.desc}
                </div>
              </div>

              {/* Optional Custom Password */}
              <div className="form-group">
                <label>Initial Password (Optional)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Leave empty to auto-generate a secure random temporary password"
                  value={customPassword}
                  onChange={(e) => setCustomPassword(e.target.value)}
                />
                <span className="form-help">Minimum 6 characters if providing custom password.</span>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={provisionMutation.isPending}
                >
                  {provisionMutation.isPending ? 'Provisioning...' : 'Provision User Credentials'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Security Re-Authentication Modal: Admin Password required to delete */}
      {deleteTargetUser && (
        <div className="modal-backdrop">
          <div className="modal-dialog anim-slide" style={{ maxWidth: '480px' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid var(--border-default)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="modal-header-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', color: '#fff', margin: 0 }}>Confirm User Deletion</h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                    Re-enter your System Administrator password to authorize
                  </p>
                </div>
              </div>
              <button
                className="icon-btn"
                onClick={() => {
                  setDeleteTargetUser(null);
                  setDeleteError('');
                  setAdminPasswordInput('');
                }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmDelete}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '8px', padding: '12px 16px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#f87171', marginBottom: 4 }}>
                    Warning: Irreversible Identity Revocation
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    You are permanently revoking access for employee:
                    <div style={{ marginTop: 6, fontWeight: 700, color: '#fff', fontSize: '13px' }}>
                      {deleteTargetUser.email} — {deleteTargetUser.full_name} ({deleteTargetUser.role})
                    </div>
                  </div>
                </div>

                {deleteError && (
                  <div style={{ padding: '10px 14px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid #ef4444', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <AlertCircle size={15} />
                    <span>{deleteError}</span>
                  </div>
                )}

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <Lock size={14} color="var(--brand-400)" />
                    <span>Enter System Admin Password:</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showDeletePassword ? 'text' : 'password'}
                      value={adminPasswordInput}
                      onChange={(e) => setAdminPasswordInput(e.target.value)}
                      placeholder="Type your administrator password"
                      className="form-control"
                      autoFocus
                      required
                      style={{ paddingRight: '40px', height: '42px', fontSize: '14px', background: 'var(--bg-elevated)', border: deleteError ? '1px solid #ef4444' : '1px solid var(--border-strong)' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowDeletePassword(!showDeletePassword)}
                      className="icon-btn"
                      style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none' }}
                      title={showDeletePassword ? 'Hide password' : 'Show password'}
                    >
                      {showDeletePassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                    Authorized System Admins: Skit-025 or adtshrm007
                  </span>
                </div>
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setDeleteTargetUser(null);
                    setDeleteError('');
                    setAdminPasswordInput('');
                  }}
                  disabled={deleteMutation.isPending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-danger"
                  style={{ background: '#ef4444', color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}
                  disabled={deleteMutation.isPending || !adminPasswordInput.trim()}
                >
                  <Trash2 size={14} />
                  <span>{deleteMutation.isPending ? 'Verifying...' : 'Authorize & Delete'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
