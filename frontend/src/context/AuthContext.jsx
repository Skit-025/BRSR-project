import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { authApi } from '../api/client';

const AuthContext = createContext(null);

// â”€â”€â”€ Permission Matrix (mirrors backend app/security/rbac.py) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const ROLE_PERMISSIONS = {
  system_admin: new Set([
    'user:manage', 'user:create', 'user:delete',
    'form:master', 'form:submit', 'form:review',
    'org:read', 'org:write',
    'metric:read', 'metric:write',
    'submission:create', 'submission:read', 'submission:submit', 'submission:review',
    'evidence:upload', 'evidence:read',
    'spreadsheet:upload',
    'consolidation:run', 'consolidation:read',
    'calc:run',
    'report:compile', 'report:read',
    'period:lock', 'audit:read', 'assurance:write',
    'ai:review',
  ]),
  group_admin: new Set([
    'org:read',
    'metric:read',
    'form:master',
    'submission:read',
    'evidence:read',
    'consolidation:read',
    'report:read',
    'period:lock',
    'audit:read',
    'ai:review',
  ]),
  esg_manager: new Set([
    'org:read', 'org:write',
    'metric:read',
    'form:master',
    'submission:create', 'submission:read', 'submission:submit', 'submission:review',
    'evidence:upload', 'evidence:read',
    'spreadsheet:upload',
    'consolidation:run', 'consolidation:read',
    'calc:run',
    'report:compile', 'report:read',
    'period:lock', 'audit:read',
    'ai:review',
  ]),
  subsidiary_admin: new Set([
    'org:read',
    'metric:read',
    'submission:read',
    'evidence:read',
    'consolidation:read',
    'report:read',
    'audit:read',
  ]),
  maker: new Set([
    'org:read',
    'metric:read',
    'form:submit',
    'submission:create', 'submission:read', 'submission:submit',
    'evidence:upload', 'evidence:read',
    'spreadsheet:upload',
    'report:read',
  ]),
  checker: new Set([
    'org:read',
    'metric:read',
    'form:review',
    'submission:read', 'submission:review',
    'evidence:read',
    'consolidation:read',
    'report:read',
    'audit:read',
    'ai:review',
  ]),
  auditor: new Set([
    'org:read',
    'metric:read',
    'submission:read',
    'evidence:read',
    'consolidation:read',
    'report:read',
    'audit:read',
    'assurance:write',
  ]),
  viewer: new Set([
    'org:read',
    'metric:read',
    'submission:read',
    'report:read',
  ]),
};

// â”€â”€â”€ Role display metadata â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const ROLE_META = {
  system_admin:     { label: 'System Admin',     color: '#f43f5e', icon: 'ðŸ›¡ï¸' },
  group_admin:      { label: 'Group Admin',       color: '#8b5cf6', icon: 'ðŸ›ï¸' },
  esg_manager:      { label: 'ESG Manager',       color: '#10b981', icon: 'ðŸŒ±' },
  subsidiary_admin: { label: 'Subsidiary Admin',  color: '#6366f1', icon: 'ðŸ¢' },
  maker:            { label: 'Maker',             color: '#f59e0b', icon: 'âœï¸' },
  checker:          { label: 'Checker',           color: '#0ea5e9', icon: 'âœ…' },
  auditor:          { label: 'Auditor',           color: '#14b8a6', icon: 'ðŸ”' },
  viewer:           { label: 'Viewer',            color: '#94a3b8', icon: 'ðŸ‘ï¸' },
};

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
  const [loading, setLoading] = useState(true);

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
      id: 'demo-system-admin-uuid',
      email: 'demo.admin@meil.in',
      full_name: 'Demo System Administrator (Mock Mode)',
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

  // â”€â”€â”€ RBAC helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const role = user?.role || null;

  /** Check if current user has a specific permission string â€” System Admin has all permissions */
  const hasPermission = useMemo(() => (permission) => {
    if (!role) return false;
    if (role === 'system_admin') return true;
    const perms = ROLE_PERMISSIONS[role];
    return perms ? perms.has(permission) : false;
  }, [role]);

  /** Convenience booleans for common role checks */
  const isAdmin       = role === 'system_admin';
  const isGroupAdmin  = role === 'group_admin';
  const isEsgManager  = role === 'esg_manager';
  const isSubAdmin    = role === 'subsidiary_admin';
  const isMaker       = role === 'maker';
  const isChecker     = role === 'checker';
  const isAuditor     = role === 'auditor';
  const isViewer      = role === 'viewer';

  /** True if user can manage/create/delete other users */
  const canManageUsers = hasPermission('user:manage');

  /** True for roles that can write to org hierarchy */
  const canWriteOrg   = hasPermission('org:write');

  /** True for roles that can submit data entries */
  const canSubmitData = hasPermission('form:submit') || hasPermission('submission:submit');

  /** True for roles that can review / approve data */
  const canReviewData = hasPermission('form:review') || hasPermission('submission:review');

  /** True for roles that can run consolidation */
  const canConsolidate = hasPermission('consolidation:run');

  /** True for roles that can compile reports */
  const canCompileReport = hasPermission('report:compile');

  /** True for roles with audit read access */
  const canAudit = hasPermission('audit:read');

  const roleMeta = ROLE_META[role] || { label: role || 'Unknown', color: '#94a3b8', icon: 'ðŸ‘¤' };

  return (
    <AuthContext.Provider value={{
      user, token, loading, login, logout,
      mockMode, enterMockMode, exitMockMode,
      role, roleMeta,
      hasPermission,
      isAdmin, isGroupAdmin, isEsgManager, isSubAdmin,
      isMaker, isChecker, isAuditor, isViewer,
      canManageUsers, canWriteOrg, canSubmitData,
      canReviewData, canConsolidate, canCompileReport, canAudit,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);


