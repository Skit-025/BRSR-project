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

// ── Global Error Interceptor ──
api.interceptors.response.use(
  (res) => res,
  (err) => {
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
    api.get(`/org/applicability/${nodeId}/${periodId}`),
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
  upload: (formData) =>
    api.post('/evidence/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getDownloadUrl: (id) => `${API_BASE}/evidence/${id}/download`,
  getViewUrl: (id) => `${API_BASE}/evidence/${id}/view`,
  delete: (id, password) => api.delete(`/evidence/${id}`, { data: { password } }),
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

// ─────────────────────────────────────────────────────────────────
// Calculation Engine & Lineage
// ─────────────────────────────────────────────────────────────────
export const calcApi = {
  getFormulas: () => api.get('/calc/formulas'),
  getFactors: () => api.get('/calc/factors'),
  calcScope1: (data) => api.post('/calc/scope1', data),
  calcScope2: (data) => api.post('/calc/scope2', data),
  calcEnergyIntensity: (data) => api.post('/calc/energy-intensity', data),
  calcSafetyLtifr: (data) => api.post('/calc/safety-ltifr', data),
  convertUnit: (params) => api.get('/calc/convert-unit', { params }),
};

export const lineageApi = {
  getLineage: (metricCode, periodId, entityId) => {
    let url = `/lineage/${encodeURIComponent(metricCode)}/${encodeURIComponent(periodId)}`;
    if (entityId) url += `?entity_id=${encodeURIComponent(entityId)}`;
    return api.get(url);
  },
};

