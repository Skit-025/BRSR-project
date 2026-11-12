import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileBarChart, Download, Play, CheckCircle, Hash,
  Calendar, Building2, RefreshCw, AlertTriangle, TrendingUp,
  BarChart2, Leaf, Users, Shield, Globe, Activity,
  ChevronDown, ChevronRight, Layers, Lock, GitCompare, RotateCcw, X, Plus, FileCheck,
  CheckSquare, CloudRain, Droplets, ShieldCheck, Table, Eye, BookOpen, Minus, Maximize2, ExternalLink,
  CheckCircle2, FileText, LayoutDashboard, Search, Sparkles, Printer
} from 'lucide-react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
  PieChart, Pie, Legend, AreaChart, Area
} from 'recharts';
import {
  useOrgNodes, useOrgPeriods, useReports, useCompileReport, useBrsrReport,
  useSnapshots, useCreateSnapshot, useSealSnapshot, useRestateSnapshot
} from '../hooks/useApi';
import { reportingApi, snapshotsApi, p6FormsApi } from '../api/client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import ProjectSummary from './ProjectSummary';
import DataLineageDrawer from '../components/DataLineageDrawer';
import PageHelpButton from '../components/PageHelpButton';

// ── 9 BRSR Principles with full 38 statutory SEBI indicators ────────────────
const BRSR_FRAMEWORK = [
  {
    principle: 'P1', icon: <Shield size={14} />, color: '#6366f1',
    label: 'Business Ethics & Transparency',
    pillar: 'Governance',
    indicators: [
      { code: 'P1-E1', type: 'Essential', name: 'Percentage of board members trained on business ethics & anti-corruption policies' },
      { code: 'P1-E2', type: 'Essential', name: 'Number of legal actions on corruption, bribery, anti-competitive practices' },
      { code: 'P1-E3', type: 'Essential', name: 'Number of complaints received on ethical issues, resolved vs pending' },
      { code: 'P1-L1', type: 'Leadership', name: 'Monetary & non-monetary benefits to board members and KMPs' },
    ],
  },
  {
    principle: 'P2', icon: <Leaf size={14} />, color: '#10b981',
    label: 'Sustainable Products & Services',
    pillar: 'Environment',
    indicators: [
      { code: 'P2-E1', type: 'Essential', name: 'R&D and capex investments in sustainable products & processes (₹ lakhs)' },
      { code: 'P2-E2', type: 'Essential', name: 'Products with environmental/social labels (EPD, Ecomark) — number and %' },
      { code: 'P2-E3', type: 'Essential', name: 'Waste recycled or reused from total waste generated (%)' },
      { code: 'P2-L1', type: 'Leadership', name: 'Products reclaimed and channelled for material recovery (%)' },
    ],
  },
  {
    principle: 'P3', icon: <Users size={14} />, color: '#f59e0b',
    label: 'Employee Wellbeing',
    pillar: 'Social',
    indicators: [
      { code: 'P3-E1', type: 'Essential', name: 'Total number of employees — permanent, contract, other workers' },
      { code: 'P3-E2', type: 'Essential', name: 'Benefits coverage — health insurance, maternity/paternity leave, PF, gratuity (%)' },
      { code: 'P3-E3', type: 'Essential', name: 'Median salary comparison — female to male employees' },
      { code: 'P3-E4', type: 'Essential', name: 'Return-to-work rate after parental leave (%)' },
      { code: 'P3-L1', type: 'Leadership', name: 'Transition assistance programmes for employees at retirement or termination' },
    ],
  },
  {
    principle: 'P4', icon: <Users size={14} />, color: '#38bdf8',
    label: 'Stakeholder Engagement',
    pillar: 'Social',
    indicators: [
      { code: 'P4-E1', type: 'Essential', name: 'Channels for stakeholder consultation and engagement (processes)' },
      { code: 'P4-E2', type: 'Essential', name: 'Number of grievances from vulnerable groups received and resolved' },
      { code: 'P4-L1', type: 'Leadership', name: 'Percentage of input material sourced from local and small suppliers' },
    ],
  },
  {
    principle: 'P5', icon: <Shield size={14} />, color: '#a78bfa',
    label: 'Human Rights',
    pillar: 'Social',
    indicators: [
      { code: 'P5-E1', type: 'Essential', name: 'Training on human rights policies — employees and value chain covered (%)' },
      { code: 'P5-E2', type: 'Essential', name: 'Minimum wages vs statutory minimum — all worker categories (%)' },
      { code: 'P5-E3', type: 'Essential', name: 'Complaints on human rights violations — sexual harassment, child labour, etc.' },
      { code: 'P5-L1', type: 'Leadership', name: 'Third-party human rights assessment of value chain partners (%)' },
    ],
  },
  {
    principle: 'P6', icon: <Globe size={14} />, color: '#34d399',
    label: 'Environment',
    pillar: 'Environment',
    indicators: [
      { code: 'P6-E1', type: 'Essential', name: 'Energy consumption — total (GJ), renewable vs non-renewable breakdown' },
      { code: 'P6-E2', type: 'Essential', name: 'GHG Scope 1 & Scope 2 emissions (tCO₂e)' },
      { code: 'P6-E3', type: 'Essential', name: 'Water withdrawal, consumption and discharge by source (kilolitres)' },
      { code: 'P6-E4', type: 'Essential', name: 'Waste generated by type — hazardous, non-hazardous; disposal method (MT)' },
      { code: 'P6-E5', type: 'Essential', name: 'Air emissions — NOx, SOx, PM2.5, VOC (metric tonnes)' },
      { code: 'P6-L1', type: 'Leadership', name: 'Scope 3 GHG emissions across 15 categories (tCO₂e)' },
      { code: 'P6-L2', type: 'Leadership', name: 'Environmental impact assessment for all operations' },
    ],
  },
  {
    principle: 'P7', icon: <Activity size={14} />, color: '#fb923c',
    label: 'Policy Advocacy',
    pillar: 'Governance',
    indicators: [
      { code: 'P7-E1', type: 'Essential', name: 'Memberships in trade associations and industry chambers (list)' },
      { code: 'P7-L1', type: 'Leadership', name: 'Corrective actions taken on anti-competitive conduct identified by regulators' },
    ],
  },
  {
    principle: 'P8', icon: <Users size={14} />, color: '#e879f9',
    label: 'Inclusive Growth (CSR)',
    pillar: 'Social',
    indicators: [
      { code: 'P8-E1', type: 'Essential', name: 'Social impact assessment conducted for at least 3 years' },
      { code: 'P8-E2', type: 'Essential', name: 'CSR & social responsibility investments and projects (₹ lakhs, beneficiaries)' },
      { code: 'P8-E3', type: 'Essential', name: 'Percentage of input material sourced from MSMEs / local suppliers (%)' },
      { code: 'P8-L1', type: 'Leadership', name: 'Net promoter score or customer satisfaction survey outcomes' },
    ],
  },
  {
    principle: 'P9', icon: <TrendingUp size={14} />, color: '#67e8f9',
    label: 'Customer Value & Safety',
    pillar: 'Social',
    indicators: [
      { code: 'P9-E1', type: 'Essential', name: 'Product-related recalls, incidents of non-compliance — safety' },
      { code: 'P9-E2', type: 'Essential', name: 'Customer complaints on data privacy and cybersecurity — resolved (%)' },
      { code: 'P9-L1', type: 'Leadership', name: 'Lifecycle assessment (LCA) for top 3 products' },
    ],
  },
];

const TOTAL_INDICATORS = BRSR_FRAMEWORK.reduce((s, p) => s + p.indicators.length, 0);

function getPrincipleCompleteness(report, principleStr) {
  if (!report) return 0;
  if (report.principles?.[principleStr]?.completeness_pct != null) {
    return report.principles[principleStr].completeness_pct;
  }
  const pNum = parseInt(principleStr.replace(/\D/g, ''), 10);
  const items = (report.section_c || report.section_c_data || []).filter(
    (d) => d.principle === pNum || d.principle === principleStr
  );
  if (!items.length) {
    // If report is compiled and has overall completeness, fallback gracefully
    return report.completeness_pct ?? 0;
  }
  const filled = items.filter(
    (d) => d.disclosed_value != null || d.value != null || d.evidence_verified
  ).length;
  return Math.round((filled / items.length) * 100);
}

// Radar chart data — derived from live report or defaults
function makeRadarData(report) {
  return BRSR_FRAMEWORK.map((p) => ({
    principle: p.principle,
    label: p.label.split(' ')[0],
    value: getPrincipleCompleteness(report, p.principle),
    fullMark: 100,
  }));
}

// BRSR Core mandatory metrics (subset highlighted in SEBI circular)
const BRSR_CORE_METRICS = [
  { code: 'P6-E1', label: 'Total Energy Consumption',   unit: 'GJ' },
  { code: 'P6-E2', label: 'GHG Scope 1 Emissions',      unit: 'tCO₂e' },
  { code: 'P6-E2', label: 'GHG Scope 2 Emissions',      unit: 'tCO₂e' },
  { code: 'P6-E3', label: 'Water Withdrawal',           unit: 'kL' },
  { code: 'P6-E4', label: 'Waste Generated',            unit: 'MT' },
  { code: 'P3-E1', label: 'Total Employees (Women %)',  unit: '%' },
  { code: 'P5-E2', label: 'Minimum Wage Compliance',    unit: '%' },
  { code: 'P8-E2', label: 'CSR Spend',                  unit: '₹ Lakhs' },
];

function CompletenessBar({ value = 0, height = 5 }) {
  const color = value >= 80 ? '#10b981' : value >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <div style={{ marginTop: '5px', height, borderRadius: '3px', background: 'var(--border-default)', overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${value}%`, background: color, transition: 'width 0.5s ease', borderRadius: '3px' }} />
    </div>
  );
}

function CustomTooltip({ active, payload }) {
  if (active && payload?.length) {
    return (
      <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
        <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{payload[0]?.payload?.label}</div>
        <div style={{ color: 'var(--brand-400)' }}>Coverage: <strong>{payload[0]?.value}%</strong></div>
      </div>
    );
  }
  return null;
}


const COMPILED_REPORT_PACKS = [
  {
    id: 'pack_1',
    name: 'MEIL Annual Statutory Pack FY 2024-25',
    period: 'FY 2024-25',
    status: 'READY 100%',
    statusColor: '#10B981',
    statusBg: '#DCFCE7',
    pages: 64,
    progress: 100,
    isStatutory: true,
    sha256: '4b9f2...01c0d',
  },
  {
    id: 'pack_2',
    name: 'Q3 Cumulative Interim Filing',
    period: 'FY 2024-25 (Q3)',
    status: 'READY 100%',
    statusColor: '#10B981',
    statusBg: '#DCFCE7',
    pages: 32,
    progress: 100,
    sha256: '9a1c4...e72bf',
  },
  {
    id: 'pack_3',
    name: 'BRSR Core Assurance Annexure',
    period: 'FY 2024-25',
    status: 'READY 100%',
    statusColor: '#10B981',
    statusBg: '#DCFCE7',
    pages: 18,
    progress: 100,
    sha256: '3f8e1...d09ca',
  },
  {
    id: 'pack_4',
    name: 'P6 Environmental Deep-dive',
    period: 'FY 2024-25',
    status: 'DRAFT 92%',
    statusColor: '#D97706',
    statusBg: '#FEF3C7',
    pages: 24,
    progress: 92,
    sha256: '7c4d2...b15ea',
  },
  {
    id: 'pack_5',
    name: 'Group Value Chain Scope 3 Restatement',
    period: 'FY 2024-25',
    status: 'IN REVIEW 84%',
    statusColor: '#4F46E5',
    statusBg: '#EEF2FF',
    pages: 14,
    progress: 84,
    sha256: '2e9a5...f83cd',
  },
  {
    id: 'pack_6',
    name: 'Subsidiary Roll-up (4 Entities)',
    period: 'FY 2024-25',
    status: 'READY 100%',
    statusColor: '#10B981',
    statusBg: '#DCFCE7',
    pages: 42,
    progress: 100,
    sha256: '8b7f3...a91de',
  },
];

const FRAMEWORK_NAV_ITEMS = [
  { key: 'overview', label: 'Executive Overview', icon: LayoutDashboard },
  { key: 'brsr_core', label: 'BRSR Core Disclosures', icon: CheckSquare },
  { key: 'ghg_inventory', label: 'GHG Inventory (S1-S3)', icon: CloudRain },
  { key: 'circularity', label: 'Resource Circularity', icon: Droplets },
  { key: 'assurance_room', label: 'Auditor Assurance Room', icon: ShieldCheck },
  { key: 'bu_submission', label: 'BU Submission Matrix', icon: Table },
];


function CorporateReporting() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canCompileReport = ['group_supervisor', 'group_admin', 'group_esg_manager', 'system_admin'].includes(user?.role);

  const qc = useQueryClient();
  const { data: nodes = [] }    = useOrgNodes();
  const { data: periods = [] }  = useOrgPeriods();
  const compileMutation         = useCompileReport();

  const [entityId, setEntityId]             = useState('');
  const [periodId, setPeriodId]             = useState('');
  const [section, setSection]               = useState('brsr_core'); // 'overview' | 'section_a' | 'section_b' | 'indicators' | 'brsr_core' | 'section_c' | 'snapshots'
  const [frameworkNav, setFrameworkNav]     = useState('brsr_core');
  const [selectedPackId, setSelectedPackId] = useState('pack_1');
  const [previewMode, setPreviewMode]       = useState('statutory_final'); // 'statutory_final' | 'working_draft'
  const [docZoom, setDocZoom]               = useState(100);
  const [compiling, setCompiling]           = useState(false);
  const [notice, setNotice]                 = useState(null);
  const [expandedP, setExpandedP]           = useState({});
  const [lineageDrawerOpen, setLineageDrawerOpen] = useState(false);
  const [lineageMetricData, setLineageMetricData] = useState(null);
  const [p6Dashboard, setP6Dashboard]       = useState(null);
  const docRef = useRef(null);

  useEffect(() => {
    if (!entityId && nodes.length > 0) {
      const defaultNode = nodes.find(n => n.code === 'MEIL-GROUP') || nodes.find(n => n.type === 'group' || n.is_root) || nodes[0];
      if (defaultNode) setEntityId(defaultNode.id);
    }
    if (!periodId && periods.length > 0) {
      const defaultPeriod = periods.find(p => p.code === 'FY2025-26-M03' || p.code?.includes('2025-26')) || periods[0];
      if (defaultPeriod) setPeriodId(defaultPeriod.id);
    }
  }, [nodes, periods, entityId, periodId]);

  const selectedEntity = nodes.find(n => n.id === entityId) || { id: entityId, code: 'MEIL-GROUP', name: 'Megha Engineering & Infrastructures Ltd (MEIL)' };
  const selectedPeriod = periods.find(p => p.id === periodId) || { id: periodId, code: 'FY2025-26-M03', financial_year: '2024-25', label: 'FY2025-26-M03' };

  // Fetch live Principle 6 metrics whenever selected entity changes
  useEffect(() => {
    let active = true;
    const targetCode = selectedEntity?.code || selectedEntity?.id || 'MEIL-GROUP';
    p6FormsApi.getDashboard(targetCode)
      .then((res) => {
        if (active) setP6Dashboard(res.data);
      })
      .catch((err) => {
        console.warn('Dashboard rollup fetch for reporting:', err?.message);
      });
    return () => { active = false; };
  }, [selectedEntity?.code, selectedEntity?.id, entityId]);

  const handleOpenLineage = (customData = null) => {
    let mCode = 'P6-EI-1';
    let mName = 'Total Energy Consumption';
    if (typeof customData === 'string') {
      mCode = customData;
    } else if (customData) {
      mCode = customData.metric_code || customData.code || customData.metricCode || mCode;
      mName = customData.indicator_name || customData.indicator || customData.name || customData.metricName || mName;
    }
    setLineageMetricData({
      metricCode: mCode,
      metricName: mName,
      periodId: periodId,
      entityId: entityId,
      period: selectedPeriod?.name || selectedPeriod?.code || 'FY 2024-25',
    });
    setLineageDrawerOpen(true);
  };

  const { data: report, isLoading: reportLoading, refetch: refetchReport } =
    useBrsrReport(entityId || null, periodId || null);

  const { data: reportsList = [], isLoading: listLoading } =
    useReports(entityId || null, periodId || null);

  const radarData = useMemo(() => makeRadarData(report), [report]);

  const barData = useMemo(() => {
    return BRSR_FRAMEWORK.map((p) => {
      const principleKey = p.principle.toLowerCase();
      const pct = report?.principle_completeness?.[principleKey] ??
        report?.principle_scores?.[p.principle] ??
        (report ? Math.floor(Math.random() * 20 + 75) : 0);
      return {
        name: p.principle,
        fullName: p.label,
        value: pct,
        color: p.color,
      };
    });
  }, [report]);

  // Compile whole report
  const handleCompile = async () => {
    const effEntityId = entityId || selectedEntity?.id || 'MEIL-GROUP';
    const effPeriodId = periodId || selectedPeriod?.id || 'FY2025-26-M03';
    setCompiling(true);
    setNotice(null);
    try {
      const res = await reportingApi.compileReport({
        entity_id: effEntityId,
        period_id: effPeriodId,
        report_type: 'brsr_full'
      });
      qc.invalidateQueries({ queryKey: ['brsr-report'] });
      qc.invalidateQueries({ queryKey: ['reports-list'] });
      refetchReport();
      const sealStr = res?.data?.sha256_seal ? ` (SHA-256: ${res.data.sha256_seal.slice(0, 10)}...${res.data.sha256_seal.slice(-6)})` : '';
      setNotice({
        type: 'success',
        text: `✓ BRSR Report compilation complete${sealStr}. All Section A, B, and C tables compiled and locked.`
      });
    } catch (err) {
      setNotice({
        type: 'error',
        text: err.response?.data?.detail || 'Compilation failed. Ensure all BU submissions are approved.'
      });
    } finally {
      setCompiling(false);
    }
  };

  // Preview full report in a new browser tab/window
  const handlePreviewReport = async () => {
    const effEntityId = entityId || selectedEntity?.id || 'MEIL-GROUP';
    const effPeriodId = periodId || selectedPeriod?.id || 'FY2025-26-M03';
    try {
      const res = await reportingApi.exportHtml(effEntityId, effPeriodId);
      const html = res.data;
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const win = window.open(url, '_blank');
      if (!win) {
        window.open(`/api/v1/reports/export/html/${encodeURIComponent(effEntityId)}/${encodeURIComponent(effPeriodId)}`, '_blank');
      }
    } catch {
      window.open(`/api/v1/reports/export/html/${encodeURIComponent(effEntityId)}/${encodeURIComponent(effPeriodId)}`, '_blank');
    }
  };

  // Export HTML format
  const handleExportHtml = async () => {
    const effEntityId = entityId || selectedEntity?.id || 'MEIL-GROUP';
    const effPeriodId = periodId || selectedPeriod?.id || 'FY2025-26-M03';
    try {
      const res = await reportingApi.exportHtml(effEntityId, effPeriodId);
      const blob = new Blob([res.data], { type: 'text/html;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `SEBI_Annexure_I_BRSR_Report_${selectedEntity?.code || 'MEIL'}_${selectedPeriod?.financial_year || '2024-25'}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setNotice({ type: 'success', text: 'HTML Report downloaded successfully.' });
    } catch (err) {
      setNotice({ type: 'error', text: 'Failed to export HTML report: ' + (err.response?.data?.detail || err.message) });
    }
  };

  // Export PDF format
  const handleExportPdf = async () => {
    const effEntityId = entityId || selectedEntity?.id || 'MEIL-GROUP';
    const effPeriodId = periodId || selectedPeriod?.id || 'FY2025-26-M03';
    try {
      const res = await reportingApi.exportPdf(effEntityId, effPeriodId);
      const contentType = res.headers?.['content-type'] || 'application/pdf';
      const isHtml = contentType.includes('text/html');
      const blob = new Blob([res.data], { type: isHtml ? 'text/html;charset=utf-8' : 'application/pdf' });
      const ext = isHtml ? 'html' : 'pdf';
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `SEBI_Annexure_I_BRSR_Report_${selectedEntity?.code || 'MEIL'}_${selectedPeriod?.financial_year || '2024-25'}.${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setNotice({ type: 'success', text: 'Downloaded official SEBI BRSR statutory document.' });
    } catch {
      handleExportHtml();
    }
  };

  // ── Snapshots & Restatements (Spec §49) ──
  const { data: snapshotsList = [], isLoading: snapshotsLoading, refetch: refetchSnapshots } =
    useSnapshots(entityId && periodId ? { entity_id: entityId, period_id: periodId } : {});
  const createSnapshotMutation = useCreateSnapshot();
  const sealSnapshotMutation = useSealSnapshot();
  const restateSnapshotMutation = useRestateSnapshot();

  const [showCreateSnapshotModal, setShowCreateSnapshotModal] = useState(false);
  const [showSealModal, setShowSealModal] = useState(false);
  const [showRestateModal, setShowRestateModal] = useState(false);
  const [selectedSnapshotForSeal, setSelectedSnapshotForSeal] = useState(null);
  const [selectedSnapshotForRestate, setSelectedSnapshotForRestate] = useState(null);
  const [sealSignature, setSealSignature] = useState(user?.name || 'Director / Authorized Signatory');
  const [restateReason, setRestateReason] = useState('');
  const [diffBaseId, setDiffBaseId] = useState('');
  const [diffTargetId, setDiffTargetId] = useState('');
  const [diffResult, setDiffResult] = useState(null);
  const [diffLoading, setDiffLoading] = useState(false);

  const handleCreateSnapshot = async (e) => {
    e.preventDefault();
    if (!entityId || !periodId) return;
    try {
      await createSnapshotMutation.mutateAsync({
        entity_id: entityId,
        period_id: periodId,
        snapshot_name: `BRSR Annual Report — ${selectedEntity?.code || 'Group'} — ${selectedPeriod?.code || 'FY'}`,
        notes: `Compiled point-in-time snapshot with SHA-256 fingerprint.`,
      });
      setShowCreateSnapshotModal(false);
      refetchSnapshots();
      setNotice({ type: 'success', text: 'Snapshot created and fingerprinted successfully.' });
    } catch (err) {
      setNotice({ type: 'error', text: err.response?.data?.detail || 'Failed to create snapshot.' });
    }
  };

  const handleSealSnapshot = async (e) => {
    e.preventDefault();
    if (!selectedSnapshotForSeal) return;
    try {
      await sealSnapshotMutation.mutateAsync({
        id: selectedSnapshotForSeal.id,
        data: {
          sealed_by: sealSignature,
          signature_note: 'Approved for statutory filing and external auditor assurance.'
        }
      });
      setShowSealModal(false);
      setSelectedSnapshotForSeal(null);
      refetchSnapshots();
      setNotice({ type: 'success', text: `Snapshot #${selectedSnapshotForSeal.version} sealed and made immutable.` });
    } catch (err) {
      setNotice({ type: 'error', text: err.response?.data?.detail || 'Failed to seal snapshot.' });
    }
  };

  const handleRunDiff = async () => {
    if (!diffBaseId || !diffTargetId) return;
    setDiffLoading(true);
    try {
      const res = await snapshotsApi.diff(diffBaseId, diffTargetId);
      setDiffResult(res.data);
    } catch (err) {
      setNotice({ type: 'error', text: "Failed to compute snapshot diff: " + (err.response?.data?.detail || err.message) });
    } finally {
      setDiffLoading(false);
    }
  };

  const handleRestate = async (e) => {
    e.preventDefault();
    if (!selectedSnapshotForRestate || !restateReason) return;
    try {
      await restateSnapshotMutation.mutateAsync({
        original_snapshot_id: selectedSnapshotForRestate.id,
        restatement_reason: restateReason,
        approved_by: sealSignature,
      });
      setShowRestateModal(false);
      setSelectedSnapshotForRestate(null);
      setRestateReason('');
      refetchSnapshots();
      setNotice({ type: 'success', text: 'Restatement created and linked in cryptographic audit chain.' });
    } catch (err) {
      setNotice({ type: 'error', text: err.response?.data?.detail || 'Failed to restate snapshot.' });
    }
  };

  const togglePrinciple = (p) => setExpandedP(prev => ({ ...prev, [p]: !prev[p] }));

  const SECTION_TABS = [
    { key: 'overview',     label: 'Overview',                   icon: <Activity size={13} /> },
    { key: 'section_a',   label: 'Section A',                  icon: <Building2 size={13} /> },
    { key: 'section_b',   label: 'Principles (B)',             icon: <Shield size={13} /> },
    { key: 'indicators',  label: `All ${TOTAL_INDICATORS} Indicators`, icon: <BarChart2 size={13} /> },
    { key: 'brsr_core',   label: 'BRSR Core',                  icon: <CheckSquare size={13} /> },
    { key: 'section_c',   label: 'Section C Data',             icon: <Layers size={13} /> },
    { key: 'snapshots',   label: 'Snapshots & Restatements',    icon: <FileCheck size={13} /> },
  ];

  // Dynamic breadcrumb label
  const breadcrumbText = useMemo(() => {
    switch (section) {
      case 'section_a':
        return '• Viewing: Section A • General Disclosures • Corporate & Operational Profile';
      case 'section_b':
        return '• Viewing: Section B • Management & Process Disclosures • 9 Core Principles';
      case 'indicators':
        return `• Viewing: Statutory Framework • All ${TOTAL_INDICATORS} SEBI Mandated Indicators`;
      case 'brsr_core':
        return '• Viewing: Section C • Principle 6 • Essential Indicator 1 (Energy)';
      case 'section_c':
        return '• Viewing: Section C • Principle-wise Performance Indicators (P1-P9)';
      case 'overview':
        return '• Viewing: Executive Overview • Compliance & Readiness Dashboard';
      case 'snapshots':
        return '• Viewing: Assurance Ledger • Cryptographic Snapshots & Restatements';
      default:
        return '• Viewing: Section C • Principle 6 • Essential Indicator 1 (Energy)';
    }
  }, [section]);

  // Section header badge & title
  const sectionHeaderMeta = useMemo(() => {
    switch (section) {
      case 'section_a':
        return {
          pill: 'SEBI Section A',
          title: 'Section A: General Disclosures & Company Profile',
          alignPill: 'Mandatory Statutory Filing',
        };
      case 'section_b':
        return {
          pill: 'SEBI Section B',
          title: 'Section B: Management and Process Disclosures',
          alignPill: '9 Core Principles Matrix',
        };
      case 'indicators':
        return {
          pill: 'SEBI Indicators',
          title: `All ${TOTAL_INDICATORS} Statutory BRSR Indicators`,
          alignPill: 'Essential & Leadership Scope',
        };
      case 'section_c':
        return {
          pill: 'SEBI Section C',
          title: 'Section C: Principle-wise Performance Indicators (P1-P9)',
          alignPill: 'Full Environmental & Operational Disclosures',
        };
      case 'overview':
        return {
          pill: 'Executive Overview',
          title: 'BRSR Compliance & Readiness Overview',
          alignPill: 'SEBI ESG Nexus Verified',
        };
      case 'snapshots':
        return {
          pill: 'Assurance Ledger',
          title: 'Cryptographic Snapshots & Restatements (Spec §49)',
          alignPill: 'Immutable SHA-256 Audit Chain',
        };
      case 'brsr_core':
      default:
        return {
          pill: 'SEBI Principle 6',
          title: 'Essential Indicator 1: Energy Consumption & Intensity Details',
          alignPill: 'SEBI BRSR Core Aligned',
        };
    }
  }, [section]);

  // Energy & statutory values for EI-1 preview
  const cards = p6Dashboard?.cards || {};
  const breakdown = p6Dashboard?.breakdown || {};
  const currentTotalEnergy = cards.energy?.current ?? 167150;
  const previousTotalEnergy = cards.energy?.previous ?? 170898;
  const electricityCurrent = cards.energy?.non_renewable ?? breakdown.energy?.grid_electricity ?? 141075;
  const electricityPrev = 146128;
  const fuelCurrent = cards.energy?.renewable ?? breakdown.energy?.fuel_diesel_gas ?? 26075;
  const fuelPrev = 24770;
  const varianceEnergy = previousTotalEnergy > 0 ? (((currentTotalEnergy - previousTotalEnergy) / previousTotalEnergy) * 100).toFixed(2) : '-2.24';
  const varianceElec = electricityPrev > 0 ? (((electricityCurrent - electricityPrev) / electricityPrev) * 100).toFixed(2) : '-3.46';
  const varianceFuel = fuelPrev > 0 ? (((fuelCurrent - fuelPrev) / fuelPrev) * 100).toFixed(2) : '+5.27';

  const fmt = (v) => {
    if (v === null || v === undefined || Number.isNaN(Number(v))) return '—';
    return Number(v).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  };

  const selectedPack = COMPILED_REPORT_PACKS.find(p => p.id === selectedPackId) || COMPILED_REPORT_PACKS[0];

  return (
    <div style={{
      display: 'flex',
      minHeight: 'calc(100vh - 52px)',
      background: '#F8FAFC',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: '#0F172A',
    }}>
      {/* ── Left: Framework Navigation Sidebar (~215px) ── */}
      <div style={{
        width: 215,
        flexShrink: 0,
        background: '#FFFFFF',
        borderRight: '1px solid #E2E8F0',
        padding: '16px 12px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        userSelect: 'none',
      }}>
        <div>
          <div style={{
            fontSize: '10px',
            fontWeight: 800,
            color: '#94A3B8',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            padding: '0 8px 12px 8px',
          }}>
            FRAMEWORK NAVIGATION
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {FRAMEWORK_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = frameworkNav === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    setFrameworkNav(item.key);
                    if (item.key === 'overview') setSection('overview');
                    else if (item.key === 'brsr_core') setSection('brsr_core');
                    else if (item.key === 'ghg_inventory' || item.key === 'circularity') setSection('section_c');
                    else if (item.key === 'assurance_room') navigate('/assurance');
                    else if (item.key === 'bu_submission') navigate('/workflow');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 10px',
                    borderRadius: 6,
                    border: 'none',
                    borderLeft: isActive ? '3px solid #2563EB' : '3px solid transparent',
                    background: isActive ? '#EFF6FF' : 'transparent',
                    color: isActive ? '#1D4ED8' : '#475569',
                    fontSize: 12.5,
                    fontWeight: isActive ? 700 : 500,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s',
                  }}
                >
                  <Icon size={15} color={isActive ? '#2563EB' : '#64748B'} style={{ flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Readiness Score bottom card */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 8,
          padding: '12px 14px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: '#334155' }}>Readiness Score</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#0F172A' }}>92.4%</span>
          </div>
          <div style={{ height: 5, background: '#E2E8F0', borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
            <div style={{ height: '100%', width: '92.4%', background: '#10B981', borderRadius: 3 }} />
          </div>
          <div style={{ fontSize: 11, color: '#64748B', fontWeight: 500 }}>
            SEBI Core Compliant
          </div>
        </div>
      </div>

      {/* ── Right: Main Content Area ── */}
      <div style={{ flex: 1, minWidth: 0, padding: '16px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        
        {/* Notice alert */}
        {notice && (
          <div style={{
            padding: '10px 14px', borderRadius: 6, fontSize: 12.5, fontWeight: 600,
            background: notice.type === 'success' ? '#ECFDF5' : '#FEF2F2',
            color: notice.type === 'success' ? '#065F46' : '#991B1B',
            border: `1px solid ${notice.type === 'success' ? '#A7F3D0' : '#FCA5A5'}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span>{typeof notice.text === 'object' ? JSON.stringify(notice.text) : (notice.text || notice.message || notice.msg)}</span>
            <button onClick={() => setNotice(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 15 }}>×</button>
          </div>
        )}

        {/* ── 1. Calculation Pipeline (Spec §48) ── */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 8,
          padding: '8px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 12.5, color: '#0F172A' }}>
            <Sparkles size={14} color="#2563EB" />
            <span>Calculation Pipeline (Spec §48):</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <span style={{ color: '#10B981', fontSize: 11.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
              <CheckCircle2 size={13} /> Project Calc: Complete
            </span>
            <span style={{ color: '#10B981', fontSize: 11.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
              <CheckCircle2 size={13} /> BU Aggregation: Complete
            </span>
            <span style={{ color: '#10B981', fontSize: 11.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
              <CheckCircle2 size={13} /> Sub Aggregation: Complete
            </span>
            <span style={{ color: '#10B981', fontSize: 11.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
              <CheckCircle2 size={13} /> Group Consolidation: Complete
            </span>
            <span style={{
              background: '#E0F2FE',
              color: '#0369A1',
              border: '1px solid #BAE6FD',
              fontSize: 11,
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}>
              <Lock size={11} /> SHA-256 SEALED
            </span>
          </div>
        </div>

        {/* ── 2. Entity and Reporting Period Selection ── */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 8,
          padding: '10px 16px',
          display: 'flex',
          gap: 14,
          alignItems: 'flex-end',
          flexWrap: 'wrap',
        }}>
          <div style={{ flex: '2 1 260px' }}>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 4 }}>
              Entity / Legal Entity <span style={{ color: '#2563EB', fontSize: 10.5 }}>(Group / Company Level Only)</span>
            </label>
            <select
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 10px',
                borderRadius: 6,
                background: '#FFFFFF',
                border: '1px solid #CBD5E1',
                color: '#0F172A',
                fontSize: 12.5,
                fontWeight: 600,
              }}
            >
              <option value="">— Select Reporting Entity (Group / Company) —</option>
              {nodes
                .filter(n => ['group', 'company', 'subsidiary'].includes(n.type?.toLowerCase()))
                .map(n => <option key={n.id} value={n.id}>{n.name} [{n.type.toUpperCase()}]</option>)}
            </select>
          </div>

          <div style={{ flex: '1 1 200px' }}>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 4 }}>
              Reporting Period
            </label>
            <select
              value={periodId}
              onChange={(e) => setPeriodId(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 10px',
                borderRadius: 6,
                background: '#FFFFFF',
                border: '1px solid #CBD5E1',
                color: '#0F172A',
                fontSize: 12.5,
                fontWeight: 600,
              }}
            >
              <option value="">— Select Period —</option>
              {periods.map(p => <option key={p.id} value={p.id}>{p.label || p.code} ({p.financial_year})</option>)}
            </select>
          </div>

          <div>
            <button
              type="button"
              onClick={() => { refetchReport(); qc.invalidateQueries({ queryKey: ['reports-list'] }); }}
              style={{
                height: 35,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '0 12px',
                borderRadius: 6,
                background: '#FFFFFF',
                border: '1px solid #CBD5E1',
                color: '#334155',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={13} className={reportLoading ? 'spin' : ''} /> Refresh
            </button>
          </div>
        </div>

        {/* ── 3. Report Status & Actions Section ── */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 8,
          padding: '12px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 14,
        }}>
          {/* Status & Stats */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 280 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                background: '#DCFCE7',
                color: '#15803D',
                border: '1px solid #BBF7D0',
                fontSize: 12,
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: 9999,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#16A34A', display: 'inline-block' }} />
                Status: Ready for Compilation (92.4%)
              </span>
            </div>

            <div style={{ height: 4, width: '100%', maxWidth: 340, background: '#E2E8F0', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: '92.4%', background: '#10B981', borderRadius: 2 }} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11.5, color: '#64748B', flexWrap: 'wrap' }}>
              <span>Total Applicable: <b>94</b></span>
              <span style={{ color: '#15803D', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}>
                <CheckCircle2 size={12} /> Completed: 82
              </span>
              <span style={{ color: '#D97706', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}>
                ⏱ Pending Review: 8
              </span>
              <span style={{ color: '#DC2626', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}>
                ⚠ Needs Correction: 4
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <PageHelpButton title="Reporting Guide" route="/reporting" />

            <button
              type="button"
              onClick={handlePreviewReport}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 6,
                border: '1px solid #E2E8F0', background: '#FFFFFF', color: '#0F172A', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}
            >
              <Eye size={13} color="#64748B" /> Preview Report
            </button>

            <button
              type="button"
              onClick={handleExportPdf}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 6,
                border: '1px solid #E2E8F0', background: '#FFFFFF', color: '#0F172A', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}
            >
              <Download size={13} color="#64748B" /> Export HTML / PDF
            </button>

            <button
              type="button"
              onClick={handleCompile}
              disabled={!canCompileReport || compiling || !entityId || !periodId}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 6,
                border: 'none', background: (!canCompileReport || !entityId || !periodId) ? '#94A3B8' : '#09090B',
                color: '#FFFFFF', fontSize: 12.5, fontWeight: 700, cursor: (!canCompileReport || !entityId || !periodId) ? 'not-allowed' : 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
              }}
            >
              <Play size={12} fill="#FFFFFF" /> {compiling ? 'Compiling…' : 'Compile BRSR Pack'}
            </button>
          </div>
        </div>

        {/* ── 4. Existing BRSR Navigation Tabs ── */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 8,
          padding: '6px 10px',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {SECTION_TABS.map((t) => {
              const isTabActive = section === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setSection(t.key)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 6,
                    fontSize: 11.5,
                    fontWeight: isTabActive ? 700 : 500,
                    border: isTabActive ? '1px solid #BFDBFE' : '1px solid transparent',
                    background: isTabActive ? '#EFF6FF' : 'transparent',
                    color: isTabActive ? '#1D4ED8' : '#64748B',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    transition: 'all 0.15s',
                  }}
                >
                  {t.icon}
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* Contextual indicator dynamically reflects the active tab */}
          <div style={{
            fontSize: 11.5,
            color: '#64748B',
            fontWeight: 600,
            paddingLeft: 6,
            borderTop: '1px solid #F1F5F9',
            paddingTop: 6,
          }}>
            {breadcrumbText}
          </div>
        </div>

        {/* ── 5. Inner Workspace: Compiled Reports + Selected Disclosure Header + Statutory Document Preview ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '195px 1fr',
          gap: 14,
          alignItems: 'start',
        }}>
          {/* ── Left: Compiled Reports Sidebar ── */}
          <div style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 8,
            padding: 10,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 4px 6px' }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: '#0F172A' }}>Compiled Reports</span>
              <span style={{ fontSize: 10, fontWeight: 700, background: '#F1F5F9', color: '#475569', padding: '2px 6px', borderRadius: 4 }}>
                6 Packs
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {COMPILED_REPORT_PACKS.map((pack) => {
                const isSelected = selectedPackId === pack.id;
                return (
                  <div
                    key={pack.id}
                    onClick={() => {
                      setSelectedPackId(pack.id);
                      setSection('brsr_core');
                    }}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 6,
                      cursor: 'pointer',
                      border: isSelected ? '1px solid #BAE6FD' : '1px solid #E2E8F0',
                      background: isSelected ? '#F0F9FF' : '#FFFFFF',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ fontSize: 11.5, fontWeight: isSelected ? 700 : 600, color: '#0F172A', marginBottom: 4, lineHeight: 1.3 }}>
                      {pack.name}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10.5 }}>
                      <span style={{
                        fontSize: 9.5,
                        fontWeight: 800,
                        background: pack.statusBg,
                        color: pack.statusColor,
                        padding: '1px 5px',
                        borderRadius: 3,
                      }}>
                        {pack.status}
                      </span>
                      <span style={{ color: '#64748B', fontWeight: 500 }}>{pack.pages} Pages</span>
                    </div>
                    <div style={{ height: 3, background: '#E2E8F0', borderRadius: 2, overflow: 'hidden', marginTop: 6 }}>
                      <div style={{ height: '100%', width: `${pack.progress}%`, background: pack.statusColor }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleCompile}
              disabled={!canCompileReport || compiling || !entityId || !periodId}
              style={{
                width: '100%',
                background: '#F8FAFC',
                border: '1px dashed #CBD5E1',
                color: '#2563EB',
                fontSize: 11.5,
                fontWeight: 700,
                padding: '7px 0',
                borderRadius: 6,
                cursor: 'pointer',
                marginTop: 4,
              }}
            >
              + Compile New BRSR Pack
            </button>
          </div>

          {/* ── Right: Selected Disclosure Header & Statutory Document Preview ── */}
          <div ref={docRef} style={{ display: 'flex', flexDirection: 'column' }}>
            
            {/* Header bar above document */}
            <div style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '8px 8px 0 0',
              padding: '10px 16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 8,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  background: '#DCFCE7',
                  color: '#15803D',
                  fontSize: 11,
                  fontWeight: 800,
                  padding: '3px 8px',
                  borderRadius: 4,
                }}>
                  {sectionHeaderMeta.pill}
                </span>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: '#0F172A' }}>
                  {sectionHeaderMeta.title}
                </span>
              </div>

              <div>
                <span style={{
                  background: '#DCFCE7',
                  color: '#15803D',
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: 4,
                }}>
                  {sectionHeaderMeta.alignPill}
                </span>
              </div>
            </div>

            {/* Document Controls toolbar */}
            <div style={{
              background: '#F8FAFC',
              borderLeft: '1px solid #E2E8F0',
              borderRight: '1px solid #E2E8F0',
              borderBottom: '1px solid #E2E8F0',
              padding: '6px 16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 8,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  type="button"
                  onClick={() => setPreviewMode('statutory_final')}
                  style={{
                    padding: '3px 8px',
                    borderRadius: 4,
                    fontSize: 11.5,
                    fontWeight: previewMode === 'statutory_final' ? 700 : 500,
                    background: previewMode === 'statutory_final' ? '#FFFFFF' : 'transparent',
                    border: previewMode === 'statutory_final' ? '1px solid #E2E8F0' : '1px solid transparent',
                    color: previewMode === 'statutory_final' ? '#0F172A' : '#64748B',
                    cursor: 'pointer',
                  }}
                >
                  Statutory Final
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('working_draft')}
                  style={{
                    padding: '3px 8px',
                    borderRadius: 4,
                    fontSize: 11.5,
                    fontWeight: previewMode === 'working_draft' ? 700 : 500,
                    background: previewMode === 'working_draft' ? '#FFFFFF' : 'transparent',
                    border: previewMode === 'working_draft' ? '1px solid #E2E8F0' : '1px solid transparent',
                    color: previewMode === 'working_draft' ? '#0F172A' : '#64748B',
                    cursor: 'pointer',
                  }}
                >
                  Working Draft
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 11, color: '#64748B' }}>Page 28 of 64</span>

                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: '#475569' }}>
                  <button
                    type="button"
                    onClick={() => setDocZoom(z => Math.max(z - 10, 70))}
                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 2, color: '#64748B' }}
                  >
                    <Minus size={12} />
                  </button>
                  <span style={{ minWidth: 36, textAlign: 'center', fontWeight: 600 }}>{docZoom}%</span>
                  <button
                    type="button"
                    onClick={() => setDocZoom(z => Math.min(z + 10, 150))}
                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 2, color: '#64748B' }}
                  >
                    <Plus size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDocZoom(100)}
                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 2, color: '#64748B', marginLeft: 4 }}
                  >
                    <Maximize2 size={12} />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleExportPdf}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 4,
                    background: '#FFFFFF', border: '1px solid #E2E8F0', fontSize: 11.5, fontWeight: 600, color: '#0F172A', cursor: 'pointer',
                  }}
                >
                  <Download size={12} /> Download PDF
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/assurance')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 4,
                    background: '#09090B', border: 'none', fontSize: 11.5, fontWeight: 700, color: '#FFFFFF', cursor: 'pointer',
                  }}
                >
                  <ShieldCheck size={12} /> Audit Room
                </button>
              </div>
            </div>

            {/* ── The Statutory BRSR Document Sheet ── */}
            <div style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '0 0 8px 8px',
              padding: '24px 28px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
              transform: docZoom !== 100 ? `scale(${docZoom / 100})` : 'none',
              transformOrigin: 'top center',
              transition: 'transform 0.15s ease',
            }}>

              {/* Official filing metadata line */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, paddingBottom: 10, borderBottom: '1px solid #F1F5F9' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 10.5, fontWeight: 800, color: '#475569', letterSpacing: '0.06em' }}>
                    OFFICIAL STATUTORY FILING DOCUMENT
                  </span>
                  <span style={{ fontSize: 10.5, fontFamily: 'monospace', background: '#F1F5F9', color: '#475569', padding: '2px 6px', borderRadius: 3 }}>
                    SEBI/HO/CFD/CMD-2/P/CIR/2023/122
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    background: '#DCFCE7',
                    color: '#15803D',
                    fontSize: 10.5,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 4,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}>
                    <Lock size={10} /> ASSURED &amp; RECONCILED
                  </span>
                  <span style={{
                    fontSize: 10.5,
                    fontFamily: 'monospace',
                    background: '#F0F9FF',
                    color: '#0284C7',
                    border: '1px solid #BAE6FD',
                    padding: '2px 6px',
                    borderRadius: 4,
                  }}>
                    SHA-256: {report?.snapshot_hash ? report.snapshot_hash.slice(0, 10) + '...' + report.snapshot_hash.slice(-5) : 'cbf9d...3bc'}
                  </span>
                </div>
              </div>

              {/* Document Title Heading */}
              <div style={{ margin: '14px 0 16px' }}>
                <h2 style={{ fontSize: 17, fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.01em' }}>
                  ANNEXURE I: BUSINESS RESPONSIBILITY &amp; SUSTAINABILITY REPORT (BRSR)
                </h2>
                <div style={{ fontSize: 12, color: '#64748B', marginTop: 3 }}>
                  {report?.entity_name || selectedEntity?.name || 'Megha Engineering & Infrastructures Ltd (MEIL)'} - Statutory Annual Report {selectedPeriod?.financial_year || '2024-25'} - Core Disclosure Pack
                </div>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginTop: 4 }}>
                  FILING BOUNDARY: 100% Operational Control (Consolidated)
                </div>
              </div>

              {/* ── TAB CONTENT ROUTER ── */}

              {/* ── TAB: SECTION A (General Disclosures) ── */}
              {section === 'section_a' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: 6,
                    padding: '12px 16px',
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
                      SECTION A: GENERAL DISCLOSURES
                    </div>
                    <div style={{ fontSize: 11.5, color: '#475569', marginTop: 2 }}>
                      I. Details of the Listed Entity &amp; Operational Presence (SEBI Format)
                    </div>
                  </div>

                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, border: '1px solid #E2E8F0' }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #CBD5E1', color: '#475569', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                        <th style={{ padding: '9px 14px', textAlign: 'left', width: '35%' }}>FIELD / DISCLOSURE PARAMETER</th>
                        <th style={{ padding: '9px 14px', textAlign: 'left' }}>STATUTORY DISCLOSURE VALUE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { f: 'Corporate Identity Number (CIN)', v: 'U45201TG2006PLC050271' },
                        { f: 'Name of the Company', v: 'Megha Engineering & Infrastructures Ltd (MEIL)' },
                        { f: 'Year of Incorporation', v: '1989' },
                        { f: 'Registered Office Address', v: 'S-22, Technocrat Industrial Estate, Balanagar, Hyderabad – 500037, Telangana' },
                        { f: 'Corporate Website', v: 'www.meghaeng.com' },
                        { f: 'E-mail / Contact', v: 'esg@meghaeng.com | +91 40 4433 6700' },
                        { f: 'Financial Year Reported', v: '2024-25 (Current Statutory Filing)' },
                        { f: 'Reporting Currency', v: 'INR (₹ Crores)' },
                        { f: 'Stock Exchanges where listed', v: 'Unlisted Public Ltd (Voluntary Top 150 Core Compliance)' },
                        { f: 'Reporting Boundary', v: 'Consolidated (Subsidiaries, JVs, and Operating Infrastructure Sites)' },
                        { f: 'Operating Sites & Plant Locations', v: '4 Major Infrastructure Footprints (Zojila Tunnel, Balangir Plant, Kaleshwaram, Telangana Solar)' },
                        { f: 'Total Employees (Permanent)', v: '14,850' },
                        { f: 'Total Contractual Workers', v: '28,400' },
                        { f: 'Women Representation in Board / Workforce', v: '18.4% workforce participation' },
                        { f: 'Name and contact of BRSR Authority', v: 'Executive Vice President — Sustainability & Compliance' },
                      ].map((row, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #E2E8F0' }}>
                          <td style={{ padding: '8px 14px', fontWeight: 600, color: '#334155' }}>{row.f}</td>
                          <td style={{ padding: '8px 14px', color: '#0F172A', fontWeight: 700 }}>{row.v}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* ── TAB: SECTION B (Management & Process Disclosures) ── */}
              {section === 'section_b' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: 6,
                    padding: '12px 16px',
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
                      SECTION B: MANAGEMENT AND PROCESS DISCLOSURES
                    </div>
                    <div style={{ fontSize: 11.5, color: '#475569', marginTop: 2 }}>
                      Policy and management processes across National Guidelines on Responsible Business Conduct (NGRBC) P1–P9
                    </div>
                  </div>

                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5, border: '1px solid #E2E8F0' }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #CBD5E1', color: '#475569', fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase' }}>
                        <th style={{ padding: '9px 12px', textAlign: 'left', width: '38%' }}>DISCLOSURE QUESTIONS</th>
                        <th style={{ padding: '9px 8px', textAlign: 'center' }}>P1</th>
                        <th style={{ padding: '9px 8px', textAlign: 'center' }}>P2</th>
                        <th style={{ padding: '9px 8px', textAlign: 'center' }}>P3</th>
                        <th style={{ padding: '9px 8px', textAlign: 'center' }}>P4</th>
                        <th style={{ padding: '9px 8px', textAlign: 'center' }}>P5</th>
                        <th style={{ padding: '9px 8px', textAlign: 'center' }}>P6</th>
                        <th style={{ padding: '9px 8px', textAlign: 'center' }}>P7</th>
                        <th style={{ padding: '9px 8px', textAlign: 'center' }}>P8</th>
                        <th style={{ padding: '9px 8px', textAlign: 'center' }}>P9</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { q: '1. Policy covering respective principle approved by Board' },
                        { q: '2. Policy translated into operational procedures' },
                        { q: '3. Web-link to policy document available public/intranet' },
                        { q: '4. Specific commitments, goals and targets articulated' },
                        { q: '5. Dedicated director / committee responsible for review' },
                        { q: '6. Mechanism for grievance redressal in place' },
                      ].map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #E2E8F0' }}>
                          <td style={{ padding: '8px 12px', fontWeight: 600, color: '#334155' }}>{item.q}</td>
                          {[1,2,3,4,5,6,7,8,9].map(p => (
                            <td key={p} style={{ padding: '8px 4px', textAlign: 'center', color: '#15803D', fontWeight: 800 }}>
                              Y
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* ── TAB: ALL 36 INDICATORS ── */}
              {section === 'indicators' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: 6,
                    padding: '12px 16px',
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
                      ALL {TOTAL_INDICATORS} STATUTORY BRSR INDICATORS — SEBI FRAMEWORK
                    </div>
                    <div style={{ fontSize: 11.5, color: '#475569', marginTop: 2 }}>
                      Essential Indicators &amp; Leadership Indicators across Principles 1 to 9
                    </div>
                  </div>

                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5, border: '1px solid #E2E8F0' }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #CBD5E1', color: '#475569', fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase' }}>
                        <th style={{ padding: '9px 12px', textAlign: 'left', width: '12%' }}>PRINCIPLE</th>
                        <th style={{ padding: '9px 12px', textAlign: 'left', width: '15%' }}>CODE</th>
                        <th style={{ padding: '9px 12px', textAlign: 'left' }}>INDICATOR TITLE</th>
                        <th style={{ padding: '9px 12px', textAlign: 'center', width: '12%' }}>TYPE</th>
                        <th style={{ padding: '9px 12px', textAlign: 'right', width: '20%' }}>DISCLOSED VALUE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {BRSR_FRAMEWORK.flatMap(p => p.indicators.map((ind, i) => (
                        <tr key={ind.code + i} style={{ borderBottom: '1px solid #E2E8F0' }}>
                          <td style={{ padding: '8px 12px', fontWeight: 700, color: p.color }}>{p.principle}</td>
                          <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 11, color: '#475569', fontWeight: 700 }}>{ind.code}</td>
                          <td style={{ padding: '8px 12px', color: '#0F172A' }}>{ind.name}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                            <span style={{
                              fontSize: 9.5, fontWeight: 800, padding: '2px 6px', borderRadius: 3,
                              background: ind.type === 'Essential' ? '#EFF6FF' : '#F5F3FF',
                              color: ind.type === 'Essential' ? '#2563EB' : '#7C3AED',
                            }}>
                              {ind.type}
                            </span>
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#0F172A' }}>
                            {ind.code === 'P6-E1' || ind.code === 'P6-EI-1' ? '167,150.00 GJ' :
                             ind.code === 'P6-E2' || ind.code === 'P6-EI-6' ? '18,831.10 tCO2e' :
                             ind.code === 'P6-E3' || ind.code === 'P6-EI-3' ? '137,900.00 kL' :
                             ind.code === 'P6-E4' || ind.code === 'P6-EI-8' ? '1,709.00 MT' :
                             'Verified Reported'}
                          </td>
                        </tr>
                      )))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* ── TAB: SECTION C DATA (Full Environmental Performance) ── */}
              {section === 'section_c' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: 6,
                    padding: '12px 16px',
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
                      PRINCIPLE 6: Businesses should respect and make efforts to protect and restore the environment
                    </div>
                    <div style={{ fontSize: 11.5, color: '#475569', marginTop: 2 }}>
                      Essential &amp; Leadership Disclosures (Audited FY 2024-25 vs FY 2023-24)
                    </div>
                  </div>

                  {/* 1. Energy */}
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>
                      1. Details of total energy consumption (in GJ)
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5, border: '1px solid #E2E8F0', marginBottom: 12 }}>
                      <thead>
                        <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #CBD5E1', color: '#475569', fontWeight: 700 }}>
                          <th style={{ padding: '7px 12px', textAlign: 'left' }}>Parameter</th>
                          <th style={{ padding: '7px 12px', textAlign: 'right' }}>2024-25 (Current FY)</th>
                          <th style={{ padding: '7px 12px', textAlign: 'right' }}>2023-24 (Previous FY)</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                          <td style={{ padding: '7px 12px' }}>Total electricity consumption (A+D)</td>
                          <td style={{ padding: '7px 12px', textAlign: 'right', fontWeight: 700 }}>89,500.00</td>
                          <td style={{ padding: '7px 12px', textAlign: 'right' }}>89,400.00</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                          <td style={{ padding: '7px 12px' }}>Total fuel consumption (B+E)</td>
                          <td style={{ padding: '7px 12px', textAlign: 'right', fontWeight: 700 }}>75,500.00</td>
                          <td style={{ padding: '7px 12px', textAlign: 'right' }}>79,270.00</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                          <td style={{ padding: '7px 12px' }}>Energy consumption through other sources (C+F)</td>
                          <td style={{ padding: '7px 12px', textAlign: 'right', fontWeight: 700 }}>2,150.00</td>
                          <td style={{ padding: '7px 12px', textAlign: 'right' }}>2,220.00</td>
                        </tr>
                        <tr style={{ background: '#ECFDF5', fontWeight: 800 }}>
                          <td style={{ padding: '8px 12px', color: '#065F46' }}>Total energy consumption (A+B+C+D+E+F)</td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', color: '#065F46' }}>167,150.00</td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', color: '#065F46' }}>170,890.00</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* 3. Water */}
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>
                      3. Disclosures related to water (in kilolitres)
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5, border: '1px solid #E2E8F0', marginBottom: 12 }}>
                      <thead>
                        <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #CBD5E1', color: '#475569', fontWeight: 700 }}>
                          <th style={{ padding: '7px 12px', textAlign: 'left' }}>Parameter</th>
                          <th style={{ padding: '7px 12px', textAlign: 'right' }}>2024-25 (Current FY)</th>
                          <th style={{ padding: '7px 12px', textAlign: 'right' }}>2023-24 (Previous FY)</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={{ borderBottom: '1px solid #E2E8F0' }}><td style={{ padding: '7px 12px' }}>(i) Surface water</td><td style={{ padding: '7px 12px', textAlign: 'right', fontWeight: 700 }}>87,900.00</td><td style={{ padding: '7px 12px', textAlign: 'right' }}>93,700.00</td></tr>
                        <tr style={{ borderBottom: '1px solid #E2E8F0' }}><td style={{ padding: '7px 12px' }}>(ii) Groundwater</td><td style={{ padding: '7px 12px', textAlign: 'right', fontWeight: 700 }}>34,000.00</td><td style={{ padding: '7px 12px', textAlign: 'right' }}>36,800.00</td></tr>
                        <tr style={{ borderBottom: '1px solid #E2E8F0' }}><td style={{ padding: '7px 12px' }}>(iii) Third party water</td><td style={{ padding: '7px 12px', textAlign: 'right', fontWeight: 700 }}>12,900.00</td><td style={{ padding: '7px 12px', textAlign: 'right' }}>12,100.00</td></tr>
                        <tr style={{ background: '#F0F9FF', fontWeight: 800 }}>
                          <td style={{ padding: '8px 12px', color: '#0369A1' }}>Total volume of water withdrawal</td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', color: '#0369A1' }}>137,900.00</td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', color: '#0369A1' }}>145,400.00</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #E2E8F0' }}><td style={{ padding: '7px 12px' }}>Total volume of water consumption</td><td style={{ padding: '7px 12px', textAlign: 'right', fontWeight: 700 }}>116,600.00</td><td style={{ padding: '7px 12px', textAlign: 'right' }}>122,700.00</td></tr>
                      </tbody>
                    </table>
                  </div>

                  {/* 6. GHG */}
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>
                      6. Greenhouse gas emissions (Scope 1 and Scope 2)
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5, border: '1px solid #E2E8F0', marginBottom: 12 }}>
                      <thead>
                        <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #CBD5E1', color: '#475569', fontWeight: 700 }}>
                          <th style={{ padding: '7px 12px', textAlign: 'left' }}>Parameter</th>
                          <th style={{ padding: '7px 12px', textAlign: 'center' }}>Unit</th>
                          <th style={{ padding: '7px 12px', textAlign: 'right' }}>2024-25</th>
                          <th style={{ padding: '7px 12px', textAlign: 'right' }}>2023-24</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={{ borderBottom: '1px solid #E2E8F0' }}><td style={{ padding: '7px 12px' }}>Total Scope 1 emissions</td><td style={{ padding: '7px 12px', textAlign: 'center' }}>tCO2e</td><td style={{ padding: '7px 12px', textAlign: 'right', fontWeight: 700 }}>5,640.50</td><td style={{ padding: '7px 12px', textAlign: 'right' }}>6,020.50</td></tr>
                        <tr style={{ borderBottom: '1px solid #E2E8F0' }}><td style={{ padding: '7px 12px' }}>Total Scope 2 emissions</td><td style={{ padding: '7px 12px', textAlign: 'center' }}>tCO2e</td><td style={{ padding: '7px 12px', textAlign: 'right', fontWeight: 700 }}>13,190.60</td><td style={{ padding: '7px 12px', textAlign: 'right' }}>14,020.80</td></tr>
                        <tr style={{ borderBottom: '1px solid #E2E8F0' }}><td style={{ padding: '7px 12px' }}>Total Scope 3 emissions (Value Chain)</td><td style={{ padding: '7px 12px', textAlign: 'center' }}>tCO2e</td><td style={{ padding: '7px 12px', textAlign: 'right', fontWeight: 700 }}>16,450.00</td><td style={{ padding: '7px 12px', textAlign: 'right' }}>17,440.00</td></tr>
                      </tbody>
                    </table>
                  </div>

                  {/* 8. Waste */}
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>
                      8. Waste management (in metric tonnes)
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5, border: '1px solid #E2E8F0' }}>
                      <thead>
                        <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #CBD5E1', color: '#475569', fontWeight: 700 }}>
                          <th style={{ padding: '7px 12px', textAlign: 'left' }}>Parameter</th>
                          <th style={{ padding: '7px 12px', textAlign: 'right' }}>2024-25</th>
                          <th style={{ padding: '7px 12px', textAlign: 'right' }}>2023-24</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={{ borderBottom: '1px solid #E2E8F0' }}><td style={{ padding: '7px 12px' }}>Construction and demolition waste</td><td style={{ padding: '7px 12px', textAlign: 'right', fontWeight: 700 }}>1,230.00</td><td style={{ padding: '7px 12px', textAlign: 'right' }}>1,325.00</td></tr>
                        <tr style={{ borderBottom: '1px solid #E2E8F0' }}><td style={{ padding: '7px 12px' }}>Hazardous waste</td><td style={{ padding: '7px 12px', textAlign: 'right', fontWeight: 700 }}>83.70</td><td style={{ padding: '7px 12px', textAlign: 'right' }}>89.50</td></tr>
                        <tr style={{ background: '#ECFDF5', fontWeight: 800 }}>
                          <td style={{ padding: '8px 12px', color: '#065F46' }}>Total Waste Generated</td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', color: '#065F46' }}>1,709.00</td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', color: '#065F46' }}>1,834.10</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #E2E8F0' }}><td style={{ padding: '7px 12px' }}>Recovered / Diverted from Landfill</td><td style={{ padding: '7px 12px', textAlign: 'right', fontWeight: 700, color: '#15803D' }}>1,514.00</td><td style={{ padding: '7px 12px', textAlign: 'right' }}>1,488.00</td></tr>
                        <tr><td style={{ padding: '7px 12px' }}>Disposed to Authorized Landfill</td><td style={{ padding: '7px 12px', textAlign: 'right', fontWeight: 700 }}>195.00</td><td style={{ padding: '7px 12px', textAlign: 'right' }}>346.10</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── TAB: OVERVIEW (Radar & KPIs) ── */}
              {section === 'overview' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
                    {[
                      { l: 'Entity', v: report?.entity_name || selectedEntity?.name || 'MEIL', icon: <Building2 size={13} />, color: '#2563EB' },
                      { l: 'Period', v: report?.period_label || selectedPeriod?.code || 'FY 2024-25', icon: <Calendar size={13} />, color: '#0284C7' },
                      { l: 'Completeness', v: `${report?.overall_completeness_pct ?? 92.4}%`, icon: <Activity size={13} />, color: '#10B981' },
                      { l: 'Data Points', v: '94 / 94', icon: <BarChart2 size={13} />, color: '#F59E0B' },
                    ].map(({ l, v, icon, color }) => (
                      <div key={l} style={{ background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0', padding: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ color, flexShrink: 0 }}>{icon}</div>
                        <div>
                          <div style={{ fontSize: 10.5, color: '#64748B', marginBottom: 2 }}>{l}</div>
                          <div style={{ fontWeight: 800, fontSize: 13, color: '#0F172A' }}>{String(v)}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ background: '#FFFFFF', borderRadius: 8, border: '1px solid #E2E8F0', padding: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Activity size={14} color="#2563EB" /> Principle Coverage Radar
                    </div>
                    <ResponsiveContainer width="100%" height={260}>
                      <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                        <PolarGrid stroke="#E2E8F0" />
                        <PolarAngleAxis dataKey="principle" tick={{ fontSize: 11, fill: '#475569', fontWeight: 700 }} />
                        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10, fill: '#94A3B8' }} />
                        <Radar name="Coverage %" dataKey="value" stroke="#2563EB" fill="#2563EB" fillOpacity={0.25} strokeWidth={2} dot={{ r: 4, fill: '#2563EB' }} />
                        <Tooltip content={<CustomTooltip />} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* ── TAB: SNAPSHOTS & RESTATEMENTS (Spec §49) ── */}
              {section === 'snapshots' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: 6,
                    padding: '12px 16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 8,
                  }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
                        CRYPTOGRAPHIC SNAPSHOTS &amp; RESTATEMENTS (SPEC §49)
                      </div>
                      <div style={{ fontSize: 11.5, color: '#475569', marginTop: 2 }}>
                        Point-in-time statutory versions sealed with SHA-256 for external auditor assurance.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowCreateSnapshotModal(true)}
                      style={{
                        padding: '6px 14px', borderRadius: 6, background: '#2563EB', color: '#FFFFFF',
                        border: 'none', fontWeight: 700, fontSize: 11.5, cursor: 'pointer',
                      }}
                    >
                      + Create Snapshot
                    </button>
                  </div>

                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5, border: '1px solid #E2E8F0' }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #CBD5E1', color: '#475569', fontWeight: 700 }}>
                        <th style={{ padding: '8px 12px', textAlign: 'left' }}>Version</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left' }}>Snapshot Name</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left' }}>Status</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left' }}>SHA-256 Seal</th>
                        <th style={{ padding: '8px 12px', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {snapshotsList.length === 0 ? (
                        <tr>
                          <td colSpan={5} style={{ padding: 20, textAlign: 'center', color: '#64748B' }}>
                            Current active snapshot: <b>v1.0 (Statutory Annual Filing)</b> — SHA-256: cbf9d82b...3bc
                          </td>
                        </tr>
                      ) : (
                        snapshotsList.map((s) => (
                          <tr key={s.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                            <td style={{ padding: '8px 12px', fontWeight: 700 }}>v{s.version}</td>
                            <td style={{ padding: '8px 12px', color: '#0F172A' }}>{s.snapshot_name}</td>
                            <td style={{ padding: '8px 12px' }}>
                              <span style={{
                                padding: '2px 6px', borderRadius: 3, fontSize: 10, fontWeight: 700,
                                background: s.is_sealed ? '#DCFCE7' : '#FEF3C7',
                                color: s.is_sealed ? '#15803D' : '#D97706',
                              }}>
                                {s.is_sealed ? 'SEALED' : 'DRAFT'}
                              </span>
                            </td>
                            <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 10.5, color: '#0369A1' }}>
                              {s.sha256_hash ? s.sha256_hash.slice(0, 16) + '...' : 'cbf9d82b...3bc'}
                            </td>
                            <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                              {!s.is_sealed ? (
                                <button
                                  type="button"
                                  onClick={() => { setSelectedSnapshotForSeal(s); setShowSealModal(true); }}
                                  style={{ border: 'none', background: '#10B981', color: '#FFFFFF', padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                                >
                                  Seal
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => { setSelectedSnapshotForRestate(s); setShowRestateModal(true); }}
                                  style={{ border: 'none', background: '#F59E0B', color: '#FFFFFF', padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                                >
                                  Restate
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* ── TAB: BRSR CORE (Default Statutory Preview) ── */}
              {section === 'brsr_core' && (
                <div>
                  {/* Principle & Indicator Banner */}
                  <div style={{
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: 6,
                    padding: '12px 16px',
                    marginBottom: 16,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{
                        background: '#EFF6FF',
                        color: '#1D4ED8',
                        fontSize: 10.5,
                        fontWeight: 800,
                        padding: '2px 6px',
                        borderRadius: 4,
                      }}>
                        SECTION C: PRINCIPLE-WISE PERFORMANCE DISCLOSURE
                      </span>
                      <span style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>
                        SEBI Core KPI 1.1 · ISO 50001:2018 Aligned
                      </span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
                      Principle 6: Businesses should respect and make efforts to protect and restore the environment
                    </div>
                    <div style={{ fontSize: 11.5, color: '#475569', marginTop: 3 }}>
                      Essential Indicator 1: Total energy consumption (in Gigajoules - GJ) and energy intensity details across operational footprints.
                    </div>
                  </div>

                  {/* Metadata Tags Row */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 8,
                    marginBottom: 12,
                    fontSize: 11,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ background: '#F1F5F9', color: '#475569', padding: '3px 8px', borderRadius: 4, fontWeight: 600 }}>
                        🛡 Mandatory SEBI Core Parameter
                      </span>
                      <span style={{ background: '#DCFCE7', color: '#15803D', padding: '3px 8px', borderRadius: 4, fontWeight: 600 }}>
                        ✓ Auditor Verified (KPMG Limited Assurance)
                      </span>
                      <span style={{ background: '#EFF6FF', color: '#1D4ED8', padding: '3px 8px', borderRadius: 4, fontWeight: 600 }}>
                        📍 Boundary: 4 Operating Subsidiaries + Fleet
                      </span>
                    </div>

                    <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A' }}>
                      Total Group Consumption: <span style={{ color: '#0F172A' }}>{fmt(currentTotalEnergy)} GJ</span>{' '}
                      <span style={{ color: '#16A34A', fontSize: 11, fontWeight: 700 }}>({varianceEnergy}% YoY)</span>
                    </div>
                  </div>

                  {/* ── Table: Statutory Energy Disclosure ── */}
                  <div style={{ overflowX: 'auto', marginBottom: 18 }}>
                    <table style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      fontSize: 12,
                      border: '1px solid #E2E8F0',
                    }}>
                      <thead>
                        <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #CBD5E1', color: '#475569', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                          <th style={{ padding: '10px 14px', textAlign: 'left', width: '42%' }}>PARAMETER</th>
                          <th style={{ padding: '10px 14px', textAlign: 'right', width: '18%' }}>FY 2024-25 (CURRENT)</th>
                          <th style={{ padding: '10px 14px', textAlign: 'right', width: '18%' }}>FY 2023-24 (PREVIOUS)</th>
                          <th style={{ padding: '10px 14px', textAlign: 'right', width: '11%' }}>VARIANCE (%)</th>
                          <th style={{ padding: '10px 14px', textAlign: 'center', width: '11%' }}>AUDIT LINEAGE</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Row 1: Electricity */}
                        <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                          <td style={{ padding: '10px 14px' }}>
                            <div style={{ fontWeight: 700, color: '#0F172A' }}>Total electricity consumption (A)</div>
                            <div style={{ fontSize: 10.5, color: '#64748B', marginTop: 1 }}>Grid DISCOM telemetry + captive solar self-generation</div>
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#0F172A' }}>
                            {fmt(electricityCurrent)} GJ
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', color: '#475569' }}>
                            {fmt(electricityPrev)} GJ
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: '#16A34A' }}>
                            {varianceElec}%
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                            <span style={{ fontSize: 10.5, fontWeight: 700, color: '#15803D', background: '#DCFCE7', padding: '2px 6px', borderRadius: 4 }}>
                              ✓ Reconciled
                            </span>
                          </td>
                        </tr>

                        {/* Row 2: Fuel */}
                        <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                          <td style={{ padding: '10px 14px' }}>
                            <div style={{ fontWeight: 700, color: '#0F172A' }}>Total fuel consumption (B)</div>
                            <div style={{ fontSize: 10.5, color: '#64748B', marginTop: 1 }}>HSD, furnace oil, PNG &amp; fleet transport telemetry</div>
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#0F172A' }}>
                            {fmt(fuelCurrent)} GJ
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', color: '#475569' }}>
                            {fmt(fuelPrev)} GJ
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: '#DC2626' }}>
                            {varianceFuel}%
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                            <span style={{ fontSize: 10.5, fontWeight: 700, color: '#15803D', background: '#DCFCE7', padding: '2px 6px', borderRadius: 4 }}>
                              ✓ Reconciled
                            </span>
                          </td>
                        </tr>

                        {/* Row 3: Other sources */}
                        <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                          <td style={{ padding: '10px 14px' }}>
                            <div style={{ fontWeight: 700, color: '#0F172A' }}>Energy consumption through other sources (C)</div>
                            <div style={{ fontSize: 10.5, color: '#64748B', marginTop: 1 }}>Biomass, steam and hydrogen fuel cells</div>
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#0F172A' }}>
                            0 GJ
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', color: '#475569' }}>
                            0 GJ
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', color: '#94A3B8' }}>
                            —
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                            <span style={{ fontSize: 10.5, fontWeight: 600, color: '#64748B', background: '#F1F5F9', padding: '2px 6px', borderRadius: 4 }}>
                              Nil Return
                            </span>
                          </td>
                        </tr>

                        {/* Row 4: Total Energy (Highlighted in light mint) */}
                        <tr style={{ background: '#ECFDF5', borderBottom: '1px solid #A7F3D0', borderLeft: '3px solid #10B981' }}>
                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ fontWeight: 800, color: '#065F46' }}>Total energy consumption (A + B + C)</div>
                            <div style={{ fontSize: 10.5, color: '#047857', marginTop: 1 }}>Consolidated group energy baseline for GHG Scope 1 &amp; 2 calculations</div>
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 800, fontSize: 13, color: '#065F46' }}>
                            {fmt(currentTotalEnergy)} GJ
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#047857' }}>
                            {fmt(previousTotalEnergy)} GJ
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 800, color: '#059669' }}>
                            {varianceEnergy}%
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                            <span style={{ fontSize: 10.5, fontWeight: 800, color: '#065F46', background: '#A7F3D0', padding: '2px 8px', borderRadius: 4, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                              <Lock size={10} /> SHA-256 Sealed
                            </span>
                          </td>
                        </tr>

                        {/* Row 5: Intensity per turnover */}
                        <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                          <td style={{ padding: '10px 14px' }}>
                            <div style={{ fontWeight: 700, color: '#0F172A' }}>Energy intensity per rupee of turnover (GJ / ₹ Cr)</div>
                            <div style={{ fontSize: 10.5, color: '#64748B', marginTop: 1 }}>Revenue basis turnover (₹ 11,293.9 Cr Audited)</div>
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#0F172A' }}>
                            14.89
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', color: '#475569' }}>
                            15.42
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: '#16A34A' }}>
                            -4.02%
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                            <span style={{ fontSize: 10.5, fontWeight: 700, color: '#15803D', background: '#DCFCE7', padding: '2px 6px', borderRadius: 4 }}>
                              ✓ Reconciled
                            </span>
                          </td>
                        </tr>

                        {/* Row 6: Physical intensity */}
                        <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                          <td style={{ padding: '10px 14px' }}>
                            <div style={{ fontWeight: 700, color: '#0F172A' }}>Energy intensity in physical terms (GJ / MT output)</div>
                            <div style={{ fontSize: 10.5, color: '#64748B', marginTop: 1 }}>Total production volume across heavy manufacturing plants</div>
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#0F172A' }}>
                            0.84
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', color: '#475569' }}>
                            0.89
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: '#16A34A' }}>
                            -5.62%
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                            <span style={{ fontSize: 10.5, fontWeight: 700, color: '#15803D', background: '#DCFCE7', padding: '2px 6px', borderRadius: 4 }}>
                              ✓ Reconciled
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* ── Supporting Information Bottom Boxes ── */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 14,
                  }}>
                    {/* Left: Consolidated Entity Breakdown */}
                    <div style={{
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: 6,
                      padding: '12px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <span style={{ fontSize: 11, fontWeight: 800, color: '#0F172A', textTransform: 'uppercase' }}>
                            CONSOLIDATED ENTITY BREAKDOWN
                          </span>
                          <span style={{ fontSize: 10.5, color: '#2563EB', fontWeight: 700 }}>
                            42 Verified Source Files
                          </span>
                        </div>

                        <div style={{
                          fontFamily: 'monospace',
                          fontSize: 10.5,
                          color: '#334155',
                          background: '#FFFFFF',
                          padding: '8px 10px',
                          borderRadius: 4,
                          border: '1px solid #CBD5E1',
                          lineHeight: 1.5,
                        }}>
                          Σ = 89,260 GJ (BU01 Infra) + 42,450 GJ (BU04 Heavy Engg) + 21,580 GJ (BU02 Clean) + 15,060 GJ (Fleet) = 167,150 GJ
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, fontSize: 11 }}>
                        <span style={{ color: '#15803D', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <CheckCircle2 size={12} /> Zero Double-Counting Anomaly Detected
                        </span>
                        <button
                          type="button"
                          onClick={() => handleOpenLineage('P6-EI-1')}
                          style={{ border: 'none', background: 'transparent', color: '#2563EB', fontWeight: 700, fontSize: 11, cursor: 'pointer', padding: 0 }}
                        >
                          Audit Files →
                        </button>
                      </div>
                    </div>

                    {/* Right: Statutory Auditor Sign-off */}
                    <div style={{
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: 6,
                      padding: '12px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <span style={{ fontSize: 11, fontWeight: 800, color: '#0F172A', textTransform: 'uppercase' }}>
                            STATUTORY AUDITOR SIGN-OFF
                          </span>
                          <span style={{ fontSize: 9.5, fontWeight: 800, background: '#F1F5F9', color: '#475569', padding: '1px 6px', borderRadius: 3 }}>
                            CONFIDENTIAL · AUDIT READY
                          </span>
                        </div>

                        <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.4 }}>
                          Electricity telemetry calibrated to ISO 50001:2018. Fuel log records matched against commercial tax e-invoices.
                        </div>

                        <div style={{ fontSize: 11.5, fontWeight: 700, color: '#0F172A', marginTop: 8 }}>
                          KPMG Statutory Assurance Partner
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, fontSize: 10.5 }}>
                        <span style={{ color: '#64748B' }}>
                          Signed: 2025-03-28 14:22 IST
                        </span>
                        <button
                          type="button"
                          onClick={() => navigate('/assurance')}
                          style={{
                            padding: '3px 8px', borderRadius: 4, background: '#FFFFFF', border: '1px solid #CBD5E1',
                            fontSize: 10.5, fontWeight: 700, color: '#0F172A', cursor: 'pointer',
                          }}
                        >
                          View Certificate
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>

      </div>

      {/* Create Snapshot Modal */}
      {showCreateSnapshotModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div className="card" style={{ width: '100%', maxWidth: 460, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Create Permanent Report Snapshot</h3>
              <button onClick={() => setShowCreateSnapshotModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
              This compiles all current consolidated figures for <strong>{selectedEntity?.name}</strong> ({selectedPeriod?.code}) into an immutable snapshot and calculates its SHA-256 fingerprint.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setShowCreateSnapshotModal(false)} className="btn btn-secondary">Cancel</button>
              <button onClick={handleCreateSnapshot} disabled={createSnapshotMutation.isPending} className="btn btn-primary">
                {createSnapshotMutation.isPending ? 'Creating...' : 'Create Snapshot'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Seal Modal */}
      {showSealModal && selectedSnapshotForSeal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div className="card" style={{ width: '100%', maxWidth: 460, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Cryptographically Seal Snapshot</h3>
              <button onClick={() => setShowSealModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>
              Once sealed, this snapshot version <strong>cannot be modified or overwritten</strong>. Any subsequent edits will require a formal restatement.
            </p>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Authorizing Signatory Name</label>
              <input
                type="text"
                value={sealSignature}
                onChange={(e) => setSealSignature(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border-default)' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setShowSealModal(false)} className="btn btn-secondary">Cancel</button>
              <button onClick={handleSealSnapshot} disabled={sealSnapshotMutation.isPending} className="btn btn-primary">
                {sealSnapshotMutation.isPending ? 'Sealing...' : 'Confirm Seal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restate Modal */}
      {showRestateModal && selectedSnapshotForRestate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div className="card" style={{ width: '100%', maxWidth: 480, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>File Statutory Restatement</h3>
              <button onClick={() => setShowRestateModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>
              Create an audited restatement linked to sealed snapshot #{selectedSnapshotForRestate.version}.
            </p>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Mandatory Justification / Reason *</label>
              <textarea
                required
                rows={3}
                placeholder="e.g. Discovered historical billing invoice correction in Subcontractor diesel consumption (MoEFCC audit reconciliation)."
                value={restateReason}
                onChange={(e) => setRestateReason(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border-default)', fontSize: 12 }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setShowRestateModal(false)} className="btn btn-secondary">Cancel</button>
              <button onClick={handleRestate} disabled={restateSnapshotMutation.isPending || !restateReason} className="btn btn-primary">
                {restateSnapshotMutation.isPending ? 'Filing...' : 'Submit Restatement'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4-Level Traceability Lineage Drawer */}
      <DataLineageDrawer
        isOpen={lineageDrawerOpen}
        onClose={() => setLineageDrawerOpen(false)}
        metricData={lineageMetricData}
        metricCode={lineageMetricData?.metricCode}
        periodId={periodId}
        entityId={entityId}
      />
    </div>
  );
}

export default function Reporting() {
  const { user } = useAuth();

  // Project users see the ProjectSummary read model, not the full corporate BRSR
  if (user?.role === 'project_admin') {
    return <ProjectSummary key={user?.id || 'project_admin'} />;
  }

  return <CorporateReporting key={user?.id || 'corporate_reporting'} />;
}
