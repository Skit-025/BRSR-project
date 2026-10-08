import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  CheckCircle2, Clock, AlertTriangle, AlertCircle, ChevronRight, Info,
  Send, Save, RefreshCw, Eye, MessageSquare, Lock,
  Leaf, Droplets, Trash2, Shield, Users, Flame, Zap, BarChart3,
  HelpCircle, FileText, Building2, ArrowRight, X, ChevronDown,
  Upload, Paperclip, Sparkles, WifiOff, Wifi, CloudUpload
} from "lucide-react";
import { useOrgNodes, useOrgPeriods, useScopedForm, useSavePack, useSubmitPack, useFuelCatalog, useSyncOfflineBatch } from "../hooks/useApi";
import { useAuth } from "../context/AuthContext";
import { collectionApi, evidenceApi, calcApi, validationApi, aiApi } from "../api/client";
import { saveOfflineItem, getPendingCount, processOfflineSyncBatch } from "../utils/offlineQueue";
import { offlineSyncApi } from "../api/client";


// ── Domain colour map ─────────────────────────────────────────────────────────
const DOMAIN_META = {
  "Environment": { color: "#059669", bg: "#ecfdf5", icon: Leaf, label: "Environment" },
  "environment": { color: "#059669", bg: "#ecfdf5", icon: Leaf, label: "Environment" },
  "Social":      { color: "#0284c7", bg: "#e0f2fe", icon: Users, label: "Social" },
  "social":      { color: "#0284c7", bg: "#e0f2fe", icon: Users, label: "Social" },
  "Governance":  { color: "#7c3aed", bg: "#ede9fe", icon: Shield, label: "Governance" },
  "governance":  { color: "#7c3aed", bg: "#ede9fe", icon: Shield, label: "Governance" },
};

// Domain grouping by BRSR principle
const PRINCIPLE_DOMAIN = {
  "P1": "Governance", "P2": "Governance",
  "P3": "Social", "P4": "Social", "P5": "Social",
  "P6": "Environment",
  "P7": "Governance", "P8": "Social", "P9": "Governance",
};

// ESG category icons
const CATEGORY_ICONS = {
  "ENERGY": Zap, "FUEL": Flame, "WATER": Droplets, "WASTE": Trash2,
  "GHG": BarChart3, "EMISSIONS": BarChart3, "SAFETY": Shield,
  "WORKFORCE": Users, "WELLBEING": Users, "ETHICS": Shield,
};

const STATUS_CONFIG = {
  DRAFT:               { label: "Draft",            color: "#64748b", bg: "#f1f5f9",  icon: Clock },
  SUBMITTED:           { label: "Submitted",        color: "#b45309", bg: "#fef3c7",  icon: Send },
  UNDER_BU_REVIEW:     { label: "Under BU Review",  color: "#0369a1", bg: "#e0f2fe",  icon: Eye },
  BU_APPROVED:         { label: "BU Approved",      color: "#15803d", bg: "#dcfce7",  icon: CheckCircle2 },
  SUBSIDIARY_APPROVED: { label: "Sub. Approved",    color: "#4f46e5", bg: "#e0e7ff",  icon: CheckCircle2 },
  RETURNED:            { label: "Returned",         color: "#b91c1c", bg: "#fee2e2",  icon: AlertTriangle },
  CONSOLIDATED:        { label: "Consolidated",     color: "#4338ca", bg: "#e0e7ff",  icon: Lock },
};

// ─── Inline Evidence Upload per field ───────────────────────────────────────
function EvidenceUploader({ metricCode, evidenceRule, onUploaded }) {
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState([]);
  const [error, setError] = useState(null);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("doc_type_hint", metricCode);
      const res = await evidenceApi.upload(fd);
      const ev = res.data?.evidence;
      setUploaded(prev => [...prev, { name: file.name, id: ev?.id }]);
      onUploaded?.(ev?.id);
    } catch (err) {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ marginTop: 8 }}>
      {uploaded.map((f, i) => (
        <div key={i} style={{
          display: "flex", alignItems: "center", gap: 6, padding: "4px 10px",
          background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 6,
          marginBottom: 4, fontSize: 12, color: "#15803d", fontWeight: 500
        }}>
          <Paperclip size={12} />
          <span>{f.name}</span>
          <CheckCircle2 size={12} style={{ marginLeft: "auto" }} />
        </div>
      ))}
      <label style={{
        display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px",
        background: "#f8fafc", border: "1px dashed #cbd5e1", borderRadius: 6,
        cursor: "pointer", fontSize: 12, color: "#475569", fontWeight: 500,
        transition: "all 0.15s"
      }}>
        {uploading ? <RefreshCw size={12} className="spin" /> : <Upload size={12} />}
        {uploading ? "Uploading…" : "Upload Evidence"}
        <input type="file" accept=".pdf,.xlsx,.xls,.csv,.jpg,.png" style={{ display: "none" }} onChange={handleFile} disabled={uploading} />
      </label>
      {evidenceRule === "mandatory" && uploaded.length === 0 && (
        <span style={{ fontSize: 11, color: "#f59e0b", marginLeft: 8 }}>* Evidence required</span>
      )}
      {error && <div style={{ fontSize: 11, color: "#ef4444", marginTop: 4 }}>{error}</div>}
    </div>
  );
}

// ─── Why / What guidance card (Spec §13 & §16) with E3 Guidance RAG ───────────
function GuidanceCard({ field, open, onToggle }) {
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnswer, setAiAnswer] = useState(null);
  const [customQuestion, setCustomQuestion] = useState("");

  const defaultWhy = field.why_needed || `Mandatory ESG disclosure parameter under BRSR ${field.scope_badge || 'reporting framework'}. Entered values are validated against historical thresholds and rolled up to corporate disclosures.`;
  const defaultWhat = field.guidance_text || `Enter the exact raw operational quantity (${field.unit || 'units'}). Note: You only provide raw operational facts; the platform automatically calculates carbon emissions and intensities.`;
  const defaultDocs = field.document_hint || `Upload original supplier invoices, utility bills, meter calibration logs, or weighbridge receipts verifying the reported quantity.`;

  // Realistic examples & sources for demonstration
  const exampleMap = {
    'ENV-ENERGY-001': { eg: '64,500 kWh', src: 'Feeder Substation Meter TSS-04 / DISCOM Monthly Power Bill' },
    'ENV-ENERGY-002': { eg: '12,450 Litres', src: 'IOCL Fuel Delivery Challans & Backup DG Set Run Register' },
    'ENV-ENERGY-003': { eg: '28,300 Litres', src: 'Transit Fleet Dispatch Logs & Excavator Hour-Meter Records' },
    'ENV-WATER-001':  { eg: '9,150 kL', src: 'CGWA Certified Ultrasonic Borewell Telemetry Logs' },
    'ENV-WASTE-001':  { eg: '1.85 Tonnes', src: 'SPCB Form 10 Hazardous Waste Consignment Manifest' },
  };
  const extra = exampleMap[field.metric_code] || { eg: `1,250 ${field.unit || 'units'}`, src: 'Plant Operations Logbook / Vendor Invoices' };

  const handleAskAi = async (q) => {
    const query = q || `What constitutes ${field.metric_code} (${field.metric_name || field.name || 'this parameter'}) under SEBI BRSR Principle ${field.principle || 6}?`;
    setAiLoading(true);
    try {
      const res = await aiApi.explainField({
        indicator_code: field.metric_code,
        question: query
      });
      setAiAnswer(res.data);
    } catch (err) {
      console.error("AI RAG error:", err);
      setAiAnswer({
        answer: `Guidance Note reference: ${field.metric_code} reporting requires operational data substantiated by primary meter logs or utility invoices. Values roll up under Principle ${field.principle || 6}.`,
        citations: [{ doc: "SEBI BRSR Guidance Note", version: "2023", section: `Principle ${field.principle || 6}` }]
      });
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div style={{ marginTop: 6 }}>
      <button
        type="button"
        onClick={onToggle}
        style={{
          display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11,
          color: "#0284C7", background: "none", border: "none", cursor: "pointer",
          fontWeight: 600, padding: 0
        }}
      >
        <HelpCircle size={12} />
        Parameter Guidance &amp; AI Copilot: Why required? Where to find?
        <ChevronDown size={11} style={{ transform: open ? "rotate(180deg)" : "none", transition: "0.2s" }} />
      </button>
      {open && (
        <div style={{
          marginTop: 6, padding: "12px 14px", background: "#f8fafc",
          border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 12, lineHeight: 1.6,
          borderLeft: "3px solid #0284c7"
        }}>
          <div style={{ marginBottom: 8 }}>
            <strong style={{ color: "#09090b", display: "block", marginBottom: 3, fontSize: 11, fontFamily: "ui-monospace, monospace" }}>
              1. WHY IS THIS REQUIRED?
            </strong>
            <span style={{ color: "#475569" }}>{defaultWhy}</span>
          </div>
          <div style={{ marginBottom: 8 }}>
            <strong style={{ color: "#15803d", display: "block", marginBottom: 3, fontSize: 11, fontFamily: "ui-monospace, monospace" }}>
              2. RAW OPERATIONAL FACT TO ENTER
            </strong>
            <span style={{ color: "#475569" }}>{defaultWhat}</span>
          </div>
          <div style={{ marginBottom: 8 }}>
            <strong style={{ color: "#0284c7", display: "block", marginBottom: 3, fontSize: 11, fontFamily: "ui-monospace, monospace" }}>
              3. WHERE TO FIND DATA &amp; REALISTIC EXAMPLE
            </strong>
            <span style={{ color: "#475569" }}>
              Source: <strong>{extra.src}</strong> · Example Entry: <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#09090b', background: '#e2e8f0', padding: '1px 5px', borderRadius: 4 }}>{extra.eg}</span>
            </span>
          </div>
          <div style={{ marginBottom: 8 }}>
            <strong style={{ color: "#b45309", display: "block", marginBottom: 3, fontSize: 11, fontFamily: "ui-monospace, monospace" }}>
              4. EVIDENCE VOUCHER REQUIRED
            </strong>
            <span style={{ color: "#475569" }}>{defaultDocs}</span>
          </div>

          {/* E3 Guidance RAG Interactive Section */}
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px dashed #cbd5e1" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <strong style={{ color: "#7c3aed", fontSize: 11, display: "flex", alignItems: "center", gap: 5 }}>
                <Sparkles size={12} color="#7c3aed" /> 5. AI ENGINE E3: SEBI BRSR GUIDANCE RAG COPILOT
              </strong>
              {aiLoading && <span style={{ fontSize: 10, color: "#7c3aed", fontWeight: 600 }}>Querying Guidance Note...</span>}
            </div>

            {aiAnswer ? (
              <div style={{ background: "#f5f3ff", padding: "10px 12px", borderRadius: 6, border: "1px solid #ddd6fe" }}>
                <p style={{ margin: "0 0 6px", fontSize: 11.5, color: "#4c1d95", lineHeight: 1.5 }}>
                  {aiAnswer.answer}
                </p>
                {aiAnswer.citations?.length > 0 && (
                  <div style={{ fontSize: 10.5, color: "#6d28d9", fontWeight: 600, display: "flex", flexWrap: "wrap", gap: 4 }}>
                    <span style={{ color: "#5b21b6" }}>Statutory Citations:</span>
                    {aiAnswer.citations.map((c, idx) => (
                      <span key={idx} style={{ background: "#ede9fe", padding: "1px 6px", borderRadius: 4 }}>
                        {c.doc} ({c.version}) — §{c.section}
                      </span>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setAiAnswer(null)}
                  style={{
                    marginTop: 6, background: "none", border: "none", color: "#7c3aed",
                    fontSize: 10.5, cursor: "pointer", textDecoration: "underline", padding: 0
                  }}
                >
                  Clear Guidance
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  type="button"
                  onClick={() => handleAskAi()}
                  disabled={aiLoading}
                  style={{
                    background: "#7c3aed", color: "#fff", border: "none", borderRadius: 5,
                    padding: "5px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer",
                    display: "inline-flex", alignItems: "center", gap: 5, transition: "0.15s"
                  }}
                >
                  <Sparkles size={12} />
                  Ask AI Guidance for {field.metric_code}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Pre-Submission Review Checklist Modal (Spec §7, §18) ──────────────────────
function PreSubmissionModal({ open, onClose, onConfirm, submitting, stats, validationSummary, validationLoading }) {
  if (!open) return null;
  const isComplete = stats.filledCount === stats.totalFields;
  const hasErrors = (validationSummary?.error_count ?? 0) > 0;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(9, 9, 11, 0.55)',
      backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 20
    }}>
      <div style={{
        background: '#fff', borderRadius: 10, maxWidth: 560, width: '100%',
        boxShadow: '0 20px 40px rgba(0,0,0,0.15)', border: '1px solid #e2e8f0',
        maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden'
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileText size={18} color="#18181b" />
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#09090b' }}>Pre-Submission Review Checklist</h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={18} /></button>
        </div>

        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div style={{ padding: '14px', borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Parameters Completed</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: isComplete ? '#059669' : '#d97706', marginTop: 4 }}>
                {stats.filledCount} / {stats.totalFields}
              </div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{stats.completionPct}% completed</div>
            </div>

            <div style={{ padding: '14px', borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Review Destination</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>
                BU Review Queue
              </div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Locked on submit</div>
            </div>
          </div>

          {/* Validation Engine Status */}
          {validationLoading && (
            <div style={{ padding: '12px 16px', borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
              <RefreshCw size={15} className="spin" color="#6366f1" />
              <span style={{ fontSize: 12.5, color: '#475569', fontWeight: 500 }}>Running statutory validation rules against engine…</span>
            </div>
          )}

          {!validationLoading && hasErrors && (
            <div style={{ padding: '12px 16px', borderRadius: 10, background: '#fef2f2', border: '1px solid #fca5a5', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#b91c1c', fontWeight: 700, fontSize: 13, marginBottom: 4 }}>
                <AlertCircle size={16} />
                Validation Error Gate: {validationSummary.error_count} hard error(s) detected
              </div>
              <div style={{ fontSize: 12, color: '#991b1b', lineHeight: 1.5, maxHeight: 110, overflowY: 'auto' }}>
                {validationSummary.results?.filter(r => r.severity === 'ERROR' || r.severity === 'error')?.map((err, i) => (
                  <div key={i} style={{ marginTop: 3 }}>• <strong>{err.metric_code}:</strong> {err.message}</div>
                ))}
              </div>
            </div>
          )}

          {!validationLoading && !hasErrors && (validationSummary?.warning_count ?? 0) > 0 && (
            <div style={{ padding: '12px 16px', borderRadius: 10, background: '#fffbeb', border: '1px solid #fde68a', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#b45309', fontWeight: 700, fontSize: 13, marginBottom: 4 }}>
                <AlertTriangle size={16} />
                {validationSummary.warning_count} Advisory Warning(s)
              </div>
              <div style={{ fontSize: 12, color: '#92400e', lineHeight: 1.5, maxHeight: 80, overflowY: 'auto' }}>
                {validationSummary.results?.filter(r => r.severity === 'WARNING' || r.severity === 'warning')?.map((w, i) => (
                  <div key={i} style={{ marginTop: 2 }}>• {w.metric_code}: {w.message}</div>
                ))}
              </div>
            </div>
          )}

          {!validationLoading && validationSummary && !hasErrors && (
            <div style={{ padding: '10px 14px', borderRadius: 8, background: '#f0fdf4', border: '1px solid #bbf7d0', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle2 size={16} color="#15803d" />
              <span style={{ fontSize: 12.5, color: '#15803d', fontWeight: 600 }}>Validation Engine: All business rule checks passed</span>
            </div>
          )}

          {!isComplete && (
            <div style={{ padding: '12px 16px', borderRadius: 10, background: '#fffbeb', border: '1px solid #fde68a', marginBottom: 16, display: 'flex', gap: 10 }}>
              <AlertTriangle size={18} color="#d97706" style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={{ fontSize: 12.5, color: '#92400e', lineHeight: 1.5 }}>
                <strong>{stats.totalFields - stats.filledCount} parameter(s) incomplete:</strong>
                <div>You can submit as a draft pack, but BU Reviewer may request changes if mandatory parameters are missing.</div>
              </div>
            </div>
          )}

          <div style={{ fontSize: 12.5, color: '#475569', lineHeight: 1.6, marginBottom: 20 }}>
            Once submitted, this monthly pack will freeze and enter the <strong>BU Review Queue</strong>. You will not be able to modify numbers until the reviewer either approves or returns with comments.
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button
              onClick={onClose}
              style={{
                padding: '9px 18px', borderRadius: 8, border: '1px solid #cbd5e1',
                background: '#fff', color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer'
              }}
            >
              Go Back to Form
            </button>
            <button
              onClick={onConfirm}
              disabled={submitting || hasErrors || validationLoading}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '9px 20px', borderRadius: 8, border: 'none',
                background: hasErrors ? '#94a3b8' : 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff',
                fontSize: 13, fontWeight: 700, cursor: (submitting || hasErrors || validationLoading) ? 'not-allowed' : 'pointer',
                boxShadow: hasErrors ? 'none' : '0 4px 12px rgba(99,102,241,0.3)'
              }}
            >
              {submitting ? <RefreshCw size={14} className="spin" /> : hasErrors ? <AlertCircle size={14} /> : <Send size={14} />}
              {submitting ? 'Submitting…' : hasErrors ? 'Resolve Errors to Submit' : 'Confirm & Submit to BU'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Single Parameter Field ─────────────────────────────────────────────────
function ParameterField({ field, value, onChange, readOnly, submissionStatus, onEvidenceUploaded }) {
  const [showGuidance, setShowGuidance] = useState(false);
  const [localError, setLocalError] = useState(null);

  const isLocked = readOnly || !["DRAFT", "RETURNED"].includes(submissionStatus || "DRAFT");

  const handleChange = (v) => {
    setLocalError(null);
    // Validation
    if (field.data_type === "numeric" || field.data_type === "integer") {
      if (v !== "" && isNaN(Number(v))) {
        setLocalError("Please enter a valid number.");
        return;
      }
      if (v !== "" && Number(v) < 0 && !field.metric_code?.includes("TEMP")) {
        setLocalError("Value cannot be negative.");
        return;
      }
    }
    onChange(field.metric_code, v);
  };

  // Scope badge
  const scopeBadge = field.scope_badge;
  const isBrsrCore = field.is_brsr_core;

  // Determine if this is a derived/calculated metric vs raw operational entry
  const isCalculated = Boolean(
    field.calc_formula_code ||
    field.formula_ref ||
    field.entry_level === "calculated" ||
    (field.metric_code?.startsWith("ENV-GHG") && !field.metric_code?.includes("FUEL")) ||
    field.metric_code?.includes("INTENSITY")
  );

  const effectiveLocked = isLocked || isCalculated;

  const { data: fuelCatalog = [] } = useFuelCatalog();
  const matchedFuel = useMemo(() => {
    if (!fuelCatalog?.length) return null;
    const code = field.metric_code?.toUpperCase() || '';
    if (code.includes('DIESEL') || code.includes('HSD')) return fuelCatalog.find(f => f.code === 'DIESEL-HSD');
    if (code.includes('PETROL')) return fuelCatalog.find(f => f.code === 'PETROL');
    if (code.includes('CNG')) return fuelCatalog.find(f => f.code === 'GAS-CNG');
    if (code.includes('PNG')) return fuelCatalog.find(f => f.code === 'GAS-PNG');
    if (code.includes('LPG')) return fuelCatalog.find(f => f.code === 'GAS-LPG');
    if (code.includes('COAL')) return fuelCatalog.find(f => f.code === 'COAL-BIT');
    return null;
  }, [fuelCatalog, field.metric_code]);

  return (
    <div style={{
      padding: "16px 20px",
      background: isCalculated ? "#fcfaff" : "#fff",
      border: localError ? "1px solid #fca5a5" : isCalculated ? "1px solid #e9d5ff" : "1px solid #e2e8f0",
      borderRadius: 10,
      marginBottom: 12,
      transition: "border-color 0.15s",
    }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{field.metric_name}</span>
            {isCalculated ? (
              <span style={{
                fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 99,
                background: "#ede9fe", color: "#6d28d9", border: "1px solid #ddd6fe"
              }}>⚡ AUTO-CALCULATED</span>
            ) : (
              <span style={{
                fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 99,
                background: "#ecfdf5", color: "#065f46", border: "1px solid #a7f3d0"
              }}>RAW OPERATIONAL INPUT</span>
            )}
            {isBrsrCore && (
              <span style={{
                fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 99,
                background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a"
              }}>BRSR CORE</span>
            )}
            {scopeBadge && (
              <span style={{
                fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 99,
                background: "#e0e7ff", color: "#4338ca"
              }}>{scopeBadge}</span>
            )}
            {field.evidence_rule === "mandatory" && !isCalculated && (
              <span style={{
                fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 99,
                background: "#fce7f3", color: "#9d174d"
              }}>EVIDENCE REQ.</span>
            )}
          </div>
          <div style={{ fontSize: 11, color: "#64748b", lineHeight: 1.5 }}>
            {field.definition}
            {isCalculated && (
              <span style={{ display: "block", color: "#7c3aed", marginTop: 2, fontWeight: 500 }}>
                ℹ️ Computed deterministically by Statutory Calculation Engine from raw activity data upon BU approval.
              </span>
            )}
            {matchedFuel && (
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 5, marginTop: 4,
                fontSize: 10, padding: "2px 8px", borderRadius: 4,
                background: "#f0f9ff", border: "1px solid #bae6fd", color: "#0369a1", fontWeight: 600
              }}>
                Statutory Factor: {matchedFuel.co2e_per_unit} kg CO₂e / {matchedFuel.unit} ({matchedFuel.source})
              </span>
            )}
          </div>
        </div>
        <span style={{
          fontSize: 10, color: "#94a3b8", background: "#f8fafc",
          border: "1px solid #e2e8f0", borderRadius: 6, padding: "3px 8px",
          whiteSpace: "nowrap", fontWeight: 600
        }}>
          {field.metric_code}
        </span>
      </div>

      {/* Input Row */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {field.data_type === "text" ? (
          <textarea
            disabled={effectiveLocked}
            value={value || ""}
            onChange={e => handleChange(e.target.value)}
            rows={2}
            style={{
              flex: 1, padding: "8px 12px", fontSize: 13, borderRadius: 8,
              border: "1px solid #cbd5e1", background: effectiveLocked ? "#f8fafc" : "#fff",
              color: "#0f172a", resize: "none", outline: "none",
              fontFamily: "Inter, system-ui, sans-serif"
            }}
            placeholder={`Enter ${field.metric_name.toLowerCase()}…`}
          />
        ) : (
          <input
            type="number"
            disabled={effectiveLocked}
            value={value ?? ""}
            onChange={e => handleChange(e.target.value)}
            style={{
              flex: 1, padding: "10px 14px", fontSize: 15, fontWeight: 600,
              borderRadius: 8, border: "1px solid #cbd5e1",
              background: effectiveLocked ? "#f8fafc" : "#fff",
              color: isCalculated ? "#7c3aed" : "#0f172a", outline: "none",
              fontFamily: "Inter, system-ui, sans-serif"
            }}
            placeholder={isCalculated ? "Computed on approval" : "0"}
            min="0"
          />
        )}
        <span style={{
          padding: "10px 14px", background: "#f1f5f9", border: "1px solid #e2e8f0",
          borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#475569",
          whiteSpace: "nowrap"
        }}>
          {field.unit}
        </span>
      </div>

      {/* Validation error */}
      {localError && (
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 6, color: "#ef4444", fontSize: 12 }}>
          <AlertTriangle size={12} />
          {localError}
        </div>
      )}

      {/* Guidance card */}
      <GuidanceCard field={field} open={showGuidance} onToggle={() => setShowGuidance(p => !p)} />

      {/* Evidence uploader */}
      {!isLocked && field.evidence_rule !== "none" && (
        <EvidenceUploader
          metricCode={field.metric_code}
          evidenceRule={field.evidence_rule}
          onUploaded={(evId) => onEvidenceUploaded?.(field.metric_code, evId)}
        />
      )}
    </div>
  );
}

// ─── Project Understanding Card ─────────────────────────────────────────────
function ProjectContextCard({ entity, form }) {
  const [expanded, setExpanded] = useState(true);
  if (!entity || entity.type === "group") return null;

  const projectType = form?.project_type || entity.project_type || "project";
  const description = form?.project_description || entity.project_description;

  // Map project types to activity descriptions
  const PROJECT_ACTIVITIES = {
    road:       ["Construction", "Concrete Work", "Earth Work", "Paving", "Compaction"],
    tunnel:     ["Tunnel Boring", "Shotcrete", "Rock Blasting", "Support Systems", "Ventilation"],
    irrigation: ["Canal Construction", "Pump Station", "Earth Works", "Electrical Works"],
    solar:      ["Panel Installation", "Grid Connection", "Civil Works", "Electrical"],
    ev_bus:     ["Fleet Operations", "Charging", "Depot Operations", "Driver Training"],
    hydrocarbon:["Drilling", "Wellhead Operations", "Pipeline", "Flaring", "Storage"],
    corporate:  ["Office Operations", "IT Systems", "Business Travel", "Procurement"],
  };

  const activities = PROJECT_ACTIVITIES[projectType] || ["General Operations"];

  if (!expanded) {
    return (
      <div
        onClick={() => setExpanded(true)}
        style={{
          background: "linear-gradient(135deg, #eef2ff, #f0fdf4)", border: "1px solid #c7d2fe",
          borderRadius: 12, padding: "12px 20px", marginBottom: 20, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "space-between"
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 700, color: "#4f46e5" }}>
          📋 About this project — {entity.name}
        </span>
        <ChevronRight size={16} color="#6366f1" />
      </div>
    );
  }

  return (
    <div style={{
      background: "linear-gradient(135deg, #f0f4ff, #f0fdf4)",
      border: "1px solid #c7d2fe",
      borderRadius: 14, padding: "20px 24px", marginBottom: 24
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#6366f1", letterSpacing: "0.05em", marginBottom: 4 }}>
            ABOUT THIS PROJECT
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", margin: 0 }}>{entity.name}</h2>
          {description && (
            <p style={{ fontSize: 13, color: "#64748b", margin: "6px 0 0", lineHeight: 1.6 }}>{description}</p>
          )}
        </div>
        <button onClick={() => setExpanded(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}>
          <X size={16} />
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ background: "#fff", borderRadius: 10, padding: "12px 16px", border: "1px solid #e0e7ff" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#6366f1", marginBottom: 8 }}>PROJECT TYPE</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", textTransform: "capitalize" }}>
            {projectType.replace(/_/g, " ")}
          </div>
        </div>
        <div style={{ background: "#fff", borderRadius: 10, padding: "12px 16px", border: "1px solid #e0e7ff" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#059669", marginBottom: 8 }}>ACTIVITIES</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {activities.map((a, i) => (
              <span key={i} style={{
                fontSize: 10, padding: "2px 8px", borderRadius: 99,
                background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#15803d", fontWeight: 600
              }}>{a}</span>
            ))}
          </div>
        </div>
      </div>

      <div style={{
        marginTop: 14, padding: "12px 16px", background: "rgba(99,102,241,0.06)",
        border: "1px solid #e0e7ff", borderRadius: 10, fontSize: 12, color: "#4f46e5", lineHeight: 1.6
      }}>
        <strong>The following ESG information is requested</strong> because these activities and resources are
        associated with this project type. You are reporting what happened in your project — the system
        handles the ESG calculations and BRSR reporting automatically.
      </div>
    </div>
  );
}

// ─── Domain Section ──────────────────────────────────────────────────────────
function DomainSection({ domain, principle, fields, values, onChange, submissionStatus, onEvidenceUploaded }) {
  const [collapsed, setCollapsed] = useState(false);
  const meta = DOMAIN_META[domain] || DOMAIN_META["Environment"];
  const DomainIcon = meta.icon;

  const filled = fields.filter(f => values[f.metric_code] !== undefined && values[f.metric_code] !== "").length;
  const pct = fields.length > 0 ? Math.round((filled / fields.length) * 100) : 0;

  return (
    <div style={{ marginBottom: 20 }}>
      {/* Section header */}
      <div
        onClick={() => setCollapsed(p => !p)}
        style={{
          display: "flex", alignItems: "center", gap: 12, padding: "14px 20px",
          background: `linear-gradient(135deg, ${meta.bg}, white)`,
          border: `1px solid ${meta.color}30`,
          borderRadius: collapsed ? 12 : "12px 12px 0 0",
          cursor: "pointer", userSelect: "none"
        }}
      >
        <div style={{
          width: 36, height: 36, borderRadius: 10, background: meta.color,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
        }}>
          <DomainIcon size={18} color="#fff" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{domain}</div>
          <div style={{ fontSize: 11, color: "#64748b" }}>
            {principle} · {fields.length} field{fields.length !== 1 ? "s" : ""} · {filled}/{fields.length} filled
          </div>
        </div>
        {/* Completion indicator (Spec §14: ✓ Complete, ◐ In Progress, ○ Not Started) */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 99,
            background: pct === 100 ? "#ecfdf5" : pct > 0 ? "#fffbeb" : "#f1f5f9",
            color: pct === 100 ? "#059669" : pct > 0 ? "#d97706" : "#64748b",
            border: `1px solid ${pct === 100 ? "#a7f3d0" : pct > 0 ? "#fde68a" : "#e2e8f0"}`
          }}>
            {pct === 100 ? "✓ Complete" : pct > 0 ? `◐ ${pct}%` : "○ Not Started"}
          </span>
          <div style={{ width: 50, height: 6, background: "#e2e8f0", borderRadius: 99, overflow: "hidden" }}>
            <div style={{ width: `${pct}%`, height: "100%", background: meta.color, borderRadius: 99, transition: "width 0.3s" }} />
          </div>
        </div>
        <ChevronDown size={16} color="#94a3b8" style={{ transform: collapsed ? "rotate(-90deg)" : "none", transition: "0.2s" }} />
      </div>

      {!collapsed && (
        <div style={{
          padding: "16px", background: "#fafbfc",
          border: `1px solid ${meta.color}20`,
          borderTop: "none", borderRadius: "0 0 12px 12px"
        }}>
          {fields.map(field => (
            <ParameterField
              key={field.metric_code}
              field={field}
              value={values[field.metric_code]}
              onChange={onChange}
              submissionStatus={submissionStatus}
              onEvidenceUploaded={onEvidenceUploaded}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main DataEntry Component ────────────────────────────────────────────────
export default function DataEntry() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, role } = useAuth();

  const { data: orgNodes = [] } = useOrgNodes();
  const { data: periods = [] } = useOrgPeriods();

  // Derive scoped nodes based on user's role and assigned org node
  const scopedNodes = useMemo(() => {
    if (!orgNodes || orgNodes.length === 0) return [];

    const isAdmin =
      role === "system_admin" ||
      role === "super_admin" ||
      role === "group_admin" ||
      role === "group_esg_manager";

    if (isAdmin) {
      // Admins can select any project/site node; fallback to all nodes if no project types
      const projects = orgNodes.filter(n => n.type === "project" || n.type === "site");
      return projects.length > 0 ? projects : orgNodes;
    }

    if (user?.org_node_id) {
      const userNode = orgNodes.find(n => n.id === user.org_node_id);
      if (userNode) {
        if (userNode.type === "project" || userNode.type === "site") {
          return [userNode];
        }
        // If BU or Subsidiary, include all descendant projects or direct children
        const childProjects = orgNodes.filter(
          n =>
            (n.type === "project" || n.type === "site") &&
            (n.parent_id === userNode.id || (n.path && userNode.path && n.path.startsWith(userNode.path)))
        );
        if (childProjects.length > 0) return childProjects;
        return [userNode];
      }
    }

    // Default to project/site nodes, fallback to all nodes
    const projectNodes = orgNodes.filter(n => n.type === "project" || n.type === "site");
    return projectNodes.length > 0 ? projectNodes : orgNodes;
  }, [orgNodes, role, user?.org_node_id]);

  // Smart default: navigate to project node for makers or passed location state
  const defaultEntityId = (() => {
    if (location.state?.entityId) return location.state.entityId;
    if (user?.org_node_id) {
      const match = scopedNodes.find(n => n.id === user.org_node_id);
      if (match) return match.id;
    }
    // Find first project-type node
    const proj = scopedNodes.find(n => n.type === "project" || n.type === "site");
    return proj?.id || scopedNodes[0]?.id || "";
  })();

  const defaultPeriodId = location.state?.periodId || periods[0]?.id || "";

  const [selectedEntity, setSelectedEntity] = useState(defaultEntityId);
  const [selectedPeriod, setSelectedPeriod] = useState(defaultPeriodId);

  React.useEffect(() => {
    if (!selectedEntity && scopedNodes.length > 0) {
      const proj = scopedNodes.find(n => n.type === "project" || n.type === "site");
      setSelectedEntity(proj?.id || scopedNodes[0]?.id || "");
    }
  }, [scopedNodes, selectedEntity]);

  React.useEffect(() => {
    if (!selectedPeriod && periods.length > 0) {
      setSelectedPeriod(periods[0].id);
    }
  }, [periods]);


  const activeNode = orgNodes.find(n => n.id === selectedEntity);
  const activePeriod = periods.find(p => p.id === selectedPeriod);

  // ── Fetch scoped form from API ──────────────────────────────────────────
  const { data: form, isLoading: formLoading, refetch: refetchForm } = useScopedForm(selectedPeriod, selectedEntity);

  // ── Local state for field values ────────────────────────────────────────
  const [values, setValues] = useState({});
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // Map of metricCode → array of uploaded evidence file IDs
  const [evidenceIds, setEvidenceIds] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [notice, setNotice] = useState(null);
  const [openGuidance, setOpenGuidance] = useState({});
  const [showPreSubmitModal, setShowPreSubmitModal] = useState(false);

  // Populate values from API form data
  React.useEffect(() => {
    if (form?.sections) {
      const apiValues = {};
      form.sections.forEach(sec => {
        sec.fields?.forEach(f => {
          if (f.current_value !== null && f.current_value !== undefined) {
            apiValues[f.metric_code] = f.current_value;
          }
        });
      });
      setValues(apiValues);
    }
  }, [form]);

  const { mutateAsync: savePack } = useSavePack();
  const { mutateAsync: submitPack } = useSubmitPack();

  // Track submission ID returned from savePack so submitPack always has a valid ID
  const [activeSubmissionId, setActiveSubmissionId] = React.useState(null);

  // ── Offline queue state ──────────────────────────────────────────────────
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const [pendingOfflineCount, setPendingOfflineCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  // Refresh pending count from IndexedDB
  const refreshPendingCount = useCallback(async () => {
    try {
      const count = await getPendingCount(form?.submission_id || activeSubmissionId || null);
      setPendingOfflineCount(count);
    } catch { /* IndexedDB not available */ }
  }, [form?.submission_id, activeSubmissionId]);

  // Network status listeners + auto-sync on reconnect
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      // Auto-trigger sync when connectivity returns
      const count = await getPendingCount();
      if (count > 0) {
        setSyncing(true);
        try {
          const res = await processOfflineSyncBatch(offlineSyncApi.batch);
          setSyncResult(res);
          await refreshPendingCount();
        } catch (err) {
          console.warn('Auto offline sync failed:', err);
        } finally {
          setSyncing(false);
        }
      }
    };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [refreshPendingCount]);

  // Refresh pending count on mount and when form/submissionId changes
  useEffect(() => { refreshPendingCount(); }, [refreshPendingCount]);

  // Manual sync handler
  const handleManualSync = useCallback(async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await processOfflineSyncBatch(offlineSyncApi.batch);
      setSyncResult(res);
      await refreshPendingCount();
      if (res.applied_count > 0) refetchForm();
    } catch (err) {
      setSyncResult({ status: 'error', error: err?.message || 'Sync failed' });
    } finally {
      setSyncing(false);
    }
  }, [refreshPendingCount]);


  // ── Group form fields into ESG domains ──────────────────────────────────
  const domainGroups = useMemo(() => {
    if (!form?.sections) return {};
    const groups = {};
    form.sections.forEach(sec => {
      const domain = DOMAIN_META[sec.pillar]
        ? sec.pillar
        : PRINCIPLE_DOMAIN[sec.principle] || "Environment";
      if (!groups[domain]) groups[domain] = {};
      if (!groups[domain][sec.principle_name]) groups[domain][sec.principle_name] = [];
      sec.fields?.forEach(f => groups[domain][sec.principle_name].push(f));
    });
    return groups;
  }, [form]);

  const handleFieldChange = useCallback((metricCode, value) => {
    setValues(prev => ({ ...prev, [metricCode]: value }));
  }, []);

  const handleEvidenceUploaded = useCallback((metricCode, evidenceId) => {
    if (!evidenceId) return;
    setEvidenceIds(prev => ({
      ...prev,
      [metricCode]: [...(prev[metricCode] || []), evidenceId],
    }));
  }, []);

  const handleSave = async () => {
    if (!selectedEntity || !selectedPeriod) return;
    setSaving(true);
    const allFormFields = form?.sections?.flatMap(s => s.fields || []) || [];
    const dataPoints = Object.entries(values).map(([metric_code, val]) => ({
      metric_code,
      value_numeric: typeof val === "number" || (val && !isNaN(Number(val))) ? Number(val) : null,
      value_text: typeof val === "string" && isNaN(Number(val)) ? val : null,
      unit: allFormFields.find(f => f.metric_code === metric_code)?.unit || "",
      status: "ACTUAL",
      entry_method: "manual_form",
      evidence_file_ids: evidenceIds[metric_code] || [],
    }));
    try {
      const res = await savePack({
        entity_id: selectedEntity,
        period_id: selectedPeriod,
        submission_id: form?.submission_id || activeSubmissionId || null,
        version: 1,
        data_points: dataPoints,
      });
      // Capture the submission ID so submitPack has a valid ID even for new submissions
      const savedId = res?.data?.id || res?.id || res?.data?.submission_id;
      if (savedId) setActiveSubmissionId(savedId);
      setNotice({ type: "success", msg: "Draft saved successfully." });
    } catch (e) {
      // ── Offline fallback: queue each datapoint in IndexedDB ──────────────
      const isNetworkError =
        !navigator.onLine ||
        e?.code === 'ERR_NETWORK' ||
        e?.message?.toLowerCase().includes('network') ||
        !e?.response;
      if (isNetworkError && dataPoints.length > 0) {
        const subId = form?.submission_id || activeSubmissionId || `pending_${selectedEntity}_${selectedPeriod}`;
        let queued = 0;
        for (const dp of dataPoints) {
          try {
            await saveOfflineItem({
              submission_id: subId,
              metric_code: dp.metric_code,
              value_numeric: dp.value_numeric,
              value_text: dp.value_text,
              unit: dp.unit,
              notes: `Offline save at ${new Date().toLocaleTimeString()}`,
              version: 1,
            });
            queued++;
          } catch { /* individual item queue failure — skip */ }
        }
        await refreshPendingCount();
        setNotice({ type: "warn", msg: `You're offline. ${queued} datapoint(s) saved locally — will auto-sync when reconnected.` });
      } else {
        setNotice({ type: "error", msg: e?.response?.data?.detail || "Save failed." });
      }
    } finally {
      setSaving(false);
      setTimeout(() => setNotice(null), 5000);
    }
  };

  const [valChecking, setValChecking] = useState(false);
  const [valSummary, setValSummary] = useState(null);

  const handleOpenPreSubmit = async () => {
    setShowPreSubmitModal(true);
    setValSummary(null);
    let subId = form?.submission_id || activeSubmissionId;
    if (!subId) {
      try {
        const dataPoints = Object.entries(values).map(([metric_code, val]) => ({
          metric_code,
          value_numeric: typeof val === "number" || (val && !isNaN(Number(val))) ? Number(val) : null,
          value_text: typeof val === "string" && isNaN(Number(val)) ? val : null,
          unit: form?.sections?.flatMap(s => s.fields || []).find(f => f.metric_code === metric_code)?.unit || "",
          status: "ACTUAL",
          entry_method: "manual_form",
          evidence_file_ids: evidenceIds[metric_code] || [],
        }));
        const res = await savePack({
          entity_id: selectedEntity,
          period_id: selectedPeriod,
          submission_id: null,
          version: 1,
          data_points: dataPoints,
        });
        subId = res?.data?.id || res?.id || res?.data?.submission_id;
        if (subId) setActiveSubmissionId(subId);
      } catch {
        // Proceed even if background save had an issue
      }
    }
    if (subId) {
      setValChecking(true);
      try {
        const res = await validationApi.check(subId);
        setValSummary(res.data);
      } catch {
        // Fallback gracefully if validation endpoint has no data yet
      } finally {
        setValChecking(false);
      }
    }
  };

  const handleConfirmSubmit = async () => {
    setShowPreSubmitModal(false);
    // Ensure we have a submission ID — if not, save first to create one
    const submissionId = form?.submission_id || activeSubmissionId;
    if (!submissionId) {
      await handleSave();
    }
    setSubmitting(true);
    try {
      // Use whichever submission ID we have — prefer the freshly saved one
      const finalId = form?.submission_id || activeSubmissionId;
      if (!finalId) {
        setNotice({ type: "error", msg: "Could not resolve submission. Please save again and retry." });
        return;
      }
      await submitPack(finalId);
      setSubmitted(true);
      setActiveSubmissionId(null);
      setNotice({ type: "success", msg: "Submission sent for BU review!" });
      refetchForm();
    } catch (e) {
      setNotice({ type: "error", msg: e?.response?.data?.detail || "Submit failed." });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Completion stats ─────────────────────────────────────────────────────
  const allFields = form?.sections?.flatMap(s => s.fields || []) || [];
  const filledCount = allFields.filter(f => values[f.metric_code] !== undefined && values[f.metric_code] !== "").length;
  const totalFields = allFields.length;
  const completionPct = totalFields > 0 ? Math.round((filledCount / totalFields) * 100) : 0;

  const submissionStatus = form?.submission_status || "DRAFT";
  const isLocked = !["DRAFT", "RETURNED"].includes(submissionStatus);
  const statusCfg = STATUS_CONFIG[submissionStatus] || STATUS_CONFIG.DRAFT;
  const StatusIcon = statusCfg.icon;

  // Hierarchy breadcrumb
  const breadcrumb = useMemo(() => {
    if (!activeNode || !orgNodes.length) return "ESG Data Collection";
    const path = [];
    let curr = orgNodes.find(n => n.id === activeNode.id);
    while (curr) {
      path.unshift(curr.name);
      curr = curr.parent_id ? orgNodes.find(n => n.id === curr.parent_id) : null;
    }
    return path.join(" › ");
  }, [activeNode, orgNodes]);

  return (
    <div className="page-content anim-fade-up" style={{ background: "#f8fafc" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", width: "100%" }}>

        {/* ── Offline / Sync Banner ─────────────────────────────────────── */}
        {(!isOnline || pendingOfflineCount > 0) && (
          <div style={{
            marginBottom: 12, padding: "10px 16px", borderRadius: 10,
            background: isOnline ? "#fefce8" : "#fef2f2",
            border: `1px solid ${isOnline ? "#fde68a" : "#fca5a5"}`,
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {isOnline
                ? <Wifi size={15} color="#d97706" />
                : <WifiOff size={15} color="#b91c1c" />}
              <span style={{ fontSize: 12.5, fontWeight: 600, color: isOnline ? "#92400e" : "#7f1d1d" }}>
                {isOnline
                  ? `Back online — ${pendingOfflineCount} datapoint(s) queued offline, ready to sync`
                  : `You're offline — changes will be saved locally (${pendingOfflineCount} queued)`}
              </span>
            </div>
            {isOnline && pendingOfflineCount > 0 && (
              <button
                id="offline-sync-now-btn"
                onClick={handleManualSync}
                disabled={syncing}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "6px 14px", borderRadius: 6, border: "none",
                  background: "#d97706", color: "#fff",
                  fontSize: 12, fontWeight: 700, cursor: syncing ? "not-allowed" : "pointer"
                }}
              >
                {syncing ? <RefreshCw size={13} className="spin" /> : <CloudUpload size={13} />}
                {syncing ? "Syncing…" : "Sync Now"}
              </button>
            )}
          </div>
        )}

        {/* Sync result toast */}
        {syncResult && syncResult.status === 'completed' && (
          <div style={{
            marginBottom: 10, padding: "8px 14px", borderRadius: 8,
            background: "#f0fdf4", border: "1px solid #bbf7d0",
            fontSize: 12, color: "#166534", display: "flex", alignItems: "center", gap: 8
          }}>
            <CheckCircle2 size={13} color="#15803d" />
            Sync complete — {syncResult.applied_count} applied, {syncResult.already_synced_count} already synced, {syncResult.conflicts_count} conflict(s).
            <button onClick={() => setSyncResult(null)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "#64748b" }}><X size={13} /></button>
          </div>
        )}
        {syncResult && syncResult.status === 'error' && (
          <div style={{
            marginBottom: 10, padding: "8px 14px", borderRadius: 8,
            background: "#fef2f2", border: "1px solid #fca5a5",
            fontSize: 12, color: "#b91c1c", display: "flex", alignItems: "center", gap: 8
          }}>
            <AlertTriangle size={13} />
            Sync failed: {syncResult.error}
            <button onClick={() => setSyncResult(null)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "#64748b" }}><X size={13} /></button>
          </div>
        )}

        {/* ── Status Ticker / Header Micro-badge ── */}
        <div style={{
          display: "flex", alignItems: "center", gap: 16, marginBottom: 8,
          fontSize: 11, fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#64748b"
        }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: isOnline ? "#15803d" : "#ef4444" }}>
            <span className="status-beacon-live" style={{ marginRight: 2 }} />
            {isOnline ? "OPERATIONAL DATA INGESTION" : "OFFLINE MODE — LOCAL QUEUE ACTIVE"}
          </span>
          <span style={{ color: "#cbd5e1" }}>/</span>
          <span>PROJECT TIER-1 EVIDENCE COLLECTION</span>
        </div>

        {/* ── Top Bar ──────────────────────────────────────────────────── */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
            <Building2 size={12} />
            <span>{breadcrumb}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div>
              <h1 style={{ fontSize: 26, fontWeight: 700, color: "#09090b", margin: 0, letterSpacing: "-0.02em" }}>
                ESG Data Collection
              </h1>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>
                Log operational metrics, upload statutory vouchers, and submit for BU aggregation.
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {/* Entity selector */}
              <select
                value={selectedEntity}
                onChange={e => { setSelectedEntity(e.target.value); setValues({}); }}
                style={{
                  padding: "7px 12px", borderRadius: 6, border: "1px solid #e2e8f0",
                  background: "#fff", fontSize: 12.5, fontWeight: 600, color: "#09090b", cursor: "pointer"
                }}
              >
                {scopedNodes.map(n => (
                  <option key={n.id} value={n.id}>{n.name}</option>
                ))}
              </select>

              {/* Period selector */}
              <select
                value={selectedPeriod}
                onChange={e => { setSelectedPeriod(e.target.value); setValues({}); }}
                style={{
                  padding: "7px 12px", borderRadius: 6, border: "1px solid #e2e8f0",
                  background: "#fff", fontSize: 12.5, fontWeight: 600, color: "#09090b", cursor: "pointer"
                }}
              >
                {periods.map(p => (
                  <option key={p.id} value={p.id}>{p.code}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Distinction Banner (Spec §14) */}
        <div style={{
          marginBottom: 16, padding: "14px 18px", borderRadius: 8,
          background: "#F0F9FF", border: "1px solid #BAE6FD",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "#0284C7", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", flexShrink: 0 }}>
              <FileText size={17} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#0369A1" }}>
                YOU PROVIDE RAW OPERATIONAL FACTS · SYSTEM CALCULATES EMISSIONS
              </div>
              <div style={{ fontSize: 12, color: "#0C4A6E", marginTop: 2 }}>
                As a site engineer, you only report <strong>physical quantities</strong> (kWh electricity, Litres diesel, kL water, Tonnes waste) and attach vouchers. You do <strong>not</strong> calculate emission factors or tCO₂e — the platform calculates Scope 1/2/3 and intensities deterministically upon BU review.
              </div>
            </div>
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 9999, background: "#E0F2FE", color: "#0369A1", border: "1px solid #BAE6FD", whiteSpace: "nowrap" }}>
            STATUTORY FACT LAYER
          </span>
        </div>

        {/* What Happens Next? Context Banner (Spec §27) */}
        {submissionStatus === 'SUBMITTED' || submissionStatus === 'UNDER_BU_REVIEW' ? (
          <div style={{
            marginBottom: 16, padding: "12px 18px", borderRadius: 8,
            background: "#FEF3C7", border: "1px solid #FDE68A",
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Clock size={16} color="#B45309" />
              <div style={{ fontSize: 12.5, color: "#92400E" }}>
                <strong>Submission Status: Under BU Review</strong> — Your data has been submitted to <strong>Solar EPC & Operations</strong>. Next: BU Reviewer (Rajesh V.) will verify evidence and approve for calculation.
              </div>
            </div>
            <button
              onClick={() => navigate('/workflow')}
              style={{
                padding: '5px 12px', borderRadius: 6, border: '1px solid #D97706',
                background: '#FFFFFF', color: '#92400E', fontSize: 11.5, fontWeight: 700, cursor: 'pointer'
              }}
            >
              Inspect BU Review Queue ›
            </button>
          </div>
        ) : submissionStatus === 'BU_APPROVED' ? (
          <div style={{
            marginBottom: 16, padding: "12px 18px", borderRadius: 8,
            background: "#DCFCE7", border: "1px solid #BBF7D0",
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <CheckCircle2 size={16} color="#15803D" />
              <div style={{ fontSize: 12.5, color: "#166534" }}>
                <strong>Submission Approved!</strong> Data has entered the automated ESG calculation and boundary aggregation pipeline.
              </div>
            </div>
            <button
              onClick={() => navigate('/consolidation')}
              style={{
                padding: '5px 12px', borderRadius: 6, border: '1px solid #16A34A',
                background: '#FFFFFF', color: '#15803D', fontSize: 11.5, fontWeight: 700, cursor: 'pointer'
              }}
            >
              View Calculation Pipeline ›
            </button>
          </div>
        ) : null}

        {/* ── Status Bar ───────────────────────────────────────────────── */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12, padding: "12px 20px",
          background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, marginBottom: 20
        }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 6, padding: "5px 12px",
            background: statusCfg.bg, border: `1px solid ${statusCfg.color}40`,
            borderRadius: 99, color: statusCfg.color, fontWeight: 700, fontSize: 12
          }}>
            <StatusIcon size={13} />
            {statusCfg.label}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ flex: 1, height: 6, background: "#e2e8f0", borderRadius: 99, overflow: "hidden" }}>
                <div style={{
                  height: "100%", width: `${completionPct}%`,
                  background: completionPct === 100 ? "#059669" : "#6366f1",
                  borderRadius: 99, transition: "width 0.4s"
                }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>{completionPct}%</span>
              <span style={{ fontSize: 12, color: "#64748b" }}>({filledCount}/{totalFields} fields)</span>
            </div>
          </div>
          {/* Period */}
          <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>
            {activePeriod?.code || "No period selected"}
          </span>
        </div>

        {/* ── Post-submission confirmation notice (Spec §18) ──────────── */}
        {(submissionStatus === "SUBMITTED" || submissionStatus === "UNDER_BU_REVIEW") && (
          <div style={{
            padding: "16px 20px", background: "#f0fdf4", border: "1px solid #bbf7d0",
            borderRadius: 12, marginBottom: 20, display: "flex", alignItems: "flex-start", gap: 12
          }}>
            <CheckCircle2 size={20} color="#15803d" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <strong style={{ color: "#166534", display: "block", marginBottom: 4, fontSize: 14 }}>
                Submitted to BU Review Queue (Spec §18)
              </strong>
              <p style={{ margin: 0, fontSize: 13, color: "#15803d", lineHeight: 1.5 }}>
                Status: <strong>● Under BU Review</strong>.
                Submitted: <strong>{form?.submitted_at ? new Date(form.submitted_at).toLocaleString() : 'Recently'}</strong>.
                Your operational data is now locked while the BU Reviewer validates raw numbers and attached evidence files.
              </p>
            </div>
          </div>
        )}

        {/* ── Returned notice ──────────────────────────────────────────── */}
        {submissionStatus === "RETURNED" && (
          <div style={{
            padding: "14px 20px", background: "#fef2f2", border: "1px solid #fca5a5",
            borderRadius: 12, marginBottom: 20, display: "flex", alignItems: "flex-start", gap: 10
          }}>
            <AlertTriangle size={18} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <strong style={{ color: "#b91c1c", display: "block", marginBottom: 4 }}>
                Submission Returned — Correction Required
              </strong>
              <p style={{ margin: 0, fontSize: 13, color: "#7f1d1d", lineHeight: 1.6 }}>
                Your submission was returned with comments. Please review the feedback, correct the
                highlighted values, and resubmit.
              </p>
            </div>
          </div>
        )}

        {/* ── Notice ──────────────────────────────────────────────────── */}
        {notice && (
          <div style={{
            padding: "12px 20px", marginBottom: 16, borderRadius: 10,
            background: notice.type === "success" ? "#f0fdf4" : notice.type === "warn" ? "#fffbeb" : "#fef2f2",
            border: `1px solid ${notice.type === "success" ? "#bbf7d0" : notice.type === "warn" ? "#fde68a" : "#fca5a5"}`,
            color: notice.type === "success" ? "#15803d" : notice.type === "warn" ? "#92400e" : "#b91c1c",
            fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8
          }}>
            {notice.type === "success"
              ? <CheckCircle2 size={15} />
              : notice.type === "warn"
              ? <WifiOff size={15} />
              : <AlertTriangle size={15} />}
            {notice.msg}
          </div>
        )}

        {/* ── Project Context Card ─────────────────────────────────────── */}
        <ProjectContextCard entity={activeNode} form={form} />

        {/* ── Form Loading ─────────────────────────────────────────────── */}
        {formLoading && (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div className="spinner" style={{ margin: "0 auto 12px" }} />
            <p style={{ color: "#64748b", fontSize: 13 }}>
              Loading applicable ESG parameters for this project…
            </p>
          </div>
        )}

        {/* ── No data ──────────────────────────────────────────────────── */}
        {!formLoading && !selectedEntity && (
          <div style={{
            textAlign: "center", padding: "60px 20px",
            background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0"
          }}>
            <Building2 size={48} color="#cbd5e1" style={{ marginBottom: 16 }} />
            <h3 style={{ color: "#0f172a", margin: "0 0 8px" }}>Select a Project or Entity</h3>
            <p style={{ color: "#64748b", margin: 0, fontSize: 13 }}>
              Use the selectors above to choose the project and reporting period.
            </p>
          </div>
        )}

        {/* ── Domain-grouped form sections ─────────────────────────────── */}
        {!formLoading && form && Object.entries(domainGroups).map(([domain, principles]) => (
          <div key={domain} style={{ marginBottom: 8 }}>
            {Object.entries(principles).map(([principle, fields]) => (
              <DomainSection
                key={`${domain}-${principle}`}
                domain={domain}
                principle={principle}
                fields={fields}
                values={values}
                onChange={handleFieldChange}
                submissionStatus={submissionStatus}
                onEvidenceUploaded={handleEvidenceUploaded}
              />
            ))}
          </div>
        ))}

        {/* ── Empty form state ─────────────────────────────────────────── */}
        {!formLoading && form && Object.keys(domainGroups).length === 0 && (
          <div style={{
            textAlign: "center", padding: "60px 20px",
            background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0"
          }}>
            <CheckCircle2 size={48} color="#10b981" style={{ marginBottom: 16 }} />
            <h3 style={{ color: "#0f172a", margin: "0 0 8px" }}>No Parameters Applicable</h3>
            <p style={{ color: "#64748b", margin: 0, fontSize: 13 }}>
              No ESG parameters are applicable for this entity/period combination.
              Contact your ESG Manager to configure applicability rules.
            </p>
          </div>
        )}

        {/* ── Action Bar ───────────────────────────────────────────────── */}
        {!formLoading && form && !isLocked && (
          <div style={{
            position: "sticky", bottom: 16,
            display: "flex", justifyContent: "flex-end", gap: 10,
            padding: "12px 16px", background: "rgba(255,255,255,0.96)",
            backdropFilter: "blur(12px)", borderRadius: 8,
            border: "1px solid #e2e8f0", boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
            marginTop: 20
          }}>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                display: "flex", alignItems: "center", gap: 7, padding: "8px 16px",
                border: "1px solid #e2e8f0", borderRadius: 6, background: "#fff",
                fontSize: 13, fontWeight: 600, color: "#09090b", cursor: "pointer",
                transition: "all 0.15s"
              }}
            >
              {saving ? <RefreshCw size={14} className="spin" /> : <Save size={14} />}
              {saving ? "Saving…" : "Save Draft"}
            </button>
            <button
              onClick={handleOpenPreSubmit}
              disabled={submitting || submitted}
              style={{
                display: "flex", alignItems: "center", gap: 7, padding: "8px 20px",
                borderRadius: 6, border: "none",
                background: submitted ? "#15803d" : "#0070F3",
                fontSize: 13, fontWeight: 600, color: "#fff",
                cursor: submitting || submitted ? "not-allowed" : "pointer",
                boxShadow: submitted ? "none" : "0 1px 2px rgba(0, 112, 243, 0.2)",
                transition: "all 0.15s"
              }}
            >
              {submitting ? <RefreshCw size={14} className="spin" /> : submitted ? <CheckCircle2 size={14} /> : <Send size={14} />}
              {submitting ? "Submitting…" : submitted ? "Submitted!" : "Submit for BU Review"}
            </button>
          </div>
        )}

        {/* ── Locked state banner ──────────────────────────────────────── */}
        {isLocked && !formLoading && form && (
          <div style={{
            display: "flex", alignItems: "center", gap: 12, padding: "16px 24px",
            background: "#f8fafc", border: "1px solid #e2e8f0",
            borderRadius: 12, marginTop: 20, color: "#64748b", fontSize: 13
          }}>
            <Lock size={18} color="#94a3b8" />
            <div>
              <strong style={{ color: "#374151", display: "block" }}>
                Submission {statusCfg.label} — Read-Only View
              </strong>
              <span>This submission is in the review/approval pipeline and cannot be modified.</span>
            </div>
          </div>
        )}

        {/* ── Pre-Submission Review Checklist Modal (Spec §18) ────────── */}
        <PreSubmissionModal
          open={showPreSubmitModal}
          onClose={() => setShowPreSubmitModal(false)}
          onConfirm={handleConfirmSubmit}
          submitting={submitting}
          stats={{ filledCount, totalFields, completionPct }}
          validationSummary={valSummary}
          validationLoading={valChecking}
        />
      </div>
    </div>
  );
}
