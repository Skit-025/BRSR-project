import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Edit2, MoreHorizontal, CheckCircle2, Clock, AlertTriangle,
  Circle, FileText, Shield, BarChart3, Activity, MapPin, Building2,
  Calendar, Tag, ChevronRight, Upload, Eye, Download, MessageSquare,
  TrendingUp, Zap, Droplets, Trash2, Users, Flame, ExternalLink,
  Check, X, RefreshCw, Info, ListChecks, UploadCloud, FileDown, Sliders, CheckSquare, Sparkles, AlertCircle
} from 'lucide-react';

/* ── Shared project data ── */
const PROJECTS_DATA = {
  'PRJ-ODISHA-SOLAR': {
    id: 'PRJ-ODISHA-SOLAR', name: '250 MW Odisha Solar Park',
    code: 'PRJ-ODISHA-SOLAR', period: 'FY 2025–26',
    status: 'IN_REVIEW', coverage: 92, evidenceCount: '18 / 20',
    bu: 'Solar EPC & Operations', subsidiary: 'Aarohan Renewable Energy Pvt. Ltd.',
    type: 'Solar Power Generation', location: 'Odisha, India', stage: 'Operations',
    description: 'Utility-scale 250 MW grid-connected solar photovoltaic installation in Odisha delivering clean energy to state discoms. Equipped with central inverters, automated bifacial tracking, dedicated 220kV evacuation substation, and continuous environmental monitoring.',
    activities: [
      'Solar photovoltaic power generation',
      'Substation & grid transmission operations',
      'Automated robotic panel dry cleaning',
      'Site environmental & vegetation management',
      'Workforce EHS safety monitoring',
    ],
    template: 'Renewable Solar Utility Operations v1',
    lastUpdated: 'Mar 28, 2026 · 17:30',
    submittedBy: 'Aditya Sharma (Project User)',
    esgSections: [
      { id: 'energy', label: 'Energy & Fuel', items: ['Solar Generation (38,450 MWh)', 'Auxiliary Diesel (12,450 L)'], status: 'DONE', pct: 100 },
      { id: 'water',  label: 'Water Stewardship', items: ['Robotic Cleaning (1,240 kL)', 'Domestic Water (380 kL)'], status: 'DONE', pct: 100 },
      { id: 'waste',  label: 'Waste & Circularity', items: ['E-Waste Modules (0.4 MT)', 'Packaging Waste (3.2 MT)'], status: 'PARTIAL', pct: 85 },
      { id: 'social', label: 'Workforce & Safety', items: ['184,000 Safe Hours', 'Zero LTIs', '100% PPE Audits'], status: 'DONE', pct: 100 },
      { id: 'env',    label: 'Biodiversity & Land', items: ['Topsoil Preservation', 'Greenbelt Flora Survey'], status: 'PARTIAL', pct: 75 },
    ],
    evidence: [
      { id: 'e1', name: 'GRID-INVOICE-ODISHA-MAR2026.pdf', type: 'PDF', size: '2.4 MB', uploaded: 'Mar 28, 2026', field: 'Solar Grid Export & Auxiliary Energy' },
      { id: 'e2', name: 'DIESEL-LOGBOOK-IOCL-MAR2026.pdf', type: 'PDF', size: '1.8 MB', uploaded: 'Mar 27, 2026', field: 'Diesel Generator Meter Records (12,450 L)' },
      { id: 'e3', name: 'WATER-ROBOTIC-CLEAN-MAR2026.pdf', type: 'PDF', size: '0.9 MB', uploaded: 'Mar 27, 2026', field: 'Water Consumption & Robotic Dry-Cleaning' },
      { id: 'e4', name: 'LABOUR-SAFETY-AUDIT-Q4.pdf', type: 'PDF', size: '1.2 MB', uploaded: 'Mar 26, 2026', field: 'Workforce Safety & Zero-Incident Log' },
    ],
    metrics: [
      { label: 'Clean Power Export', value: '38,450', unit: 'MWh', icon: Zap, trend: -14 },
      { label: 'Auxiliary Diesel', value: '12,450', unit: 'L', icon: Flame, trend: -8 },
      { label: 'Water Consumed', value: '1,620', unit: 'kL', icon: Droplets, trend: -22 },
      { label: 'Workers On-site', value: '184', unit: 'persons', icon: Users, trend: 4 },
    ],
    reviews: [
      { id: 'r1', reviewer: 'Rajesh Sen (BU Admin)', action: 'IN_REVIEW', comment: 'Reviewing auxiliary diesel logbooks and dry-cleaning water records against IOCL delivery vouchers for March 2026. All primary evidence files validated.', date: 'Mar 28, 2026 18:15', level: 'BU' },
    ],
    pipeline: [
      { label: 'Project Data Submitted', status: 'done', time: 'Mar 28, 2026 · 17:30' },
      { label: 'BU Admin Review', status: 'active', time: 'In progress (Under BU Review)' },
      { label: 'Project Emission Calculation', status: 'pending', time: 'Pending BU Approval' },
      { label: 'Solar BU Aggregation', status: 'pending', time: 'Pending' },
      { label: 'Aarohan Renewable Consolidation', status: 'pending', time: 'Pending' },
      { label: 'Group ESG Report Ready', status: 'pending', time: 'Pending' },
    ],
  },
  'PRJ-RAJ-SOLAR': {
    id: 'PRJ-RAJ-SOLAR', name: '50 MW Rajasthan Solar Expansion',
    code: 'PRJ-RAJ-SOLAR', period: 'FY 2025–26',
    status: 'APPROVED', coverage: 100, evidenceCount: '15 / 15',
    bu: 'Solar EPC & Operations', subsidiary: 'Aarohan Renewable Energy Pvt. Ltd.',
    type: 'Solar Power Generation', location: 'Rajasthan, India', stage: 'Operations',
    description: 'Bifacial solar installation in Thar desert region operating with zero liquid discharge protocol.',
    activities: ['Solar PV Generation', 'Desert Dust Mitigation', 'Transmission Feed'],
    template: 'Renewable Solar Utility Operations v1',
    lastUpdated: 'Mar 26, 2026 · 14:00',
    submittedBy: 'Karan Mehra',
    esgSections: [
      { id: 'energy', label: 'Energy', items: ['Solar Feed', 'Inverter Losses'], status: 'DONE', pct: 100 },
      { id: 'water', label: 'Water', items: ['Cleaning Water'], status: 'DONE', pct: 100 },
    ],
    evidence: [],
    metrics: [{ label: 'Clean Power', value: '7,800', unit: 'MWh', icon: Zap, trend: 0 }],
    reviews: [],
    pipeline: [],
  },
};

// Aliases
PROJECTS_DATA['prj-odisha-solar'] = PROJECTS_DATA['PRJ-ODISHA-SOLAR'];
PROJECTS_DATA['prj-best'] = PROJECTS_DATA['PRJ-ODISHA-SOLAR'];
PROJECTS_DATA['prj-hwy-od'] = PROJECTS_DATA['PRJ-ODISHA-SOLAR'];

const FALLBACK_PROJECT = PROJECTS_DATA['PRJ-ODISHA-SOLAR'];

const STATUS_CONFIG = {
  APPROVED:          { label: 'Approved',          badgeClass: 'badge-green', dot: 'green' },
  CALCULATED:        { label: 'Calculated',         badgeClass: 'badge-green', dot: 'green' },
  IN_REVIEW:         { label: 'Under BU Review',    badgeClass: 'badge-blue',  dot: 'blue'  },
  SUBMITTED:         { label: 'Submitted',          badgeClass: 'badge-blue',  dot: 'blue'  },
  CHANGES_REQUESTED: { label: 'Changes Requested',  badgeClass: 'badge-amber', dot: 'amber' },
  DRAFT:             { label: 'Draft',              badgeClass: 'badge-gray',  dot: 'gray'  },
};

const SECTION_STATUS = {
  DONE:    { icon: '✓', color: 'var(--success)', bg: 'var(--success-subtle)', border: 'var(--success-border)' },
  PARTIAL: { icon: '◐', color: '#B45309', bg: 'var(--warning-subtle)', border: 'var(--warning-border)' },
  PENDING: { icon: '○', color: 'var(--text-muted)', bg: 'var(--bg-subtle)', border: 'var(--border)' },
};

import { useOrgNodes, useOrgPeriods, useProjectSubmission, useEvidenceList } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { workflowApi } from '../api/client';
import { useQueryClient } from '@tanstack/react-query';
import Modal from '../components/Modal';

const TABS = ['Overview', 'Data Collection', 'Evidence', 'Reviews', 'Calculations'];

// Map submission status → ProjectDetail STATUS_CONFIG keys
const SUB_STATUS_MAP = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'IN_REVIEW',
  UNDER_BU_REVIEW: 'IN_REVIEW',
  BU_APPROVED: 'APPROVED',
  SUBSIDIARY_APPROVED: 'APPROVED',
  CONSOLIDATED: 'APPROVED',
  RETURNED: 'CHANGES_REQUESTED',
};

export default function ProjectDetail() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: nodes = [] } = useOrgNodes();
  const { data: periods = [] } = useOrgPeriods();
  const [activeTab, setActiveTab] = useState('Overview');
  const [selectedSection, setSelectedSection] = useState(null);

  const dbNode = nodes.find(n => n.id === projectId || n.code === projectId || n.code?.toUpperCase() === projectId?.toUpperCase());

  // Find the demo period
  const demoPeriod = periods.find(p => p.code === 'FY2025-26-M03') || periods[0];

  // Fetch real submission data from backend
  const { data: submissionPack, refetch: refetchSubmission } = useProjectSubmission(
    dbNode?.id,
    demoPeriod?.id,
    { enabled: !!dbNode?.id && !!demoPeriod?.id }
  );

  // Fetch real evidence records
  const { data: allEvidence = [], refetch: refetchEvidence } = useEvidenceList();

  const projectEvidence = useMemo(() => {
    if (!dbNode) return [];
    return allEvidence.filter(e =>
      String(e.project_id) === String(dbNode.id) ||
      String(e.project_name) === String(dbNode.name) ||
      String(e.project_id) === String(dbNode.code)
    );
  }, [allEvidence, dbNode]);

  // Action Menu & Modal States
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [showSiteDetailsModal, setShowSiteDetailsModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionNotice, setActionNotice] = useState(null);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        refetchSubmission?.(),
        refetchEvidence?.(),
      ]);
    } catch (e) {
      // ignore
    } finally {
      setTimeout(() => setIsRefreshing(false), 800);
    }
    setActionNotice('Project operational records refreshed.');
    setTimeout(() => setActionNotice(null), 3000);
  };

  const handleExportCSV = () => {
    setShowActionMenu(false);
    const headers = ['Metric Name', 'Metric Code', 'Value', 'Unit', 'Source'];
    const rows = (project.dataPoints && project.dataPoints.length > 0)
      ? project.dataPoints.map(d => [d.metric_name || d.metric_code, d.metric_code, d.value_numeric ?? d.value_text ?? '', d.unit || '', d.source || 'Operational Entry'])
      : [
          ['Electricity Drawl', 'ENV-ENERGY-001', project.metrics[0]?.value || '', 'kWh', 'DISCOM Bill'],
          ['Auxiliary Diesel Fuel', 'ENV-ENERGY-002', project.metrics[1]?.value || '', 'L', 'Delivery Logbook'],
          ['Water Withdrawal', 'ENV-WATER-001', project.metrics[2]?.value || '', 'kL', 'Flow Meter'],
          ['Site Workforce Headcount', 'SOC-WORK-001', project.metrics[3]?.value || '', 'persons', 'Gate Access']
        ];

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${project.code || 'project'}_ESG_Summary_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setActionNotice('Project ESG CSV summary exported successfully.');
    setTimeout(() => setActionNotice(null), 3500);
  };

  const project = useMemo(() => {
    if (!dbNode) {
      return PROJECTS_DATA[projectId] || FALLBACK_PROJECT;
    }

    const parentBu = nodes.find(b => b.id === dbNode.parent_id);
    const parentSub = parentBu ? nodes.find(s => s.id === parentBu.parent_id) : null;
    const subStatus = submissionPack?.status;
    const derivedStatus = subStatus ? (SUB_STATUS_MAP[subStatus] || 'DRAFT') : (dbNode.is_active ? 'APPROVED' : 'DRAFT');
    const dataPoints = submissionPack?.data_points || [];

    const isSeededOdisha = dbNode.code === 'PRJ-ODISHA-SOLAR';
    const hero = PROJECTS_DATA['PRJ-ODISHA-SOLAR'];

    // Real dynamic coverage: strictly 0% if no data entered yet!
    const totalRequiredFields = 8;
    const filledCount = dataPoints.filter(d => (d.value_numeric !== null && d.value_numeric !== undefined) || (d.value_text !== null && d.value_text !== undefined && d.value_text !== '')).length;
    const coverage = isSeededOdisha && dataPoints.length === 0 ? 92 : (filledCount > 0 ? Math.min(100, Math.round((filledCount / totalRequiredFields) * 100)) : 0);

    // Real dynamic evidence count: 0 / 6 for empty projects
    const evidenceCountStr = isSeededOdisha && projectEvidence.length === 0 ? '18 / 20' : `${projectEvidence.length} / ${Math.max(6, projectEvidence.length)}`;

    // Project type resolution
    const pType = (dbNode.project_type || 'Infrastructure').toLowerCase();
    const isTunnel = pType.includes('tunnel') || dbNode.name.toLowerCase().includes('tunnel');
    const isSolar = pType.includes('solar');
    const isWind = pType.includes('wind');
    const isHwy = pType.includes('highway') || pType.includes('hwy') || pType.includes('road');

    // Dynamic Activities based on real project type
    let activities = [];
    if (isTunnel) {
      activities = [
        'Civil excavation & underground tunnelling',
        'Ventilation & underground tunnel lighting',
        'Heavy machinery auxiliary diesel monitoring',
        'Concrete lining & structural materials',
        'Site dust, runoff & environmental mitigation',
        'Workforce occupational health & safety',
      ];
    } else if (isSolar) {
      activities = [
        'Solar photovoltaic power generation',
        'Substation & grid transmission operations',
        'Automated panel cleaning & water management',
        'Site environmental & vegetation management',
        'Workforce EHS safety monitoring',
      ];
    } else if (isWind) {
      activities = [
        'Wind turbine generator operations',
        'Grid feed & power evacuation',
        'Preventive blade & nacelle maintenance',
        'Flora & fauna environmental surveys',
        'Workforce safety monitoring',
      ];
    } else if (isHwy) {
      activities = [
        'Highway alignment & earthworks',
        'Bitumen & paving material tracking',
        'Fleet transport & diesel consumption',
        'Stormwater runoff & erosion control',
        'Road workforce EHS safety monitoring',
      ];
    } else {
      activities = [
        'Operational resource & fuel logging',
        'Site power & auxiliary diesel monitoring',
        'Water withdrawal & effluent tracking',
        'Solid & hazardous waste management',
        'Workforce occupational safety monitoring',
      ];
    }

    // Dynamic Template based on project type
    let template = 'Standard Infrastructure ESG Protocol v1';
    if (isTunnel) template = 'Heavy Civil & Tunnelling ESG Protocol v1';
    else if (isSolar) template = 'Renewable Solar Utility Operations v1';
    else if (isWind) template = 'Wind Power Generation Operations v1';
    else if (isHwy) template = 'Linear Transport & Highway Infrastructure v1';
    else if (dbNode.project_type) template = `${dbNode.project_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} ESG Standard v1`;

    // Dynamic Description
    let description = dbNode.project_description;
    if (!description) {
      if (isTunnel) {
        description = `${dbNode.name} is a major civil tunnelling project located in ${dbNode.location_state || 'Odisha, India'} under ${parentBu?.name || 'Heavy Infrastructure'}. Operations include continuous underground excavation, ventilation, structural concrete lining, and strict workforce EHS and environmental monitoring under SEBI BRSR Core.`;
      } else if (isSolar) {
        description = `${dbNode.name} is a utility-scale solar photovoltaic installation in ${dbNode.location_state || 'India'} delivering clean energy to state discoms, equipped with automated tracking and continuous environmental monitoring.`;
      } else if (isWind) {
        description = `${dbNode.name} is a utility wind energy farm in ${dbNode.location_state || 'India'} feeding renewable power to the regional grid with zero liquid discharge and active environmental safeguards.`;
      } else {
        description = `${dbNode.name} (${dbNode.code}) is an authorized operational site under ${parentBu?.name || 'MEIL Enterprise'} tracking real-time energy, fuel, water, waste, and workforce metrics in accordance with SEBI BRSR statutory principles.`;
      }
    }

    // Dynamic Metrics from real data points:
    const getVal = (codePrefix) => {
      const match = dataPoints.find(d => d.metric_code && d.metric_code.toUpperCase().startsWith(codePrefix.toUpperCase()));
      if (!match) return null;
      return (match.value_numeric !== null && match.value_numeric !== undefined) ? Number(match.value_numeric) : (match.value_text || null);
    };

    let metrics = [];
    if (isSeededOdisha && dataPoints.length === 0) {
      metrics = hero.metrics;
    } else {
      const mElec = getVal('ENV-ENERGY-001') || getVal('ENV-ENE');
      const mDiesel = getVal('ENV-ENERGY-002') || getVal('ENV-ENERGY-003');
      const mWater = getVal('ENV-WATER-001') || getVal('ENV-WAT');
      const mWorkforce = getVal('SOC-WORK') || getVal('SOC') || (filledCount > 0 ? 120 : null);

      metrics = [
        {
          label: isSolar ? 'Clean Power Export' : isTunnel ? 'Underground Power Draw' : 'Grid Electricity Draw',
          value: mElec !== null ? Number(mElec).toLocaleString('en-IN') : '--',
          unit: isSolar ? 'MWh' : 'kWh',
          icon: Zap,
          trend: mElec !== null ? -5 : 0
        },
        {
          label: isTunnel ? 'Machinery Diesel' : 'Auxiliary Diesel',
          value: mDiesel !== null ? Number(mDiesel).toLocaleString('en-IN') : '--',
          unit: 'L',
          icon: Flame,
          trend: mDiesel !== null ? -8 : 0
        },
        {
          label: isTunnel ? 'Excavation & Dust Water' : 'Water Consumed',
          value: mWater !== null ? Number(mWater).toLocaleString('en-IN') : '--',
          unit: 'kL',
          icon: Droplets,
          trend: mWater !== null ? -12 : 0
        },
        {
          label: 'Workers On-site',
          value: mWorkforce !== null ? String(mWorkforce) : '--',
          unit: 'persons',
          icon: Users,
          trend: mWorkforce !== null ? 2 : 0
        },
      ];
    }

    // Dynamic ESG Sections & Percentages
    let esgSections = [];
    if (isSeededOdisha && dataPoints.length === 0) {
      esgSections = hero.esgSections;
    } else {
      const hasEnergy = getVal('ENV-ENERGY-001') !== null || getVal('ENV-ENERGY-002') !== null;
      const hasWater = getVal('ENV-WATER-001') !== null;
      const hasWaste = getVal('ENV-WASTE-001') !== null;
      const hasSocial = filledCount >= 4;
      const hasEnv = filledCount >= 6;

      const energyPct = hasEnergy ? (getVal('ENV-ENERGY-001') && getVal('ENV-ENERGY-002') ? 100 : 50) : 0;
      const waterPct = hasWater ? 100 : 0;
      const wastePct = hasWaste ? 100 : 0;
      const socialPct = hasSocial ? 100 : 0;
      const envPct = hasEnv ? 100 : 0;

      const energyItems = isTunnel ? ['Underground Power & Ventilation', 'Excavation Fleet Diesel'] : isSolar ? ['Solar Power Generation Feed', 'Auxiliary Inverter Power'] : ['Grid Power Draw', 'Auxiliary Diesel & Fuel'];
      const waterItems = isTunnel ? ['Site Slurry & Dust Suppression', 'Domestic Water Withdrawal'] : isSolar ? ['Robotic & Manual Cleaning Water', 'Domestic Consumption'] : ['Site Water Withdrawal', 'Dust Control & Domestic'];
      const wasteItems = isTunnel ? ['Tunnel Muck & Solid Rock Waste', 'Used Hydraulic Oil & Sludge'] : isSolar ? ['Defective Solar Modules', 'Packaging & Pallet Waste'] : ['Solid Operational Waste', 'Hazardous Waste Sludge'];
      const socialItems = isTunnel ? ['Underground Safe Person-Hours', 'Zero LTIs & Dust Health Checks'] : ['Safe Operational Hours', 'Zero LTIs', 'PPE Audits'];
      const envItems = isTunnel ? ['Spoil Runoff & Sediment Control', 'Tunnel Exhaust Air Monitoring'] : isSolar ? ['Topsoil Preservation', 'Greenbelt Flora Survey'] : ['Site Runoff & Air Quality', 'Greenbelt Stewardship'];

      esgSections = [
        { id: 'energy', label: 'Energy & Fuel', items: energyItems, status: energyPct === 100 ? 'DONE' : energyPct > 0 ? 'PARTIAL' : 'PENDING', pct: energyPct },
        { id: 'water',  label: 'Water Stewardship', items: waterItems, status: waterPct === 100 ? 'DONE' : 'PENDING', pct: waterPct },
        { id: 'waste',  label: 'Waste & Circularity', items: wasteItems, status: wastePct === 100 ? 'DONE' : 'PENDING', pct: wastePct },
        { id: 'social', label: 'Workforce & Safety', items: socialItems, status: socialPct === 100 ? 'DONE' : 'PENDING', pct: socialPct },
        { id: 'env',    label: 'Biodiversity & Land', items: envItems, status: envPct === 100 ? 'DONE' : 'PENDING', pct: envPct },
      ];
    }

    // Evidence documents: use projectEvidence if present, else fallback for demo seeded project
    let evidenceList = [];
    if (projectEvidence.length > 0) {
      evidenceList = projectEvidence.map(ev => ({
        id: ev.id,
        name: ev.original_name,
        type: ev.mime_type?.includes('pdf') ? 'PDF' : ev.mime_type?.includes('image') ? 'IMAGE' : 'DOC',
        size: ev.file_size ? `${(ev.file_size / (1024 * 1024)).toFixed(1)} MB` : '1.2 MB',
        uploaded: ev.created_at ? new Date(ev.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent',
        field: ev.bill_type || ev.doc_type || 'Operational Evidence'
      }));
    } else if (isSeededOdisha) {
      evidenceList = hero.evidence;
    }

    return {
      id: dbNode.id,
      code: dbNode.code,
      name: dbNode.name,
      period: 'FY 2025–26',
      status: derivedStatus,
      coverage,
      evidenceCount: evidenceCountStr,
      bu: parentBu?.name || 'Infrastructure & Engineering BU',
      subsidiary: parentSub?.name || 'Aarohan Enterprise Ltd.',
      type: dbNode.project_type || (isTunnel ? 'Heavy Tunnelling & Civil' : 'Infrastructure Operations'),
      location: dbNode.location_state ? `${dbNode.location_state}, India` : 'India',
      stage: 'Operations',
      description,
      activities,
      template,
      lastUpdated: isSeededOdisha ? hero.lastUpdated : (dataPoints.length > 0 ? 'Today · Active' : 'Not submitted yet'),
      submittedBy: isSeededOdisha ? hero.submittedBy : (user?.name ? `${user.name} (${user.role?.replace('_', ' ')})` : 'Project Site Engineer'),
      esgSections,
      evidence: evidenceList,
      metrics,
      reviews: isSeededOdisha ? hero.reviews : [],
      pipeline: isSeededOdisha ? hero.pipeline : [
        { label: 'Project Data Submitted', status: dataPoints.length > 0 ? 'done' : 'pending', time: dataPoints.length > 0 ? 'Submitted' : 'Pending Data Entry' },
        { label: 'BU Admin Review', status: derivedStatus === 'IN_REVIEW' ? 'active' : (derivedStatus === 'APPROVED' ? 'done' : 'pending'), time: 'Pending' },
        { label: 'Project Emission Calculation', status: derivedStatus === 'APPROVED' ? 'done' : 'pending', time: 'Pending Approval' },
        { label: 'BU Aggregation', status: 'pending', time: 'Pending' },
        { label: 'Corporate Consolidation', status: 'pending', time: 'Pending' },
      ],
      submissionId: submissionPack?.id,
      submissionNotes: submissionPack?.notes,
      dataPoints,
    };
  }, [dbNode, nodes, projectId, submissionPack, projectEvidence, user]);

  const statusCfg = STATUS_CONFIG[project.status] || STATUS_CONFIG.DRAFT;


  return (
    <div className="page-content anim-fade-up">
      {/* ── Breadcrumb + Header ── */}
      <div>
        <button
          onClick={() => navigate('/projects')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13, marginBottom: 16, padding: 0 }}
        >
          <ArrowLeft size={14} /> Projects
        </button>

        {actionNotice && (
          <div style={{
            marginBottom: 14, padding: '10px 14px', borderRadius: 8, background: '#EFF6FF',
            border: '1px solid #BFDBFE', color: '#1D4ED8', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8
          }}>
            <Sparkles size={15} color="#2563EB" />
            <span>{actionNotice}</span>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
                {project.name}
              </h1>
              <span className={`badge ${statusCfg.badgeClass}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <span className={`status-dot ${statusCfg.dot}`} style={{ width: 5, height: 5 }} />
                {statusCfg.label}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12, color: 'var(--text-muted)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Building2 size={12} /> {project.bu}
              </span>
              <span style={{ color: 'var(--border)' }}>·</span>
              <span>{project.subsidiary}</span>
              <span style={{ color: 'var(--border)' }}>·</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <MapPin size={12} /> {project.location}
              </span>
              <span style={{ color: 'var(--border)' }}>·</span>
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: 11 }}>{project.code}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexShrink: 0, position: 'relative' }}>
            {/* Rolling Refresh Button */}
            <button
              onClick={handleRefresh}
              className={`btn btn-secondary btn-sm ${isRefreshing ? 'reloading' : ''}`}
              title="Refresh project data"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
            >
              <RefreshCw size={13} className={isRefreshing ? 'spin' : ''} />
              <span>Refresh</span>
            </button>

            <button
              onClick={() => navigate(`/collection?nodeId=${project.id}&periodId=FY2025-26-M03`)}
              className="btn btn-primary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Zap size={13} /> Open ESG Form
            </button>

            {/* 3-Dot Action Button & Dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                className="btn btn-secondary btn-sm"
                style={{ padding: '6px 9px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onClick={() => setShowActionMenu(v => !v)}
                title="Project Quick Actions"
              >
                <MoreHorizontal size={14} />
              </button>

              {showActionMenu && (
                <>
                  <div
                    style={{ position: 'fixed', inset: 0, zIndex: 100 }}
                    onClick={() => setShowActionMenu(false)}
                  />
                  <div style={{
                    position: 'absolute', right: 0, top: '100%', marginTop: 6,
                    width: 260, background: '#FFFFFF', borderRadius: 8,
                    border: '1px solid #E2E8F0', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
                    zIndex: 101, overflow: 'hidden', padding: '4px 0'
                  }}>
                    <div style={{ padding: '8px 14px', fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Project Actions
                    </div>

                    <button
                      onClick={() => { setShowActionMenu(false); setShowChecklistModal(true); }}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                        padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: 13, color: '#334155', textAlign: 'left', transition: 'background 0.15s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <ListChecks size={15} color="#2563EB" />
                      <div>
                        <div style={{ fontWeight: 600 }}>Pre-Submission Checklist</div>
                        <div style={{ fontSize: 11, color: '#94A3B8' }}>Verify readiness &amp; blockers</div>
                      </div>
                    </button>

                    <button
                      onClick={() => { setShowActionMenu(false); navigate('/evidence'); }}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                        padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: 13, color: '#334155', textAlign: 'left', transition: 'background 0.15s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <UploadCloud size={15} color="#059669" />
                      <div>
                        <div style={{ fontWeight: 600 }}>Upload Supporting Evidence</div>
                        <div style={{ fontSize: 11, color: '#94A3B8' }}>Invoices, meter logs &amp; chits</div>
                      </div>
                    </button>

                    <button
                      onClick={() => { setShowActionMenu(false); handleRefresh(); }}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                        padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: 13, color: '#334155', textAlign: 'left', transition: 'background 0.15s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <RefreshCw size={15} color="#D97706" />
                      <div>
                        <div style={{ fontWeight: 600 }}>Recalculate ESG Footprint</div>
                        <div style={{ fontSize: 11, color: '#94A3B8' }}>Update Scope 1 &amp; 2 values</div>
                      </div>
                    </button>

                    <button
                      onClick={handleExportCSV}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                        padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: 13, color: '#334155', textAlign: 'left', transition: 'background 0.15s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <FileDown size={15} color="#4F46E5" />
                      <div>
                        <div style={{ fontWeight: 600 }}>Export Project Summary (CSV)</div>
                        <div style={{ fontSize: 11, color: '#94A3B8' }}>Download local report data</div>
                      </div>
                    </button>

                    <div style={{ height: 1, background: '#F1F5F9', margin: '4px 0' }} />

                    <button
                      onClick={() => { setShowActionMenu(false); navigate('/metrics'); }}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                        padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: 13, color: '#334155', textAlign: 'left', transition: 'background 0.15s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <Sliders size={15} color="#64748B" />
                      <div>
                        <div style={{ fontWeight: 600 }}>View BRSR Parameters</div>
                        <div style={{ fontSize: 11, color: '#94A3B8' }}>Indicator reporting rules</div>
                      </div>
                    </button>

                    <button
                      onClick={() => { setShowActionMenu(false); setShowSiteDetailsModal(true); }}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                        padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: 13, color: '#334155', textAlign: 'left', transition: 'background 0.15s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <Info size={15} color="#0891B2" />
                      <div>
                        <div style={{ fontWeight: 600 }}>Project Site Details</div>
                        <div style={{ fontSize: 11, color: '#94A3B8' }}>Metadata &amp; parameters</div>
                      </div>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── SaaS Value Proposition / Responsibility Split Banner ── */}
        <div style={{
          marginTop: 16,
          padding: '12px 16px',
          borderRadius: 'var(--r-md)',
          background: 'var(--accent-subtle)',
          border: '1px solid var(--accent-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--text-primary)' }}>YOU PROVIDE:</strong> Raw operational facts & verified evidence documents
              <span style={{ margin: '0 10px', color: 'var(--border)' }}>|</span>
              <strong style={{ color: 'var(--accent)' }}>SYSTEM CALCULATES:</strong> Emission factors, Scope 1 & 2 GHG emissions, hierarchical roll-ups
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className={`badge ${project.coverage > 0 ? 'badge-blue' : 'badge-gray'}`} style={{ fontSize: 11 }}>
              Completion: {project.coverage}%
            </span>
            <span className="badge badge-gray" style={{ fontSize: 11 }}>
              Evidence: {project.evidenceCount}
            </span>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="tabs" style={{ marginBottom: -8, marginTop: 14 }}>
        {TABS.map(t => (
          <button key={t} className={`tab-btn ${activeTab === t ? 'active' : ''}`} onClick={() => setActiveTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      {activeTab === 'Overview' && <OverviewTab project={project} navigate={navigate} />}
      {activeTab === 'Data Collection' && <EsgDataTab project={project} selectedSection={selectedSection} setSelectedSection={setSelectedSection} navigate={navigate} />}
      {activeTab === 'Evidence' && <EvidenceTab project={project} navigate={navigate} />}
      {activeTab === 'Reviews' && <ReviewsTab project={project} navigate={navigate} refetchSubmission={refetchSubmission} user={user} />}
      {activeTab === 'Calculations' && <PipelineTab project={project} navigate={navigate} />}

      {/* ── Pre-Submission Checklist Modal ── */}
      <Modal
        isOpen={showChecklistModal}
        onClose={() => setShowChecklistModal(false)}
        maxWidth="600px"
      >
        <div className="card" style={{ border: 'none', boxShadow: 'none' }}>
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: '#EFF6FF', border: '1px solid #BFDBFE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ListChecks size={18} color="#2563EB" />
              </div>
              <div>
                <div className="card-title" style={{ fontSize: 16 }}>Pre-Submission Readiness Checklist</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{project.name} · {project.code}</div>
              </div>
            </div>
            <button
              onClick={() => setShowChecklistModal(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}
            >
              <X size={18} />
            </button>
          </div>

          <div className="card-body" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Progress Bar */}
            <div style={{ padding: 14, borderRadius: 8, background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Overall Submission Readiness</span>
                <span style={{ fontWeight: 700, color: project.coverage >= 80 ? 'var(--success)' : '#2563EB' }}>{project.coverage}% Complete</span>
              </div>
              <div style={{ width: '100%', height: 8, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.max(4, project.coverage)}%`, background: project.coverage >= 80 ? 'var(--success)' : '#2563EB', borderRadius: 99, transition: 'width 0.4s ease' }} />
              </div>
              <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                <span>{project.coverage === 0 ? 'No data entered yet' : `${project.dataPoints?.length || 0} operational fields captured`}</span>
                <span>Target: 100% before BU submission</span>
              </div>
            </div>

            {/* Checklist Items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                {
                  title: 'Core Operational Data Input',
                  desc: project.coverage > 0 ? `${project.dataPoints?.length || 0} data points entered in ESG form` : 'Enter fuel, electricity, water, and workforce numbers',
                  done: project.coverage > 0,
                  action: () => { setShowChecklistModal(false); navigate(`/collection?nodeId=${project.id}&periodId=FY2025-26-M03`); },
                  actionLabel: 'Open Form'
                },
                {
                  title: 'Primary Evidence Vouchers Attached',
                  desc: `${project.evidence.length} evidence documents uploaded and cryptographically indexed`,
                  done: project.evidence.length > 0,
                  action: () => { setShowChecklistModal(false); navigate('/evidence'); },
                  actionLabel: 'Evidence Vault'
                },
                {
                  title: 'Maker-Checker Segregation Verified',
                  desc: 'Site data creator is segregated from BU reviewer role',
                  done: true,
                },
                {
                  title: 'Deterministic Emission Factors Assigned',
                  desc: 'SEBI BRSR Core India emission factors linked to entered fuels',
                  done: project.coverage > 50,
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 14px', borderRadius: 8, border: '1px solid var(--border)',
                    background: item.done ? '#F0FDF4' : 'var(--bg-white)',
                    borderColor: item.done ? '#BBF7D0' : 'var(--border)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ marginTop: 2 }}>
                      {item.done ? <CheckCircle2 size={18} color="#16A34A" /> : <Circle size={18} color="#94A3B8" />}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{item.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{item.desc}</div>
                    </div>
                  </div>
                  {item.action && (
                    <button
                      onClick={item.action}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: 11, padding: '4px 8px', flexShrink: 0 }}
                    >
                      {item.actionLabel}
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
              <button
                onClick={() => setShowChecklistModal(false)}
                className="btn btn-secondary btn-sm"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowChecklistModal(false);
                  navigate(`/collection?nodeId=${project.id}&periodId=FY2025-26-M03`);
                }}
                className="btn btn-primary btn-sm"
              >
                Continue Data Entry →
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* ── Project Site Details Modal ── */}
      <Modal
        isOpen={showSiteDetailsModal}
        onClose={() => setShowSiteDetailsModal(false)}
        maxWidth="560px"
      >
        <div className="card" style={{ border: 'none', boxShadow: 'none' }}>
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: '#ECFEFF', border: '1px solid #A5F3FC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Info size={18} color="#0891B2" />
              </div>
              <div>
                <div className="card-title" style={{ fontSize: 16 }}>Project Site Parameters &amp; Metadata</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>BRSR Statutory Hierarchy Node</div>
              </div>
            </div>
            <button
              onClick={() => setShowSiteDetailsModal(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}
            >
              <X size={18} />
            </button>
          </div>

          <div className="card-body" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { label: 'Project Name', value: project.name },
                { label: 'Project Code', value: project.code, isMono: true },
                { label: 'Operational Type', value: project.type },
                { label: 'Current Lifecycle Stage', value: project.stage },
                { label: 'Location & State', value: project.location },
                { label: 'Reporting Period', value: project.period },
                { label: 'Business Unit', value: project.bu },
                { label: 'Legal Subsidiary', value: project.subsidiary },
                { label: 'Assigned ESG Template', value: project.template },
                { label: 'Data Coverage', value: `${project.coverage}%` },
                { label: 'Evidence Attached', value: project.evidenceCount },
                { label: 'Current Workflow Status', value: project.status.replace('_', ' ') },
              ].map((f, i) => (
                <div key={i} style={{ padding: '8px 12px', borderRadius: 6, background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 2 }}>{f.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', fontFamily: f.isMono ? 'JetBrains Mono, monospace' : 'inherit' }}>{f.value}</div>
                </div>
              ))}
            </div>

            <div style={{ padding: 12, borderRadius: 8, background: '#F8FAFC', border: '1px solid #E2E8F0', fontSize: 12, color: '#475569' }}>
              <strong>Audit Trail Notice:</strong> All metrics, boundary allocations, and evidence records under this node are tamper-evident and compliant with SEBI BRSR Core circular SEBI/HO/CFD/CFD-SEC-2/P/CIR/2023/122.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
              <button
                onClick={handleExportCSV}
                className="btn btn-secondary btn-sm"
              >
                <FileDown size={13} /> Export Metadata CSV
              </button>
              <button
                onClick={() => setShowSiteDetailsModal(false)}
                className="btn btn-primary btn-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ── Overview Tab ── */
function OverviewTab({ project, navigate }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>
      {/* Left */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Project info */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Project Overview</span>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.65 }}>{project.description}</p>
            <div className="divider" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {[
                { label: 'Project Type', value: project.type },
                { label: 'Stage', value: project.stage },
                { label: 'Location', value: project.location },
                { label: 'Reporting Period', value: project.period },
              ].map(item => (
                <div key={item.label}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>{item.value}</div>
                </div>
              ))}
            </div>
            <div className="divider" />
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 8 }}>Project Activities</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {project.activities.map(a => (
                  <span key={a} className="badge badge-gray">{a}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ESG snapshot */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">ESG Data Coverage</span>
            <button onClick={() => navigate(`/collection?nodeId=${project.id}&periodId=`)} style={{ fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>
              View ESG Data →
            </button>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {project.esgSections.map(sec => {
              const s = SECTION_STATUS[sec.status];
              return (
                <div key={sec.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 'var(--r-md)', border: `1px solid ${s.border}`, background: s.bg }}>
                  <span style={{ fontSize: 14, color: s.color, flexShrink: 0 }}>{s.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{sec.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sec.items.join(' · ')}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 60, height: 4, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${sec.pct}%`, background: s.color, borderRadius: 99 }} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: s.color, width: 32 }}>{sec.pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right sidebar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Metrics */}
        <div className="card">
          <div className="card-header"><span className="card-title">Key Metrics</span></div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {project.metrics.map(m => {
              const Icon = m.icon;
              return (
                <div key={m.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 'var(--r-md)', background: 'var(--bg-subtle)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={13} color="var(--text-muted)" />
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.label}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{m.value} <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)' }}>{m.unit}</span></div>
                    </div>
                  </div>
                  {m.trend !== 0 && (
                    <span style={{ fontSize: 11, fontWeight: 600, color: m.trend > 0 ? 'var(--danger)' : 'var(--success)' }}>
                      {m.trend > 0 ? '+' : ''}{m.trend}%
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Template */}
        <div className="card">
          <div className="card-header"><span className="card-title">ESG Template</span></div>
          <div className="card-body">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)' }}>
              <FileText size={16} color="var(--accent)" />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{project.template}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Assigned template</div>
              </div>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="card">
          <div className="card-header"><span className="card-title">Details</span></div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'Last updated', value: project.lastUpdated },
              { label: 'Submitted by', value: project.submittedBy },
              { label: 'Period', value: project.period },
            ].map(d => (
              <div key={d.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{d.label}</span>
                <span style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 500 }}>{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── ESG Data Tab ── */
function EsgDataTab({ project, selectedSection, setSelectedSection, navigate }) {
  const activeSec = selectedSection || project.esgSections[0]?.id;
  const sec = project.esgSections.find(s => s.id === activeSec) || project.esgSections[0];

  // Real data points from API (keyed by metric_code)
  const apiDataMap = {};
  (project.dataPoints || []).forEach(dp => {
    apiDataMap[dp.metric_code] = dp;
  });

  const isTunnel = project.type?.toLowerCase().includes('tunnel') || project.name?.toLowerCase().includes('tunnel');
  const isSolar = project.type?.toLowerCase().includes('solar');
  const isSeeded = project.code === 'PRJ-ODISHA-SOLAR';

  // Base field schema adapting to project operational nature
  const FIELDS = {
    energy: [
      {
        id: 'diesel',
        metricCode: 'ENV-ENERGY-002',
        label: isTunnel ? 'Auxiliary & Machinery Diesel' : (isSolar ? 'Auxiliary Diesel Consumption' : 'Auxiliary Fuel / Diesel Consumption'),
        desc: isTunnel ? 'Total diesel consumed by excavators, tunnel machinery, and backup DG sets.' : 'Total diesel consumed by backup generators and site machinery during the reporting period.',
        value: isSeeded ? '12,450' : '',
        unit: 'litres',
        source: isSeeded ? 'IOCL Invoices / Fuel Register' : 'Site Fuel Register / Delivery Vouchers',
        evidence: isSeeded ? 'DIESEL-LOGBOOK-IOCL-MAR2026.pdf' : null,
        status: isSeeded ? 'filled' : 'empty'
      },
      {
        id: 'grid_draw',
        metricCode: 'ENV-ENERGY-001',
        label: isTunnel ? 'Underground Grid Power & Ventilation' : (isSolar ? 'Auxiliary Grid Electricity Drawl' : 'Auxiliary Grid Electricity Drawl'),
        desc: isTunnel ? 'Grid electricity drawn for ventilation fans, tunnel lighting, and drainage pumping.' : 'Grid electricity drawn for auxiliary services, SCADA and site equipment.',
        value: isSeeded ? '64,500' : '',
        unit: 'kWh',
        source: isSeeded ? 'Discom Import Bill' : 'Discom Utility Monthly Bill',
        evidence: isSeeded ? 'GRID-INVOICE-ODISHA-MAR2026.pdf' : null,
        status: isSeeded ? 'filled' : 'empty'
      },
      {
        id: 'fleet_diesel',
        metricCode: 'ENV-ENERGY-003',
        label: isTunnel ? 'Muck Haulage & Transit Fleet Diesel' : 'Mobile Fleet & Machinery Diesel',
        desc: isTunnel ? 'Diesel consumed by heavy dumper trucks, spoil haulage, and site transport.' : 'Diesel consumed by earthmoving, transit and maintenance fleet at site.',
        value: isSeeded ? '28,300' : '',
        unit: 'litres',
        source: isSeeded ? 'Transit Fleet Dispatch Logs' : 'Fleet Logbook / Fuel Slips',
        evidence: isSeeded ? 'DIESEL-LOGBOOK-IOCL-MAR2026.pdf' : null,
        status: isSeeded ? 'filled' : 'empty'
      },
    ],
    water: [
      {
        id: 'water_robotic',
        metricCode: 'ENV-WATER-001',
        label: isTunnel ? 'Construction & Dust Suppression Water' : (isSolar ? 'Water Withdrawal (Borewell)' : 'Site Water Withdrawal'),
        desc: isTunnel ? 'Groundwater or tanker water extracted for drilling slurry, concrete curing, and dust suppression.' : 'Groundwater extracted for cleaning, dust control and domestic use.',
        value: isSeeded ? '9,150' : '',
        unit: 'kL',
        source: isSeeded ? 'CGWA Borewell Telemetry Log' : 'Flow Meter / Water Tanker Receipts',
        evidence: isSeeded ? 'WATER-EXTRACTION-CGWA-METER.pdf' : null,
        status: isSeeded ? 'filled' : 'empty'
      },
    ],
    waste: [
      {
        id: 'waste_haz',
        metricCode: 'ENV-WASTE-001',
        label: isTunnel ? 'Hazardous Waste (Oils & Sludge)' : 'Hazardous Waste (Used Oil & Sludge)',
        desc: isTunnel ? 'Used compressor oils, hydraulic fluids, and grease disposed through SPCB recyclers.' : 'Used transformer oils and workshop sludge dispatched to SPCB re-refiners.',
        value: isSeeded ? '1.85' : '',
        unit: 'tonnes',
        source: isSeeded ? 'SPCB Form 10 Manifest' : 'SPCB Hazardous Waste Manifest',
        evidence: isSeeded ? 'HAZARDOUS-WASTE-MANIFEST-SPCB.pdf' : null,
        status: isSeeded ? 'filled' : 'empty'
      },
    ],
    social: [
      {
        id: 'workforce',
        metricCode: null,
        label: 'Total Site Workforce',
        desc: isTunnel ? 'Underground mining workers, civil engineers, safety marshals, and contractor staff.' : 'Direct staff, control room engineers, and maintenance contractor workforce.',
        value: isSeeded ? '184' : '',
        unit: 'persons',
        source: 'Biometric Access Gate Records',
        evidence: null,
        status: isSeeded ? 'filled' : 'empty'
      },
      {
        id: 'safe_hours',
        metricCode: null,
        label: 'Cumulative Safe Work Hours',
        desc: 'Total cumulative operational hours without Lost Time Injury (LTI).',
        value: isSeeded ? '184,000' : '',
        unit: 'hours',
        source: 'Monthly Safety Audit',
        evidence: null,
        status: isSeeded ? 'filled' : 'empty'
      },
    ],
    env: [
      {
        id: 'topsoil',
        metricCode: null,
        label: isTunnel ? 'Spoil Dumping & Slope Stabilization Area' : (isSolar ? 'Conserved Topsoil Area' : 'Managed Environmental Buffer Area'),
        desc: isTunnel ? 'Site land designated for approved rock spoil disposal and slope vegetative stabilization.' : 'Native ground cover preserved to prevent arid dust erosion.',
        value: isSeeded ? '450' : '',
        unit: 'Acres',
        source: 'EIA Environmental Audit',
        evidence: null,
        status: isSeeded ? 'filled' : 'empty'
      },
    ],
  };

  // Merge real API values if available
  Object.values(FIELDS).flat().forEach(f => {
    if (f.metricCode && apiDataMap[f.metricCode]) {
      const dp = apiDataMap[f.metricCode];
      f.value = dp.value_numeric !== null && dp.value_numeric !== undefined ? Number(dp.value_numeric).toLocaleString() : (dp.value_text || '');
      f.unit = dp.unit || f.unit;
      f.apiValue = true;
      f.status = 'filled';
    }
  });

  const fields = FIELDS[activeSec] || [];

  const hasRealData = project.dataPoints && project.dataPoints.length > 0;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20, minHeight: 600 }}>
      {/* Left nav */}
      <div className="card" style={{ height: 'fit-content', position: 'sticky', top: 16 }}>
        <div className="card-body" style={{ padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {hasRealData && (
            <div style={{ padding: '8px 10px', marginBottom: 8, borderRadius: 8, background: '#ecfdf5', border: '1px solid #bbf7d0', fontSize: 11, color: '#15803d', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle2 size={12} />
              Live data from backend
            </div>
          )}
          {project.esgSections.map(sec => {
            const s = SECTION_STATUS[sec.status];
            return (
              <button
                key={sec.id}
                onClick={() => setSelectedSection(sec.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px',
                  borderRadius: 'var(--r-md)', border: '1px solid',
                  borderColor: activeSec === sec.id ? 'var(--accent)' : 'transparent',
                  background: activeSec === sec.id ? 'var(--accent-subtle)' : 'transparent',
                  cursor: 'pointer', width: '100%', textAlign: 'left',
                  transition: 'all 0.12s',
                }}
              >
                <span style={{ fontSize: 13, color: s.color }}>{s.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: activeSec === sec.id ? 'var(--accent)' : 'var(--text-primary)' }}>{sec.label}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{sec.pct}% complete</div>
                </div>
              </button>
            );
          })}
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
            <button
              onClick={() => navigate(`/collection?nodeId=${project.id}&periodId=FY2025-26-M03`)}
              className="btn btn-primary btn-sm"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              <Zap size={12} /> Open ESG Form
            </button>
          </div>
        </div>
      </div>

      {/* Right: fields */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{sec?.label}</h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
              {hasRealData ? `${project.dataPoints.length} data points loaded from database` : 'Required ESG data for this section'}
            </p>
          </div>
        </div>

        {fields.length === 0 ? (
          <div className="empty-state" style={{ padding: 40 }}>
            <div className="empty-state-title">No fields required</div>
            <div className="empty-state-desc">This section has no required data for this project type.</div>
          </div>
        ) : fields.map((field, i) => (
          <div key={field.id} className="card">
            <div className="card-body">
              <FormField field={field} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


function FormField({ field }) {
  const [showWhy, setShowWhy] = useState(false);
  const [value, setValue] = useState(field.value);

  useEffect(() => {
    setValue(field.value || '');
  }, [field.value]);

  return (
    <div>
      {/* Header */}
      <div className="field-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="field-label">{field.label}</div>
            {field.status === 'filled' && <Check size={13} color="var(--success)" />}
            {field.status === 'empty'  && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 99, background: 'var(--danger-subtle)', color: 'var(--danger)', border: '1px solid var(--danger-border)', fontWeight: 600 }}>Required</span>}
            {field.apiValue && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 99, background: '#ecfdf5', color: '#15803d', border: '1px solid #bbf7d0', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 3 }}><CheckCircle2 size={9} /> DB Record</span>}
            {field.metricCode && <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{field.metricCode}</span>}
          </div>
          <div className="field-desc">{field.desc}</div>
        </div>
        <button className="why-required-btn" onClick={() => setShowWhy(w => !w)}>
          <Info size={12} /> Why is this required?
        </button>
      </div>

      {showWhy && (
        <div className="why-popover" style={{ marginBottom: 12 }}>
          <h4>Why this data matters</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
            This field is used as a raw input for the project's energy and emissions calculations under the configured BRSR methodology. It feeds directly into Scope 1 GHG calculations.
          </p>
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4 }}>What should I upload?</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              Fuel invoices, delivery notes, fuel logs or approved consumption records signed by the site manager.
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="form-group">
          <label className="form-label" style={{ fontSize: 12 }}>
            Value
            {field.apiValue && <span style={{ marginLeft: 6, fontSize: 10, color: '#15803d', fontWeight: 600 }}>← actual DB value</span>}
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              className="form-control"
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder="Enter value..."
              style={{
                fontSize: 15, fontWeight: 700,
                background: field.apiValue ? '#f0fdf4' : undefined,
                borderColor: field.apiValue ? '#86efac' : undefined,
                color: field.apiValue ? '#15803d' : undefined,
              }}
              readOnly={!!field.apiValue}
            />
            <span style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0, fontWeight: 500 }}>{field.unit}</span>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label" style={{ fontSize: 12 }}>Source</label>
          <select className="form-control" defaultValue={field.source}>
            <option>{field.source || 'Fuel Register'}</option>
            <option>Supplier Invoice</option>
            <option>Estimated</option>
          </select>
        </div>
      </div>


      {/* Evidence */}
      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6 }}>Evidence</div>
        {field.evidence ? (
          <div className="evidence-file-row">
            <FileText size={16} color="var(--accent)" className="evidence-file-icon" />
            <div style={{ flex: 1 }}>
              <div className="evidence-file-name">{field.evidence}</div>
              <div className="evidence-file-meta">Uploaded</div>
            </div>
            <button className="btn btn-secondary btn-sm" style={{ padding: '4px 10px' }}>
              <Eye size={12} /> Preview
            </button>
          </div>
        ) : (
          <div className="upload-zone" style={{ padding: '16px', textAlign: 'center' }}>
            <Upload size={16} style={{ margin: '0 auto 6px', color: 'var(--text-muted)' }} />
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Drop file here or <span style={{ color: 'var(--accent)', cursor: 'pointer' }}>browse</span></div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>PDF · XLSX · CSV</div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Evidence Tab ── */
function EvidenceTab({ project, navigate }) {
  const [previewDoc, setPreviewDoc] = useState(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Evidence Documentation</h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>{project.evidence.length} verified documents attached to operational data points</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => navigate('/evidence')} className="btn btn-secondary btn-sm">
            <ExternalLink size={13} /> Open Evidence Vault
          </button>
          <button onClick={() => navigate(`/collection?nodeId=${project.id}&periodId=FY2025-26-M03`)} className="btn btn-primary btn-sm">
            <Upload size={13} /> Upload New Evidence
          </button>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Document Name</th>
                <th>Format</th>
                <th>Operational Metric</th>
                <th>Verified Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {project.evidence.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-muted)' }}>
                    <FileText size={24} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.4 }} />
                    <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>No evidence documents attached yet</div>
                    <div style={{ fontSize: 12 }}>Upload bills, logbooks, or meter readings to establish audit trails for this project.</div>
                  </td>
                </tr>
              ) : (
                project.evidence.map(ev => (
                  <tr key={ev.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 'var(--r-md)', background: 'var(--accent-subtle)', border: '1px solid var(--accent-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <FileText size={14} color="var(--accent)" />
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{ev.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{ev.size} · SHA-256 Verified</div>
                        </div>
                      </div>
                    </td>
                    <td><span className="badge badge-blue">{ev.type}</span></td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{ev.field}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{ev.uploaded}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => setPreviewDoc(ev)} className="btn btn-secondary btn-sm" style={{ padding: '4px 8px', fontSize: 11 }}>
                          <Eye size={12} /> Inspect
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {previewDoc && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)',
          zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
        }}>
          <div className="card" style={{ width: 520, maxWidth: '95vw', maxHeight: '85vh', overflowY: 'auto' }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileText size={16} color="var(--accent)" />
                <span className="card-title">{previewDoc.name}</span>
              </div>
              <button onClick={() => setPreviewDoc(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={16} /></button>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ padding: 12, borderRadius: 'var(--r-md)', background: 'var(--bg-subtle)', border: '1px solid var(--border)', fontSize: 12 }}>
                <div><strong>Linked Parameter:</strong> {previewDoc.field}</div>
                <div><strong>Size:</strong> {previewDoc.size}</div>
                <div><strong>Uploaded:</strong> {previewDoc.uploaded}</div>
                <div><strong>Integrity:</strong> Cryptographic Hash (SHA-256) checked</div>
              </div>
              <div style={{ height: 180, borderRadius: 'var(--r-md)', border: '1px dashed var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13, gap: 8 }}>
                <FileText size={32} color="var(--accent)" />
                <span>Audited Primary Evidence Document</span>
                <span style={{ fontSize: 11 }}>Digitally attested by Site Engineer</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button onClick={() => setPreviewDoc(null)} className="btn btn-secondary btn-sm">Close</button>
                <button onClick={() => { setPreviewDoc(null); navigate('/evidence'); }} className="btn btn-primary btn-sm">Open in Evidence Vault</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Reviews Tab ── */
function ReviewsTab({ project, navigate, refetchSubmission, user }) {
  const qc = useQueryClient();
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [actionDone, setActionDone] = useState(null);
  const [reviewsList, setReviewsList] = useState(project.reviews || []);

  const handleAction = async (type) => {
    setErrorMsg(null);
    const decision = type === 'approve' ? 'APPROVE' : 'RETURN';
    const auditComment = comment.trim() || (type === 'approve'
      ? 'Approved all operational data and verified meter evidence vouchers against utility statements.'
      : 'Requested revision on auxiliary diesel consumption records.');

    if (project.submissionId && user?.id) {
      setSubmitting(true);
      try {
        await workflowApi.review(project.submissionId, {
          decision,
          reviewer_id: user.id,
          comment: auditComment
        });

        const newRev = {
          id: `rev-${Date.now()}`,
          reviewer: user.full_name || 'Rajesh Sen (BU Admin)',
          action: type === 'approve' ? 'APPROVED' : 'CHANGES_REQUESTED',
          comment: auditComment,
          date: 'Just now',
          level: 'BU'
        };
        setReviewsList([newRev, ...reviewsList]);
        setActionDone(type);
        setComment('');

        // Invalidate backend caches to refresh everywhere
        if (refetchSubmission) refetchSubmission();
        qc.invalidateQueries({ queryKey: ['workflow-queue'] });
        qc.invalidateQueries({ queryKey: ['dashboard-summary'] });
        qc.invalidateQueries({ queryKey: ['org-nodes'] });
        qc.invalidateQueries({ queryKey: ['project-submission'] });
      } catch (err) {
        const detail = err.response?.data?.detail || err.message;
        if (detail && (detail.includes('Segregation of Duties') || detail.includes('cannot review or approve your own'))) {
          setErrorMsg('Segregation of Duties Guard (F16): You are logged in as the maker of this data pack. As required by statutory audit controls, makers cannot approve their own submissions. Please switch to the BU Reviewer persona (bu.admin@aarohan.in) to perform maker-checker approval.');
        } else {
          setErrorMsg(detail || 'Review action failed.');
        }
      } finally {
        setSubmitting(false);
      }
    } else {
      // Local fallback if no live submission ID
      const newRev = {
        id: `rev-${Date.now()}`,
        reviewer: user?.full_name || 'Rajesh Sen (BU Admin)',
        action: type === 'approve' ? 'APPROVED' : 'CHANGES_REQUESTED',
        comment: auditComment,
        date: 'Just now',
        level: 'BU'
      };
      setReviewsList([newRev, ...reviewsList]);
      setActionDone(type);
      setComment('');
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
      {/* History */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Review & Approval Audit Trail</h2>
          <span className="badge badge-blue" style={{ fontSize: 11 }}>Maker-Checker Four-Eye Control</span>
        </div>

        {actionDone && (
          <div style={{ padding: '12px 14px', borderRadius: 'var(--r-md)', background: actionDone === 'approve' ? 'var(--success-subtle)' : 'var(--warning-subtle)', border: `1px solid ${actionDone === 'approve' ? 'var(--success-border)' : 'var(--warning-border)'}`, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>{actionDone === 'approve' ? '✓ Submission approved! Calculation pipeline triggered & consolidation rolled up.' : '⚠ Changes requested. Status updated for Project User.'}</span>
            <button onClick={() => navigate('/workflow')} className="btn btn-secondary btn-sm" style={{ padding: '3px 8px', fontSize: 11 }}>
              View Workflow Queue →
            </button>
          </div>
        )}

        {errorMsg && (
          <div style={{ padding: '12px 14px', borderRadius: 'var(--r-md)', background: 'var(--danger-subtle)', border: '1px solid var(--danger-border)', fontSize: 13, color: 'var(--danger)', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ flex: 1, lineHeight: 1.5 }}>{typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg)}</div>
          </div>
        )}

        {reviewsList.length === 0 && (
          <div className="card" style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
            <Clock size={28} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
            <div>No previous audit reviews recorded yet.</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Submission is awaiting initial BU Reviewer evaluation.</div>
          </div>
        )}

        {reviewsList.map(r => (
          <div key={r.id} className="card">
            <div className="card-body">
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: r.action === 'APPROVED' ? 'var(--success-subtle)' : r.action === 'IN_REVIEW' ? 'var(--accent-subtle)' : 'var(--warning-subtle)', border: `1px solid ${r.action === 'APPROVED' ? 'var(--success-border)' : r.action === 'IN_REVIEW' ? 'var(--accent-border)' : 'var(--warning-border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {r.action === 'APPROVED' ? <Check size={14} color="var(--success)" /> : <Clock size={14} color="var(--accent)" />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{r.reviewer}</span>
                    <span className={`badge ${r.action === 'APPROVED' ? 'badge-green' : r.action === 'IN_REVIEW' ? 'badge-blue' : 'badge-amber'}`}>{r.action.replace('_', ' ')}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>{r.date}</span>
                  </div>
                  {r.comment && <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{r.comment}</p>}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Action panel */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="card">
          <div className="card-header"><span className="card-title">BU Review Actions</span></div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: 12 }}>Review Feedback / Audit Remarks</label>
              <textarea
                className="form-control"
                rows={3}
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Enter audit remarks or clarification notes..."
                style={{ resize: 'vertical', fontSize: 13 }}
                disabled={submitting}
              />
            </div>
            <button
              onClick={() => handleAction('approve')}
              className="btn btn-success w-full"
              style={{ justifyContent: 'center' }}
              disabled={submitting}
            >
              {submitting ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={14} />}
              Approve Submission
            </button>
            <button
              onClick={() => handleAction('reject')}
              className="btn btn-danger w-full"
              style={{ justifyContent: 'center' }}
              disabled={submitting}
            >
              <X size={14} /> Request Changes
            </button>
            <button onClick={() => navigate('/workflow')} className="btn btn-secondary w-full" style={{ justifyContent: 'center', fontSize: 12 }}>
              Inspect Workflow Inbox →
            </button>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><span className="card-title">Submission Info</span></div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'Submitted by', value: project.submittedBy },
              { label: 'Current Status', value: project.status.replace('_', ' ') },
              { label: 'Last updated', value: project.lastUpdated },
              { label: 'Coverage', value: `${project.coverage}%` },
              { label: 'Evidence Attached', value: project.evidenceCount || '0 / 6' },
              { label: 'Segregation of Duties', value: 'Active (Maker ≠ Reviewer)' },
            ].map(d => (
              <div key={d.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{d.label}</span>
                <span style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 500, textAlign: 'right' }}>{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Pipeline Tab ── */
function PipelineTab({ project, navigate }) {
  const isApproved = ['APPROVED', 'CALCULATED'].includes(project.status);
  const isSubmitted = ['SUBMITTED', 'IN_REVIEW'].includes(project.status);
  const hasCapturedData = (project.dataPoints && project.dataPoints.length > 0) || project.coverage > 0;
  const isSeeded = project.code === 'PRJ-ODISHA-SOLAR';

  const dynamicPipeline = [
    {
      label: 'Operational Data Captured',
      status: hasCapturedData ? 'done' : 'pending',
      time: hasCapturedData ? (project.lastUpdated || 'Today') : 'Pending Data Entry',
      detail: hasCapturedData ? `${project.dataPoints?.length || (isSeeded ? 5 : 0)} parameters entered with ${project.evidence.length} primary evidence vouchers.` : 'Enter operational facts via ESG form to start the audit pipeline.'
    },
    {
      label: 'Automated Gate Validation',
      status: project.coverage >= 80 ? 'done' : hasCapturedData ? 'active' : 'pending',
      time: project.coverage >= 80 ? 'Gate Passed (Zero Errors)' : hasCapturedData ? 'In Progress' : 'Pending Data Capture',
      detail: project.coverage >= 80 ? 'Plausibility, boundary checks, and meter variance validated.' : 'Plausibility checks run automatically as data points are saved.'
    },
    {
      label: 'BU Maker-Checker Review',
      status: isApproved ? 'done' : isSubmitted ? 'active' : 'pending',
      time: isApproved ? 'Approved by BU Admin' : 'Awaiting BU Review (Four-Eye Check)',
      detail: isApproved ? 'BU Admin digitally signed submission.' : 'Under review in BU workflow queue.'
    },
    {
      label: 'Scope 1 & 2 Deterministic Calculation',
      status: isApproved ? 'done' : 'pending',
      time: isApproved ? 'Calculated (CEA v2023 Factors)' : 'Pending BU Approval',
      detail: isApproved ? 'Scope 1 & Scope 2 derived using statutory emission factors.' : 'Triggered automatically upon BU approval.'
    },
    {
      label: 'Multi-Tier Boundary Consolidation',
      status: isApproved ? 'done' : 'pending',
      time: isApproved ? 'Consolidated to Enterprise Group' : 'Pending Calculation',
      detail: isApproved ? `Rolled up: ${project.name} → ${project.bu} → Group.` : 'Scheduled in consolidation engine.'
    },
    {
      label: 'SEBI BRSR Core Auto-Compilation',
      status: isApproved ? 'done' : 'pending',
      time: isApproved ? 'Ready for Report Snapshot' : 'Pending Consolidation',
      detail: isApproved ? 'Principle disclosures populated for statutory filing.' : 'Generated upon consolidation completion.'
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Calculation & Aggregation Pipeline</h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
            Automated bottom-up calculation & aggregation pipeline from Project to Group.
          </p>
        </div>
        <button onClick={() => navigate('/consolidation')} className="btn btn-primary btn-sm">
          Open Consolidation Engine →
        </button>
      </div>

      <div className="card">
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {dynamicPipeline.map((step, i) => (
            <div key={i}>
              <div className={`pipeline-step ${step.status}`}>
                <div className="pipeline-step-icon">
                  {step.status === 'done'    && <Check size={14} />}
                  {step.status === 'active'  && <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />}
                  {step.status === 'pending' && <Circle size={14} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{step.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{step.time}</div>
                  {step.detail && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{step.detail}</div>}
                </div>
                {step.status === 'done'   && <span className="badge badge-green" style={{ fontSize: 11 }}>Complete</span>}
                {step.status === 'active' && <span className="badge badge-blue" style={{ fontSize: 11 }}>Running</span>}
                {step.status === 'pending' && <span className="badge badge-gray" style={{ fontSize: 11 }}>Pending</span>}
              </div>
              {i < dynamicPipeline.length - 1 && (
                <div style={{ width: 1, height: 12, background: 'var(--border)', margin: '0 auto 0 15px' }} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Lineage */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Corporate ESG Data Lineage</span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Traceable from Group Disclosure down to Source Evidence</span>
        </div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
          {[
            { level: 'GROUP DISCLOSURE', label: 'Aarohan Infrastructure & Energy Group', value: '8,720.0 tCO₂e' },
            { level: 'SUBSIDIARY CONSOLIDATION', label: 'Aarohan Renewable Energy Pvt. Ltd.', value: '4,210.0 tCO₂e' },
            { level: 'BU AGGREGATION', label: project.bu, value: '1,950.0 tCO₂e' },
            { level: 'PROJECT EMISSION', label: project.name, value: isApproved ? '155.6 tCO₂e (Scope 1+2)' : '142.4 tCO₂e' },
            { level: 'RAW OPERATIONAL FACT', label: 'Auxiliary Diesel (12,450 L) · Grid Electricity (64,500 kWh)', value: 'CEA Grid Factor: 0.713' },
            { level: 'SOURCE EVIDENCE VOUCHER', label: 'GRID-INVOICE-ODISHA-MAR2026.pdf & DIESEL-LOGBOOK-IOCL-MAR2026.pdf', value: 'SHA-256 Validated' },
          ].map((node, i, arr) => (
            <div key={i} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div className="lineage-node" style={{ width: '100%', maxWidth: 520, background: i === 0 ? 'var(--accent-subtle)' : i === arr.length - 1 ? 'var(--success-subtle)' : 'var(--bg-card)' }}>
                <div className="lineage-node-label" style={{ fontWeight: 700, letterSpacing: '0.5px' }}>{node.level}</div>
                <div className="lineage-node-value">{node.value}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{node.label}</div>
              </div>
              {i < arr.length - 1 && (
                <div className="lineage-connector">↓</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
