import React, { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Edit2, MoreHorizontal, CheckCircle2, Clock, AlertTriangle,
  Circle, FileText, Shield, BarChart3, Activity, MapPin, Building2,
  Calendar, Tag, ChevronRight, Upload, Eye, Download, MessageSquare,
  TrendingUp, Zap, Droplets, Trash2, Users, Flame, ExternalLink,
  Check, X, RefreshCw, Info
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

import { useOrgNodes, useOrgPeriods, useProjectSubmission } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { workflowApi } from '../api/client';
import { useQueryClient } from '@tanstack/react-query';

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

  const project = useMemo(() => {
    const hero = PROJECTS_DATA['PRJ-ODISHA-SOLAR'];
    if (dbNode) {
      const parentBu = nodes.find(b => b.id === dbNode.parent_id);
      const parentSub = parentBu ? nodes.find(s => s.id === parentBu.parent_id) : null;
      // Derive status from real submission if available
      const subStatus = submissionPack?.status;
      const derivedStatus = subStatus ? (SUB_STATUS_MAP[subStatus] || 'DRAFT') : (dbNode.is_active ? 'APPROVED' : 'DRAFT');
      const dataPoints = submissionPack?.data_points || [];
      const coverage = dataPoints.length > 0 ? Math.min(100, Math.round((dataPoints.length / 7) * 100)) : 85;

      if (dbNode.code === 'PRJ-ODISHA-SOLAR' || dbNode.name?.includes('Odisha')) {
        return {
          ...hero,
          id: dbNode.id,
          code: dbNode.code,
          name: dbNode.name,
          bu: parentBu?.name || hero.bu,
          subsidiary: parentSub?.name || hero.subsidiary,
          status: derivedStatus,
          coverage,
          submissionId: submissionPack?.id,
          submissionNotes: submissionPack?.notes,
          dataPoints,
        };
      }
      return {
        ...hero,
        id: dbNode.id,
        name: dbNode.name,
        code: dbNode.code,
        period: 'FY 2025–26',
        status: derivedStatus,
        coverage,
        bu: parentBu?.name || 'Solar EPC & Operations',
        subsidiary: parentSub?.name || 'Aarohan Renewable Energy Pvt. Ltd.',
        type: dbNode.project_type || 'Solar Power Generation',
        location: dbNode.location_state ? `${dbNode.location_state}, India` : 'Odisha, India',
        stage: 'Operations',
        description: dbNode.project_description || hero.description,
        submissionId: submissionPack?.id,
        submissionNotes: submissionPack?.notes,
        dataPoints,
      };
    }
    return PROJECTS_DATA[projectId] || FALLBACK_PROJECT;
  }, [dbNode, nodes, projectId, submissionPack]);

  const statusCfg = STATUS_CONFIG[project.status] || STATUS_CONFIG.DRAFT;


  return (
    <div className="page-content anim-fade-up">
      {/* ── Breadcrumb + Header ── */}
      <div>
        <button
          onClick={() => {
            if (user?.role === 'project_admin' || user?.role === 'project_data_entry_user') {
              navigate(`/projects/${project.code || project.id || 'PRJ-ODISHA-SOLAR'}`);
            } else {
              navigate('/projects');
            }
          }}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13, marginBottom: 16, padding: 0 }}
        >
          <ArrowLeft size={14} /> Projects
        </button>

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

          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button onClick={() => navigate(`/collection?nodeId=${project.id}&periodId=FY2025-26-M03`)} className="btn btn-primary btn-sm">
              <Zap size={13} /> Open ESG Form
            </button>
            <button className="btn btn-secondary btn-sm" style={{ padding: '5px 8px' }}>
              <MoreHorizontal size={13} />
            </button>
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
            <span className="badge badge-blue" style={{ fontSize: 11 }}>Completion: {project.coverage}%</span>
            <span className="badge badge-gray" style={{ fontSize: 11 }}>Evidence: {project.evidenceCount || '18 / 20'}</span>
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

  // Realistic operational field data for Aarohan 250 MW Odisha Solar Park
  const FIELDS = {
    energy: [
      { id: 'diesel', metricCode: 'ENV-ENERGY-002', label: 'Auxiliary Diesel Consumption', desc: 'Total diesel consumed by backup generators and site machinery during the reporting period.', value: '12,450', unit: 'litres', source: 'IOCL Invoices / Fuel Register', evidence: 'DIESEL-LOGBOOK-IOCL-MAR2026.pdf', status: 'filled' },
      { id: 'grid_draw', metricCode: 'ENV-ENERGY-001', label: 'Auxiliary Grid Electricity Drawl', desc: 'Grid electricity drawn for auxiliary services, SCADA and tracker motors.', value: '64,500', unit: 'kWh', source: 'Discom Import Bill', evidence: 'GRID-INVOICE-ODISHA-MAR2026.pdf', status: 'filled' },
      { id: 'fleet_diesel', metricCode: 'ENV-ENERGY-003', label: 'Mobile Fleet & Machinery Diesel', desc: 'Diesel consumed by earthmoving, transit and maintenance fleet at site.', value: '28,300', unit: 'litres', source: 'Transit Fleet Dispatch Logs', evidence: 'DIESEL-LOGBOOK-IOCL-MAR2026.pdf', status: 'filled' },
    ],
    water: [
      { id: 'water_robotic', metricCode: 'ENV-WATER-001', label: 'Water Withdrawal (Borewell)', desc: 'Groundwater extracted for module cleaning, dust control and domestic use.', value: '9,150', unit: 'kL', source: 'CGWA Borewell Telemetry Log', evidence: 'WATER-EXTRACTION-CGWA-METER.pdf', status: 'filled' },
    ],
    waste: [
      { id: 'waste_haz', metricCode: 'ENV-WASTE-001', label: 'Hazardous Waste (Used Oil & Sludge)', desc: 'Used transformer oils and workshop sludge dispatched to SPCB re-refiners.', value: '1.85', unit: 'tonnes', source: 'SPCB Form 10 Manifest', evidence: 'HAZARDOUS-WASTE-MANIFEST-SPCB.pdf', status: 'filled' },
    ],
    social: [
      { id: 'workforce', metricCode: null, label: 'Total Site Workforce', desc: 'Direct staff, control room engineers, and maintenance contractor workforce.', value: '184', unit: 'persons', source: 'Biometric Access Gate Records', evidence: null, status: 'filled' },
      { id: 'safe_hours', metricCode: null, label: 'Cumulative Safe Work Hours', desc: 'Total cumulative operational hours without Lost Time Injury (LTI).', value: '184,000', unit: 'hours', source: 'Monthly Safety Audit', evidence: null, status: 'filled' },
    ],
    env: [
      { id: 'topsoil', metricCode: null, label: 'Conserved Topsoil Area', desc: 'Native ground cover preserved under solar panel arrays to prevent arid dust erosion.', value: '450', unit: 'Acres', source: 'EIA Environmental Audit', evidence: null, status: 'filled' },
    ],
  };

  // Merge real API values if available
  Object.values(FIELDS).flat().forEach(f => {
    if (f.metricCode && apiDataMap[f.metricCode]) {
      const dp = apiDataMap[f.metricCode];
      f.value = Number(dp.value_numeric).toLocaleString();
      f.unit = dp.unit || f.unit;
      f.apiValue = true;
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
              {project.evidence.map(ev => (
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
              ))}
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
            <div style={{ flex: 1, lineHeight: 1.5 }}>{errorMsg}</div>
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
              { label: 'Evidence Attached', value: project.evidenceCount || '18 / 20' },
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

  const dynamicPipeline = [
    {
      label: 'Operational Data Captured',
      status: 'done',
      time: project.lastUpdated || 'Mar 28, 2026 · 17:30',
      detail: '5 parameters entered with 4 primary evidence vouchers.'
    },
    {
      label: 'Automated Gate Validation',
      status: 'done',
      time: 'Gate Passed (Zero Errors)',
      detail: 'Plausibility, boundary checks, and meter variance validated.'
    },
    {
      label: 'BU Maker-Checker Review',
      status: isApproved ? 'done' : isSubmitted ? 'active' : 'pending',
      time: isApproved ? 'Approved by BU Admin' : 'Awaiting BU Review (Four-Eye Check)',
      detail: isApproved ? 'Rajesh Sen (BU Admin) digitally signed submission.' : 'Under review in BU workflow queue.'
    },
    {
      label: 'Scope 1 & 2 Deterministic Calculation',
      status: isApproved ? 'done' : 'pending',
      time: isApproved ? 'Calculated (CEA v2023 Factors)' : 'Pending BU Approval',
      detail: isApproved ? 'Scope 1: 109.8 tCO₂e | Scope 2: 45.8 tCO₂e derived.' : 'Triggered automatically upon BU approval.'
    },
    {
      label: 'Multi-Tier Boundary Consolidation',
      status: isApproved ? 'done' : 'pending',
      time: isApproved ? 'Consolidated to Aarohan Group' : 'Pending Calculation',
      detail: isApproved ? 'Rolled up: Project → Solar EPC BU → Aarohan Renewable → Group.' : 'Scheduled in consolidation engine.'
    },
    {
      label: 'SEBI BRSR Core Auto-Compilation',
      status: isApproved ? 'done' : 'pending',
      time: isApproved ? 'Ready for Report Snapshot' : 'Pending Consolidation',
      detail: isApproved ? 'Principle 6 environmental disclosures populated.' : 'Generated upon consolidation completion.'
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
