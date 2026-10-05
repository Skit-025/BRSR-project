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

// ── Auth & Users ──
export const useAdminUsers = (opts) =>
  useQuery({
    queryKey: ['admin-users'],
    queryFn: () => authApi.getAdminUsers().then(r => r.data),
    ...opts,
  });

// ── Dashboard & KPIs ──
export const useDashboardSummary = (periodId, entityId, opts) =>
  useQuery({
    queryKey: ['dashboard-summary', periodId, entityId],
    queryFn: () => dashboardsApi.getSummary(periodId, entityId).then(r => r.data),
    ...opts,
  });

// ── Org Hierarchy & Periods ──
export const useOrgNodes = (opts) =>
  useQuery({
    queryKey: ['org-nodes'],
    queryFn: () => orgApi.getNodes().then(r => r.data),
    ...opts,
  });

export const useOrgPeriods = (opts) =>
  useQuery({
    queryKey: ['org-periods'],
    queryFn: () => orgApi.getPeriods().then(r => r.data),
    ...opts,
  });

export const useApplicability = (nodeId, periodId, opts) =>
  useQuery({
    queryKey: ['applicability', nodeId, periodId],
    queryFn: () => orgApi.getApplicability(nodeId, periodId).then(r => r.data),
    enabled: !!nodeId && !!periodId,
    ...opts,
  });

// ── Metrics Catalogue ──
export const useMetricCatalogue = (params, opts) =>
  useQuery({
    queryKey: ['metrics-catalogue', params],
    queryFn: () => metricsApi.getMetrics(params).then(r => r.data),
    ...opts,
  });

// ── Dynamic Forms (40 Dimensions) ──
export const useMasterForm = (periodId, opts) =>
  useQuery({
    queryKey: ['master-form', periodId],
    queryFn: () => formsApi.getMaster(periodId).then(r => r.data),
    enabled: !!periodId,
    ...opts,
  });

export const useScopedForm = (periodId, entityId, opts) =>
  useQuery({
    queryKey: ['scoped-form', periodId, entityId],
    queryFn: () => formsApi.getScoped(periodId, entityId).then(r => r.data),
    enabled: !!periodId,
    ...opts,
  });

// ── Collection & Submissions ──
export const useSubmissionPack = (entityId, periodId, opts) =>
  useQuery({
    queryKey: ['submission-pack', entityId, periodId],
    queryFn: () => collectionApi.getPack(entityId, periodId).then(r => r.data),
    enabled: !!entityId && !!periodId,
    ...opts,
  });

// ── Evidence Vault ──
export const useEvidenceList = (opts) =>
  useQuery({
    queryKey: ['evidence-list'],
    queryFn: () => evidenceApi.list().then(r => r.data),
    ...opts,
  });

// ── Workflow Queue ──
export const useWorkflowQueue = (opts) =>
  useQuery({
    queryKey: ['workflow-queue'],
    queryFn: () => workflowApi.getQueue().then(r => r.data),
    ...opts,
  });

// ── Consolidation ──
export const useConsolidationFigures = (entityId, periodId, opts) =>
  useQuery({
    queryKey: ['consolidation-figures', entityId, periodId],
    queryFn: () => consolidationApi.getFigures(entityId, periodId).then(r => r.data),
    enabled: !!entityId && !!periodId,
    ...opts,
  });

export const useConsolidationStatus = (opts) =>
  useQuery({
    queryKey: ['consolidation-status'],
    queryFn: () => consolidationApi.getStatus().then(r => r.data),
    refetchInterval: (data) => {
      // Auto-poll while a run is in progress
      if (data?.current_run?.status === 'running') return 5000;
      return false;
    },
    ...opts,
  });

// ── Reporting ──
export const useBrsrReport = (entityId, periodId, opts) =>
  useQuery({
    queryKey: ['brsr-report', entityId, periodId],
    queryFn: () => reportingApi.getBrsr(entityId, periodId).then(r => r.data),
    enabled: !!entityId && !!periodId,
    ...opts,
  });

export const useReports = (entityId, periodId, opts) =>
  useQuery({
    queryKey: ['reports-list', entityId, periodId],
    queryFn: () => reportingApi.listReports(entityId, periodId).then(r => r.data),
    ...opts,
  });

// ── Mutations ──
export const useCreateNode = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (d) => orgApi.createNode(d),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['org-nodes'] }),
  });
};

export const useCreatePeriod = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (d) => orgApi.createPeriod(d),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['org-periods'] }),
  });
};

export const useSavePack = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (d) => collectionApi.savePack(d),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['submission-pack'] }),
  });
};

export const useSubmitPack = () => {
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
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => reportingApi.compileReport(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reports-list'] }),
  });
};

export const useProvisionUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => authApi.provisionUser(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });
};

export const useAiExplainField = () =>
  useMutation({ mutationFn: (data) => aiApi.explainField(data) });

export const useAiDraftNarrative = () =>
  useMutation({ mutationFn: (data) => aiApi.draftNarrative(data) });

export const useAiCheckPolicy = () =>
  useMutation({ mutationFn: (data) => aiApi.checkPolicy(data) });
