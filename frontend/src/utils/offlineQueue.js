/**
 * offlineQueue.js
 * IndexedDB offline storage and synchronisation engine for remote site data collection.
 */

const DB_NAME = 'brsr_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'offline_mutations';

function openOfflineDB() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported in this browser environment'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'idempotency_key' });
        store.createIndex('submission_id', 'submission_id', { unique: false });
        store.createIndex('created_at', 'created_at', { unique: false });
      }
    };
    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
}

export async function saveOfflineItem({ submission_id, metric_code, value_numeric, value_text, unit, notes = '', version = 1 }) {
  const db = await openOfflineDB();
  const idempotency_key = `offline_${submission_id}_${metric_code}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const item = {
    idempotency_key,
    submission_id,
    metric_code,
    value_numeric: value_numeric !== undefined && value_numeric !== '' ? parseFloat(value_numeric) : null,
    value_text: value_text || null,
    unit: unit || '',
    notes,
    version,
    created_at: new Date().toISOString(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(item);
    req.onsuccess = () => resolve(item);
    req.onerror = () => reject(req.error);
  });
}

export async function getPendingItems(submission_id = null) {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => {
      let all = req.result || [];
      if (submission_id) {
        all = all.filter((i) => i.submission_id === submission_id);
      }
      resolve(all);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getPendingCount(submission_id = null) {
  try {
    const items = await getPendingItems(submission_id);
    return items.length;
  } catch {
    return 0;
  }
}

export async function removePendingItems(keys) {
  if (!keys || !keys.length) return;
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    keys.forEach((k) => store.delete(k));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function processOfflineSyncBatch(syncApiFn, submission_id = null) {
  const pending = await getPendingItems(submission_id);
  if (!pending.length) {
    return { status: 'empty', total_items: 0, applied_count: 0, conflicts_count: 0, already_synced_count: 0, results: [] };
  }

  // Group by submission_id if multiple
  const grouped = {};
  for (const item of pending) {
    if (!grouped[item.submission_id]) grouped[item.submission_id] = [];
    grouped[item.submission_id].push(item);
  }

  const allResults = [];
  let totalApplied = 0;
  let totalConflicts = 0;
  let totalAlreadySynced = 0;

  for (const subId of Object.keys(grouped)) {
    const batchItems = grouped[subId];
    const payload = {
      submission_id: subId,
      batch_id: `batch_${Date.now()}`,
      sync_timestamp: new Date().toISOString(),
      client_device: typeof navigator !== 'undefined' ? navigator.userAgent : 'PWA_Client',
      items: batchItems.map((b) => ({
        idempotency_key: b.idempotency_key,
        metric_code: b.metric_code,
        value_numeric: b.value_numeric,
        value_text: b.value_text,
        unit: b.unit,
        version: b.version,
        notes: b.notes,
      })),
    };

    const response = await syncApiFn(payload);
    const body = response?.data || response;

    // Collect keys to remove
    const keysToRemove = [];
    if (body.results && Array.isArray(body.results)) {
      body.results.forEach((res) => {
        if (res.status === 'applied' || res.status === 'already_synced') {
          keysToRemove.push(res.idempotency_key);
        }
      });
      allResults.push(...body.results);
    }
    totalApplied += body.applied_count || 0;
    totalConflicts += body.conflicts_count || 0;
    totalAlreadySynced += body.already_synced_count || 0;

    await removePendingItems(keysToRemove);
  }

  return {
    status: 'completed',
    total_items: pending.length,
    applied_count: totalApplied,
    conflicts_count: totalConflicts,
    already_synced_count: totalAlreadySynced,
    results: allResults,
  };
}
