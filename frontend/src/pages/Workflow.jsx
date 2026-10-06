import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  CheckCircle2, AlertCircle, FileText, ArrowRight, ShieldCheck,
  Eye, Download, ZoomIn, ZoomOut, RotateCw, MessageSquare, ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Workflow() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [status, setStatus] = useState('In Review');
  const [comment, setComment] = useState('Diesel consumption figures match delivery slips. Logbook counters verified against IOCL fleet card records.');
  const [toastMessage, setToastMessage] = useState(null);
  const [zoom, setZoom] = useState(100);

  const handleApprove = () => {
    setStatus('Approved');
    setToastMessage('✓ Submission approved — triggering calculation pipeline');
    setTimeout(() => {
      navigate('/calculations?pipeline=active');
    }, 1200);
  };

  const handleRequestChanges = () => {
    setStatus('Changes Requested');
    setToastMessage('⚠ Changes requested — sent back to Project Maker');
  };

  return (
    <div className="page-content" style={{ maxWidth: '1600px' }}>
      {/* Toast Alert */}
      {toastMessage && (
        <div className="toast-container">
          <div className="toast">
            <CheckCircle2 size={15} color="var(--status-ready-text)" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="page-header" style={{ marginBottom: '16px' }}>
        <div>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontWeight: 600 }}>
            Maker-Checker Review
          </div>
          <h1 className="page-title" style={{ marginTop: '2px' }}>
            Project Submission Review — Highway Expansion (PRJ-101)
          </h1>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Submitted by Rahul Sharma (Project Maker) · Reporting Period: FY 2026 (April)
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className={`badge ${status === 'Approved' ? 'badge-ready' : status === 'Changes Requested' ? 'badge-attention' : 'badge-review'}`}>
            <span className="status-dot" />
            {status}
          </span>
        </div>
      </div>

      {/* Split Review View (Section 18 Specification: 50/50 Data vs Evidence) */}
      <div className="split-review-container">
        {/* Left Panel: Submitted Data */}
        <div className="split-review-panel">
          <div className="panel-toolbar">
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Submitted Metrics Pack
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
              SHA-256: 8f3a21b4…
            </span>
          </div>

          <div className="panel-content">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Highlight Metric: Fuel Consumption */}
              <div style={{ padding: '16px', background: 'var(--bg-subtle)', border: '1px solid var(--border-default)', borderRadius: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    High Speed Diesel (Fuel)
                  </div>
                  <span className="badge badge-ready">AI OCR Matched</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', fontSize: '12px' }}>
                  <div>
                    <div style={{ color: 'var(--text-tertiary)' }}>Submitted Value</div>
                    <div style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                      12,500 L
                    </div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-tertiary)' }}>Previous Period</div>
                    <div style={{ fontSize: '14px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                      11,800 L
                    </div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-tertiary)' }}>Calculated Scope 1</div>
                    <div style={{ fontSize: '14px', fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                      33.50 tCO₂e
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)', fontSize: '11px', color: 'var(--text-secondary)' }}>
                  Source: <em>Site Batching Plant & Mobile GenSet Fuel Logbook</em>
                </div>
              </div>

              {/* Metric 2: Water Consumption */}
              <div style={{ padding: '16px', background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', borderRadius: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Water Consumption (Municipal + Tanker)
                  </div>
                  <span className="badge badge-ready">Verified</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', fontSize: '12px' }}>
                  <div>
                    <div style={{ color: 'var(--text-tertiary)' }}>Submitted Value</div>
                    <div style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                      48,000 kL
                    </div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-tertiary)' }}>Previous Period</div>
                    <div style={{ fontSize: '14px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                      46,500 kL
                    </div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-tertiary)' }}>Recycled Share</div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--status-ready-text)' }}>
                      18.5%
                    </div>
                  </div>
                </div>
              </div>

              {/* Metric 3: Safety / LTIFR */}
              <div style={{ padding: '16px', background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', borderRadius: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Lost Time Injury Frequency Rate (LTIFR)
                  </div>
                  <span className="badge badge-ready">Zero Lost Days</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', fontSize: '12px' }}>
                  <div>
                    <div style={{ color: 'var(--text-tertiary)' }}>Reported LTIFR</div>
                    <div style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                      0.12
                    </div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-tertiary)' }}>Person-Hours Worked</div>
                    <div style={{ fontSize: '14px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                      142,800 hrs
                    </div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-tertiary)' }}>Site Fatalities</div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--status-ready-text)' }}>
                      0 (Nil)
                    </div>
                  </div>
                </div>
              </div>

              {/* Review Actions & Comment Box (Section 18 Specification) */}
              <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="input-field">
                  <label className="input-label">Reviewer Comments & Audit Notes</label>
                  <textarea
                    className="input-control"
                    style={{ height: '70px', padding: '8px 10px', fontSize: '12px', resize: 'vertical' }}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Enter audit notes or specific corrections requested…"
                  />
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    className="btn btn-secondary btn-sm"
                    onClick={handleRequestChanges}
                    style={{ flex: 1 }}
                  >
                    Request Changes
                  </button>
                  <button 
                    className="btn btn-primary btn-sm"
                    onClick={handleApprove}
                    style={{ flex: 1 }}
                  >
                    <CheckCircle2 size={13} />
                    <span>Approve Submission</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel: Embedded Evidence Document Viewer */}
        <div className="split-review-panel">
          <div className="panel-toolbar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={14} color="var(--text-primary)" />
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Fuel_Register_April.pdf
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>(1.8 MB)</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button className="icon-btn" style={{ width: '24px', height: '24px' }} onClick={() => setZoom(prev => Math.max(70, prev - 10))}>
                <ZoomOut size={12} />
              </button>
              <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)' }}>{zoom}%</span>
              <button className="icon-btn" style={{ width: '24px', height: '24px' }} onClick={() => setZoom(prev => Math.min(140, prev + 10))}>
                <ZoomIn size={12} />
              </button>
              <button className="icon-btn" style={{ width: '24px', height: '24px' }} onClick={() => alert('Downloading official signed PDF...')}>
                <Download size={12} />
              </button>
            </div>
          </div>

          <div className="pdf-preview-canvas">
            <div 
              className="mock-pdf-sheet"
              style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center', transition: 'transform 120ms' }}
            >
              {/* Simulated Document Header */}
              <div style={{ borderBottom: '2px solid #1a1a1a', paddingBottom: '12px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '14px', letterSpacing: '-0.02em' }}>ODISHA INFRASTRUCTURE LTD</div>
                  <div style={{ fontSize: '10px', color: '#555' }}>HIGHWAY EXPANSION PROJECT · PKG-04</div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '9px', color: '#666' }}>
                  <div>DOC REF: OIL-HW-HSD-2026-04</div>
                  <div>DATE: 30-APR-2026</div>
                </div>
              </div>

              {/* Simulated Document Content */}
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>
                MONTHLY HIGH SPEED DIESEL (HSD) CONSUMPTION LOG
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', marginBottom: '16px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #000', textAlign: 'left' }}>
                    <th style={{ padding: '4px' }}>Date</th>
                    <th style={{ padding: '4px' }}>Tanker / Dispenser</th>
                    <th style={{ padding: '4px' }}>Equip. / Use</th>
                    <th style={{ padding: '4px', textAlign: 'right' }}>Litres</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '4px' }}>04-Apr</td>
                    <td style={{ padding: '4px' }}>IOCL Bowzer #18</td>
                    <td style={{ padding: '4px' }}>Batching Plant GenSet 1</td>
                    <td style={{ padding: '4px', textAlign: 'right' }}>3,200</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '4px' }}>12-Apr</td>
                    <td style={{ padding: '4px' }}>IOCL Bowzer #18</td>
                    <td style={{ padding: '4px' }}>Excavator Fleet CAT-336</td>
                    <td style={{ padding: '4px', textAlign: 'right' }}>4,100</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '4px' }}>19-Apr</td>
                    <td style={{ padding: '4px' }}>IOCL Bowzer #22</td>
                    <td style={{ padding: '4px' }}>Vogele Paver & Rollers</td>
                    <td style={{ padding: '4px', textAlign: 'right' }}>2,800</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '4px' }}>27-Apr</td>
                    <td style={{ padding: '4px' }}>IOCL Bowzer #22</td>
                    <td style={{ padding: '4px' }}>Crusher Plant Genset</td>
                    <td style={{ padding: '4px', textAlign: 'right' }}>2,400</td>
                  </tr>
                  {/* Highlight Box representing AI OCR Confirmation */}
                  <tr style={{ background: '#fef08a', fontWeight: 700, borderTop: '2px solid #000' }}>
                    <td style={{ padding: '6px' }} colSpan={3}>TOTAL HSD CONSUMPTION (LITRES):</td>
                    <td style={{ padding: '6px', textAlign: 'right', fontSize: '12px' }}>12,500 L</td>
                  </tr>
                </tbody>
              </table>

              <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #ccc', display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#555' }}>
                <div>
                  <div>PREPARED BY:</div>
                  <div style={{ fontWeight: 600, color: '#000', marginTop: '2px' }}>Rahul Sharma (Site Store In-charge)</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div>VERIFIED BY:</div>
                  <div style={{ fontWeight: 600, color: '#000', marginTop: '2px' }}>Priya Verma (BU Auditor)</div>
                </div>
              </div>

              {/* Watermark Hash */}
              <div style={{ position: 'absolute', bottom: '12px', right: '20px', fontSize: '8px', color: '#aaa', fontFamily: 'monospace' }}>
                SHA-256: 8f3a21b4a908c6de7f12e45501
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
