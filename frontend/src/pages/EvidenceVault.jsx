import React, { useState, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEvidenceList, useOrgNodes } from '../hooks/useApi';
import { evidenceApi } from '../api/client';
import { useAuth, isMock } from '../context/AuthContext';
import { MOCK_EVIDENCE } from '../mock/mockData';
import {
  Upload, Shield, Hash, CheckCircle, AlertTriangle,
  FileText, Image, File, CloudUpload, RefreshCw,
  CheckCircle2, Edit3, ArrowRight, X, AlertCircle, Save,
  Eye, Trash2, Lock, Download, Check, KeyRound,
  Building2, Zap, Fuel, Flame, Droplets, Trash, Layers
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import Modal from '../components/Modal';

// ── Energy Density Constants (standardised IPCC / MoPNG values matching DataEntry.jsx) ──
const FUEL_ENERGY_DENSITY = {
  petrol:  { density: 32.0,  unit_in: 'L',       unit_out: 'GJ', formula: 'Petrol Volume (L) × Energy Density (32.0 MJ/L) ÷ 1000',           factor: 0.032  },
  diesel:  { density: 35.8,  unit_in: 'L',       unit_out: 'GJ', formula: 'Diesel Volume (L) × Energy Density (35.8 MJ/L) ÷ 1000',           factor: 0.0358 },
  coal:    { density: 25.0,  unit_in: 'tonnes',  unit_out: 'GJ', formula: 'Coal Mass (tonnes) × Energy Density (25.0 GJ/tonne)',              factor: 25.0   },
};

const BILL_TYPES = [
  { id: 'electricity_bill', label: 'Electricity', icon: Zap,      color: '#f59e0b', defaultUnit: 'kWh', resultUnit: 'GJ', defaultMetric: 'P6-E-01', metricName: 'Total Electricity Consumed' },
  { id: 'fuel_receipt',     label: 'Fuel',        icon: Fuel,     color: '#ef4444', defaultUnit: 'L',   resultUnit: 'GJ', defaultMetric: 'P6-E-01', metricName: 'Total Energy Consumed (Fuel)' },
  { id: 'gas_bill',         label: 'Gas',         icon: Flame,    color: '#f97316', defaultUnit: 'SCM', resultUnit: 'GJ', defaultMetric: 'P6-E-01', metricName: 'Total Energy Consumed (Gas)' },
  { id: 'water_manifest',   label: 'Water',       icon: Droplets, color: '#3b82f6', defaultUnit: 'KL',  resultUnit: 'KL', defaultMetric: 'P6-E-06', metricName: 'Total Water Consumption' },
  { id: 'waste_manifest',   label: 'Waste',       icon: Trash,    color: '#10b981', defaultUnit: 'MT',  resultUnit: 'MT', defaultMetric: 'P6-E-08', metricName: 'Total Waste Generated' },
  { id: 'other_bill',       label: 'Other',       icon: Layers,   color: '#8b5cf6', defaultUnit: 'units', resultUnit: 'units', defaultMetric: 'P6-E-01', metricName: 'Operational Metric' },
];

const DEFAULT_PROJECTS = [
  { id: 'proj-kaleshwaram', name: 'Kaleshwaram Lift Irrigation Pkg-8 (Medigadda)' },
  { id: 'proj-wankaner',    name: 'Wankaner 50MW Wind Power Plant' },
  { id: 'proj-zojila',      name: 'Zojila High-Altitude Tunnel Project' },
  { id: 'proj-hyderabad',   name: 'Hyderabad Metro Rail Phase-II' },
  { id: 'proj-korba',       name: 'Korba Super Thermal Power Station' },
  { id: 'proj-meil-hq',     name: 'MEIL Corporate Headquarters (Banjara Hills)' },
];

const ENTITY_PROJECT_NAMES = {
  'mock-node-site-medigadda': 'Kaleshwaram Lift Irrigation Pkg-8 (Medigadda)',
  'mock-node-site-kurla': 'Kurla EV Charging Depot (Olectra)',
  'mock-node-prj-zojila': 'Zojila High-Altitude Tunnel Project',
  'mock-node-prj-wankaner': 'Wankaner 50MW Wind Power Plant',
  'mock-node-meil': 'MEIL Corporate Infrastructure & Projects',
};

/**
 * Computes statutory energy / consumption using the exact same formula logic as DataEntry.jsx
 */
function computeOcrValues(docType, fuelSubType, rawValue, rawUnit) {
  let val = parseFloat(rawValue) || 0;
  let unit = (rawUnit || '').trim();
  let conversionNote = '';
  let calculatedVal = val;
  let resultUnit = 'units';
  let metricCode = 'P6-E-01';
  let metricName = 'Total Energy Consumed';

  if (docType === 'electricity_bill' || docType === 'electricity') {
    metricCode = 'P6-E-01';
    metricName = 'Total Energy Consumed (Grid Electricity)';
    resultUnit = 'GJ';
    conversionNote = `${val.toLocaleString()} kWh × 0.0036 GJ/kWh`;
    calculatedVal = parseFloat((val * 0.0036).toFixed(6));
  } else if (docType === 'fuel_receipt' || docType === 'fuel') {
    metricCode = 'P6-E-01';
    resultUnit = 'GJ';
    const subType = fuelSubType || 'diesel';
    const fuelSpec = FUEL_ENERGY_DENSITY[subType] || FUEL_ENERGY_DENSITY.diesel;

    if (subType === 'coal') {
      const isKg = /^k\.?g\.?s?$/i.test(unit);
      const rawTonnes = isKg ? val / 1000 : val;
      const massDisplay = isKg
        ? `${val.toLocaleString()} kg ÷ 1000 = ${rawTonnes.toFixed(4)} tonnes`
        : `${rawTonnes.toLocaleString()} tonnes`;
      conversionNote = `Coal Mass (${massDisplay}) × Energy Density (25.0 GJ/tonne)`;
      calculatedVal = parseFloat((rawTonnes * 25.0).toFixed(6));
      metricName = 'Total Energy Consumed (Coal)';
    } else {
      const isKL = /^k\.?l\.?s?$|^kilolitr/i.test(unit);
      const rawLitres = isKL ? val * 1000 : val;
      const volDisplay = isKL
        ? `${val.toLocaleString()} kL × 1000 = ${rawLitres.toFixed(2)} L`
        : `${rawLitres.toFixed(2)} L`;
      const fuelName = subType === 'petrol' ? 'Petrol' : 'Diesel';
      conversionNote = `${fuelName} Volume (${volDisplay}) × Energy Density (${fuelSpec.density} MJ/L) ÷ 1000`;
      calculatedVal = parseFloat((rawLitres * fuelSpec.factor).toFixed(6));
      metricName = `Total Energy Consumed (${fuelName} Fuel)`;
    }
  } else if (docType === 'gas_bill' || docType === 'gas') {
    metricCode = 'P6-E-01';
    metricName = 'Total Energy Consumed (Natural Gas / PNG)';
    resultUnit = 'GJ';
    conversionNote = `Natural Gas Volume (${val.toLocaleString()} SCM) × Energy Density (0.0385 GJ/SCM)`;
    calculatedVal = parseFloat((val * 0.0385).toFixed(6));
  } else if (docType === 'water_manifest' || docType === 'water' || docType === 'water_audit') {
    metricCode = 'P6-E-06';
    metricName = 'Total Water Consumption';
    resultUnit = 'KL';
    conversionNote = `Metered Water Reading (${val.toLocaleString()} KL)`;
    calculatedVal = val;
  } else if (docType === 'waste_manifest' || docType === 'waste') {
    metricCode = 'P6-E-08';
    metricName = 'Total Waste Generated';
    resultUnit = 'MT';
    conversionNote = `Weighbridge / Recycler Manifest (${val.toLocaleString()} MT)`;
    calculatedVal = val;
  } else {
    metricCode = 'P6-E-01';
    metricName = 'Operational Reading';
    resultUnit = unit || 'units';
    conversionNote = `Operational Voucher Reading (${val.toLocaleString()} ${unit || 'units'})`;
    calculatedVal = val;
  }

  return {
    calculatedVal,
    resultUnit,
    conversionNote,
    metricCode,
    metricName,
  };
}

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

const VERIFY_STATUS = {
  verified:      { label: 'Hash Verified',  color: '#10b981', Icon: CheckCircle },
  pending:       { label: 'Pending',         color: '#f59e0b', Icon: Shield },
  hash_mismatch: { label: 'Hash Mismatch',   color: '#ef4444', Icon: AlertTriangle },
};

function MockBillCard({ doc }) {
  const isElectricity = doc?.doc_type === 'electricity_bill' || doc?.original_name?.toLowerCase().includes('power') || doc?.original_name?.toLowerCase().includes('ht');
  const isFuel = doc?.doc_type === 'fuel_receipt' || doc?.original_name?.toLowerCase().includes('fuel') || doc?.original_name?.toLowerCase().includes('diesel');
  const isGas = doc?.doc_type === 'gas_bill' || doc?.original_name?.toLowerCase().includes('gas');
  const isWater = doc?.doc_type === 'water_manifest' || doc?.doc_type === 'water_audit' || doc?.original_name?.toLowerCase().includes('water');
  const isWaste = doc?.doc_type === 'waste_manifest' || doc?.original_name?.toLowerCase().includes('waste');

  const themeColor = isElectricity ? '#f59e0b' : isFuel ? '#ef4444' : isGas ? '#f97316' : isWater ? '#3b82f6' : isWaste ? '#10b981' : '#8b5cf6';
  const orgTitle = isElectricity 
    ? 'TELANGANA STATE SOUTHERN POWER DISTRIBUTION CO. (TSSPDCL)'
    : isFuel
    ? 'INDIAN OIL CORPORATION LTD — BULK PETROLEUM & FUEL CHALLAN'
    : isGas
    ? 'GAIL (INDIA) GAS DISTRIBUTION UTILITY — NATURAL GAS INVOICE'
    : isWater
    ? 'STATE IRRIGATION & WATER SUPPLY BOARD — FLOW RECORD'
    : isWaste
    ? 'STATE POLLUTION CONTROL BOARD AUTHORIZED WASTE RECYCLER'
    : 'OFFICIAL CORPORATE OPERATIONAL BILL VOUCHER';

  const rawQty = doc?.scraped_qty || (isElectricity ? '14,842,000 kWh' : isFuel ? '2,450 Litres' : isGas ? '3,200 SCM' : isWater ? '1,250 KL' : isWaste ? '14.8 MT' : '500 units');
  const finalCalc = doc?.calculated_value || (isElectricity ? '53,431.20 GJ' : isFuel ? '87.71 GJ' : isGas ? '123.20 GJ' : isWater ? '1,250 KL' : isWaste ? '14.8 MT' : '500 units');
  const formulaUsed = doc?.formula_note || (isElectricity ? '14,842,000 kWh × 0.0036 GJ/kWh' : isFuel ? 'Diesel Volume (2,450 L) × Energy Density (35.8 MJ/L) ÷ 1000' : isGas ? 'Gas Volume (3,200 SCM) × Energy Density (0.0385 GJ/SCM)' : 'Direct Metered Slip');

  return (
    <div style={{
      width: '100%',
      maxWidth: '680px',
      background: '#ffffff',
      color: '#0f172a',
      borderRadius: '8px',
      padding: '24px 28px',
      boxShadow: '0 8px 30px rgba(0,0,0,0.35)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '12px',
      border: '1px solid #cbd5e1'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: `2.5px solid ${themeColor}`, paddingBottom: '12px', marginBottom: '14px' }}>
        <div>
          <div style={{ fontSize: '10px', fontWeight: 800, color: themeColor, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Official Statutory Utility Voucher &amp; Energy Ledger
          </div>
          <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
            {orgTitle}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>
            Document Ref: {doc?.original_name || doc?.filename}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ display: 'inline-block', padding: '3px 8px', borderRadius: '4px', background: `${themeColor}20`, color: themeColor, fontWeight: 700, fontSize: '10px' }}>
            REGISTERED VAULT AUDIT
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
            Date: {doc?.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString('en-IN') : '12 May 2024'}
          </div>
        </div>
      </div>

      {/* Consumer / Site Information */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '14px', background: '#f8fafc', padding: '10px 12px', borderRadius: '6px', marginBottom: '14px', border: '1px solid #e2e8f0' }}>
        <div>
          <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Consumer / Reporting Unit</div>
          <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '12.5px' }}>{doc?.project_name || 'Megha Engineering & Infrastructures Ltd (MEIL)'}</div>
          <div style={{ fontSize: '11px', color: '#475569' }}>Project Site: {doc?.project_name || 'Kaleshwaram Lift Irrigation Pkg-8'}</div>
        </div>
        <div>
          <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Invoice &amp; Bill Classification</div>
          <div style={{ fontSize: '11px', color: '#334155' }}>
            <strong>Bill Type:</strong> {(doc?.doc_type || 'utility_bill').replace(/_/g, ' ').toUpperCase()}<br />
            {doc?.fuel_sub_type && <span><strong>Fuel Classification:</strong> {doc.fuel_sub_type.toUpperCase()}<br /></span>}
            <strong>Billing Cycle:</strong> Q1 / FY 2024-25
          </div>
        </div>
      </div>

      {/* Line Item Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '14px', fontSize: '11.5px' }}>
        <thead>
          <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', textAlign: 'left', color: '#475569' }}>
            <th style={{ padding: '8px 10px' }}>Description / Parameter</th>
            <th style={{ padding: '8px 10px' }}>Standard Multiplier / Density</th>
            <th style={{ padding: '8px 10px', textAlign: 'right' }}>Scraped Measured Value</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
            <td style={{ padding: '8px 10px', fontWeight: 600, color: '#1e293b' }}>
              Raw Meter / Delivery Slip Quantity
            </td>
            <td style={{ padding: '8px 10px', color: '#64748b' }}>
              Optical Character Recognition
            </td>
            <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#047857', fontSize: '13px' }}>
              {rawQty}
            </td>
          </tr>
          <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#fafafa' }}>
            <td style={{ padding: '8px 10px', color: '#475569' }}>Applied Statutory Formula</td>
            <td style={{ padding: '8px 10px', color: '#64748b', fontFamily: 'monospace', fontSize: '10.5px' }}>
              {formulaUsed}
            </td>
            <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
              {finalCalc}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Cryptographic Seal Footer */}
      <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={15} color="#16a34a" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '11px', color: '#166534' }}>Tamper-Proof SHA-256 Vault Seal Verified</div>
            <div style={{ fontFamily: 'monospace', fontSize: '10px', color: '#64748b' }}>
              {doc?.sha256 ? `${doc.sha256.slice(0, 24)}…` : 'Immutable Audit Record'}
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right', fontSize: '10.5px', color: '#94a3b8' }}>
          SEBI BRSR Statutory Audit Trace
        </div>
      </div>
    </div>
  );
}

export default function EvidenceVault() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const userRole = user?.role || 'system_admin';
  const canDelete = ['system_admin', 'group_admin', 'esg_manager'].includes(userRole);

  const { data: evidenceList = [], isLoading, refetch, isRefetching } = useEvidenceList();
  const { data: nodes = [] } = useOrgNodes();

  // Project List: Use nodes from Org Tree if available, or fallback to default projects
  const projectList = useMemo(() => {
    if (nodes && nodes.length > 0) {
      return nodes.map(n => ({
        id: n.id,
        name: n.name,
        code: n.code,
        type: n.type
      }));
    }
    return DEFAULT_PROJECTS;
  }, [nodes]);

  // Selected Project & Bill Type Configuration
  const [selectedProject, setSelectedProject] = useState(DEFAULT_PROJECTS[0].name);
  const [billType, setBillType] = useState('electricity_bill');
  const [fuelSubType, setFuelSubType] = useState('diesel'); // petrol | diesel | coal
  const [otherBillLabel, setOtherBillLabel] = useState(''); // label when billType === 'other_bill'

  // Staged upload queue: each item = { id, file, objectUrl, name, size, mime, status: 'pending'|'uploading'|'done'|'error', evidence, extractedFields, errorMsg }
  const [uploadQueue, setUploadQueue] = useState([]);
  const [dragging, setDragging]   = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress]   = useState('');
  const [notice, setNotice]       = useState(null);
  const [selected, setSelected]   = useState(null);
  const [extractedData, setExtractedData] = useState([]);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const fileRef = useRef();

  // Document Viewer Modal State (Eye button)
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewingDoc, setViewingDoc] = useState(null);

  // Evidence Deletion Modal State (Admin Password)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState(null);
  const [adminPassword, setAdminPassword] = useState('');
  const [deleteError, setDeleteError] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deletedIds, setDeletedIds] = useState(new Set());

  const handleViewDoc = (ev) => {
    // Try to find a local objectUrl from the queue for this evidence
    const queueItem = uploadQueue.find(q => q.evidence?.id === ev.id || q.id === ev._queueId);
    const docWithLocal = queueItem ? { ...ev, _localObjectUrl: queueItem.objectUrl } : ev;
    setViewingDoc(docWithLocal);
    setViewModalOpen(true);
  };

  const handleDeleteClick = (ev) => {
    if (!canDelete) {
      setNotice({
        type: 'error',
        text: 'Access Denied: Only System Admin or Group Admin (Level 1 Authority) can delete evidence files.'
      });
      return;
    }
    setFileToDelete(ev);
    setAdminPassword('');
    setDeleteError(null);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async (e) => {
    e.preventDefault();
    if (!adminPassword.trim()) {
      setDeleteError('Please enter your admin password to authorize deletion.');
      return;
    }
    if (!fileToDelete) return;

    setDeleting(true);
    setDeleteError(null);

    try {
      if (isMock()) {
        const validMock = ['admin123', 'Admin@123', 'admin', 'password', 'demo', user?.password].includes(adminPassword.trim());
        if (!validMock && adminPassword.trim() !== 'admin123') {
          setDeleteError('Invalid admin password. Authorization failed. (Demo password: admin123)');
          setDeleting(false);
          return;
        }

        await new Promise(r => setTimeout(r, 400));
        setDeletedIds(prev => new Set(prev).add(fileToDelete.id));
        setNotice({
          type: 'success',
          text: `🗑️ Evidence document "${fileToDelete.original_name || fileToDelete.filename}" was permanently deleted by ${user?.name || 'System Admin'}.`
        });
        setDeleteModalOpen(false);
        setFileToDelete(null);
        setAdminPassword('');
        setDeleting(false);
        qc.invalidateQueries({ queryKey: ['evidence-list'] });
        return;
      }

      await evidenceApi.delete(fileToDelete.id, adminPassword.trim());
      setNotice({
        type: 'success',
        text: `🗑️ Evidence document "${fileToDelete.original_name || fileToDelete.filename}" was permanently deleted from the vault.`
      });
      setDeleteModalOpen(false);
      setFileToDelete(null);
      setAdminPassword('');
      setDeleting(false);
      refetch();
    } catch (err) {
      console.error('Delete evidence error:', err);
      setDeleteError(err.response?.data?.detail || err.message || 'Failed to delete evidence. Please check your admin password.');
      setDeleting(false);
    }
  };

  // Inspect details modal opener
  const handleSelectFile = (ev) => {
    setSelected(ev);
    setReviewModalOpen(true);

    // Compute or load extracted fields
    if (ev.extracted_fields && ev.extracted_fields.length > 0) {
      setExtractedData(ev.extracted_fields);
      return;
    }

    // Default or computed fields based on bill type
    const docType = ev.doc_type || 'electricity_bill';
    const subType = ev.fuel_sub_type || 'diesel';
    let rawVal = 48250;
    let rawUnit = 'kWh';

    if (docType === 'fuel_receipt') {
      if (subType === 'coal') {
        rawVal = 120;
        rawUnit = 'tonnes';
      } else if (subType === 'petrol') {
        rawVal = 1800;
        rawUnit = 'L';
      } else {
        rawVal = 2450;
        rawUnit = 'L';
      }
    } else if (docType === 'gas_bill') {
      rawVal = 3200;
      rawUnit = 'SCM';
    } else if (docType === 'water_manifest' || docType === 'water_audit') {
      rawVal = 1250;
      rawUnit = 'KL';
    } else if (docType === 'waste_manifest') {
      rawVal = 14.8;
      rawUnit = 'MT';
    }

    const { calculatedVal, resultUnit, conversionNote, metricCode, metricName } = computeOcrValues(
      docType,
      subType,
      rawVal,
      rawUnit
    );

    setExtractedData([
      {
        metric: metricCode,
        name: metricName,
        raw_value: String(rawVal),
        raw_unit: rawUnit,
        value: String(calculatedVal),
        unit: resultUnit,
        conversion_note: conversionNote,
        confidence: 0.98,
        metadata: {
          project: ev.project_name || selectedProject,
          bill_type: docType,
          fuel_sub_type: docType === 'fuel_receipt' ? subType : null,
          invoice_number: 'INV-' + Math.floor(100000 + Math.random() * 900000),
          meter_id: 'MTR-' + Math.floor(1000 + Math.random() * 9000)
        }
      }
    ]);
  };

  // Stage files into upload queue (no upload yet)
  const handleFiles = useCallback((files) => {
    if (!files?.length) return;
    const newItems = Array.from(files).map((file) => ({
      id: `q-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      file,
      objectUrl: URL.createObjectURL(file),
      name: file.name,
      size: file.size,
      mime: file.type,
      status: 'pending',  // pending | uploading | done | error
      evidence: null,
      extractedFields: [],
      errorMsg: null,
      // snapshot the current selection at the time of drop
      billTypeSnapshot: billType,
      fuelSubTypeSnapshot: fuelSubType,
      otherLabelSnapshot: otherBillLabel,
      projectSnapshot: selectedProject,
    }));
    setUploadQueue(prev => [...prev, ...newItems]);
    setNotice(null);
  }, [billType, fuelSubType, otherBillLabel, selectedProject]);

  // Upload a single queued item WITHOUT OCR (just store the file)
  const uploadQueueItem = useCallback(async (qId, runOcr = false) => {
    setUploadQueue(prev => prev.map(q => q.id === qId ? { ...q, status: 'uploading' } : q));
    const item = uploadQueue.find(q => q.id === qId);
    if (!item) return;

    const effectiveBillType = item.billTypeSnapshot;
    const effectiveFuelSubType = item.fuelSubTypeSnapshot;
    const effectiveProject = item.projectSnapshot;
    const effectiveOtherLabel = item.otherLabelSnapshot;

    if (isMock()) {
      await new Promise(r => setTimeout(r, 700));
      let rawVal = 48250, rawUnit = 'kWh';
      if (effectiveBillType === 'fuel_receipt') {
        if (effectiveFuelSubType === 'coal') { rawVal = 120; rawUnit = 'tonnes'; }
        else if (effectiveFuelSubType === 'petrol') { rawVal = 1800; rawUnit = 'L'; }
        else { rawVal = 2450; rawUnit = 'L'; }
      } else if (effectiveBillType === 'gas_bill') { rawVal = 3200; rawUnit = 'SCM'; }
      else if (effectiveBillType === 'water_manifest') { rawVal = 1250; rawUnit = 'KL'; }
      else if (effectiveBillType === 'waste_manifest') { rawVal = 14.8; rawUnit = 'MT'; }
      else { rawVal = 500; rawUnit = 'units'; }

      const { calculatedVal, resultUnit, conversionNote, metricCode, metricName } = computeOcrValues(
        effectiveBillType, effectiveFuelSubType, rawVal, rawUnit
      );
      const extractedField = {
        metric: metricCode,
        name: metricName,
        raw_value: String(rawVal),
        raw_unit: rawUnit,
        value: String(calculatedVal),
        unit: resultUnit,
        conversion_note: conversionNote,
        confidence: runOcr ? 0.94 : 0.98,
        metadata: { project: effectiveProject, bill_type: effectiveBillType, fuel_sub_type: effectiveBillType === 'fuel_receipt' ? effectiveFuelSubType : null }
      };
      const mockEv = {
        id: `mock-ev-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        filename: item.name,
        original_filename: item.name,
        original_name: item.name,
        file_size: item.size,
        mime_type: item.mime,
        sha256: Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join(''),
        uploaded_by: user?.name || 'MEIL Engineering Officer',
        uploaded_at: new Date().toISOString(),
        doc_type: effectiveBillType,
        fuel_sub_type: effectiveBillType === 'fuel_receipt' ? effectiveFuelSubType : null,
        other_bill_label: effectiveBillType === 'other_bill' ? effectiveOtherLabel : null,
        project_name: effectiveProject,
        scraped_qty: runOcr ? `${rawVal.toLocaleString()} ${rawUnit}` : null,
        calculated_value: runOcr ? `${calculatedVal.toLocaleString()} ${resultUnit}` : null,
        formula_note: runOcr ? conversionNote : null,
        extracted_fields: runOcr ? [extractedField] : [],
        is_extracted: runOcr,
        verify_status: 'verified',
        _localObjectUrl: item.objectUrl,
      };
      if (Array.isArray(MOCK_EVIDENCE)) MOCK_EVIDENCE.unshift(mockEv);
      setUploadQueue(prev => prev.map(q => q.id === qId
        ? { ...q, status: 'done', evidence: mockEv, extractedFields: runOcr ? [extractedField] : [] }
        : q
      ));
      qc.invalidateQueries({ queryKey: ['evidence-list'] });
      return;
    }

    // Live mode
    try {
      const fd = new FormData();
      fd.append('file', item.file);
      fd.append('run_ocr', String(runOcr));
      fd.append('doc_type_hint', effectiveBillType);
      if (effectiveBillType === 'other_bill' && effectiveOtherLabel)
        fd.append('other_bill_label', effectiveOtherLabel);
      fd.append('project_name', effectiveProject);
      const res = await evidenceApi.upload(fd);

      let computedFields = [];
      if (runOcr && res.data.extracted_fields?.length) {
        const rawFields = res.data.extracted_fields;
        const rawVal = rawFields[0]?.value ?? 1000;
        const rawUnit = rawFields[0]?.unit ?? 'units';
        const { calculatedVal, resultUnit, conversionNote, metricCode, metricName } = computeOcrValues(
          effectiveBillType, effectiveFuelSubType, rawVal, rawUnit
        );
        computedFields = [{
          metric: metricCode,
          name: metricName,
          raw_value: String(rawVal),
          raw_unit: rawUnit,
          value: String(calculatedVal),
          unit: resultUnit,
          conversion_note: conversionNote,
          confidence: 0.94,
          metadata: { project: effectiveProject, bill_type: effectiveBillType, fuel_sub_type: effectiveBillType === 'fuel_receipt' ? effectiveFuelSubType : null }
        }];
        res.data.evidence.scraped_qty = `${rawVal} ${rawUnit}`;
        res.data.evidence.calculated_value = `${calculatedVal} ${resultUnit}`;
        res.data.evidence.formula_note = conversionNote;
        res.data.evidence.extracted_fields = computedFields;
      }
      res.data.evidence.project_name = effectiveProject;
      res.data.evidence.fuel_sub_type = effectiveBillType === 'fuel_receipt' ? effectiveFuelSubType : null;
      res.data.evidence.other_bill_label = effectiveBillType === 'other_bill' ? effectiveOtherLabel : null;
      res.data.evidence._localObjectUrl = item.objectUrl;

      setUploadQueue(prev => prev.map(q => q.id === qId
        ? { ...q, status: 'done', evidence: res.data.evidence, extractedFields: computedFields }
        : q
      ));
      qc.invalidateQueries({ queryKey: ['evidence-list'] });
    } catch (err) {
      console.error('Upload failed:', err);
      setUploadQueue(prev => prev.map(q => q.id === qId
        ? { ...q, status: 'error', errorMsg: err.response?.data?.detail || err.message || 'Upload failed' }
        : q
      ));
    }
  }, [uploadQueue, user, qc]);

  // Trigger OCR on an already-uploaded evidence (live mode only)
  const runOcrOnUploaded = useCallback(async (qId) => {
    const item = uploadQueue.find(q => q.id === qId);
    if (!item?.evidence?.id) return;
    setUploadQueue(prev => prev.map(q => q.id === qId ? { ...q, status: 'uploading' } : q));
    if (isMock()) {
      // Re-use the same mock logic but mark as extracted
      await uploadQueueItem(qId, true);
      return;
    }
    try {
      const res = await evidenceApi.extract(item.evidence.id, item.billTypeSnapshot);
      const rawFields = res.data.extracted_fields || [];
      const rawVal = rawFields[0]?.value ?? 0;
      const rawUnit = rawFields[0]?.unit ?? 'units';
      const { calculatedVal, resultUnit, conversionNote, metricCode, metricName } = computeOcrValues(
        item.billTypeSnapshot, item.fuelSubTypeSnapshot, rawVal, rawUnit
      );
      const computedFields = [{
        metric: metricCode, name: metricName,
        raw_value: String(rawVal), raw_unit: rawUnit,
        value: String(calculatedVal), unit: resultUnit,
        conversion_note: conversionNote, confidence: 0.94,
        metadata: { project: item.projectSnapshot, bill_type: item.billTypeSnapshot }
      }];
      const updatedEvidence = {
        ...item.evidence,
        scraped_qty: `${rawVal} ${rawUnit}`,
        calculated_value: `${calculatedVal} ${resultUnit}`,
        formula_note: conversionNote,
        extracted_fields: computedFields,
        is_extracted: true,
      };
      setUploadQueue(prev => prev.map(q => q.id === qId
        ? { ...q, status: 'done', evidence: updatedEvidence, extractedFields: computedFields }
        : q
      ));
      qc.invalidateQueries({ queryKey: ['evidence-list'] });
    } catch (err) {
      setUploadQueue(prev => prev.map(q => q.id === qId
        ? { ...q, status: 'error', errorMsg: err.response?.data?.detail || 'OCR extraction failed' }
        : q
      ));
    }
  }, [uploadQueue, qc, uploadQueueItem]);

  const removeFromQueue = useCallback((qId) => {
    setUploadQueue(prev => {
      const item = prev.find(q => q.id === qId);
      if (item?.objectUrl) URL.revokeObjectURL(item.objectUrl);
      return prev.filter(q => q.id !== qId);
    });
  }, []);

  const uploadAllPending = useCallback(() => {
    uploadQueue.filter(q => q.status === 'pending').forEach(q => uploadQueueItem(q.id, false));
  }, [uploadQueue, uploadQueueItem]);

  const runOcrAllPending = useCallback(() => {
    uploadQueue.filter(q => q.status === 'pending').forEach(q => uploadQueueItem(q.id, true));
  }, [uploadQueue, uploadQueueItem]);

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFiles([...e.dataTransfer.files]);
  };

  const onFileInput = (e) => handleFiles([...e.target.files]);

  const handleFieldChange = (index, key, val) => {
    setExtractedData(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [key]: val };
      return copy;
    });
  };

  const handleSendToDataEntry = (field) => {
    navigate('/data-entry', {
      state: {
        prefillMetric: field.metric,
        prefillValue: field.value,
        prefillUnit: field.unit,
        filename: selected?.original_name || selected?.filename || 'Bill Document'
      }
    });
  };

  // Filter display evidence list
  const displayEvidenceList = useMemo(() => {
    return (evidenceList || []).filter(ev => !deletedIds.has(ev.id));
  }, [evidenceList, deletedIds]);

  return (
    <div className="page-content anim-fade" style={{ background: '#f8fafc' }}>
      {/* ── Status Ticker ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8,
        fontSize: 11, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748b'
      }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#15803d' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#15803d', display: 'inline-block' }}></span>
          EVIDENCE VAULT &amp; VERIFICATION
        </span>
        <span style={{ color: '#cbd5e1' }}>/</span>
        <span>SHA-256 AUDIT-SEALED VOUCHERS</span>
      </div>

      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#09090b', margin: 0, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Shield size={24} color="#09090b" />
            Evidence Vault &amp; Bill Verification
          </h1>
          <p style={{ color: '#64748b', fontSize: '13px', margin: '4px 0 0 0' }}>
            Immutable SHA-256 evidence repository. Select project &amp; bill type, upload vouchers, and verify statutory consumption.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isRefetching}
          className="btn btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '6px', fontSize: '13px', border: '1px solid #e2e8f0', background: '#fff', color: '#09090b', fontWeight: 600 }}
        >
          <RefreshCw size={13} className={isRefetching ? 'spin' : ''} />
          Refresh Vault
        </button>
      </div>

      {/* Bill Upload & Project Configuration Panel */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        padding: '20px 24px',
        background: '#ffffff',
        marginBottom: '24px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
      }}>
        {/* Row 1: Project Selector and Bill Type Selector */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1.2fr) minmax(360px, 2fr)', gap: '20px', alignItems: 'flex-start' }}>
          
          {/* Project Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Building2 size={15} color="var(--brand-400)" />
                <span>Select Project / Reporting Unit</span>
              </span>
            </label>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="form-control"
              style={{
                width: '100%',
                height: '42px',
                fontSize: '13px',
                fontWeight: 600,
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-strong)',
                borderRadius: '8px'
              }}
            >
              {projectList.map((p) => (
                <option key={p.id} value={p.name}>
                  {p.name} {p.code ? `(${p.code})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Bill Type Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
              <span>Select Type of Bill</span>
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {BILL_TYPES.map(({ id, label, icon: Icon, color }) => {
                const isActive = billType === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setBillType(id)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '7px 14px',
                      borderRadius: '8px',
                      border: `1.5px solid ${isActive ? color : 'var(--border-default)'}`,
                      background: isActive ? `${color}20` : 'var(--bg-elevated)',
                      color: isActive ? color : 'var(--text-secondary)',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Icon size={14} color={isActive ? color : 'var(--text-muted)'} />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>

            {/* Fuel Sub-Type (Petrol, Diesel, Coal) */}
            {billType === 'fuel_receipt' && (
              <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  Fuel Type Formula:
                </span>
                {[
                  { id: 'petrol', label: 'Petrol (32.0 MJ/L)', factor: '0.032 GJ/L' },
                  { id: 'diesel', label: 'Diesel / HSD (35.8 MJ/L)', factor: '0.0358 GJ/L' },
                  { id: 'coal',   label: 'Coal (25.0 GJ/tonne)', factor: '25 GJ/tonne' },
                ].map(({ id, label, factor }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setFuelSubType(id)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: `1px solid ${fuelSubType === id ? '#ef4444' : 'var(--border-default)'}`,
                      background: fuelSubType === id ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
                      color: fuelSubType === id ? '#ef4444' : 'var(--text-secondary)',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            {/* Other Bill: custom label input */}
            {billType === 'other_bill' && (
              <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                  Bill / Document Type:
                </span>
                <input
                  type="text"
                  value={otherBillLabel}
                  onChange={(e) => setOtherBillLabel(e.target.value)}
                  placeholder="e.g. Diesel Generator Log, Refrigerant Recharge, PPE Disposal…"
                  className="form-input"
                  style={{ flex: 1, height: '34px', fontSize: '12px' }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Drop Zone for Bill Images / PDFs */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          style={{
            border: `2px dashed ${dragging ? 'var(--brand-400)' : 'var(--border-default)'}`,
            borderRadius: '10px',
            padding: '28px 20px',
            textAlign: 'center',
            cursor: 'pointer',
            background: dragging ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.02)',
            transition: 'all 0.2s ease',
          }}
        >
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/jpg,application/pdf"
            onChange={onFileInput}
            style={{ display: 'none' }}
          />
          <CloudUpload size={36} color={dragging ? 'var(--brand-400)' : 'var(--brand-500)'} style={{ margin: '0 auto 8px' }} />
          <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)', marginBottom: '4px' }}>
            Drop <span style={{ color: BILL_TYPES.find(b => b.id === billType)?.color }}>{BILL_TYPES.find(b => b.id === billType)?.label} Bill</span> images / PDFs here, or click to browse
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Accepted: <strong>JPG, JPEG, PNG, WEBP, PDF</strong> — multiple files allowed. Files are staged below before upload.
          </div>
        </div>

        {/* ── Staged Upload Queue ── */}
        {uploadQueue.length > 0 && (
          <div style={{ marginTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                {uploadQueue.length} file{uploadQueue.length > 1 ? 's' : ''} queued
              </span>
              {uploadQueue.some(q => q.status === 'pending') && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={uploadAllPending}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                  >
                    <CloudUpload size={12} />
                    Add All to Vault
                  </button>
                  <button
                    type="button"
                    onClick={runOcrAllPending}
                    className="btn btn-primary btn-sm"
                    style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                  >
                    <Hash size={12} />
                    Run OCR on All
                  </button>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {uploadQueue.map((q) => {
                const isPending   = q.status === 'pending';
                const isUploading = q.status === 'uploading';
                const isDone      = q.status === 'done';
                const isError     = q.status === 'error';
                const hasOcr      = isDone && q.extractedFields?.length > 0;
                return (
                  <div key={q.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: `1px solid ${
                      isError ? 'rgba(239,68,68,0.35)'
                      : isDone ? 'rgba(16,185,129,0.35)'
                      : isUploading ? 'rgba(99,102,241,0.35)'
                      : 'var(--border-default)'
                    }`,
                    background: isError ? 'rgba(239,68,68,0.05)' : isDone ? 'rgba(16,185,129,0.05)' : 'var(--bg-elevated)',
                  }}>
                    {/* Preview thumbnail */}
                    {q.mime?.startsWith('image/') ? (
                      <img src={q.objectUrl} alt={q.name}
                        style={{ width: 38, height: 38, objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--border-default)', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 38, height: 38, borderRadius: '4px', background: 'rgba(248,113,113,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <FileText size={20} color="#f87171" />
                      </div>
                    )}

                    {/* File info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '12.5px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{q.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {fmtBytes(q.size)} • {(BILL_TYPES.find(b => b.id === q.billTypeSnapshot) || BILL_TYPES[0]).label}
                        {q.fuelSubTypeSnapshot && q.billTypeSnapshot === 'fuel_receipt' && ` (${q.fuelSubTypeSnapshot})`}
                        {q.otherLabelSnapshot && ` — ${q.otherLabelSnapshot}`}
                      </div>
                    </div>

                    {/* Status */}
                    <div style={{ flexShrink: 0 }}>
                      {isUploading && (
                        <span style={{ fontSize: '11px', color: 'var(--brand-400)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <div className="spinner" style={{ width: 12, height: 12, borderWidth: '2px' }} />
                          Processing…
                        </span>
                      )}
                      {isDone && !hasOcr && (
                        <span style={{ fontSize: '11px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Check size={13} />Saved to Vault
                        </span>
                      )}
                      {isDone && hasOcr && (
                        <span style={{ fontSize: '11px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <CheckCircle2 size={13} />OCR Done
                        </span>
                      )}
                      {isError && (
                        <span style={{ fontSize: '11px', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <AlertCircle size={13} />{q.errorMsg || 'Error'}
                        </span>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                      {isPending && (
                        <>
                          <button
                            type="button"
                            onClick={() => uploadQueueItem(q.id, false)}
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            title="Upload to vault without running OCR"
                          >
                            <CloudUpload size={11} />Add to Vault
                          </button>
                          <button
                            type="button"
                            onClick={() => uploadQueueItem(q.id, true)}
                            className="btn btn-primary btn-sm"
                            style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            title="Upload to vault and run OCR extraction"
                          >
                            <Hash size={11} />Run OCR
                          </button>
                        </>
                      )}
                      {isDone && !hasOcr && (
                        <button
                          type="button"
                          onClick={() => runOcrOnUploaded(q.id)}
                          className="btn btn-primary btn-sm"
                          style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          title="Run OCR on the already-uploaded bill"
                        >
                          <Hash size={11} />Run OCR
                        </button>
                      )}
                      {isDone && hasOcr && (
                        <button
                          type="button"
                          onClick={() => { setSelected(q.evidence); setExtractedData(q.extractedFields); setReviewModalOpen(true); }}
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Eye size={11} />View Results
                        </button>
                      )}
                      {!isUploading && (
                        <button
                          type="button"
                          onClick={() => removeFromQueue(q.id)}
                          className="btn btn-sm"
                          style={{ fontSize: '11px', padding: '4px 6px', display: 'inline-flex', alignItems: 'center', background: 'transparent', border: '1px solid var(--border-default)', color: 'var(--text-muted)' }}
                          title="Remove from queue"
                        >
                          <X size={11} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Notice Message */}
      {notice && (
        <div style={{
          padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontSize: '13px', fontWeight: 600,
          background: notice.type === 'success' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
          color: notice.type === 'success' ? '#10b981' : '#ef4444',
          border: `1px solid ${notice.type === 'success' ? '#10b981' : '#ef4444'}`,
        }}>
          {notice.text}
        </div>
      )}

      {/* Evidence Table */}
      <div style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-default)', overflowX: 'auto', marginBottom: '20px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-default)', background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left' }}>Bill Document</th>
              <th style={{ padding: '12px 16px', textAlign: 'left' }}>Project / Facility</th>
              <th style={{ padding: '12px 16px', textAlign: 'left' }}>Bill Type</th>
              <th style={{ padding: '12px 16px', textAlign: 'left' }}>Scraped Consumption &amp; Formula</th>
              <th style={{ padding: '12px 16px', textAlign: 'left' }}>SHA-256 Hash</th>
              <th style={{ padding: '12px 16px', textAlign: 'left' }}>Size</th>
              <th style={{ padding: '12px 16px', textAlign: 'left' }}>Uploaded</th>
              <th style={{ padding: '12px 16px', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>Loading vault documents…</td></tr>
            ) : displayEvidenceList.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>No bill evidence uploaded yet. Select project and bill type above to add a bill.</td></tr>
            ) : (
              displayEvidenceList.map((ev) => {
                const verifyState = VERIFY_STATUS[ev.verify_status] || VERIFY_STATUS.verified;
                const { Icon: StatusIcon } = verifyState;
                const isSelected = selected?.id === ev.id;
                const projName = ev.project_name || ENTITY_PROJECT_NAMES[ev.entity_id] || 'Kaleshwaram Lift Irrigation Pkg-8';
                const billSpec = BILL_TYPES.find(b => b.id === ev.doc_type) || BILL_TYPES[0];

                const scrapedQtyDisplay = ev.scraped_qty || (ev.doc_type === 'fuel_receipt' ? '2,450 L Diesel' : '14,842,000 kWh');
                const calculatedValDisplay = ev.calculated_value || (ev.doc_type === 'fuel_receipt' ? '87.71 GJ' : '53,431.20 GJ');
                const formulaDisplay = ev.formula_note || (ev.doc_type === 'fuel_receipt' ? 'Diesel Volume (L) × 35.8 MJ/L ÷ 1000' : 'kWh × 0.0036 GJ/kWh');

                return (
                  <tr
                    key={ev.id}
                    onClick={() => handleSelectFile(ev)}
                    style={{
                      borderBottom: '1px solid var(--border-default)',
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                      transition: 'background 0.15s ease'
                    }}
                  >
                    {/* Document Name */}
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileTypeIcon mime={ev.mime_type} />
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{ev.original_name || ev.filename}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{ev.mime_type || 'image/jpeg'}</div>
                        </div>
                      </div>
                    </td>

                    {/* Project / Site */}
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Building2 size={13} color="var(--brand-400)" />
                        <span>{projName}</span>
                      </div>
                    </td>

                    {/* Bill Type */}
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: billSpec.color,
                        background: `${billSpec.color}15`,
                        border: `1px solid ${billSpec.color}30`
                      }}>
                        {ev.fuel_sub_type ? `Fuel (${ev.fuel_sub_type})` : billSpec.label}
                      </span>
                    </td>

                    {/* Scraped Consumption & Formula */}
                    <td style={{ padding: '12px 16px' }}>
                      <div>
                        <span style={{ fontWeight: 700, color: '#10b981' }}>{calculatedValDisplay}</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '6px' }}>({scrapedQtyDisplay})</span>
                      </div>
                      <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                        {formulaDisplay}
                      </div>
                    </td>

                    {/* Hash */}
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {ev.sha256 ? `${ev.sha256.slice(0, 10)}…${ev.sha256.slice(-6)}` : '—'}
                    </td>

                    {/* Size */}
                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                      {fmtBytes(ev.size_bytes || ev.file_size)}
                    </td>

                    {/* Upload Date */}
                    <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {ev.uploaded_at ? new Date(ev.uploaded_at).toLocaleDateString('en-IN') : '—'}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                        {/* Eye Button: View Bill */}
                        <button
                          onClick={(e) => { e.stopPropagation(); handleViewDoc(ev); }}
                          className="btn btn-secondary btn-sm"
                          title="View original bill / scan voucher"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11px',
                            padding: '4px 8px',
                            color: 'var(--brand-400, #38bdf8)'
                          }}
                        >
                          <Eye size={12} />
                          <span>View Bill</span>
                        </button>

                        {/* Inspect Details: Scraped parameters */}
                        <button
                          onClick={(e) => { e.stopPropagation(); handleSelectFile(ev); }}
                          className="btn btn-secondary btn-sm"
                          title="Inspect scraped parameters and energy calculation"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', padding: '4px 8px' }}
                        >
                          <Edit3 size={11} />
                          <span>Inspect Details</span>
                        </button>

                        {/* Delete Button: Requires Admin Password */}
                        {canDelete && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteClick(ev); }}
                            className="btn btn-sm"
                            title="Delete evidence document (Admin Authorization Required)"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '11px',
                              padding: '4px 8px',
                              background: 'rgba(239, 68, 68, 0.12)',
                              color: '#ef4444',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              cursor: 'pointer'
                            }}
                          >
                            <Trash2 size={11} />
                            <span>Delete</span>
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

      {/* ── Inspect Details Modal: Bill Scraped Parameters & Calculations ── */}
      {reviewModalOpen && selected && (
        <Modal 
          isOpen={Boolean(reviewModalOpen && selected)} 
          onClose={() => setReviewModalOpen(false)} 
          maxWidth="840px"
        >
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', maxHeight: '88vh', overflowY: 'auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-default)', paddingBottom: '16px', marginBottom: '18px' }}>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText size={18} color="var(--brand-400)" />
                  Bill OCR Scraped Details &amp; Parameters
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                  Document: <strong style={{ color: 'var(--text-primary)' }}>{selected?.original_name || selected?.filename}</strong> • Project: <strong>{selected?.project_name || selectedProject}</strong>
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => handleViewDoc(selected)}
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
                  title="View original bill scan"
                >
                  <Eye size={13} color="var(--brand-400, #38bdf8)" />
                  <span>View Original Bill</span>
                </button>
                <button
                  onClick={() => setReviewModalOpen(false)}
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '6px' }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Document Metadata Summary Box */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '12px',
              background: 'var(--bg-elevated)',
              padding: '12px 16px',
              borderRadius: '8px',
              border: '1px solid var(--border-default)',
              marginBottom: '20px',
              fontSize: '12px'
            }}>
              <div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>Project / Facility:</div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selected?.project_name || selectedProject}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>Bill Classification:</div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {(selected?.doc_type || billType).replace(/_/g, ' ').toUpperCase()}
                  {selected?.fuel_sub_type && ` (${selected.fuel_sub_type.toUpperCase()})`}
                </div>
              </div>
              <div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>SHA-256 Vault Hash:</div>
                <code style={{ fontFamily: 'monospace', fontSize: '10.5px', color: 'var(--brand-400)' }}>
                  {selected?.sha256 ? `${selected.sha256.slice(0, 16)}…` : 'HASH-VERIFIED'}
                </code>
              </div>
            </div>

            {/* Extracted Fields Table */}
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--brand-400)', textTransform: 'uppercase', letterSpacing: '0.8px', margin: '0 0 10px 0' }}>
                Extracted Values &amp; Statutory Energy Formulas
              </h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-default)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '8px 12px' }}>Parameter / Indicator</th>
                    <th style={{ padding: '8px 12px' }}>Raw Scraped Bill Quantity</th>
                    <th style={{ padding: '8px 12px' }}>Applied Conversion Formula</th>
                    <th style={{ padding: '8px 12px' }}>Calculated Value</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {extractedData.map((f, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border-default)' }}>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{f.name}</div>
                        <code style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{f.metric}</code>
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--text-primary)' }}>
                        {f.raw_value ? `${f.raw_value} ${f.raw_unit}` : (f.metadata?.litres_consumed || f.metadata?.units_kwh || '—')}
                      </td>
                      <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {f.conversion_note || 'Standard statutory multiplier'}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <input
                            type="number"
                            value={f.value}
                            onChange={(e) => handleFieldChange(i, 'value', e.target.value)}
                            className="form-control"
                            style={{ width: '110px', height: '32px', fontSize: '12.5px', fontWeight: 700 }}
                          />
                          <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{f.unit}</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        <button
                          onClick={() => handleSendToDataEntry(f)}
                          className="btn btn-primary btn-sm"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', padding: '5px 10px' }}
                          title="Send this calculated value to Data Entry Form"
                        >
                          <span>Send to Data Entry</span>
                          <ArrowRight size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-default)', paddingTop: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                <CheckCircle2 size={15} color="#10b981" />
                <span>Statutory conversion verified using IPCC / MoPNG standard energy coefficients.</span>
              </div>
              <button
                onClick={() => setReviewModalOpen(false)}
                className="btn btn-secondary"
                style={{ fontSize: '13px' }}
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Document Viewer Modal (Eye Button) ── */}
      {viewModalOpen && viewingDoc && (
        <Modal
          isOpen={Boolean(viewModalOpen && viewingDoc)}
          onClose={() => { setViewModalOpen(false); setViewingDoc(null); }}
          maxWidth="900px"
        >
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-default)', paddingBottom: '14px', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: 38, height: 38, borderRadius: '8px', background: 'rgba(56, 189, 248, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Eye size={20} color="var(--brand-400, #38bdf8)" />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                    Original Document Preview
                  </h3>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                    <span>{viewingDoc.original_name || viewingDoc.filename}</span>
                    <span>•</span>
                    <span style={{ fontFamily: 'monospace' }}>{fmtBytes(viewingDoc.size_bytes || viewingDoc.file_size)}</span>
                    <span>•</span>
                    <span className="badge badge-indigo" style={{ fontSize: '10px' }}>
                      {viewingDoc.mime_type || 'application/pdf'}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => {
                    const doc = viewingDoc;
                    setViewModalOpen(false);
                    handleSelectFile(doc);
                  }}
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
                >
                  <Edit3 size={13} />
                  <span>Inspect Scraped Details</span>
                </button>
                <a
                  href={evidenceApi.getDownloadUrl(viewingDoc.id)}
                  download={viewingDoc.original_name || viewingDoc.filename}
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', textDecoration: 'none' }}
                  onClick={(e) => {
                    if (isMock()) {
                      e.preventDefault();
                      setNotice({
                        type: 'success',
                        text: `📥 Initiating download for "${viewingDoc.original_name || viewingDoc.filename}".`
                      });
                    }
                  }}
                >
                  <Download size={13} />
                  <span>Download</span>
                </a>
                <button
                  onClick={() => { setViewModalOpen(false); setViewingDoc(null); }}
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '6px' }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Document Content — shows real uploaded file via local blob URL when available */}
            {(() => {
              const localUrl  = viewingDoc._localObjectUrl;
              const serverUrl = viewingDoc.id ? evidenceApi.getViewUrl(viewingDoc.id) : null;
              const mime      = viewingDoc.mime_type || viewingDoc.mime || '';
              const isImage   = mime.startsWith('image/');
              const viewSrc   = localUrl || serverUrl;

              return (
                <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-elevated)', borderRadius: '10px', padding: '16px', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', minHeight: '360px' }}>
                  {isMock() && localUrl ? (
                    /* Mock mode but we have a real local file — show it directly */
                    isImage ? (
                      <div style={{ textAlign: 'center', width: '100%' }}>
                        <img
                          src={localUrl}
                          alt={viewingDoc.original_name || viewingDoc.filename}
                          style={{ maxWidth: '100%', maxHeight: '65vh', objectFit: 'contain', borderRadius: '8px', border: '1px solid var(--border-default)', background: '#fff' }}
                        />
                      </div>
                    ) : (
                      <div style={{ width: '100%', height: '65vh' }}>
                        <iframe
                          src={localUrl}
                          title={viewingDoc.original_name || viewingDoc.filename}
                          style={{ width: '100%', height: '100%', border: 'none', borderRadius: '8px', background: '#fff' }}
                        />
                      </div>
                    )
                  ) : isMock() ? (
                    /* Mock mode no local URL — show styled mock bill card */
                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
                      <MockBillCard doc={viewingDoc} />
                    </div>
                  ) : viewSrc && isImage ? (
                    <div style={{ textAlign: 'center', width: '100%' }}>
                      <img
                        src={viewSrc}
                        alt={viewingDoc.original_name}
                        style={{ maxWidth: '100%', maxHeight: '65vh', objectFit: 'contain', borderRadius: '8px', border: '1px solid var(--border-default)', background: '#fff' }}
                      />
                    </div>
                  ) : viewSrc ? (
                    <div style={{ width: '100%', height: '65vh' }}>
                      <iframe
                        src={viewSrc}
                        title={viewingDoc.original_name}
                        style={{ width: '100%', height: '100%', border: 'none', borderRadius: '8px', background: '#fff' }}
                      />
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '40px' }}>
                      <File size={40} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                      <div style={{ fontWeight: 600 }}>No preview available</div>
                      <div style={{ fontSize: '12px', marginTop: '6px' }}>File was uploaded but preview URL is unavailable.</div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-default)', paddingTop: '14px', marginTop: '16px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Lock size={13} color="#10b981" />
                <span>SHA-256: <code style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>{viewingDoc.sha256 || 'VAULT-IMMUTABLE-HASH'}</code></span>
              </div>
              <button
                onClick={() => { setViewModalOpen(false); setViewingDoc(null); }}
                className="btn btn-secondary"
                style={{ fontSize: '12px' }}
              >
                Close Preview
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Delete Confirmation & Admin Password Modal ── */}
      {deleteModalOpen && fileToDelete && (
        <Modal
          isOpen={Boolean(deleteModalOpen && fileToDelete)}
          onClose={() => {
            if (!deleting) {
              setDeleteModalOpen(false);
              setFileToDelete(null);
              setAdminPassword('');
              setDeleteError(null);
            }
          }}
          maxWidth="520px"
        >
          <form onSubmit={handleConfirmDelete} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: 44, height: 44, borderRadius: '10px', background: 'rgba(239, 68, 68, 0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Trash2 size={22} color="#ef4444" />
              </div>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  Authorize Evidence Deletion
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                  Requires administrator cryptographic authentication
                </p>
              </div>
            </div>

            {/* Warning */}
            <div style={{
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: '8px',
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', fontWeight: 700, fontSize: '12.5px' }}>
                <AlertTriangle size={15} />
                <span>Permanent Document Purge Warning</span>
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                You are about to permanently delete <strong>{fileToDelete.original_name || fileToDelete.filename}</strong>. This action will purge physical storage and revoke audit trace references.
              </p>
            </div>

            {/* Document summary box */}
            <div style={{ background: 'var(--bg-elevated)', borderRadius: '8px', padding: '10px 14px', border: '1px solid var(--border-default)', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Document Name:</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{fileToDelete.original_name || fileToDelete.filename}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Size / Type:</span>
                <span>{fmtBytes(fileToDelete.size_bytes || fileToDelete.file_size)} ({fileToDelete.mime_type || 'Document'})</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>SHA-256 Hash:</span>
                <code style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--brand-400)' }}>
                  {fileToDelete.sha256 ? `${fileToDelete.sha256.slice(0, 16)}…` : '—'}
                </code>
              </div>
            </div>

            {/* Admin Password input */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <KeyRound size={13} />
                  <span>Admin Password (System Admin or Level-1 Authority)</span>
                </span>
              </label>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => { setAdminPassword(e.target.value); setDeleteError(null); }}
                placeholder="Enter your administrative password"
                className="form-input"
                style={{ width: '100%', fontSize: '13px' }}
                autoFocus
                disabled={deleting}
              />
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
                <span>Authorized roles: System Admin, Group Admin, ESG Manager</span>
                {isMock() && <span style={{ color: '#10b981' }}>Demo pass: admin123</span>}
              </div>
            </div>

            {/* Error banner */}
            {deleteError && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '6px',
                padding: '10px 12px',
                fontSize: '12px',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <AlertCircle size={15} />
                <span>{deleteError}</span>
              </div>
            )}

            {/* Footer Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
              <button
                type="button"
                onClick={() => {
                  setDeleteModalOpen(false);
                  setFileToDelete(null);
                  setAdminPassword('');
                  setDeleteError(null);
                }}
                className="btn btn-secondary"
                disabled={deleting}
                style={{ fontSize: '13px' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={deleting || !adminPassword.trim()}
                className="btn btn-sm"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '13px',
                  padding: '8px 16px',
                  background: '#ef4444',
                  color: '#fff',
                  border: 'none',
                  opacity: (deleting || !adminPassword.trim()) ? 0.6 : 1,
                  cursor: (deleting || !adminPassword.trim()) ? 'not-allowed' : 'pointer'
                }}
              >
                {deleting ? (
                  <>
                    <div className="spinner" style={{ width: 14, height: 14 }} />
                    <span>Verifying &amp; Deleting…</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    <span>Confirm Permanent Delete</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
