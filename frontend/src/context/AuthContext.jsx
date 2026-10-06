import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { authApi } from '../api/client';

const AuthContext = createContext(null);

// ─── Permission Matrix (mirrors backend app/security/rbac.py) ──────────────────
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

// ─── Role display metadata ─────────────────────────────────────────────────────
export const ROLE_META = {
  system_admin:     { label: 'System Admin',     color: '#f43f5e', icon: '🛡️' },
  group_admin:      { label: 'Group Admin',       color: '#8b5cf6', icon: '🏛️' },
  esg_manager:      { label: 'ESG Manager',       color: '#10b981', icon: '🌱' },
  subsidiary_admin: { label: 'Subsidiary Admin',  color: '#6366f1', icon: '🏢' },
  maker:            { label: 'Maker',             color: '#f59e0b', icon: '✏️' },
  checker:          { label: 'Checker',           color: '#0ea5e9', icon: '✅' },
  auditor:          { label: 'Auditor',           color: '#14b8a6', icon: '🔍' },
  viewer:           { label: 'Viewer',            color: '#94a3b8', icon: '👁️' },
};

export const DEMO_PERSONAS = {
  aditya: {
    key: 'aditya',
    full_name: 'Aditya Varma',
    email: 'aditya.v@enterprise.com',
    role: 'group_admin',
    title: 'Group ESG Executive',
    organization: 'Enterprise Group (Parent)',
  },
  priya: {
    key: 'priya',
    full_name: 'Priya Verma',
    email: 'priya.v@odisha-infra.com',
    role: 'checker',
    title: 'BU Reviewer',
    organization: 'Odisha Infrastructure / Construction BU',
  },
  rahul: {
    key: 'rahul',
    full_name: 'Rahul Sharma',
    email: 'rahul.s@highway-exp.com',
    role: 'maker',
    title: 'Project Data Maker',
    organization: 'Highway Expansion (PRJ-101)',
  },
  anil: {
    key: 'anil',
    full_name: 'Anil Mehta',
    email: 'anil.m@enterprise.com',
    role: 'esg_manager',
    title: 'ESG Director',
    organization: 'Corporate Sustainability Office',
  },
  admin: {
    key: 'admin',
    full_name: 'System Admin',
    email: 'admin@enterprise.com',
    role: 'system_admin',
    title: 'System Administrator',
    organization: 'IT & Security Governance',
  },
  auditor: {
    key: 'auditor',
    full_name: 'Dr. Radhika Sen',
    email: 'radhika.s@audit-assurance.com',
    role: 'auditor',
    title: 'Independent BRSR Auditor',
    organization: 'Statutory Assurance Partner',
  },
};

export const isMock = () => localStorage.getItem('brsr_mock_mode') === 'true' || !localStorage.getItem('brsr_token');

export function AuthProvider({ children }) {
  const [mockMode, setMockMode] = useState(() => localStorage.getItem('brsr_mock_mode') !== 'false');
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('brsr_user');
      return saved ? JSON.parse(saved) : DEMO_PERSONAS.aditya;
    } catch {
      return DEMO_PERSONAS.aditya;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('brsr_token') || 'mock-session-token');
  const [loading, setLoading] = useState(false);

  const switchPersona = (personaKey) => {
    const persona = DEMO_PERSONAS[personaKey] || DEMO_PERSONAS.aditya;
    setUser(persona);
    setMockMode(true);
    setToken('mock-session-token');
    localStorage.setItem('brsr_mock_mode', 'true');
    localStorage.setItem('brsr_token', 'mock-session-token');
    localStorage.setItem('brsr_user', JSON.stringify(persona));
  };

  const enterMockMode = (personaKey = 'aditya') => {
    switchPersona(personaKey);
  };


  const exitMockMode = () => {
    setMockMode(false);
    localStorage.removeItem('brsr_mock_mode');
    logout();
  };

  const login = async (username, password) => {
    setLoading(true);
    try {
      const res = await authApi.login({ username, password });
      const { access_token, user: apiUser } = res.data;
      setToken(access_token);
      setUser(apiUser);
      setMockMode(false);
      localStorage.setItem('brsr_token', access_token);
      localStorage.setItem('brsr_user', JSON.stringify(apiUser));
      localStorage.setItem('brsr_mock_mode', 'false');
      return apiUser;
    } catch (err) {
      console.error('Login failed:', err);
      throw err;
    } finally {
      setLoading(false);
    }
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

  /** Check if current user has a specific permission string — System Admin has all permissions */
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

  const roleMeta = ROLE_META[role] || { label: role || 'Unknown', color: '#94a3b8', icon: '👤' };

  return (
    <AuthContext.Provider value={{
      user, token, loading, login, logout,
      mockMode, enterMockMode, exitMockMode, switchPersona, DEMO_PERSONAS,
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
