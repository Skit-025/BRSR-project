import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { authApi } from '../api/client';

// ─── Spec §45 Visibility Matrix — Permission Matrix ──────────────────────────
// Permissions determine what a user can SEE.
// Applicability rules determine what a user needs to ENTER.
// Reporting rules determine what appears in their REPORT.
// These three concerns are strictly separate.

// ─── Roles each admin level can create/manage (spec §2) ──────────────────────
export const MANAGEABLE_ROLES = {
  system_admin:     ['group_admin', 'group_esg_manager', 'subsidiary_admin', 'subsidiary_esg_manager', 'bu_admin', 'bu_esg_manager', 'bu_reviewer', 'project_admin', 'project_data_entry_user', 'auditor', 'read_only_viewer', 'viewer', 'maker', 'checker', 'esg_manager'],
  super_admin:      ['group_admin', 'group_esg_manager', 'subsidiary_admin', 'subsidiary_esg_manager', 'bu_admin', 'bu_esg_manager', 'bu_reviewer', 'project_admin', 'project_data_entry_user', 'auditor', 'read_only_viewer'],
  group_admin:      ['group_admin', 'group_esg_manager', 'subsidiary_admin', 'subsidiary_esg_manager'],
  group_esg_manager: ['group_esg_manager', 'subsidiary_esg_manager'],
  subsidiary_admin:  ['subsidiary_admin', 'subsidiary_esg_manager', 'bu_admin', 'bu_esg_manager', 'bu_reviewer'],
  subsidiary_esg_manager: ['subsidiary_esg_manager', 'bu_esg_manager', 'bu_reviewer'],
  bu_admin:         ['bu_admin', 'bu_esg_manager', 'bu_reviewer', 'project_admin', 'project_data_entry_user', 'maker'],
  bu_esg_manager:   ['bu_esg_manager', 'bu_reviewer', 'project_admin', 'project_data_entry_user', 'maker'],
  project_admin:    ['project_admin', 'project_data_entry_user', 'maker', 'checker'],
  // Legacy
  esg_manager:      ['maker', 'checker', 'viewer'],
  maker:            [],
  checker:          ['maker'],
};

// ─── Full permission matrix synced to backend RBAC (rbac.py) ─────────────────
const ROLE_PERMISSIONS = {
  system_admin: new Set([
    'user:manage', 'user:create', 'user:delete',
    'form:master', 'form:submit', 'form:review',
    'org:read', 'org:write',
    'metric:read', 'metric:write',
    'submission:create', 'submission:read', 'submission:submit', 'submission:review', 'submission:approve',
    'evidence:upload', 'evidence:read', 'spreadsheet:upload',
    'consolidation:run', 'consolidation:read',
    'calc:run',
    'report:compile', 'report:read', 'report:lineage',
    'bu_disclosure:write', 'bu_disclosure:read',
    'subsidiary_disclosure:write', 'subsidiary_disclosure:read',
    'group_disclosure:write', 'group_disclosure:read',
    'period:lock', 'audit:read', 'assurance:write',
    'users:manage_scoped',
    'ai:e1:use', 'ai:e2:use', 'ai:e3:use', 'ai:e4:use', 'ai:e5:use', 'ai:e6:use', 'ai:e7:use', 'ai:approve',
  ]),

  super_admin: new Set([
    'user:manage', 'user:create', 'user:delete',
    'form:master', 'form:submit', 'form:review',
    'org:read', 'org:write', 'metric:read', 'metric:write',
    'submission:create', 'submission:read', 'submission:submit', 'submission:review', 'submission:approve',
    'evidence:upload', 'evidence:read', 'spreadsheet:upload',
    'consolidation:run', 'consolidation:read', 'calc:run',
    'report:compile', 'report:read', 'report:lineage',
    'bu_disclosure:write', 'bu_disclosure:read',
    'subsidiary_disclosure:write', 'subsidiary_disclosure:read',
    'group_disclosure:write', 'group_disclosure:read',
    'period:lock', 'audit:read', 'assurance:write', 'users:manage_scoped',
    'ai:e1:use', 'ai:e2:use', 'ai:e3:use', 'ai:e4:use', 'ai:e5:use', 'ai:e6:use', 'ai:e7:use', 'ai:approve',
  ]),

  // ── Group level ─────────────────────────────────────────────────────────────
  group_admin: new Set([
    'org:read', 'org:write', 'metric:read', 'form:master',
    'submission:read', 'evidence:read', 'consolidation:read',
    'bu_disclosure:read', 'subsidiary_disclosure:read',
    'group_disclosure:write', 'group_disclosure:read',
    'report:read', 'report:lineage', 'report:compile',
    'period:lock', 'audit:read',
    'user:manage', 'user:create', 'user:delete', 'users:manage_scoped',
    'ai:e1:use', 'ai:e2:use', 'ai:e3:use', 'ai:e4:use', 'ai:e5:use', 'ai:e6:use', 'ai:e7:use', 'ai:approve',
  ]),

  group_esg_manager: new Set([
    'org:read', 'metric:read',
    'submission:read', 'submission:review', 'evidence:read',
    'consolidation:run', 'consolidation:read', 'calc:run',
    'bu_disclosure:read', 'subsidiary_disclosure:read',
    'group_disclosure:write', 'group_disclosure:read',
    'report:compile', 'report:read', 'report:lineage',
    'audit:read',
    'ai:e3:use', 'ai:e4:use', 'ai:e5:use', 'ai:e6:use',
  ]),

  // ── Subsidiary level ─────────────────────────────────────────────────────────
  subsidiary_admin: new Set([
    'org:read', 'org:write', 'metric:read',
    'submission:read', 'submission:review', 'evidence:read',
    'consolidation:read',
    'bu_disclosure:read',
    'subsidiary_disclosure:write', 'subsidiary_disclosure:read',
    'report:read', 'report:lineage',
    'audit:read', 'users:manage_scoped',
    'ai:e1:use', 'ai:e2:use', 'ai:e3:use', 'ai:e4:use', 'ai:e5:use', 'ai:e6:use', 'ai:e7:use', 'ai:approve',
  ]),

  subsidiary_esg_manager: new Set([
    'org:read', 'metric:read',
    'submission:read', 'submission:review', 'submission:approve', 'evidence:read',
    'consolidation:read',
    'bu_disclosure:read',
    'subsidiary_disclosure:write', 'subsidiary_disclosure:read',
    'report:read', 'report:lineage',
    'audit:read',
    'ai:e3:use', 'ai:e4:use', 'ai:e5:use', 'ai:e6:use',
  ]),

  // ── BU level ──────────────────────────────────────────────────────────────────
  bu_admin: new Set([
    'org:read', 'org:write', 'metric:read',
    'submission:read', 'submission:review', 'form:review', 'evidence:read',
    'consolidation:read',
    'bu_disclosure:write', 'bu_disclosure:read',
    'report:read', 'audit:read', 'users:manage_scoped',
    'ai:e1:use', 'ai:e2:use', 'ai:e3:use', 'ai:e6:use', 'ai:e7:use', 'ai:approve',
  ]),

  bu_esg_manager: new Set([
    'org:read', 'metric:read',
    'submission:read', 'submission:review', 'submission:approve', 'form:review', 'evidence:read',
    'consolidation:read', 'calc:run',
    'bu_disclosure:write', 'bu_disclosure:read',
    'report:read', 'report:lineage', 'audit:read',
    'ai:e2:use', 'ai:e7:use', 'ai:approve',
  ]),

  bu_reviewer: new Set([
    'org:read', 'metric:read',
    'form:review',
    'submission:read', 'submission:review', 'submission:approve', 'evidence:read',
    'consolidation:read',
    'bu_disclosure:read',
    'report:read', 'audit:read',
    'ai:e2:use', 'ai:e7:use', 'ai:approve',
  ]),

  // ── Project level ──────────────────────────────────────────────────────────────
  project_admin: new Set([
    'org:read', 'metric:read',
    'form:submit',
    'submission:create', 'submission:read', 'submission:submit',
    'evidence:upload', 'evidence:read', 'spreadsheet:upload',
    'report:read', 'users:manage_scoped',
    // ── AI Engines (synced with backend rbac.py PROJECT_ADMIN) ──────────────
    'ai:e1:use', 'ai:e2:use', 'ai:e3:use', 'ai:e6:use',
  ]),

  project_data_entry_user: new Set([
    'org:read', 'metric:read',
    'form:submit',
    'submission:create', 'submission:read', 'submission:submit',
    'evidence:upload', 'evidence:read', 'spreadsheet:upload',
    'report:read',
    // ── AI Engines (synced with backend rbac.py PROJECT_DATA_ENTRY_USER) ──────
    'ai:e1:use', 'ai:e3:use', 'ai:e6:use',
  ]),

  // ── Legacy roles (backwards compatibility) ─────────────────────────────────
  esg_manager: new Set([
    'org:read', 'org:write', 'metric:read', 'metric:write', 'form:master',
    'submission:create', 'submission:read', 'submission:submit', 'submission:review', 'submission:approve',
    'evidence:upload', 'evidence:read', 'spreadsheet:upload',
    'consolidation:run', 'consolidation:read', 'calc:run',
    'bu_disclosure:read', 'subsidiary_disclosure:read',
    'group_disclosure:write', 'group_disclosure:read',
    'report:compile', 'report:read', 'report:lineage',
    'period:lock', 'audit:read',
  ]),

  maker: new Set([
    'org:read', 'metric:read', 'form:submit',
    'submission:create', 'submission:read', 'submission:submit',
    'evidence:upload', 'evidence:read', 'spreadsheet:upload', 'report:read',
  ]),

  checker: new Set([
    'org:read', 'metric:read', 'form:review',
    'submission:read', 'submission:review', 'submission:approve', 'evidence:read',
    'consolidation:read', 'bu_disclosure:read',
    'report:read', 'audit:read',
  ]),

  auditor: new Set([
    'org:read', 'metric:read', 'submission:read', 'evidence:read',
    'consolidation:read',
    'bu_disclosure:read', 'subsidiary_disclosure:read', 'group_disclosure:read',
    'report:read', 'report:lineage', 'audit:read', 'assurance:write',
  ]),

  read_only_viewer: new Set([
    'org:read', 'metric:read', 'submission:read', 'report:read',
  ]),

  viewer: new Set([
    'org:read', 'metric:read', 'submission:read', 'report:read',
  ]),
};

// ─── Role display metadata ─────────────────────────────────────────────────────
export const ROLE_META = {
  system_admin:     { label: 'System Admin',              color: '#f43f5e', icon: '🛡️',  tier: 'system',     scopeLabel: 'All' },
  super_admin:      { label: 'Super Admin',               color: '#f43f5e', icon: '🛡️',  tier: 'system',     scopeLabel: 'All' },

  group_admin:      { label: 'Group Admin',               color: '#8b5cf6', icon: '🏛️',  tier: 'group',      scopeLabel: 'Group' },
  group_esg_manager: { label: 'Group ESG Manager',        color: '#7c3aed', icon: '🌍',  tier: 'group',      scopeLabel: 'Group' },

  subsidiary_admin:       { label: 'Subsidiary Admin',      color: '#6366f1', icon: '🏢', tier: 'subsidiary', scopeLabel: 'Subsidiary' },
  subsidiary_esg_manager: { label: 'Subsidiary ESG Manager', color: '#4f46e5', icon: '📊', tier: 'subsidiary', scopeLabel: 'Subsidiary' },

  bu_admin:         { label: 'BU Admin',                  color: '#0ea5e9', icon: '🏗️',  tier: 'bu',         scopeLabel: 'Business Unit' },
  bu_esg_manager:   { label: 'BU ESG Manager',            color: '#0284c7', icon: '📋',  tier: 'bu',         scopeLabel: 'Business Unit' },
  bu_reviewer:      { label: 'BU Reviewer',               color: '#0369a1', icon: '✅',  tier: 'bu',         scopeLabel: 'Business Unit' },

  project_admin:           { label: 'Project Admin',           color: '#f59e0b', icon: '📁',  tier: 'project', scopeLabel: 'Project' },
  project_data_entry_user: { label: 'Data Entry',              color: '#d97706', icon: '✏️',  tier: 'project', scopeLabel: 'Project' },

  // Legacy
  esg_manager: { label: 'ESG Manager',         color: '#10b981', icon: '🌱', tier: 'group',   scopeLabel: 'Group' },
  maker:        { label: 'Data Entry (Maker)',  color: '#f59e0b', icon: '✏️', tier: 'project', scopeLabel: 'Project' },
  checker:      { label: 'Checker',            color: '#0ea5e9', icon: '✅', tier: 'bu',      scopeLabel: 'BU' },
  auditor:      { label: 'Auditor',            color: '#14b8a6', icon: '🔍', tier: 'group',   scopeLabel: 'All (Read)' },
  read_only_viewer: { label: 'Viewer',         color: '#94a3b8', icon: '👁️', tier: 'group',   scopeLabel: 'All (Read)' },
  viewer:       { label: 'Viewer',             color: '#94a3b8', icon: '👁️', tier: 'group',   scopeLabel: 'All (Read)' },
};

const AuthContext = createContext(null);

export const isMock = () => localStorage.getItem('brsr_mock_mode') === 'true';

export function AuthProvider({ children }) {
  const [mockMode, setMockMode] = useState(() => localStorage.getItem('brsr_mock_mode') === 'true');
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('brsr_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('brsr_token') || '');
  const [loading, setLoading] = useState(() => {
    const saved = localStorage.getItem('brsr_user');
    // If cached session exists, render immediately; only block if token exists with NO cached profile
    return !saved && !!localStorage.getItem('brsr_token');
  });

  useEffect(() => {
    if (token) {
      if (localStorage.getItem('brsr_mock_mode') === 'true' || token === 'mock-session-token') {
        setMockMode(true);
        setLoading(false);
        return;
      }
      authApi.getMe()
        .then((res) => {
          setUser(res.data);
          localStorage.setItem('brsr_user', JSON.stringify(res.data));
        })
        .catch((err) => {
          console.warn('Session check failed or expired:', err.message);
          if (err.response?.status === 401) {
            logout();
          }
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (identifier, password) => {
    const cleanId = (identifier || '').trim();
    const cleanPwd = (password || '').trim();
    setMockMode(false);
    localStorage.removeItem('brsr_mock_mode');
    const res = await authApi.login({
      username: cleanId,
      email: cleanId,
      password: cleanPwd
    });
    const { access_token, user: loggedUser } = res.data;
    setToken(access_token);
    setUser(loggedUser);
    localStorage.setItem('brsr_token', access_token);
    localStorage.setItem('brsr_user', JSON.stringify(loggedUser));
    return loggedUser;
  };

  const enterMockMode = (mockRole = 'system_admin') => {
    const demoAdmin = {
      id: 'system-admin-uuid',
      email: 'admin@aarohan.in',
      full_name: 'Aditya Sharma (Group ESG Director)',
      role: mockRole,
      is_active: true,
      is_mfa_enabled: false,
      is_mock_mode: true
    };
    setMockMode(true);
    setToken('mock-session-token');
    setUser(demoAdmin);
    localStorage.setItem('brsr_mock_mode', 'true');
    localStorage.setItem('brsr_token', 'mock-session-token');
    localStorage.setItem('brsr_user', JSON.stringify(demoAdmin));
  };

  const exitMockMode = () => {
    setMockMode(false);
    localStorage.removeItem('brsr_mock_mode');
    logout();
  };

  const logout = () => {
    setToken('');
    setUser(null);
    setMockMode(false);
    localStorage.removeItem('brsr_token');
    localStorage.removeItem('brsr_user');
    localStorage.removeItem('brsr_mock_mode');
  };

  // ─── RBAC helpers ─────────────────────────────────────────────────────────
  const role = user?.role || null;
  const userNodeId = user?.org_node_id || null;

  const hasPermission = useMemo(() => (permission) => {
    if (!role) return false;
    if (role === 'system_admin' || role === 'super_admin') return true;
    const perms = ROLE_PERMISSIONS[role];
    return perms ? perms.has(permission) : false;
  }, [role]);

  const manageableRoles = MANAGEABLE_ROLES[role] || [];

  // ── Role boolean flags ────────────────────────────────────────────────────
  // System
  const isAdmin        = role === 'system_admin' || role === 'super_admin';

  // Group
  const isGroupAdmin      = role === 'group_admin';
  const isGroupEsgManager = role === 'group_esg_manager';
  const isEsgManager      = role === 'esg_manager' || isGroupEsgManager; // legacy compat

  // Subsidiary
  const isSubAdmin        = role === 'subsidiary_admin';
  const isSubEsgManager   = role === 'subsidiary_esg_manager';

  // BU
  const isBuAdmin         = role === 'bu_admin';
  const isBuEsgManager    = role === 'bu_esg_manager';
  const isBuReviewer      = role === 'bu_reviewer' || role === 'checker'; // checker is legacy alias

  // Project
  const isProjectAdmin          = role === 'project_admin';
  const isProjectDataEntryUser  = role === 'project_data_entry_user' || role === 'maker'; // maker is legacy
  const isMaker                 = role === 'maker';  // legacy name kept
  const isChecker               = role === 'checker'; // legacy name kept

  // Cross-cutting
  const isAuditor      = role === 'auditor';
  const isViewer       = role === 'viewer' || role === 'read_only_viewer';

  // ── Derived scope tier ────────────────────────────────────────────────────
  const scopeTier = ROLE_META[role]?.tier || 'group';
  const roleMeta  = ROLE_META[role] || { label: role || 'Unknown', color: '#94a3b8', icon: '👤', tier: 'group', scopeLabel: '' };

  // ── Capability shortcuts (derived from permissions) ───────────────────────
  const canManageUsers    = hasPermission('user:manage') || hasPermission('users:manage_scoped');
  const canWriteOrg       = hasPermission('org:write');
  const canSubmitData     = hasPermission('form:submit') || hasPermission('submission:submit');
  const canReviewData     = hasPermission('form:review') || hasPermission('submission:review');
  const canApproveSubmission = hasPermission('submission:approve');
  const canConsolidate    = hasPermission('consolidation:run');
  const canCompileReport  = hasPermission('report:compile');
  const canAudit          = hasPermission('audit:read');
  const canSeeConsolidation = hasPermission('consolidation:read');
  const canSeeReport      = hasPermission('report:read');
  const canViewLineage    = hasPermission('report:lineage');

  // Disclosure form capabilities (spec §46 Type 3)
  const canWriteBuDisclosure         = hasPermission('bu_disclosure:write');
  const canWriteSubsidiaryDisclosure = hasPermission('subsidiary_disclosure:write');
  const canWriteGroupDisclosure      = hasPermission('group_disclosure:write');
  const canReadBuDisclosure          = hasPermission('bu_disclosure:read');
  const canReadSubsidiaryDisclosure  = hasPermission('subsidiary_disclosure:read');
  const canReadGroupDisclosure       = hasPermission('group_disclosure:read');

  return (
    <AuthContext.Provider value={{
      user, token, loading, login, logout,
      mockMode, enterMockMode, exitMockMode,
      role, roleMeta, userNodeId, scopeTier,
      hasPermission, manageableRoles,

      // Role boolean flags — spec roles
      isAdmin,
      isSystemAdmin: isAdmin,
      isGroupAdmin, isGroupEsgManager,
      isSubAdmin, isSubEsgManager,
      isSubsidiaryAdmin: isSubAdmin,
      isBuAdmin, isBuEsgManager, isBuReviewer,
      isProjectAdmin, isProjectDataEntryUser,

      // Legacy role booleans (kept for backwards compat)
      isEsgManager, isMaker, isChecker, isAuditor, isViewer,

      // Capability shortcuts
      canManageUsers, canWriteOrg,
      canSubmitData, canReviewData, canApproveSubmission,
      canConsolidate, canCompileReport,
      canAudit, canSeeConsolidation, canSeeReport, canViewLineage,

      // Disclosure capabilities (spec §46 Type 3)
      canWriteBuDisclosure, canWriteSubsidiaryDisclosure, canWriteGroupDisclosure,
      canReadBuDisclosure, canReadSubsidiaryDisclosure, canReadGroupDisclosure,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
