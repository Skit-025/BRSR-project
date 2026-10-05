import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  orgApi, metricsApi, evidenceApi, workflowApi, consolidationApi, reportingApi
} from '../api/client';

// ── Org ──
export const useOrgNodes    = (opts) => useQuery({ queryKey: ['org-nodes'],   queryFn: () => orgApi.getNodes().then(r => r.data),   ...opts });
export const useOrgPeriods  = (opts) => useQuery({ queryKey: ['org-periods'], queryFn: () => orgApi.getPeriods().then(r => r.data), ...opts });
export const useApplicability = (nodeId, periodId, opts) =>
  useQuery({ queryKey: ['applicability', nodeId, periodId],
             queryFn: () => orgApi.getApplicability(nodeId, periodId).then(r => r.data),
             enabled: !!nodeId && !!periodId, ...opts });

// ── Metrics ──
export const useMetricCatalogue = (opts) =>
  useQuery({ queryKey: ['catalogue'], queryFn: () => metricsApi.getCatalogue().then(r => r.data), ...opts });

export const useSubmissions = (params, opts) =>
  useQuery({ queryKey: ['submissions', params],
             queryFn: () => metricsApi.getSubmissions(params).then(r => r.data), ...opts });

export const useFormSchema = (nodeId, periodId, opts) =>
  useQuery({ queryKey: ['form-schema', nodeId, periodId],
             queryFn: () => metricsApi.getFormSchema(nodeId, periodId).then(r => r.data),
             enabled: !!nodeId && !!periodId, ...opts });

// ── Evidence ──
export const useEvidenceList = (params, opts) =>
  useQuery({ queryKey: ['evidence', params],
             queryFn: () => evidenceApi.list(params).then(r => r.data), ...opts });

// ── Workflow ──
export const useWorkflowHistory = (submissionId, opts) =>
  useQuery({ queryKey: ['wf-history', submissionId],
             queryFn: () => workflowApi.getHistory(submissionId).then(r => r.data),
             enabled: !!submissionId, ...opts });

export const useValidationErrors = (submissionId, opts) =>
  useQuery({ queryKey: ['wf-errors', submissionId],
             queryFn: () => workflowApi.getErrors(submissionId).then(r => r.data),
             enabled: !!submissionId, ...opts });

// ── Consolidation ──
export const useConsolidationJobs = (opts) =>
  useQuery({ queryKey: ['consol-jobs'], queryFn: () => consolidationApi.getJobs().then(r => r.data), ...opts });

export const useConsolidationResult = (nodeId, periodId, opts) =>
  useQuery({ queryKey: ['consol-result', nodeId, periodId],
             queryFn: () => consolidationApi.getResult(nodeId, periodId).then(r => r.data),
             enabled: !!nodeId && !!periodId, ...opts });

// ── Reporting ──
export const useReports = (opts) =>
  useQuery({ queryKey: ['reports'], queryFn: () => reportingApi.getReports().then(r => r.data), ...opts });

// ── Mutations ──
export const useCreateNode = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (d) => orgApi.createNode(d), onSuccess: () => qc.invalidateQueries(['org-nodes']) });
};
export const useCreatePeriod = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (d) => orgApi.createPeriod(d), onSuccess: () => qc.invalidateQueries(['org-periods']) });
};
export const useCreateSubmission = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (d) => metricsApi.createSubmission(d), onSuccess: () => qc.invalidateQueries(['submissions']) });
};
export const useUploadEvidence = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (fd) => evidenceApi.upload(fd), onSuccess: () => qc.invalidateQueries(['evidence']) });
};
export const useRunConsolidation = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (d) => consolidationApi.run(d), onSuccess: () => qc.invalidateQueries(['consol-jobs', 'consol-result']) });
};
export const useCompileReport = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (d) => reportingApi.compile(d), onSuccess: () => qc.invalidateQueries(['reports']) });
};
