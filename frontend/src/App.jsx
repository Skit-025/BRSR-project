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
          background: '#FAFAFA', color: '#111111', fontFamily: 'Inter, system-ui, sans-serif',
          textAlign: 'center', gap: '16px',
        }}>
          <div style={{ fontSize: '48px' }}>⚠️</div>
          <h2 style={{ margin: 0, fontSize: '22px', color: '#DC2626' }}>Application Error</h2>
          <p style={{ maxWidth: '500px', color: '#666666', fontSize: '14px', lineHeight: 1.6 }}>
            An unexpected error occurred. Please refresh the page or contact a System Administrator.
          </p>
          <pre style={{
            background: '#FFF1F1', borderRadius: '8px', padding: '16px 24px',
            fontSize: '12px', color: '#DC2626', maxWidth: '700px', overflow: 'auto',
            textAlign: 'left', border: '1px solid #FECACA',
          }}>
            {this.state.error?.toString()}
          </pre>
          <button
            onClick={() => { this.setState({ hasError: false, error: null, errorInfo: null }); window.location.href = '/'; }}
            style={{
              padding: '10px 28px', borderRadius: '8px', border: 'none',
              background: '#0070F3', color: '#fff',
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
import Workflow       from './pages/Workflow';
import Consolidation  from './pages/Consolidation';
import Reporting      from './pages/Reporting';
import EvidenceVault  from './pages/EvidenceVault';
import ProjectSummary from './pages/ProjectSummary';
import Projects       from './pages/Projects';
import ProjectDetail  from './pages/ProjectDetail';
import ProjectWizard  from './pages/ProjectWizard';
import DataQuality    from './pages/DataQuality';
import AuditLog       from './pages/AuditLog';
import ValueChain     from './pages/ValueChain';
import Assurance      from './pages/Assurance';
import BackgroundJobs from './pages/BackgroundJobs';
import AarohanAI      from './pages/AarohanAI';
import Trash          from './pages/Trash';

// ── Disclosure pages (Type 3 forms — spec §46) ────────────────────────────────
// BU Disclosures: targets, initiatives, BU-specific data (spec §23)
// Subsidiary Disclosures: Section A/B/C, org info (spec §29-32)
// Group Disclosures: policies, governance, assurance (spec §36)
// These pages are loaded lazily and will be built progressively.
const BUDisclosure         = React.lazy(() => import('./pages/BUDisclosure').catch(() => ({ default: () => <DisclosurePlaceholder level="BU" /> })));
const SubsidiaryDisclosure = React.lazy(() => import('./pages/SubsidiaryDisclosure').catch(() => ({ default: () => <DisclosurePlaceholder level="Subsidiary" /> })));
const GroupDisclosure      = React.lazy(() => import('./pages/GroupDisclosure').catch(() => ({ default: () => <DisclosurePlaceholder level="Group" /> })));

function DisclosurePlaceholder({ level }) {
  return (
    <div style={{
      padding: '48px 40px', maxWidth: 600, margin: '0 auto',
      display: 'flex', flexDirection: 'column', gap: 16,
    }}>
      <div style={{ fontSize: 40 }}>📋</div>
      <h2 style={{ color: 'var(--text-primary)', margin: 0 }}>{level} Disclosure Form</h2>
      <p style={{ color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
        This form allows you to enter information that genuinely belongs to the <strong>{level} level</strong>
        — separate from project operational data (Collection forms) and review decisions (Review forms).
      </p>
      <div style={{
        padding: '16px', borderRadius: 10, background: 'var(--bg-elevated)',
        border: '1px solid var(--border-default)', fontSize: 13, color: 'var(--text-secondary)',
      }}>
        <strong style={{ color: 'var(--text-primary)' }}>🚧 Coming Soon</strong>
        <br />
        The {level} Disclosure form is being implemented. This page will contain structured
        {level === 'Subsidiary' ? ' Section A, B, and C disclosures.' :
         level === 'BU' ? ' BU-level targets, initiatives, and governance information.' :
         ' Group-level policies, governance, and assurance information.'}
      </div>
    </div>
  );
}


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
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Verifying Aarohan ESG credentials...</p>
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-area">
        <Header />
        <div
          className="main-content-scroll"
          id="main-content-scroll"
          style={{
            flex: 1,
            minHeight: 0,
            minWidth: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
          }}
        >
          <Outlet />
        </div>
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

                {/* Administration — User Governance */}
                <Route path="/admin/users" element={
                  <PermissionGuard perms={['user:manage', 'users:manage_scoped']}>
                    <UserManagement />
                  </PermissionGuard>
                } />

                {/* Configuration — org:hierarchy_view (System, Group, Subsidiary Admins only; BU & Project use Projects console) */}
                <Route path="/org" element={
                  <PermissionGuard perms={['org:hierarchy_view']}>
                    <OrgHierarchy />
                  </PermissionGuard>
                } />
                <Route path="/metrics" element={
                  <PermissionGuard perms={['metric:read']}>
                    <MetricCatalogue />
                  </PermissionGuard>
                } />

                {/* Data Collection — project-level users */}
                <Route path="/collection" element={
                  <PermissionGuard perms={['form:submit', 'submission:create']}>
                    <DataEntry />
                  </PermissionGuard>
                } />

                {/* Workflow — reviewers at all levels */}
                <Route path="/workflow" element={
                  <PermissionGuard perms={['submission:review', 'form:review', 'submission:read']}>
                    <Workflow />
                  </PermissionGuard>
                } />

                {/* Consolidation — BU Admin and above */}
                <Route path="/consolidation" element={
                  <PermissionGuard perms={['consolidation:read']}>
                    <Consolidation />
                  </PermissionGuard>
                } />

                {/* Reporting — all with report:read */}
                <Route path="/reporting" element={
                  <PermissionGuard perms={['report:read']}>
                    <Reporting />
                  </PermissionGuard>
                } />

                {/* Evidence Vault — evidence:read */}
                <Route path="/evidence" element={
                  <PermissionGuard perms={['evidence:read']}>
                    <EvidenceVault />
                  </PermissionGuard>
                } />

                {/* Level-Specific Disclosures (Type 3 Forms - spec §46) */}
                <Route path="/disclosure/bu" element={
                  <PermissionGuard perms={['bu_disclosure:read']}>
                    <React.Suspense fallback={<div style={{ padding: 40, color: 'var(--text-secondary)' }}>Loading BU Disclosures...</div>}>
                      <BUDisclosure />
                    </React.Suspense>
                  </PermissionGuard>
                } />
                <Route path="/disclosure/subsidiary" element={
                  <PermissionGuard perms={['subsidiary_disclosure:read']}>
                    <React.Suspense fallback={<div style={{ padding: 40, color: 'var(--text-secondary)' }}>Loading Subsidiary Disclosures...</div>}>
                      <SubsidiaryDisclosure />
                    </React.Suspense>
                  </PermissionGuard>
                } />
                <Route path="/disclosure/group" element={
                  <PermissionGuard perms={['group_disclosure:read']}>
                    <React.Suspense fallback={<div style={{ padding: 40, color: 'var(--text-secondary)' }}>Loading Group Disclosures...</div>}>
                      <GroupDisclosure />
                    </React.Suspense>
                  </PermissionGuard>
                } />

                {/* Project Summary — Project users read-model (spec §19, §50) */}
                <Route path="/project-summary" element={<ProjectSummary />} />

                {/* Projects — project list + detail + wizard */}
                <Route path="/projects" element={
                  <PermissionGuard perms={['org:read', 'form:submit', 'submission:read']}>
                    <Projects />
                  </PermissionGuard>
                } />
                <Route path="/projects/new" element={
                  <PermissionGuard perms={['org:read']}>
                    <ProjectWizard />
                  </PermissionGuard>
                } />
                <Route path="/projects/:projectId" element={
                  <PermissionGuard perms={['org:read', 'form:submit', 'submission:read']}>
                    <ProjectDetail />
                  </PermissionGuard>
                } />

                {/* Data Quality */}
                <Route path="/data-quality" element={
                  <PermissionGuard perms={['submission:read', 'consolidation:read']}>
                    <DataQuality />
                  </PermissionGuard>
                } />

                {/* Audit Log & Trash */}
                <Route path="/audit" element={
                  <PermissionGuard perms={['user:manage', 'org:read']}>
                    <AuditLog />
                  </PermissionGuard>
                } />
                <Route path="/trash" element={
                  <PermissionGuard>
                    <Trash />
                  </PermissionGuard>
                } />

                {/* SEBI Value Chain (75% Rule) */}
                <Route path="/valuechain" element={
                  <PermissionGuard perms={['report:read', 'consolidation:read', 'org:read']}>
                    <ValueChain />
                  </PermissionGuard>
                } />

                {/* Independent Reasonable Assurance & Audit */}
                <Route path="/assurance" element={
                  <PermissionGuard perms={['report:read', 'audit:read', 'assurance:write', 'user:manage']}>
                    <Assurance />
                  </PermissionGuard>
                } />

                {/* Background Task Pipelines */}
                <Route path="/admin/jobs" element={
                  <PermissionGuard perms={['user:manage', 'consolidation:read']}>
                    <BackgroundJobs />
                  </PermissionGuard>
                } />

                {/* Ask AAROHAN AI — visible when any AI permission exists */}
                <Route path="/aarohan" element={
                  <PermissionGuard perms={['ai:e1:use', 'ai:e2:use', 'ai:e3:use', 'ai:e4:use', 'ai:e5:use', 'ai:e6:use', 'ai:e7:use']}>
                    <AarohanAI />
                  </PermissionGuard>
                } />

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
