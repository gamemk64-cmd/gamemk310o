/*
  v12.js — обновление v12
  • «Люди»: поиск пользователей сайта, их песни, лайк → песня попадает в твой плейлист (даже если не скачана)
  • «Настройки»: всё в одном месте (стиль, интерфейс, голос, люди, приложение)
  • Голос: большой текст «что слышу» и ответ помощника, вопрос «где искать — моя музыка или мир»
  • Анимации при смене песни
  • «Добавить как приложение»
  Подключается в index.html ПОСЛЕ voice.js:  <script src="v12.js"></script>
*/
(() => {
  'use strict';

  const g = id => document.getElementById(id);
  const R = document.documentElement;
  const esc = x => String(x == null ? '' : x).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const safe = f => { try { return f(); } catch { return undefined; } };
  const LSget = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch { return d; } };
  const LSset = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
  const toastMsg = m => safe(() => toast(m));

  /* ---------- свои настройки v12 ---------- */
  const CK = 'v12_cfg';
  const CFG = Object.assign({ anim: true, share: false, nick: '', tab: 'look' }, LSget(CK, {}));
  const saveCfg = () => LSset(CK, CFG);

  function applyAnimFlag() { document.body.classList.toggle('v12-noanim', !CFG.anim); }
  applyAnimFlag();

  /* ---------- меню: «Люди» и «Настройки», старый пункт «Интерфейс» уходит в «Настройки» ---------- */
  safe(() => {
    ['ui', 'style'].forEach(k => { const i = nav.findIndex(n => n[0] === k); if (i >= 0) nav.splice(i, 1); });   // «Интерфейс» и «Стиль» — теперь вкладки в «Настройках»
    if (!nav.some(n => n[0] === 'people')) nav.push(['people', 'Люди']);
    if (!nav.some(n => n[0] === 'set')) nav.push(['set', 'Настройки']);
  });

  const _render = render;
  render = function () {
    _render();
    if (view === 'people') drawPeople();
    else if (view === 'set') drawSettings();
  };
  safe(() => { if (view === 'ui' || view === 'style') { view = 'set'; CFG.tab = view === 'ui' ? 'ui' : 'look'; } });

  const main = () => g('main');

  /* ================================================================
     ЛЮДИ (Supabase)
     ================================================================ */
  const SBC = window.AUTH_CFG || {};
  const cloudOK = !!(SBC.SB_URL && SBC.SB_KEY);
  let sb = null;
  const getSb = () => new Promise((res, rej) => {
    if (sb) return res(sb);
    const mk = () => { try { sb = window.supabase.createClient(SBC.SB_URL, SBC.SB_KEY); res(sb); } catch (e) { rej(e); } };
    if (window.supabase && window.supabase.createClient) return mk();
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
    s.onload = mk; s.onerror = () => rej(new Error('Не удалось загрузить Supabase'));
    document.head.appendChild(s);
  });
  async function session() {
    const c = await getSb();
    const { data } = await c.auth.getSession();
    return data && data.session;
  }

  const PLNAME = 'Понравилось у людей';
  const PV = { q: '', list: null, open: null, tracks: [], liked: new Set(), busy: false, err: '', uid: null, mine: null, noSess: false, setup: false };
  const MAP = LSget('v12_map', {});   // ключ чужого трека -> id у меня (для песен, которые у автора были файлами)

  const hashKey = s => { let h = 5381; s = String(s).toLowerCase().replace(/\s+/g, ' ').trim(); for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };
  const likeEsc = s => String(s).replace(/[\\%_]/g, m => '\\' + m);

  function errText(e) {
    const m = String((e && (e.message || e.details)) || e || '');
    if (/relation .* does not exist|schema cache|Could not find the table/i.test(m)) { PV.setup = true; return 'В Supabase ещё нет таблиц для раздела «Люди». Выполни файл supabase-v12.sql (SQL Editor).'; }
    if (/duplicate key|23505/.test(m)) return 'Этот ник уже занят';
    if (/Failed to fetch|NetworkError/i.test(m)) return 'Нет связи с сервером';
    return m || 'Что-то пошло не так';
  }

  async function loadMe() {
    PV.noSess = false;
    const s = await session();
    if (!s) { PV.noSess = true; PV.uid = null; PV.mine = null; return; }
    PV.uid = s.user.id;
    const c = await getSb();
    const { data, error } = await c.from('profiles').select('id,nick,share').eq('id', PV.uid).maybeSingle();
    if (error) throw error;
    PV.mine = data || null;
    if (data) { CFG.nick = data.nick; CFG.share = !!data.share; saveCfg(); }
  }

  async function searchUsers(q) {
    const c = await getSb();
    let qb = c.from('profiles').select('id,nick,updated_at,shared_tracks(count)').eq('share', true);
    q = (q || '').trim();
    if (q) qb = qb.ilike('nick', '%' + likeEsc(q) + '%');
    const { data, error } = await qb.order('updated_at', { ascending: false }).limit(24);
    if (error) throw error;
    return (data || []).filter(u => u.id !== PV.uid).map(u => ({ id: u.id, nick: u.nick, n: (u.shared_tracks && u.shared_tracks[0] && u.shared_tracks[0].count) || 0 }));
  }

  async function openUser(u) {
    PV.open = u; PV.tracks = []; PV.liked = new Set(); PV.busy = true; PV.err = ''; drawPeople();
    try {
      const c = await getSb();
      const { data, error } = await c.from('shared_tracks')
        .select('id,tkey,title,artist,album,dur,curl,kind,payload,track_likes(count)')
        .eq('user_id', u.id).order('created_at', { ascending: false }).limit(300);
      if (error) throw error;
      PV.tracks = data || [];
      if (PV.tracks.length && PV.uid) {
        const { data: lk } = await c.from('track_likes').select('track_id').eq('user_id', PV.uid).in('track_id', PV.tracks.map(t => t.id));
        PV.liked = new Set((lk || []).map(x => x.track_id));
      }
    } catch (e) { PV.err = errText(e); }
    PV.busy = false; if (view === 'people') drawPeople();
  }

  /* безопасно превращаем чужие данные в обычный «мировой» трек */
  function cleanTrack(r) {
    const p = r.payload || {}, str = (x, n) => String(x == null ? '' : x).slice(0, n);
    const o = { title: str(r.title, 200), artist: str(r.artist, 200), album: str(r.album, 200) || '—', dur: Math.max(0, +r.dur || 0) | 0, fmt: 'WEB', size: 0 };
    const cu = str(r.curl, 600); o.curl = /^https:\/\//.test(cu) ? cu : '';
    if (r.kind === 'yt' && /^[\w-]{11}$/.test(p.yt || '')) { o.id = 'yt:' + p.yt; o.yt = p.yt; o.album = 'YouTube'; return o; }
    if (r.kind === 'web' && /^(au|it):[\w-]+$/.test(p.id || '') && /^https:\/\//.test(p.src || '')) {
      let h = ''; try { h = new URL(p.src).hostname; } catch {}
      if (/(^|\.)(audius\.co|itunes\.apple\.com|mzstatic\.com)$/.test(h)) { o.id = p.id; o.src = p.src; return o; }
    }
    return null;
  }

  async function resolveRow(r) {
    const direct = cleanTrack(r);
    if (direct) { safe(() => ing(direct)); return direct.id; }
    // у автора это был файл — ищем ту же песню в сети
    const k = r.tkey;
    if (MAP[k] && safe(() => T.has(MAP[k]))) return MAP[k];
    const q = (r.artist + ' ' + r.title).trim();
    let w = null;
    try { const l = await ytSearch(q); w = l && l[0]; } catch {}
    if (!w) {
      try {
        const j = await (await fetch('https://itunes.apple.com/search?term=' + encodeURIComponent(q) + '&media=music&entity=song&limit=5')).json();
        const x = (j.results || []).find(z => z.previewUrl); if (x) w = mapI(x);
      } catch {}
    }
    if (!w) return null;
    safe(() => ing(w)); MAP[k] = w.id; LSset('v12_map', MAP);
    return w.id;
  }

  async function likeRow(row) {
    if (!PV.uid) { toastMsg('Войди в облачный аккаунт'); return; }
    const c = await getSb();
    const liked = PV.liked.has(row.id);
    if (liked) {
      PV.liked.delete(row.id); drawPeople();
      await c.from('track_likes').delete().eq('user_id', PV.uid).eq('track_id', row.id);
      const lid = MAP[row.tkey] || (cleanTrack(row) || {}).id;
      if (lid) { S.fav = S.fav.filter(x => x !== lid); const pl = S.pl.find(p => p.name === PLNAME); if (pl) pl.ids = pl.ids.filter(x => x !== lid); safe(() => persist()); safe(() => ui()); }
      toastMsg('Лайк убран');
      return;
    }
    PV.liked.add(row.id); drawPeople();
    const id = await resolveRow(row);
    if (!id) { PV.liked.delete(row.id); drawPeople(); toastMsg('Не нашёл эту песню в сети'); return; }
    if (!S.fav.includes(id)) S.fav = [...S.fav, id];
    let pl = S.pl.find(p => p.name === PLNAME);
    if (!pl) { pl = { id: crypto.randomUUID(), name: PLNAME, ids: [] }; S.pl.push(pl); }
    safe(() => addToPl([id], pl));     // песня попадает в плейлист, даже если не скачана
    safe(() => persist()); safe(() => ui());
    toastMsg('♥ Добавлено в «' + PLNAME + '»');
    c.from('track_likes').insert({ user_id: PV.uid, track_id: row.id }).then(() => {});
    row.track_likes = [{ count: ((row.track_likes && row.track_likes[0] && row.track_likes[0].count) || 0) + 1 }];
    if (view === 'people') drawPeople();
  }

  async function playRow(row) {
    toastMsg('Ищу песню…');
    const id = await resolveRow(row);
    if (!id) return toastMsg('Не нашёл эту песню в сети');
    safe(() => play(id, [id]));
  }

  /* ---------- публикация моей музыки ---------- */
  function collectMine() {
    const ids = [...new Set([...(S.fav || []), ...(S.pl || []).flatMap(p => p.ids || [])])];
    const out = [];
    for (const id of ids) {
      const t = safe(() => T.get(id)); if (!t || !t.title) continue;
      const base = { title: String(t.title).slice(0, 200), artist: String(t.artist || '').slice(0, 200), album: String(t.album || '').slice(0, 200), dur: Math.round(t.dur || 0), curl: (t.curl && /^https:\/\//.test(t.curl)) ? t.curl : '' };
      if (t.yt) out.push({ ...base, tkey: 'yt:' + t.yt, kind: 'yt', payload: { yt: t.yt } });
      else if (t.src && !t.file && /^(au|it):/.test(t.id)) out.push({ ...base, tkey: t.id, kind: 'web', payload: { id: t.id, src: t.src } });
      else out.push({ ...base, tkey: 'l:' + hashKey(t.artist + '|' + t.title), kind: 'local', payload: null });
      if (out.length >= 300) break;
    }
    return out;
  }
  const sigMine = () => hashKey(collectMine().map(x => x.tkey).sort().join(','));
  let lastSig = LSget('v12_sig', '');
  let pubBusy = false;
  async function publishMine(force) {
    if (pubBusy) return;
    pubBusy = true;
    try {
      const s = await session(); if (!s) throw new Error('Нужен облачный аккаунт');
      if (!CFG.nick) throw new Error('Сначала придумай ник');
      const c = await getSb(), uid = s.user.id;
      const { error: e1 } = await c.from('profiles').upsert({ id: uid, nick: CFG.nick, share: !!CFG.share, updated_at: new Date().toISOString() });
      if (e1) throw e1;
      if (CFG.share) {
        const rows = collectMine().map(r => ({ ...r, user_id: uid }));
        const { data: ex } = await c.from('shared_tracks').select('tkey').eq('user_id', uid).limit(1000);
        const have = new Set((ex || []).map(x => x.tkey)), keep = new Set(rows.map(r => r.tkey));
        const gone = [...have].filter(k => !keep.has(k));
        for (let i = 0; i < rows.length; i += 50) {
          const { error } = await c.from('shared_tracks').upsert(rows.slice(i, i + 50), { onConflict: 'user_id,tkey' });
          if (error) throw error;
        }
        for (let i = 0; i < gone.length; i += 50) await c.from('shared_tracks').delete().eq('user_id', uid).in('tkey', gone.slice(i, i + 50));
        lastSig = sigMine(); LSset('v12_sig', lastSig);
        if (force) toastMsg('Опубликовано песен: ' + rows.length);
      } else {
        await c.from('shared_tracks').delete().eq('user_id', uid);
        if (force) toastMsg('Твоя музыка скрыта');
      }
      await loadMe();
    } catch (e) { if (force) toastMsg(errText(e)); else console.warn('v12 publish:', e); }
    pubBusy = false;
  }
  setInterval(() => { if (CFG.share && CFG.nick && !document.hidden && sigMine() !== lastSig) publishMine(false); }, 20000);

  /* ---------- экран «Люди» ---------- */
  const ava = n => `<div class="v12-ava">${esc((n || '?')[0].toUpperCase())}</div>`;
  const fmtDur = s => safe(() => fmt(s)) || '';

  function drawPeople() {
    const m = main(); if (!m || view !== 'people') return;
    if (!cloudOK) { m.innerHTML = `<h2>Люди</h2><div class="empty">Облако не подключено (нужны SB_URL и SB_KEY в index.html).</div>`; return; }
    if (PV.noSess) {
      m.innerHTML = `<h2>Люди</h2><div class="v12-hero"><div class="v12-hero-i">◎</div><h3>Ищи людей и их музыку</h3><p>Чтобы искать других пользователей и лайкать их песни, нужен облачный аккаунт.</p><button class="add" data-pa="login" style="margin:0">Войти или создать аккаунт</button></div>`;
      return;
    }
    if (PV.open) {
      const u = PV.open;
      const rows = PV.tracks.map((r, i) => {
        const lk = (r.track_likes && r.track_likes[0] && r.track_likes[0].count) || 0, on = PV.liked.has(r.id);
        const tr = { id: r.tkey, curl: /^https:\/\//.test(r.curl || '') ? r.curl : '', title: r.title, hue: parseInt(hashKey(r.tkey), 36) % 360 };
        const st = safe(() => cv(tr)) || '';
        return `<div class="row v12-prow" data-pi="${i}" style="--i:${Math.min(i, 14)}"><div class="cv" style="${esc(st)}">${tr.curl ? '' : esc((r.title || '♪')[0].toUpperCase())}</div>
          <div class="tt"><b>${esc(r.title)}</b><small>${esc(r.artist)}${r.kind === 'local' ? ' · найду в сети' : ''}</small></div>
          <span class="d">${lk ? '♥ ' + lk : ''}</span><span class="d">${r.dur ? fmtDur(r.dur) : ''}</span>
          <button data-pa="play" data-i="${i}" title="Слушать">▶</button>
          <button data-pa="like" data-i="${i}" class="v12-lk${on ? ' on' : ''}" title="${on ? 'Убрать лайк' : 'Лайк — добавить к себе в плейлист'}">${on ? '♥' : '♡'}</button></div>`;
      }).join('');
      m.innerHTML = `<div class="bar"><button data-pa="back">← Назад</button></div>
        <div class="v12-user">${ava(u.nick)}<div><h2 style="margin:0">${esc(u.nick)}</h2><small>${PV.busy ? 'Загружаю…' : 'Песен: ' + PV.tracks.length}</small></div></div>
        ${PV.err ? `<div class="empty">${esc(PV.err)}</div>` : ''}
        <p class="d">Нажми ♡ — песня сразу попадёт в плейлист «${PLNAME}» и в избранное, даже если её нет у тебя в файлах.</p>
        <div class="v12-plist">${rows || (PV.busy ? '' : '<div class="empty">Пока нет открытых песен</div>')}</div>`;
      return;
    }
    const me = PV.mine;
    const mine = me
      ? `<div class="v12-me">${ava(me.nick)}<div><b>${esc(me.nick)}</b><br><small>${me.share ? 'Твоя музыка открыта для поиска' : 'Твоя музыка скрыта'}</small></div><button data-pa="gosettings">Настроить</button></div>`
      : `<div class="v12-me"><div><b>Тебя пока не найдут</b><br><small>Придумай ник в настройках, чтобы другие видели твою музыку</small></div><button class="add" style="margin:0" data-pa="gosettings">Придумать ник</button></div>`;
    const cards = (PV.list || []).map((u, i) => `<div class="card v12-ucard" data-pu="${i}" style="--i:${Math.min(i, 12)}">${ava(u.nick)}<b>${esc(u.nick)}</b><br><small>Песен: ${u.n}</small></div>`).join('');
    m.innerHTML = `<h2>Люди</h2>${mine}
      <form class="bar" id="v12sf" onsubmit="return false"><input type="search" id="v12q" placeholder="Найти человека по нику…" value="${esc(PV.q)}" autocomplete="off"><button class="add" style="margin:0" data-pa="search">Найти</button></form>
      ${PV.err ? `<div class="empty">${esc(PV.err)}</div>` : ''}
      <h3>${PV.q ? 'Результаты' : 'Недавно появились'}</h3>
      ${PV.busy ? '<p class="d">Ищу…</p>' : ''}
      <div class="grid">${cards}</div>
      ${!PV.busy && PV.list && !PV.list.length && !PV.err ? '<div class="empty">Никого не нашли. Люди видны, только если сами открыли свою музыку.</div>' : ''}`;
  }

  async function peopleInit() {
    PV.busy = true; PV.err = ''; drawPeople();
    try { await loadMe(); if (!PV.noSess) PV.list = await searchUsers(PV.q); } catch (e) { PV.err = errText(e); }
    PV.busy = false; if (view === 'people') drawPeople();
  }
  async function doSearch() {
    const el = g('v12q'); PV.q = el ? el.value : PV.q; PV.busy = true; PV.err = ''; drawPeople();
    try { PV.list = await searchUsers(PV.q); } catch (e) { PV.err = errText(e); }
    PV.busy = false; drawPeople();
  }

  document.addEventListener('click', e => {
    if (view !== 'people') return;
    const a = e.target.closest('[data-pa]'), u = e.target.closest('[data-pu]');
    if (u) { openUser(PV.list[+u.dataset.pu]); return; }
    if (!a) return;
    const act = a.dataset.pa, row = PV.tracks[+a.dataset.i];
    if (act === 'login') safe(() => openAuth());
    else if (act === 'search') doSearch();
    else if (act === 'back') { PV.open = null; drawPeople(); }
    else if (act === 'play' && row) playRow(row);
    else if (act === 'like' && row) likeRow(row).catch(x => toastMsg(errText(x)));
    else if (act === 'gosettings') { CFG.tab = 'people'; saveCfg(); view = 'set'; safe(() => { S.view = 'set'; persist(); }); render(); }
  });
  document.addEventListener('keydown', e => { if (view === 'people' && e.key === 'Enter' && e.target && e.target.id === 'v12q') doSearch(); });

  let lastView = null;
  setInterval(() => { if (view !== lastView) { lastView = view; if (view === 'people' && !PV.list && !PV.busy) peopleInit(); } }, 200);

  /* ================================================================
     НАСТРОЙКИ
     ================================================================ */
  const TABS = [['look', 'Стиль'], ['ui', 'Интерфейс'], ['voice', 'Голос'], ['people', 'Люди'], ['app', 'Приложение']];
  let uiParts = { look: '', ui: '' };

  function captureUI() {
    const prev = view, m = main();
    try { view = 'ui'; render(); } catch {}
    const html = m ? m.innerHTML : '';
    view = prev;
    const parts = html.split(/(?=<h3>)/);
    uiParts.look = parts.filter(x => /^<h3>Оформление/.test(x)).join('');
    uiParts.ui = parts.filter(x => /^<h3>(Размер интерфейса|Вид интерфейса|Версия сайта)/.test(x)).join('');
  }

  const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const sw = (k, on) => `<button type="button" class="v12-sw${on ? ' on' : ''}" data-sc="${k}" role="switch" aria-checked="${!!on}"><i></i></button>`;

  function voiceTab() {
    const V = window.VoiceAPI; if (!V) return '<div class="empty">Голосовой модуль не загрузился (voice.js)</div>';
    const c = V.cfg();
    const opt = (v, l, cur) => `<option value="${v}" ${cur === v ? 'selected' : ''}>${l}</option>`;
    return `<div class="v12-list">
      <div class="v12-item"><div><b>Голосовое управление</b><small>${V.mobile ? 'На телефоне надёжнее кнопка 🎙 — нажал и сказал' : 'Скажи имя, затем команду'}</small></div>${sw('vc:enabled', c.enabled)}</div>
      <div class="v12-item"><div><b>Имя помощника</b><small>Как к нему обращаться</small></div><input type="text" data-vi="name" value="${esc(c.name)}" maxlength="24"></div>
      <div class="v12-item"><div><b>Где искать песню</b><small>Когда говоришь «Моргенштерн» — он спросит, где искать</small></div>
        <select data-vs="searchSource">${opt('ask', 'Спрашивать', c.searchSource)}${opt('both', 'Сначала моя музыка, потом мир', c.searchSource)}${opt('lib', 'Только моя музыка', c.searchSource)}${opt('web', 'Только мировой поиск', c.searchSource)}</select></div>
      <div class="v12-item"><div><b>Голосовые ответы</b><small>Помощник отвечает вслух</small></div>${sw('vc:speak', c.speak)}</div>
      <div class="v12-item"><div><b>Приглушать музыку</b><small>Пока он слушает, можно говорить тише</small></div>${sw('vc:duck', c.duck)}</div>
      <div class="v12-item"><div><b>Язык распознавания</b><small>Авто — язык устройства</small></div>
        <select data-vs="lang">${[['auto', 'Авто'], ['ru-RU', 'Русский'], ['uk-UA', 'Українська'], ['en-US', 'English'], ['de-DE', 'Deutsch'], ['es-ES', 'Español'], ['fr-FR', 'Français'], ['pl-PL', 'Polski'], ['tr-TR', 'Türkçe'], ['it-IT', 'Italiano'], ['pt-BR', 'Português'], ['ja-JP', '日本語'], ['ko-KR', '한국어'], ['zh-CN', '中文']].map(([v, l]) => opt(v, l, c.lang)).join('')}</select></div>
      <div class="v12-item"><div><b>Команды, звуки, голос ассистента</b><small>Полные настройки, как раньше</small></div><button data-sa="voicepanel">Открыть</button></div>
    </div>`;
  }

  function peopleTab() {
    return `<div class="v12-list">
      <div class="v12-item"><div><b>Твой ник</b><small>По нему тебя найдут другие. От 2 до 24 символов</small></div>
        <span class="v12-inline"><input type="text" id="v12nick" value="${esc(CFG.nick)}" maxlength="24" placeholder="например, vasya"><button data-sa="savenick" class="add" style="margin:0">Сохранить</button></span></div>
      <div class="v12-item"><div><b>Показывать мою музыку людям</b><small>Видны избранное и песни из плейлистов. Сами файлы никому не передаются — только названия и ссылки на источник</small></div>${sw('share', CFG.share)}</div>
      <div class="v12-item"><div><b>Обновить сейчас</b><small>Обычно всё обновляется само</small></div><button data-sa="publish">Опубликовать</button></div>
      <div class="v12-item"><div><b>Найти людей</b><small>Поиск по нику и лайки на чужие песни</small></div><button data-sa="gopeople">Открыть «Люди»</button></div>
      ${PV.setup ? '<p class="d">В Supabase нет таблиц. Выполни supabase-v12.sql.</p>' : ''}
    </div>`;
  }

  function appTab() {
    const inst = isStandalone();
    return `<div class="v12-list">
      <div class="v12-item v12-install"><div><b>Добавить как приложение</b><small>${inst ? 'Уже открыто как приложение ✓' : 'Значок на рабочем столе компьютера или на экране телефона, окно без адресной строки'}</small></div>
        <button class="add" style="margin:0" data-sa="install" ${inst ? 'disabled' : ''}>${inst ? 'Установлено' : 'Добавить'}</button></div>
      <p class="d">Работает по https (GitHub Pages подходит). На iPhone это делается через Safari: «Поделиться» → «На экран Домой» — кнопка покажет подсказку.</p>
    </div>`;
  }

  function drawSettings() {
    const m = main(); if (!m || view !== 'set') return;
    captureUI();
    const tab = TABS.some(t => t[0] === CFG.tab) ? CFG.tab : 'look';
    let body = '';
    if (tab === 'look') body = `<div class="v12-sec">${uiParts.look}</div>`;
    else if (tab === 'ui') body = `<div class="v12-sec">${uiParts.ui}</div>
      <h3>Анимации</h3><div class="v12-list"><div class="v12-item"><div><b>Анимации смены песни</b><small>Обложка, название и свечение при переключении</small></div>${sw('anim', CFG.anim)}</div></div>`;
    else if (tab === 'voice') body = voiceTab();
    else if (tab === 'people') body = peopleTab();
    else body = appTab();
    m.innerHTML = `<div id="v12set"><h2>Настройки</h2><div class="v12-tabs" role="tablist">${TABS.map(([k, n]) => `<button data-st="${k}" class="${k === tab ? 'on' : ''}" role="tab">${n}</button>`).join('')}</div><div class="v12-body">${body}</div></div>`;
  }

  /* клики по настройкам */
  document.addEventListener('click', e => {
    if (view !== 'set') return;
    const t = e.target;
    const st = t.closest('[data-st]');
    if (st) { CFG.tab = st.dataset.st; saveCfg(); drawSettings(); return; }
    const sc = t.closest('[data-sc]');
    if (sc) {
      const k = sc.dataset.sc;
      if (k.startsWith('vc:')) {
        const V = window.VoiceAPI, key = k.slice(3); if (!V) return;
        if (key === 'enabled') V.toggle(); else { V.cfg()[key] = !V.cfg()[key]; V.save(); }
        setTimeout(drawSettings, 60);
      } else if (k === 'anim') { CFG.anim = !CFG.anim; saveCfg(); applyAnimFlag(); drawSettings(); }
      else if (k === 'share') {
        if (!CFG.nick && !CFG.share) { toastMsg('Сначала придумай ник'); const n = g('v12nick'); if (n) n.focus(); return; }
        CFG.share = !CFG.share; saveCfg(); drawSettings(); publishMine(true);
      }
      return;
    }
    const sa = t.closest('[data-sa]');
    if (sa) {
      const a = sa.dataset.sa;
      if (a === 'voicepanel') safe(() => window.VoiceAPI.open());
      else if (a === 'install') installApp();
      else if (a === 'gopeople') { view = 'people'; safe(() => { S.view = 'people'; persist(); }); render(); }
      else if (a === 'publish') publishMine(true);
      else if (a === 'savenick') saveNick();
      return;
    }
    // старые настройки (тема, размер…) сами перерисовывают страницу «Интерфейс» — возвращаем наш каркас
    if (t.closest('.v12-sec')) setTimeout(() => { if (view === 'set' && !g('v12set')) drawSettings(); }, 0);
  });
  document.addEventListener('input', e => {
    if (view !== 'set') return;
    if (e.target.closest('.v12-sec')) setTimeout(() => { if (view === 'set' && !g('v12set')) drawSettings(); }, 30);
  });
  document.addEventListener('change', e => {
    if (view !== 'set') return;
    const t = e.target, V = window.VoiceAPI;
    if (t.dataset.vs && V) { V.cfg()[t.dataset.vs] = t.value; V.save(); toastMsg('Сохранено'); }
    else if (t.dataset.vi && V) { V.cfg()[t.dataset.vi] = t.value.trim() || V.cfg()[t.dataset.vi]; V.save(); V.refresh(); toastMsg('Сохранено'); }
    if (t.closest('.v12-sec')) setTimeout(() => { if (view === 'set' && !g('v12set')) drawSettings(); }, 30);
  });

  async function saveNick() {
    const el = g('v12nick'), n = (el ? el.value : '').trim();
    if (n.length < 2 || n.length > 24) return toastMsg('Ник — от 2 до 24 символов');
    if (!/^[\p{L}\p{N}_.\- ]+$/u.test(n)) return toastMsg('В нике только буквы, цифры, пробел и _ . -');
    try {
      const s = await session(); if (!s) { toastMsg('Нужен облачный аккаунт'); safe(() => openAuth()); return; }
      CFG.nick = n; saveCfg();
      const c = await getSb();
      const { error } = await c.from('profiles').upsert({ id: s.user.id, nick: n, share: !!CFG.share, updated_at: new Date().toISOString() });
      if (error) throw error;
      toastMsg('Ник сохранён'); await loadMe(); if (CFG.share) publishMine(false); drawSettings();
    } catch (e) { toastMsg(errText(e)); }
  }

  /* ================================================================
     УСТАНОВКА КАК ПРИЛОЖЕНИЯ
     ================================================================ */
  let DP = window.__bip || null;
  addEventListener('beforeinstallprompt', e => { e.preventDefault(); DP = e; if (view === 'set') drawSettings(); });
  addEventListener('appinstalled', () => { DP = null; toastMsg('Приложение установлено'); if (view === 'set') drawSettings(); });

  async function installApp() {
    if (isStandalone()) return toastMsg('Уже открыто как приложение');
    if (DP) {
      try { DP.prompt(); const r = await DP.userChoice; DP = null; if (r && r.outcome === 'accepted') toastMsg('Устанавливаю…'); return; } catch { DP = null; }
    }
    installHelp();
  }
  function installHelp() {
    document.querySelectorAll('.v12-modal').forEach(x => x.remove());
    const ua = navigator.userAgent, ios = /iPhone|iPad|iPod/i.test(ua) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(ua));
    const and = /Android/i.test(ua), https = /^https:|^http:\/\/localhost/.test(location.href) || location.hostname === 'localhost';
    let steps;
    if (!https) steps = ['Сайт открыт не по https — браузер не разрешит установку.', 'Открой его по адресу https://… (например, через GitHub Pages).'];
    else if (ios) steps = ['Открой сайт именно в Safari.', 'Нажми «Поделиться» (квадрат со стрелкой).', 'Выбери «На экран “Домой”» и нажми «Добавить».'];
    else if (and) steps = ['В Chrome нажми ⋮ (меню) вверху справа.', 'Выбери «Установить приложение» или «Добавить на главный экран».', 'Подтверди — значок появится на экране телефона.'];
    else steps = ['В Chrome или Edge посмотри в правый край адресной строки — там значок установки ⊕.', 'Или меню ⋮ → «Установить Music Player» / «Приложения → Установить этот сайт как приложение».', 'Safari на Mac: Файл → «Добавить в Dock».'];
    const d = document.createElement('div'); d.className = 'v12-modal';
    d.innerHTML = `<div class="v12-mbox"><h3>Добавить как приложение</h3><ol>${steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol><button class="add" style="margin:6px 0 0" data-x>Понятно</button></div>`;
    d.addEventListener('click', e => { if (e.target === d || e.target.closest('[data-x]')) d.remove(); });
    document.body.appendChild(d);
  }

  /* ================================================================
     ГОЛОС: большой текст «что слышу» + ответ + вопрос «где искать»
     ================================================================ */
  const hud = document.createElement('div');
  hud.id = 'vhud';
  hud.innerHTML = `<div class="vh-card"><div class="vh-top"><span class="vh-orb"><i></i><i></i><i></i><i></i><i></i></span><span class="vh-st" id="vhSt">Слушаю…</span></div>
    <div class="vh-heard" id="vhHeard"></div><div class="vh-say" id="vhSay"></div>
    <div class="vh-ask" id="vhAsk"></div></div>`;
  document.body.appendChild(hud);

  let awakeNow = false, hideT = 0, sayT = 0, askOpen = false, prevWords = [];
  const showHud = ms => { hud.classList.add('on'); clearTimeout(hideT); if (ms) hideT = setTimeout(hideHud, ms); };
  function hideHud() { if (askOpen || awakeNow) return; hud.classList.remove('on'); setTimeout(() => { if (!hud.classList.contains('on')) { g('vhHeard').innerHTML = ''; g('vhSay').textContent = ''; prevWords = []; } }, 400); }

  addEventListener('vc:state', e => {
    const s = e.detail || {}; awakeNow = !!s.awake;
    g('vhSt').textContent = s.denied ? 'Нет доступа к микрофону' : (s.awake ? 'Слушаю…' : '');
    hud.classList.toggle('awake', awakeNow);
    if (awakeNow) showHud(0); else if (hud.classList.contains('on') && !askOpen) { clearTimeout(hideT); hideT = setTimeout(hideHud, 2800); }
    const tb = g('vcTalk'); if (tb) tb.classList.toggle('on', awakeNow);
  });
  addEventListener('vc:heard', e => {
    const d = e.detail || {}; if (!awakeNow && !askOpen) return;
    const words = String(d.text || '').trim().split(/\s+/).filter(Boolean);
    if (!words.length) return;
    const el = g('vhHeard');
    el.innerHTML = words.map((w, i) => `<span class="w${i >= prevWords.length ? ' new' : ''}" style="--d:${Math.min(i - prevWords.length, 6) * 40}ms">${esc(w)}</span>`).join(' ');
    el.classList.toggle('final', !!d.final);
    prevWords = words;
    showHud(awakeNow ? 0 : 3000);
  });
  addEventListener('vc:line', e => {
    const d = e.detail || {}, t = String(d.text || '');
    if (d.italic || !t) return;                     // промежуточный текст уже показан как «слышу»
    const el = g('vhSay'); el.textContent = t.replace(/^[✓⚠]\s*/, '');
    el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
    el.classList.toggle('bad', /^[⚠?]/.test(t));
    showHud(awakeNow || askOpen ? 0 : 3800);
    clearTimeout(sayT); sayT = setTimeout(() => { if (!askOpen) { el.textContent = ''; } }, 4200);
  });
  addEventListener('vc:ask', e => {
    const d = e.detail || {}, box = g('vhAsk');
    askOpen = !!d.open;
    if (!d.open) { box.innerHTML = ''; box.classList.remove('on'); hud.classList.remove('asking'); hideHud(); return; }
    box.innerHTML = `<div class="vh-q">«${esc(d.q)}»</div>
      <button data-ask="lib"><b>Моя музыка</b><small>${d.lib ? 'Нашлось: ' + d.lib : 'пока ничего'}</small></button>
      <button data-ask="web"><b>Мировой поиск</b><small>YouTube, Audius, iTunes</small></button>
      <button data-ask="cancel" class="x">Отмена</button>`;
    box.classList.add('on'); hud.classList.add('asking'); showHud(0);
  });
  g('vhAsk').addEventListener('click', e => {
    const b = e.target.closest('[data-ask]'); if (!b) return;
    safe(() => window.VoiceAPI.answer(b.dataset.ask));
  });

  /* кнопка «нажми и скажи» рядом с кнопкой «Голос» */
  safe(() => {
    const row = document.querySelector('#vcPill .vcrow'); if (!row || g('vcTalk')) return;
    const b = document.createElement('button');
    b.id = 'vcTalk'; b.type = 'button'; b.title = 'Нажми и скажи'; b.setAttribute('aria-label', 'Нажми и скажи');
    b.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>';
    b.onclick = () => safe(() => window.VoiceAPI.talk());
    row.insertBefore(b, row.lastElementChild);
  });

  /* ================================================================
     АНИМАЦИИ СМЕНЫ ПЕСНИ
     ================================================================ */
  let prevId = safe(() => S.cur), swT = 0;
  function onTrackChange() {
    const cur = safe(() => S.cur); if (cur === prevId) return;
    let dir = 'next';
    const l = safe(() => ctxList) || [], a = l.indexOf(prevId), b = l.indexOf(cur);
    if (a >= 0 && b >= 0 && b < a) dir = 'prev';
    prevId = cur;
    if (!cur) return;
    document.body.dataset.sw = dir;
    clearTimeout(swT); swT = setTimeout(() => { delete document.body.dataset.sw; }, 900);
    // кольцо света от обложки
    const pc = g('pc'); if (pc) {
      const r = pc.getBoundingClientRect(), ring = document.createElement('i');
      ring.className = 'v12-ring'; ring.style.left = (r.left + r.width / 2) + 'px'; ring.style.top = (r.top + r.height / 2) + 'px';
      document.body.appendChild(ring); setTimeout(() => ring.remove(), 1000);
    }
  }
  const pt = g('pt'); if (pt) new MutationObserver(onTrackChange).observe(pt, { childList: true, characterData: true, subtree: true });
  setInterval(onTrackChange, 400);

  /* ---------- первый показ ---------- */
  safe(() => render());
})();
