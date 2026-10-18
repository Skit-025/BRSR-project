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
  aiApi,
  valuechainApi,
  assuranceApi,
  snapshotsApi,
  exceptionsApi,
  jobsApi,
  calcApi,
  auditApi,
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

export const useOrgPeriods = (params, opts) => {
  if (isMock()) return MockApi.useMockOrgPeriods();
  // Support legacy call signature: useOrgPeriods(opts) where opts is an object with non-array keys
  let _params = params, _opts = opts;
  if (params && typeof params === 'object' && !Array.isArray(params) && ('enabled' in params || 'staleTime' in params || 'refetchOnWindowFocus' in params)) {
    _params = undefined;
    _opts = params;
  }
  return useQuery({
    queryKey: ['org-periods', _params],
    queryFn: () => orgApi.getPeriods(_params).then(r => r.data),
    ..._opts,
  });
};

export const useOrgFY = (opts) => {
  return useQuery({
    queryKey: ['org-periods-fy'],
    queryFn: () => orgApi.getFY().then(r => r.data),
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

export const useDeleteNode = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, adminPassword, reason }) => orgApi.deleteNode(id, adminPassword, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['org-nodes'] });
      qc.invalidateQueries({ queryKey: ['org-trash'] });
      qc.invalidateQueries({ queryKey: ['evidence-trash'] });
    },
  });
};

export const useCreatePeriod = () => {
  if (isMock()) return MockApi.useMockCreatePeriod();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (d) => orgApi.createPeriod(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['org-periods'] });
      qc.invalidateQueries({ queryKey: ['org-periods-fy'] });
    },
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

export const useDeletePeriod = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => orgApi.deletePeriod(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['org-periods'] });
      qc.invalidateQueries({ queryKey: ['org-periods-fy'] });
    },
  });
};

export const useDeleteFY = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (financialYear) => orgApi.deleteFY(financialYear),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['org-periods'] });
      qc.invalidateQueries({ queryKey: ['org-periods-fy'] });
    },
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

// ── SEBI Value Chain Disclosures (75% Rule) ──
export const useValueChainPartners = (inBoundaryOnly = false, opts) => {
  return useQuery({
    queryKey: ['valuechain-partners', inBoundaryOnly],
    queryFn: () => valuechainApi.listPartners(inBoundaryOnly).then(r => r.data),
    ...opts,
  });
};

export const useCreatePartner = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => valuechainApi.createPartner(data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['valuechain-partners'] }),
  });
};

export const useRecordAssessment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => valuechainApi.recordAssessment(data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['valuechain-partners'] }),
  });
};

// ── Independent Reasonable Assurance & Audit ──
export const useAssuranceEngagements = (periodId, opts) => {
  return useQuery({
    queryKey: ['assurance-engagements', periodId],
    queryFn: () => assuranceApi.listEngagements(periodId).then(r => r.data),
    ...opts,
  });
};

export const useCreateEngagement = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => assuranceApi.createEngagement(data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assurance-engagements'] }),
  });
};

export const useEngagementDetails = (engagementId, opts) => {
  return useQuery({
    queryKey: ['assurance-engagement', engagementId],
    queryFn: () => assuranceApi.getEngagement(engagementId).then(r => r.data),
    enabled: Boolean(engagementId),
    ...opts,
  });
};

export const useLogFinding = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => assuranceApi.logFinding(data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assurance-engagement'] });
      qc.invalidateQueries({ queryKey: ['assurance-engagements'] });
    },
  });
};

export const useRespondFinding = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ findingId, response }) =>
      assuranceApi.respondToFinding(findingId, { management_response: response }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assurance-engagement'] });
    },
  });
};

export const useRunSampling = () => {
  return useMutation({
    mutationFn: (data) => assuranceApi.runSampling(data).then(r => r.data),
  });
};

// ── Reporting Snapshots, Sealing & Restatements ──
export const useSnapshots = (params, opts) => {
  return useQuery({
    queryKey: ['snapshots-list', params],
    queryFn: () => snapshotsApi.list(params).then(r => r.data),
    ...opts,
  });
};

export const useSnapshot = (id, opts) => {
  return useQuery({
    queryKey: ['snapshot', id],
    queryFn: () => snapshotsApi.get(id).then(r => r.data),
    enabled: Boolean(id),
    ...opts,
  });
};

export const useCreateSnapshot = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => snapshotsApi.create(data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['snapshots-list'] }),
  });
};

export const useSealSnapshot = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => snapshotsApi.seal(id, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['snapshots-list'] }),
  });
};

export const useSnapshotDiff = (baseId, targetId, opts) => {
  return useQuery({
    queryKey: ['snapshot-diff', baseId, targetId],
    queryFn: () => snapshotsApi.diff(baseId, targetId).then(r => r.data),
    enabled: Boolean(baseId && targetId),
    ...opts,
  });
};

export const useRestateSnapshot = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => snapshotsApi.restate(data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['snapshots-list'] }),
  });
};

// ── Validation Exceptions ──
export const useValidationExceptions = (params, opts) => {
  return useQuery({
    queryKey: ['validation-exceptions', params],
    queryFn: () => exceptionsApi.list(params).then(r => r.data),
    ...opts,
  });
};

export const useResolveException = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => exceptionsApi.resolve(id, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['validation-exceptions'] }),
  });
};

// ── Background Jobs Monitor ──
export const useBackgroundJobs = (params, opts) => {
  return useQuery({
    queryKey: ['background-jobs', params],
    queryFn: () => jobsApi.list(params).then(r => r.data),
    refetchInterval: 10_000,
    ...opts,
  });
};

// ── Dynamic Fuel Catalog ──
export const useFuelCatalog = (opts) => {
  return useQuery({
    queryKey: ['fuel-catalog'],
    queryFn: () => calcApi.fuelCatalog().then(r => r.data?.fuel_catalog || []),
    staleTime: 60 * 60 * 1000,
    ...opts,
  });
};

// ── Audit Log ──
export const useAuditLogs = (params, opts) => {
  return useQuery({
    queryKey: ['audit-logs', params],
    queryFn: () => auditApi.getLogs(params).then(r => r.data),
    ...opts,
  });
};

export const useVerifyAuditChain = () => {
  return useMutation({
    mutationFn: () => auditApi.verifyChain().then(r => r.data),
  });
};

// ── Project Submission (live status + data points for a project node) ──
export const useProjectSubmission = (entityId, periodId, opts) => {
  return useQuery({
    queryKey: ['project-submission', entityId, periodId],
    queryFn: () => collectionApi.getPack(entityId, periodId).then(r => r.data),
    enabled: !!entityId && !!periodId,
    ...opts,
  });
};
