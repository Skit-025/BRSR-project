import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown, ChevronRight, Lock, Plus, Trash2, Save, Send,
  CheckCircle2, AlertCircle, Clock, FileText, Paperclip, X
} from 'lucide-react';
import { p6FormsApi, getFriendlyErrorMessage } from '../api/client';

const formatIndian = (val) => {
  if (val === null || val === undefined || val === '') return 'not reported';
  const n = Number(val);
  if (Number.isNaN(n)) return String(val);
  return n.toLocaleString('en-IN', { maximumFractionDigits: 4 });
};

const sumOptional = (vals) => {
  const present = vals.filter((v) => v !== null && v !== undefined && v !== '' && !Number.isNaN(Number(v)));
  if (present.length === 0) return null;
  return Math.round(present.reduce((acc, v) => acc + Number(v), 0) * 10000) / 10000;
};

const STATUS_BADGES = {
  draft: { label: 'Draft', bg: '#F1F5F9', color: '#475569', border: '#CBD5E1', icon: FileText },
  submitted: { label: 'Submitted (Read-Only)', bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE', icon: Clock },
  rejected: { label: 'Rejected', bg: '#FEF2F2', color: '#B91C1C', border: '#FECACA', icon: AlertCircle },
  accepted: { label: 'Accepted', bg: '#ECFDF5', color: '#047857', border: '#A7F3D0', icon: CheckCircle2 },
};

export default function RoleESGForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [schema, setSchema] = useState(null);
  const [entries, setEntries] = useState({});
  const [statusObj, setStatusObj] = useState({ status: 'draft', reason: null });
  const [descendantBlocks, setDescendantBlocks] = useState([]);
  const [openSections, setOpenSections] = useState({});
  const [errorMsg, setErrorMsg] = useState('');
  const [toast, setToast] = useState('');

  // Evidence state: { [fieldId]: { [fyKey]: [{evidence_id, file_name, ...}] } }
  const [fieldEvidence, setFieldEvidence] = useState({});
  // Per-field upload in-progress flags
  const [uploadingField, setUploadingField] = useState({});
  const fileInputRefs = useRef({});

  const loadAll = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [sRes, eRes] = await Promise.all([
        p6FormsApi.getSchema(),
        p6FormsApi.getEntries(),
      ]);
      setSchema(sRes.data);
      setEntries(eRes.data.entries || {});
      setStatusObj(eRes.data.status || { status: 'draft', reason: null });

      const initOpen = {};
      (sRes.data.sections || []).forEach((sec, idx) => {
        initOpen[sec.id] = idx === 0;
      });
      setOpenSections(initOpen);

      if (sRes.data.role !== 'project_supervisor') {
        try {
          const dRes = await p6FormsApi.getDescendants();
          const filtered = (dRes.data.blocks || []).filter(
            (b) => !(b.node?.id === sRes.data.node?.id && b.ownerRole === sRes.data.role)
          );
          setDescendantBlocks(filtered);
        } catch {
          setDescendantBlocks([]);
        }
      } else {
        setDescendantBlocks([]);
      }

      // Load all evidence for this node
      try {
        const evRes = await p6FormsApi.getNodeEvidence(sRes.data.node?.id);
        // evRes.data.evidence is { [field_id]: { [fy_key]: [...records] } }
        setFieldEvidence(evRes.data.evidence || {});
      } catch {
        setFieldEvidence({});
      }
    } catch (err) {
      setErrorMsg(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const isReadOnly = statusObj?.status === 'submitted';

  // ── Evidence helpers ──────────────────────────────────────────────────────
  const handleEvidenceUpload = async (fieldId, fyKey, file) => {
    if (!file || !schema?.node?.id) return;
    const key = `${fieldId}__${fyKey}`;
    setUploadingField((prev) => ({ ...prev, [key]: true }));
    try {
      const res = await p6FormsApi.uploadEvidence(schema.node.id, fieldId, fyKey, file);
      const record = res.data;
      setFieldEvidence((prev) => {
        const updated = { ...prev };
        if (!updated[fieldId]) updated[fieldId] = {};
        if (!updated[fieldId][fyKey]) updated[fieldId][fyKey] = [];
        updated[fieldId][fyKey] = [...updated[fieldId][fyKey], record];
        return updated;
      });
      setToast(`✅ Evidence "${file.name}" attached to ${fieldId}.`);
    } catch (err) {
      setErrorMsg(`Evidence upload failed: ${getFriendlyErrorMessage(err)}`);
    } finally {
      setUploadingField((prev) => ({ ...prev, [key]: false }));
      // Reset file input
      if (fileInputRefs.current[`${fieldId}__${fyKey}`]) {
        fileInputRefs.current[`${fieldId}__${fyKey}`].value = '';
      }
    }
  };

  const removeLocalEvidence = async (fieldId, fyKey, evidenceId) => {
    try {
      await p6FormsApi.removeEvidence(schema.node.id, fieldId, fyKey, evidenceId);
      setFieldEvidence((prev) => {
        const updated = { ...prev };
        if (updated[fieldId]?.[fyKey]) {
          updated[fieldId][fyKey] = updated[fieldId][fyKey].filter((r) => r.evidence_id !== evidenceId);
        }
        return updated;
      });
    } catch (err) {
      setErrorMsg(`Could not detach evidence: ${getFriendlyErrorMessage(err)}`);
    }
  };

  const EvidencePanel = ({ fieldId, fyKey }) => {
    const records = fieldEvidence[fieldId]?.[fyKey] || [];
    const uploading = uploadingField[`${fieldId}__${fyKey}`];
    const refKey = `${fieldId}__${fyKey}`;
    return (
      <div style={{ marginTop: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {records.map((r) => (
            <div
              key={r.evidence_id}
              title={r.file_name}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '3px 8px', borderRadius: 5, background: '#ECFDF5',
                border: '1px solid #A7F3D0', fontSize: 11, color: '#047857', maxWidth: 200,
              }}
            >
              <Paperclip size={10} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>
                {r.file_name}
              </span>
              {r.evidence_display_id && <span title={`SHA-256: ${r.sha256 || 'stored in vault'}`} style={{ fontSize: 9, color: '#065F46', whiteSpace: 'nowrap' }}>{r.evidence_display_id}</span>}
              {!isReadOnly && (
                <button
                  type="button"
                  onClick={() => removeLocalEvidence(fieldId, fyKey, r.evidence_id)}
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#6B7280', padding: 0 }}
                  title="Detach from form (vault copy remains stored)"
                >
                  <X size={10} />
                </button>
              )}
            </div>
          ))}
          {!isReadOnly && (
            <>
              <input
                type="file"
                accept=".pdf,.xlsx,.xls,.csv,.png,.jpg,.jpeg,.txt"
                style={{ display: 'none' }}
                ref={(el) => { fileInputRefs.current[refKey] = el; }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleEvidenceUpload(fieldId, fyKey, f);
                }}
              />
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileInputRefs.current[refKey]?.click()}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '3px 9px', borderRadius: 5,
                  border: '1px solid #CBD5E1', background: '#F8FAFC',
                  color: '#475569', fontSize: 11, fontWeight: 600, cursor: uploading ? 'wait' : 'pointer',
                }}
              >
                <Paperclip size={10} />
                {uploading ? 'Uploading…' : 'Attach Evidence'}
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  const setFieldValue = (fieldId, fyKey, val) => {
    if (isReadOnly) return;
    setEntries((prev) => ({
      ...prev,
      [fieldId]: {
        ...(prev[fieldId] || { current: null, previous: null }),
        [fyKey]: val === '' ? null : val,
      },
    }));
  };

  const addTableRow = (field, fyKey) => {
    if (isReadOnly) return;
    const emptyRow = {};
    (field.columns || []).forEach((col) => {
      emptyRow[col.key] = col.type === 'yesno' ? 'No' : '';
    });
    const curArr = Array.isArray(entries[field.id]?.[fyKey]) ? entries[field.id][fyKey] : [];
    setFieldValue(field.id, fyKey, [...curArr, emptyRow]);
  };

  const updateTableRow = (fieldId, fyKey, rowIdx, colKey, val) => {
    if (isReadOnly) return;
    const curArr = Array.isArray(entries[fieldId]?.[fyKey]) ? [...entries[fieldId][fyKey]] : [];
    curArr[rowIdx] = { ...(curArr[rowIdx] || {}), [colKey]: val };
    setFieldValue(fieldId, fyKey, curArr);
  };

  const removeTableRow = (fieldId, fyKey, rowIdx) => {
    if (isReadOnly) return;
    const curArr = Array.isArray(entries[fieldId]?.[fyKey]) ? [...entries[fieldId][fyKey]] : [];
    curArr.splice(rowIdx, 1);
    setFieldValue(fieldId, fyKey, curArr);
  };

  const liveTotals = useMemo(() => {
    const valOf = (fid, fyKey) => entries[fid]?.[fyKey] ?? null;
    const calcEnergy = (fyKey) => {
      const a = valOf('ei1_ren_elec', fyKey);
      const b = valOf('ei1_ren_fuel', fyKey);
      const c = valOf('ei1_ren_other', fyKey);
      const d = valOf('ei1_nonren_elec', fyKey);
      const e = valOf('ei1_nonren_fuel', fyKey);
      const f = valOf('ei1_nonren_other', fyKey);
      const ren = sumOptional([a, b, c]);
      const nonren = sumOptional([d, e, f]);
      return {
        ren,
        nonren,
        elec: sumOptional([a, d]),
        fuel: sumOptional([b, e]),
        other: sumOptional([c, f]),
        grand: sumOptional([ren, nonren]),
      };
    };
    const calcWater = (fyKey) => {
      const w = sumOptional([
        valOf('ei3_surface', fyKey),
        valOf('ei3_groundwater', fyKey),
        valOf('ei3_third_party', fyKey),
        valOf('ei3_seawater', fyKey),
        valOf('ei3_others', fyKey),
      ]);
      const dests = ['surface', 'ground', 'sea', 'third', 'other'];
      const levels = ['no', 'primary', 'secondary', 'tertiary'];
      const disch = sumOptional(dests.flatMap((p) => levels.map((lv) => valOf(`li2_${p}_${lv}`, fyKey))));
      return { withdrawal: w, discharge: disch };
    };
    const calcWaste = (fyKey) => ({
      generated: sumOptional([
        valOf('ei8_plastic', fyKey), valOf('ei8_ewaste', fyKey), valOf('ei8_biomedical', fyKey),
        valOf('ei8_cd', fyKey), valOf('ei8_battery', fyKey), valOf('ei8_radioactive', fyKey),
        valOf('ei8_other_haz', fyKey), valOf('ei8_other_nonhaz', fyKey),
      ]),
      recovered: sumOptional([valOf('ei8_recycled', fyKey), valOf('ei8_reused', fyKey), valOf('ei8_other_recovery', fyKey)]),
      disposed: sumOptional([valOf('ei8_incineration', fyKey), valOf('ei8_landfilling', fyKey), valOf('ei8_other_disposal', fyKey)]),
    });
    return {
      energy: { current: calcEnergy('current'), previous: calcEnergy('previous') },
      water: { current: calcWater('current'), previous: calcWater('previous') },
      waste: { current: calcWaste('current'), previous: calcWaste('previous') },
    };
  }, [entries]);

  const validateBeforeSave = () => {
    for (const f of schema?.fields || []) {
      if (f.type === 'number' || f.type === 'percent') {
        for (const fyKey of ['current', 'previous']) {
          const v = entries[f.id]?.[fyKey];
          if (v !== null && v !== undefined && v !== '') {
            const n = Number(v);
            if (Number.isNaN(n) || n < 0) {
              return `${f.label} (${fyKey}) must be a number >= 0.`;
            }
            if (f.type === 'percent' && n > 100) {
              return `${f.label} (${fyKey}) cannot exceed 100%.`;
            }
          }
        }
      }
    }
    return null;
  };

  const handleSave = async (submit = false) => {
    const vErr = validateBeforeSave();
    if (vErr) {
      setErrorMsg(vErr);
      return;
    }
    setSaving(true);
    setErrorMsg('');
    setToast('');
    try {
      const payload = { node_id: schema.node.id, entries };
      const res = submit ? await p6FormsApi.submit(payload) : await p6FormsApi.saveDraft(payload);
      setStatusObj({ status: res.data.status, reason: null });
      setToast(submit ? 'Submitted for review.' : 'Draft saved to esgData.json.');
    } catch (err) {
      setErrorMsg(getFriendlyErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 32, color: '#64748B', fontSize: 14 }}>Loading role ESG form…</div>;
  }

  if (!schema) {
    return (
      <div style={{ padding: 32 }}>
        <div style={{ padding: 16, borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C' }}>
          {errorMsg || 'No form schema available for your role.'}
        </div>
      </div>
    );
  }

  const stMeta = STATUS_BADGES[statusObj?.status || 'draft'] || STATUS_BADGES.draft;
  const StatusIcon = stMeta.icon;
  const fyCur = schema.fy?.current || '2024-25';
  const fyPrev = schema.fy?.previous || '2023-24';

  const renderCalculatedRow = (label, unit, curVal, prevVal) => (
    <tr key={label} style={{ background: '#F8FAFC', fontWeight: 600 }}>
      <td style={{ padding: '10px 12px', borderBottom: '1px solid #E2E8F0', color: '#0F172A' }}>
        <span>{label}</span>
        <span style={{
          marginLeft: 8, fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
          background: '#E0F2FE', color: '#0369A1', textTransform: 'uppercase', letterSpacing: '0.04em',
        }}>
          calculated
        </span>
      </td>
      <td style={{ padding: '10px 12px', borderBottom: '1px solid #E2E8F0', color: '#475569', fontSize: 12 }}>{unit}</td>
      <td style={{ padding: '10px 12px', borderBottom: '1px solid #E2E8F0', textAlign: 'right', fontFamily: 'ui-monospace, monospace' }}>
        {formatIndian(curVal)}
      </td>
      <td style={{ padding: '10px 12px', borderBottom: '1px solid #E2E8F0', textAlign: 'right', fontFamily: 'ui-monospace, monospace' }}>
        {formatIndian(prevVal)}
      </td>
    </tr>
  );

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Header + Auto Context */}
      <div style={{
        background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, padding: '18px 22px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            BRSR Annexure I · Principle 6 · {schema.role.replace(/_/g, ' ')}
          </div>
          <h1 style={{ margin: '4px 0 6px 0', fontSize: 22, fontWeight: 800, color: '#0F172A' }}>
            {schema.form_title}
          </h1>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 12.5, color: '#475569' }}>
            <span><strong>Node:</strong> {schema.node?.name}</span>
            <span><strong>Type:</strong> {schema.node?.type}</span>
            <span><strong>FY:</strong> {fyCur} (vs {fyPrev})</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 9999,
            background: stMeta.bg, color: stMeta.color, border: `1px solid ${stMeta.border}`, fontSize: 12, fontWeight: 700,
          }}>
            <StatusIcon size={14} />
            <span>{stMeta.label}</span>
          </div>

          {!isReadOnly && (
            <>
              <button
                type="button"
                disabled={saving}
                onClick={() => handleSave(false)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 7,
                  border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#0F172A', fontWeight: 600, fontSize: 13, cursor: 'pointer',
                }}
              >
                <Save size={14} /> Save Draft
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => handleSave(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 7,
                  border: 'none', background: '#2563EB', color: '#FFFFFF', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                }}
              >
                <Send size={14} /> Submit
              </button>
            </>
          )}
        </div>
      </div>

      {statusObj?.status === 'rejected' && statusObj?.reason && (
        <div style={{ padding: '12px 16px', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', fontSize: 13 }}>
          <strong>Rejection Reason:</strong> {statusObj.reason}
        </div>
      )}
      {errorMsg && (
        <div style={{ padding: '12px 16px', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', fontSize: 13 }}>
          {errorMsg}
        </div>
      )}
      {toast && (
        <div style={{ padding: '12px 16px', borderRadius: 8, background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#047857', fontSize: 13, fontWeight: 600 }}>
          {toast}
        </div>
      )}

      {/* Accordion Sections */}
      {(schema.sections || []).map((sec) => {
        const isOpen = !!openSections[sec.id];
        const tableRowFields = sec.fields.filter((f) => f.type === 'table-rows');
        const scalarFields = sec.fields.filter((f) => f.type !== 'table-rows');

        return (
          <div key={sec.id} style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, overflow: 'hidden' }}>
            <button
              type="button"
              onClick={() => setOpenSections((p) => ({ ...p, [sec.id]: !p[sec.id] }))}
              style={{
                width: '100%', padding: '14px 18px', background: '#F8FAFC', border: 'none',
                borderBottom: isOpen ? '1px solid #E2E8F0' : 'none',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 5, background: '#DBEAFE', color: '#1D4ED8' }}>
                  {sec.indicator}
                </span>
                <span style={{ fontSize: 14.5, fontWeight: 700, color: '#0F172A' }}>{sec.title}</span>
              </div>
              {isOpen ? <ChevronDown size={18} color="#64748B" /> : <ChevronRight size={18} color="#64748B" />}
            </button>

            {isOpen && (
              <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                {scalarFields.length > 0 && (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#F1F5F9', color: '#334155', textAlign: 'left' }}>
                        <th style={{ padding: '10px 12px', borderBottom: '1px solid #E2E8F0' }}>Parameter</th>
                        <th style={{ padding: '10px 12px', borderBottom: '1px solid #E2E8F0', width: 90 }}>Unit</th>
                        <th style={{ padding: '10px 12px', borderBottom: '1px solid #E2E8F0', width: 200, textAlign: 'right' }}>Current FY ({fyCur})</th>
                        <th style={{ padding: '10px 12px', borderBottom: '1px solid #E2E8F0', width: 200, textAlign: 'right' }}>Previous FY ({fyPrev})</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scalarFields.map((f) => {
                        const cur = entries[f.id]?.current ?? '';
                        const prev = entries[f.id]?.previous ?? '';
                        return (
                          <tr key={f.id}>
                            <td style={{ padding: '10px 12px', borderBottom: '1px solid #E2E8F0', color: '#0F172A' }}>{f.label}</td>
                            <td style={{ padding: '10px 12px', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: 12 }}>{f.unit || '—'}</td>
                            {['current', 'previous'].map((fyKey) => {
                              const val = fyKey === 'current' ? cur : prev;
                              return (
                                <td key={fyKey} style={{ padding: '8px 12px', borderBottom: '1px solid #E2E8F0', textAlign: 'right' }}>
                                  {f.type === 'yesno' ? (
                                    <select
                                      disabled={isReadOnly}
                                      value={val === null ? '' : String(val)}
                                      onChange={(e) => setFieldValue(f.id, fyKey, e.target.value)}
                                      style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13 }}
                                    >
                                      <option value="">not reported</option>
                                      <option value="Yes">Yes</option>
                                      <option value="No">No</option>
                                    </select>
                                  ) : f.type === 'text' ? (
                                    <input
                                      type="text"
                                      disabled={isReadOnly}
                                      value={val === null ? '' : String(val)}
                                      placeholder="not reported"
                                      onChange={(e) => setFieldValue(f.id, fyKey, e.target.value)}
                                      style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13 }}
                                    />
                                  ) : (
                                    <input
                                      type="number"
                                      min="0"
                                      step="any"
                                      disabled={isReadOnly}
                                      value={val === null ? '' : val}
                                      placeholder="not reported"
                                      onChange={(e) => setFieldValue(f.id, fyKey, e.target.value === '' ? null : Number(e.target.value))}
                                      style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13, textAlign: 'right', fontFamily: 'ui-monospace, monospace' }}
                                    />
                                  )}
                                  <EvidencePanel fieldId={f.id} fyKey={fyKey} />
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}

                      {/* Auto-calculated read-only totals */}
                      {sec.id === 'ei1_energy' && (
                        <>
                          {renderCalculatedRow('Total renewable energy (A+B+C)', 'GJ', liveTotals.energy.current.ren, liveTotals.energy.previous.ren)}
                          {renderCalculatedRow('Total non-renewable energy (D+E+F)', 'GJ', liveTotals.energy.current.nonren, liveTotals.energy.previous.nonren)}
                          {renderCalculatedRow('Total electricity (A+D)', 'GJ', liveTotals.energy.current.elec, liveTotals.energy.previous.elec)}
                          {renderCalculatedRow('Total fuel (B+E)', 'GJ', liveTotals.energy.current.fuel, liveTotals.energy.previous.fuel)}
                          {renderCalculatedRow('Total other sources (C+F)', 'GJ', liveTotals.energy.current.other, liveTotals.energy.previous.other)}
                          {renderCalculatedRow('Grand Total Energy Consumption (A+B+C+D+E+F)', 'GJ', liveTotals.energy.current.grand, liveTotals.energy.previous.grand)}
                        </>
                      )}
                      {sec.id === 'ei3_water' &&
                        renderCalculatedRow('Total volume of water withdrawal (i+ii+iii+iv+v)', 'kL', liveTotals.water.current.withdrawal, liveTotals.water.previous.withdrawal)
                      }
                      {sec.id === 'li2_discharge' &&
                        renderCalculatedRow('Total water discharged (all 5 destinations)', 'kL', liveTotals.water.current.discharge, liveTotals.water.previous.discharge)
                      }
                      {sec.id === 'ei8_waste' && (
                        <>
                          {renderCalculatedRow('Total Waste Generated (A+B+C+D+E+F+G+H)', 'MT', liveTotals.waste.current.generated, liveTotals.waste.previous.generated)}
                          {renderCalculatedRow('Total Waste Recovered', 'MT', liveTotals.waste.current.recovered, liveTotals.waste.previous.recovered)}
                          {renderCalculatedRow('Total Waste Disposed', 'MT', liveTotals.waste.current.disposed, liveTotals.waste.previous.disposed)}
                        </>
                      )}
                    </tbody>
                  </table>
                )}

                {/* Row-adder tables */}
                {tableRowFields.map((f) => {
                  const rows = Array.isArray(entries[f.id]?.current) ? entries[f.id].current : [];
                  return (
                    <div key={f.id} style={{ border: '1px solid #E2E8F0', borderRadius: 8, padding: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{f.label}</div>
                        {!isReadOnly && (
                          <button
                            type="button"
                            onClick={() => addTableRow(f, 'current')}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 6,
                              border: '1px solid #BFDBFE', background: '#EFF6FF', color: '#1D4ED8', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                            }}
                          >
                            <Plus size={13} /> Add Row
                          </button>
                        )}
                      </div>
                      {rows.length === 0 ? (
                        <div style={{ fontSize: 12.5, color: '#94A3B8', fontStyle: 'italic' }}>not reported</div>
                      ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                          <thead>
                            <tr style={{ background: '#F8FAFC', textAlign: 'left' }}>
                              {(f.columns || []).map((c) => (
                                <th key={c.key} style={{ padding: '8px', borderBottom: '1px solid #E2E8F0' }}>{c.label}</th>
                              ))}
                              {!isReadOnly && <th style={{ width: 44, borderBottom: '1px solid #E2E8F0' }} />}
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((r, rIdx) => (
                              <tr key={rIdx}>
                                {(f.columns || []).map((c) => (
                                  <td key={c.key} style={{ padding: '6px 8px', borderBottom: '1px solid #E2E8F0' }}>
                                    {c.type === 'select' ? (
                                      <select
                                        disabled={isReadOnly}
                                        value={r[c.key] ?? ''}
                                        onChange={(e) => updateTableRow(f.id, 'current', rIdx, c.key, e.target.value)}
                                        style={{ width: '100%', padding: '5px 6px', borderRadius: 5, border: '1px solid #CBD5E1' }}
                                      >
                                        <option value="">Select…</option>
                                        {(c.options || []).map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                                      </select>
                                    ) : c.type === 'yesno' ? (
                                      <select
                                        disabled={isReadOnly}
                                        value={r[c.key] ?? 'No'}
                                        onChange={(e) => updateTableRow(f.id, 'current', rIdx, c.key, e.target.value)}
                                        style={{ width: '100%', padding: '5px 6px', borderRadius: 5, border: '1px solid #CBD5E1' }}
                                      >
                                        <option value="Yes">Yes</option>
                                        <option value="No">No</option>
                                      </select>
                                    ) : (
                                      <input
                                        type={c.type === 'number' ? 'number' : 'text'}
                                        min={c.type === 'number' ? '0' : undefined}
                                        step={c.type === 'number' ? 'any' : undefined}
                                        disabled={isReadOnly}
                                        value={r[c.key] ?? ''}
                                        onChange={(e) => updateTableRow(f.id, 'current', rIdx, c.key, c.type === 'number' && e.target.value !== '' ? Number(e.target.value) : e.target.value)}
                                        style={{ width: '100%', padding: '5px 6px', borderRadius: 5, border: '1px solid #CBD5E1' }}
                                      />
                                    )}
                                  </td>
                                ))}
                                {!isReadOnly && (
                                  <td style={{ padding: '6px', borderBottom: '1px solid #E2E8F0', textAlign: 'center' }}>
                                    <button
                                      type="button"
                                      onClick={() => removeTableRow(f.id, 'current', rIdx)}
                                      style={{ border: 'none', background: 'transparent', color: '#DC2626', cursor: 'pointer' }}
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                      <EvidencePanel fieldId={f.id} fyKey="current" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Read-only descendant blocks for reviewers */}
      {descendantBlocks.length > 0 && (
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Lock size={15} color="#475569" />
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0F172A' }}>
              Descendant Submissions (Read-Only)
            </h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {descendantBlocks.map((b, i) => (
              <div key={`${b.node?.id}-${b.ownerRole}-${i}`} style={{ border: '1px solid #E2E8F0', borderRadius: 8, padding: '12px 14px', background: '#F8FAFC' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#0F172A' }}>
                    {b.node?.name} · {b.formTitle} ({b.ownerRole})
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                    {b.status?.status || 'draft'}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: '#475569' }}>
                  {Object.keys(b.entries || {}).length} fields recorded
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

