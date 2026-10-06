import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, ChevronRight, ChevronDown, Layers, ShieldCheck,
  Folder, ArrowUpRight, CheckCircle2, AlertTriangle, Clock
} from 'lucide-react';
import { MOCK_ORG_NODES, MOCK_PROJECTS } from '../mock/mockData';

export default function OrgHierarchy() {
  const navigate = useNavigate();
  const [expandedNodes, setExpandedNodes] = useState({
    'mock-node-meil': true,
    'sub-odisha': true,
    'bu-const': true,
    'sub-energy': true,
    'sub-mfg': false,
    'sub-transit': false,
  });

  const [selectedEntity, setSelectedEntity] = useState({
    id: 'sub-odisha',
    name: 'Odisha Infrastructure Limited',
    type: 'Subsidiary',
    coverage: 98,
    projectsCount: 11,
    emissions: '724.3 tCO₂e',
    head: 'Deepak Nayak, MD',
    cin: 'U45200OR2012PLC012891',
    address: 'Plot 14, Infocity Avenue, Bhubaneswar, Odisha - 751024',
  });

  const toggleNode = (id) => {
    setExpandedNodes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="page-content">
      {/* Header (Section 11 Specification) */}
      <div className="page-header">
        <div>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontWeight: 600 }}>
            Corporate Architecture
          </div>
          <h1 className="page-title" style={{ marginTop: '2px' }}>
            Organization Explorer
          </h1>
          <p className="page-sub">
            Hierarchical governance tree consolidates ESG reporting boundaries across 7 tiers.
          </p>
        </div>
      </div>

      {/* 2-Column Explorer: Left Tree + Right Detail Card */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', alignItems: 'flex-start' }}>
        {/* Tree Container */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '14px' }}>
            Corporate Hierarchy Tree
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px' }}>
            {/* Root: Group */}
            <div 
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', borderRadius: '6px', background: selectedEntity.id === 'mock-node-meil' ? 'var(--bg-subtle)' : 'transparent', cursor: 'pointer', fontWeight: 600 }}
              onClick={() => {
                toggleNode('mock-node-meil');
                setSelectedEntity({
                  id: 'mock-node-meil',
                  name: 'Megha Engineering & Infrastructures Ltd (MEIL)',
                  type: 'Parent Group',
                  coverage: 94.2,
                  projectsCount: 32,
                  emissions: '1,284.7 tCO₂e',
                  head: 'Aditya Varma, Executive Director',
                  cin: 'U45200TG1989PLC013058',
                  address: 'Technocrat Industrial Estate, Balanagar, Hyderabad - 500037',
                });
              }}
            >
              {expandedNodes['mock-node-meil'] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <Building2 size={16} />
              <span>Megha Engineering & Infrastructures Ltd (Group)</span>
              <span className="badge badge-ready" style={{ marginLeft: 'auto', fontSize: '10px' }}>94.2%</span>
            </div>

            {/* Level 2: Subsidiaries */}
            {expandedNodes['mock-node-meil'] && (
              <div style={{ marginLeft: '24px', borderLeft: '1px solid var(--border-default)', paddingLeft: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {/* Subsidiary 1: Odisha Infrastructure */}
                <div>
                  <div 
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', borderRadius: '4px', background: selectedEntity.id === 'sub-odisha' ? 'var(--bg-subtle)' : 'transparent', cursor: 'pointer', fontWeight: 550 }}
                    onClick={() => {
                      toggleNode('sub-odisha');
                      setSelectedEntity({
                        id: 'sub-odisha',
                        name: 'Odisha Infrastructure Limited',
                        type: 'Subsidiary',
                        coverage: 98,
                        projectsCount: 11,
                        emissions: '724.3 tCO₂e',
                        head: 'Deepak Nayak, MD',
                        cin: 'U45200OR2012PLC012891',
                        address: 'Plot 14, Infocity Avenue, Bhubaneswar, Odisha - 751024',
                      });
                    }}
                  >
                    {expandedNodes['sub-odisha'] ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                    <span>Odisha Infrastructure Limited</span>
                    <span className="badge badge-ready" style={{ marginLeft: 'auto', fontSize: '10px' }}>98%</span>
                  </div>

                  {/* Level 3: BUs under Odisha */}
                  {expandedNodes['sub-odisha'] && (
                    <div style={{ marginLeft: '20px', borderLeft: '1px solid var(--border-default)', paddingLeft: '12px', display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                      {/* BU: Construction */}
                      <div>
                        <div 
                          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', borderRadius: '4px', background: selectedEntity.id === 'bu-const' ? 'var(--bg-subtle)' : 'transparent', cursor: 'pointer' }}
                          onClick={() => {
                            toggleNode('bu-const');
                            setSelectedEntity({
                              id: 'bu-const',
                              name: 'Infrastructure / Construction BU',
                              type: 'Business Unit',
                              coverage: 96,
                              projectsCount: 6,
                              emissions: '412.6 tCO₂e',
                              head: 'Priya Verma, BU Manager',
                              cin: 'N/A (Business Unit)',
                              address: 'Bhubaneswar Engineering Division Hub',
                            });
                          }}
                        >
                          {expandedNodes['bu-const'] ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                          <Layers size={13} color="var(--text-secondary)" />
                          <span>Construction BU</span>
                          <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>412.6 tCO₂e</span>
                        </div>

                        {/* Projects under Construction BU */}
                        {expandedNodes['bu-const'] && (
                          <div style={{ marginLeft: '20px', borderLeft: '1px solid var(--border-default)', paddingLeft: '12px', display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '2px' }}>
                            <div 
                              style={{ padding: '4px 6px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '12px', display: 'flex', justifyContent: 'space-between' }}
                              onClick={() => navigate('/projects/prj-101')}
                            >
                              <span>• Highway Expansion (PRJ-101)</span>
                              <span className="badge badge-review" style={{ fontSize: '9px' }}>In Review</span>
                            </div>
                            <div 
                              style={{ padding: '4px 6px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '12px', display: 'flex', justifyContent: 'space-between' }}
                              onClick={() => navigate('/projects/prj-103')}
                            >
                              <span>• Metro Phase II Corridor (PRJ-103)</span>
                              <span className="badge badge-approved" style={{ fontSize: '9px' }}>Complete</span>
                            </div>
                            <div 
                              style={{ padding: '4px 6px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '12px', display: 'flex', justifyContent: 'space-between' }}
                              onClick={() => navigate('/projects/prj-111')}
                            >
                              <span>• Mahanadi Bridge SPV (PRJ-111)</span>
                              <span className="badge badge-ready" style={{ fontSize: '9px' }}>Ready</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* BU: Operations BU */}
                      <div 
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', borderRadius: '4px', cursor: 'pointer' }}
                        onClick={() => setSelectedEntity({
                          id: 'bu-ops',
                          name: 'Operations & Maintenance BU',
                          type: 'Business Unit',
                          coverage: 100,
                          projectsCount: 5,
                          emissions: '311.7 tCO₂e',
                          head: 'G. Sundaram, Head of O&M',
                          cin: 'N/A (Business Unit)',
                          address: 'Cuttack Maintenance Center',
                        })}
                      >
                        <Layers size={13} color="var(--text-secondary)" />
                        <span>Operations BU</span>
                        <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>311.7 tCO₂e</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Subsidiary 2: Energy Systems */}
                <div 
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', borderRadius: '4px', cursor: 'pointer', fontWeight: 550 }}
                  onClick={() => {
                    toggleNode('sub-energy');
                    setSelectedEntity({
                      id: 'sub-energy',
                      name: 'Energy Systems Limited',
                      type: 'Subsidiary',
                      coverage: 94,
                      projectsCount: 9,
                      emissions: '312.8 tCO₂e',
                      head: 'Sneha Patel, CEO',
                      cin: 'U40106TG2015PLC099120',
                      address: 'Cyber Towers, Hitec City, Hyderabad - 500081',
                    });
                  }}
                >
                  {expandedNodes['sub-energy'] ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                  <span>Energy Systems Limited</span>
                  <span className="badge badge-review" style={{ marginLeft: 'auto', fontSize: '10px' }}>94%</span>
                </div>

                {/* Subsidiary 3: Manufacturing */}
                <div 
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', borderRadius: '4px', cursor: 'pointer', fontWeight: 550 }}
                  onClick={() => {
                    toggleNode('sub-mfg');
                    setSelectedEntity({
                      id: 'sub-mfg',
                      name: 'Heavy Manufacturing & Engineering Ltd',
                      type: 'Subsidiary',
                      coverage: 88,
                      projectsCount: 7,
                      emissions: '198.4 tCO₂e',
                      head: 'Vikram Joshi, COO',
                      cin: 'U29299TG2020PTC145123',
                      address: 'IP Kakinada Engineering Yard, Andhra Pradesh',
                    });
                  }}
                >
                  {expandedNodes['sub-mfg'] ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                  <span>Manufacturing</span>
                  <span className="badge badge-attention" style={{ marginLeft: 'auto', fontSize: '10px' }}>88%</span>
                </div>

                {/* Subsidiary 4: Services */}
                <div 
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', borderRadius: '4px', cursor: 'pointer', fontWeight: 550 }}
                  onClick={() => {
                    toggleNode('sub-transit');
                    setSelectedEntity({
                      id: 'sub-transit',
                      name: 'Urban Transit & Services (Olectra)',
                      type: 'Subsidiary',
                      coverage: 100,
                      projectsCount: 5,
                      emissions: '49.2 tCO₂e',
                      head: 'K. Rajesh, VP Operations',
                      cin: 'L34100TG2000PLC035451',
                      address: 'Kurla Depot Complex, Mumbai - 400070',
                    });
                  }}
                >
                  {expandedNodes['sub-transit'] ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                  <span>Services & Transit</span>
                  <span className="badge badge-ready" style={{ marginLeft: 'auto', fontSize: '10px' }}>100%</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Entity Overview Card (Section 11 Specification) */}
        <div className="card">
          <div className="card-header">
            <div>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                {selectedEntity.type} Profile
              </span>
              <div className="card-title" style={{ fontSize: '18px', marginTop: '4px' }}>
                {selectedEntity.name}
              </div>
            </div>
            <span className="badge badge-ready" style={{ fontSize: '12px' }}>
              {selectedEntity.coverage}% Coverage
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Executive Lead:</span>
              <span style={{ fontWeight: 600 }}>{selectedEntity.head}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Corporate CIN:</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{selectedEntity.cin}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Aggregated Emissions:</span>
              <span style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{selectedEntity.emissions}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Active Projects:</span>
              <span style={{ fontWeight: 600 }}>{selectedEntity.projectsCount} Operational Units</span>
            </div>
            <div>
              <div style={{ color: 'var(--text-secondary)', marginBottom: '4px' }}>Registered Operating Address:</div>
              <div style={{ fontSize: '12px', color: 'var(--text-primary)' }}>{selectedEntity.address}</div>
            </div>
          </div>

          <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: '8px' }}>
            <button 
              className="btn btn-secondary btn-sm" 
              style={{ flex: 1 }}
              onClick={() => navigate('/projects')}
            >
              <span>View Projects</span>
              <ArrowUpRight size={13} />
            </button>
            <button 
              className="btn btn-primary btn-sm" 
              style={{ flex: 1 }}
              onClick={() => navigate('/calculations')}
            >
              <span>Inspect Lineage</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
