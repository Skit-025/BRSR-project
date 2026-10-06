import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  FileBarChart, Download, FileText, CheckCircle2, ChevronRight,
  Database, Info, ExternalLink, Calendar, Plus, ShieldCheck, Printer
} from 'lucide-react';
import CalculationLineageModal from '../components/CalculationLineageModal';

const BRSR_SECTIONS = [
  { key: 'sec_a', label: 'Section A: General Disclosures' },
  { key: 'sec_b', label: 'Section B: Management & Process' },
  { key: 'p1',    label: 'Principle 1: Ethics & Integrity' },
  { key: 'p2',    label: 'Principle 2: Sustainable Products' },
  { key: 'p3',    label: 'Principle 3: Employee Wellbeing' },
  { key: 'p4',    label: 'Principle 4: Stakeholder Engagement' },
  { key: 'p5',    label: 'Principle 5: Human Rights' },
  { key: 'p6',    label: 'Principle 6: Environment & Climate' },
  { key: 'p7',    label: 'Principle 7: Policy Advocacy' },
  { key: 'p8',    label: 'Principle 8: Inclusive Growth' },
  { key: 'p9',    label: 'Principle 9: Consumer Value' },
];

export default function Reporting() {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') === 'reports' ? 'reports_list' : 'p6');
  const [lineageOpen, setLineageOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('FY 2026');

  return (
    <div className="page-content">
      {/* Header (Section 22 Specification) */}
      <div className="page-header">
        <div>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontWeight: 600 }}>
            Statutory Reporting
          </div>
          <h1 className="page-title" style={{ marginTop: '2px' }}>
            SEBI BRSR Core & NGRBC Disclosures
          </h1>
          <p className="page-sub">
            Generate, review, audit, and export consolidated ESG disclosure statements.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <select 
            className="input-control" 
            style={{ height: '32px', padding: '0 8px', fontSize: '12px' }}
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
          >
            <option>FY 2026 (Annual Report)</option>
            <option>FY 2025 (Audited Final)</option>
          </select>
          <button 
            className="btn btn-secondary btn-sm"
            onClick={() => alert('Generating SEBI Annexure II PDF Export with digital QR code...')}
          >
            <Printer size={13} />
            <span>Export SEBI PDF</span>
          </button>
          <button 
            className="btn btn-primary btn-sm"
            onClick={() => alert('Compiling updated report snapshot across all 4 subsidiaries...')}
          >
            <Plus size={13} />
            <span>Generate Report</span>
          </button>
        </div>
      </div>

      {/* Reports Summary Cards (Section 22 Specification) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="card" style={{ padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>Group ESG Report FY 2026</span>
            <span className="badge badge-ready">● Ready</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Generated Oct 6, 2026 · Compiled by Aditya Varma</div>
          <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>SEBI BRSR Core v2.1</span>
            <button className="btn btn-secondary btn-sm" onClick={() => setActiveTab('p6')}>
              View Report
            </button>
          </div>
        </div>

        <div className="card" style={{ padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>Odisha Infrastructure Subsidiary Report</span>
            <span className="badge badge-ready">● Ready</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Generated Oct 6, 2026 · 11 Projects Rolled Up</div>
          <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>Sub-Entity Level</span>
            <button className="btn btn-secondary btn-sm" onClick={() => setActiveTab('p6')}>
              View Report
            </button>
          </div>
        </div>
      </div>

      {/* BRSR Report UI (Section 23 Specification: Left Nav + Main Disclosures Panel) */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '24px', alignItems: 'flex-start' }}>
        {/* Left Navigation */}
        <div className="form-section-nav" style={{ position: 'sticky', top: '76px' }}>
          <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-tertiary)', padding: '6px 10px', fontWeight: 600 }}>
            BRSR Framework Navigation
          </div>
          {BRSR_SECTIONS.map((sec) => (
            <button
              key={sec.key}
              className={`form-nav-btn ${activeTab === sec.key ? 'active' : ''}`}
              onClick={() => setActiveTab(sec.key)}
            >
              <span>{sec.label}</span>
            </button>
          ))}
        </div>

        {/* Main Disclosures Panel */}
        <div className="card" style={{ padding: '24px' }}>
          {/* Header of Section */}
          <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px', marginBottom: '20px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                NGRBC Framework · Principle 6
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
                Principle 6: Protection & Restoration of Environment
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Businesses should respect, protect and make efforts to restore the environment across direct civil operations and supply chains.
              </p>
            </div>

            <button 
              className="btn btn-secondary btn-sm"
              onClick={() => setLineageOpen(true)}
            >
              <span>View calculation lineage</span>
              <ExternalLink size={12} />
            </button>
          </div>

          {/* Disclosures Table with Signature "ⓘ View source" on Every Number (Section 24) */}
          <table className="table">
            <thead>
              <tr>
                <th>Essential Indicator Metric</th>
                <th>Consolidated Value</th>
                <th>Operational Source</th>
                <th>Audit Provenance</th>
              </tr>
            </thead>
            <tbody>
              {/* Row 1: GHG Emissions */}
              <tr>
                <td>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Total GHG Emissions (Scope 1 & 2)</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Metric Code: P6-E-04 · Metric Tonnes CO₂e</div>
                </td>
                <td>
                  <div style={{ fontSize: '15px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                    1,284.7 tCO₂e
                  </div>
                </td>
                <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  32 Projects across 4 Subsidiaries
                </td>
                <td>
                  {/* Signature UX: Section 24 Report Drill-down */}
                  <button 
                    className="btn btn-ghost btn-sm"
                    onClick={() => setLineageOpen(true)}
                    style={{ fontSize: '11px', gap: '4px', color: 'var(--text-primary)', fontWeight: 550 }}
                  >
                    <Info size={13} color="var(--text-secondary)" />
                    <span>View source</span>
                  </button>
                </td>
              </tr>

              {/* Row 2: Fuel Consumption */}
              <tr>
                <td>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Diesel & Liquid Fuel Consumption</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Metric Code: P6-E-01 · Direct Mobile & Stationary Combustion</div>
                </td>
                <td>
                  <div style={{ fontSize: '15px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                    142,500 L
                  </div>
                </td>
                <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Fuel registers & bowzer manifests
                </td>
                <td>
                  <button 
                    className="btn btn-ghost btn-sm"
                    onClick={() => setLineageOpen(true)}
                    style={{ fontSize: '11px', gap: '4px', color: 'var(--text-primary)', fontWeight: 550 }}
                  >
                    <Info size={13} color="var(--text-secondary)" />
                    <span>View source</span>
                  </button>
                </td>
              </tr>

              {/* Row 3: Water Withdrawal */}
              <tr>
                <td>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Total Water Withdrawal & Consumption</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Metric Code: P6-E-06 · Fresh surface, ground & tanker water</div>
                </td>
                <td>
                  <div style={{ fontSize: '15px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                    134,800 kL
                  </div>
                </td>
                <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Utility invoices & flowmeters
                </td>
                <td>
                  <button 
                    className="btn btn-ghost btn-sm"
                    onClick={() => setLineageOpen(true)}
                    style={{ fontSize: '11px', gap: '4px', color: 'var(--text-primary)', fontWeight: 550 }}
                  >
                    <Info size={13} color="var(--text-secondary)" />
                    <span>View source</span>
                  </button>
                </td>
              </tr>

              {/* Row 4: Waste Recycled */}
              <tr>
                <td>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Waste Diverted from Landfill</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Metric Code: P6-E-08 · Circularity percentage</div>
                </td>
                <td>
                  <div style={{ fontSize: '15px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                    76.4% (1,420 MT)
                  </div>
                </td>
                <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Authorized recycler Form 10s
                </td>
                <td>
                  <button 
                    className="btn btn-ghost btn-sm"
                    onClick={() => setLineageOpen(true)}
                    style={{ fontSize: '11px', gap: '4px', color: 'var(--text-primary)', fontWeight: 550 }}
                  >
                    <Info size={13} color="var(--text-secondary)" />
                    <span>View source</span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 24: Report Drill-down Lineage Modal */}
      <CalculationLineageModal 
        isOpen={lineageOpen} 
        onClose={() => setLineageOpen(false)} 
      />
    </div>
  );
}
