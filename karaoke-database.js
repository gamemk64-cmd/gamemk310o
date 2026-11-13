/* Local karaoke library backed by IndexedDB. Stores synced lyrics and source metadata on-device. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.KaraokeDB = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const DB_NAME = 'music-player-karaoke-library';
  const DB_VERSION = 1;
  const STORE = 'entries';
  const memory = new Map();
  let dbPromise;

  const normalize = value => String(value || '').toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/ё/g, 'е')
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');
  const trackKey = track => {
    let titleRaw = String(track?.title || '').replace(/\[[^\]]*\]|\([^)]*(?:official|video|audio|lyrics|visualizer|4k|hd)[^)]*\)/gi, ' ').trim();
    let title = normalize(titleRaw);
    let artist = normalize(String(track?.artist || '').replace(/\s*[-|–—]\s*(Topic|VEVO)$/i, ''));
    const generic = /^(youtube|music|topic|vevo|official|unknown|unknown artist|неизвестный исполнитель)$/.test(artist);
    const parts = titleRaw.split(/\s[-–—|]\s/).filter(Boolean);
    if (generic && parts.length >= 2 && parts[0].length < 70) {
      artist = normalize(parts[0]);
      title = normalize(parts.slice(1).join(' - ').replace(/\b(official music video|official video|official audio|lyrics|visualizer|remastered|audio|video|4k|hd)\b/gi, ' '));
    }
    if (title && artist) return `meta:${artist}::${title}`;
    const yt = String(track?.yt || track?.youtubeId || track?.videoId || '');
    if (yt) return `yt:${yt}`;
    return `id:${String(track?.id ?? title ?? 'unknown')}`;
  };
  const precision = kind => kind === 'word' ? 3 : kind === 'lrc' ? 2 : 1;
  const makeId = (key, source, kind, raw) => [key, normalize(source || 'source'), kind || 'lrc', hash(raw || '')].join('|');
  function hash(value) {
    let h = 2166136261;
    for (const char of String(value)) { h ^= char.codePointAt(0); h = Math.imul(h, 16777619); }
    return (h >>> 0).toString(36);
  }
  function open() {
    if (dbPromise) return dbPromise;
    if (typeof indexedDB === 'undefined') return Promise.resolve(null);
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const database = request.result;
        const store = database.objectStoreNames.contains(STORE)
          ? request.transaction.objectStore(STORE)
          : database.createObjectStore(STORE, { keyPath: 'id' });
        if (!store.indexNames.contains('trackKey')) store.createIndex('trackKey', 'trackKey', { unique: false });
        if (!store.indexNames.contains('titleKey')) store.createIndex('titleKey', 'titleKey', { unique: false });
        if (!store.indexNames.contains('updatedAt')) store.createIndex('updatedAt', 'updatedAt', { unique: false });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('IndexedDB open failed'));
      request.onblocked = () => reject(new Error('IndexedDB is blocked by another tab'));
    }).catch(error => { dbPromise = null; throw error; });
    return dbPromise;
  }
  async function all() {
    const database = await open();
    if (!database) return [...memory.values()];
    return new Promise((resolve, reject) => {
      const request = database.transaction(STORE, 'readonly').objectStore(STORE).getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }
  async function save(track, result, options = {}) {
    if (!result?.lines?.length) return null;
    const key = trackKey(track);
    const source = String(result.source || options.source || 'local');
    const kind = result.kind || 'lrc';
    const raw = String(options.raw || '');
    const entry = {
      id: makeId(key, source, kind, raw || JSON.stringify(result.lines)),
      trackKey: key,
      trackId: String(track?.id ?? ''),
      videoId: String(track?.yt || track?.youtubeId || track?.videoId || ''),
      title: String(track?.title || 'Без названия'),
      artist: String(track?.artist || 'Неизвестный исполнитель'),
      album: String(track?.album || ''),
      duration: Number(track?.dur || track?.duration || 0),
      source, kind, precision: precision(kind),
      message: String(result.message || ''),
      manual: !!options.manual,
      raw,
      lines: result.lines.map(line => ({
        t: Number(line.t), text: String(line.text || ''), wordSynced: !!line.wordSynced,
        words: Array.isArray(line.words) ? line.words.map(word => ({ text: String(word.text || ''), t: Number(word.t), end: Number.isFinite(Number(word.end)) ? Number(word.end) : null })) : []
      })),
      titleKey: normalize(track?.title),
      updatedAt: Date.now(), usedAt: Date.now()
    };
    const database = await open();
    if (!database) { memory.set(entry.id, entry); return entry; }
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE, 'readwrite');
      transaction.objectStore(STORE).put(entry);
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    });
    return entry;
  }
  async function find(track) {
    const key = trackKey(track);
    const rows = (await all()).filter(row => row.trackKey === key || (track?.yt && row.videoId === String(track.yt)));
    rows.sort((a, b) => b.precision - a.precision || b.updatedAt - a.updatedAt);
    return rows[0] || null;
  }
  async function search(query = '') {
    const q = normalize(query);
    const rows = await all();
    return rows.filter(row => !q || [row.titleKey, normalize(row.artist), normalize(row.album), normalize(row.source)].some(value => value.includes(q)))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }
  async function remove(id) {
    const database = await open();
    if (!database) return memory.delete(id);
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE, 'readwrite');
      transaction.objectStore(STORE).delete(id);
      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => reject(transaction.error);
    });
  }
  async function count() { return (await all()).length; }
  async function exportAll() {
    return { schema: 'music-player-karaoke-library', version: 1, exportedAt: new Date().toISOString(), entries: await all() };
  }
  async function importAll(payload) {
    const entries = Array.isArray(payload) ? payload : payload?.entries;
    if (!Array.isArray(entries)) throw new Error('Файл не похож на экспорт базы караоке');
    const safe = entries.filter(row => row && typeof row.id === 'string' && typeof row.trackKey === 'string' && Array.isArray(row.lines));
    const database = await open();
    if (!database) { safe.forEach(row => memory.set(row.id, row)); return safe.length; }
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE, 'readwrite');
      const store = transaction.objectStore(STORE);
      safe.forEach(row => store.put({ ...row, updatedAt: Number(row.updatedAt) || Date.now() }));
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    });
    return safe.length;
  }
  function matches(track, entry) { return !!track && !!entry && trackKey(track) === entry.trackKey; }
  function asResult(entry) {
    return { lines: entry.lines, kind: entry.kind, source: entry.source, message: entry.message || 'Загружено из локальной базы' };
  }
  return { open, save, find, search, remove, count, exportAll, importAll, matches, asResult, trackKey, normalize };
});
