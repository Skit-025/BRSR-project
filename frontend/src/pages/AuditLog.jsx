import React, { useState } from 'react';
import { History, ShieldCheck, Download, Search, Filter, Database } from 'lucide-react';
import { MOCK_ACTIVITY_FEED } from '../mock/mockData';

export default function AuditLog() {
  const [search, setSearch] = useState('');

  const auditEvents = [
    { id: 'ev-01', time: 'Oct 06, 2026 · 19:42:10', actor: 'Aditya Varma', role: 'Group Admin', action: 'Consolidation Lock', entity: 'Group MEIL Scope 1 & 2', hash: '8f3a21b4a908…', ip: '10.24.12.8' },
    { id: 'ev-02', time: 'Oct 06, 2026 · 19:30:15', actor: 'Priya Verma', role: 'BU Reviewer', action: 'Approve Submission', entity: 'Highway Expansion (PRJ-101)', hash: 'a1b2c3d4e5f6…', ip: '10.24.18.91' },
    { id: 'ev-03', time: 'Oct 06, 2026 · 19:18:02', actor: 'Rahul Sharma', role: 'Project Maker', action: 'Submit Data Pack', entity: 'Highway Expansion (PRJ-101)', hash: 'e5f67890abcd…', ip: '10.24.44.12' },
    { id: 'ev-04', time: 'Oct 06, 2026 · 18:45:20', actor: 'Rahul Sharma', role: 'Project Maker', action: 'Upload Evidence', entity: 'Fuel_Register_April.pdf', hash: '8f3a21b4a908…', ip: '10.24.44.12' },
    { id: 'ev-05', time: 'Oct 06, 2026 · 17:10:44', actor: 'System Daemon', role: 'Calculation Engine', action: 'Aggregate Metrics', entity: 'Odisha Infrastructure BU', hash: 'c3d4e5f67890…', ip: '127.0.0.1' },
    { id: 'ev-06', time: 'Oct 06, 2026 · 15:22:18', actor: 'Dr. Radhika Sen', role: 'Auditor', action: 'Reasonable Assurance Sample', entity: 'Kurla BEST EV Telemetry', hash: 'd4e5f67890ab…', ip: '10.33.1.5' },
  ];

  const filtered = auditEvents.filter(e => 
    e.actor.toLowerCase().includes(search.toLowerCase()) ||
    e.action.toLowerCase().includes(search.toLowerCase()) ||
    e.entity.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontWeight: 600 }}>
            Compliance & Assurance
          </div>
          <h1 className="page-title" style={{ marginTop: '2px' }}>
            System Audit Log & Provenance Ledger
          </h1>
          <p className="page-sub">
            Immutable transaction log of every data submission, reviewer sign-off, and calculation event.
          </p>
        </div>

        <button className="btn btn-secondary btn-sm" onClick={() => alert('Exporting full audit trail (CSV/JSON)...')}>
          <Download size={13} />
          <span>Export Audit Ledger</span>
        </button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: '320px' }}>
            <Search size={14} color="var(--text-tertiary)" style={{ position: 'absolute', left: '10px', top: '12px' }} />
            <input
              type="text"
              placeholder="Search audit trail by actor, action, entity…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-control"
              style={{ width: '100%', paddingLeft: '32px' }}
            />
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
            Cryptographically sealed ledger
          </span>
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Actor & Role</th>
              <th>Action</th>
              <th>Target Entity</th>
              <th>SHA-256 Provenance Hash</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.id}>
                <td style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                  {item.time}
                </td>
                <td>
                  <div style={{ fontWeight: 600 }}>{item.actor}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{item.role}</div>
                </td>
                <td>
                  <span className="badge badge-neutral" style={{ fontWeight: 600 }}>
                    {item.action}
                  </span>
                </td>
                <td style={{ fontWeight: 550 }}>
                  {item.entity}
                </td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)' }}>
                  <ShieldCheck size={12} color="var(--status-ready-text)" style={{ display: 'inline', marginRight: '4px' }} />
                  {item.hash}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
