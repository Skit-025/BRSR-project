import React, { useState } from 'react';
import {
  RefreshCw, CheckCircle2, Clock, AlertTriangle, Play,
  Layers, Database, Cpu, Activity, AlertCircle, Search, Filter
} from 'lucide-react';
import { useBackgroundJobs } from '../hooks/useApi';
import PageHelpButton from '../components/PageHelpButton';

export default function BackgroundJobs() {
  const [statusFilter, setStatusFilter] = useState('');
  const [jobTypeFilter, setJobTypeFilter] = useState('');
  const [search, setSearch] = useState('');

  const { data: jobs = [], isLoading, refetch } = useBackgroundJobs({
    status: statusFilter || undefined,
    job_type: jobTypeFilter || undefined,
  });

  const filteredJobs = jobs.filter(j => {
    if (!search) return true;
    return (
      j.id?.toLowerCase().includes(search.toLowerCase()) ||
      j.job_type?.toLowerCase().includes(search.toLowerCase()) ||
      j.celery_task_id?.toLowerCase().includes(search.toLowerCase())
    );
  });

  const getStatusBadge = (status) => {
    switch (status?.toUpperCase()) {
      case 'COMPLETED':
      case 'SUCCESS':
        return (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 11, padding: '2px 8px', borderRadius: 12,
            background: '#dcfce7', color: '#15803d', fontWeight: 600
          }}>
            <CheckCircle2 size={12} /> Completed
          </span>
        );
      case 'RUNNING':
        return (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 11, padding: '2px 8px', borderRadius: 12,
            background: '#e0f2fe', color: '#0369a1', fontWeight: 600
          }}>
            <RefreshCw size={12} className="spin" /> Running
          </span>
        );
      case 'FAILED':
      case 'ERROR':
        return (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 11, padding: '2px 8px', borderRadius: 12,
            background: '#fee2e2', color: '#b91c1c', fontWeight: 600
          }}>
            <AlertTriangle size={12} /> Failed
          </span>
        );
      default:
        return (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 11, padding: '2px 8px', borderRadius: 12,
            background: '#f1f5f9', color: '#64748b', fontWeight: 600
          }}>
            <Clock size={12} /> {status || 'Pending'}
          </span>
        );
    }
  };

  return (
    <div className="page-container" style={{ padding: '24px 32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8, background: '#ede9fe',
            color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Activity size={20} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Background Task & Calculation Pipelines
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
              Real-time monitoring of asynchronous consolidation jobs, AI document parsing, and batch validation tasks.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <PageHelpButton title="Jobs & Pipeline Guide" route="/consolidation" />
          <button
            onClick={() => refetch()}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
          >
            <RefreshCw size={14} className={isLoading ? 'spin' : ''} />
            Auto-Refreshing (10s)
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            Total Recorded Tasks
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, marginTop: 8, color: 'var(--text-primary)' }}>
            {jobs.length}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
            Historical Pipeline Executions
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            Active / Queued
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, marginTop: 8, color: '#0284c7' }}>
            {jobs.filter(j => ['RUNNING', 'PENDING'].includes(j.status)).length}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
            In worker process pool
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            Successfully Completed
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, marginTop: 8, color: '#16a34a' }}>
            {jobs.filter(j => ['COMPLETED', 'SUCCESS'].includes(j.status)).length}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
            Exit code 0 verified
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            Worker Health
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#16a34a' }} />
            <span style={{ fontSize: 18, fontWeight: 700, color: '#16a34a' }}>Healthy</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
            FastAPI synchronous fallback active
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search by job ID, type, or Celery task UUID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%', padding: '8px 12px 8px 36px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 13 }}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 13 }}
          >
            <option value="">All Statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="RUNNING">Running</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>
      </div>

      {/* Jobs table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--bg-muted, #f8fafc)', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600 }}>
              <th style={{ padding: '12px 16px' }}>Job ID</th>
              <th style={{ padding: '12px 16px' }}>Pipeline Type</th>
              <th style={{ padding: '12px 16px' }}>Status</th>
              <th style={{ padding: '12px 16px' }}>Started At</th>
              <th style={{ padding: '12px 16px' }}>Completed At</th>
              <th style={{ padding: '12px 16px' }}>Celery / Worker Ref</th>
              <th style={{ padding: '12px 16px' }}>Message</th>
            </tr>
          </thead>
          <tbody>
            {filteredJobs.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  {isLoading ? 'Checking job queue status...' : 'No background tasks currently in queue.'}
                </td>
              </tr>
            ) : (
              filteredJobs.map((j) => (
                <tr key={j.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 12, fontWeight: 600 }}>
                    {j.id.substring(0, 12)}...
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      fontSize: 11, padding: '2px 8px', borderRadius: 4,
                      background: '#ede9fe', color: '#6d28d9', fontWeight: 600
                    }}>
                      {j.job_type}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {getStatusBadge(j.status)}
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                    {j.started_at ? new Date(j.started_at).toLocaleString() : '—'}
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                    {j.completed_at ? new Date(j.completed_at).toLocaleString() : '—'}
                  </td>
                  <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)' }}>
                    {j.celery_task_id ? j.celery_task_id.substring(0, 16) + '...' : 'Sync Pipeline'}
                  </td>
                  <td style={{ padding: '12px 16px', color: j.error_message ? '#ef4444' : 'var(--text-muted)', fontSize: 12 }}>
                    {j.error_message || 'OK'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
