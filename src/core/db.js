/* IndexedDB storage: CRUD + debounced autosave */
(function (SL) {
  'use strict';

  const DB_NAME = 'strata-dia';
  const LEGACY_DB_NAME = 'strata-lotpack'; // name used before the app was renamed STRATA Dia
  const DB_VERSION = 1;
  const STORES = ['jobs', 'meta'];
  let dbPromise = null;

  // Opens the database written by the app before it was renamed, without creating it when absent
  function openLegacy() {
    return new Promise((resolve) => {
      let req;
      try { req = indexedDB.open(LEGACY_DB_NAME); } catch (e) { resolve(null); return; }
      req.onupgradeneeded = () => req.transaction.abort(); // did not exist: leave nothing behind
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    });
  }

  // First start under the new name: copy jobs, settings and contacts from the old database.
  // The old database is left untouched (nothing is deleted).
  async function copyLegacy(db) {
    const old = await openLegacy();
    if (!old) return 0;
    let copied = 0;
    try {
      for (const name of STORES) {
        if (!old.objectStoreNames.contains(name)) continue;
        const rows = await new Promise((resolve, reject) => {
          const r = old.transaction(name, 'readonly').objectStore(name).getAll();
          r.onsuccess = () => resolve(r.result || []);
          r.onerror = () => reject(r.error);
        });
        if (!rows.length) continue;
        await new Promise((resolve, reject) => {
          const t = db.transaction(name, 'readwrite');
          rows.forEach((row) => t.objectStore(name).put(row));
          t.oncomplete = resolve;
          t.onerror = () => reject(t.error);
        });
        if (name === 'jobs') copied = rows.length;
      }
    } finally {
      old.close();
    }
    return copied;
  }

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      if (!window.indexedDB) { reject(new Error('IndexedDB is not available in this browser.')); return; }
      let created = false;
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = req.result;
        created = e.oldVersion === 0;
        STORES.forEach((name) => { if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: name === 'jobs' ? 'id' : 'key' }); });
      };
      req.onsuccess = () => {
        const db = req.result;
        if (!created) { resolve(db); return; }
        copyLegacy(db)
          .then((n) => { if (n) console.info(`Copied ${n} job(s) from the previous app name.`); })
          .catch((e) => console.warn('Previous data not copied:', e && e.message))
          .then(() => resolve(db));
      };
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(new Error('Database blocked by another open tab.'));
    });
    return dbPromise;
  }

  function tx(store, mode, fn) {
    return open().then((db) => new Promise((resolve, reject) => {
      const t = db.transaction(store, mode);
      const s = t.objectStore(store);
      let result;
      const r = fn(s);
      if (r) r.onsuccess = () => { result = r.result; };
      t.oncomplete = () => resolve(result);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error || new Error('Transaction aborted'));
    }));
  }

  // Reads first write any pending autosave, so a screen never shows stale data
  const getAllJobs = () => flush().then(() => tx('jobs', 'readonly', (s) => s.getAll()))
    .then((jobs) => (jobs || []).map(SL.schema.migrateJob));
  const getJob = (id) => flush().then(() => tx('jobs', 'readonly', (s) => s.get(id)))
    .then((j) => (j ? SL.schema.migrateJob(j) : null));
  const putJob = (job) => tx('jobs', 'readwrite', (s) => s.put(job));
  const deleteJob = (id) => tx('jobs', 'readwrite', (s) => s.delete(id));
  const getMeta = (key) => tx('meta', 'readonly', (s) => s.get(key)).then((r) => (r ? r.value : undefined));
  const putMeta = (key, value) => tx('meta', 'readwrite', (s) => s.put({ key, value }));

  // ---- Autosave -------------------------------------------------------
  const pending = new Map(); // id -> job
  let timer = null;
  const listeners = new Set();
  const emit = (state) => listeners.forEach((fn) => fn(state));

  function flush() {
    clearTimeout(timer); timer = null;
    if (!pending.size) return Promise.resolve();
    const jobs = Array.from(pending.values());
    pending.clear();
    return Promise.all(jobs.map(putJob))
      .then(() => emit('saved'))
      .catch((e) => { console.error(e); emit('error'); });
  }

  // Mark a job changed; written to IndexedDB after a short pause
  function touch(job, shift) {
    const t = SL.schema.nowIso();
    job.updatedAt = t;
    if (shift) shift.updatedAt = t;
    pending.set(job.id, job);
    emit('saving');
    clearTimeout(timer);
    timer = setTimeout(flush, 250);
  }

  // Settings / contacts: written at once, shown in the save indicator
  function saveMeta(key, value) {
    emit('saving');
    return putMeta(key, value)
      .then(() => emit('saved'))
      .catch((e) => { console.error(e); emit('error'); });
  }

  // Do not lose the last keystrokes when the tab is hidden or closed
  document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });
  window.addEventListener('pagehide', flush);

  SL.db = {
    open, getAllJobs, getJob, putJob, deleteJob, getMeta, putMeta, saveMeta,
    touch, flush, onSaveState: (fn) => listeners.add(fn),
  };
})(window.SL = window.SL || {});
