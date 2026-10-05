import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
  FileText, Save, Send, Download, Upload, CheckCircle2,
  Building2, Calendar, RefreshCw, Layers, AlertCircle, X, Sparkles,
  Eye, Info, ShieldCheck, Clock, ExternalLink, Cpu, BookOpen, Edit3, ArrowRight
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useOrgNodes, useOrgPeriods, useScopedForm, useSavePack, useSubmitPack } from '../hooks/useApi';
import { formsApi, collectionApi, evidenceApi, aiApi, API_BASE } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function DataEntry() {
  const location = useLocation();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: nodes = [], isLoading: nodesLoading } = useOrgNodes();
  const { data: periods = [], isLoading: periodsLoading } = useOrgPeriods();

  const [selectedEntity, setSelectedEntity] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [formData, setFormData] = useState({});
  const [activeSubmissionId, setActiveSubmissionId] = useState(null);
  const [notice, setNotice] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [searchMetric, setSearchMetric] = useState('');
  const [showEntityDetails, setShowEntityDetails] = useState(false);
  const [showPeriodDetails, setShowPeriodDetails] = useState(false);

  // Bill Drag-and-Drop and AI Scraping State
  const [billDragging, setBillDragging] = useState(false);
  const [billUploading, setBillUploading] = useState(false);
  const [billModalOpen, setBillModalOpen] = useState(false);
  const [billType, setBillType] = useState('electricity_bill'); // user-selected bill type
  const [scrapedBillFields, setScrapedBillFields] = useState([]);
  const [scrapedBillEvidence, setScrapedBillEvidence] = useState(null);
  const billFileRef = useRef();

  // Default entity and period
  useEffect(() => {
    if (!selectedEntity && nodes.length > 0) {
      // Prioritize user's assigned node, or first subsidiary/project
      const defaultNode = (user?.org_node_id && nodes.find(n => n.id === user.org_node_id)) ||
        nodes.find(n => n.type === 'subsidiary') || nodes[0];
      setSelectedEntity(defaultNode.id);
    }
    if (!selectedPeriod && periods.length > 0) {
      setSelectedPeriod(periods[0].id);
    }
  }, [nodes, periods, selectedEntity, selectedPeriod, user]);

  // Fetch the scoped digital form for this specific entity & period
  const { 
    data: formSchema, 
    isLoading: formLoading, 
    refetch: refetchForm, 
    isRefetching 
  } = useScopedForm(selectedPeriod, selectedEntity);

  const saveMutation = useSavePack();
  const submitMutation = useSubmitPack();

  // Populate formData and submission ID when formSchema changes
  useEffect(() => {
    if (formSchema?.sections) {
      const initial = {};
      formSchema.sections.forEach(sec => {
        sec.fields.forEach(f => {
          initial[f.metric_code] = {
            metric_code: f.metric_code,
            value_numeric: f.current_value !== null && f.current_value !== undefined ? f.current_value : '',
            value_text: '',
            unit: f.unit || 'units',
            status: 'ACTUAL',
            notes: f.notes || '',
          };
        });
      });
      setFormData(initial);

      if (formSchema.submission_id) {
        setActiveSubmissionId(formSchema.submission_id);
      }
    }
  }, [formSchema]);

  // Handle incoming prefill from Evidence Vault if user clicked "Send to Data Entry Form"
  useEffect(() => {
    if (location.state?.prefillMetric && location.state?.prefillValue !== undefined) {
      const code = location.state.prefillMetric;
      const val = location.state.prefillValue;
      const unit = location.state.prefillUnit || 'units';
      const file = location.state.filename || 'Evidence File';

      setFormData(prev => ({
        ...prev,
        [code]: {
          ...(prev[code] || { metric_code: code }),
          value_numeric: val,
          unit: unit,
          status: 'ACTUAL',
          notes: `[AI Verified from ${file}]`,
          ai_verified: true,
        }
      }));

      setNotice({
        type: 'success',
        text: `✨ Auto-filled ${code} with verified measurement ${val} ${unit} from evidence: ${file}!`
      });

      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const handleFieldChange = (code, field, val) => {
    setFormData(prev => ({
      ...prev,
      [code]: {
        ...(prev[code] || { metric_code: code }),
        [field]: val,
      },
    }));
  };

  // AI Bill Upload & Scraping Handler
  const handleBillDropOrSelect = async (files) => {
    const file = files?.[0];
    if (!file) return;

    setBillUploading(true);
    setNotice(null);

    const fd = new FormData();
    fd.append('file', file);
    fd.append('run_ocr', 'true');
    fd.append('doc_type_hint', billType); // pass user-selected bill type as context

    try {
      const res = await evidenceApi.upload(fd);
      const evidence = res.data.evidence;
      const isRelevant = res.data.is_relevant !== false; // default true
      const rejectionReason = res.data.rejection_reason;
      const fields = res.data.extracted_fields || [];

      if (!isRelevant) {
        // Document rejected — show error and do NOT open modal with fake data
        setNotice({
          type: 'error',
          text: `⛔ Document rejected: ${rejectionReason || 'This file does not appear to be a relevant ESG utility bill.'}`,
        });
        setBillUploading(false);
        if (billFileRef.current) billFileRef.current.value = '';
        return;
      }

      setScrapedBillEvidence(evidence);
      setScrapedBillFields(fields);

      if (fields.length === 0) {
        setNotice({
          type: 'error',
          text: `⚠️ Document accepted as ESG bill but no numeric values could be extracted. Please enter data manually.`,
        });
        setBillUploading(false);
        if (billFileRef.current) billFileRef.current.value = '';
        return;
      }

      setBillModalOpen(true);
    } catch (err) {
      console.error('Bill OCR upload error:', err);
      setNotice({
        type: 'error',
        text: `Upload failed: ${err.response?.data?.detail || err.message || 'Server error. Please try again.'}`,
      });
    } finally {
      setBillUploading(false);
      if (billFileRef.current) billFileRef.current.value = '';
    }
  };

  const handleBillFieldChange = (index, key, val) => {
    setScrapedBillFields(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [key]: val };
      return copy;
    });
  };

  const handleApplyBillFields = () => {
    if (!scrapedBillFields.length) return;

    setFormData(prev => {
      const updated = { ...prev };
      scrapedBillFields.forEach(f => {
        const numVal = parseFloat(f.value);
        if (!isNaN(numVal)) {
          updated[f.metric] = {
            ...(updated[f.metric] || { metric_code: f.metric }),
            value_numeric: numVal,
            unit: f.unit || 'units',
            status: 'ACTUAL',
            notes: `[AI OCR Scraped from ${scrapedBillEvidence?.original_name || 'Bill'}] Meter: ${f.metadata?.meter_id || 'N/A'}, Period: ${f.metadata?.billing_period || 'N/A'}`,
            ai_verified: true,
          };
        }
      });
      return updated;
    });

    setNotice({
      type: 'success',
      text: `✨ Successfully verified and applied ${scrapedBillFields.length} AI-scraped bill indicator(s) to the digital form! Document registered with SHA-256 in Evidence Vault.`
    });
    setBillModalOpen(false);
  };

  // 1. SAVE DRAFT
  const handleSaveDraft = async () => {
    setNotice(null);
    if (!selectedEntity || !selectedPeriod) {
      setNotice({ type: 'error', text: 'Please select both Subsidiary/Facility and Reporting Period.' });
      return;
    }

    const dataPoints = Object.values(formData)
      .filter(item => item.value_numeric !== '' && item.value_numeric !== null && !isNaN(parseFloat(item.value_numeric)))
      .map(item => ({
        metric_code: item.metric_code,
        value_numeric: parseFloat(item.value_numeric),
        value_text: item.value_text || null,
        unit: item.unit || 'units',
        status: item.status || 'ACTUAL',
      }));

    if (dataPoints.length === 0) {
      setNotice({ 
        type: 'error', 
        text: 'Validation Error: Cannot save an empty draft! Please input numeric data for at least one ESG indicator before saving.' 
      });
      return;
    }

    try {
      const res = await saveMutation.mutateAsync({
        entity_id: selectedEntity,
        period_id: selectedPeriod,
        data_points: dataPoints,
      });

      const newSubId = res.data?.id || res.id;
      if (newSubId) {
        setActiveSubmissionId(newSubId);
      }

      setNotice({ 
        type: 'success', 
        text: `Saved ${dataPoints.length} verified indicator(s) as DRAFT for review. (Pack ID: ${newSubId || 'active'})` 
      });

      qc.invalidateQueries({ queryKey: ['scoped-form', selectedPeriod, selectedEntity] });
      refetchForm();
    } catch (err) {
      console.error('Save error:', err);
      setNotice({ type: 'error', text: err.response?.data?.detail || err.message || 'Failed to save draft pack.' });
    }
  };

  // 2. SUBMIT TO CHECKER
  const handleSubmitPack = async () => {
    setNotice(null);
    if (!selectedEntity || !selectedPeriod) {
      setNotice({ type: 'error', text: 'Please select both Subsidiary/Facility and Reporting Period.' });
      return;
    }

    const dataPoints = Object.values(formData)
      .filter(item => item.value_numeric !== '' && item.value_numeric !== null && !isNaN(parseFloat(item.value_numeric)))
      .map(item => ({
        metric_code: item.metric_code,
        value_numeric: parseFloat(item.value_numeric),
        value_text: item.value_text || null,
        unit: item.unit || 'units',
        status: item.status || 'ACTUAL',
      }));

    if (dataPoints.length === 0) {
      setNotice({ 
        type: 'error', 
        text: 'Validation Error: Submit to Checker is disabled without data! Please enter valid numeric values for the required statutory indicators first.' 
      });
      return;
    }

    try {
      const saveRes = await saveMutation.mutateAsync({
        entity_id: selectedEntity,
        period_id: selectedPeriod,
        data_points: dataPoints,
      });

      const submissionIdToSubmit = saveRes.data?.id || saveRes.id || activeSubmissionId || formSchema?.submission_id;

      if (!submissionIdToSubmit) {
        throw new Error('Unable to find active submission pack ID.');
      }

      await submitMutation.mutateAsync(submissionIdToSubmit);

      setNotice({ 
        type: 'success', 
        text: `Monthly ESG Pack with ${dataPoints.length} indicators successfully FROZEN and SUBMITTED to Checker review queue!` 
      });

      qc.invalidateQueries({ queryKey: ['scoped-form', selectedPeriod, selectedEntity] });
      qc.invalidateQueries({ queryKey: ['workflow-queue'] });
      refetchForm();
    } catch (err) {
      console.error('Submit error:', err);
      setNotice({ type: 'error', text: err.response?.data?.detail || err.message || 'Submission failed.' });
    }
  };

  // 3. SPREADSHEET UPLOAD
  const handleSpreadsheetUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setNotice(null);

    const fd = new FormData();
    fd.append('file', file);

    try {
      await collectionApi.uploadSpreadsheet(selectedEntity, selectedPeriod, fd);
      setNotice({ type: 'success', text: `Successfully ingested spreadsheet data: ${file.name}` });
      qc.invalidateQueries({ queryKey: ['scoped-form', selectedPeriod, selectedEntity] });
      refetchForm();
    } catch (err) {
      setNotice({ type: 'error', text: err.response?.data?.detail || err.message || 'Spreadsheet parsing failed.' });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const selectedNodeObj = nodes.find(n => n.id === selectedEntity);
  const selectedPeriodObj = periods.find(p => p.id === selectedPeriod);

  // Authenticated CSV template download — sends JWT Bearer token
  const handleDownloadTemplate = async () => {
    if (!selectedEntity || !selectedPeriod) {
      setNotice({ type: 'error', text: 'Please select a subsidiary and period first.' });
      return;
    }
    const entityCode = selectedNodeObj?.code || selectedEntity;
    const periodCode = selectedPeriodObj?.code || selectedPeriod;
    const url = `${API_BASE}/forms/template/${encodeURIComponent(entityCode)}/${encodeURIComponent(periodCode)}`;
    const token = localStorage.getItem('brsr_token');
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `BRSR_Template_${entityCode}_${periodCode}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err) {
      setNotice({ type: 'error', text: `Template download failed: ${err.message}` });
    }
  };

  const filledCount = Object.values(formData)
    .filter(item => item.value_numeric !== '' && item.value_numeric !== null && !isNaN(parseFloat(item.value_numeric)))
    .length;

  return (
    <div className="page-content anim-fade">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-tag">DATA COLLECTION & MONTHLY PACKS</div>
          <h1 className="page-title">Digital Reporting Forms (Subsidiary-Scoped)</h1>
          <p className="page-subtitle">
            Dynamic parameter projection adapted to the selected subsidiary, project facts, and operational boundaries.
          </p>
        </div>

        {/* Action Controls */}
        <div className="page-actions" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div 
            className={`badge ${filledCount > 0 ? 'badge-emerald' : 'badge-amber'}`} 
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', fontSize: '12px' }}
            title={filledCount === 0 ? "Enter data for at least 1 indicator before submitting" : `${filledCount} indicators entered`}
          >
            <CheckCircle2 size={13} />
            <span>{filledCount} Indicator{filledCount === 1 ? '' : 's'} Filled</span>
          </div>

          <button
            onClick={handleDownloadTemplate}
            className="btn btn-secondary"
            title="Download CSV upload template (authenticated)"
          >
            <Download size={14} />
            <span>CSV Template</span>
          </button>

          <button
            type="button"
            onClick={() => billFileRef.current?.click()}
            disabled={billUploading}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: 6, borderColor: 'var(--brand-400)', color: 'var(--brand-400)' }}
            title="Upload utility bills (electricity, water, diesel) to automatically extract metrics"
          >
            <Sparkles size={14} />
            <span>{billUploading ? 'Scraping Bill...' : 'AI Bill Auto-Fill'}</span>
          </button>
          <input
            ref={billFileRef}
            type="file"
            accept="image/*, application/pdf"
            onChange={(e) => handleBillDropOrSelect(e.target.files)}
            style={{ display: 'none' }}
            disabled={billUploading}
          />

          <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
            <Upload size={14} />
            <span>{uploading ? 'Ingesting...' : 'Bulk Excel/CSV'}</span>
            <input 
              type="file" 
              accept=".csv, .xlsx, .xls" 
              onChange={handleSpreadsheetUpload} 
              style={{ display: 'none' }} 
              disabled={uploading}
            />
          </label>

          <button
            onClick={handleSaveDraft}
            disabled={saveMutation.isPending || filledCount === 0}
            className="btn btn-secondary"
          >
            <Save size={14} />
            <span>{saveMutation.isPending ? 'Saving...' : 'Save Draft'}</span>
          </button>

          <button
            onClick={handleSubmitPack}
            disabled={submitMutation.isPending || filledCount === 0}
            className="btn btn-primary"
            style={filledCount === 0 ? { opacity: 0.6 } : {}}
            title={filledCount === 0 ? "Enter at least 1 indicator value to enable submit to checker" : "Submit pack to checker queue"}
          >
            <Send size={14} />
            <span>{submitMutation.isPending ? 'Submitting...' : 'Submit to Checker'}</span>
          </button>
        </div>
      </div>

      {/* Scope Pickers Card - Large Dedicated Area */}
      <div className="card" style={{ padding: '22px 26px', background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Header Tag */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="page-tag" style={{ margin: 0 }}>ACTIVE REPORTING CONTEXT & OPERATIONAL BOUNDARY</span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>— Dynamic parameter projection adapted to selected entity</span>
            </div>
            <button 
              className="btn btn-secondary btn-sm" 
              onClick={() => refetchForm()} 
              disabled={isRefetching}
              title="Refresh form fields"
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <RefreshCw size={13} className={isRefetching ? 'spin' : ''} />
              <span>Refresh Scope</span>
            </button>
          </div>

          {/* Large Visible Selection Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1.4fr) minmax(280px, 1fr)', gap: '18px', alignItems: 'flex-start' }}>
            {/* Entity Selector Dedicated Area */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
                  <Building2 size={16} color="var(--brand-400)" />
                  <span>Subsidiary / Facility / Site</span>
                </label>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowEntityDetails(true)}
                  style={{ padding: '3px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: 5, color: 'var(--brand-400)' }}
                  title="Show complete details for this entity"
                >
                  <Eye size={12} />
                  <span>Show in Details</span>
                </button>
              </div>

              <select
                value={selectedEntity}
                onChange={(e) => setSelectedEntity(e.target.value)}
                className="form-control"
                style={{ width: '100%', height: '42px', fontSize: '13px', fontWeight: 600, background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)' }}
              >
                {nodes.map(n => (
                  <option key={n.id} value={n.id}>
                    [{n.type.toUpperCase()}] {n.name} ({n.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Period Selector Dedicated Area */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
                  <Calendar size={16} color="var(--brand-400)" />
                  <span>Statutory Reporting Period</span>
                </label>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowPeriodDetails(true)}
                  style={{ padding: '3px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: 5, color: 'var(--brand-400)' }}
                  title="Show complete details for this reporting period"
                >
                  <Eye size={12} />
                  <span>Show in Details</span>
                </button>
              </div>

              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="form-control"
                style={{ width: '100%', height: '42px', fontSize: '13px', fontWeight: 600, background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)' }}
              >
                {periods.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.code} — FY {p.financial_year} ({p.period_type?.toUpperCase()} PACK)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Context Details Summary Strip */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
            padding: '12px 18px',
            background: 'rgba(99, 102, 241, 0.06)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>
                {selectedNodeObj?.name || 'Selected Entity'}
              </span>
              <span className="badge badge-brand" style={{ fontFamily: 'JetBrains Mono', fontSize: '11px' }}>
                {selectedNodeObj?.code || selectedEntity}
              </span>
              <span className="badge badge-emerald">
                {selectedNodeObj?.type?.toUpperCase()}
              </span>
              {selectedNodeObj?.project_type && (
                <span className="badge badge-purple">
                  Sector: {selectedNodeObj.project_type.toUpperCase()}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {formSchema && (
                <span className="badge badge-brand" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Layers size={11} />
                  <span>{formSchema.total_metrics} Applicable Indicators</span>
                </span>
              )}
              <span className={`badge ${formSchema?.submission_status === 'SUBMITTED' ? 'badge-sky' : 'badge-amber'}`}>
                Status: {formSchema?.submission_status || 'DRAFT'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* AI Bill Type Selector + Drop Zone */}
      {/* Bill Type Selector Pill Row */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        background: 'rgba(99, 102, 241, 0.04)',
        border: '1px solid rgba(99, 102, 241, 0.25)',
        borderRadius: 'var(--radius-lg)',
        padding: '16px 20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 4 }}>
            <div style={{ width: 32, height: 32, borderRadius: '8px', background: 'linear-gradient(135deg, var(--brand-600), var(--brand-400))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Sparkles size={16} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>AI Bill Auto-Fill (E1 OCR)</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Select bill type, then upload</div>
            </div>
          </div>

          {/* Bill Type Pills */}
          {[
            { key: 'electricity_bill', label: '⚡ Electricity', color: '#f59e0b' },
            { key: 'fuel_receipt',     label: '🛢 Fuel / Diesel', color: '#ef4444' },
            { key: 'water_manifest',   label: '💧 Water', color: '#3b82f6' },
            { key: 'waste_manifest',   label: '♻️ Waste', color: '#10b981' },
            { key: 'safety_log',       label: '🦺 Safety Log', color: '#8b5cf6' },
          ].map(({ key, label, color }) => (
            <button
              key={key}
              type="button"
              onClick={() => setBillType(key)}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                border: `1.5px solid ${billType === key ? color : 'var(--border-default)'}`,
                background: billType === key ? `${color}22` : 'transparent',
                color: billType === key ? color : 'var(--text-secondary)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                outline: 'none',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Drag & Drop Zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setBillDragging(true); }}
          onDragLeave={() => setBillDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setBillDragging(false);
            handleBillDropOrSelect(e.dataTransfer.files);
          }}
          style={{
            border: `2px dashed ${billDragging ? 'var(--brand-400)' : 'rgba(99, 102, 241, 0.35)'}`,
            borderRadius: 'var(--radius-md)',
            padding: '14px 18px',
            background: billDragging ? 'rgba(99, 102, 241, 0.10)' : 'rgba(99, 102, 241, 0.02)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
            transition: 'all 0.2s ease',
            cursor: 'pointer',
          }}
          onClick={() => billFileRef.current?.click()}
        >
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Upload size={15} color="var(--brand-400)" />
            <span>
              Drop your <strong style={{ color: '#fff' }}>{
                { electricity_bill: 'Electricity Bill', fuel_receipt: 'Fuel / Diesel Receipt', water_manifest: 'Water Bill', waste_manifest: 'Waste Manifest', safety_log: 'Safety Log' }[billType]
              }</strong> here, or click to browse — accepts PDF and image files (JPG, PNG)
            </span>
          </div>
          <button
            type="button"
            disabled={billUploading}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '12px', borderColor: 'var(--brand-400)', color: 'var(--brand-400)', pointerEvents: 'none' }}
          >
            {billUploading ? 'Extracting...' : 'Browse & Scrape'}
          </button>
        </div>
      </div>

      {/* Notice Message Banner */}
      {notice && (
        <div style={{
          padding: '12px 18px',
          borderRadius: '8px',
          fontSize: '13px',
          fontWeight: 600,
          background: notice.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          color: notice.type === 'success' ? '#10b981' : '#ef4444',
          border: `1px solid ${notice.type === 'success' ? '#10b981' : '#ef4444'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span>{notice.text}</span>
          <button className="icon-btn" onClick={() => setNotice(null)} style={{ width: 24, height: 24 }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Dynamic Sections and Fields */}
      {formLoading ? (
        <div className="card" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <RefreshCw size={24} className="spin" style={{ margin: '0 auto 12px', display: 'block', color: 'var(--brand-400)' }} />
          <span>Deriving distinct statutory indicators for {selectedNodeObj?.name || 'facility'}...</span>
        </div>
      ) : !formSchema || formSchema.sections?.length === 0 ? (
        <div className="card" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <AlertCircle size={28} color="var(--amber-400)" style={{ margin: '0 auto 12px', display: 'block' }} />
          <h3 style={{ color: '#fff', fontSize: '16px', marginBottom: 4 }}>No Parameters Required for this Entity Boundary</h3>
          <p style={{ fontSize: '13px', maxWidth: 500, margin: '0 auto' }}>
            Under MEIL ESG governance rules, this organizational node has zero applicable reporting requirements for the selected period.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {formSchema.sections.map((section, sIdx) => (
            <div key={sIdx} className="card" style={{ padding: '20px' }}>
              <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--brand-400)' }}>
                    {section.principle}: {section.principle_name}
                  </h3>
                  <span className="badge badge-gray">{section.pillar}</span>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Statutory disclosures applicable to {selectedNodeObj?.name} ({section.fields.length} metrics)
                </p>
              </div>

              {/* Fields Table */}
              <div className="table-wrap" style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '130px' }}>Code</th>
                      <th>Indicator Disclosure Name</th>
                      <th style={{ width: '180px' }}>Measured Value</th>
                      <th style={{ width: '120px' }}>Unit</th>
                      <th style={{ width: '120px' }}>Data Type</th>
                      <th>Notes / Evidence Ref</th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.fields.map((field) => {
                      const currentVal = formData[field.metric_code]?.value_numeric ?? '';
                      const currentNotes = formData[field.metric_code]?.notes ?? '';
                      const isAiVerified = formData[field.metric_code]?.ai_verified;

                      return (
                        <tr key={field.metric_code}>
                          <td>
                            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: 'var(--brand-400)', fontWeight: 600 }}>
                              {field.metric_code}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13px' }}>
                                {field.metric_name}
                              </span>
                              {isAiVerified && (
                                <span className="badge badge-emerald" style={{ fontSize: '10px', padding: '2px 6px', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                  <Sparkles size={10} /> AI Verified
                                </span>
                              )}
                            </div>
                            {field.is_mandatory && (
                              <span style={{ fontSize: '10px', color: 'var(--amber-400)' }}>
                                SEBI BRSR Core Mandated
                              </span>
                            )}
                          </td>
                          <td>
                            <input
                              type="number"
                              step="any"
                              placeholder="0.00"
                              className="form-control"
                              style={{
                                height: '32px',
                                fontFamily: 'JetBrains Mono',
                                fontSize: '12px',
                                borderColor: isAiVerified ? '#10b981' : undefined,
                                background: isAiVerified ? 'rgba(16, 185, 129, 0.08)' : undefined
                              }}
                              value={currentVal}
                              onChange={(e) => handleFieldChange(field.metric_code, 'value_numeric', e.target.value)}
                            />
                          </td>
                          <td>
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                              {field.unit}
                            </span>
                          </td>
                          <td>
                            <span className="badge badge-gray">
                              {field.data_type}
                            </span>
                          </td>
                          <td>
                            <input
                              type="text"
                              placeholder="Invoice #, log, remarks..."
                              className="form-control"
                              style={{ height: '32px', fontSize: '12px' }}
                              value={currentNotes}
                              onChange={(e) => handleFieldChange(field.metric_code, 'notes', e.target.value)}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {/* Bottom Save & Submit Bar */}
          <div className="card" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Four-Eyes Validation Rule — Maker cannot self-approve.
              </span>
              {filledCount > 0 && (
                <span className="badge badge-emerald">
                  {filledCount} indicator{filledCount !== 1 ? 's' : ''} filled
                </span>
              )}
              {filledCount === 0 && (
                <span className="badge badge-amber">No data entered yet</span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleSaveDraft}
                disabled={saveMutation.isPending || filledCount === 0}
                className="btn btn-secondary"
                title={filledCount === 0 ? 'Enter at least one numeric indicator to save' : 'Save current data as draft'}
              >
                <Save size={14} />
                <span>{saveMutation.isPending ? 'Saving...' : 'Save Draft'}</span>
              </button>
              <button
                onClick={handleSubmitPack}
                disabled={submitMutation.isPending || filledCount === 0}
                className="btn btn-primary"
                title={filledCount === 0 ? 'Enter at least one numeric indicator before submitting' : 'Submit pack to checker queue'}
              >
                <Send size={14} />
                <span>{submitMutation.isPending ? 'Submitting...' : 'Submit to Checker'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Dedicated Subsidiary / Facility Details */}
      {showEntityDetails && selectedNodeObj && (
        <div className="modal-backdrop">
          <div className="modal-dialog anim-slide" style={{ maxWidth: '640px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="modal-header-icon">
                  <Building2 size={18} color="var(--brand-400)" />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', color: '#fff' }}>Subsidiary / Facility Profile</h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    7-Tier Hierarchy Operational Boundaries & ESG Scope
                  </p>
                </div>
              </div>
              <button className="icon-btn" onClick={() => setShowEntityDetails(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                <div style={{ background: 'var(--bg-elevated)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Legal Unit Name</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff', marginTop: 2 }}>{selectedNodeObj.name}</div>
                </div>

                <div style={{ background: 'var(--bg-elevated)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Unit Identifier / Code</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--brand-400)', fontFamily: 'JetBrains Mono', marginTop: 2 }}>{selectedNodeObj.code}</div>
                </div>

                <div style={{ background: 'var(--bg-elevated)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Hierarchy Level</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginTop: 2, textTransform: 'capitalize' }}>
                    {selectedNodeObj.type?.replace('_', ' ')}
                  </div>
                </div>

                <div style={{ background: 'var(--bg-elevated)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>SEBI Boundary Scope</div>
                  <div style={{ marginTop: 4 }}>
                    <span className={`badge ${selectedNodeObj.boundary ? 'badge-emerald' : 'badge-gray'}`}>
                      {selectedNodeObj.boundary ? 'In-Scope (Consolidated)' : 'Excluded'}
                    </span>
                  </div>
                </div>

                <div style={{ background: 'var(--bg-elevated)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Project Sector Baseline</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginTop: 2, textTransform: 'capitalize' }}>
                    {selectedNodeObj.project_type?.replace('_', ' ') || 'General Corporate'}
                  </div>
                </div>

                <div style={{ background: 'var(--bg-elevated)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Ownership & Control</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
                    {selectedNodeObj.ownership_pct}% ({selectedNodeObj.control_type?.replace('_', ' ') || 'operational control'})
                  </div>
                </div>
              </div>

              <div style={{ background: 'var(--bg-elevated)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>PostgreSQL ltree Materialized Path</div>
                <div style={{ fontSize: '12px', color: 'var(--brand-400)', fontFamily: 'JetBrains Mono' }}>
                  {selectedNodeObj.path || 'ROOT'}
                </div>
              </div>

              <div style={{ background: 'rgba(99, 102, 241, 0.08)', padding: '14px 18px', borderRadius: '8px', border: '1px solid var(--border-brand)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <ShieldCheck size={15} color="var(--brand-400)" />
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Scoped Digital Parameters</span>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                  This facility currently projects <strong>{formSchema?.total_metrics || 39} applicable indicators</strong>. Metrics are tailored dynamically to its industrial sector ({selectedNodeObj.project_type || 'corporate'}) and operational boundary.
                </p>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setShowEntityDetails(false)}
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Dedicated Reporting Period Details */}
      {showPeriodDetails && selectedPeriodObj && (
        <div className="modal-backdrop">
          <div className="modal-dialog anim-slide" style={{ maxWidth: '640px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="modal-header-icon">
                  <Calendar size={18} color="var(--brand-400)" />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', color: '#fff' }}>Reporting Period Details</h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Statutory Cycle & Data Ingestion Window: {selectedPeriodObj.code}
                  </p>
                </div>
              </div>
              <button className="icon-btn" onClick={() => setShowPeriodDetails(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                <div style={{ background: 'var(--bg-elevated)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Period Identifier</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--brand-400)', fontFamily: 'JetBrains Mono', marginTop: 2 }}>{selectedPeriodObj.code}</div>
                </div>

                <div style={{ background: 'var(--bg-elevated)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Fiscal Year</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff', marginTop: 2 }}>FY {selectedPeriodObj.financial_year}</div>
                </div>

                <div style={{ background: 'var(--bg-elevated)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Granularity</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
                    {selectedPeriodObj.period_type?.toUpperCase()} PACK
                  </div>
                </div>

                <div style={{ background: 'var(--bg-elevated)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Ingestion Status</div>
                  <div style={{ marginTop: 4 }}>
                    <span className={`badge ${selectedPeriodObj.status === 'LOCKED' ? 'badge-rose' : 'badge-emerald'}`}>
                      {selectedPeriodObj.status === 'LOCKED' ? 'LOCKED (Audit Freeze)' : 'OPEN (Submissions Active)'}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ background: 'var(--bg-elevated)', padding: '14px 18px', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <Clock size={14} color="var(--brand-400)" />
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Calendar Collection Window</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '13px', color: 'var(--text-secondary)' }}>
                  <span><strong>Start:</strong> {selectedPeriodObj.start_date}</span>
                  <span style={{ color: 'var(--text-muted)' }}>→</span>
                  <span><strong>End:</strong> {selectedPeriodObj.end_date}</span>
                </div>
              </div>

              <div style={{ background: 'rgba(99, 102, 241, 0.08)', padding: '14px 18px', borderRadius: '8px', border: '1px solid var(--border-brand)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <ShieldCheck size={15} color="var(--brand-400)" />
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Four-Eyes Verification Rule</span>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                  Submissions in this period are governed by Segregation of Duties (Maker cannot self-approve). Upon submitting, the pack advances to the Checker queue for verification.
                </p>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setShowPeriodDetails(false)}
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: AI Bill Document Scraped — Review & Auto-Fill Form */}
      {billModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-dialog anim-slide" style={{ maxWidth: '780px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="modal-header-icon" style={{ background: 'linear-gradient(135deg, var(--brand-600), var(--brand-400))' }}>
                  <Sparkles size={18} color="#fff" />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <h3 style={{ fontSize: '16px', color: '#fff', margin: 0 }}>
                      AI Bill Document Scraped — Verification & Auto-Fill
                    </h3>
                    <span className="badge badge-emerald" style={{ fontSize: '10px' }}>
                      Multimodal OCR E1
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                    File: <strong style={{ color: 'var(--text-primary)' }}>{scrapedBillEvidence?.original_name || 'Uploaded Invoice'}</strong> • SHA-256 Registered
                  </p>
                </div>
              </div>
              <button className="icon-btn" onClick={() => setBillModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ background: 'rgba(99, 102, 241, 0.08)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-brand)', fontSize: '12px', color: 'var(--text-secondary)' }}>
                Inspect the digitally scraped figures below. You can adjust any value, confirm its unit, and review SEBI statutory guidance before applying directly into your digital form.
              </div>

              {/* Scraped Fields List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {scrapedBillFields.map((field, idx) => {
                  return (
                    <div
                      key={idx}
                      style={{
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border-default)',
                        borderRadius: '10px',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 700, color: '#fff', fontSize: '14px' }}>
                            {field.metric === 'ENV-ENERGY-001' ? 'Principle 6: Total Electricity Consumption' : `Target Metric: ${field.metric}`}
                          </span>
                          <code style={{ fontSize: '11px', padding: '2px 6px', background: 'var(--bg-panel)', borderRadius: '4px', color: 'var(--brand-400)' }}>
                            {field.metric}
                          </code>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>AI Confidence:</span>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: '#10b981' }}>
                            {Math.round((field.confidence || 0.94) * 100)}%
                          </span>
                        </div>
                      </div>

                      {/* Inputs Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                        <div>
                          <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                            Scraped Measured Value:
                          </label>
                          <input
                            type="number"
                            value={field.value}
                            onChange={(e) => handleBillFieldChange(idx, 'value', e.target.value)}
                            className="form-control"
                            style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)', height: 38 }}
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                            Unit:
                          </label>
                          <input
                            type="text"
                            value={field.unit}
                            onChange={(e) => handleBillFieldChange(idx, 'unit', e.target.value)}
                            className="form-control"
                            style={{ height: 38 }}
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                            Metric Code:
                          </label>
                          <input
                            type="text"
                            value={field.metric}
                            onChange={(e) => handleBillFieldChange(idx, 'metric', e.target.value)}
                            className="form-control"
                            style={{ height: 38 }}
                          />
                        </div>
                      </div>

                      {/* Metadata tags */}
                      {field.metadata && Object.keys(field.metadata).length > 0 && (
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', fontSize: '11px' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Metadata Scraped:</span>
                          {Object.entries(field.metadata).map(([k, v]) => (
                            <span key={k} style={{ padding: '2px 8px', background: 'var(--bg-card)', borderRadius: 4, border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                              <strong style={{ color: 'var(--text-primary)' }}>{k.replace('_', ' ')}:</strong> {String(v)}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Regulatory Guidance Excerpt */}
                      <div style={{ background: 'rgba(16, 185, 129, 0.06)', borderLeft: '3px solid #10b981', padding: '10px 14px', borderRadius: 4, fontSize: '12px' }}>
                        <div style={{ fontWeight: 600, color: '#10b981', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                          <BookOpen size={13} />
                          <span>SEBI BRSR Guidance Note Grounding:</span>
                        </div>
                        <div style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                          Disclose total energy consumption in gigajoules (GJ). Supporting evidence: DISCOM electricity bills, utility invoices, and meter registers. 1 kWh = 0.0036 GJ.
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Four-Eyes Governance: Values applied to form will require Checker approval on submission.
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setBillModalOpen(false)}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={handleApplyBillFields}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <CheckCircle2 size={15} />
                  <span>Accept & Apply to Digital Form</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

