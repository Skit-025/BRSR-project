import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
});

// ── Auth token injection ──
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('brsr_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Global error handler ──
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('brsr_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ─────────────────────────────────────────────────────────────────
// Org / Hierarchy
// ─────────────────────────────────────────────────────────────────
export const orgApi = {
  getNodes:          ()           => api.get('/org/nodes'),
  getNode:           (id)         => api.get(`/org/nodes/${id}`),
  createNode:        (data)       => api.post('/org/nodes', data),
  updateNode:        (id, data)   => api.patch(`/org/nodes/${id}`, data),
  getPeriods:        ()           => api.get('/org/periods'),
  createPeriod:      (data)       => api.post('/org/periods', data),
  getApplicability:  (nodeId, periodId) =>
    api.get(`/org/applicability/${nodeId}/${periodId}`),
};

// ─────────────────────────────────────────────────────────────────
// Metrics / Collection
// ─────────────────────────────────────────────────────────────────
export const metricsApi = {
  getCatalogue:     ()           => api.get('/metrics/catalogue'),
  getMetric:        (id)         => api.get(`/metrics/catalogue/${id}`),
  getSubmissions:   (params)     => api.get('/metrics/submissions', { params }),
  getSubmission:    (id)         => api.get(`/metrics/submissions/${id}`),
  createSubmission: (data)       => api.post('/metrics/submissions', data),
  updateSubmission: (id, data)   => api.patch(`/metrics/submissions/${id}`, data),
  getFormSchema:    (nodeId, periodId) =>
    api.get(`/metrics/form-schema/${nodeId}/${periodId}`),
};

// ─────────────────────────────────────────────────────────────────
// Evidence
// ─────────────────────────────────────────────────────────────────
export const evidenceApi = {
  list:      (params) => api.get('/evidence/', { params }),
  get:       (id)     => api.get(`/evidence/${id}`),
  upload:    (formData) =>
    api.post('/evidence/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  verify:    (id)     => api.post(`/evidence/${id}/verify`),
  extract:   (id)     => api.post(`/evidence/${id}/extract`),
  delete:    (id)     => api.delete(`/evidence/${id}`),
};

// ─────────────────────────────────────────────────────────────────
// Validation / Workflow
// ─────────────────────────────────────────────────────────────────
export const workflowApi = {
  validate:    (submissionId) => api.post(`/workflow/validate/${submissionId}`),
  submit:      (submissionId) => api.post(`/workflow/submit/${submissionId}`),
  review:      (submissionId, data) =>
    api.post(`/workflow/review/${submissionId}`, data),
  getHistory:  (submissionId) =>
    api.get(`/workflow/history/${submissionId}`),
  lockPeriod:  (data) => api.post('/workflow/lock-period', data),
  getErrors:   (submissionId) =>
    api.get(`/workflow/errors/${submissionId}`),
};

// ─────────────────────────────────────────────────────────────────
// Consolidation
// ─────────────────────────────────────────────────────────────────
export const consolidationApi = {
  run:       (data)   => api.post('/consolidation/run', data),
  getResult: (nodeId, periodId) =>
    api.get(`/consolidation/result/${nodeId}/${periodId}`),
  getLineage: (id)    => api.get(`/consolidation/lineage/${id}`),
  getJobs:   ()       => api.get('/consolidation/jobs'),
};

// ─────────────────────────────────────────────────────────────────
// Reporting
// ─────────────────────────────────────────────────────────────────
export const reportingApi = {
  compile:    (data)  => api.post('/reporting/compile', data),
  getReports: ()      => api.get('/reporting/reports'),
  getReport:  (id)    => api.get(`/reporting/reports/${id}`),
  exportHtml: (id)    => api.get(`/reporting/export/html/${id}`, { responseType: 'blob' }),
  exportPdf:  (id)    => api.get(`/reporting/export/pdf/${id}`,  { responseType: 'blob' }),
  getSnapshot:(id)    => api.get(`/reporting/snapshot/${id}`),
};
