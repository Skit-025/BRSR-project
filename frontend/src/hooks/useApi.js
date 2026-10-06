import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  authApi,
  dashboardsApi,
  orgApi,
  metricsApi,
  formsApi,
  collectionApi,
  evidenceApi,
  workflowApi,
  consolidationApi,
  reportingApi,
  aiApi
} from '../api/client';

// ── Mock API (only imported/used in Mock Mode) ───────────────────────────────
import * as MockApi from '../mock/useMockApi';

/** Returns true when the app is running in demo/mock mode */
function isMock() {
  return localStorage.getItem('brsr_mock_mode') === 'true';
}


// ── Auth & Users ──
export const useAdminUsers = (opts) => {
  if (isMock()) return MockApi.useMockAdminUsers();
  return useQuery({
    queryKey: ['admin-users'],
    queryFn: () => authApi.getAdminUsers().then(r => r.data),
    ...opts,
  });
};

export const useDashboardSummary = (periodId, entityId, opts) => {
  if (isMock()) return MockApi.useMockDashboardSummary(periodId, entityId);
  return useQuery({
    queryKey: ['dashboard-summary', periodId, entityId],
    queryFn: () => dashboardsApi.getSummary(periodId, entityId).then(r => r.data),
    enabled: Boolean(periodId && entityId),
    ...opts,
  });
};

// ── Org Hierarchy & Periods ──
export const useOrgNodes = (opts) => {
  if (isMock()) return MockApi.useMockOrgNodes();
  return useQuery({
    queryKey: ['org-nodes'],
    queryFn: () => orgApi.getNodes().then(r => r.data),
    ...opts,
  });
};

export const useOrgPeriods = (opts) => {
  if (isMock()) return MockApi.useMockOrgPeriods();
  return useQuery({
    queryKey: ['org-periods'],
    queryFn: () => orgApi.getPeriods().then(r => r.data),
    ...opts,
  });
};

export const useApplicability = (nodeId, periodId, opts) => {
  if (isMock()) return MockApi.useMockApplicability(nodeId, periodId);
  return useQuery({
    queryKey: ['applicability', nodeId, periodId],
    queryFn: () => orgApi.getApplicability(nodeId, periodId).then(r => r.data),
    enabled: !!nodeId && !!periodId,
    ...opts,
  });
};

// ── Metrics Catalogue ──
export const useMetricCatalogue = (params, opts) => {
  if (isMock()) return MockApi.useMockMetricCatalogue(params);
  return useQuery({
    queryKey: ['metrics-catalogue', params],
    queryFn: () => metricsApi.getMetrics(params).then(r => r.data),
    ...opts,
  });
};

// ── Dynamic Forms (40 Dimensions) ──
export const useMasterForm = (periodId, opts) => {
  if (isMock()) return MockApi.useMockMasterForm(periodId);
  return useQuery({
    queryKey: ['master-form', periodId],
    queryFn: () => formsApi.getMaster(periodId).then(r => r.data),
    enabled: !!periodId,
    ...opts,
  });
};

export const useScopedForm = (periodId, entityId, opts) => {
  if (isMock()) return MockApi.useMockScopedForm(periodId, entityId);
  return useQuery({
    queryKey: ['scoped-form', periodId, entityId],
    queryFn: () => formsApi.getScoped(periodId, entityId).then(r => r.data),
    enabled: !!periodId,
    ...opts,
  });
};

// ── Collection & Submissions ──
export const useSubmissionPack = (entityId, periodId, opts) => {
  if (isMock()) return MockApi.useMockSubmissionPack(entityId, periodId);
  return useQuery({
    queryKey: ['submission-pack', entityId, periodId],
    queryFn: () => collectionApi.getPack(entityId, periodId).then(r => r.data),
    enabled: !!entityId && !!periodId,
    ...opts,
  });
};

// ── Evidence Vault ──
export const useEvidenceList = (opts) => {
  if (isMock()) return MockApi.useMockEvidenceList();
  return useQuery({
    queryKey: ['evidence-list'],
    queryFn: () => evidenceApi.list().then(r => r.data),
    ...opts,
  });
};

// ── Workflow Queue ──
export const useWorkflowQueue = (opts) => {
  if (isMock()) return MockApi.useMockWorkflowQueue();
  return useQuery({
    queryKey: ['workflow-queue'],
    queryFn: () => workflowApi.getQueue().then(r => r.data),
    ...opts,
  });
};

// ── Consolidation ──
export const useConsolidationFigures = (entityId, periodId, opts) => {
  if (isMock()) return MockApi.useMockConsolidationFigures(entityId, periodId);
  return useQuery({
    queryKey: ['consolidation-figures', entityId, periodId],
    queryFn: () => consolidationApi.getFigures(entityId, periodId).then(r => r.data),
    enabled: !!entityId && !!periodId,
    ...opts,
  });
};

export const useConsolidationStatus = (opts) => {
  if (isMock()) return MockApi.useMockConsolidationStatus();
  return useQuery({
    queryKey: ['consolidation-status'],
    queryFn: () => consolidationApi.getStatus().then(r => r.data),
    refetchInterval: (data) => {
      // Auto-poll while a run is in progress
      if (data?.current_run?.status === 'running') return 5000;
      return false;
    },
    ...opts,
  });
};

// ── Reporting ──
export const useBrsrReport = (entityId, periodId, opts) => {
  if (isMock()) return MockApi.useMockBrsrReport(entityId, periodId);
  return useQuery({
    queryKey: ['brsr-report', entityId, periodId],
    queryFn: () => reportingApi.getBrsr(entityId, periodId).then(r => r.data),
    enabled: !!entityId && !!periodId,
    ...opts,
  });
};

export const useReports = (entityId, periodId, opts) => {
  if (isMock()) return MockApi.useMockReports(entityId, periodId);
  return useQuery({
    queryKey: ['reports-list', entityId, periodId],
    queryFn: () => reportingApi.listReports(entityId, periodId).then(r => r.data),
    ...opts,
  });
};

// ── Mutations ──
export const useCreateNode = () => {
  if (isMock()) return MockApi.useMockCreateNode();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (d) => orgApi.createNode(d),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['org-nodes'] }),
  });
};

export const useUpdateNode = () => {
  if (isMock()) return MockApi.useMockUpdateNode();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => orgApi.updateNode(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['org-nodes'] }),
  });
};

export const useCreatePeriod = () => {
  if (isMock()) return MockApi.useMockCreatePeriod();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (d) => orgApi.createPeriod(d),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['org-periods'] }),
  });
};

export const useUpdatePeriod = () => {
  if (isMock()) return MockApi.useMockUpdatePeriod();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => orgApi.updatePeriod(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['org-periods'] }),
  });
};

export const useSavePack = () => {
  if (isMock()) return MockApi.useMockSavePack();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (d) => collectionApi.savePack(d),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['submission-pack'] }),
  });
};

export const useSubmitPack = () => {
  if (isMock()) return MockApi.useMockSubmitPack();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (submissionId) => collectionApi.submitPack(submissionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['submission-pack'] });
      qc.invalidateQueries({ queryKey: ['workflow-queue'] });
    },
  });
};

export const useReviewSubmission = () => {
  if (isMock()) return MockApi.useMockReviewSubmission();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ submissionId, data }) => workflowApi.review(submissionId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workflow-queue'] });
      qc.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });
};

export const useRunConsolidation = () => {
  if (isMock()) return MockApi.useMockRunConsolidation();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => consolidationApi.run(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['consolidation-figures'] });
      qc.invalidateQueries({ queryKey: ['consolidation-status'] });
      qc.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });
};

// Alias used by Consolidation.jsx
export const useConsolidationRun = useRunConsolidation;

export const useCompileReport = () => {
  if (isMock()) return MockApi.useMockCompileReport();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => reportingApi.compileReport(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reports-list'] }),
  });
};

export const useProvisionUser = () => {
  if (isMock()) return MockApi.useMockProvisionUser();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => authApi.provisionUser(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });
};

export const useAiExplainField = () => {
  if (isMock()) return MockApi.useMockAiExplainField();
  return useMutation({ mutationFn: (data) => aiApi.explainField(data) });
};

export const useAiDraftNarrative = () => {
  if (isMock()) return MockApi.useMockAiDraftNarrative();
  return useMutation({ mutationFn: (data) => aiApi.draftNarrative(data) });
};

export const useAiCheckPolicy = () => {
  if (isMock()) return MockApi.useMockAiCheckPolicy();
  return useMutation({ mutationFn: (data) => aiApi.checkPolicy(data) });
};

// ── Enterprise ESG Operating System Hooks ───────────────────────────────────
export const useProjects = () => {
  return MockApi.useMockProjects();
};

export const useSubsidiariesHealth = () => {
  return MockApi.useMockSubsidiariesHealth();
};

export const useActivityFeed = () => {
  return MockApi.useMockActivityFeed();
};

export const useCalculationLineage = () => {
  return MockApi.useMockCalculationLineage();
};

export const useCalculationPipeline = () => {
  return MockApi.useMockCalculationPipeline();
};

export const useDataQuality = () => {
  return MockApi.useMockDataQuality();
};

export const useParametersCatalog = () => {
  return MockApi.useMockParametersCatalog();
};

export const useTemplatesCatalog = () => {
  return MockApi.useMockTemplatesCatalog();
};

