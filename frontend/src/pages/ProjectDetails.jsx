import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Edit3, MoreHorizontal, CheckCircle2, Clock,
  FileText, FolderOpen, GitBranch, Cpu, Activity, ShieldCheck,
  Building2, MapPin, Calendar, ArrowUpRight, Check
} from 'lucide-react';
import { MOCK_PROJECTS } from '../mock/mockData';
import CalculationLineageModal from '../components/CalculationLineageModal';

export default function ProjectDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [lineageOpen, setLineageOpen] = useState(false);

  const project = MOCK_PROJECTS.find(p => p.id === id) || MOCK_PROJECTS[0];

  return (
    <div className="page-content">
      {/* Back button & Breadcrumb */}
      <div style={{ marginBottom: '16px' }}>
        <button 
          onClick={() => navigate('/projects')}
          className="btn btn-ghost btn-sm"
          style={{ padding: '0 4px', gap: '4px', color: 'var(--text-secondary)' }}
        >
          <ArrowLeft size={13} />
          <span>Projects</span>
        </button>
      </div>

      {/* Header (Section 13 Specification) */}
      <div className="page-header" style={{ marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 className="page-title">{project.name}</h1>
            <span className="badge badge-review">
              <span className="status-dot" />
              Status: {project.status === 'review' ? 'In Review' : project.status}
            </span>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {project.subsidiary} / {project.bu_name} · Manager: {project.manager}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button 
            className="btn btn-secondary btn-sm"
            onClick={() => navigate(`/collection?prj=${project.id}`)}
          >
            <span>Open ESG Data Form</span>
            <ArrowUpRight size={13} />
          </button>
          <button 
            className="btn btn-secondary btn-sm"
            onClick={() => alert('Editing project metadata...')}
          >
            <Edit3 size={13} />
            <span>Edit</span>
          </button>
          <button className="icon-btn" style={{ width: '28px', height: '28px' }}>
            <MoreHorizontal size={14} />
          </button>
        </div>
      </div>

      {/* Tabs Row (Section 13 Specification) */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', marginBottom: '24px', gap: '24px' }}>
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'esg_data', label: 'ESG Data' },
          { key: 'evidence', label: 'Evidence' },
          { key: 'reviews', label: 'Reviews' },
          { key: 'calculations', label: 'Calculations' },
          { key: 'activity', label: 'Activity' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              padding: '10px 0',
              fontSize: '13px',
              fontWeight: activeTab === t.key ? 600 : 450,
              color: activeTab === t.key ? 'var(--text-primary)' : 'var(--text-secondary)',
              borderBottom: activeTab === t.key ? '2px solid var(--accent-black)' : '2px solid transparent',
              background: 'none',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer',
              transition: 'all 120ms',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Overview Tab */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '24px' }}>
          {/* Left: Project Details & Applicability */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="card">
              <div className="card-header">
                <div className="card-title">Project Overview</div>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '20px' }}>
                {project.description}
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Location</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>{project.location}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Stage</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>{project.stage}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Reporting Period</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>{project.reporting_period}</div>
                </div>
              </div>
            </div>

            {/* Applicable Parameters */}
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">Applicable ESG Parameters</div>
                  <div className="card-sub">Template: Road Construction v1</div>
                </div>
                <button 
                  className="btn btn-secondary btn-sm"
                  onClick={() => navigate(`/collection?prj=${project.id}`)}
                >
                  Enter ESG Data
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  { name: 'Diesel Consumption (Fuel)', status: 'Entered (12,500 L)', icon: Check, ready: true },
                  { name: 'Electricity Consumption', status: 'Entered (184,200 kWh)', icon: Check, ready: true },
                  { name: 'Water Withdrawal', status: 'In Progress (48,000 kL)', icon: Clock, ready: false },
                  { name: 'Waste Generated', status: 'Pending Verification', icon: Clock, ready: false },
                  { name: 'Worker Safety / LTIFR', status: 'Recorded (0.12)', icon: Check, ready: true },
                ].map((item, idx) => (
                  <div 
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      background: 'var(--bg-subtle)',
                      borderRadius: '6px',
                      fontSize: '13px',
                    }}
                  >
                    <span style={{ fontWeight: 550, color: 'var(--text-primary)' }}>{item.name}</span>
                    <span style={{ fontSize: '12px', color: item.ready ? 'var(--status-ready-text)' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <item.icon size={13} />
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Telemetry & Lineage Quick Card */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="card">
              <div className="card-header">
                <div className="card-title">Verification & Lineage</div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Calculated Scope 1:</span>
                  <span style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>187.4 tCO₂e</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Coverage Completion:</span>
                  <span style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{project.coverage}%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Evidence Attached:</span>
                  <span style={{ fontWeight: 600 }}>Fuel_Register_April.pdf</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Assurance Hash:</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>8f3a21b4…</span>
                </div>
              </div>

              <div style={{ marginTop: '16px' }}>
                <button 
                  className="btn btn-secondary"
                  style={{ width: '100%' }}
                  onClick={() => setLineageOpen(true)}
                >
                  <Cpu size={14} />
                  <span>View Project Calculation Lineage</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: ESG Data Tab Redirect */}
      {activeTab === 'esg_data' && (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>Project ESG Collection Pack</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Enter and verify diesel consumption, water usage, and safety records.
          </p>
          <button 
            className="btn btn-primary"
            onClick={() => navigate(`/collection?prj=${project.id}`)}
          >
            Launch Dynamic ESG Form
          </button>
        </div>
      )}

      {/* Tab 3: Evidence Vault */}
      {activeTab === 'evidence' && (
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
            <div className="card-title">Verified Evidence Documents</div>
          </div>
          <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FileText size={18} color="var(--text-secondary)" />
              <div>
                <div style={{ fontWeight: 600, fontSize: '13px' }}>Fuel_Register_April.pdf</div>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>PDF · 1.8 MB · Uploaded 2 minutes ago · SHA-256 Verified</div>
              </div>
            </div>
            <button 
              className="btn btn-secondary btn-sm"
              onClick={() => navigate('/workflow?prj=prj-101')}
            >
              Preview Document
            </button>
          </div>
        </div>
      )}

      {/* Tab 4: Reviews */}
      {activeTab === 'reviews' && (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>BU Maker-Checker Review Queue</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Highway Expansion submission currently in BU review queue.
          </p>
          <button 
            className="btn btn-primary"
            onClick={() => navigate('/workflow?prj=prj-101')}
          >
            Open Split-Screen Review
          </button>
        </div>
      )}

      {/* Tab 5: Calculations */}
      {activeTab === 'calculations' && (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>Calculations & Aggregation Pipeline</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Inspect emission factor algorithms (DEFRA 2.68 kg CO₂e/L) and BU rollup status.
          </p>
          <button 
            className="btn btn-primary"
            onClick={() => setLineageOpen(true)}
          >
            Launch Lineage Drill-down
          </button>
        </div>
      )}

      {/* Tab 6: Activity */}
      {activeTab === 'activity' && (
        <div className="card">
          <div className="card-title" style={{ marginBottom: '16px' }}>Audit History for {project.name}</div>
          <div className="activity-feed">
            <div className="activity-item">
              <span className="activity-dot" />
              <span className="activity-time">2m</span>
              <div className="activity-text">Project P-101 submitted ESG data pack (Diesel: 12,500 L)</div>
            </div>
            <div className="activity-item">
              <span className="activity-dot" />
              <span className="activity-time">4m</span>
              <div className="activity-text">Fuel_Register_April.pdf uploaded and verified with AI OCR</div>
            </div>
            <div className="activity-item">
              <span className="activity-dot" />
              <span className="activity-time">1d</span>
              <div className="activity-text">Template assigned: Road Construction v1</div>
            </div>
          </div>
        </div>
      )}

      {/* Calculation Lineage Modal */}
      <CalculationLineageModal 
        isOpen={lineageOpen} 
        onClose={() => setLineageOpen(false)} 
      />
    </div>
  );
}
