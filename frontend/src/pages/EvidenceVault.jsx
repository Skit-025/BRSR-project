import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { evidenceApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  Upload, Shield, Hash, CheckCircle, AlertTriangle,
  FileText, Image, File, CloudUpload, RefreshCw,
  CheckCircle2, Edit3, ArrowRight, X, AlertCircle, Save,
  Eye, Trash2, Lock, Download, Check, KeyRound,
  Zap, Fuel, Flame, Droplets, Trash, Layers, Copy, Cpu,
  ClipboardCheck, ChevronRight, Plus, Minus,
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Modal from '../components/Modal';

// ─── FUEL TYPES ──────────────────────────────────────────────────────────────
const FUEL_SUBTYPES = [
  {
    id: 'diesel',    label: 'Diesel (HSD)',
    factor: 2.6841,  unit: 'litres',  energy_factor: 35.8,  // MJ/litre
    ghg_scope: 'Scope 1', indicator: 'ENV-EMISSIONS-001',
  },
  {
    id: 'petrol',    label: 'Petrol (MS)',
    factor: 2.3153,  unit: 'litres',  energy_factor: 32.0,
    ghg_scope: 'Scope 1', indicator: 'ENV-EMISSIONS-001',
  },
  {
    id: 'coal',      label: 'Coal (thermal)',
    factor: 2.3,     unit: 'kg',      energy_factor: 26.4,  // MJ/kg
    ghg_scope: 'Scope 1', indicator: 'ENV-EMISSIONS-001',
  },
  {
    id: 'lpg',       label: 'LPG / PNG',
    factor: 2.9832,  unit: 'kg',      energy_factor: 46.1,
    ghg_scope: 'Scope 1', indicator: 'ENV-EMISSIONS-001',
  },
  {
    id: 'natural_gas', label: 'Natural Gas (CNG)',
    factor: 2.0,     unit: 'SCM',     energy_factor: 35.9,  // MJ/SCM
    ghg_scope: 'Scope 1', indicator: 'ENV-EMISSIONS-001',
  },
  {
    id: 'furnace_oil', label: 'Furnace Oil (FO)',
    factor: 3.1765,  unit: 'litres',  energy_factor: 40.2,
    ghg_scope: 'Scope 1', indicator: 'ENV-EMISSIONS-001',
  },
];

// ─── BILL TYPES ───────────────────────────────────────────────────────────────
const BILL_TYPES = [
  { id: 'electricity_bill', label: 'Electricity',  icon: Zap,      color: '#f59e0b', hasSub: false },
  { id: 'fuel_receipt',     label: 'Fuel',         icon: Fuel,     color: '#ef4444', hasSub: true  },
  { id: 'gas_bill',         label: 'Gas / PNG',    icon: Flame,    color: '#f97316', hasSub: false },
  { id: 'water_manifest',   label: 'Water',        icon: Droplets, color: '#3b82f6', hasSub: false },
  { id: 'waste_manifest',   label: 'Waste',        icon: Trash,    color: '#10b981', hasSub: false },
  { id: 'other_bill',       label: 'Other',        icon: Layers,   color: '#8b5cf6', hasSub: false },
];

// ─── GHG & ENERGY CALCULATION FROM EXTRACTED FIELDS ──────────────────────────
// factors: electricity (India grid) = 0.708 kgCO₂e/kWh, water = 0.344 kgCO₂e/m³
function calcEnergy(docType, fuelSubtype, quantity, unit) {
  if (!quantity || isNaN(Number(quantity))) return null;
  const q = Number(quantity);

  if (docType === 'electricity_bill') {
    // Electricity: 1 kWh = 3.6 MJ
    const kwh = unit?.toLowerCase() === 'mwh' ? q * 1000 : q;
    return { energy_gj: (kwh * 3.6 / 1000).toFixed(4), ghg_tco2e: (kwh * 0.000708).toFixed(6), unit: 'kWh', scope: 'Scope 2', factor: '0.708 kgCO₂e/kWh (India CEA 2023)' };
  }
  if (docType === 'fuel_receipt') {
    const ft = FUEL_SUBTYPES.find(f => f.id === fuelSubtype) || FUEL_SUBTYPES[0];
    const energy_mj = q * ft.energy_factor;
    const ghg = q * ft.factor / 1000;
    return { energy_gj: (energy_mj / 1000).toFixed(4), ghg_tco2e: ghg.toFixed(6), unit: ft.unit, scope: ft.ghg_scope, factor: `${ft.factor} kgCO₂e/${ft.unit} (GHG Protocol / IPCC)` };
  }
  if (docType === 'gas_bill') {
    // SCM of natural gas: ~35.9 MJ/SCM, 2.0 kgCO₂e/SCM
    const scm = unit?.toLowerCase() === 'scm' || unit?.toLowerCase() === 'm³' ? q : q;
    return { energy_gj: (scm * 35.9 / 1000).toFixed(4), ghg_tco2e: (scm * 2.0 / 1000).toFixed(6), unit: 'SCM', scope: 'Scope 1', factor: '2.0 kgCO₂e/SCM' };
  }
  if (docType === 'water_manifest') {
    return { energy_gj: null, ghg_tco2e: (q * 0.000344).toFixed(6), unit: 'm³', scope: 'Scope 3', factor: '0.344 kgCO₂e/m³ (water supply)' };
  }
  return null;
}

const mapExtractedFields = (fields = []) => fields.map((field) => ({
  ...field,
  name: field.metric,
  raw_value: String(field.value),
  raw_unit: field.unit,
  value: String(field.value),
}));

function FileTypeIcon({ mime }) {
  if (mime?.includes('pdf'))   return <FileText size={16} color="#f87171" />;
  if (mime?.includes('image')) return <Image    size={16} color="#38bdf8" />;
  return <File size={16} color="var(--text-muted)" />;
}

function fmtBytes(b) {
  if (!b) return '—';
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b/1024).toFixed(1)} KB`;
  return `${(b/1024/1024).toFixed(1)} MB`;
}

function ShortHash({ hash, onCopy }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = (e) => {
    e.stopPropagation();
    if (!hash) return;
    navigator.clipboard.writeText(hash).then(() => {
      setCopied(true);
      onCopy?.(hash);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  if (!hash) return <span style={{ color: 'var(--text-muted)' }}>—</span>;
  return (
    <button
      onClick={handleCopy}
      title={`Copy SHA-256: ${hash}`}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        fontFamily: 'ui-monospace, monospace', fontSize: 11,
        color: copied ? '#10b981' : '#38bdf8',
        background: copied ? 'rgba(16,185,129,0.1)' : 'rgba(56,189,248,0.1)',
        border: `1px solid ${copied ? 'rgba(16,185,129,0.3)' : 'rgba(56,189,248,0.3)'}`,
        borderRadius: 5, padding: '2px 7px', cursor: 'pointer',
        transition: 'all 0.2s',
      }}
    >
      {copied ? <Check size={10} /> : <Copy size={10} />}
      {copied ? 'Copied!' : `${hash.slice(0,8)}…${hash.slice(-6)}`}
    </button>
  );
}

const VERIFY_STATUS = {
  clean:      { label: 'Scan Clean',   color: '#10b981', Icon: CheckCircle },
  pending:    { label: 'Scan Pending', color: '#f59e0b', Icon: Shield },
  suspicious: { label: 'Suspicious',  color: '#ef4444', Icon: AlertTriangle },
};

// ─── MANUAL ENTRY MODAL ────────────────────────────────────────────────────────
function ManualEntryModal({ isOpen, onClose, evidence, fuelSubtype, onSave }) {
  const docType = evidence?.doc_type || 'electricity_bill';
  const [qty, setQty] = useState('');
  const [unit, setUnit] = useState(
    docType === 'electricity_bill' ? 'kWh' :
    docType === 'fuel_receipt' ? (FUEL_SUBTYPES.find(f => f.id === fuelSubtype)?.unit || 'litres') :
    docType === 'gas_bill' ? 'SCM' :
    docType === 'water_manifest' ? 'm³' : 'units'
  );
  const [metric, setMetric] = useState(
    docType === 'electricity_bill' ? 'Total Units Consumed' :
    docType === 'fuel_receipt' ? 'Total Quantity' :
    docType === 'gas_bill' ? 'Gas Consumed' :
    docType === 'water_manifest' ? 'Water Consumed' : 'Value'
  );
  const [period, setPeriod] = useState('');

  const calc = calcEnergy(docType, fuelSubtype, qty, unit);

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="560px">
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>
              Manual Data Entry
            </h3>
            <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>
              OCR was skipped. Enter the key metric from the bill manually.
            </p>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={16} /></button>
        </div>

        <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
          <div style={{ color: 'var(--text-secondary)' }}>Document:</div>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{evidence?.original_name || evidence?.filename || 'Uploaded document'}</div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 5 }}>
            Metric / Field Name
          </label>
          <input
            value={metric} onChange={e => setMetric(e.target.value)}
            style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', border: '1px solid var(--border-default)', borderRadius: 7, fontSize: 13, color: 'var(--text-primary)', background: 'var(--bg-card)' }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 5 }}>Value</label>
            <input
              type="number" value={qty} onChange={e => setQty(e.target.value)}
              placeholder="e.g. 2850"
              style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', border: '1px solid var(--border-default)', borderRadius: 7, fontSize: 13, color: 'var(--text-primary)', background: 'var(--bg-card)' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 5 }}>Unit</label>
            <input
              value={unit} onChange={e => setUnit(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', border: '1px solid var(--border-default)', borderRadius: 7, fontSize: 13, color: 'var(--text-primary)', background: 'var(--bg-card)' }}
            />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 5 }}>Bill Period (optional)</label>
          <input
            value={period} onChange={e => setPeriod(e.target.value)}
            placeholder="e.g. March 2025, FY 2025-26"
            style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', border: '1px solid var(--border-default)', borderRadius: 7, fontSize: 13, color: 'var(--text-primary)', background: 'var(--bg-card)' }}
          />
        </div>

        {calc && qty && (
          <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 8, padding: '12px 16px', fontSize: 12 }}>
            <div style={{ fontWeight: 700, color: '#10b981', marginBottom: 6, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Calculated GHG &amp; Energy
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {calc.energy_gj && (
                <div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: 11 }}>Energy Consumption</div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{calc.energy_gj} GJ</div>
                </div>
              )}
              <div>
                <div style={{ color: 'var(--text-secondary)', fontSize: 11 }}>GHG Emissions ({calc.scope})</div>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{calc.ghg_tco2e} tCO₂e</div>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: 11 }}>Emission Factor</div>
                <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-primary)' }}>{calc.factor}</div>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 7, border: '1px solid var(--border-default)', background: 'none', fontSize: 13, cursor: 'pointer' }}>
            Skip for Now
          </button>
          <button
            onClick={() => onSave({ metric, value: qty, unit, period, calc })}
            disabled={!qty || !metric}
            style={{ padding: '8px 18px', borderRadius: 7, border: 'none', background: qty && metric ? '#2563eb' : '#cbd5e1', color: '#fff', fontWeight: 700, fontSize: 13, cursor: qty && metric ? 'pointer' : 'not-allowed' }}
          >
            Save to Evidence Record
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function EvidenceVault() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const userRole = user?.role || '';
  const canDelete = ['system_admin', 'group_admin'].includes(userRole);

  const { data: evidenceList = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['evidence-list'],
    queryFn: () => evidenceApi.list().then((response) => response.data),
  });

  const [billType, setBillType] = useState('electricity_bill');
  const [fuelSubtype, setFuelSubtype] = useState('diesel');
  const [uploadQueue, setUploadQueue] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [otherBillTypeMap, setOtherBillTypeMap] = useState({}); // qId -> custom label
  const [notice, setNotice] = useState(null);
  const [selected, setSelected] = useState(null);
  const [extractedData, setExtractedData] = useState([]);
  const [loadingExtraction, setLoadingExtraction] = useState(false);
  const [extractionError, setExtractionError] = useState('');
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [manualEntryOpen, setManualEntryOpen] = useState(false);
  const [manualEntryEvidence, setManualEntryEvidence] = useState(null);
  const [manualData, setManualData] = useState({}); // keyed by evidence id
  const fileRef = useRef();

  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewingDoc, setViewingDoc] = useState(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState(null);
  const [adminPassword, setAdminPassword] = useState('');
  const [deleteError, setDeleteError] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [copyNotice, setCopyNotice] = useState('');

  const handleHashCopy = (hash) => {
    setCopyNotice(`SHA copied — paste into Ask AAROHAN AI → E1 to load this document directly.`);
    setTimeout(() => setCopyNotice(''), 4000);
  };

  const handleViewDoc = (ev) => {
    const queueItem = uploadQueue.find(q => q.evidence?.id === ev.id || q.id === ev._queueId);
    const docWithLocal = queueItem ? { ...ev, _localObjectUrl: queueItem.objectUrl } : ev;
    setViewingDoc(docWithLocal);
    setViewModalOpen(true);
  };

  const handleDeleteClick = (ev) => {
    if (!canDelete) {
      setNotice({ type: 'error', text: 'Access Denied: Only System Admin or Group Admin can delete evidence files.' });
      return;
    }
    setFileToDelete(ev);
    setAdminPassword('');
    setDeleteError(null);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async (e) => {
    e.preventDefault();
    if (!adminPassword.trim()) { setDeleteError('Please enter your admin password to authorize deletion.'); return; }
    if (!fileToDelete) return;
    setDeleting(true); setDeleteError(null);
    try {
      await evidenceApi.delete(fileToDelete.id, adminPassword.trim());
      setNotice({ type: 'success', text: `🗑️ Evidence document "${fileToDelete.original_name || fileToDelete.filename}" permanently deleted.` });
      setDeleteModalOpen(false); setFileToDelete(null); setAdminPassword(''); setDeleting(false);
      refetch();
    } catch (err) {
      setDeleteError(err.response?.data?.detail || err.message || 'Failed to delete evidence.');
      setDeleting(false);
    }
  };

  // Inspect Details — open review modal, optionally trigger OCR
  const handleSelectFile = async (ev) => {
    setSelected(ev); setReviewModalOpen(true); setExtractionError('');
    if (Array.isArray(ev.extracted_fields) && ev.extracted_fields.length > 0) {
      setExtractedData(mapExtractedFields(ev.extracted_fields)); return;
    }
    if (!ev.id) { setExtractedData([]); return; }
    setLoadingExtraction(true); setExtractedData([]);
    try {
      const response = await evidenceApi.extract(ev.id, ev.doc_type);
      const fields = mapExtractedFields(Array.isArray(response.data) ? response.data : []);
      setExtractedData(fields);
      setSelected(curr => curr?.id === ev.id ? { ...curr, extracted_fields: fields } : curr);
    } catch (err) {
      setExtractionError(err.response?.data?.detail || 'OCR extraction could not be completed.');
    } finally {
      setLoadingExtraction(false);
    }
  };

  // Stage files
  const handleFiles = useCallback((files) => {
    if (!files?.length) return;
    const newItems = Array.from(files).map((file) => ({
      id: `q-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      file, objectUrl: URL.createObjectURL(file),
      name: file.name, size: file.size, mime: file.type,
      status: 'staged', // staged | uploading | vault_only | ocr_done | error
      evidence: null, extractedFields: [], errorMsg: null,
      billTypeSnapshot: billType, fuelSubtypeSnapshot: fuelSubtype,
    }));
    setUploadQueue(prev => [...prev, ...newItems]);
    setNotice(null);
  }, [billType, fuelSubtype]);

  // Path A: Upload to vault only (no OCR)
  const uploadVaultOnly = useCallback(async (qId) => {
    setUploadQueue(prev => prev.map(q => q.id === qId ? { ...q, status: 'uploading' } : q));
    const item = uploadQueue.find(q => q.id === qId);
    if (!item) return;
    const otherLabel = otherBillTypeMap[qId] || '';
    try {
      const fd = new FormData();
      fd.append('file', item.file);
      fd.append('run_ocr', 'false');
      const hint = item.billTypeSnapshot === 'other_bill'
        ? (otherLabel.trim() || 'other_bill')
        : (item.billTypeSnapshot === 'fuel_receipt' ? item.fuelSubtypeSnapshot : item.billTypeSnapshot);
      fd.append('doc_type_hint', hint);
      const res = await evidenceApi.upload(fd);
      const evidence = { ...res.data.evidence, _localObjectUrl: item.objectUrl };
      setUploadQueue(prev => prev.map(q => q.id === qId ? { ...q, status: 'vault_only', evidence } : q));
      qc.invalidateQueries({ queryKey: ['evidence-list'] });
      setNotice({ type: 'success', text: `✅ "${item.name}" saved to vault. You can run OCR later, or enter data manually.` });
    } catch (err) {
      setUploadQueue(prev => prev.map(q => q.id === qId ? { ...q, status: 'error', errorMsg: err.response?.data?.detail || 'Upload failed' } : q));
    }
  }, [uploadQueue, otherBillTypeMap, qc]);

  // Path B: Upload + OCR together
  const uploadWithOcr = useCallback(async (qId) => {
    setUploadQueue(prev => prev.map(q => q.id === qId ? { ...q, status: 'uploading' } : q));
    const item = uploadQueue.find(q => q.id === qId);
    if (!item) return;
    const otherLabel = otherBillTypeMap[qId] || '';
    try {
      const fd = new FormData();
      fd.append('file', item.file);
      fd.append('run_ocr', 'true');
      const hint = item.billTypeSnapshot === 'other_bill'
        ? (otherLabel.trim() || 'other_bill')
        : (item.billTypeSnapshot === 'fuel_receipt' ? item.fuelSubtypeSnapshot : item.billTypeSnapshot);
      fd.append('doc_type_hint', hint);
      const res = await evidenceApi.upload(fd);
      const fields = mapExtractedFields(res.data.extracted_fields || []);
      const evidence = { ...res.data.evidence, extracted_fields: fields, is_relevant: res.data.is_relevant, rejection_reason: res.data.rejection_reason, _localObjectUrl: item.objectUrl };
      setUploadQueue(prev => prev.map(q => q.id === qId ? { ...q, status: 'ocr_done', evidence, extractedFields: fields } : q));
      if (!res.data.is_relevant) {
        setNotice({ type: 'error', text: res.data.rejection_reason || 'AI engine did not recognise this as a relevant ESG document.' });
      } else {
        setNotice({ type: 'success', text: `🔍 OCR complete — ${fields.length} field(s) extracted from "${item.name}".` });
      }
      qc.invalidateQueries({ queryKey: ['evidence-list'] });
    } catch (err) {
      setUploadQueue(prev => prev.map(q => q.id === qId ? { ...q, status: 'error', errorMsg: err.response?.data?.detail || 'Upload & OCR failed' } : q));
    }
  }, [uploadQueue, otherBillTypeMap, qc]);

  // Run OCR on already-vaulted document
  const runOcrOnVaulted = useCallback(async (qId) => {
    const item = uploadQueue.find(q => q.id === qId);
    if (!item?.evidence?.id) return;
    const otherLabel = otherBillTypeMap[qId] || '';
    setUploadQueue(prev => prev.map(q => q.id === qId ? { ...q, status: 'uploading' } : q));
    try {
      const hint = item.billTypeSnapshot === 'other_bill'
        ? (otherLabel.trim() || 'other_bill')
        : (item.billTypeSnapshot === 'fuel_receipt' ? item.fuelSubtypeSnapshot : item.billTypeSnapshot);
      const response = await evidenceApi.extract(item.evidence.id, hint);
      const fields = mapExtractedFields(Array.isArray(response.data) ? response.data : []);
      const evidence = { ...item.evidence, extracted_fields: fields };
      setUploadQueue(prev => prev.map(q => q.id === qId ? { ...q, status: 'ocr_done', evidence, extractedFields: fields } : q));
      qc.invalidateQueries({ queryKey: ['evidence-list'] });
    } catch (err) {
      setUploadQueue(prev => prev.map(q => q.id === qId ? { ...q, status: 'error', errorMsg: err.response?.data?.detail || 'OCR failed' } : q));
    }
  }, [uploadQueue, otherBillTypeMap, qc]);

  const removeFromQueue = useCallback((qId) => {
    setUploadQueue(prev => {
      const item = prev.find(q => q.id === qId);
      if (item?.objectUrl) URL.revokeObjectURL(item.objectUrl);
      return prev.filter(q => q.id !== qId);
    });
  }, []);

  const onDrop = (e) => { e.preventDefault(); setDragging(false); handleFiles([...e.dataTransfer.files]); };
  const onFileInput = (e) => handleFiles([...e.target.files]);

  const handleFieldChange = (index, key, val) => {
    setExtractedData(prev => { const copy = [...prev]; copy[index] = { ...copy[index], [key]: val }; return copy; });
  };

  const handleSendToDataEntry = (field) => {
    navigate('/data-entry', { state: { prefillMetric: field.metric, prefillValue: field.value, prefillUnit: field.unit, filename: selected?.original_name || selected?.filename || 'Bill Document' } });
  };

  const displayEvidenceList = [
    ...uploadQueue.filter(q => q.evidence).map(q => ({ ...q.evidence, _queueId: q.id })),
    ...(evidenceList || []).filter(ev => !uploadQueue.some(q => q.evidence?.id === ev.id)),
  ];

  const activeBillSpec = BILL_TYPES.find(b => b.id === billType) || BILL_TYPES[0];

  return (
    <div className="page-content anim-fade-up" style={{ background: '#f8fafc' }}>
      {/* ── Status Ticker ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8, fontSize: 11, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748b' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#15803d' }}>
          <span className="status-beacon-live" style={{ marginRight: 2 }} />
          EVIDENCE VAULT &amp; VERIFICATION
        </span>
        <span style={{ color: '#cbd5e1' }}>/</span>
        <span>SHA-256 CRYPTOGRAPHIC AUDIT CHAIN</span>
      </div>

      {/* Copy notice */}
      {copyNotice && (
        <div style={{ padding: '9px 14px', borderRadius: 7, marginBottom: 10, fontSize: 12, fontWeight: 600, background: 'rgba(56,189,248,0.12)', color: '#0891b2', border: '1px solid rgba(56,189,248,0.3)', display: 'flex', alignItems: 'center', gap: 7 }}>
          <ClipboardCheck size={13} /> {copyNotice}
        </div>
      )}

      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#09090b', margin: 0, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Shield size={24} color="#09090b" /> Evidence Vault &amp; Bill Verification
          </h1>
          <p style={{ color: '#64748b', fontSize: 13, margin: '4px 0 0 0' }}>
            Immutable SHA-256 evidence repository. Upload a bill → save to vault → optionally run E1 OCR for instant BRSR field extraction.
          </p>
        </div>
        <button onClick={() => refetch()} disabled={isRefetching} className="btn btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 6, fontSize: 13, border: '1px solid #e2e8f0', background: '#fff', color: '#09090b', fontWeight: 600 }}>
          <RefreshCw size={13} className={isRefetching ? 'spin' : ''} /> Refresh Vault
        </button>
      </div>

      {/* ── UPLOAD PANEL ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, border: '1px solid #e2e8f0', borderRadius: 10, padding: '20px 24px', background: '#ffffff', marginBottom: 24, boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>

        {/* Step 1: Bill Type */}
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
            Step 1 — Select Bill / Document Type
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {BILL_TYPES.map(({ id, label, icon: TypeIcon, color }) => {
              const isActive = billType === id;
              return (
                <button key={id} type="button" onClick={() => setBillType(id)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: `1.5px solid ${isActive ? color : 'var(--border-default)'}`, background: isActive ? `${color}20` : 'var(--bg-elevated)', color: isActive ? color : 'var(--text-secondary)', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s ease' }}>
                  {React.createElement(TypeIcon, { size: 14, color: isActive ? color : 'var(--text-muted)' })}
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 1b: Fuel Sub-type (only for fuel_receipt) */}
        {billType === 'fuel_receipt' && (
          <div style={{ paddingLeft: 0 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
              Step 1b — Select Fuel Type
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {FUEL_SUBTYPES.map(ft => {
                const isActive = fuelSubtype === ft.id;
                return (
                  <button key={ft.id} type="button" onClick={() => setFuelSubtype(ft.id)}
                    style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', padding: '8px 14px', borderRadius: 8, border: `1.5px solid ${isActive ? '#ef4444' : 'var(--border-default)'}`, background: isActive ? 'rgba(239,68,68,0.1)' : 'var(--bg-elevated)', cursor: 'pointer', transition: 'all 0.15s' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: isActive ? '#ef4444' : 'var(--text-primary)' }}>{ft.label}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{ft.factor} kgCO₂e/{ft.unit}</span>
                  </button>
                );
              })}
            </div>
            <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-secondary)', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, padding: '7px 12px' }}>
              🔬 GHG Protocol emission factor will be applied automatically based on selected fuel type during calculation.
            </div>
          </div>
        )}

        {/* Step 2: Drop Zone */}
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
            Step 2 — Upload Document
          </label>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            style={{ border: `2px dashed ${dragging ? 'var(--brand-400)' : 'var(--border-default)'}`, borderRadius: 10, padding: '28px 20px', textAlign: 'center', cursor: 'pointer', background: dragging ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.02)', transition: 'all 0.2s ease' }}
          >
            <input ref={fileRef} type="file" multiple accept="image/jpeg,image/png,image/webp,image/jpg,application/pdf" onChange={onFileInput} style={{ display: 'none' }} />
            <CloudUpload size={36} color={dragging ? 'var(--brand-400)' : 'var(--brand-500)'} style={{ margin: '0 auto 8px' }} />
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', marginBottom: 4 }}>
              Drop <span style={{ color: activeBillSpec.color }}>
                {billType === 'fuel_receipt' ? `${FUEL_SUBTYPES.find(f => f.id === fuelSubtype)?.label || 'Fuel'} Receipt` : `${activeBillSpec.label} Bill`}
              </span> here, or click to browse
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              Accepted: <strong>JPG, PNG, WEBP, PDF</strong> — files are staged below before upload
            </div>
          </div>
        </div>

        {/* Step 3: Staged queue with 2-path action buttons */}
        {uploadQueue.length > 0 && (
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>
              Step 3 — Choose Upload Action
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {uploadQueue.map((q) => {
                const isStaged   = q.status === 'staged';
                const isUploading = q.status === 'uploading';
                const isVaultOnly = q.status === 'vault_only';
                const isOcrDone  = q.status === 'ocr_done';
                const isError    = q.status === 'error';
                const hasOcr     = isOcrDone && q.extractedFields?.length > 0;
                const ft = FUEL_SUBTYPES.find(f => f.id === q.fuelSubtypeSnapshot);
                const isOtherBill = q.billTypeSnapshot === 'other_bill';
                const otherLabel = otherBillTypeMap[q.id] || '';
                const needsOtherLabel = isOtherBill && isStaged && !otherLabel.trim();

                return (
                  <div key={q.id} style={{
                    display: 'flex', flexDirection: 'column', gap: 10,
                    padding: '12px 16px', borderRadius: 10,
                    border: `1px solid ${isError ? 'rgba(239,68,68,0.35)' : isOcrDone ? 'rgba(16,185,129,0.35)' : isVaultOnly ? 'rgba(99,102,241,0.3)' : isUploading ? 'rgba(99,102,241,0.35)' : 'var(--border-default)'}`,
                    background: isError ? 'rgba(239,68,68,0.04)' : isOcrDone ? 'rgba(16,185,129,0.04)' : 'var(--bg-elevated)',
                  }}>
                    {/* File info row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {q.mime?.startsWith('image/') ? (
                        <img src={q.objectUrl} alt={q.name} style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 5, border: '1px solid var(--border-default)', flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: 40, height: 40, borderRadius: 5, background: 'rgba(248,113,113,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <FileText size={20} color="#f87171" />
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 12.5, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{q.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                          {fmtBytes(q.size)} • {q.billTypeSnapshot === 'fuel_receipt' ? ft?.label || 'Fuel' : q.billTypeSnapshot === 'other_bill' ? (otherLabel || 'Other Bill') : (BILL_TYPES.find(b => b.id === q.billTypeSnapshot) || BILL_TYPES[0]).label}
                          {q.evidence?.sha256 && (
                            <span style={{ marginLeft: 8 }}>
                              SHA: <ShortHash hash={q.evidence.sha256} onCopy={handleHashCopy} />
                            </span>
                          )}
                        </div>
                      </div>
                      {!isUploading && (
                        <button type="button" onClick={() => removeFromQueue(q.id)}
                          style={{ padding: '4px 6px', borderRadius: 5, border: '1px solid var(--border-default)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>
                          <X size={11} />
                        </button>
                      )}
                    </div>

                    {/* Other bill type input (only for staged other_bill) */}
                    {isOtherBill && isStaged && (
                      <div style={{ paddingTop: 2 }}>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 5 }}>
                          ✏️ What type of bill/document is this? <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input
                          value={otherLabel}
                          onChange={e => setOtherBillTypeMap(prev => ({ ...prev, [q.id]: e.target.value }))}
                          placeholder="e.g. Boiler fuel log, airline ticket, generator diesel bill…"
                          style={{
                            width: '100%', boxSizing: 'border-box', padding: '7px 11px',
                            border: `1px solid ${otherLabel.trim() ? 'rgba(16,185,129,0.5)' : 'var(--border-default)'}`,
                            borderRadius: 7, fontSize: 12.5, color: 'var(--text-primary)',
                            background: 'var(--bg-card)', outline: 'none',
                          }}
                        />
                        {!otherLabel.trim() && (
                          <div style={{ fontSize: 10.5, color: '#d97706', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <AlertCircle size={10} /> Enter the bill type before uploading so the E1 engine can calibrate correctly.
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action row */}
                    {isStaged && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingTop: 4, borderTop: '1px solid var(--border-default)' }}>
                        <button type="button" onClick={() => uploadVaultOnly(q.id)}
                          disabled={needsOtherLabel}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 13px', borderRadius: 7, border: '1px solid #2563eb', background: needsOtherLabel ? '#f1f5f9' : 'rgba(37,99,235,0.07)', color: needsOtherLabel ? 'var(--text-muted)' : '#2563eb', fontSize: 11, fontWeight: 700, cursor: needsOtherLabel ? 'not-allowed' : 'pointer', opacity: needsOtherLabel ? 0.6 : 1 }}>
                          <Lock size={11} /> Save to Vault Only
                        </button>
                        <button type="button" onClick={() => uploadWithOcr(q.id)}
                          disabled={needsOtherLabel}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 13px', borderRadius: 7, border: 'none', background: needsOtherLabel ? '#94a3b8' : '#2563eb', color: '#fff', fontSize: 11, fontWeight: 700, cursor: needsOtherLabel ? 'not-allowed' : 'pointer', opacity: needsOtherLabel ? 0.6 : 1 }}>
                          <Cpu size={11} /> Save + Run OCR (E1 Engine)
                        </button>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)', alignSelf: 'center', marginLeft: 4 }}>
                          OCR is optional — you can run it anytime, or enter data manually
                        </span>
                      </div>
                    )}

                    {isUploading && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--brand-400)' }}>
                        <div className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} /> Processing…
                      </div>
                    )}

                    {isVaultOnly && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingTop: 4, borderTop: '1px solid var(--border-default)', alignItems: 'center' }}>
                        <span style={{ fontSize: 11, color: '#2563eb', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Lock size={11} /> Saved to vault
                        </span>
                        <button type="button" onClick={() => runOcrOnVaulted(q.id)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 6, border: 'none', background: '#2563eb', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                          <Cpu size={11} /> Run OCR Now
                        </button>
                        <button type="button" onClick={() => { setManualEntryEvidence(q.evidence); setManualEntryOpen(true); }}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 6, border: '1px solid var(--border-default)', background: 'none', color: 'var(--text-secondary)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                          <Edit3 size={11} /> Enter Manually
                        </button>
                      </div>
                    )}

                    {isOcrDone && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingTop: 4, borderTop: '1px solid var(--border-default)', alignItems: 'center' }}>
                        <span style={{ fontSize: 11, color: '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <CheckCircle2 size={11} /> {hasOcr ? `${q.extractedFields.length} fields extracted` : 'No fields — try manual entry'}
                        </span>
                        {hasOcr && (
                          <button type="button" onClick={() => { setSelected(q.evidence); setExtractedData(q.extractedFields); setReviewModalOpen(true); }}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 6, border: '1px solid var(--border-default)', background: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                            <Eye size={11} /> View Extracted Data
                          </button>
                        )}
                        {!hasOcr && (
                          <button type="button" onClick={() => { setManualEntryEvidence(q.evidence); setManualEntryOpen(true); }}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 6, border: '1px solid var(--border-default)', background: 'none', color: 'var(--text-secondary)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                            <Edit3 size={11} /> Enter Manually
                          </button>
                        )}
                      </div>
                    )}

                    {isError && (
                      <div style={{ fontSize: 11, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <AlertCircle size={11} /> {q.errorMsg || 'Error'}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Notice */}
      {notice && (
        <div style={{ padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13, fontWeight: 600, background: notice.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: notice.type === 'success' ? '#10b981' : '#ef4444', border: `1px solid ${notice.type === 'success' ? '#10b981' : '#ef4444'}` }}>
          {notice.text}
        </div>
      )}

      {/* Evidence Table */}
      <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-default)', overflowX: 'auto', marginBottom: 20 }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-default)', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'flex', gap: 12, alignItems: 'center' }}>
          <Hash size={12} /> Vault Documents
          <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
            Click SHA-256 hash to copy → paste into Ask AAROHAN AI → E1 to load &amp; analyse
          </span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-default)', background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11 }}>Document</th>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11 }}>Type</th>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11 }}>Extraction Summary</th>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11 }}>SHA-256 (click to copy)</th>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11 }}>Size</th>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11 }}>Uploaded</th>
              <th style={{ padding: '10px 16px', textAlign: 'center', fontSize: 11 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>Loading vault documents…</td></tr>
            ) : displayEvidenceList.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>No documents uploaded yet. Select a bill type above to begin.</td></tr>
            ) : (
              displayEvidenceList.map((ev) => {
                const isSelected = selected?.id === ev.id;
                const billSpec = BILL_TYPES.find(b => b.id === ev.doc_type) || BILL_TYPES[BILL_TYPES.length - 1];
                const evFields = ev.extracted_fields || [];
                const extractedSummary = evFields.length > 0
                  ? evFields.slice(0, 3).map(f => `${f.metric || f.name}: ${f.value} ${f.unit || ''}`).join(' · ')
                  : (manualData[ev.id] ? `${manualData[ev.id].metric}: ${manualData[ev.id].value} ${manualData[ev.id].unit}` : null);

                return (
                  <tr key={ev.id}
                    onClick={() => handleSelectFile(ev)}
                    style={{ borderBottom: '1px solid var(--border-default)', cursor: 'pointer', background: isSelected ? 'rgba(99,102,241,0.06)' : 'transparent', transition: 'background 0.12s' }}
                  >
                    <td style={{ padding: '10px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <FileTypeIcon mime={ev.mime_type} />
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.original_name || ev.filename}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{ev.mime_type}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, color: billSpec.color, background: `${billSpec.color}15`, border: `1px solid ${billSpec.color}30` }}>
                        {billSpec.label}
                      </span>
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      {extractedSummary ? (
                        <span style={{ fontSize: 11.5, color: 'var(--text-primary)' }}>{extractedSummary}</span>
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>No extraction — click Inspect Details</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 16px' }} onClick={e => e.stopPropagation()}>
                      <ShortHash hash={ev.sha256} onCopy={handleHashCopy} />
                    </td>
                    <td style={{ padding: '10px 16px', color: 'var(--text-secondary)', fontSize: 12 }}>{fmtBytes(ev.size_bytes || ev.file_size)}</td>
                    <td style={{ padding: '10px 16px', fontSize: 11, color: 'var(--text-secondary)' }}>
                      {ev.uploaded_at ? new Date(ev.uploaded_at).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td style={{ padding: '10px 16px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        <button onClick={() => handleViewDoc(ev)} className="btn btn-secondary btn-sm"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '4px 8px', color: 'var(--brand-400, #38bdf8)' }}
                          title="View original bill">
                          <Eye size={11} /> View Bill
                        </button>
                        <button onClick={() => handleSelectFile(ev)} className="btn btn-secondary btn-sm"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '4px 8px' }}
                          title="Inspect extracted data &amp; GHG calculations">
                          <Edit3 size={11} /> Inspect Details
                        </button>
                        {canDelete && (
                          <button onClick={() => handleDeleteClick(ev)} className="btn btn-sm"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '4px 8px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', cursor: 'pointer' }}>
                            <Trash2 size={11} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Inspect Details Modal ── */}
      {reviewModalOpen && selected && (
        <Modal isOpen={Boolean(reviewModalOpen && selected)} onClose={() => setReviewModalOpen(false)} maxWidth="900px">
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', maxHeight: '88vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-default)', paddingBottom: 16, marginBottom: 18 }}>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileText size={18} color="var(--brand-400)" /> E1 Extraction — Scraped Fields &amp; GHG Calculations
                </h3>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                  Document: <strong>{selected?.original_name || selected?.filename}</strong>
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => handleViewDoc(selected)} className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                  <Eye size={13} /> View Bill
                </button>
                <button onClick={() => setReviewModalOpen(false)} className="btn btn-secondary btn-sm" style={{ padding: 6 }}><X size={16} /></button>
              </div>
            </div>

            {/* Metadata grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, background: 'var(--bg-elevated)', padding: '12px 16px', borderRadius: 8, border: '1px solid var(--border-default)', marginBottom: 20, fontSize: 12 }}>
              <div>
                <div style={{ color: 'var(--text-secondary)', fontSize: 11 }}>Document Type</div>
                <div style={{ fontWeight: 600 }}>{(selected?.doc_type || 'Unknown').replace(/_/g, ' ').toUpperCase()}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-secondary)', fontSize: 11 }}>SHA-256 Hash</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ShortHash hash={selected?.sha256} onCopy={handleHashCopy} />
                </div>
              </div>
              <div>
                <div style={{ color: 'var(--text-secondary)', fontSize: 11 }}>Uploaded</div>
                <div style={{ fontWeight: 600 }}>{selected?.uploaded_at ? new Date(selected.uploaded_at).toLocaleDateString('en-IN') : '—'}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-secondary)', fontSize: 11 }}>Size</div>
                <div style={{ fontWeight: 600 }}>{fmtBytes(selected?.size_bytes || selected?.file_size)}</div>
              </div>
            </div>

            {/* Extracted fields table */}
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ fontSize: 12, fontWeight: 700, color: 'var(--brand-400)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px 0' }}>
                E1 Extracted Values
              </h4>
              {loadingExtraction ? (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
                  <div className="spinner" style={{ margin: '0 auto 8px' }} /> Running E1 OCR on stored document…
                </div>
              ) : extractionError ? (
                <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, fontSize: 13, color: '#ef4444', marginBottom: 12 }}>
                  <AlertCircle size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                  {extractionError}
                  <button onClick={() => { setManualEntryEvidence(selected); setManualEntryOpen(true); setReviewModalOpen(false); }}
                    style={{ marginLeft: 12, padding: '3px 10px', borderRadius: 5, border: '1px solid rgba(239,68,68,0.4)', background: 'transparent', color: '#ef4444', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
                    Enter Manually
                  </button>
                </div>
              ) : extractedData.length === 0 ? (
                <div style={{ padding: '14px 16px', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 13, color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>No fields extracted — OCR may not have been run, or document text was unreadable.</span>
                  <button onClick={() => { setManualEntryEvidence(selected); setManualEntryOpen(true); setReviewModalOpen(false); }}
                    style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid var(--border-default)', background: '#2563eb', color: '#fff', fontSize: 12, cursor: 'pointer', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <Edit3 size={11} /> Enter Manually
                  </button>
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-default)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                      <th style={{ padding: '8px 12px' }}>Parameter / Indicator</th>
                      <th style={{ padding: '8px 12px' }}>Extracted Value</th>
                      <th style={{ padding: '8px 12px' }}>Provenance</th>
                      <th style={{ padding: '8px 12px' }}>Review Value</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {extractedData.map((f, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border-default)' }}>
                        <td style={{ padding: '9px 12px' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{f.name}</div>
                          <code style={{ fontSize: 10, color: 'var(--text-muted)' }}>{f.metric}</code>
                        </td>
                        <td style={{ padding: '9px 12px', color: 'var(--text-primary)' }}>
                          {f.raw_value ? `${f.raw_value} ${f.raw_unit || ''}` : '—'}
                        </td>
                        <td style={{ padding: '9px 12px', fontFamily: 'monospace', fontSize: 11, color: 'var(--text-secondary)' }}>
                          {[f.page != null ? `Page ${f.page}` : null, f.confidence != null ? `${Math.round(f.confidence * 100)}% conf.` : null].filter(Boolean).join(' · ') || '—'}
                        </td>
                        <td style={{ padding: '9px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <input type="number" value={f.value} onChange={(e) => handleFieldChange(i, 'value', e.target.value)}
                              className="form-control" style={{ width: 100, height: 30, fontSize: 12.5, fontWeight: 700 }} />
                            <span style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: 11 }}>{f.unit}</span>
                          </div>
                        </td>
                        <td style={{ padding: '9px 12px', textAlign: 'right' }}>
                          <button onClick={() => handleSendToDataEntry(f)} className="btn btn-primary btn-sm"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '4px 9px' }}>
                            Send to Data Entry <ArrowRight size={11} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* GHG Calculation Panel */}
            {extractedData.length > 0 && (() => {
              const qtyField = extractedData.find(f => f.value && !isNaN(Number(f.value)));
              const docType = selected?.doc_type || 'electricity_bill';
              const ft = FUEL_SUBTYPES.find(f => f.id === selected?.fuel_subtype) || FUEL_SUBTYPES[0];
              const calc = qtyField ? calcEnergy(docType, ft?.id, qtyField.value, qtyField.raw_unit || qtyField.unit) : null;
              if (!calc) return null;
              return (
                <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10, padding: '16px 20px', marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                    🧮 Statutory GHG &amp; Energy Calculations
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
                    {calc.energy_gj && (
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Energy Consumption</div>
                        <div style={{ fontWeight: 800, fontSize: 20, color: '#0891b2', fontFamily: 'ui-monospace, monospace' }}>{calc.energy_gj} <span style={{ fontSize: 12, fontWeight: 600 }}>GJ</span></div>
                      </div>
                    )}
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>GHG Emissions ({calc.scope})</div>
                      <div style={{ fontWeight: 800, fontSize: 20, color: '#10b981', fontFamily: 'ui-monospace, monospace' }}>{calc.ghg_tco2e} <span style={{ fontSize: 12, fontWeight: 600 }}>tCO₂e</span></div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Emission Factor</div>
                      <div style={{ fontFamily: 'monospace', fontSize: 11.5, color: 'var(--text-primary)', fontWeight: 600, marginTop: 2 }}>{calc.factor}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Scope Classification</div>
                      <span style={{ display: 'inline-block', marginTop: 4, padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, color: '#10b981', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)' }}>
                        {calc.scope}
                      </span>
                    </div>
                  </div>
                  <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-muted)' }}>
                    Calculated using GHG Protocol / IPCC / India CEA emission factors. All figures are suggestions — verify against the source bill before submitting.
                  </div>
                </div>
              );
            })()}

            {/* Modal footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-default)', paddingTop: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-secondary)' }}>
                <CheckCircle2 size={14} color="#10b981" />
                AI-extracted values are suggestions. Verify against source document before submitting.
              </div>
              <button onClick={() => setReviewModalOpen(false)} className="btn btn-secondary" style={{ fontSize: 13 }}>Close</button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Document Viewer Modal ── */}
      {viewModalOpen && viewingDoc && (
        <Modal isOpen={Boolean(viewModalOpen && viewingDoc)} onClose={() => { setViewModalOpen(false); setViewingDoc(null); }} maxWidth="900px">
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-default)', paddingBottom: 14, marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 38, height: 38, borderRadius: 8, background: 'rgba(56,189,248,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Eye size={20} color="var(--brand-400, #38bdf8)" />
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Original Document Preview</h3>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                    <span>{viewingDoc.original_name || viewingDoc.filename}</span>
                    <span>•</span>
                    <span style={{ fontFamily: 'monospace' }}>{fmtBytes(viewingDoc.size_bytes || viewingDoc.file_size)}</span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button onClick={() => { const d = viewingDoc; setViewModalOpen(false); handleSelectFile(d); }}
                  className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                  <Edit3 size={13} /> Inspect Details
                </button>
                <a href={evidenceApi.getDownloadUrl(viewingDoc.id)} download={viewingDoc.original_name || viewingDoc.filename}
                  className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, textDecoration: 'none' }}>
                  <Download size={13} /> Download
                </a>
                <button onClick={() => { setViewModalOpen(false); setViewingDoc(null); }} className="btn btn-secondary btn-sm" style={{ padding: 6 }}><X size={16} /></button>
              </div>
            </div>

            {(() => {
              const localUrl = viewingDoc._localObjectUrl;
              const serverUrl = viewingDoc.id ? evidenceApi.getViewUrl(viewingDoc.id) : null;
              const mime = viewingDoc.mime_type || viewingDoc.mime || '';
              const isImage = mime.startsWith('image/');
              const viewSrc = localUrl || serverUrl;
              return (
                <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-elevated)', borderRadius: 10, padding: 16, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', minHeight: 360 }}>
                  {viewSrc && isImage ? (
                    <div style={{ textAlign: 'center', width: '100%' }}>
                      <img src={viewSrc} alt={viewingDoc.original_name} style={{ maxWidth: '100%', maxHeight: '65vh', objectFit: 'contain', borderRadius: 8, border: '1px solid var(--border-default)', background: '#fff' }} />
                    </div>
                  ) : viewSrc ? (
                    <div style={{ width: '100%', height: '65vh' }}>
                      <iframe src={viewSrc} title={viewingDoc.original_name} style={{ width: '100%', height: '100%', border: 'none', borderRadius: 8, background: '#fff' }} />
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 40 }}>
                      <File size={40} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                      <div style={{ fontWeight: 600 }}>No preview available</div>
                    </div>
                  )}
                </div>
              );
            })()}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-default)', paddingTop: 14, marginTop: 16 }}>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Lock size={13} color="#10b981" />
                SHA-256: <span onClick={e => e.stopPropagation()}><ShortHash hash={viewingDoc.sha256} onCopy={handleHashCopy} /></span>
              </div>
              <button onClick={() => { setViewModalOpen(false); setViewingDoc(null); }} className="btn btn-secondary" style={{ fontSize: 12 }}>Close Preview</button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Manual Entry Modal ── */}
      <ManualEntryModal
        isOpen={manualEntryOpen}
        onClose={() => setManualEntryOpen(false)}
        evidence={manualEntryEvidence}
        fuelSubtype={fuelSubtype}
        onSave={(data) => {
          if (manualEntryEvidence?.id) {
            setManualData(prev => ({ ...prev, [manualEntryEvidence.id]: data }));
          }
          setManualEntryOpen(false);
          setNotice({ type: 'success', text: `✅ Manual entry saved for "${manualEntryEvidence?.original_name || 'document'}".` });
        }}
      />

      {/* ── Delete Confirmation Modal ── */}
      {deleteModalOpen && fileToDelete && (
        <Modal isOpen={Boolean(deleteModalOpen && fileToDelete)}
          onClose={() => { if (!deleting) { setDeleteModalOpen(false); setFileToDelete(null); setAdminPassword(''); setDeleteError(null); } }}
          maxWidth="520px">
          <form onSubmit={handleConfirmDelete} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(239,68,68,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Trash2 size={22} color="#ef4444" />
              </div>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 800, margin: 0 }}>Authorize Evidence Deletion</h3>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>Requires administrator cryptographic authentication</p>
              </div>
            </div>

            <div style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '11px 14px', fontSize: 12, color: '#ef4444' }}>
              <div style={{ fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertTriangle size={13} /> Permanent Document Purge Warning
              </div>
              You are about to permanently delete <strong>{fileToDelete.original_name || fileToDelete.filename}</strong>. This purges physical storage and revokes audit trace references.
            </div>

            <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '10px 14px', border: '1px solid var(--border-default)', fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: 'var(--text-secondary)' }}>SHA-256:</span>
                <ShortHash hash={fileToDelete.sha256} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Size:</span>
                <span>{fmtBytes(fileToDelete.size_bytes || fileToDelete.file_size)}</span>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><KeyRound size={12} /> Admin Password</span>
              </label>
              <input type="password" value={adminPassword} onChange={(e) => { setAdminPassword(e.target.value); setDeleteError(null); }}
                placeholder="Enter your administrative password" className="form-input"
                style={{ width: '100%', fontSize: 13 }} autoFocus disabled={deleting} />
            </div>

            {deleteError && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, padding: '9px 12px', fontSize: 12, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 7 }}>
                <AlertCircle size={13} /> {deleteError}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 9 }}>
              <button type="button" onClick={() => { setDeleteModalOpen(false); setFileToDelete(null); setAdminPassword(''); setDeleteError(null); }}
                className="btn btn-secondary" disabled={deleting} style={{ fontSize: 13 }}>Cancel</button>
              <button type="submit" disabled={deleting || !adminPassword.trim()}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, padding: '7px 16px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 7, opacity: (deleting || !adminPassword.trim()) ? 0.6 : 1, cursor: (deleting || !adminPassword.trim()) ? 'not-allowed' : 'pointer', fontWeight: 700 }}>
                {deleting ? <><div className="spinner" style={{ width: 13, height: 13 }} /> Deleting…</> : <><Trash2 size={13} /> Confirm Delete</>}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
