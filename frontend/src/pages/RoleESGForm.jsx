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

const ENERGY_BUCKET_IDS = ['ei1_ren_elec', 'ei1_ren_fuel', 'ei1_ren_other', 'ei1_nonren_elec', 'ei1_nonren_fuel', 'ei1_nonren_other'];
const DAILY_EVIDENCE_FIELD_ID = 'daily_activity_evidence';
// GJ per raw unit and tCO2e per raw unit, aligned with the Indian factor catalogue in calc/factors.py.
const FUEL_FACTORS = {
  ei1_diesel_litres: { gj: 0.03576, co2: 0.00268 },
  ei1_petrol_litres: { gj: 0.03276, co2: 0.00231 },
  ei1_lpg_kg: { gj: 0.04731, co2: 0.00298 },
  ei1_cng_kg: { gj: 0.048, co2: 0.00221 },
  ei1_png_scm: { gj: 0.0385, co2: 0.00203 },
  ei1_furnace_oil_litres: { gj: 0.04037, co2: 0.00318 },
  ei1_coal_anthracite_mt: { gj: 28, co2: 2.62 },
  ei1_coal_bituminous_mt: { gj: 20.5, co2: 2.35 },
  ei1_coal_grade_a_mt: { gj: 24, co2: 2.12 },
  ei1_coal_grade_e_mt: { gj: 14.5, co2: 1.66 },
  ei1_coal_grade_f_mt: { gj: 12.5, co2: 1.48 },
  ei1_lignite_mt: { gj: 11.5, co2: 1.55 },
};
const roundEnergy = (value) => Math.round(value * 10000) / 10000;
const calculateEnergy = (valueOf) => {
  const rawIds = ['ei1_grid_electricity_kwh', 'ei1_renewable_grid_kwh', 'ei1_captive_renewable_kwh', ...Object.keys(FUEL_FACTORS), 'ei1_renewable_fuel_gj', 'ei1_renewable_other_gj', 'ei1_nonrenewable_other_gj'];
  const hasRawInputs = rawIds.some((id) => valueOf(id) !== null && valueOf(id) !== undefined && valueOf(id) !== '');
  if (!hasRawInputs) return { fromRawInputs: false, buckets: ENERGY_BUCKET_IDS.map(() => null), ren: null, nonren: null, grand: null, scope1Estimate: null, scope2Estimate: null, renewableExceedsGrid: false };

  const gridKwh = Number(valueOf('ei1_grid_electricity_kwh') || 0);
  const renewableGridKwh = Number(valueOf('ei1_renewable_grid_kwh') || 0);
  const captiveRenewableKwh = Number(valueOf('ei1_captive_renewable_kwh') || 0);
  const fuelGJ = Object.entries(FUEL_FACTORS).reduce((sum, [id, factor]) => sum + Number(valueOf(id) || 0) * factor.gj, 0);
  const fuelEmissions = Object.entries(FUEL_FACTORS).reduce((sum, [id, factor]) => sum + Number(valueOf(id) || 0) * factor.co2, 0);
  const hasFuelInputs = Object.keys(FUEL_FACTORS).some((id) => valueOf(id) !== null && valueOf(id) !== undefined && valueOf(id) !== '');
  const a = roundEnergy((renewableGridKwh + captiveRenewableKwh) * 0.0036);
  const b = Number(valueOf('ei1_renewable_fuel_gj') || 0);
  const c = Number(valueOf('ei1_renewable_other_gj') || 0);
  const d = roundEnergy(Math.max(0, gridKwh - renewableGridKwh) * 0.0036);
  const e = roundEnergy(fuelGJ);
  const f = Number(valueOf('ei1_nonrenewable_other_gj') || 0);
  const ren = sumOptional([a, b, c]);
  const nonren = sumOptional([d, e, f]);
  return {
    fromRawInputs: true,
    buckets: [a, b, c, d, e, f].map(roundEnergy),
    ren, nonren, grand: sumOptional([ren, nonren]),
    scope1Estimate: hasFuelInputs ? roundEnergy(fuelEmissions) : null,
    scope2Estimate: valueOf('ei1_grid_electricity_kwh') !== null && valueOf('ei1_grid_electricity_kwh') !== undefined && valueOf('ei1_grid_electricity_kwh') !== '' ? roundEnergy(gridKwh / 1000 * 0.716) : null,
    renewableExceedsGrid: renewableGridKwh > gridKwh,
  };
};
const calculateWaterTotals = (valueOf) => ({
  withdrawal: sumOptional(['ei3_surface', 'ei3_groundwater', 'ei3_third_party', 'ei3_seawater', 'ei3_others'].map(valueOf)),
  discharge: sumOptional(['surface', 'ground', 'sea', 'third', 'other'].flatMap((destination) => ['no', 'primary', 'secondary', 'tertiary'].map((level) => valueOf(`li2_${destination}_${level}`)))),
});
const calculateWasteTotals = (valueOf) => ({
  generated: sumOptional(['ei8_plastic', 'ei8_ewaste', 'ei8_biomedical', 'ei8_cd', 'ei8_battery', 'ei8_radioactive', 'ei8_other_haz', 'ei8_other_nonhaz'].map(valueOf)),
  recovered: sumOptional(['ei8_recycled', 'ei8_reused', 'ei8_other_recovery'].map(valueOf)),
  disposed: sumOptional(['ei8_incineration', 'ei8_landfilling', 'ei8_other_disposal'].map(valueOf)),
});
const localDateKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
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
  const [dailyEntries, setDailyEntries] = useState([]);
  const [entryMode, setEntryMode] = useState('daily');
  const [dailyDate, setDailyDate] = useState(localDateKey);
  const [dailyPeriodKey, setDailyPeriodKey] = useState('current');
  const [lastDailyEntryId, setLastDailyEntryId] = useState(null);
  const [dailyValues, setDailyValues] = useState({});
  const [dailyEvidenceFiles, setDailyEvidenceFiles] = useState([]);
  const [dailySaving, setDailySaving] = useState(false);

  // Evidence state: { [fieldId]: { [fyKey]: [{evidence_id, file_name, ...}] } }
  const [fieldEvidence, setFieldEvidence] = useState({});
  // Per-field upload in-progress flags
  const [uploadingField, setUploadingField] = useState({});
  const fileInputRefs = useRef({});
  const dailyEvidenceInputRef = useRef(null);

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
      setEntryMode(eRes.data.entry_mode || 'daily');
      setStatusObj(eRes.data.status || { status: 'draft', reason: null });
      if (sRes.data.role === 'project_supervisor') {
        try {
          const dailyRes = await p6FormsApi.getDailyEntries();
          setDailyEntries(dailyRes.data.daily_entries || []);
        } catch {
          setDailyEntries([]);
        }
      }

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

  const isReadOnly = !['draft', 'rejected'].includes(statusObj?.status || 'draft');

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

  const EvidencePanel = ({ fieldId, fyKey, allowWhenLocked = false }) => {
    const records = fieldEvidence[fieldId]?.[fyKey] || [];
    const uploading = uploadingField[`${fieldId}__${fyKey}`];
    const refKey = `${fieldId}__${fyKey}`;
    const canEditEvidence = allowWhenLocked || !isReadOnly;
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
              {canEditEvidence && (
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
          {canEditEvidence && (
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
      const rawResult = calculateEnergy((id) => valOf(id, fyKey));
      if (rawResult.fromRawInputs) return rawResult;
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
        grand: sumOptional([ren, nonren]), buckets: [a, b, c, d, e, f], ...rawResult,
      };
    };
    return {
      energy: { current: calcEnergy('current'), previous: calcEnergy('previous') },
      water: { current: calculateWaterTotals((id) => valOf(id, 'current')), previous: calculateWaterTotals((id) => valOf(id, 'previous')) },
      waste: { current: calculateWasteTotals((id) => valOf(id, 'current')), previous: calculateWasteTotals((id) => valOf(id, 'previous')) },
    };
  }, [entries]);

  const dailyPreview = useMemo(() => {
    const valueOf = (id) => dailyValues[id] ?? null;
    const energy = calculateEnergy(valueOf);
    const waterTotals = calculateWaterTotals(valueOf);
    const wasteTotals = calculateWasteTotals(valueOf);
    return { energy, water: waterTotals.withdrawal, discharge: waterTotals.discharge, ...wasteTotals };
  }, [dailyValues]);

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
    if (schema?.role === 'project_supervisor' && ['current', 'previous'].some((fyKey) => liveTotals.energy[fyKey].renewableExceedsGrid)) {
      setErrorMsg('Renewable electricity included in the grid total cannot exceed total grid electricity.');
      return;
    }
    const vErr = validateBeforeSave();
    if (vErr) {
      setErrorMsg(vErr);
      return;
    }
    setSaving(true);
    setErrorMsg('');
    setToast('');
    try {
      const payloadEntries = { ...entries };
      if (schema?.role === 'project_supervisor') {
        for (const fyKey of ['current', 'previous']) {
          const buckets = liveTotals.energy[fyKey].buckets;
          if (buckets?.some((value) => value !== null && value !== undefined)) {
            ENERGY_BUCKET_IDS.forEach((id, index) => {
              payloadEntries[id] = { ...(payloadEntries[id] || { current: null, previous: null }), [fyKey]: buckets[index] };
            });
          }
        }
      }
      const payload = { node_id: schema.node.id, entries: payloadEntries, entry_mode: schema?.role === 'project_supervisor' ? entryMode : undefined };
      const res = submit ? await p6FormsApi.submit(payload) : await p6FormsApi.saveDraft(payload);
      setStatusObj({ status: res.data.status, reason: null });
      if (res.data.entry_mode) setEntryMode(res.data.entry_mode);
      setToast(submit ? 'Submitted for review.' : 'Draft saved to esgData.json.');
    } catch (err) {
      setErrorMsg(getFriendlyErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleStartRevision = async () => {
    if (!window.confirm('Start a new revision of this accepted report? Its current values and review history will remain available, and the revised report must be reviewed again.')) return;
    setSaving(true);
    setErrorMsg('');
    setToast('');
    try {
      const res = await p6FormsApi.reopen();
      setStatusObj({ status: res.data.status, reason: null });
      setToast('Revision opened. You can now edit the report and attach evidence before submitting it again.');
    } catch (err) {
      setErrorMsg(getFriendlyErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDailyEntry = async () => {
    const values = Object.fromEntries(Object.entries(dailyValues).filter(([, value]) => value !== '' && value !== null && value !== undefined));
    if (!Object.keys(values).length) {
      setErrorMsg('Enter at least one activity quantity for this date.');
      return;
    }
    if (dailyPreview.energy.renewableExceedsGrid) {
      setErrorMsg('Renewable electricity included in the grid total cannot exceed total grid electricity for this date.');
      return;
    }
    setDailySaving(true);
    setErrorMsg('');
    setToast('');
    try {
      const res = await p6FormsApi.addDailyEntry({ date: dailyDate, period_key: dailyPeriodKey, values });
      setDailyEntries(res.data.daily_entries || []);
      setLastDailyEntryId(res.data.daily_entry?.id || null);
      setEntries(res.data.entries || {});
      setStatusObj({ status: res.data.status || 'draft', reason: null });
      setEntryMode('daily');
      setDailyValues({});
      const dailyEntryId = res.data.daily_entry?.id;
      const failedEvidence = [];
      if (dailyEntryId) {
        for (const file of dailyEvidenceFiles) {
          try {
            await p6FormsApi.uploadEvidence(schema.node.id, DAILY_EVIDENCE_FIELD_ID, dailyEntryId, file);
          } catch {
            failedEvidence.push(file);
          }
        }
      }
      setDailyEvidenceFiles([]);
      if (dailyEvidenceInputRef.current) dailyEvidenceInputRef.current.value = '';
      setToast(`Daily activity for ${dailyDate} saved to ${res.data.daily_entry?.period || 'the selected reporting period'}.${dailyEvidenceFiles.length - failedEvidence.length ? ` ${dailyEvidenceFiles.length - failedEvidence.length} evidence file(s) attached.` : ''} Project totals have been recalculated.`);
      if (failedEvidence.length) {
        setErrorMsg(`${failedEvidence.length} evidence file(s) could not be attached. Use the evidence button on the saved date below to retry.`);
      }
      try {
        const evidenceRes = await p6FormsApi.getNodeEvidence(schema.node.id);
        setFieldEvidence(evidenceRes.data.evidence || {});
      } catch { /* Daily data is saved even if evidence metadata refresh fails. */ }
    } catch (err) {
      setErrorMsg(getFriendlyErrorMessage(err));
    } finally {
      setDailySaving(false);
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

  const dailySections = (schema.sections || []).map((section) => ({
    ...section,
    dailyFields: (section.fields || []).filter((field) => field.type === 'number' && field.aggregation === 'SUM' && !field.calculated),
  })).filter((section) => section.dailyFields.length > 0);
  const fieldLabels = Object.fromEntries((schema.fields || []).map((field) => [field.id, field.label]));
  const calculatedFieldIds = new Set((schema.fields || []).filter((field) => field.calculated).map((field) => field.id));

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
          {statusObj?.status === 'accepted' && (
            <button
              type="button"
              disabled={saving}
              onClick={handleStartRevision}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 7,
                border: '1px solid #2563EB', background: '#FFFFFF', color: '#1D4ED8', fontWeight: 700, fontSize: 13,
                cursor: saving ? 'wait' : 'pointer',
              }}
            >
              <Save size={14} /> {saving ? 'Opening…' : 'Start a revision'}
            </button>
          )}
        </div>
      </div>

      {schema.role === 'project_supervisor' && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', padding: '12px 16px', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: 9 }}>
          <div>
            <strong style={{ color: '#0F172A', fontSize: 14 }}>How would you like to enter this report?</strong>
            <div style={{ marginTop: 3, color: '#64748B', fontSize: 12 }}>{entryMode === 'daily' ? 'Enter quantities in the dated form above. The sections below show annual results and other disclosures.' : 'Enter each fiscal year directly in the annual form below. The daily form is hidden in this mode.'}</div>
          </div>
          <div role="group" aria-label="Data entry mode" style={{ display: 'flex', gap: 6, padding: 4, background: '#F1F5F9', borderRadius: 8 }}>
            {[['daily', 'Daily entries'], ['annual', 'Annual totals']].map(([mode, label]) => (
              <button key={mode} type="button" onClick={() => setEntryMode(mode)} style={{ border: '1px solid', borderColor: entryMode === mode ? '#2563EB' : 'transparent', borderRadius: 6, padding: '8px 12px', background: entryMode === mode ? '#FFFFFF' : 'transparent', color: entryMode === mode ? '#1D4ED8' : '#475569', fontWeight: 700, fontSize: 12, cursor: 'pointer', boxShadow: entryMode === mode ? '0 1px 2px rgba(15,23,42,.1)' : 'none' }}>{label}</button>
            ))}
          </div>
        </div>
      )}

      {schema.role === 'project_supervisor' && entryMode === 'daily' && (
        <section style={{ background: '#FFFFFF', border: '1px solid #93C5FD', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '16px 18px', background: '#EFF6FF', borderBottom: '1px solid #BFDBFE' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#1D4ED8', letterSpacing: '.07em', textTransform: 'uppercase' }}>Daily site activity</div>
                <h2 style={{ margin: '4px 0', fontSize: 18, color: '#0F172A' }}>Record today’s quantities and bills</h2>
                <div style={{ fontSize: 12, color: '#475569' }}>Enter the quantities, attach this day’s bill below, then save once. The bill will be linked to this dated record automatically.</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: '#334155' }}>
                  Activity date
                  <input type="date" value={dailyDate} onChange={(e) => setDailyDate(e.target.value)} style={{ padding: '8px 10px', border: '1px solid #CBD5E1', borderRadius: 7, background: '#FFFFFF' }} />
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: '#334155' }}>
                  Reporting period
                  <select value={dailyPeriodKey} onChange={(e) => setDailyPeriodKey(e.target.value)} style={{ padding: '8px 10px', border: '1px solid #CBD5E1', borderRadius: 7, background: '#FFFFFF' }}>
                    <option value="current">Current FY ({schema.fy?.current || 'current'})</option>
                    <option value="previous">Previous FY ({schema.fy?.previous || 'previous'})</option>
                  </select>
                </label>
              </div>
            </div>
          </div>
          <div style={{ padding: 16, display: 'grid', gap: 10 }}>
            {dailySections.map((section, sectionIndex) => (
              <details key={section.id} open={section.id === 'ei1_energy'} style={{ border: '1px solid #E2E8F0', borderRadius: 8, overflow: 'hidden' }}>
                <summary style={{ cursor: 'pointer', padding: '10px 12px', background: '#F8FAFC', color: '#0F172A', fontSize: 13, fontWeight: 700 }}>
                  {section.title} <span style={{ fontSize: 11, color: '#64748B', fontWeight: 500 }}>· {section.dailyFields.length} daily inputs</span>
                </summary>
                <div style={{ padding: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10 }}>
                  {section.dailyFields.map((field) => (
                    <label key={field.id} style={{ display: 'grid', gridTemplateColumns: '1fr 110px', alignItems: 'center', gap: 10, padding: 9, border: '1px solid #E2E8F0', borderRadius: 7 }}>
                      <span style={{ fontSize: 12, color: '#334155', lineHeight: 1.4 }}>{field.label}<small style={{ display: 'block', marginTop: 3, color: '#64748B' }}>{field.unit}</small></span>
                      <input type="number" min="0" step="any" value={dailyValues[field.id] ?? ''} onChange={(e) => setDailyValues((prev) => ({ ...prev, [field.id]: e.target.value }))} placeholder="" style={{ width: '100%', boxSizing: 'border-box', padding: '8px', border: '1px solid #CBD5E1', borderRadius: 6, textAlign: 'right' }} />
                    </label>
                  ))}
                </div>
              </details>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', padding: '12px 14px', border: '1px dashed #93C5FD', borderRadius: 8, background: '#F8FBFF' }}>
              <div>
                <strong style={{ display: 'block', color: '#1E3A8A', fontSize: 12 }}>Evidence for {dailyDate || 'this date'}</strong>
                <span style={{ color: '#64748B', fontSize: 11 }}>Choose one or more bills or statements. They attach to this date when saved.</span>
              </div>
              <input
                ref={dailyEvidenceInputRef}
                type="file"
                multiple
                accept=".pdf,.xlsx,.xls,.csv,.png,.jpg,.jpeg,.txt"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const chosen = Array.from(e.target.files || []);
                  if (chosen.length) setDailyEvidenceFiles((existing) => [...existing, ...chosen]);
                  e.target.value = '';
                }}
              />
              <button type="button" onClick={() => dailyEvidenceInputRef.current?.click()} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', border: '1px solid #93C5FD', borderRadius: 7, background: '#FFFFFF', color: '#1D4ED8', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                <Paperclip size={14} /> {dailyEvidenceFiles.length ? 'Add more evidence' : 'Attach bill / evidence'}
              </button>
              {dailyEvidenceFiles.length > 0 && (
                <div style={{ flexBasis: '100%', display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                  {dailyEvidenceFiles.map((file, index) => (
                    <span key={`${file.name}-${file.size}-${index}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 8px', borderRadius: 5, background: '#EFF6FF', color: '#1E40AF', fontSize: 11 }}>
                      <Paperclip size={10} /> {file.name}
                      <button type="button" aria-label={`Remove ${file.name}`} onClick={() => setDailyEvidenceFiles((existing) => existing.filter((_, fileIndex) => fileIndex !== index))} style={{ border: 0, background: 'transparent', color: '#64748B', cursor: 'pointer', padding: 0, lineHeight: 1 }}><X size={12} /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div style={{ padding: '12px 14px', borderRadius: 8, background: '#F0FDF4', border: '1px solid #A7F3D0' }}>
              <strong style={{ display: 'block', color: '#166534', fontSize: 12, marginBottom: 8 }}>Calculated preview for this entry</strong>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: 8, color: '#166534', fontSize: 12 }}>
                {[
                  ['Renewable energy', dailyPreview.energy.fromRawInputs ? dailyPreview.energy.ren : null, 'GJ'],
                  ['Non-renewable energy', dailyPreview.energy.fromRawInputs ? dailyPreview.energy.nonren : null, 'GJ'],
                  ['Total energy', dailyPreview.energy.fromRawInputs ? dailyPreview.energy.grand : null, 'GJ'],
                  ['Scope 1 emissions', dailyPreview.energy.scope1Estimate, 'tCO₂e'],
                  ['Scope 2 emissions', dailyPreview.energy.scope2Estimate, 'tCO₂e'],
                  ['Water withdrawal', dailyPreview.water, 'kL'],
                  ['Water discharged', dailyPreview.discharge, 'kL'],
                  ['Waste generated', dailyPreview.generated, 'MT'],
                  ['Waste recovered', dailyPreview.recovered, 'MT'],
                  ['Waste disposed', dailyPreview.disposed, 'MT'],
                ].map(([label, value, unit]) => (
                  <div key={label}><span style={{ color: '#475569' }}>{label}: </span><strong>{value === null ? '—' : `${formatIndian(value)} ${unit}`}</strong></div>
                ))}
              </div>
              {dailyPreview.energy.renewableExceedsGrid && <div style={{ marginTop: 8, color: '#B91C1C', fontSize: 12, fontWeight: 700 }}>Renewable grid electricity cannot exceed total grid electricity.</div>}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" disabled={dailySaving} onClick={handleSaveDailyEntry} style={{ border: 0, borderRadius: 7, padding: '10px 16px', background: dailySaving ? '#94A3B8' : '#2563EB', color: '#FFFFFF', fontSize: 13, fontWeight: 700, cursor: dailySaving ? 'wait' : 'pointer' }}>
                {dailySaving ? 'Saving daily record…' : 'Save daily record'}
              </button>
            </div>
          </div>
          <div style={{ borderTop: '1px solid #E2E8F0', padding: 16 }}>
            <details open={Boolean(lastDailyEntryId) && dailyEntries.some((entry) => entry.id === lastDailyEntryId)}>
              <summary style={{ cursor: 'pointer', color: '#334155', fontSize: 13, fontWeight: 700 }}>Saved daily records ({dailyEntries.length})</summary>
              <div style={{ display: 'grid', gap: 10, maxHeight: 440, overflowY: 'auto', marginTop: 12 }}>
                {dailyEntries.length === 0 ? <div style={{ color: '#64748B', fontSize: 12 }}>No daily records yet.</div> : dailyEntries.map((entry) => (
                  <div key={entry.id} style={{ border: '1px solid #E2E8F0', borderRadius: 8, padding: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
                      <strong style={{ color: '#0F172A', fontSize: 13 }}>{entry.date} <span style={{ color: '#64748B', fontSize: 11, fontWeight: 500 }}>· {entry.period || (entry.period_key === 'previous' ? fyPrev : fyCur)}</span></strong>
                      <span style={{ color: '#64748B', fontSize: 11 }}>{entry.created_by_name || 'Project supervisor'}</span>
                    </div>
                    <div style={{ marginBottom: 8, padding: '7px 9px', borderRadius: 6, background: '#F8FAFC' }}>
                      <span style={{ display: 'block', color: '#475569', fontSize: 11, fontWeight: 700, marginBottom: 3 }}>Bills and evidence for this date</span>
                      <EvidencePanel fieldId={DAILY_EVIDENCE_FIELD_ID} fyKey={entry.id} allowWhenLocked />
                    </div>
                    <div style={{ display: 'grid', gap: 7 }}>
                      {Object.entries(entry.values || {}).map(([fieldId, value]) => (
                        <div key={fieldId} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'center', borderTop: '1px solid #F1F5F9', paddingTop: 6 }}>
                          <span style={{ fontSize: 11, color: '#475569' }}>{fieldLabels[fieldId] || fieldId}: <strong style={{ color: '#0F172A' }}>{formatIndian(value)}</strong></span>
                          {!calculatedFieldIds.has(fieldId) && <EvidencePanel fieldId={fieldId} fyKey={entry.id} allowWhenLocked />}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </details>
          </div>
        </section>
      )}

      {schema.role === 'project_supervisor' && entryMode === 'annual' && (
        <div style={{ padding: '13px 16px', borderRadius: 9, background: '#F0FDF4', border: '1px solid #A7F3D0', color: '#166534', fontSize: 12, lineHeight: 1.55 }}>
          Enter annual source quantities in the Current FY and Previous FY columns below. Electricity, fuel, coal, Scope 1 and Scope 2 totals are calculated from those inputs. Attach bills or statements beside each annual input.
        </div>
      )}

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
        const scalarFields = sec.fields.filter((f) => f.type !== 'table-rows' && (!f.calculated || f.id === 'ei6_scope1' || f.id === 'ei6_scope2') && !(schema.role === 'project_supervisor' && entryMode === 'daily' && f.type === 'number' && f.aggregation === 'SUM'));
        const hasDailyRollup = schema.role === 'project_supervisor' && entryMode === 'daily' && sec.fields.some((f) => f.type === 'number' && f.aggregation === 'SUM');

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
                {hasDailyRollup && <span style={{ padding: '2px 7px', borderRadius: 5, background: '#ECFDF5', color: '#047857', fontSize: 10, fontWeight: 700 }}>{entryMode === 'daily' ? 'Annual roll-up' : 'Annual entry'}</span>}
              </div>
              {isOpen ? <ChevronDown size={18} color="#64748B" /> : <ChevronRight size={18} color="#64748B" />}
            </button>

            {isOpen && (
              <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                {(scalarFields.length > 0 || hasDailyRollup) && (
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
                        const energyBucketIndex = ENERGY_BUCKET_IDS.indexOf(f.id);
                        const cur = energyBucketIndex >= 0 && liveTotals.energy.current.fromRawInputs
                          ? liveTotals.energy.current.buckets[energyBucketIndex]
                          : f.id === 'ei6_scope1' && liveTotals.energy.current.fromRawInputs
                            ? liveTotals.energy.current.scope1Estimate ?? ''
                            : f.id === 'ei6_scope2' && liveTotals.energy.current.fromRawInputs
                              ? liveTotals.energy.current.scope2Estimate ?? ''
                              : entries[f.id]?.current ?? '';
                        const prev = energyBucketIndex >= 0 && liveTotals.energy.previous.fromRawInputs
                          ? liveTotals.energy.previous.buckets[energyBucketIndex]
                          : f.id === 'ei6_scope1' && liveTotals.energy.previous.fromRawInputs
                            ? liveTotals.energy.previous.scope1Estimate ?? ''
                            : f.id === 'ei6_scope2' && liveTotals.energy.previous.fromRawInputs
                              ? liveTotals.energy.previous.scope2Estimate ?? ''
                              : entries[f.id]?.previous ?? '';
                        const isQuantityField = schema.role === 'project_supervisor' && f.type === 'number' && f.aggregation === 'SUM';
                        const lockedByDailyMode = isQuantityField && entryMode === 'daily';
                        return (
                          <tr key={f.id}>
                            <td style={{ padding: '10px 12px', borderBottom: '1px solid #E2E8F0', color: '#0F172A' }}>
                              {f.label}
                              {isQuantityField && <small style={{ display: 'block', marginTop: 3, color: '#64748B' }}>{f.calculated ? 'Calculated from source quantities' : entryMode === 'daily' ? 'Calculated from daily records above' : 'Annual quantity entry'}</small>}
                            </td>
                            <td style={{ padding: '10px 12px', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: 12 }}>{f.unit || '—'}</td>
                            {['current', 'previous'].map((fyKey) => {
                              const val = fyKey === 'current' ? cur : prev;
                              return (
                                <td key={fyKey} style={{ padding: '8px 12px', borderBottom: '1px solid #E2E8F0', textAlign: 'right' }}>
                                  {f.type === 'yesno' ? (
                                    <select
                                      disabled={isReadOnly || lockedByDailyMode || f.calculated}
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
                                      disabled={isReadOnly || lockedByDailyMode || f.calculated}
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
                                      disabled={isReadOnly || lockedByDailyMode || f.calculated}
                                      value={val === null ? '' : val}
                                      placeholder="not reported"
                                      onChange={(e) => setFieldValue(f.id, fyKey, e.target.value === '' ? null : e.target.value)}
                                      style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13, textAlign: 'right', fontFamily: 'ui-monospace, monospace' }}
                                    />
                                  )}
                                  {(!isQuantityField || (entryMode === 'annual' && !f.calculated)) && <EvidencePanel fieldId={f.id} fyKey={fyKey} />}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}

                      {/* Auto-calculated read-only totals */}
                      {sec.id === 'ei1_energy' && schema.role === 'project_supervisor' && (
                        <>
                          <tr>
                            <td colSpan={4} style={{ padding: '12px', background: '#F0FDF4', borderBottom: '1px solid #BBF7D0', color: '#166534', fontSize: 12, lineHeight: 1.55 }}>
                              Enter source quantities above. Electricity is converted at 0.0036 GJ/kWh; renewable grid electricity must be backed by a verified PPA or green tariff. Captive renewable electricity is added separately. Fuel and coal quantities are converted using the listed Indian calorific values. The derived A–F totals below are what gets submitted.
                              {liveTotals.energy.current.renewableExceedsGrid && <strong style={{ display: 'block', color: '#B91C1C', marginTop: 5 }}>Renewable grid electricity exceeds the grid total. Correct these quantities before saving.</strong>}
                            </td>
                          </tr>
                          {renderCalculatedRow('Estimated direct fuel combustion emissions (preview)', 'tCO₂e', liveTotals.energy.current.scope1Estimate, liveTotals.energy.previous.scope1Estimate)}
                        </>
                      )}
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

