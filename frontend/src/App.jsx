import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ─── Global Error Boundary ───────────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('ErrorBoundary caught:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', padding: '40px',
          background: '#06070f', color: '#f1f5f9', fontFamily: 'Inter, system-ui, sans-serif',
          textAlign: 'center', gap: '16px',
        }}>
          <div style={{ fontSize: '48px' }}>⚠️</div>
          <h2 style={{ margin: 0, fontSize: '22px', color: '#f43f5e' }}>Application Error</h2>
          <p style={{ maxWidth: '500px', color: '#94a3b8', fontSize: '14px', lineHeight: 1.6 }}>
            An unexpected error occurred. Please refresh the page or contact a System Administrator.
          </p>
          <pre style={{
            background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '16px 24px',
            fontSize: '12px', color: '#f87171', maxWidth: '700px', overflow: 'auto',
            textAlign: 'left', border: '1px solid rgba(248,113,113,0.2)',
          }}>
            {this.state.error?.toString()}
          </pre>
          <button
            onClick={() => { this.setState({ hasError: false, error: null, errorInfo: null }); window.location.href = '/'; }}
            style={{
              padding: '10px 28px', borderRadius: '8px', border: 'none',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff',
              fontSize: '14px', fontWeight: 600, cursor: 'pointer', marginTop: '8px',
            }}
          >
            Reload Application
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar        from './components/Sidebar';
import Header         from './components/Header';
import Landing        from './pages/Landing';
import Login          from './pages/Login';
import Dashboard      from './pages/Dashboard';
import UserManagement from './pages/UserManagement';
import OrgHierarchy   from './pages/OrgHierarchy';
import MetricCatalogue from './pages/MetricCatalogue';
import DataEntry      from './pages/DataEntry';
import EvidenceVault  from './pages/EvidenceVault';
import Workflow       from './pages/Workflow';
import Consolidation  from './pages/Consolidation';
import Reporting      from './pages/Reporting';
import Projects       from './pages/Projects';
import ProjectDetails from './pages/ProjectDetails';
import ParametersAdmin from './pages/ParametersAdmin';
import TemplateBuilder from './pages/TemplateBuilder';
import Calculations   from './pages/Calculations';
import DataQuality    from './pages/DataQuality';
import AuditLog       from './pages/AuditLog';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

// ─── Renders a "Not Authorised" screen ───────────────────────────────────────
function AccessDenied() {
  const { roleMeta, role } = useAuth();
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100%', gap: '16px',
      padding: '40px', textAlign: 'center',
    }}>
      <div style={{ fontSize: '48px' }}>🔒</div>
      <h2 style={{ color: 'var(--text-primary)', margin: 0 }}>Access Denied</h2>
      <p style={{ color: 'var(--text-secondary)', maxWidth: '420px', margin: 0 }}>
        Your role <strong style={{ color: roleMeta?.color }}>
          {roleMeta?.icon} {roleMeta?.label}
        </strong> does not have permission to access this page.
      </p>
      <p style={{ color: 'var(--text-tertiary)', fontSize: '12px', margin: 0 }}>
        Contact a System Administrator if you believe this is incorrect.
      </p>
    </div>
  );
}

// ─── Guards a route by one or more permissions (any match = allowed) ─────────
function PermissionGuard({ perms = [], children }) {
  const { hasPermission, user } = useAuth();
  if (!user) return <Navigate to="/landing" replace />;
  if (perms.length === 0) return children;
  const allowed = perms.some((p) => hasPermission(p));
  if (!allowed) return <AccessDenied />;
  return children;
}

// ─── Main app shell ──────────────────────────────────────────────────────────
function ProtectedLayout() {
  const { user, token, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Verifying MEIL ESG credentials...</p>
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/landing" replace />;
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-area">
        <Header />
        <Outlet />
      </div>
    </div>
  );
}

function RootRoute() {
  const { user, token, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
      </div>
    );
  }

  if (!token || !user) {
    return <Landing />;
  }

  return <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<RootRoute />} />
              <Route path="/landing" element={<Landing />} />
              <Route path="/login" element={<Login />} />

              {/* Authenticated Workspace Routes */}
              <Route element={<ProtectedLayout />}>
                {/* Dashboard — all authenticated users */}
                <Route path="/dashboard" element={<Dashboard />} />

                {/* Administration — system_admin only */}
                <Route path="/admin/users" element={
                  <PermissionGuard perms={['user:manage']}>
                    <UserManagement />
                  </PermissionGuard>
                } />

                {/* Configuration — org:read */}
                <Route path="/org" element={
                  <PermissionGuard perms={['org:read']}>
                    <OrgHierarchy />
                  </PermissionGuard>
                } />
                <Route path="/metrics" element={
                  <PermissionGuard perms={['metric:read']}>
                    <MetricCatalogue />
                  </PermissionGuard>
                } />

                {/* Data Collection — makers & esg_managers */}
                <Route path="/collection" element={
                  <PermissionGuard perms={['form:submit', 'submission:create']}>
                    <DataEntry />
                  </PermissionGuard>
                } />
                <Route path="/evidence" element={
                  <PermissionGuard perms={['evidence:read']}>
                    <EvidenceVault />
                  </PermissionGuard>
                } />

                {/* Assurance — checkers, auditors, esg_managers, admins */}
                <Route path="/workflow" element={
                  <PermissionGuard perms={['submission:review', 'form:review', 'submission:read']}>
                    <Workflow />
                  </PermissionGuard>
                } />

                {/* Reporting — all with report:read */}
                <Route path="/consolidation" element={
                  <PermissionGuard perms={['consolidation:read']}>
                    <Consolidation />
                  </PermissionGuard>
                } />
                {/* Projects */}
                <Route path="/projects" element={<Projects />} />
                <Route path="/projects/:id" element={<ProjectDetails />} />

                {/* ESG Parameters & Templates */}
                <Route path="/parameters" element={<ParametersAdmin />} />
                <Route path="/templates" element={<TemplateBuilder />} />

                {/* Reporting */}
                <Route path="/reporting" element={<Reporting />} />

                {/* Calculations & Lineage */}
                <Route path="/calculations" element={<Calculations />} />

                {/* System Quality & Audit Log */}
                <Route path="/data-quality" element={<DataQuality />} />
                <Route path="/audit-log" element={<AuditLog />} />
              </Route>

              {/* Catch-all redirect */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
