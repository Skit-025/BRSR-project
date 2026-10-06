import React from 'react';
import { Info, X, FileText, CheckCircle2 } from 'lucide-react';
import { MOCK_WHY_REQUIRED } from '../mock/mockData';

export default function WhyRequiredModal({ parameterKey = 'diesel', isOpen, onClose }) {
  if (!isOpen) return null;

  const data = MOCK_WHY_REQUIRED[parameterKey] || MOCK_WHY_REQUIRED.diesel;

  return (
    <div className="command-backdrop" onClick={onClose} style={{ zIndex: 110 }}>
      <div 
        className="command-modal" 
        onClick={(e) => e.stopPropagation()} 
        style={{ maxWidth: '480px', padding: 0 }}
      >
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-muted)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Info size={15} color="var(--text-primary)" />
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Data Requirement Justification
            </span>
          </div>
          <button className="icon-btn" onClick={onClose} style={{ width: '24px', height: '24px' }}>
            <X size={14} />
          </button>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
              Why this data matters
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {data.description}
            </p>
          </div>

          <div style={{ padding: '14px', background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', borderRadius: '6px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-primary)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileText size={13} />
              <span>What should I upload?</span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
              {data.uploadRequirements}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
              Regulatory Mandate
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
              {data.brsrMapping}
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)' }}>
            <button className="btn btn-secondary btn-sm" onClick={onClose}>
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
