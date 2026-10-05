
(() => {
  'use strict';

  const CFG = Object.assign({
    endpoint: '/api/lyrics',
    timeout: 8000,
    autoFetch: true
  }, window.LYRICS_CFG || {});

  const $ = id => document.getElementById(id);
  let rows = [];
  let active = -1;
  let raf = 0;
  let loading = false;

  function track() {
    try {
      return window.S && window.T && window.S.cur ? window.T.get(window.S.cur) : null;
    } catch { return null; }
  }

  function esc(s) {
    if (typeof window.esc === 'function') return window.esc(String(s));
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function parseLRC(raw) {
    const out = [];
    for (const line of String(raw || '').split(/\r?\n/)) {
      const tags = [...line.matchAll(/\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g)];
      const text = line.replace(/\[[^\]]+\]/g, '').trim();
      if (!tags.length || !text) continue;
      for (const m of tags) {
        const frac = (m[3] || '0').padEnd(3, '0').slice(0, 3);
        out.push({ time: Number(m[1]) * 60 + Number(m[2]) + Number(frac) / 1000, text });
      }
    }
    return out.sort((a,b) => a.time - b.time);
  }

  function normalize(data) {
    if (!data) return [];
    if (Array.isArray(data.lines)) {
      return data.lines.map(x => ({
        time: Number(x.start_ms ?? x.time_ms ?? (x.time || 0) * 1000) / 1000,
        end: x.end_ms == null ? null : Number(x.end_ms) / 1000,
        text: String(x.text || '').trim()
      })).filter(x => x.text);
    }
    if (Array.isArray(data.synced)) {
      return data.synced.map(x => ({
        time: Number(x.start_ms ?? x.time_ms ?? 0) / 1000,
        end: x.end_ms == null ? null : Number(x.end_ms) / 1000,
        text: String(x.text || '').trim()
      })).filter(x => x.text);
    }
    if (typeof data.syncedLyrics === 'string') return parseLRC(data.syncedLyrics);
    if (typeof data.lrc === 'string') return parseLRC(data.lrc);
    if (Array.isArray(data.lyrics)) return normalize({lines:data.lyrics});
    return [];
  }

  function keyFor(t) {
    return 'lyrics_cache_v1:' + String(t?.id || (t?.artist + '|' + t?.title) || 'unknown');
  }

  function cached(t) {
    try {
      const x = JSON.parse(localStorage.getItem(keyFor(t)) || 'null');
      return x && Array.isArray(x.lines) ? x.lines : [];
    } catch { return []; }
  }

  function cache(t, data) {
    try {
      localStorage.setItem(keyFor(t), JSON.stringify({savedAt:Date.now(), lines:data}));
    } catch {}
  }

  async function fetchLicensedLyrics(t) {
    if (!CFG.endpoint || !t) return [];
    const q = new URL(CFG.endpoint, location.href);
    q.searchParams.set('title', t.title || '');
    q.searchParams.set('artist', t.artist || '');
    if (t.album) q.searchParams.set('album', t.album);
    if (t.dur) q.searchParams.set('duration', String(Math.round(t.dur)));

    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), CFG.timeout);
    try {
      const r = await fetch(q, {
        method:'GET',
        headers:{'Accept':'application/json'},
        credentials:'omit',
        signal:ctl.signal
      });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const data = await r.json();

      // The backend must only return lyrics that it is licensed/authorized to display.
      if (data.licensed !== true) {
        throw new Error('Источник текста не подтвердил лицензию');
      }
      return normalize(data);
    } finally {
      clearTimeout(timer);
    }
  }

  function getTime() {
    try {
      if (typeof window.isYT === 'function' && window.isYT() && window.yp?.getCurrentTime) {
        return Number(window.yp.getCurrentTime() || 0);
      }
      if (window.au) return Number(window.au.currentTime || 0);
    } catch {}
    return 0;
  }

  function getDuration() {
    try {
      if (typeof window.isYT === 'function' && window.isYT() && window.yp?.getDuration) {
        return Number(window.yp.getDuration() || 0);
      }
      if (window.au) return Number(window.au.duration || 0);
    } catch {}
    return 0;
  }

  function seek(time) {
    try {
      if (typeof window.isYT === 'function' && window.isYT() && window.yp?.seekTo) {
        window.yp.seekTo(time, true);
        return;
      }
      if (window.au) {
        window.au.currentTime = time;
        if (window.au.paused) window.au.play().catch(()=>{});
      }
    } catch {}
  }

  function draw() {
    const box = $('karaokeLines');
    const empty = $('karaokeEmpty');
    if (!box || !empty) return;
    box.innerHTML = '';
    rows.forEach((r,i) => {
      const el = document.createElement('div');
      el.className = 'kline';
      el.dataset.i = i;
      el.dataset.time = r.time;
      el.textContent = r.text;
      el.addEventListener('click', () => seek(r.time));
      box.appendChild(el);
    });
    empty.style.display = rows.length ? 'none' : 'block';
  }

  function update() {
    const overlay = $('karaokeOverlay');
    if (!overlay?.classList.contains('on')) return;
    const time = getTime();
    const dur = getDuration();
    const bar = $('karaokeProgress')?.firstElementChild;
    if (bar && dur) bar.style.width = Math.max(0, Math.min(100, time / dur * 100)) + '%';

    let i = -1;
    for (let n=0; n<rows.length; n++) {
      if (time >= rows[n].time) i = n;
      else break;
    }
    if (i !== active) {
      active = i;
      document.querySelectorAll('.kline').forEach((el,n) => {
        el.classList.toggle('active', n === i);
        el.classList.toggle('past', n < i);
      });
      const el = document.querySelector('.kline[data-i="' + i + '"]');
      if (el) el.scrollIntoView({behavior:'smooth', block:'center'});
    }
    raf = requestAnimationFrame(update);
  }

  function status(text) {
    const el = $('karaokeStatus');
    if (el) el.textContent = text || '';
  }

  async function open() {
    const t = track();
    if (!t) {
      if (typeof window.toast === 'function') window.toast('Сначала включите песню');
      return;
    }

    $('karaokeTitle').textContent = t.title || 'Текст песни';
    $('karaokeArtist').textContent = t.artist || '';
    $('karaokeOverlay').classList.add('on');
    $('karaokeOverlay').setAttribute('aria-hidden','false');
    rows = cached(t);
    active = -1;
    draw();

    if (rows.length) {
      status('Текст загружен из кэша');
      update();
      return;
    }

    // Local authorized data is also accepted.
    rows = normalize({lrc:t.lrc, lyrics:t.lyrics});
    if (rows.length) {
      cache(t, rows);
      draw();
      status('Текст из каталога');
      update();
      return;
    }

    if (!CFG.autoFetch) {
      status('Для этой песни текст пока недоступен');
      return;
    }

    if (loading) return;
    loading = true;
    status('Ищу синхронизированный текст…');

    try {
      rows = await fetchLicensedLyrics(t);
      cache(t, rows);
      draw();
      status(rows.length ? 'Синхронизированный текст' : 'Для этой песни текст не найден');
    } catch (e) {
      console.warn('Lyrics provider:', e);
      rows = [];
      draw();
      status('Сервис текста не подключён или не вернул разрешённый текст');
    } finally {
      loading = false;
    }
    update();
  }

  function close() {
    $('karaokeOverlay')?.classList.remove('on');
    $('karaokeOverlay')?.setAttribute('aria-hidden','true');
    cancelAnimationFrame(raf);
  }

  function addButton() {
    if (document.getElementById('karaokeOpenBtn')) return;
    const b = document.createElement('button');
    b.id = 'karaokeOpenBtn';
    b.type = 'button';
    b.textContent = 'Текст';
    b.title = 'Караоке';
    b.onclick = open;

    for (const s of ['#ctl','#pl','#pc','#player']) {
      const p = document.querySelector(s);
      if (p) { p.appendChild(b); return; }
    }
    document.body.appendChild(b);
  }

  function mount() {
    if (!$('karaokeOverlay')) {
      const el = document.createElement('div');
      el.id = 'karaokeOverlay';
      el.setAttribute('aria-hidden','true');
      el.innerHTML = `
        <div id="karaokeTop">
          <button id="karaokeClose" type="button">Закрыть</button>
          <div id="karaokeMeta">
            <div id="karaokeTitle">Текст песни</div>
            <div id="karaokeArtist"></div>
            <div id="karaokeStatus"></div>
          </div>
          <button id="karaokeRetry" type="button">Обновить</button>
        </div>
        <div id="karaokeBody">
          <div id="karaokeLines"></div>
          <div id="karaokeEmpty"><b>Текст пока не найден</b>Когда для этой песни доступен разрешённый синхронизированный текст, он появится здесь автоматически.</div>
        </div>
        <div id="karaokeProgress"><i></i></div>`;
      document.body.appendChild(el);
    }
    $('karaokeClose').onclick = close;
    $('karaokeRetry').onclick = open;
    addButton();
  }

  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  document.addEventListener('DOMContentLoaded', mount);
  setTimeout(mount, 500);
  setInterval(() => {
    if ($('karaokeOverlay')?.classList.contains('on')) update();
    addButton();
  }, 1000);

  window.openKaraoke = open;
  window.closeKaraoke = close;
})();
