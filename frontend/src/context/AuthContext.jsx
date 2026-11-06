import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { authApi } from '../api/client';

// ─── Spec §45 Visibility Matrix — Permission Matrix ──────────────────────────
// Permissions determine what a user can SEE.
// Applicability rules determine what a user needs to ENTER.
// Reporting rules determine what appears in their REPORT.
// These three concerns are strictly separate.

// ─── Roles each admin level can create/manage (Eight-Role Architecture) ──────────────
export const MANAGEABLE_ROLES = {
  system_admin:          ['group_admin', 'group_supervisor', 'subsidiary_admin', 'subsidiary_supervisor', 'bu_admin', 'bu_supervisor', 'project_admin', 'project_supervisor'],
  group_admin:           ['subsidiary_admin', 'subsidiary_supervisor'],
  group_supervisor:      [],
  subsidiary_admin:      ['bu_admin', 'bu_supervisor'],
  subsidiary_supervisor: [],
  bu_admin:              ['project_admin', 'project_supervisor'],
  bu_supervisor:         [],
  project_admin:         [],
  project_supervisor:    [],
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
    'users:manage_scoped', 'org:hierarchy_view',
    'ai:e1:use', 'ai:e2:use', 'ai:e3:use', 'ai:e4:use', 'ai:e5:use', 'ai:e6:use', 'ai:e7:use', 'ai:approve',
  ]),

  group_admin: new Set([
    'org:read', 'org:write', 'org:hierarchy_view', 'metric:read', 'metric:write', 'form:master', 'form:review',
    'submission:read', 'submission:review', 'submission:approve', 'evidence:read', 'consolidation:read',
    'bu_disclosure:read', 'subsidiary_disclosure:read', 'group_disclosure:read',
    'report:read', 'report:lineage',
    'period:lock', 'audit:read',
    'user:manage', 'user:create', 'user:delete', 'users:manage_scoped',
    'ai:e1:use', 'ai:e2:use', 'ai:e3:use', 'ai:e4:use', 'ai:e5:use', 'ai:e6:use', 'ai:e7:use', 'ai:approve',
  ]),

  group_supervisor: new Set([
    'org:read', 'org:hierarchy_view', 'metric:read', 'metric:write', 'form:master',
    'submission:read', 'evidence:read', 'evidence:upload', 'spreadsheet:upload',
    'consolidation:run', 'consolidation:read', 'calc:run',
    'bu_disclosure:read', 'subsidiary_disclosure:read',
    'group_disclosure:write', 'group_disclosure:read',
    'report:read', 'report:lineage', 'report:compile',
    'audit:read',
    'ai:e1:use', 'ai:e2:use', 'ai:e3:use', 'ai:e4:use', 'ai:e5:use', 'ai:e6:use', 'ai:e7:use',
  ]),

  subsidiary_admin: new Set([
    'org:read', 'org:hierarchy_view', 'metric:read',
    'form:review', 'submission:read', 'submission:review', 'submission:approve', 'evidence:read',
    'consolidation:read',
    'bu_disclosure:read', 'subsidiary_disclosure:read',
    'report:read', 'report:lineage',
    'audit:read', 'users:manage_scoped',
    'ai:e1:use', 'ai:e2:use', 'ai:e3:use', 'ai:e4:use', 'ai:e5:use', 'ai:e6:use', 'ai:e7:use', 'ai:approve',
  ]),

  subsidiary_supervisor: new Set([
    'org:read', 'org:hierarchy_view', 'metric:read', 'metric:write',
    'submission:create', 'submission:read', 'submission:submit',
    'evidence:read', 'evidence:upload', 'spreadsheet:upload',
    'consolidation:run', 'consolidation:read', 'calc:run',
    'bu_disclosure:read',
    'subsidiary_disclosure:write', 'subsidiary_disclosure:read',
    'report:read', 'report:lineage',
    'audit:read',
    'ai:e1:use', 'ai:e2:use', 'ai:e3:use', 'ai:e4:use', 'ai:e5:use', 'ai:e6:use', 'ai:e7:use',
  ]),

  bu_admin: new Set([
    'org:read', 'org:hierarchy_view', 'metric:read',
    'form:review', 'submission:read', 'submission:review', 'submission:approve', 'evidence:read',
    'consolidation:read',
    'bu_disclosure:read',
    'report:read', 'report:lineage', 'audit:read', 'users:manage_scoped',
    'ai:e1:use', 'ai:e2:use', 'ai:e3:use', 'ai:e6:use', 'ai:e7:use', 'ai:approve',
  ]),

  bu_supervisor: new Set([
    'org:read', 'org:hierarchy_view', 'metric:read', 'metric:write',
    'form:submit',
    'submission:create', 'submission:read', 'submission:submit',
    'evidence:read', 'evidence:upload', 'spreadsheet:upload',
    'consolidation:run', 'consolidation:read', 'calc:run',
    'bu_disclosure:write', 'bu_disclosure:read',
    'report:read', 'report:lineage', 'audit:read',
    'ai:e1:use', 'ai:e2:use', 'ai:e3:use', 'ai:e6:use', 'ai:e7:use',
  ]),

  project_admin: new Set([
    'org:read', 'metric:read',
    'form:review',
    'submission:read', 'submission:review', 'submission:approve',
    'evidence:read',
    'report:read', 'audit:read',
    'ai:e1:use', 'ai:e2:use', 'ai:e3:use', 'ai:e6:use', 'ai:approve',
  ]),

  project_supervisor: new Set([
    'org:read', 'metric:read',
    'form:submit',
    'submission:create', 'submission:read', 'submission:submit',
    'evidence:upload', 'evidence:read', 'spreadsheet:upload',
    'report:read',
    'ai:e1:use', 'ai:e2:use', 'ai:e3:use', 'ai:e6:use',
  ]),
};

// ─── Role display metadata (Eight-Role Architecture) ──────────────────────────
export const ROLE_META = {
  system_admin:          { label: 'System Admin',          color: '#f43f5e', icon: '🛡️', tier: 'system',     scopeLabel: 'All' },
  group_admin:           { label: 'Group Admin',           color: '#8b5cf6', icon: '🏛️', tier: 'group',      scopeLabel: 'Group' },
  group_supervisor:      { label: 'Group Supervisor',      color: '#a855f7', icon: '📊', tier: 'group',      scopeLabel: 'Group' },
  subsidiary_admin:      { label: 'Subsidiary Admin',      color: '#6366f1', icon: '🏢', tier: 'subsidiary', scopeLabel: 'Subsidiary' },
  subsidiary_supervisor: { label: 'Subsidiary Supervisor', color: '#818cf8', icon: '📋', tier: 'subsidiary', scopeLabel: 'Subsidiary' },
  bu_admin:              { label: 'BU Admin',              color: '#0ea5e9', icon: '🏗️', tier: 'bu',         scopeLabel: 'Business Unit' },
  bu_supervisor:         { label: 'BU Supervisor',         color: '#38bdf8', icon: '📑', tier: 'bu',         scopeLabel: 'Business Unit' },
  project_admin:         { label: 'Project Admin',         color: '#059669', icon: '✅', tier: 'project',    scopeLabel: 'Project' },
  project_supervisor:    { label: 'Project Supervisor',    color: '#10b981', icon: '📁', tier: 'project',    scopeLabel: 'Project' },
};

const AuthContext = createContext(null);

export const SESSION_DURATION_MS = 45 * 60 * 1000; // 45 minutes strictly

const AUTH_KEYS = ['brsr_token', 'brsr_refresh_token', 'brsr_user', 'brsr_mock_mode', 'brsr_session_expiry'];

// Actively purge any legacy keys from localStorage to prevent cross-session contamination (e.g. past Ravi login)
AUTH_KEYS.forEach((k) => {
  try { localStorage.removeItem(k); } catch (_) {}
});

export const clearAuthStorage = () => {
  AUTH_KEYS.forEach((k) => {
    try {
      sessionStorage.removeItem(k);
      localStorage.removeItem(k);
    } catch (_) {}
  });
};

export const isSessionExpired = () => {
  const token = sessionStorage.getItem('brsr_token');
  if (!token) return true;

  // 1. Check explicit session expiry timestamp in sessionStorage (45 mins strictly)
  const expiry = sessionStorage.getItem('brsr_session_expiry');
  if (!expiry || Date.now() > Number(expiry)) {
    return true;
  }

  // 2. Mock mode session check
  if (token === 'mock-session-token') {
    return false;
  }

  // 3. Inspect JWT exp claim (payload.exp is in seconds)
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')));
      if (payload.exp && Date.now() >= payload.exp * 1000) {
        return true;
      }
    }
  } catch {
    return true;
  }

  return false;
};

export const isMock = () => sessionStorage.getItem('brsr_mock_mode') === 'true';

export function AuthProvider({ children }) {
  const [mockMode, setMockMode] = useState(() => {
    if (isSessionExpired()) {
      clearAuthStorage();
      return false;
    }
    return sessionStorage.getItem('brsr_mock_mode') === 'true';
  });

  const [token, setToken] = useState(() => {
    if (isSessionExpired()) {
      clearAuthStorage();
      return '';
    }
    return sessionStorage.getItem('brsr_token') || '';
  });

  const [user, setUser] = useState(() => {
    if (isSessionExpired()) {
      clearAuthStorage();
      return null;
    }
    try {
      const saved = sessionStorage.getItem('brsr_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(() => {
    if (isSessionExpired()) return false;
    const saved = sessionStorage.getItem('brsr_user');
    // If cached session exists, render immediately; only block if token exists with NO cached profile
    return !saved && !!sessionStorage.getItem('brsr_token');
  });

  useEffect(() => {
    if (token) {
      if (isSessionExpired()) {
        logout();
        return;
      }
      if (sessionStorage.getItem('brsr_mock_mode') === 'true' || token === 'mock-session-token') {
        setMockMode(true);
        setLoading(false);
        return;
      }
      authApi.getMe()
        .then((res) => {
          setUser(res.data);
          sessionStorage.setItem('brsr_user', JSON.stringify(res.data));
        })
        .catch((err) => {
          console.warn('Session check failed (server closed, rebooted, or token expired):', err?.message);
          // If server was closed or restarted, immediately invalidate session and redirect to /landing
          logout();
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  // ─── Proactive Session Expiry Check (every 10s + tab focus/visibility) ─────────
  useEffect(() => {
    if (!token) return;

    const checkSession = () => {
      if (isSessionExpired()) {
        console.warn('Session expired after 45 minutes. Redirecting to landing page.');
        logout();
      }
    };

    checkSession();
    const interval = setInterval(checkSession, 10000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkSession();
      }
    };

    window.addEventListener('focus', checkSession);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', checkSession);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [token]);

  const login = async (identifier, password) => {
    const cleanId = (identifier || '').trim();
    const cleanPwd = (password || '').trim();
    setMockMode(false);
    clearAuthStorage();
    const res = await authApi.login({
      username: cleanId,
      email: cleanId,
      password: cleanPwd
    });
    const { access_token, refresh_token, user: loggedUser } = res.data;
    
    // Set strict 45-minute expiration timestamp
    const expiryTime = Date.now() + SESSION_DURATION_MS;
    sessionStorage.setItem('brsr_session_expiry', String(expiryTime));

    setToken(access_token);
    setUser(loggedUser);
    sessionStorage.setItem('brsr_token', access_token);
    if (refresh_token) {
      sessionStorage.setItem('brsr_refresh_token', refresh_token);
    }
    sessionStorage.setItem('brsr_user', JSON.stringify(loggedUser));
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
    const expiryTime = Date.now() + SESSION_DURATION_MS;
    sessionStorage.setItem('brsr_session_expiry', String(expiryTime));

    setMockMode(true);
    setToken('mock-session-token');
    setUser(demoAdmin);
    sessionStorage.setItem('brsr_mock_mode', 'true');
    sessionStorage.setItem('brsr_token', 'mock-session-token');
    sessionStorage.setItem('brsr_user', JSON.stringify(demoAdmin));
  };

  const exitMockMode = () => {
    setMockMode(false);
    clearAuthStorage();
    logout();
  };

  const logout = () => {
    setToken('');
    setUser(null);
    setMockMode(false);
    clearAuthStorage();
    if (!window.location.pathname.startsWith('/landing')) {
      window.location.href = '/landing';
    }
  };

  // ─── RBAC helpers ─────────────────────────────────────────────────────────
  const role = user?.role || null;
  const userNodeId = user?.org_node_id || null;

  const hasPermission = useMemo(() => (permission) => {
    if (!role) return false;
    if (role === 'system_admin') return true;
    const perms = ROLE_PERMISSIONS[role];
    return perms ? perms.has(permission) : false;
  }, [role]);

  const manageableRoles = MANAGEABLE_ROLES[role] || [];

  // ── Role boolean flags (Eight-Role Architecture) ───────────────────────────
  // System
  const isSystemAdmin = role === 'system_admin';

  // Group
  const isGroupAdmin = role === 'group_admin';
  const isGroupSupervisor = role === 'group_supervisor';
  const isGroupEsgManager = isGroupAdmin || isGroupSupervisor;
  const isEsgManager = isGroupAdmin || isGroupSupervisor || isSystemAdmin;

  // Subsidiary
  const isSubAdmin = role === 'subsidiary_admin';
  const isSubSupervisor = role === 'subsidiary_supervisor';
  const isSubsidiaryAdmin = isSubAdmin;
  const isSubsidiarySupervisor = isSubSupervisor;
  const isSubEsgManager = isSubAdmin || isSubSupervisor;

  // BU
  const isBuAdmin = role === 'bu_admin';
  const isBuSupervisor = role === 'bu_supervisor';
  const isBuEsgManager = isBuAdmin || isBuSupervisor;
  const isBuReviewer = isBuAdmin;

  // Project
  const isProjectAdmin = role === 'project_admin';
  const isProjectSupervisor = role === 'project_supervisor';
  const isProjectDataEntryUser = isProjectSupervisor;

  // General Admin / Supervisor flags
  const isAdmin = ['system_admin', 'group_admin', 'subsidiary_admin', 'bu_admin', 'project_admin'].includes(role);
  const isSupervisor = ['group_supervisor', 'subsidiary_supervisor', 'bu_supervisor', 'project_supervisor'].includes(role);

  // Maker / Checker
  const isMaker = ['project_supervisor', 'bu_supervisor', 'subsidiary_supervisor', 'group_supervisor', 'system_admin'].includes(role);
  const isChecker = ['project_admin', 'bu_admin', 'subsidiary_admin', 'group_admin', 'system_admin'].includes(role);

  // Cross-cutting
  const isAuditor = isSystemAdmin;
  const isViewer = false;

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

      // Role boolean flags — 8-role architecture
      isAdmin,
      isSupervisor,
      isSystemAdmin,
      isGroupAdmin, isGroupSupervisor, isGroupEsgManager,
      isSubAdmin, isSubSupervisor, isSubsidiaryAdmin, isSubsidiarySupervisor, isSubEsgManager,
      isBuAdmin, isBuSupervisor, isBuEsgManager, isBuReviewer,
      isProjectAdmin, isProjectSupervisor, isProjectDataEntryUser,

      // Maker / Checker / Cross-cutting
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
