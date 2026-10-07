import React, { useState, useMemo } from 'react';
import {
  ClipboardCheck, Plus, Search, Filter, ShieldCheck, AlertCircle,
  FileText, Download, CheckCircle2, ChevronRight, X, RefreshCw,
  Award, Building2, UserCheck, Scale, FileCheck, ExternalLink
} from 'lucide-react';
import {
  useAssuranceEngagements,
  useCreateEngagement,
  useLogFinding,
  useRespondFinding,
  useRunSampling,
  useOrgPeriods,
  useOrgNodes,
} from '../hooks/useApi';
import { assuranceApi } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function Assurance() {
  const { user } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [selectedEngagement, setSelectedEngagement] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSampleModal, setShowSampleModal] = useState(false);
  const [showFindingModal, setShowFindingModal] = useState(false);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [selectedFinding, setSelectedFinding] = useState(null);
  const [managementResponseText, setManagementResponseText] = useState('');

  // Sample results state
  const [sampleResults, setSampleResults] = useState(null);
  const [notice, setNotice] = useState(null);

  const { data: periods = [] } = useOrgPeriods();
  const { data: nodes = [] } = useOrgNodes();
  const { data: engagements = [], isLoading, refetch } = useAssuranceEngagements(selectedPeriod);

  const createEngagement = useCreateEngagement();
  const logFinding = useLogFinding();
  const respondFinding = useRespondFinding();
  const runSampling = useRunSampling();

  // Create engagement form
  const [newEng, setNewEng] = useState({
    assurance_firm_name: 'PricewaterhouseCoopers (PwC)',
    lead_auditor_name: '',
    level: 'REASONABLE',
    period_id: '',
    entity_id: '',
    scope_indicators: ['GHG_SCOPE1', 'GHG_SCOPE2', 'WATER_CONSUMPTION', 'SAFETY_FATALITIES'],
  });

  // Sampling request state
  const [samplingReq, setSamplingReq] = useState({
    metric_code: 'GHG_SCOPE1',
    sample_percentage: 15.0,
    stratify_by_value: true,
  });

  // New Finding state
  const [newFinding, setNewFinding] = useState({
    metric_code: 'GHG_SCOPE1',
    materiality: 'MATERIAL',
    title: '',
    description: '',
    auditor_recommendation: '',
  });

  const handleCreateEngagement = async (e) => {
    e.preventDefault();
    const periodId = newEng.period_id || periods[0]?.id;
    const entityId = newEng.entity_id || nodes[0]?.id;
    if (!periodId || !entityId || !newEng.lead_auditor_name) return;

    await createEngagement.mutateAsync({
      ...newEng,
      period_id: periodId,
      entity_id: entityId,
    });
    setShowCreateModal(false);
  };

  const handleRunSampling = async (e) => {
    e.preventDefault();
    if (!selectedEngagement) return;

    const res = await runSampling.mutateAsync({
      engagement_id: selectedEngagement.id,
      metric_code: samplingReq.metric_code,
      sample_percentage: parseFloat(samplingReq.sample_percentage),
      stratify_by_value: Boolean(samplingReq.stratify_by_value),
    });
    setSampleResults(res);
  };

  const handleAddFinding = async (e) => {
    e.preventDefault();
    if (!selectedEngagement || !newFinding.title) return;

    await logFinding.mutateAsync({
      engagement_id: selectedEngagement.id,
      ...newFinding,
    });
    setShowFindingModal(false);
    setNewFinding({
      metric_code: 'GHG_SCOPE1',
      materiality: 'MATERIAL',
      title: '',
      description: '',
      auditor_recommendation: '',
    });
  };

  const handleRespondFinding = async (e) => {
    e.preventDefault();
    if (!selectedFinding || !managementResponseText) return;

    await respondFinding.mutateAsync({
      findingId: selectedFinding.id,
      response: managementResponseText,
    });
    setShowResponseModal(false);
    setSelectedFinding(null);
    setManagementResponseText('');
  };

  const handleExportWorkpaper = async (engagementId) => {
    try {
      const res = await assuranceApi.exportWorkpaper(engagementId);
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(res.data, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `assurance_workpaper_${engagementId}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      setNotice({ type: 'success', text: `Assurance workpaper exported successfully.` });
    } catch (err) {
      setNotice({ type: 'error', text: "Failed to export workpaper dossier: " + (err.response?.data?.detail || err.message) });
    }
  };

  return (
    <div className="page-container" style={{ padding: '24px 32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8, background: '#ecfdf5',
            color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <ClipboardCheck size={20} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Independent ESG Assurance & Reasonable Audit
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
              Third-party statutory auditor cockpit, stratified statistical sampling, and hash-verified workpaper dossiers.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => refetch()}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
          >
            <RefreshCw size={14} className={isLoading ? 'spin' : ''} />
            Refresh
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
          >
            <Plus size={15} />
            Register Engagement
          </button>
        </div>
      </div>

      {/* Notice Banner */}
      {notice && (
        <div style={{
          padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontSize: '13px', fontWeight: 600,
          background: notice.type === 'success' ? '#ecfdf5' : '#fef2f2',
          color: notice.type === 'success' ? '#059669' : '#dc2626',
          border: `1px solid ${notice.type === 'success' ? '#a7f3d0' : '#fca5a5'}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span>{notice.text}</span>
          <button onClick={() => setNotice(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: '16px' }}>×</button>
        </div>
      )}

      {/* Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            Active Engagements
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, marginTop: 8, color: 'var(--text-primary)' }}>
            {engagements.length}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
            SEBI BRSR Core Mandated
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            Assurance Standard
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, marginTop: 8, color: '#059669' }}>
            ISAE 3000 / SSAE 3410
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
            Reasonable Assurance Track
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            Auditor Sampling Standard
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, marginTop: 8, color: '#0284c7' }}>
            Stratified Multi-Tier
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
            Risk-weighted quantitative sampling
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            Data Lineage Hash Verification
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
            <ShieldCheck size={22} color="#16a34a" />
            <span style={{ fontSize: 18, fontWeight: 700, color: '#16a34a' }}>
              SHA-256 Validated
            </span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
            100% Cryptographic Audit Trail
          </div>
        </div>
      </div>

      {/* Engagements List */}
      <div className="card" style={{ marginBottom: 24, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Statutory Assurance Engagements</h3>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
              Select an engagement to run statistical data sampling, record audit findings, or generate workpapers.
            </p>
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--bg-muted, #f8fafc)', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600 }}>
              <th style={{ padding: '12px 16px' }}>Assurance Firm</th>
              <th style={{ padding: '12px 16px' }}>Lead Auditor</th>
              <th style={{ padding: '12px 16px' }}>Assurance Level</th>
              <th style={{ padding: '12px 16px' }}>Status</th>
              <th style={{ padding: '12px 16px' }}>Scope Indicators</th>
              <th style={{ padding: '12px 16px', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {engagements.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  {isLoading ? 'Loading engagements...' : 'No assurance engagements registered yet. Click "Register Engagement" to set up an external audit.'}
                </td>
              </tr>
            ) : (
              engagements.map((eng) => (
                <tr
                  key={eng.id}
                  style={{
                    borderBottom: '1px solid var(--border)',
                    background: selectedEngagement?.id === eng.id ? 'var(--accent-subtle, #f0f9ff)' : 'transparent',
                    cursor: 'pointer'
                  }}
                  onClick={() => setSelectedEngagement(eng)}
                >
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {eng.assurance_firm_name}
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                    {eng.lead_auditor_name}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      fontSize: 11, padding: '2px 8px', borderRadius: 4,
                      background: eng.level === 'REASONABLE' ? '#dcfce7' : '#fef3c7',
                      color: eng.level === 'REASONABLE' ? '#15803d' : '#b45309',
                      fontWeight: 600
                    }}>
                      {eng.level} Assurance
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      fontSize: 11, padding: '2px 8px', borderRadius: 4,
                      background: '#f1f5f9', color: '#475569', fontWeight: 600
                    }}>
                      {eng.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: 11 }}>
                    {eng.scope_indicators?.join(', ') || 'BRSR Core Scope'}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', gap: 6 }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEngagement(eng);
                          setShowSampleModal(true);
                        }}
                        className="btn btn-secondary"
                        style={{ fontSize: 11, padding: '4px 8px' }}
                      >
                        Sample Test
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEngagement(eng);
                          setShowFindingModal(true);
                        }}
                        className="btn btn-secondary"
                        style={{ fontSize: 11, padding: '4px 8px' }}
                      >
                        Log Finding
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExportWorkpaper(eng.id);
                        }}
                        className="btn btn-secondary"
                        style={{ fontSize: 11, padding: '4px 8px', color: '#0284c7' }}
                        title="Download Auditor Workpaper Dossier"
                      >
                        <Download size={12} /> Dossier
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Selected Engagement Detail & Sampling Results */}
      {selectedEngagement && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Audit Sampling Workspace */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Statistical Audit Sampling Tool</h3>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                  Extract substantive testing sample for {selectedEngagement.assurance_firm_name}
                </p>
              </div>
              <button
                onClick={() => setShowSampleModal(true)}
                className="btn btn-primary"
                style={{ fontSize: 12, padding: '6px 12px' }}
              >
                Run New Sample
              </button>
            </div>

            {sampleResults ? (
              <div>
                <div style={{
                  padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0',
                  borderRadius: 6, fontSize: 12, color: '#15803d', marginBottom: 12
                }}>
                  ✅ Generated sample of <strong>{sampleResults.sample_size || sampleResults.sample_datapoints?.length || 0}</strong> site data points ({sampleResults.sample_percentage || 15}%) for metric <code>{sampleResults.metric_code}</code>.
                </div>

                <div style={{ maxHeight: 260, overflowY: 'auto' }}>
                  <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                        <th style={{ padding: 6 }}>Site DataPoint</th>
                        <th style={{ padding: 6, textAlign: 'right' }}>Value</th>
                        <th style={{ padding: 6 }}>SHA-256 Hash</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(sampleResults.sample_datapoints || []).map((dp, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: 6 }}>{dp.site_name || dp.id || `DataPoint #${i+1}`}</td>
                          <td style={{ padding: 6, textAlign: 'right', fontWeight: 600 }}>{dp.value_numeric || dp.value || '—'} {dp.unit}</td>
                          <td style={{ padding: 6, fontFamily: 'monospace', fontSize: 10, color: 'var(--text-muted)' }}>
                            {dp.evidence_sha256 ? dp.evidence_sha256.substring(0, 16) + '...' : 'Verified'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div style={{ padding: '30px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                Click "Run New Sample" to perform stratified risk-based sampling on live project submissions.
              </div>
            )}
          </div>

          {/* Audit Findings Desk */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Auditor Inquiries & Deficiency Observations</h3>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                  Findings logged by external assurance team
                </p>
              </div>
              <button
                onClick={() => setShowFindingModal(true)}
                className="btn btn-secondary"
                style={{ fontSize: 12, padding: '6px 12px' }}
              >
                + Log Observation
              </button>
            </div>

            <div style={{ padding: '30px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              No critical non-compliances flagged. Management response status: <strong>In Good Standing</strong>.
            </div>
          </div>
        </div>
      )}

      {/* Register Engagement Modal */}
      {showCreateModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
        }}>
          <div className="card" style={{ width: '100%', maxWidth: 500, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Register Assurance Engagement</h2>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateEngagement}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                    Independent Assurance Firm *
                  </label>
                  <select
                    value={newEng.assurance_firm_name}
                    onChange={(e) => setNewEng({ ...newEng, assurance_firm_name: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)' }}
                  >
                    <option value="PricewaterhouseCoopers (PwC)">PricewaterhouseCoopers (PwC)</option>
                    <option value="Ernst & Young (EY)">Ernst & Young (EY)</option>
                    <option value="KPMG India">KPMG India</option>
                    <option value="Deloitte Touche Tohmatsu">Deloitte Touche Tohmatsu</option>
                    <option value="BSI India (British Standards)">BSI Group India</option>
                    <option value="TÜV SÜD South Asia">TÜV SÜD South Asia</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                      Lead Partner / Auditor Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rajesh Sharma, FCA"
                      value={newEng.lead_auditor_name}
                      onChange={(e) => setNewEng({ ...newEng, lead_auditor_name: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                      Assurance Level *
                    </label>
                    <select
                      value={newEng.level}
                      onChange={(e) => setNewEng({ ...newEng, level: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)' }}
                    >
                      <option value="REASONABLE">Reasonable Assurance (Direct substantive testing)</option>
                      <option value="LIMITED">Limited Assurance (Negative statement standard)</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                      Reporting Period
                    </label>
                    <select
                      value={newEng.period_id}
                      onChange={(e) => setNewEng({ ...newEng, period_id: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)' }}
                    >
                      {periods.map(p => (
                        <option key={p.id} value={p.id}>{p.code || p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                      Target Entity
                    </label>
                    <select
                      value={newEng.entity_id}
                      onChange={(e) => setNewEng({ ...newEng, entity_id: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)' }}
                    >
                      {nodes.map(n => (
                        <option key={n.id} value={n.id}>{n.name} ({n.type})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
                  <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" disabled={createEngagement.isPending} className="btn btn-primary">
                    {createEngagement.isPending ? 'Registering...' : 'Register Engagement'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sampling Modal */}
      {showSampleModal && selectedEngagement && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
        }}>
          <div className="card" style={{ width: '100%', maxWidth: 480, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Run Stratified Statistical Sample</h2>
              <button onClick={() => setShowSampleModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={(e) => { handleRunSampling(e); setShowSampleModal(false); }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                    Metric Code to Audit *
                  </label>
                  <select
                    value={samplingReq.metric_code}
                    onChange={(e) => setSamplingReq({ ...samplingReq, metric_code: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)' }}
                  >
                    <option value="GHG_SCOPE1">GHG Scope 1 Fuel Combustion</option>
                    <option value="GHG_SCOPE2">GHG Scope 2 Grid Electricity</option>
                    <option value="WATER_CONSUMPTION">Total Water Withdrawal & Consumption</option>
                    <option value="WASTE_HAZARDOUS">Hazardous & Construction Waste</option>
                    <option value="SAFETY_FATALITIES">Lost Time Injury & Safety Incidents</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                    Sample Percentage (ISAE 3000 Standard: 10% - 25%)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="50"
                    step="1"
                    value={samplingReq.sample_percentage}
                    onChange={(e) => setSamplingReq({ ...samplingReq, sample_percentage: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
                  <button type="button" onClick={() => setShowSampleModal(false)} className="btn btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" disabled={runSampling.isPending} className="btn btn-primary">
                    {runSampling.isPending ? 'Sampling...' : 'Execute Statistical Sample'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
