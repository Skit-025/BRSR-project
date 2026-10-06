import React, { useState } from 'react';
import { ArrowDown, X, CheckCircle2, FileText, Database, ShieldCheck, ChevronRight, Download } from 'lucide-react';
import { MOCK_CALCULATION_LINEAGE } from '../mock/mockData';

export default function CalculationLineageModal({ isOpen, onClose }) {
  const [selectedNodeIndex, setSelectedNodeIndex] = useState(4); // Default to Diesel node
  if (!isOpen) return null;

  const lineage = MOCK_CALCULATION_LINEAGE;

  return (
    <div className="command-backdrop" onClick={onClose} style={{ zIndex: 110 }}>
      <div 
        className="command-modal" 
        onClick={(e) => e.stopPropagation()} 
        style={{ maxWidth: '840px', padding: 0 }}
      >
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-muted)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Database size={15} color="var(--text-primary)" />
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Calculation Lineage & Cryptographic Audit Drill-down
              </span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
              {lineage.metric} · {lineage.period} · Methodology: {lineage.methodology}
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} style={{ width: '24px', height: '24px' }}>
            <X size={14} />
          </button>
        </div>

        {/* Modal 2-column layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', minHeight: '480px' }}>
          {/* Left Column: Vertical Lineage Graph */}
          <div style={{ padding: '24px', borderRight: '1px solid var(--border-subtle)', overflowY: 'auto', background: 'var(--bg-subtle)' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '16px' }}>
              Hierarchical Rollup Trace (Group → Raw Source)
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {lineage.tree.map((node, idx) => {
                const isSelected = idx === selectedNodeIndex;
                const isLast = idx === lineage.tree.length - 1;

                return (
                  <React.Fragment key={idx}>
                    <div
                      onClick={() => setSelectedNodeIndex(idx)}
                      style={{
                        padding: '12px 14px',
                        background: isSelected ? '#ffffff' : 'var(--bg-surface)',
                        border: isSelected ? '1px solid var(--accent-black)' : '1px solid var(--border-subtle)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'all 120ms',
                        boxShadow: isSelected ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                          {node.level}
                        </span>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                          {node.value}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: 550, color: 'var(--text-primary)' }}>
                        {node.label}
                      </div>
                    </div>

                    {!isLast && (
                      <div style={{ display: 'flex', justifyContent: 'center', color: 'var(--text-tertiary)', margin: '-2px 0' }}>
                        <ArrowDown size={14} />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Right Column: Node Details & Verification Panel */}
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--bg-surface)' }}>
            {(() => {
              const activeNode = lineage?.tree?.[selectedNodeIndex] || lineage?.tree?.[0] || {};
              return (
                <>
                  <div>
                    <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                      {activeNode.level} Details
                    </span>
                    <h4 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '4px' }}>
                      {activeNode.label}
                    </h4>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', marginTop: '6px' }}>
                      {activeNode.value}
                    </div>
                  </div>

                  <div style={{ padding: '12px', background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', borderRadius: '6px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '4px' }}>
                      Audit Specification & Formulation
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      {activeNode.detail}
                    </div>
                  </div>

                  {activeNode.breakdown && (
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '8px' }}>
                        Contributing Entities
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {activeNode.breakdown.map((item, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', background: 'var(--bg-subtle)', borderRadius: '4px', fontSize: '12px' }}>
                            <span style={{ color: 'var(--text-primary)' }}>{item.name}</span>
                            <span style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{item.val} ({item.pct})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                      <ShieldCheck size={16} color="var(--status-ready-text)" />
                      <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--status-ready-text)' }}>
                        Verified via SHA-256 Proof Chain
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        className="btn btn-secondary btn-sm" 
                        style={{ flex: 1 }}
                        onClick={() => alert('Downloading verified lineage audit packet with cryptographic signature (JSON/PDF)...')}
                      >
                        <Download size={13} />
                        <span>Export Audit Trail</span>
                      </button>
                      <button className="btn btn-primary btn-sm" onClick={onClose}>
                        Close Lineage
                      </button>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
