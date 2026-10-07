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
  'prj-best': {
    id: 'prj-best', name: 'BEST Mumbai Electric Bus Fleet',
    code: 'PRJ-BEST-EV2026', period: 'FY 2026',
    status: 'APPROVED', coverage: 100,
    bu: 'Electric Mobility Fleet Operations', subsidiary: 'Olectra Greentech Limited',
    type: 'Electric Vehicle Fleet', location: 'Mumbai, Maharashtra', stage: 'Operations',
    description: 'Supply and operations of 2,100 electric buses for Brihanmumbai Electric Supply and Transport (BEST) across 27 depots in Mumbai. Includes charging infrastructure, driver training, and maintenance.',
    activities: ['Electric vehicle operations', 'Charging infrastructure management', 'Battery lifecycle management', 'Driver training & safety'],
    template: 'Electric Mobility Operations v1',
    lastUpdated: 'Oct 6, 2026 · 19:42',
    submittedBy: 'Rahul Sharma',
    esgSections: [
      { id: 'energy', label: 'Energy', items: ['Electricity', 'Battery Energy'], status: 'DONE', pct: 100 },
      { id: 'water',  label: 'Water',  items: ['Operational Water'],             status: 'DONE', pct: 100 },
      { id: 'waste',  label: 'Waste',  items: ['Battery Waste', 'General Waste'],status: 'DONE', pct: 100 },
      { id: 'social', label: 'Social', items: ['Workforce', 'Safety'],           status: 'DONE', pct: 100 },
    ],
    evidence: [
      { id: 'e1', name: 'Electricity_Bills_Q1_FY26.pdf', type: 'PDF', size: '2.4 MB', uploaded: '2 days ago', field: 'Electricity Consumption' },
      { id: 'e2', name: 'Battery_Management_Records.xlsx', type: 'XLSX', size: '1.1 MB', uploaded: '2 days ago', field: 'Battery Energy' },
      { id: 'e3', name: 'Safety_Incident_Register.pdf', type: 'PDF', size: '0.8 MB', uploaded: '3 days ago', field: 'Worker Safety' },
    ],
    metrics: [
      { label: 'Energy Consumed', value: '18,420', unit: 'MWh', icon: Zap, trend: -12 },
      { label: 'Water Used', value: '4,200', unit: 'kL', icon: Droplets, trend: 0 },
      { label: 'Workforce', value: '3,800', unit: 'persons', icon: Users, trend: 5 },
    ],
    reviews: [
      { id: 'r1', reviewer: 'Arjun Mehta (BU Admin)', action: 'APPROVED', comment: 'Data verified against charging records. All evidence present.', date: 'Oct 6, 2026 18:30', level: 'BU' },
    ],
    pipeline: [
      { label: 'Data Submitted',       status: 'done',    time: 'Oct 5, 2026' },
      { label: 'BU Review',            status: 'done',    time: 'Oct 6, 2026' },
      { label: 'Project Calculated',   status: 'done',    time: 'Oct 6, 2026' },
      { label: 'BU Aggregation',       status: 'done',    time: 'Oct 6, 2026' },
      { label: 'Subsidiary Consolidated', status: 'active', time: 'Running...' },
      { label: 'Group Report',         status: 'pending', time: 'Pending' },
    ],
  },
  'prj-hwy-od': {
    id: 'prj-hwy-od', name: 'NH-16 Odisha Highway Expansion',
    code: 'PRJ-NH16-OD2026', period: 'FY 2026',
    status: 'IN_REVIEW', coverage: 87,
    bu: 'Infrastructure BU', subsidiary: 'MEIL Infra Projects',
    type: 'Road Construction', location: 'Odisha', stage: 'Construction',
    description: 'Construction of 48 km of NH-16 four-lane highway including earthwork, concrete batching, asphalt paving and drainage systems across Bhubaneswar–Cuttack corridor.',
    activities: ['Earthwork & excavation', 'Concrete batching', 'Asphalt paving', 'Heavy machinery operations', 'Labour camp management'],
    template: 'Road Construction v2',
    lastUpdated: 'Oct 6, 2026 · 14:20',
    submittedBy: 'Priya Nair',
    esgSections: [
      { id: 'energy', label: 'Energy', items: ['Electricity', 'Diesel', 'Petrol'], status: 'DONE',    pct: 100 },
      { id: 'water',  label: 'Water',  items: ['Water Consumption'],               status: 'PARTIAL', pct: 75 },
      { id: 'waste',  label: 'Waste',  items: ['Waste Generated', 'Hazardous'],    status: 'PARTIAL', pct: 50 },
      { id: 'social', label: 'Social', items: ['Workforce', 'Safety', 'Training'], status: 'DONE',    pct: 100 },
      { id: 'env',    label: 'Environment', items: ['Air Quality', 'Biodiversity'], status: 'PENDING', pct: 0 },
    ],
    evidence: [
      { id: 'e1', name: 'Fuel_Register_Oct2026.pdf', type: 'PDF', size: '1.8 MB', uploaded: '5h ago', field: 'Diesel Consumption' },
      { id: 'e2', name: 'Water_Bill_Oct2026.pdf', type: 'PDF', size: '0.4 MB', uploaded: '1d ago', field: 'Water Consumption' },
    ],
    metrics: [
      { label: 'Diesel Consumed', value: '12,500', unit: 'litres', icon: Flame, trend: 8 },
      { label: 'Water Consumed', value: '48,000', unit: 'kL', icon: Droplets, trend: -5 },
      { label: 'Workers On-site', value: '2,400', unit: 'persons', icon: Users, trend: 2 },
    ],
    reviews: [
      { id: 'r1', reviewer: 'Kiran Reddy (BU Admin)', action: 'IN_REVIEW', comment: 'Reviewing water consumption figures. Requested clarification on Q2 readings.', date: 'Oct 6, 2026 12:00', level: 'BU' },
    ],
    pipeline: [
      { label: 'Data Submitted',       status: 'done',    time: 'Oct 5, 2026' },
      { label: 'BU Review',            status: 'active',  time: 'In progress' },
      { label: 'Project Calculated',   status: 'pending', time: 'Pending' },
      { label: 'BU Aggregation',       status: 'pending', time: 'Pending' },
      { label: 'Subsidiary Consolidated', status: 'pending', time: 'Pending' },
      { label: 'Group Report',         status: 'pending', time: 'Pending' },
    ],
  },
};

const FALLBACK_PROJECT = PROJECTS_DATA['prj-hwy-od'];

const STATUS_CONFIG = {
  APPROVED:          { label: 'Approved',          badgeClass: 'badge-green', dot: 'green' },
  CALCULATED:        { label: 'Calculated',         badgeClass: 'badge-green', dot: 'green' },
  IN_REVIEW:         { label: 'In Review',          badgeClass: 'badge-blue',  dot: 'blue'  },
  SUBMITTED:         { label: 'Submitted',          badgeClass: 'badge-blue',  dot: 'blue'  },
  CHANGES_REQUESTED: { label: 'Changes Requested',  badgeClass: 'badge-amber', dot: 'amber' },
  DRAFT:             { label: 'Draft',              badgeClass: 'badge-gray',  dot: 'gray'  },
};

const SECTION_STATUS = {
  DONE:    { icon: '✓', color: 'var(--success)', bg: 'var(--success-subtle)', border: 'var(--success-border)' },
  PARTIAL: { icon: '◐', color: '#B45309', bg: 'var(--warning-subtle)', border: 'var(--warning-border)' },
  PENDING: { icon: '○', color: 'var(--text-muted)', bg: 'var(--bg-subtle)', border: 'var(--border)' },
};

import { useOrgNodes } from '../hooks/useApi';

const TABS = ['Overview', 'ESG Data', 'Evidence', 'Reviews', 'Pipeline'];

export default function ProjectDetail() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { data: nodes = [] } = useOrgNodes();
  const [activeTab, setActiveTab] = useState('Overview');
  const [selectedSection, setSelectedSection] = useState(null);

  const dbNode = nodes.find(n => n.id === projectId || n.code === projectId);

  const project = useMemo(() => {
    if (dbNode) {
      const parentBu = nodes.find(b => b.id === dbNode.parent_id);
      const parentSub = parentBu ? nodes.find(s => s.id === parentBu.parent_id) : null;
      return {
        id: dbNode.id,
        name: dbNode.name,
        code: dbNode.code,
        period: 'FY 2026',
        status: dbNode.is_active ? 'APPROVED' : 'DRAFT',
        coverage: 95,
        bu: parentBu?.name || 'Infrastructure BU',
        subsidiary: parentSub?.name || 'MEIL Group',
        type: dbNode.project_type || 'Infrastructure',
        location: dbNode.location_state || 'India',
        stage: 'Operations',
        description: dbNode.project_description || 'Active project site in MEIL operational hierarchy.',
        activities: ['Operational Site Monitoring', 'Resource Efficiency Tracking', 'Environmental Compliance'],
        template: 'Standard MEIL ESG Protocol v1',
        lastUpdated: 'Live from DB',
        submittedBy: 'Authenticated Site Engineer',
        esgSections: [
          { id: 'energy', label: 'Energy', items: ['Electricity', 'Diesel DG Sets'], status: 'DONE', pct: 100 },
          { id: 'water',  label: 'Water',  items: ['Water Consumption'], status: 'DONE', pct: 100 },
          { id: 'waste',  label: 'Waste',  items: ['Operational Waste'], status: 'DONE', pct: 100 },
          { id: 'social', label: 'Social', items: ['Safety', 'Workforce'], status: 'DONE', pct: 100 },
        ],
        evidence: [],
        metrics: [
          { label: 'Status', value: dbNode.is_active ? 'Active' : 'Draft', unit: '', icon: Shield, trend: 0 },
        ],
        reviews: [],
        pipeline: [
          { label: 'Data Submitted', status: 'done', time: 'Active' },
          { label: 'BU Review', status: 'done', time: 'Active' },
          { label: 'Project Calculated', status: 'done', time: 'Active' },
          { label: 'Consolidation', status: 'done', time: 'Active' },
        ],
      };
    }
    return PROJECTS_DATA[projectId] || FALLBACK_PROJECT;
  }, [dbNode, nodes, projectId]);

  const statusCfg = STATUS_CONFIG[project.status] || STATUS_CONFIG.DRAFT;


  return (
    <div className="page-content anim-fade">
      {/* ── Breadcrumb + Header ── */}
      <div>
        <button
          onClick={() => navigate('/projects')}
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
            <button className="btn btn-secondary btn-sm">
              <Edit2 size={13} /> Edit
            </button>
            <button className="btn btn-secondary btn-sm" style={{ padding: '5px 8px' }}>
              <MoreHorizontal size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="tabs" style={{ marginBottom: -8 }}>
        {TABS.map(t => (
          <button key={t} className={`tab-btn ${activeTab === t ? 'active' : ''}`} onClick={() => setActiveTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      {activeTab === 'Overview' && <OverviewTab project={project} navigate={navigate} />}
      {activeTab === 'ESG Data' && <EsgDataTab project={project} selectedSection={selectedSection} setSelectedSection={setSelectedSection} />}
      {activeTab === 'Evidence' && <EvidenceTab project={project} />}
      {activeTab === 'Reviews' && <ReviewsTab project={project} />}
      {activeTab === 'Pipeline' && <PipelineTab project={project} />}
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
function EsgDataTab({ project, selectedSection, setSelectedSection }) {
  const activeSec = selectedSection || project.esgSections[0]?.id;
  const sec = project.esgSections.find(s => s.id === activeSec) || project.esgSections[0];

  // Sample field data
  const FIELDS = {
    energy: [
      { id: 'diesel', label: 'Diesel Consumption', desc: 'Diesel consumed by project machinery during the reporting period.', value: '12,500', unit: 'litres', source: 'Fuel Register', evidence: 'Fuel_Register_Oct2026.pdf', status: 'filled' },
      { id: 'petrol', label: 'Petrol Consumption', desc: 'Petrol consumed by light vehicles.', value: '1,240', unit: 'litres', source: 'Fuel Register', evidence: null, status: 'filled' },
      { id: 'electricity', label: 'Grid Electricity', desc: 'Electricity drawn from the grid for site operations.', value: '', unit: 'kWh', source: '', evidence: null, status: 'empty' },
    ],
    water: [
      { id: 'water_con', label: 'Water Consumption', desc: 'Total water consumed at the construction site.', value: '48,000', unit: 'kL', source: 'Water Bill', evidence: 'Water_Bill_Oct2026.pdf', status: 'filled' },
    ],
    waste: [
      { id: 'waste_gen', label: 'Waste Generated', desc: 'Total solid waste generated at the site.', value: '', unit: 'MT', source: '', evidence: null, status: 'empty' },
    ],
    social: [
      { id: 'workforce', label: 'Total Workforce', desc: 'Number of workers employed directly and through contractors.', value: '2,400', unit: 'persons', source: 'HR Records', evidence: null, status: 'filled' },
      { id: 'injuries', label: 'Workplace Injuries', desc: 'Number of recordable workplace injuries.', value: '0', unit: 'incidents', source: 'Safety Register', evidence: null, status: 'filled' },
    ],
    env: [],
  };

  const fields = FIELDS[activeSec] || [];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20, minHeight: 600 }}>
      {/* Left nav */}
      <div className="card" style={{ height: 'fit-content', position: 'sticky', top: 16 }}>
        <div className="card-body" style={{ padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
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
        </div>
      </div>

      {/* Right: fields */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{sec?.label}</h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
              Required ESG data for this section
            </p>
          </div>
        </div>

        {fields.length === 0 ? (
          <div className="empty-state" style={{ padding: 40 }}>
            <div className="empty-state-title">No fields required</div>
            <div className="empty-state-desc">This section has no required data for this project type.</div>
          </div>
        ) : fields.map((field, i) => (
          <div key={field.id} className="card" style={{ opacity: field.status === 'empty' ? 1 : 1 }}>
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
          <label className="form-label" style={{ fontSize: 12 }}>Consumption</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              className="form-control"
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder="Enter value..."
              style={{ fontSize: 15, fontWeight: 600 }}
            />
            <span style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0, fontWeight: 500 }}>{field.unit}</span>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label" style={{ fontSize: 12 }}>Source</label>
          <select className="form-control" defaultValue={field.source}>
            <option>Fuel Register</option>
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
function EvidenceTab({ project }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Evidence</h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>{project.evidence.length} document{project.evidence.length !== 1 ? 's' : ''} uploaded</p>
        </div>
        <button className="btn btn-primary btn-sm"><Upload size={13} /> Upload</button>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Document</th>
                <th>Type</th>
                <th>Linked To</th>
                <th>Uploaded</th>
                <th />
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
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{ev.size}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className="badge badge-blue">{ev.type}</span></td>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{ev.field}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{ev.uploaded}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="icon-btn"><Eye size={13} /></button>
                      <button className="icon-btn"><Download size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ── Reviews Tab ── */
function ReviewsTab({ project }) {
  const [comment, setComment] = useState('');
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>
      {/* History */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Review History</h2>
        {project.reviews.map(r => (
          <div key={r.id} className="card">
            <div className="card-body">
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: r.action === 'APPROVED' ? 'var(--success-subtle)' : r.action === 'IN_REVIEW' ? 'var(--accent-subtle)' : 'var(--warning-subtle)', border: `1px solid ${r.action === 'APPROVED' ? 'var(--success-border)' : r.action === 'IN_REVIEW' ? 'var(--accent-border)' : 'var(--warning-border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {r.action === 'APPROVED' ? <Check size={14} color="var(--success)" /> : <Clock size={14} color="var(--accent)" />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{r.reviewer}</span>
                    <span className={`badge ${r.action === 'APPROVED' ? 'badge-green' : 'badge-blue'}`}>{r.action.replace('_', ' ')}</span>
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
          <div className="card-header"><span className="card-title">Review Actions</span></div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: 12 }}>Comment (optional)</label>
              <textarea
                className="form-control"
                rows={3}
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Add a review comment..."
                style={{ resize: 'vertical', fontSize: 13 }}
              />
            </div>
            <button className="btn btn-success w-full" style={{ justifyContent: 'center' }}>
              <Check size={14} /> Approve
            </button>
            <button className="btn btn-danger w-full" style={{ justifyContent: 'center' }}>
              <X size={14} /> Request Changes
            </button>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><span className="card-title">Submission Info</span></div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'Submitted by', value: project.submittedBy },
              { label: 'Last updated', value: project.lastUpdated },
              { label: 'Coverage', value: `${project.coverage}%` },
            ].map(d => (
              <div key={d.label} style={{ display: 'flex', justifyContent: 'space-between' }}>
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

/* ── Pipeline Tab ── */
function PipelineTab({ project }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Calculation Pipeline</h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
          Track how this project's data flows through the hierarchical consolidation pipeline.
        </p>
      </div>

      <div className="card">
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {project.pipeline.map((step, i) => (
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
                </div>
                {step.status === 'done'   && <span className="badge badge-green" style={{ fontSize: 11 }}>Complete</span>}
                {step.status === 'active' && <span className="badge badge-blue" style={{ fontSize: 11 }}>Running</span>}
              </div>
              {i < project.pipeline.length - 1 && (
                <div style={{ width: 1, height: 12, background: 'var(--border)', margin: '0 auto 0 15px' }} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Lineage */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Calculation Lineage</span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Click any node to drill down</span>
        </div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
          {[
            { level: 'Group', label: 'MEIL Group', value: '1,284.7 tCO₂e' },
            { level: 'Subsidiary', label: 'Olectra Greentech', value: '412.6 tCO₂e' },
            { level: 'BU', label: project.bu, value: '187.4 tCO₂e' },
            { level: 'Project', label: project.name.slice(0, 30), value: '34.2 tCO₂e' },
            { level: 'Source', label: 'Diesel Consumption', value: '12,500 litres' },
          ].map((node, i, arr) => (
            <div key={i} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div className="lineage-node" style={{ width: '100%', maxWidth: 400 }}>
                <div className="lineage-node-label">{node.level}</div>
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
