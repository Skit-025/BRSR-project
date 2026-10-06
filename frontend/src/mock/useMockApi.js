/**
 * ─────────────────────────────────────────────────────────────────────────────
 * MOCK API HOOKS
 * Drop-in replacements for every hook in useApi.js, served from mockData.js.
 * Only imported when mockMode === true; never used in live sessions.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MOCK_ORG_NODES,
  MOCK_PERIODS,
  MOCK_USERS,
  MOCK_DASHBOARD_SUMMARY,
  MOCK_METRICS,
  MOCK_SCOPED_FORM,
  MOCK_EVIDENCE,
  MOCK_WORKFLOW_QUEUE,
  MOCK_CONSOLIDATION_STATUS,
  MOCK_CONSOLIDATION_FIGURES,
  MOCK_BRSR_REPORT,
  MOCK_REPORTS_LIST,
} from './mockData';

// ── tiny helper: returns a resolved-query shape instantly ─────────────────────
function useMockQuery(queryKey, data) {
  return useQuery({
    queryKey,
    queryFn: () => Promise.resolve(data),
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

// ── Auth & Users ──────────────────────────────────────────────────────────────
export const useMockAdminUsers = () => useMockQuery(['admin-users'], MOCK_USERS);

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const useMockDashboardSummary = (_periodId, _entityId) =>
  useMockQuery(['dashboard-summary', 'mock', 'mock'], MOCK_DASHBOARD_SUMMARY);

// ── Org Hierarchy & Periods ───────────────────────────────────────────────────
export const useMockOrgNodes   = () => useMockQuery(['org-nodes'],   MOCK_ORG_NODES);
export const useMockOrgPeriods = () => useMockQuery(['org-periods'], MOCK_PERIODS);

export const useMockApplicability = (_nodeId, _periodId) =>
  useMockQuery(['applicability', 'mock', 'mock'], { applicable: true, sections: [] });

// ── Metric Catalogue ──────────────────────────────────────────────────────────
export const useMockMetricCatalogue = (_params) =>
  useMockQuery(['metrics-catalogue', 'mock'], MOCK_METRICS);

// ── Forms ─────────────────────────────────────────────────────────────────────
export const useMockMasterForm = (_periodId) =>
  useMockQuery(['master-form', 'mock'], MOCK_SCOPED_FORM);

export const useMockScopedForm = (_periodId, _entityId) =>
  useMockQuery(['scoped-form', 'mock', 'mock'], MOCK_SCOPED_FORM);

// ── Collection / Submission Pack ──────────────────────────────────────────────
export const useMockSubmissionPack = (_entityId, _periodId) =>
  useMockQuery(['submission-pack', 'mock', 'mock'], {
    ...MOCK_SCOPED_FORM,
    submission_id: 'mock-submission-001',
    status: 'DRAFT',
  });

// ── Evidence Vault ────────────────────────────────────────────────────────────
export const useMockEvidenceList = () => useMockQuery(['evidence-list'], MOCK_EVIDENCE);

// ── Workflow ──────────────────────────────────────────────────────────────────
export const useMockWorkflowQueue = () =>
  useMockQuery(['workflow-queue'], MOCK_WORKFLOW_QUEUE);

// ── Consolidation ─────────────────────────────────────────────────────────────
export const useMockConsolidationFigures = (_entityId, _periodId) =>
  useMockQuery(['consolidation-figures', 'mock', 'mock'], MOCK_CONSOLIDATION_FIGURES);

export const useMockConsolidationStatus = () =>
  useMockQuery(['consolidation-status'], MOCK_CONSOLIDATION_STATUS);

// ── Reporting ─────────────────────────────────────────────────────────────────
export const useMockBrsrReport = (_entityId, _periodId) =>
  useMockQuery(['brsr-report', 'mock', 'mock'], MOCK_BRSR_REPORT);

export const useMockReports = (_entityId, _periodId) =>
  useMockQuery(['reports-list', 'mock', 'mock'], MOCK_REPORTS_LIST);

// ── Mock Mutations (no-op in demo — show success toast, don't touch DB) ───────
const mockMutation = (label) => ({
  mutationFn: async (data) => {
    await new Promise((r) => setTimeout(r, 600)); // simulate latency
    console.info(`[MOCK] ${label}`, data);
    return { success: true, mock: true };
  },
});

export const useMockCreateNode     = () => { const qc = useQueryClient(); return useMutation({ ...mockMutation('createNode'),     onSuccess: () => qc.invalidateQueries({ queryKey: ['org-nodes'] }) }); };
export const useMockUpdateNode     = () => { const qc = useQueryClient(); return useMutation({ ...mockMutation('updateNode'),     onSuccess: () => qc.invalidateQueries({ queryKey: ['org-nodes'] }) }); };
export const useMockCreatePeriod   = () => { const qc = useQueryClient(); return useMutation({ ...mockMutation('createPeriod'),   onSuccess: () => qc.invalidateQueries({ queryKey: ['org-periods'] }) }); };
export const useMockUpdatePeriod   = () => { const qc = useQueryClient(); return useMutation({ ...mockMutation('updatePeriod'),   onSuccess: () => qc.invalidateQueries({ queryKey: ['org-periods'] }) }); };
export const useMockSavePack       = () => useMutation(mockMutation('savePack'));
export const useMockSubmitPack     = () => useMutation(mockMutation('submitPack'));
export const useMockReviewSubmission = () => useMutation(mockMutation('reviewSubmission'));
export const useMockRunConsolidation = () => useMutation(mockMutation('runConsolidation'));
export const useMockConsolidationRun = useMockRunConsolidation;
export const useMockCompileReport  = () => useMutation(mockMutation('compileReport'));
export const useMockProvisionUser  = () => useMutation(mockMutation('provisionUser'));
export const useMockAiExplainField   = () => useMutation({ mutationFn: async () => { await new Promise(r => setTimeout(r, 800)); return { explanation: 'This metric measures the total energy consumed across all operations, reported in Gigajoules (GJ). It includes electricity purchased from the grid, diesel generators, and any other fuel sources.' }; } });
export const useMockAiDraftNarrative = () => useMutation({ mutationFn: async () => { await new Promise(r => setTimeout(r, 1000)); return { narrative: 'Megha Engineering & Infrastructures Ltd (MEIL) demonstrated strong environmental stewardship in FY 2024-25, with total energy consumption of 348,250 GJ and renewable energy constituting 28.4% of total energy use. The Group recorded zero fatalities across its tunneling and irrigation projects, maintaining an LTIFR of 0.12, well below heavy infrastructure industry benchmarks.' }; } });
export const useMockAiCheckPolicy   = () => useMutation({ mutationFn: async () => { await new Promise(r => setTimeout(r, 800)); return { compliant: true, issues: [], suggestions: ['Consider expanding Scope 3 emissions disclosure in next reporting cycle.'] }; } });

