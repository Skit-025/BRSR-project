import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

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

  // If user is System Admin, default them to Dashboard or User Management
  return <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
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
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/admin/users" element={<UserManagement />} />
              <Route path="/org" element={<OrgHierarchy />} />
              <Route path="/metrics" element={<MetricCatalogue />} />
              <Route path="/collection" element={<DataEntry />} />
              <Route path="/evidence" element={<EvidenceVault />} />
              <Route path="/workflow" element={<Workflow />} />
              <Route path="/consolidation" element={<Consolidation />} />
              <Route path="/reporting" element={<Reporting />} />
            </Route>

            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
