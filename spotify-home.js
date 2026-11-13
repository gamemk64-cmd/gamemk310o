/* shop.js — магазин косметики за монеты (Supabase). Подключается после v12.js. */
(() => {
  'use strict';
  const C = window.AUTH_CFG || {};
  const ADMIN = 'gamemk64@gmail.com'; // только для показа вкладки; реальная проверка — на сервере (supabase-shop.sql)
  const g = id => document.getElementById(id);
  const esc = x => String(x == null ? '' : x).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const hex = c => (/^#[0-9a-f]{3,8}$/i.test(c || '') ? c : '#888');
  const toastMsg = m => { try { toast(m); } catch {} };
  const KIND = { frame: 'Рамки', banner: 'Фоны', hat: 'Шапки', fx: 'Эффекты' };

  const ST = { items: [], inv: new Set(), eq: {}, coins: 0, uid: null, email: '', nick: '', admin: false,
    tab: 'shop', kind: 'all', err: '', busy: false, loaded: false, noSess: false, q: '', found: null };

  let sb = null;
  const getSb = () => new Promise((res, rej) => {
    if (sb) return res(sb);
    const mk = () => { try { sb = window.supabase.createClient(C.SB_URL, C.SB_KEY); res(sb); } catch (e) { rej(e); } };
    if (window.supabase && window.supabase.createClient) return mk();
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
    s.onload = mk; s.onerror = () => rej(new Error('Не удалось загрузить Supabase'));
    document.head.appendChild(s);
  });

  const errText = e => {
    const m = String((e && (e.message || e.details)) || e || '');
    if (/does not exist|schema cache|Could not find/i.test(m)) return 'В Supabase ещё нет таблиц магазина. Выполни файл supabase-shop.sql (SQL Editor → Run).';
    if (/no_coins/.test(m)) return 'Не хватает монет';
    if (/owned/.test(m)) return 'Уже куплено';
    if (/not_admin/.test(m)) return 'Нет прав администратора';
    if (/bad_amount/.test(m)) return 'Сумма: от 1 до 1 000 000 (можно с минусом)';
    if (/no_user/.test(m)) return 'Пользователь не найден';
    if (/no_session/.test(m)) return 'Войди в аккаунт';
    if (/Failed to fetch|NetworkError/i.test(m)) return 'Нет связи с сервером';
    return m || 'Что-то пошло не так';
  };

  const item = id => ST.items.find(x => x.id === id);

  /* ---------- загрузка ---------- */
  async function load() {
    if (!C.SB_URL || !C.SB_KEY) { ST.err = 'Облако не подключено (SB_URL / SB_KEY).'; return; }
    ST.busy = true; ST.err = '';
    try {
      const c = await getSb();
      const { data } = await c.auth.getSession();
      const s = data && data.session;
      if (!s) { ST.noSess = true; ST.loaded = true; ST.busy = false; return; }
      ST.noSess = false; ST.uid = s.user.id; ST.email = (s.user.email || '').toLowerCase(); ST.admin = ST.email === ADMIN;
      const [it, inv, cos, w, me] = await Promise.all([
        c.from('shop_items').select('*').order('sort'),
        c.from('inventory').select('item_id'),
        c.from('profile_cosmetics').select('*').eq('user_id', ST.uid).maybeSingle(),
        c.rpc('my_wallet'),
        c.from('profiles').select('nick').eq('id', ST.uid).maybeSingle()
      ]);
      for (const r of [it, inv, cos, w]) if (r.error) throw r.error;
      ST.items = it.data || []; ST.inv = new Set((inv.data || []).map(r => r.item_id));
      ST.eq = cos.data || {}; ST.coins = Number(w.data) || 0; ST.nick = (me.data && me.data.nick) || '';
      ST.loaded = true;
    } catch (e) { ST.err = errText(e); }
    ST.busy = false;
    applyFx(); applyBg();
  }

  /* ---------- визуал ---------- */
  const grad = (d, ang) => `linear-gradient(${ang || 135}deg,${hex(d.c1)},${hex(d.c2)}${d.c3 ? ',' + hex(d.c3) : ''},${hex(d.c1)})`;
  const avaHTML = (nick, eq, size) => {
    const f = item(eq.frame), h = item(eq.hat), d = f ? f.data : {};
    return `<div class="sh-ava" style="--s:${size}px;${f ? `background:${grad(d)};background-size:300% 300%;animation:shpan 3s linear infinite` : ''}"><span>${esc((nick || '?')[0].toUpperCase())}</span>${h ? `<i class="sh-hat">${esc(h.data.emoji || '')}</i>` : ''}</div>`;
  };
  const bannerStyle = it => it ? `background:${grad(it.data, 120)};background-size:300% 300%;animation:shpan 9s ease infinite` : 'background:var(--pn2)';

  function applyFx() {
    let el = g('shfx'); const it = item(ST.eq.fx);
    if (!it || matchMedia('(prefers-reduced-motion:reduce)').matches) { if (el) el.remove(); return; }
    if (!el) { el = document.createElement('div'); el.id = 'shfx'; document.body.appendChild(el); }
    const n = Math.min(+it.data.count || 18, 30), up = it.data.rise ? ' up' : '';
    el.className = up.trim();
    el.innerHTML = Array.from({ length: n }, () => `<span style="left:${(Math.random() * 100).toFixed(1)}%;animation-duration:${(6 + Math.random() * 8).toFixed(1)}s;animation-delay:${(-Math.random() * 12).toFixed(1)}s;font-size:${(12 + Math.random() * 16).toFixed(0)}px">${esc(it.data.emoji || '✦')}</span>`).join('');
  }
  function applyBg() {
    let el = g('shbg'); const it = item(ST.eq.banner);
    if (!it) { if (el) el.remove(); return; }
    if (!el) { el = document.createElement('div'); el.id = 'shbg'; document.body.appendChild(el); }
    el.style.cssText = bannerStyle(it);
  }

  /* ---------- экран ---------- */
  const previewOf = it => it.kind === 'frame' ? avaHTML('A', { frame: it.id }, 54)
    : it.kind === 'hat' ? avaHTML('A', { hat: it.id }, 54)
    : it.kind === 'banner' ? `<div class="sh-bn" style="${bannerStyle(it)}"></div>`
    : `<div class="sh-fxp">${esc(it.data.emoji || '✦')} ${esc(it.data.emoji || '✦')} ${esc(it.data.emoji || '✦')}</div>`;

  function card(it) {
    const own = ST.inv.has(it.id), on = ST.eq[it.kind] === it.id;
    const btn = !own ? `<button class="sh-buy" data-sh="buy" data-id="${esc(it.id)}"${ST.coins < it.price ? ' disabled' : ''}>🪙 ${it.price}</button>`
      : on ? `<button data-sh="unequip" data-k="${it.kind}">Снять</button>` : `<button class="sh-eq" data-sh="equip" data-id="${esc(it.id)}">Надеть</button>`;
    return `<div class="sh-card${on ? ' on' : ''}"><div class="sh-pv">${previewOf(it)}</div><b>${esc(it.name)}</b><small>${esc(it.descr || '')}</small>${btn}</div>`;
  }

  function adminHTML() {
    const rows = (ST.found || []).map(u => `<div class="sh-ar"><b>${esc(u.nick)}</b><span class="d">🪙 ${u.coins}</span>
      <input type="number" data-amt="${esc(u.id)}" value="100" step="10" aria-label="Монеты">
      <button class="sh-eq" data-sh="grant" data-id="${esc(u.id)}">Выдать</button></div>`).join('');
    return `<div class="bar"><input type="search" id="shq" placeholder="Ник пользователя…" value="${esc(ST.q)}"><button data-sh="find">Найти</button></div>
      <p class="d">Видны люди, у которых есть ник (Настройки → Люди). Число с минусом — забрать монеты.</p>
      ${ST.found == null ? '' : (rows || '<div class="empty">Никого не найдено</div>')}`;
  }

  function drawShop() {
    const m = g('main'); if (!m || view !== 'shop') return;
    if (!ST.loaded && !ST.busy) { load().then(drawShop); }
    if (ST.noSess) { m.innerHTML = `<h2>Магазин</h2><div class="empty">Войди в аккаунт (облачный), чтобы покупать косметику и получать монеты.</div>`; return; }
    if (!ST.loaded) { m.innerHTML = `<h2>Магазин</h2><div class="empty">${ST.err ? esc(ST.err) : 'Загружаю…'}</div>`; return; }
    if (ST.err && !ST.items.length) { m.innerHTML = `<h2>Магазин</h2><div class="empty">${esc(ST.err)}</div>`; return; }
    const bn = item(ST.eq.banner);
    const list = ST.items.filter(i => ST.kind === 'all' || i.kind === ST.kind);
    const own = ST.items.filter(i => ST.inv.has(i.id));
    const tabs = [['shop', 'Магазин'], ['mine', 'Мои вещи']].concat(ST.admin ? [['admin', '★ Админ']] : []);
    m.innerHTML = `<div id="shop">
      <div class="sh-top"><h2 style="margin:0">Магазин</h2><div class="sh-coins">🪙 <b>${ST.coins}</b></div></div>
      <div class="sh-prof" style="${bannerStyle(bn)}">${avaHTML(ST.nick || 'Я', ST.eq, 84)}<div><b>${esc(ST.nick || 'Без ника')}</b><small>${ST.admin ? 'Администратор' : 'Твой профиль'}</small></div></div>
      <div class="sh-tabs">${tabs.map(t => `<button data-sh="tab" data-t="${t[0]}" class="${ST.tab === t[0] ? 'on' : ''}">${t[1]}</button>`).join('')}</div>
      ${ST.tab === 'admin' && ST.admin ? adminHTML() : `
        <div class="sh-chips">${[['all', 'Все']].concat(Object.entries(KIND)).map(k => `<button data-sh="kind" data-k="${k[0]}" class="${ST.kind === k[0] ? 'on' : ''}">${k[1]}</button>`).join('')}</div>
        <div class="sh-grid">${(ST.tab === 'mine' ? own.filter(i => ST.kind === 'all' || i.kind === ST.kind) : list).map(card).join('') || '<div class="empty" style="grid-column:1/-1">Пусто</div>'}</div>`}
    </div>`;
  }

  /* ---------- действия ---------- */
  async function rpc(name, args) {
    const c = await getSb(); const r = await c.rpc(name, args); if (r.error) throw r.error; return r.data;
  }
  async function act(fn, ok) {
    try { await fn(); if (ok) toastMsg(ok); } catch (e) { toastMsg(errText(e)); }
    drawShop();
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-sh]'); if (!b || !g('shop')) return;
    const a = b.dataset.sh, id = b.dataset.id;
    if (a === 'tab') { ST.tab = b.dataset.t; drawShop(); }
    else if (a === 'kind') { ST.kind = b.dataset.k; drawShop(); }
    else if (a === 'buy') act(async () => { ST.coins = Number(await rpc('buy_item', { p_item: id })); ST.inv.add(id); }, 'Куплено!');
    else if (a === 'equip') act(async () => { const it = item(id); await rpc('equip_item', { p_kind: it.kind, p_item: id }); ST.eq[it.kind] = id; applyFx(); applyBg(); });
    else if (a === 'unequip') act(async () => { await rpc('equip_item', { p_kind: b.dataset.k, p_item: null }); ST.eq[b.dataset.k] = null; applyFx(); applyBg(); });
    else if (a === 'find') findUsers();
    else if (a === 'grant') {
      const inp = g('main').querySelector(`[data-amt="${CSS.escape(id)}"]`), n = parseInt(inp && inp.value, 10);
      if (!n) return toastMsg('Введи сумму');
      act(async () => { const v = await rpc('admin_grant', { p_user: id, p_amount: n }); const u = (ST.found || []).find(x => x.id === id); if (u) u.coins = Number(v); if (id === ST.uid) ST.coins = Number(v); }, n > 0 ? 'Монеты выданы' : 'Монеты списаны');
    }
  });
  document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target && e.target.id === 'shq') findUsers(); });
  function findUsers() {
    const q = g('shq'); ST.q = q ? q.value.trim() : ST.q;
    act(async () => { ST.found = (await rpc('admin_users', { p_q: ST.q })) || []; });
  }

  /* ---------- встраивание в приложение ---------- */
  try { if (!nav.some(n => n[0] === 'shop')) { const i = nav.findIndex(n => n[0] === 'people'); nav.splice(i >= 0 ? i + 1 : nav.length, 0, ['shop', 'Магазин']); } } catch {}
  const _render = window.render || render;
  render = function () { _render(); if (view === 'shop') drawShop(); };

  // shop.js loads after the first app render. Refresh navigation now so
  // the newly-added Shop entry is visible immediately.
  try {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => { try { render(); } catch (e) { console.warn('Shop nav refresh failed', e); } }, { once: true });
    } else {
      requestAnimationFrame(() => { try { render(); } catch (e) { console.warn('Shop nav refresh failed', e); } });
    }
  } catch (e) { console.warn('Shop nav refresh failed', e); }

  /* рамка и шапка на своей аватарке в разделе «Люди» */
  new MutationObserver(() => {
    const a = document.querySelector('.v12-me .v12-ava:not([data-sh])'); if (!a || !ST.loaded) return;
    a.dataset.sh = '1'; const f = item(ST.eq.frame);
    if (f) { a.style.boxShadow = `0 0 0 3px ${hex(f.data.c1)},0 0 14px ${hex(f.data.c2)}`; }
  }).observe(document.body, { childList: true, subtree: true });

  const css = document.createElement('style');
  css.textContent = `
@keyframes shpan{0%{background-position:0 50%}50%{background-position:100% 50%}100%{background-position:0 50%}}
@keyframes shfall{from{transform:translateY(-8vh) rotate(0)}to{transform:translateY(110vh) rotate(360deg)}}
@keyframes shrise{from{transform:translateY(110vh) rotate(0)}to{transform:translateY(-10vh) rotate(-40deg)}}
#nav button[data-v=shop]::before{content:"🛍";font-size:16px}
#shfx{position:fixed;inset:0;z-index:2;pointer-events:none;overflow:hidden}
#shfx span{position:absolute;top:0;opacity:.8;animation:shfall linear infinite}
#shfx.up span{animation-name:shrise}
#shbg{position:fixed;inset:0;z-index:0;pointer-events:none;opacity:.22}
#shop{max-width:980px}
.sh-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
.sh-coins{padding:8px 16px;border-radius:20px;background:var(--pn2);color:var(--ac);font-size:16px}
.sh-prof{display:flex;gap:18px;align-items:center;padding:22px;border-radius:20px;margin-bottom:16px;color:#fff;text-shadow:0 1px 6px #000a}
.sh-prof small{display:block;opacity:.85}
.sh-ava{position:relative;width:var(--s);height:var(--s);flex:none;border-radius:50%;display:grid;place-items:center;padding:calc(var(--s)*.06);background:var(--ln)}
.sh-ava span{width:100%;height:100%;border-radius:50%;display:grid;place-items:center;background:var(--pn);color:var(--tx);font-weight:800;font-size:calc(var(--s)*.4);text-shadow:none}
.sh-hat{position:absolute;top:calc(var(--s)*-.34);left:50%;transform:translateX(-50%) rotate(-12deg);font-style:normal;font-size:calc(var(--s)*.5)}
.sh-tabs,.sh-chips{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 12px}
.sh-tabs button,.sh-chips button{padding:8px 14px;border-radius:14px;background:var(--pn);color:var(--mu);font-weight:700}
.sh-tabs button.on,.sh-chips button.on{background:var(--ac);color:var(--bg)}
.sh-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:14px;padding-top:26px}
.sh-card{background:var(--pn);border:1px solid var(--ln);border-radius:16px;padding:12px;display:flex;flex-direction:column;gap:6px}
.sh-card.on{border-color:var(--ac)}
.sh-pv{height:78px;display:grid;place-items:center;margin-bottom:2px}
.sh-bn{width:100%;height:60px;border-radius:12px}
.sh-fxp{font-size:24px;letter-spacing:6px}
.sh-card button{margin-top:auto;background:var(--pn2);font-weight:700}
.sh-card .sh-buy,.sh-eq{background:var(--ac)!important;color:var(--bg)!important}
.sh-card button:disabled{opacity:.45;cursor:not-allowed}
.sh-ar{display:flex;gap:10px;align-items:center;padding:8px 12px;border-radius:12px;background:var(--pn);margin-bottom:6px}
.sh-ar b{flex:1}.sh-ar input{width:96px;background:var(--pn2);border:1px solid var(--ln);border-radius:10px;padding:6px 8px}
@media(prefers-reduced-motion:reduce){#shfx{display:none}.sh-ava,.sh-prof,.sh-bn{animation:none!important}}`;
  document.head.appendChild(css);

  /* применить купленное сразу после загрузки сайта, не открывая магазин */
  setTimeout(() => { if (!ST.loaded && !ST.busy) load(); }, 2000);
})();
