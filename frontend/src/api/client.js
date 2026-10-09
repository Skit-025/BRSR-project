import axios from 'axios';

// The backend FastAPI exposes API routes under /api/v1
export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 45_000,
});

// ── Auth Token Injection ──
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('brsr_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function getFriendlyErrorMessage(err, fallback = 'Unable to complete the operation. Please try again.') {
  if (!err) return fallback;
  if (typeof err === 'string') {
    if (/(traceback|noneType|sqlalchemy|psycopg|exception|syntaxerror|runtimeerror|unhandled|500|pydantic|keyerror|indexerror|uuid|algorithm|internal server error)/i.test(err)) {
      return 'The system encountered an issue while processing your request. Please try again.';
    }
    return err;
  }
  const status = err.response?.status;
  const rawDetail = err.response?.data?.detail;

  if (status === 404) {
    if (typeof rawDetail === 'string' && rawDetail.length < 80 && !/(traceback|noneType|sqlalchemy|psycopg|uuid)/i.test(rawDetail)) {
      return rawDetail;
    }
    return 'The requested record or resource was not found.';
  }
  if (status === 403) return 'You do not have permission to perform this action.';
  if (status === 401) return 'Your session has expired. Please log in again.';
  if (status === 429) return 'Service is currently busy. Please wait a few moments and try again.';
  if (status >= 500) return 'A temporary processing issue occurred on the server. Please try again in a moment.';

  if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
    return 'The request timed out. Please verify your connection and try again.';
  }
  if (!err.response && (err.message?.includes('Network Error') || err.code === 'ERR_NETWORK')) {
    return 'Network connection unavailable. Please check your internet connection.';
  }

  if (typeof rawDetail === 'string') {
    if (/(traceback|noneType|sqlalchemy|psycopg|exception|syntaxerror|runtimeerror|unhandled|500|pydantic|keyerror|indexerror|uuid|algorithm|internal server error)/i.test(rawDetail)) {
      return 'The system encountered an issue while processing your request. Please try again.';
    }
    return rawDetail;
  }
  return fallback;
}

// ── Global Error Interceptor ──
api.interceptors.response.use(
  (res) => res,
  (err) => {
    // Sanitize technical messages to protect implementation details
    const friendly = getFriendlyErrorMessage(err);
    err.friendlyMessage = friendly;
    if (err.response?.data && typeof err.response.data === 'object') {
      const raw = err.response.data.detail;
      if (typeof raw === 'string' && /(traceback|noneType|sqlalchemy|psycopg|exception|syntaxerror|runtimeerror|unhandled|500|pydantic|keyerror|indexerror|uuid|algorithm|internal server error)/i.test(raw)) {
        err.response.data.detail = friendly;
      }
    }
    // If unauthorized, clear token only on protected paths
    if (err.response?.status === 401 && !err.config?.url?.includes('/auth/login')) {
      console.warn('Authentication token expired or invalid.');
    }
    return Promise.reject(err);
  }
);

// ─────────────────────────────────────────────────────────────────
// Auth & Access Governance
// ─────────────────────────────────────────────────────────────────
export const authApi = {
  login: (creds) => api.post('/auth/login', creds),
  getMe: () => api.get('/auth/me'),
  bootstrapAdmin: (data) => api.post('/auth/bootstrap-system-admin', data),
  getAdminUsers: () => api.get('/auth/admin/users'),
  provisionUser: (data) => api.post('/auth/admin/users', data),
  updateUser: (id, data) => api.put(`/auth/admin/users/${id}`, data),
  verifyPassword: (adminPassword) =>
    api.post('/auth/admin/verify-password', { admin_password: adminPassword }),
  deleteUser: (id, adminPassword) =>
    api.post(`/auth/admin/users/${id}/delete`, { admin_password: adminPassword }),
  changePassword: (data) => api.post('/auth/change-password', data),
  // Hierarchical Admin Delegation
  getScopedUsers: () => api.get('/auth/admin/scoped-users'),
  inviteUser: (data) => api.post('/auth/admin/invite', data),
  getInvitations: () => api.get('/auth/admin/invitations'),
  resendInvitation: (id) => api.post(`/auth/admin/invitations/${id}/resend`),
  revokeInvitation: (id) => api.post(`/auth/admin/invitations/${id}/revoke`),
  deactivateUser: (id, reason) =>
    api.post(`/auth/admin/users/${id}/deactivate`, { reason, preserve_records: true }),
  getAdminAuditLog: (limit = 50) =>
    api.get('/auth/admin/audit-log', { params: { limit } }),
  // ── User Creation Requests (Subsidiary Admin → Group/System Admin Approval) ──
  submitUserRequest: (data) => api.post('/auth/admin/user-requests', data),
  listUserRequests: (status) =>
    api.get('/auth/admin/user-requests', status ? { params: { status_filter: status } } : {}),
  getUserRequest: (id) => api.get(`/auth/admin/user-requests/${id}`),
  approveUserRequest: (id) => api.post(`/auth/admin/user-requests/${id}/approve`),
  rejectUserRequest: (id, rejection_reason) =>
    api.post(`/auth/admin/user-requests/${id}/reject`, { rejection_reason }),
};


// ─────────────────────────────────────────────────────────────────
// Executive Dashboards & Data Quality
// ─────────────────────────────────────────────────────────────────
export const dashboardsApi = {
  getSummary: (periodId, entityId) => {
    const params = {};
    if (periodId) params.period_id = periodId;
    if (entityId) params.entity_id = entityId;
    return api.get('/dashboards/summary', { params });
  },
};

// ─────────────────────────────────────────────────────────────────
// Organization Hierarchy & Periods
// ─────────────────────────────────────────────────────────────────
export const orgApi = {
  getNodes: () => api.get('/org/nodes'),
  getNode: (id) => api.get(`/org/nodes/${id}`),
  createNode: (data) => api.post('/org/nodes', data),
  updateNode: (id, data) => api.put(`/org/nodes/${id}`, data),
  getPeriods: () => api.get('/org/periods'),
  createPeriod: (data) => api.post('/org/periods', data),
  updatePeriod: (id, data) => api.put(`/org/periods/${id}`, data),
  getApplicability: (nodeId, periodId) =>
    api.get(`/org/applicability/${nodeId}`, { params: periodId ? { period_id: periodId } : {} }),
};

// ─────────────────────────────────────────────────────────────────
// Metric Catalogue (F05)
// ─────────────────────────────────────────────────────────────────
export const metricsApi = {
  getMetrics: (params) => api.get('/metrics', { params }),
  getMetric: (code) => api.get(`/metrics/${code}`),
  createMetric: (data) => api.post('/metrics', data),
};

// ─────────────────────────────────────────────────────────────────
// Dynamic Digital Forms (40 Dimensions)
// ─────────────────────────────────────────────────────────────────
export const formsApi = {
  getMaster: (periodId) => api.get(`/forms/master?period_id=${encodeURIComponent(periodId)}`),
  getScoped: (periodId, entityId) => {
    let url = `/forms/scoped?period_id=${encodeURIComponent(periodId)}`;
    if (entityId) url += `&entity_id=${encodeURIComponent(entityId)}`;
    return api.get(url);
  },
  getTemplateDownloadUrl: (entityId, periodId) =>
    `${API_BASE}/forms/template/${encodeURIComponent(entityId)}/${encodeURIComponent(periodId)}`,
};

// ─────────────────────────────────────────────────────────────────
// Monthly Collection & Submissions
// ─────────────────────────────────────────────────────────────────
export const collectionApi = {
  getPack: (entityId, periodId) =>
    api.get(`/collection/pack/${encodeURIComponent(entityId)}/${encodeURIComponent(periodId)}`),
  savePack: (data) => api.post('/collection/save', data),
  submitPack: (submissionId) => api.post(`/collection/submit/${submissionId}`),
  uploadSpreadsheet: (entityId, periodId, formData) =>
    api.post(`/collection/upload-spreadsheet/${entityId}/${periodId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

// ─────────────────────────────────────────────────────────────────
// Evidence Vault (S3 & SHA-256)
// ─────────────────────────────────────────────────────────────────
export const evidenceApi = {
  list: () => api.get('/evidence'),
  get: (id) => api.get(`/evidence/${id}`),
  bySha: (sha256) => api.get(`/evidence/by-sha/${encodeURIComponent(sha256)}`),
  upload: (formData) =>
    api.post('/evidence/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getDownloadUrl: (id) => `${API_BASE}/evidence/${id}/download`,
  getViewUrl: (id) => `${API_BASE}/evidence/${id}/view`,
  delete: (id, password, reason) => api.delete(`/evidence/${id}`, { data: { password, reason } }),
  link: (data) => api.post('/evidence/link', data),
  extract: (id, docTypeHint) =>
    api.post(`/evidence/${id}/extract`, null, {
      params: docTypeHint ? { doc_type_hint: docTypeHint } : {},
    }),
};

// ─────────────────────────────────────────────────────────────────
// Four-Eyes Workflow & Approvals
// ─────────────────────────────────────────────────────────────────
export const workflowApi = {
  getQueue: () => api.get('/workflow/queue'),
  review: (submissionId, data) => api.post(`/workflow/review/${submissionId}`, data),
  lockPeriod: (periodId) => api.post(`/workflow/lock-period/${periodId}`),
};

// ─────────────────────────────────────────────────────────────────
// Multi-Tier Consolidation
// ─────────────────────────────────────────────────────────────────
export const consolidationApi = {
  run: (data) => api.post('/consolidation/run', data),
  getStatus: () => api.get('/consolidation/status'),
  getFigures: (entityId, periodId) =>
    api.get(`/consolidation/${encodeURIComponent(entityId)}/${encodeURIComponent(periodId)}`),
  getBuDrilldown: (buId, periodId) =>
    api.get(`/consolidation/bu-drilldown/${encodeURIComponent(buId)}/${encodeURIComponent(periodId)}`),
};

// ─────────────────────────────────────────────────────────────────
// SEBI Reports & Export
// ─────────────────────────────────────────────────────────────────
export const reportingApi = {
  getBrsr: (entityId, periodId) =>
    api.get(`/reports/brsr/${encodeURIComponent(entityId)}/${encodeURIComponent(periodId)}`),
  getBrsrCore: (entityId, periodId) =>
    api.get(`/reports/brsr-core/${encodeURIComponent(entityId)}/${encodeURIComponent(periodId)}`),
  listReports: (entityId, periodId) => {
    const params = {};
    if (entityId) params.entity_id = entityId;
    if (periodId) params.period_id = periodId;
    return api.get('/reports', { params });
  },
  compileReport: (data) => api.post('/reports/compile', data),
  getExportHtmlUrl: (entityId, periodId) =>
    `${API_BASE}/reports/export/html/${encodeURIComponent(entityId)}/${encodeURIComponent(periodId)}`,
  getExportPdfUrl: (reportId) =>
    `${API_BASE}/reports/export/pdf/${encodeURIComponent(reportId)}`,
};

// ─────────────────────────────────────────────────────────────────
// 7 AI Engines (Evidence, Anomaly, RAG, Policy, Narrative, etc.)
// ─────────────────────────────────────────────────────────────────
export const aiApi = {
  extractEvidence: (data) => api.post('/ai/extract', data),
  checkAnomaly: (data) => api.post('/ai/anomaly-check', data),
  explainField: (data) => api.post('/ai/explain-field', data),
  checkPolicy: (data) => api.post('/ai/check-policy', data),
  draftNarrative: (data) => api.post('/ai/draft-narrative', data),
  estimateValueChain: (data) => api.post('/ai/estimate-valuechain', data),
  explainNumber: (data) => api.post('/ai/explain-number', data),
  submitDecision: (runId, data) => api.post(`/ai/runs/${runId}/decision`, data),
};

export const aarohanApi = {
  listEngines: () => api.get('/aarohan/engines'),
  runEngine: (engine, data) => api.post(`/aarohan/run/${encodeURIComponent(engine)}`, data),
  listRuns: () => api.get('/aarohan/runs'),
  getRun: (runId) => api.get(`/aarohan/runs/${encodeURIComponent(runId)}`),
  submitDecision: (runId, data) => api.post(`/aarohan/runs/${encodeURIComponent(runId)}/decision`, data),
};

// ─────────────────────────────────────────────────────────────────
// Deterministic Calculation Engine
// ─────────────────────────────────────────────────────────────────
export const calcApi = {
  scope1: (data) => api.post('/calc/scope1', data),
  scope2: (data) => api.post('/calc/scope2', data),
  scope3: (data) => api.post('/calc/scope3', data),
  fuelCatalog: () => api.get('/calc/fuel-catalog'),
  scope3Catalog: () => api.get('/calc/scope3-catalog'),
  factors: () => api.get('/calc/factors'),
};

// ─────────────────────────────────────────────────────────────────
// In-App Notifications & Alerts (Spec §32)
// ─────────────────────────────────────────────────────────────────
export const notificationsApi = {
  listForUser: (userId, unreadOnly = false) =>
    api.get(`/notifications/user/${encodeURIComponent(userId)}`, {
      params: unreadOnly ? { unread_only: true } : {},
    }),
  markRead: (notificationId) =>
    api.post(`/notifications/${encodeURIComponent(notificationId)}/read`),
  markAllRead: (userId) =>
    api.post(`/notifications/user/${encodeURIComponent(userId)}/mark-all-read`),
};

// ─────────────────────────────────────────────────────────────────
// Type 3 Org-Level Disclosures & Calc Pipeline (Spec §46, §48)
// ─────────────────────────────────────────────────────────────────
export const disclosuresApi = {
  getForLevel: (level, orgNodeId, periodId) =>
    api.get(`/disclosures/${level}/${orgNodeId}/${periodId}`),
  getSection: (level, orgNodeId, periodId, section) =>
    api.get(`/disclosures/section/${level}/${orgNodeId}/${periodId}/${section}`),
  save: (data) => api.post('/disclosures/save', data),
  submit: (id) => api.post(`/disclosures/submit/${id}`),
  approve: (id) => api.post(`/disclosures/approve/${id}`),
  getPipelineStatus: (orgNodeId, periodId) =>
    api.get(`/disclosures/calc-pipeline/${orgNodeId}`, { params: periodId ? { period_id: periodId } : {} }),
  triggerPipeline: (data) => api.post('/disclosures/calc-pipeline/trigger', data),
};

// ─────────────────────────────────────────────────────────────────
// Immutable Audit Trail
// ─────────────────────────────────────────────────────────────────
export const auditApi = {
  getLogs: (params) => api.get('/audit/logs', { params }),
  verifyChain: () => api.get('/audit/verify-chain'),
  recordEvent: (data) => api.post('/audit/events', data),
};

// ─────────────────────────────────────────────────────────────────
// SEBI Value Chain Disclosures (Top 75% Boundary Rule)
// ─────────────────────────────────────────────────────────────────
export const valuechainApi = {
  listPartners: (inBoundaryOnly = false) =>
    api.get('/valuechain/partners', { params: inBoundaryOnly ? { in_boundary_only: true } : {} }),
  createPartner: (data) => api.post('/valuechain/partners', data),
  recordAssessment: (data) => api.post('/valuechain/assessments', data),
};

// ─────────────────────────────────────────────────────────────────
// Reasonable Assurance & Auditor Workpapers
// ─────────────────────────────────────────────────────────────────
export const assuranceApi = {
  listEngagements: (periodId) =>
    api.get('/assurance/engagements', { params: periodId ? { period_id: periodId } : {} }),
  createEngagement: (data) => api.post('/assurance/engagements', data),
  getEngagement: (id) => api.get(`/assurance/engagements/${id}`),
  logFinding: (data) => api.post('/assurance/findings', data),
  respondToFinding: (findingId, data) =>
    api.post(`/assurance/findings/${findingId}/respond`, data),
  runSampling: (data) => api.post('/assurance/sample', data),
  exportWorkpaper: (id) => api.get(`/assurance/engagements/${id}/workpaper`),
};

// ─────────────────────────────────────────────────────────────────
// Reporting Snapshots, Sealing & Restatements
// ─────────────────────────────────────────────────────────────────
export const snapshotsApi = {
  list: (params) => api.get('/snapshots/', { params }),
  get: (id) => api.get(`/snapshots/${id}`),
  create: (data) => api.post('/snapshots/', data),
  seal: (id, data) => api.post(`/snapshots/${id}/seal`, data),
  diff: (baseId, targetId) => api.get(`/snapshots/diff/${baseId}/${targetId}`),
  restate: (data) => api.post('/snapshots/restate', data),
};

// ─────────────────────────────────────────────────────────────────
// Validation Exception Management Desk
// ─────────────────────────────────────────────────────────────────
export const exceptionsApi = {
  list: (params) => api.get('/exceptions/', { params }),
  raise: (data) => api.post('/exceptions/', data),
  resolve: (id, data) => api.post(`/exceptions/${id}/resolve`, data),
};

// ─────────────────────────────────────────────────────────────────
// Background Jobs & Pipeline Monitoring
// ─────────────────────────────────────────────────────────────────
export const jobsApi = {
  list: (params) => api.get('/admin/jobs/', { params }),
  get: (id) => api.get(`/admin/jobs/${id}`),
};

// ─────────────────────────────────────────────────────────────────
// Deterministic Validation Engine
// ─────────────────────────────────────────────────────────────────
export const validationApi = {
  check: (submissionId) => api.post(`/validation/check/${encodeURIComponent(submissionId)}`),
  justify: (data) => api.post('/validation/justify', data),
};
