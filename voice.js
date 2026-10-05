/*
  voice.js — голосовое управление v11

  Что умеет:
  • обращение по имени («Вась, следующая») — имя меняется в настройках;
  • тихие звуковые сигналы вместо голосового ответа (услышал / выполнил / не понял);
  • музыка сама становится тише, пока слушает, — можно говорить вполголоса;
  • много команд, у каждой свои фразы, которые можно менять, выключать и добавлять;
  • «назад» = предыдущая песня (раньше перематывало в начало);
  • перемотка («перемотай на 20 секунд»), «сначала»/«заново», громкость числом;
  • поиск голосом: «Вась, найди Земфира Ромашки» — сначала в твоей музыке, потом в интернете.
*/
(() => {
  'use strict';

  const KEY = 'v11_voice';
  const DEF = {
    enabled: false,
    name: 'Вась',
    aliases: 'вася, васи, васю, васе, васей',
    mode: 'wake',            // wake — только по имени, always — слушать команды без имени
    windowSec: 8,            // сколько секунд после имени можно говорить без имени
    keepOpen: true,          // после команды продолжать слушать (чтобы сказать «громче» несколько раз)
    sound: true, soundStyle: 'soft', soundVol: 0.35, closeSound: false, errSound: true,
    duck: true, duckLevel: 0.25,
    seekStep: 10, volStep: 10,
    searchSource: 'both',    // both — сначала моя музыка, потом интернет; lib; web
    minConf: 0.3,
    lang: 'auto',
    voiceURI: '',
    phrases: {}, off: {}, noWake: {},
    speak: true, speakRate: 1.02, speakPitch: 1, speakVolume: 0.85
  };
  let cfg = JSON.parse(JSON.stringify(DEF));
  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s) cfg = Object.assign(cfg, s); } catch {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch {} };

  /* ---------------- текст ---------------- */
  const norm = s => String(s || '').toLowerCase().replace(/ё/g, 'е')
    .replace(/[^a-zа-я0-9:\s-]/g, ' ').replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
  const tok = s => norm(s).split(' ').filter(Boolean);
  const hx = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function lev(a, b) {
    if (a === b) return 0;
    const m = a.length, n = b.length; if (!m) return n; if (!n) return m;
    let p = Array.from({ length: n + 1 }, (_, i) => i);
    for (let i = 1; i <= m; i++) {
      const c = [i];
      for (let j = 1; j <= n; j++) c[j] = Math.min(p[j] + 1, c[j - 1] + 1, p[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      p = c;
    }
    return p[n];
  }
  // нечёткое сравнение только для длинных слов: «включи» и «выключи» отличаются на 1 букву, их путать нельзя
const same = (a, b) => a === b || (a.length >= 8 && b.length >= 8 && lev(a, b) <= 1);

  const NW = { ноль: 0, один: 1, одна: 1, одну: 1, два: 2, две: 2, три: 3, четыре: 4, пять: 5, шесть: 6, семь: 7, восемь: 8, девять: 9, десять: 10,
    одиннадцать: 11, двенадцать: 12, тринадцать: 13, четырнадцать: 14, пятнадцать: 15, шестнадцать: 16, семнадцать: 17, восемнадцать: 18, девятнадцать: 19,
    двадцать: 20, тридцать: 30, сорок: 40, пятьдесят: 50, шестьдесят: 60, семьдесят: 70, восемьдесят: 80, девяносто: 90, сто: 100 };
  function numAt(t, i) {
    const w = t[i]; if (w === undefined) return null;
    if (/^\d+$/.test(w)) return [+w, 1];
    if (NW[w] !== undefined) {
      let v = NW[w], n = 1;
      if (v >= 20 && v < 100 && NW[t[i + 1]] !== undefined && NW[t[i + 1]] > 0 && NW[t[i + 1]] < 10) { v += NW[t[i + 1]]; n = 2; }
      return [v, n];
    }
    return null;
  }
  function parseAmount(t) {          // секунды или null
    for (let i = 0; i < t.length; i++) {
      if (t[i] === 'полминуты') return 30;
      const n = numAt(t, i);
      if (n) { const u = t[i + n[1]] || ''; return /^мин/.test(u) ? n[0] * 60 : n[0]; }
    }
    if (t.some(w => /^минут/.test(w))) return 60;
    return null;
  }

  /* ---------------- имя ---------------- */
  const PRE = new Set(['эй', 'ну', 'слушай', 'так', 'привет', 'окей', 'ок', 'хей', 'а', 'и', 'слышь', 'алло', 'ой']);
  function nameList() {
    return [cfg.name, ...String(cfg.aliases || '').split(',')].map(tok).filter(x => x.length);
  }
  function nameAt(t, k) {            // сколько слов занимает имя в позиции k (0 — не имя)
    for (const nm of nameList()) {
      if (nm.length === 1) {
        const n = nm[0], w = t[k];
        if (w === undefined) continue;
        if (w === n || (n.length >= 5 && w.length >= 4 && lev(w, n) <= 1)) return 1;
      } else if (nm.every((x, j) => t[k + j] === x)) return nm.length;
    }
    return 0;
  }
  function analyze(text) {
    const tokens = tok(text);
    for (let k = 0; k < Math.min(4, tokens.length); k++) {
      if (k > 0 && !PRE.has(tokens[k - 1])) break;
      const n = nameAt(tokens, k);
      if (n) return { text, tokens, wake: true, rest: tokens.slice(k + n) };
    }
    return { text, tokens, wake: false, rest: tokens };
  }

  /* ---------------- доступ к плееру (глобалы страницы) ---------------- */
  const g = f => { try { return f(); } catch { return undefined; } };
  const P = {
    isYT: () => g(() => isYT()) === true,
    playing: () => {
      if (P.isYT()) { const s = g(() => yp.getPlayerState()); return s === 1 || s === 3; }
      return !g(() => au.paused);
    },
    time: () => (P.isYT() ? g(() => yp.getCurrentTime()) : g(() => au.currentTime)) || 0,
    dur: () => (P.isYT() ? g(() => yp.getDuration()) : g(() => au.duration)) || 0,
    seek: t => {
      t = Math.max(0, t);
      if (P.isYT()) g(() => yp.seekTo(t, true));
      else { g(() => { au.currentTime = t; }); }
    },
    cur: () => g(() => T.get(S.cur)),
    list: () => (g(() => ctxList) || []).filter(x => g(() => T.has(x))),
    pause: () => { if (!P.playing()) return; if (typeof fadePause === 'function' && !P.isYT()) fadePause(); else toggle(); },
    resume: () => { if (P.playing()) return; if (!g(() => S.cur)) { const l = P.list(); if (l.length) return play(l[0], l); return; } toggle(); }
  };

  /* предыдущая песня: в перемешанном режиме — по реальной истории прослушивания */
  const trail = []; let lastCur = null, backing = false;
  if (typeof document !== 'undefined') setInterval(() => {
    const c = g(() => S.cur);
    if (c !== lastCur) {
      if (lastCur != null && !backing) { trail.push(lastCur); if (trail.length > 60) trail.shift(); }
      backing = false; lastCur = c;
    }
  }, 250);
  function goPrev() {
    let id = null;
    if (g(() => S.shuf)) {
      while (trail.length) { const x = trail.pop(); if (x !== S.cur && g(() => T.has(x))) { id = x; break; } }
    }
    if (!id) {
      const l = P.list(), i = l.indexOf(S.cur);
      id = l[i > 0 ? i - 1 : l.length - 1];
    }
    if (!id) return false;
    backing = true; play(id); return true;
  }
  function restart() { P.seek(0); if (!P.playing()) P.resume(); }

  /* ---------------- поиск ---------------- */
  const stem = w => (w.length > 5 ? w.slice(0, w.length - 2) : w.length > 3 ? w.slice(0, w.length - 1) : w);
  const tokHit = (q, h) => { if (q === h) return true; const a = stem(q), b = stem(h); return a === b || (a.length >= 3 && h.startsWith(a)) || (b.length >= 4 && q.startsWith(b)); };
  function libSearch(q) {
    const qt = tok(q); if (!qt.length) return [];
    const res = [];
    for (const t of g(() => [...T.values()]) || []) {
      if (t.tmp) continue;
      const ht = tok(`${t.artist || ''} ${t.title || ''} ${t.album || ''}`);
      const hit = qt.filter(w => ht.some(h => tokHit(w, h))).length;
      const cov = hit / qt.length;
      if (cov >= (qt.length >= 3 ? 0.67 : 1)) res.push({ id: t.id, cov });
    }
    res.sort((a, b) => b.cov - a.cov);
    const best = res.length ? res[0].cov : 0;
    return res.filter(x => x.cov === best).map(x => x.id).slice(0, 60);
  }
  /* Нормализация популярных исполнителей: распознавание речи часто
     режет имена на слова или искажает их. Перед отправкой запроса
     приводим наиболее частые варианты к каноническому имени. */
  const ARTIST_ALIASES = [
    ['морген штерн','MORGENSHTERN'], ['моргенштерн','MORGENSHTERN'], ['морген стерн','MORGENSHTERN'],
    ['морген','MORGENSHTERN'], ['моргенштер','MORGENSHTERN'],
    ['оксимирон','Oxxxymiron'], ['оксими рон','Oxxxymiron'], ['окси','Oxxxymiron'],
    ['скриптонит','Скриптонит'], ['скрип тонит','Скриптонит'],
    ['мияги','Miyagi & Andy Panda'], ['ми яги','Miyagi & Andy Panda'],
    ['макс корж','Макс Корж'], ['макскорж','Макс Корж'],
    ['каспийский груз','Каспийский Груз'], ['каспийскийгруз','Каспийский Груз'],
    ['хлеб','Хлеб'], ['егор крид','Егор Крид'], ['мот','Мот'],
    ['лсп','ЛСП'], ['элджей','Элджей'], ['земфира','Земфира'],
    ['кино','Кино'], ['ленинград','Ленинград']
  ];
  function smartArtistQuery(q) {
    let s = norm(q);
    for (const [a, canon] of ARTIST_ALIASES) {
      if (s.includes(a)) return canon + s.replace(a, '');
    }
    // Если речь дала близкое написание длинного имени, попробуем
    // сопоставить его с известными исполнителями по расстоянию.
    const words = s.split(' ').filter(Boolean);
    let best = null;
    for (const [a, canon] of ARTIST_ALIASES) {
      const aw = a.split(' ');
      if (aw.length === 1 && words.length) {
        for (const w of words) {
          if (w.length >= 5 && a.length >= 5) {
            const d = lev(w, a);
            if (d <= Math.max(1, Math.floor(a.length * .25)) && (!best || d < best.d)) best = {d, canon, w};
          }
        }
      }
    }
    if (best) s = s.replace(best.w, best.canon);
    return s;
  }

  function worldResult(n, action, extra) {
    n = Number(n);
    if (!Number.isFinite(n) || n < 1 || n > (g(() => WR.length) || 0)) { toast('Нет результата с номером ' + n); return 'Нет такого результата'; }
    const w = WR[n - 1], id = ing(w);
    if (action === 'play') { play(id, WR.map(ing)); toast(`▶ ${n}. ${w.artist} — ${w.title}`); return `Включил ${w.artist} — ${w.title}`; }
    if (action === 'pause') { play(id, WR.map(ing)); P.pause(); toast(`⏸ ${n}. ${w.artist} — ${w.title}`); return `Остановил ${w.artist} — ${w.title}`; }
    if (action === 'like') { if (!S.fav.includes(id)) S.fav=[...S.fav,id]; persist(); ui(); return `Поставил лайк: ${w.artist} — ${w.title}`; }
    if (action === 'playlist') {
      let pl = S.pl[0];
      const name = extra && extra.trim();
      if (name) pl = S.pl.find(x=>norm(x.name)===norm(name)) || S.pl.find(x=>norm(x.name).includes(norm(name)) || norm(name).includes(norm(x.name)));
      if (!pl) { pl={id:crypto.randomUUID(),name:name||'Мой плейлист',ids:[]}; S.pl.push(pl); }
      addToPl([id], pl);
      return `Добавил ${w.title} в «${pl.name}»`;
    }
    return null;
  }

  async function runSearch({ q, force }) {
    q = smartArtistQuery(q);
    const src = force || cfg.searchSource;
    if (src !== 'web') {
      const ids = libSearch(q);
      if (ids.length) { play(ids[0], ids); const t = T.get(ids[0]); toast(`Нашёл в музыке: ${t.artist} — ${t.title}`); return 'Из моей музыки'; }
      if (src === 'lib') { toast('В моей музыке нет: ' + q); throw new Error('нет'); }
    }
    if (g(() => WBUSY)) { toast('Поиск уже идёт…'); return 'Ищу…'; }
    WQ = q; await wsearch();
    if (WR && WR.length) { const ids = WR.map(ing); play(ids[0], ids); toast(`Нашёл: ${WR[0].artist} — ${WR[0].title}`); return 'Из интернета'; }
    toast('Ничего не нашёл: ' + q); throw new Error('пусто');
  }

  /* ---------------- команды ---------------- */
  const FILL = new Set('пожалуйста ну давай же мне ка еще пока эту ее его песню песня трек музыку уже теперь опять тогда и а мою'.split(' '));
  const SEEK_OK = new Set('на секунд секунду секунды минут минуту минуты пол полминуты числа чуть немного еще вперед назад обратно в к самое начало началу середину середине'.split(' '));
  const C = [];
  const simple = (id, label, def, run, extra) => C.push(Object.assign({ id, label, kind: 'simple', def, run }, extra));
  const arg = (id, label, def, parse, run, extra) => C.push(Object.assign({ id, label, kind: 'arg', def, parse, run }, extra));
  const volTo = v => { setVol(v); };

  const ML = {
    ru: {pause:['пауза','останови музыку','выключи музыку'],resume:['продолжи','включи музыку'],next:['следующая песня','следующий трек','дальше'],prev:['предыдущая песня','предыдущий трек','назад'],like:['лайкни','поставь лайк','поставь сердечко'],unlike:['убери лайк','сними лайк'],mute:['выключи звук'],unmute:['включи звук'],search:['найди','поищи','включи','поставь','сыграй']},
    en: {pause:['pause','pause the music','stop the music'],resume:['resume','continue','play','play music'],next:['next song','next track','next'],prev:['previous song','previous track','previous'],like:['like it','like this','add a like'],unlike:['unlike it','remove the like'],mute:['mute','mute the music'],unmute:['unmute','turn sound on'],search:['find','search for','play','put on','play me']},
    uk: {pause:['пауза','зупини музику','вимкни музику'],resume:['продовжуй','продовжити','увімкни музику'],next:['наступна пісня','наступний трек','далі'],prev:['попередня пісня','попередній трек','назад'],like:['постав лайк','постав сердечко'],unlike:['прибери лайк','зніми лайк'],mute:['вимкни звук'],unmute:['увімкни звук'],search:['знайди','пошукай','увімкни','постав','зіграй']},
    de: {pause:['pause','musik pausieren','musik stoppen'],resume:['weiter','fortsetzen','musik abspielen'],next:['nächstes lied','nächster titel','weiter'],prev:['vorheriges lied','vorheriger titel','zurück'],like:['like geben','liken'],unlike:['like entfernen'],mute:['ton aus','stummschalten'],unmute:['ton an'],search:['finde','suche','spiel','spiele']},
    es: {pause:['pausa','pausa la música','detén la música'],resume:['continúa','reanuda','reproduce música'],next:['siguiente canción','siguiente pista','siguiente'],prev:['canción anterior','pista anterior','anterior'],like:['dale me gusta','me gusta'],unlike:['quita el me gusta'],mute:['silenciar','quita el sonido'],unmute:['activa el sonido'],search:['busca','buscar','reproduce','pon']},
    fr: {pause:['pause','mets la musique en pause','arrête la musique'],resume:['reprends','continue','joue la musique'],next:['chanson suivante','piste suivante','suivante'],prev:['chanson précédente','piste précédente','précédente'],like:['aime ça','mets un j’aime'],unlike:['retire le j’aime'],mute:['coupe le son','muet'],unmute:['remets le son'],search:['cherche','recherche','joue','mets']},
    pl: {pause:['pauza','zatrzymaj muzykę'],resume:['wznów','kontynuuj','włącz muzykę'],next:['następna piosenka','następny utwór','dalej'],prev:['poprzednia piosenka','poprzedni utwór','wstecz'],like:['polub','daj lajka'],unlike:['usuń lajka'],mute:['wycisz','wyłącz dźwięk'],unmute:['włącz dźwięk'],search:['znajdź','wyszukaj','włącz','odtwórz']},
    tr: {pause:['duraklat','müziği durdur'],resume:['devam et','müziği aç'],next:['sonraki şarkı','sonraki parça','sonraki'],prev:['önceki şarkı','önceki parça','geri'],like:['beğen','beğeni ekle'],unlike:['beğeniyi kaldır'],mute:['sesi kapat'],unmute:['sesi aç'],search:['bul','ara','çal','aç']},
    it: {pause:['pausa','metti in pausa la musica'],resume:['continua','riprendi','riproduci musica'],next:['prossima canzone','brano successivo','avanti'],prev:['canzone precedente','brano precedente','indietro'],like:['metti mi piace','mi piace'],unlike:['rimuovi mi piace'],mute:['silenzia','disattiva audio'],unmute:['attiva audio'],search:['cerca','trova','riproduci','metti']},
    pt: {pause:['pausa','pause a música','pare a música'],resume:['continuar','retomar','toque música'],next:['próxima música','próxima faixa','próxima'],prev:['música anterior','faixa anterior','anterior'],like:['curtir','dê like'],unlike:['remover curtida'],mute:['silenciar','desligar som'],unmute:['ligar som'],search:['encontre','pesquise','toque','coloque']},
    ja: {pause:['一時停止','音楽を止めて'],resume:['再生','音楽を再生して'],next:['次の曲','次へ'],prev:['前の曲','戻って'],like:['いいねして','お気に入りに'],unlike:['いいねを外して'],mute:['ミュート','音を消して'],unmute:['ミュート解除','音を出して'],search:['探して','検索して','再生して']},
    ko: {pause:['일시정지','음악을 멈춰'],resume:['재생','음악 재생해'],next:['다음 노래','다음 곡','다음'],prev:['이전 노래','이전 곡','이전'],like:['좋아요','좋아요 눌러'],unlike:['좋아요 취소'],mute:['음소거','소리 꺼'],unmute:['소리 켜'],search:['찾아줘','검색해','재생해']},
    zh: {pause:['暂停','暂停音乐'],resume:['继续播放','播放音乐'],next:['下一首','下一首歌'],prev:['上一首','上一首歌'],like:['点赞','喜欢这首'],unlike:['取消点赞'],mute:['静音','关闭声音'],unmute:['打开声音'],search:['找一下','搜索','播放']},
  };
  const addML = (id, key) => { const c = C.find(x=>x.id===id); if (!c) return; Object.values(ML).forEach(x=>{ if(x[key]) c.def.push(...x[key]); }); };

  simple('pause', 'Пауза', ['пауза', 'стоп', 'останови', 'остановись', 'останови музыку', 'хватит', 'на паузу', 'поставь на паузу', 'постой', 'погоди', 'подожди', 'замри', 'притормози', 'выключи музыку', 'отключи музыку'], () => P.pause());
  simple('resume', 'Продолжить', ['продолжить', 'продолжай', 'продолжи', 'продолжи музыку', 'играй', 'играй дальше', 'включи', 'включи музыку', 'возобнови', 'давай', 'давай играй', 'поехали', 'плей', 'воспроизведи', 'запускай', 'запусти музыку', 'врубай', 'врубай музыку', 'снять с паузы', 'отпусти паузу', 'не останавливайся'], () => P.resume());
  simple('next', 'Следующая', ['дальше', 'далее', 'следующая', 'следующий', 'следующую', 'следующий трек', 'следующая песня', 'скип', 'пропусти', 'пропусти песню', 'другая', 'другую', 'другую песню', 'не та', 'не эта', 'не то', 'переключи', 'переключи песню', 'смени', 'смени песню', 'листай', 'вперед'], () => next(false));
  simple('prev', 'Предыдущая', ['назад', 'предыдущая', 'предыдущий', 'предыдущую', 'предыдущая песня', 'прошлая', 'прошлую', 'прошлый', 'прошлый трек', 'прошлая песня', 'вернись', 'вернись назад', 'верни прошлую', 'верни предыдущую', 'на прошлую', 'на предыдущую', 'вернуть назад', 'бэк'], () => { if (!goPrev()) restart(); });
  simple('restart', 'Сначала', ['сначала', 'заново', 'с начала', 'начни заново', 'начать заново', 'еще раз', 'повтори', 'повтори песню', 'с самого начала', 'в начало', 'на начало', 'перезапусти', 'рестарт'], () => restart());
  simple('volUp', 'Громче', ['громче', 'погромче', 'еще громче', 'прибавь', 'прибавь звук', 'добавь звук', 'добавь громкость', 'сделай громче', 'повысь громкость'], () => volTo(Math.min(1, S.vol + cfg.volStep / 100)));
  simple('volDown', 'Тише', ['тише', 'потише', 'еще тише', 'убавь', 'убавь звук', 'убавь громкость', 'сделай тише', 'понизь громкость'], () => volTo(Math.max(0, S.vol - cfg.volStep / 100)));
  simple('mute', 'Без звука', ['выключи звук', 'без звука', 'беззвучно', 'заглуши'], () => { if (!muted) document.getElementById('mu').click(); });
  simple('unmute', 'Вернуть звук', ['включи звук', 'верни звук', 'со звуком'], () => { if (muted) document.getElementById('mu').click(); else if (S.vol === 0) volTo(0.5); });
  simple('repeatOn', 'Повторять песню', ['повторяй', 'зациклить', 'зацикли', 'включи повтор', 'повтор'], () => { S.rep = 2; persist(); ui(); });
  simple('repeatOff', 'Не повторять', ['не повторяй', 'выключи повтор', 'отмени повтор'], () => { S.rep = 0; persist(); ui(); });
  simple('shufOn', 'Перемешать', ['перемешай', 'вперемешку', 'включи перемешивание', 'случайный порядок'], () => { S.shuf = true; persist(); ui(); });
  simple('shufOff', 'По порядку', ['по порядку', 'выключи перемешивание', 'без перемешивания'], () => { S.shuf = false; persist(); ui(); });
  simple('like', 'В избранное', ['лайк', 'лайкни', 'поставь лайк', 'поставь сердечко', 'сердечко', 'нравится', 'мне нравится', 'добавь лайк', 'в избранное', 'добавь в избранное', 'добавь эту песню в избранное'], () => { const id = S.cur; if (id && !S.fav.includes(id)) { S.fav = [...S.fav, id]; persist(); ui(); } });
  simple('unlike', 'Убрать из избранного', ['убери лайк', 'сними лайк', 'убери сердечко', 'сними сердечко', 'убери из избранного', 'не нравится'], () => {
    const id = S.cur; if (!id) return 'Ничего не играет';
    if (S.fav.includes(id)) { S.fav = S.fav.filter(x => x !== id); persist(); ui(); }
    return 'Убрал из избранного';
  });
  arg('addPlaylist', 'Добавить в плейлист', ['добавь в плейлист', 'добавь эту песню в плейлист', 'положи в плейлист', 'закинь в плейлист', 'засунь в плейлист'], rest => {
    const raw = rest.join(' ').replace(/^['"«»]+|['"«»]+$/g, '').trim();
    return { name: raw };
  }, a => {
    const id = S.cur; if (!id) return 'Ничего не играет';
    if (!S.pl.length) {
      const p = {id: crypto.randomUUID(), name: a.name || 'Мой плейлист', ids: []};
      S.pl.push(p); addToPl([id], p); return `Создал «${p.name}» и добавил песню`;
    }
    let p = a.name ? S.pl.find(x => norm(x.name) === norm(a.name)) : null;
    if (!p && a.name) p = S.pl.find(x => norm(x.name).includes(norm(a.name)) || norm(a.name).includes(norm(x.name)));
    if (!p && !a.name && S.pl.length === 1) p = S.pl[0];
    if (!p && !a.name) {
      // голосом нельзя надёжно выбрать пункт визуального меню — добавляем в первый плейлист;
      // при этом не создаём дубликат.
      p = S.pl[0];
    }
    addToPl([id], p);
    return `Добавил в «${p.name}»`;
  }, { needWake: true });
  simple('stopSpeaking', 'Замолчать', ['замолчи', 'тише голос', 'выключи голос', 'не говори'], () => { cfg.speak = false; save(); stopSpeaking(); return 'Голосовые ответы выключены'; }, { noWake: false });
  simple('speakOn', 'Включить голос', ['включи голос', 'говори', 'отвечай голосом', 'голосовые ответы'], () => { cfg.speak = true; save(); return 'Голосовые ответы включены'; });
  simple('lyricsOpen', 'Показать текст', ['текст', 'покажи текст', 'открой текст', 'слова', 'покажи слова', 'караоке', 'включи караоке'], () => window.openKaraoke && window.openKaraoke());
  simple('lyricsClose', 'Закрыть текст', ['закрой текст', 'скрой текст', 'убери текст', 'закрой караоке'], () => window.closeKaraoke && window.closeKaraoke());
  simple('whatPlays', 'Что играет', ['что играет', 'что за песня', 'что это', 'как называется'], () => { const t = P.cur(); const m = t ? `${t.artist} — ${t.title}` : 'Ничего не играет'; toast(m); return m; });
  simple('results', 'Показать результаты поиска', ['покажи результаты', 'покажи поиск', 'открой поиск'], () => { view = 'web'; render(); });
  simple('sleep', 'Отбой', ['отбой', 'спасибо', 'свободен', 'отмена'], () => closeWindow(), { noExec: true });

  arg('seek', 'Перемотка', ['перемотай', 'промотай', 'отмотай', 'мотай', 'вперед', 'назад', 'перемотай на', 'перейди на', 'на', 'к'], (rest, t) => {
    const all = t.join(' ');
    if (!rest.every(w => SEEK_OK.has(w) || numAt([w], 0) || /^\d+:\d+$/.test(w))) return null;
    let m = all.match(/(?:на|к)\s+(\d{1,2}):(\d{2})/); if (m) return { abs: +m[1] * 60 + +m[2] };
    if (/начал/.test(all)) return { abs: 0 };
    if (/середин/.test(all)) return { frac: 0.5 };
    const dir = t.some(w => w === 'назад' || w === 'обратно' || w === 'отмотай') ? -1 : 1;
    const a = parseAmount(rest);
    return { sec: (a == null ? cfg.seekStep : a) * dir };
  }, a => {
    const d = P.dur(), cur = P.time();
    if (a.abs != null) P.seek(a.abs); else if (a.frac != null) P.seek(d * a.frac);
    else P.seek(Math.min(d ? d - 1 : 1e9, cur + a.sec));
    return a.sec ? (a.sec > 0 ? '⏩ +' : '⏪ −') + Math.abs(a.sec) + ' с' : '';
  });

  arg('volSet', 'Громкость числом', ['громкость', 'громкость на', 'звук на', 'уровень звука'], rest => {
    const all = rest.join(' ');
    if (/максим|полную|полност/.test(all)) return { v: 1 };
    if (/миним/.test(all)) return { v: 0.1 };
    if (/половин|средн/.test(all)) return { v: 0.5 };
    for (let i = 0; i < rest.length; i++) { const n = numAt(rest, i); if (n) return { v: n[0] <= 10 ? n[0] / 10 : Math.min(100, n[0]) / 100 }; }
    return null;
  }, a => { volTo(a.v); return 'Громкость ' + Math.round(a.v * 100) + '%'; });

  const RESULT_WORDS = new Set(['результат','результата','номер','номерок','пункт','песню','трек']);
  function parseResultRef(rest) {
    const r = rest.slice();
    while (r.length && (RESULT_WORDS.has(r[0]) || r[0] === 'под' || r[0] === 'из')) r.shift();
    for (let i=0;i<r.length;i++) { const n=numAt(r,i); if(n) return {n:n[0], tail:r.slice(i+n[1])}; }
    return null;
  }
  arg('resultPlay','Включить результат по номеру',['включи','включить','запусти','запустить','поставь','сыграй'],rest=>parseResultRef(rest),a=>worldResult(a.n,'play'),{needWake:true});
  arg('resultPause','Выключить результат по номеру',['выключи','выключить','останови','остановить','поставь на паузу'],rest=>parseResultRef(rest),a=>worldResult(a.n,'pause'),{needWake:true});
  arg('resultLike','Лайк результата',['лайкни','лайкнуть','поставь лайк','поставь сердечко','сердечко'],rest=>parseResultRef(rest),a=>worldResult(a.n,'like'),{needWake:true});
  arg('resultPlaylist','Добавить результат в плейлист',['добавь','добавить','закинь','закинуть','положи','положить'],rest=>{
    const a=parseResultRef(rest); if(!a) return null;
    const tail=a.tail.join(' '); const m=tail.match(/(?:в|в мой|в мою|в плейлист)\s+(.+)/);
    return {n:a.n,name:m?m[1].trim():''};
  },a=>worldResult(a.n,'playlist',a.name),{needWake:true});

  const SQ_LEAD = new Set('мне пожалуйста песню трек композицию музыку группу исполнителя артиста что нибудь такую'.split(' '));
  arg('search', 'Поиск песни', ['найди', 'поищи', 'найти', 'поиск', 'включи', 'поставь', 'запусти', 'сыграй', 'играй', 'хочу послушать', 'давай послушаем'], rest => {
    let s = rest.join(' '), force = null;
    if (/(?:в|на)\s+(?:ютубе|ютюбе|youtube|интернете|мире)|онлайн/.test(s)) { force = 'web'; s = s.replace(/(?:в|на)\s+(?:ютубе|ютюбе|youtube|интернете|мире)|онлайн/g, ' '); }
    else if (/(?:из|в)\s+(?:моей\s+)?(?:музыке|музыки|библиотеке|библиотеки|медиатеке|медиатеки)|у меня/.test(s)) { force = 'lib'; s = s.replace(/(?:из|в)\s+(?:моей\s+)?(?:музыке|музыки|библиотеке|библиотеки|медиатеке|медиатеки)|у меня/g, ' '); }
    const w = s.split(' ').filter(Boolean); while (w.length && SQ_LEAD.has(w[0])) w.shift();
    const q = w.join(' ').trim();
    return q ? { q, force } : null;
  }, a => runSearch(a), { needWake: true });

  addML('pause','pause'); addML('resume','resume'); addML('next','next'); addML('prev','prev');
  addML('like','like'); addML('unlike','unlike'); addML('mute','mute'); addML('unmute','unmute');
  addML('search','search');

  const phr = c => (cfg.phrases[c.id] && cfg.phrases[c.id].length ? cfg.phrases[c.id] : c.def);
  const enabled = c => !cfg.off[c.id];

  function simpleScore(t, pt) {
    if (!pt.length || t.length > pt.length + 2) return -1;
    for (let i = 0; i + pt.length <= t.length; i++) {
      if (!pt.every((w, j) => same(t[i + j], w))) continue;
      const left = t.filter((_, j) => j < i || j >= i + pt.length);
      if (!left.every(w => FILL.has(w))) continue;
      if (left.includes('не') && pt[0] !== 'не') continue;
      return pt.length - left.length;
    }
    return -1;
  }
  function resolve(tokens) {
    const t = tokens.filter(w => w !== 'пожалуйста');
    if (!t.length) return null;
    let best = null;
    for (const c of C) {
      if (c.kind !== 'simple' || !enabled(c)) continue;
      for (const p of phr(c)) { const s = simpleScore(t, tok(p)); if (s >= 0 && (!best || s > best.s)) best = { c, s }; }
    }
    if (best) return { cmd: best.c, args: null };
    for (const c of C) {
      if (c.kind !== 'arg' || !enabled(c)) continue;
      for (const p of phr(c)) {
        const pt = tok(p);
        if (pt.length && pt.every((w, j) => same(t[j] || '', w))) {
          const a = c.parse(t.slice(pt.length), t, pt);
          if (a) return { cmd: c, args: a };
        }
      }
    }
    return null;
  }

  /* ---------------- тесты в Node ---------------- */
  if (typeof document === 'undefined') {
    const dry = text => { const a = analyze(text); const r = resolve(a.wake ? a.rest : a.tokens); return { wake: a.wake, cmd: r && r.cmd.id, args: r && r.args }; };
    module.exports = { dry, analyze, resolve, cfg, libSearch: libSearch, norm };
    return;
  }

  /* ---------------- звуки ---------------- */
  let ac = null;
  function actx() {
    if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch {} }
    if (ac && ac.state === 'suspended') ac.resume().catch(() => {});
    return ac;
  }
  const STYLES = {
    soft: { type: 'sine', k: 1, label: 'Мягкий' },
    bell: { type: 'triangle', k: 2.4, label: 'Колокольчик' },
    click: { type: 'square', k: 0.45, label: 'Щелчок' }
  };
  const PAT = {
    wake: [[660, 0, 0.09], [990, 0.085, 0.13]],
    ok: [[880, 0, 0.07]],
    err: [[330, 0, 0.1], [247, 0.09, 0.14]],
    on: [[523, 0, 0.08], [659, 0.08, 0.08], [784, 0.16, 0.12]],
    off: [[784, 0, 0.08], [659, 0.08, 0.08], [523, 0.16, 0.12]],
    close: [[784, 0, 0.07], [587, 0.07, 0.1]]
  };
  let lastErr = 0;
  function sound(name, force) {
    if (!cfg.sound && !force) return;
    if (name === 'err') { if (!cfg.errSound && !force) return; const n = Date.now(); if (n - lastErr < 1500) return; lastErr = n; }
    if (name === 'close' && !cfg.closeSound && !force) return;
    const a = actx(); if (!a) return;
    const st = STYLES[cfg.soundStyle] || STYLES.soft;
    const peak = Math.max(0.0005, cfg.soundVol * (st.type === 'square' ? 0.25 : 0.5));
    const t0 = a.currentTime + 0.01;
    for (const [f, d, len] of PAT[name] || []) {
      const o = a.createOscillator(), gn = a.createGain();
      o.type = st.type; o.frequency.value = f;
      gn.gain.setValueAtTime(0.0001, t0 + d);
      gn.gain.exponentialRampToValueAtTime(peak, t0 + d + 0.008);
      gn.gain.exponentialRampToValueAtTime(0.0001, t0 + d + len * st.k + 0.02);
      o.connect(gn); gn.connect(a.destination);
      o.start(t0 + d); o.stop(t0 + d + len * st.k + 0.05);
    }
  }
  document.addEventListener('pointerdown', () => actx(), { once: true, capture: true });

  /* ---------------- локальный голос-ответ ---------------- */
  let speakT = 0, speaking = false;
  function resolveLang(v) {
    if (v && v !== 'auto') return v;
    const n = String(navigator.language || 'ru-RU').toLowerCase();
    if (/^uk/.test(n)) return 'uk-UA'; if (/^en/.test(n)) return 'en-US'; if (/^de/.test(n)) return 'de-DE';
    if (/^es/.test(n)) return 'es-ES'; if (/^fr/.test(n)) return 'fr-FR'; if (/^pl/.test(n)) return 'pl-PL';
    if (/^tr/.test(n)) return 'tr-TR'; if (/^it/.test(n)) return 'it-IT'; if (/^pt/.test(n)) return 'pt-BR';
    if (/^ja/.test(n)) return 'ja-JP'; if (/^ko/.test(n)) return 'ko-KR'; if (/^zh/.test(n)) return 'zh-CN';
    return 'ru-RU';
  }
  function voiceOptions() {
    try { return speechSynthesis.getVoices ? speechSynthesis.getVoices() : []; } catch { return []; }
  }

  function speak(text) {
    if (!cfg.speak || !text || typeof speechSynthesis === 'undefined' || typeof SpeechSynthesisUtterance === 'undefined') return;
    const clean = String(text).replace(/^[✓⚠?]\s*/, '').trim();
    if (!clean) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(clean);
      u.lang = resolveLang(cfg.lang);
      u.rate = Math.max(.65, Math.min(1.6, +cfg.speakRate || 1));
      u.pitch = Math.max(.5, Math.min(2, +cfg.speakPitch || 1));
      u.volume = Math.max(0, Math.min(1, +cfg.speakVolume || .85));
      const voices = speechSynthesis.getVoices ? speechSynthesis.getVoices() : [];
      const base = u.lang.toLowerCase().split('-')[0];
      const exact = voices.filter(x => x.lang && x.lang.toLowerCase() === u.lang.toLowerCase());
      const sameLang = voices.filter(x => x.lang && x.lang.toLowerCase().startsWith(base));
      const preferred = sameLang.find(x => /natural|enhanced|premium|neural|online|google|microsoft|aria|jenny|samantha|ava|daniel|oliver|alex|irina|milena|yuri|katya/i.test(x.name)) || exact[0] || sameLang[0];
      const chosen = cfg.voiceURI ? voices.find(x => x.voiceURI === cfg.voiceURI) : preferred;
      if (chosen) u.voice = chosen;
      u.onstart = () => { speaking = true; duck(true); };
      u.onend = () => { speaking = false; duck(false); };
      u.onerror = () => { speaking = false; duck(false); };
      clearTimeout(speakT);
      speakT = setTimeout(() => { try { speechSynthesis.speak(u); } catch {} }, 30);
    } catch {}
  }
  function stopSpeaking() { speaking = false; try { speechSynthesis.cancel(); } catch {} duck(false); }
  if (typeof speechSynthesis !== 'undefined') {
    try { speechSynthesis.onvoiceschanged = () => { if (panel && panel.classList.contains('on')) { const y=panel.firstElementChild.scrollTop; panel.innerHTML=panelHTML(); renderHeard(); panel.firstElementChild.scrollTop=y; } }; } catch {}
  }

  /* ---------------- приглушение музыки ---------------- */
  window.voiceG = 1; let duckTarget = 1, duckT = 0;
  function duck(on) {
    duckTarget = on && cfg.duck ? cfg.duckLevel : 1;
    if (duckT) return;
    duckT = setInterval(() => {
      const d = duckTarget - window.voiceG;
      window.voiceG = Math.abs(d) < 0.02 ? duckTarget : window.voiceG + d * (d < 0 ? 0.35 : 0.12);
      g(() => applyVol());
      if (window.voiceG === duckTarget) { clearInterval(duckT); duckT = 0; }
    }, 40);
  }

  /* ---------------- окно «слушаю» ---------------- */
  let awake = false, deadline = 0, listening = false, denied = false, rec = null, sess = 0, stopping = false, restartT = 0, startedAt = 0, quick = 0;
  const heardLog = [];

  function wakeUp() {
    if (awake) { touch(); return; }
    awake = true; deadline = Date.now() + cfg.windowSec * 1000;
    sound('wake'); duck(true); setPill();
  }
  function touch() { deadline = Math.max(deadline, Date.now() + 2500); }
  function closeWindow(silent) {
    if (!awake) return;
    awake = false; duck(false); if (!silent) sound('close'); setPill();
  }
  setInterval(() => { if (awake && Date.now() > deadline) closeWindow(); }, 250);

  /* ---------------- выполнение ---------------- */
  async function exec(r) {
    const c = r.cmd;
    try {
      const out = await c.run(r.args);
      if (!c.noExec) {
        const msg = (typeof out === 'string' && out ? out : c.label);
        setLine('✓ ' + msg); sound('ok');
        if (c.speak !== false) speak(msg);
      } else { setLine('Отбой'); stopSpeaking(); }
    } catch (e) { console.warn('voice:', e); setLine('⚠ ' + c.label); sound('err'); if (c.speak !== false) speak('Не получилось'); }
    if (awake) { if (cfg.keepOpen) deadline = Date.now() + cfg.windowSec * 1000; else closeWindow(); }
  }
  function pick(alts) {
    let first = null;
    for (const text of alts) {
      const a = analyze(text); if (!first) first = a;
      const r = resolve(a.rest);
      if (r) { a.r = r; return a; }
    }
    return first;
  }
  function decide(a) {
    const ctx = a.wake || awake;
    if (!a.r) return ctx && a.rest.length ? 'unknown' : null;
    const c = a.r.cmd;
    if (ctx) return 'run';
    if (c.needWake) return null;
    if (cfg.mode === 'always') return 'run';
    if (cfg.noWake[c.id]) return 'run';
    return null;
  }
  function handle(alts, final, conf) {
    const a = pick(alts);
    if (!a) return false;
    if (final && conf > 0 && conf < cfg.minConf && !a.wake) return false;
    const d = decide(a);
    if (d === 'run') {
      if (!final && a.r.cmd.kind !== 'simple') return false;      // сложные команды ждём до конца фразы
      if (a.wake && !awake) wakeUp();
      exec(a.r); return true;
    }
    if (d === 'unknown' && final) { setLine('? ' + a.rest.join(' ')); sound('err'); speak('Не понял команду'); if (awake) touch(); return true; }
    return false;
  }

  /* ---------------- распознавание ---------------- */
  const done = new Set(), woke = new Set(), latest = {}, stab = {};
  function onResult(e) {
    if (speaking) return;
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const res = e.results[i], key = sess + ':' + i;
      if (done.has(key)) continue;
      const alts = []; for (let j = 0; j < res.length; j++) alts.push(res[j].transcript);
      latest[key] = alts; pushHeard(alts[0], res.isFinal);
      const a = analyze(alts[0]);
      if (a.wake && !woke.has(key)) { woke.add(key); wakeUp(); } else if (awake) touch();
      if (awake) setLine('«' + alts[0].trim() + '»', true);
      clearTimeout(stab[key]);
      if (res.isFinal) { done.add(key); handle(alts, true, res[0].confidence); delete latest[key]; }
      else stab[key] = setTimeout(() => { if (!done.has(key) && handle(latest[key], false, 0)) done.add(key); }, 600);
    }
  }
  function startRec() {
    const R = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!R) { setLine('Браузер не поддерживает голос'); return; }
    if (rec || denied) return;
    stopping = false;
    rec = new R(); rec.lang = resolveLang(cfg.lang); rec.continuous = true; rec.interimResults = true; rec.maxAlternatives = 3;
    rec.onstart = () => { sess++; listening = true; startedAt = Date.now(); setPill(); };
    rec.onresult = onResult;
    rec.onerror = e => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { denied = true; stopping = true; setLine('Нет доступа к микрофону'); }
      setPill();
    };
    rec.onend = () => {
      listening = false; rec = null; setPill();
      if (!cfg.enabled || stopping) return;
      quick = Date.now() - startedAt < 1500 ? Math.min(quick + 1, 6) : 0;
      restartT = setTimeout(startRec, 200 + quick * 500);
    };
    try { rec.start(); } catch { rec = null; }
  }
  function stopRec() { stopping = true; clearTimeout(restartT); try { rec && rec.abort(); } catch {} rec = null; listening = false; }
  function enable() { cfg.enabled = true; denied = false; save(); actx(); startRec(); sound('on', true); setPill(); }
  function disable() { cfg.enabled = false; save(); stopRec(); closeWindow(true); stopSpeaking(); sound('off', true); setPill(); }
  document.addEventListener('visibilitychange', () => { if (!document.hidden && cfg.enabled && !rec && !denied) startRec(); });

  /* ---------------- интерфейс: кнопка ---------------- */
  const css = document.createElement('style');
  css.textContent = `
#vcPill{position:fixed;right:14px;bottom:calc(78px + env(safe-area-inset-bottom));z-index:41;display:flex;flex-direction:column;align-items:flex-end;gap:6px;font:600 13px system-ui,sans-serif}
#vcPill .vcrow{display:flex;border:1px solid var(--ln,#ffffff22);background:var(--pn,#161616);border-radius:16px;box-shadow:0 8px 30px #0007;overflow:hidden}
#vcPill button{border:0;background:transparent;color:var(--tx,#fff);padding:9px 12px;font:inherit;cursor:pointer;display:flex;align-items:center;gap:8px}
#vcPill button+button{border-left:1px solid var(--ln,#ffffff22);padding:9px 11px}
#vcDot{width:10px;height:10px;border-radius:50%;background:#777;transition:.2s}
#vcPill.on #vcDot{background:var(--ac,#ff9f1c);opacity:.55;animation:vcb 2.4s ease-in-out infinite}
#vcPill.awake #vcDot{opacity:1;box-shadow:0 0 0 0 var(--ac,#ff9f1c);animation:vcp .9s ease-out infinite}
#vcPill.bad #vcDot{background:#e5484d;animation:none}
@keyframes vcb{50%{transform:scale(.7)}}
@keyframes vcp{to{box-shadow:0 0 0 12px transparent}}
#vcLine{max-width:min(78vw,340px);padding:6px 11px;border-radius:12px;background:var(--pn,#161616);border:1px solid var(--ln,#ffffff22);color:var(--tx,#fff);opacity:0;transform:translateY(4px);transition:.2s;pointer-events:none;box-shadow:0 8px 30px #0007;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#vcLine.show{opacity:1;transform:none}
#vcLine.it{font-style:italic;font-weight:500;color:var(--mu,#ffffffaa)}
#vcPanel{position:fixed;inset:0;z-index:100000;display:none;align-items:center;justify-content:center;background:#0009;backdrop-filter:blur(6px)}
#vcPanel.on{display:flex}
#vcBox{width:min(640px,94vw);max-height:90vh;overflow:auto;background:var(--bg,#0e0e0e);color:var(--tx,#fff);border:1px solid var(--ln,#ffffff22);border-radius:20px;padding:18px 18px 22px;box-shadow:0 30px 90px #000a;font:14px/1.4 system-ui,sans-serif}
#vcBox h3{margin:0 0 4px;font-size:20px;display:flex;justify-content:space-between;align-items:center}
#vcBox h4{margin:18px 0 8px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--mu,#ffffff88)}
#vcBox p,#vcBox small{color:var(--mu,#ffffff99);margin:4px 0}
#vcBox .r{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:7px 0}
#vcBox .r>label{flex:1 1 170px}
#vcBox input[type=text],#vcBox input[type=number],#vcBox select{background:var(--pn2,#ffffff10);color:var(--tx,#fff);border:1px solid var(--edge,#ffffff22);border-radius:10px;padding:8px 10px;font:inherit;min-width:0}
#vcBox input[type=text].w{flex:1 1 220px}
#vcBox input[type=range]{flex:1 1 150px;accent-color:var(--ac,#ff9f1c)}
#vcBox button{border:1px solid var(--edge,#ffffff22);background:var(--pn2,#ffffff10);color:var(--tx,#fff);border-radius:10px;padding:8px 12px;font:inherit;font-weight:700;cursor:pointer}
#vcBox button.on{background:var(--ac,#ff9f1c);color:#111;border-color:transparent}
#vcBox .cmd{display:grid;grid-template-columns:auto 130px 1fr auto auto;gap:8px;align-items:center;margin:5px 0}
#vcBox .cmd.off{opacity:.45}
#vcBox .cmd small{white-space:nowrap}
#vcBox .chips{display:flex;gap:6px;flex-wrap:wrap}
#vcBox .chip{padding:5px 9px;border-radius:999px;font-weight:500}
#vcOut{font-weight:700;color:var(--ac,#ff9f1c)}
@media(max-width:560px){#vcBox .cmd{grid-template-columns:auto 1fr auto}#vcBox .cmd input.cp{grid-column:1/-1}}`;
  document.head.appendChild(css);

  const pill = document.createElement('div');
  pill.id = 'vcPill';
  pill.innerHTML = '<div id="vcLine"></div><div class="vcrow"><button id="vcMain" type="button"><i id="vcDot"></i><span id="vcTxt">Голос</span></button><button id="vcGear" type="button" title="Настройки голоса" aria-label="Настройки голоса">⚙</button></div>';
  document.body.appendChild(pill);
  const $ = id => document.getElementById(id);

  let lineT = 0;
  function setLine(t, italic) {
    const l = $('vcLine'); l.textContent = t; l.classList.toggle('it', !!italic); l.classList.add('show');
    clearTimeout(lineT); lineT = setTimeout(() => l.classList.remove('show'), italic ? 2200 : 3200);
  }
  function setPill() {
    pill.classList.toggle('on', cfg.enabled && listening);
    pill.classList.toggle('awake', awake);
    pill.classList.toggle('bad', cfg.enabled && denied);
    $('vcTxt').textContent = !cfg.enabled ? 'Голос' : denied ? 'Нет микрофона' : awake ? 'Слушаю…' : cfg.mode === 'always' ? 'Слушаю' : cfg.name;
  }
  $('vcMain').onclick = () => (cfg.enabled ? disable() : enable());
  $('vcGear').onclick = openPanel;

  /* ---------------- интерфейс: настройки ---------------- */
  function pushHeard(t, final) {
    if (final && t.trim()) { heardLog.unshift(t.trim()); if (heardLog.length > 8) heardLog.pop(); }
    renderHeard(final ? '' : t.trim());
  }
  function dry(text) {
    const a = analyze(text); const r = resolve(a.wake ? a.rest : a.tokens);
    const w = a.wake ? 'имя услышано · ' : '';
    return r ? `${w}→ ${r.cmd.label}${r.args ? ' ' + JSON.stringify(r.args) : ''}` : `${w}команда не распознана`;
  }
  function panelHTML() {
    const row = (id, label, on) => `<button type="button" data-t="${id}" class="${on ? 'on' : ''}">${label}</button>`;
    const sel = (key, opts) => `<select data-s="${key}">${opts.map(([v, l]) => `<option value="${v}" ${String(cfg[key]) === String(v) ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
    const rng = (key, min, max, step) => `<input type="range" data-r="${key}" min="${min}" max="${max}" step="${step}" value="${cfg[key]}">`;
    const cmds = C.map(c => `<div class="cmd ${enabled(c) ? '' : 'off'}" data-c="${c.id}">
      <input type="checkbox" data-ce="${c.id}" ${enabled(c) ? 'checked' : ''} title="Включить команду">
      <b>${hx(c.label)}</b>
      <input type="text" class="cp" data-cp="${c.id}" value="${hx(phr(c).join(', '))}" title="Фразы через запятую">
      ${c.needWake || c.noExec ? '<span></span>' : `<label title="Работает без имени" style="white-space:nowrap"><small><input type="checkbox" data-cn="${c.id}" ${cfg.noWake[c.id] ? 'checked' : ''}> без имени</small></label>`}
      <button type="button" data-cr="${c.id}" title="Вернуть фразы по умолчанию">↺</button></div>`).join('');
    return `<div id="vcBox">
<h3>Голосовое управление <button type="button" id="vcClose">×</button></h3>
<p>Скажи имя — прозвучит сигнал — потом команду. Музыка приглушится, а ответ можно озвучивать голосом устройства.</p>
<div class="r">${row('enabled', cfg.enabled ? 'Включено' : 'Выключено', cfg.enabled)}<span id="vcOut"></span></div>

<h4>Имя</h4>
<div class="r"><label>Как тебя звать</label><input type="text" class="w" id="vcName" value="${hx(cfg.name)}"></div>
<div class="r"><label>Как ещё может услышать</label><input type="text" class="w" id="vcAl" value="${hx(cfg.aliases)}"></div>
<small>Если имя не срабатывает — посмотри ниже «Слышу», нажми на то, что показал браузер, и это слово добавится как вариант.</small>
<div class="r"><label>Режим</label>${sel('mode', [['wake', 'Только по имени (рекомендуется)'], ['always', 'Без имени, команды всегда']])}</div>
<div class="r"><label>Окно после имени, сек: <b id="vcWv">${cfg.windowSec}</b></label>${rng('windowSec', 3, 20, 1)}</div>
<div class="r">${row('keepOpen', 'После команды продолжать слушать', cfg.keepOpen)}</div>

<h4>Звуки</h4>
<div class="r">${row('sound', 'Звуки включены', cfg.sound)}${row('errSound', 'Сигнал «не понял»', cfg.errSound)}${row('closeSound', 'Сигнал «перестал слушать»', cfg.closeSound)}</div>
<div class="r"><label>Стиль</label>${sel('soundStyle', Object.entries(STYLES).map(([k, v]) => [k, v.label]))}<button type="button" id="vcTest">▶ Проверить</button></div>
<div class="r"><label>Громкость сигналов</label>${rng('soundVol', 0.05, 1, 0.05)}</div>

<h4>Голосовой ответ</h4>
<div class="r">${row('speak', cfg.speak ? 'Голосовые ответы включены' : 'Голосовые ответы выключены', cfg.speak)}</div>
<div class="r"><label>Скорость</label>${rng('speakRate', .7, 1.4, .05)}</div>
<div class="r"><label>Высота голоса</label>${rng('speakPitch', .7, 1.3, .05)}</div>
<div class="r"><label>Громкость голоса</label>${rng('speakVolume', .2, 1, .05)}</div>

<h4>Чтобы не кричать</h4>
<div class="r">${row('duck', 'Приглушать музыку, пока слушаю', cfg.duck)}</div>
<div class="r"><label>Громкость музыки в это время: <b id="vcDv">${Math.round(cfg.duckLevel * 100)}%</b></label>${rng('duckLevel', 0.05, 0.8, 0.05)}</div>
<div class="r"><label>Строгость распознавания: <b id="vcMv">${Math.round(cfg.minConf * 100)}%</b></label>${rng('minConf', 0, 0.9, 0.05)}</div>
<small>Тише говоришь и часто «не понял» — убавь строгость. Лишние срабатывания — прибавь.</small>

<h4>Прочее</h4>
<div class="r"><label>Шаг перемотки, сек</label><input type="number" data-n="seekStep" min="1" max="120" value="${cfg.seekStep}" style="width:80px"></div>
<div class="r"><label>Шаг громкости, %</label><input type="number" data-n="volStep" min="1" max="50" value="${cfg.volStep}" style="width:80px"></div>
<div class="r"><label>Где искать песню</label>${sel('searchSource', [['both', 'Сначала моя музыка, потом интернет'], ['lib', 'Только моя музыка'], ['web', 'Только интернет']])}</div>
<div class="r"><label>Язык распознавания</label>${sel('lang', [['auto','Авто (язык устройства)'],['ru-RU','Русский'],['uk-UA','Українська'],['en-US','English'],['de-DE','Deutsch'],['es-ES','Español'],['fr-FR','Français'],['pl-PL','Polski'],['tr-TR','Türkçe'],['it-IT','Italiano'],['pt-BR','Português'],['ja-JP','日本語'],['ko-KR','한국어'],['zh-CN','中文']])}</div>
<div class="r"><label>Голос ассистента</label><select id="vcVoice"><option value="">Автоматически выбрать приятный</option>${voiceOptions().map(v=>`<option value="${hx(v.voiceURI)}" ${cfg.voiceURI===v.voiceURI?'selected':''}>${hx(v.name)} · ${hx(v.lang)}</option>`).join('')}</select></div>

<h4>Команды и фразы</h4>
<small>Фразы пиши через запятую. Галочка слева — включить/выключить команду. «Без имени» — работает без обращения (осторожно: микрофон слышит и музыку).</small>
<div id="vcCmds">${cmds}</div>
<div class="r"><button type="button" id="vcResetAll">Сбросить все фразы</button></div>
<small>Поиск: «Вась, найди Земфира Ромашки». Можно сказать «поставь сердечко», «добавь в плейлист», «добавь в плейлист для дороги», «выключи музыку», «включи музыку». , «поставь Queen в ютубе», «включи из моей музыки Кино». Перемотка: «перемотай на 30 секунд», «назад на минуту», «перемотай на 1:20». Громкость: «громкость 5», «звук на половину».</small>

<h4>Проверка</h4>
<div class="r"><input type="text" class="w" id="vcTry" placeholder="Напиши фразу, например: Вась следующая"><span id="vcTryOut" style="font-weight:700"></span></div>
<h4>Слышу</h4>
<div class="chips" id="vcHeard"></div>
</div>`;
  }
  const panel = document.createElement('div'); panel.id = 'vcPanel'; document.body.appendChild(panel);
  function openPanel() { panel.innerHTML = panelHTML(); panel.classList.add('on'); renderHeard(); }
  function renderHeard(interim) {
    const el = $('vcHeard'); if (!el) return;
    const chip = (x, i) => `<span class="chip" data-h="${i}" title="Нажми, чтобы добавить первое слово как вариант имени" style="border:1px solid var(--edge,#ffffff22);cursor:pointer">${hx(x)}</span>`;
    el.innerHTML = (interim ? `<span class="chip" style="opacity:.6">${hx(interim)}…</span>` : '') +
      (heardLog.length ? heardLog.map(chip).join('') : (interim ? '' : '<small>Пока пусто — включи голос и скажи что-нибудь.</small>'));
  }
  function closePanel() { panel.classList.remove('on'); }
  panel.addEventListener('click', e => {
    const t = e.target;
    if (t === panel || t.id === 'vcClose') return closePanel();
    const tg = t.closest('[data-t]');
    if (tg) {
      const k = tg.dataset.t;
      if (k === 'enabled') { cfg.enabled ? disable() : enable(); }
      else { cfg[k] = !cfg[k]; save(); if (k === 'duck' && !cfg.duck) duck(false); }
      const keep = panel.firstElementChild.scrollTop; panel.innerHTML = panelHTML(); renderHeard(); panel.firstElementChild.scrollTop = keep; setPill(); return;
    }
    if (t.id === 'vcTest') { sound('wake', true); setTimeout(() => sound('ok', true), 500); setTimeout(() => sound('err', true), 800); return; }
    if (t.dataset.cr) { delete cfg.phrases[t.dataset.cr]; save(); const k = panel.firstElementChild.scrollTop; panel.innerHTML = panelHTML(); renderHeard(); panel.firstElementChild.scrollTop = k; return; }
    if (t.id === 'vcResetAll') { cfg.phrases = {}; save(); const k = panel.firstElementChild.scrollTop; panel.innerHTML = panelHTML(); renderHeard(); panel.firstElementChild.scrollTop = k; return; }
    const h = t.closest('[data-h]');
    if (h) {
      const w = tok(heardLog[+h.dataset.h]).find(x => !nameList().some(n => n.join(' ') === x));
      if (w) { cfg.aliases = (cfg.aliases ? cfg.aliases + ', ' : '') + w; save(); $('vcAl').value = cfg.aliases; $('vcOut').textContent = 'Добавлено: ' + w; }
    }
  });
  panel.addEventListener('input', e => {
    const t = e.target;
    if (t.dataset.r) { cfg[t.dataset.r] = +t.value; save(); const map = { windowSec: ['vcWv', v => v], duckLevel: ['vcDv', v => Math.round(v * 100) + '%'], minConf: ['vcMv', v => Math.round(v * 100) + '%'] }[t.dataset.r]; if (map) $(map[0]).textContent = map[1](+t.value); }
    else if (t.dataset.n) { cfg[t.dataset.n] = Math.max(1, +t.value || 1); save(); }
    else if (t.id === 'vcName') { cfg.name = t.value.trim() || 'Вась'; save(); setPill(); }
    else if (t.id === 'vcAl') { cfg.aliases = t.value; save(); }
    else if (t.dataset.cp) { const arr = t.value.split(',').map(x => x.trim()).filter(Boolean); cfg.phrases[t.dataset.cp] = arr; save(); }
    else if (t.id === 'vcTry') { $('vcTryOut').textContent = t.value.trim() ? dry(t.value) : ''; }
  });
  panel.addEventListener('change', e => {
    const t = e.target;
    if (t.id === 'vcVoice') { cfg.voiceURI = t.value; save(); }
    else if (t.dataset.s) { cfg[t.dataset.s] = t.value; save(); if (t.dataset.s === 'lang' || t.dataset.s === 'mode') { if (cfg.enabled) { stopRec(); setTimeout(() => { stopping = false; startRec(); }, 300); } setPill(); } }
    else if (t.dataset.ce) { cfg.off[t.dataset.ce] = !t.checked; save(); t.closest('.cmd').classList.toggle('off', !t.checked); }
    else if (t.dataset.cn) { cfg.noWake[t.dataset.cn] = t.checked; save(); }
    else if (t.dataset.cp && !t.value.trim()) { delete cfg.phrases[t.dataset.cp]; save(); t.value = C.find(c => c.id === t.dataset.cp).def.join(', '); }
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && panel.classList.contains('on')) closePanel(); });

  /* пункт в правом меню v10 */
  function addMenuItem() {
    const m = $('customMenu'); if (!m || $('cmVoice')) return;
    const s = document.createElement('div'); s.className = 'cmsection';
    s.innerHTML = '<b>Голос</b><div class="cmrow"><button id="cmVoice" type="button">Голосовое управление…</button></div>';
    m.insertBefore(s, m.querySelector('.cmsection'));
    $('cmVoice').onclick = () => { m.classList.remove('on'); openPanel(); };
  }
  addMenuItem(); setTimeout(addMenuItem, 1500);

  window.VoiceControl = { open: openPanel, enable, disable, cfg, dry };
  setPill();
  if (cfg.enabled) setTimeout(startRec, 900);
})();
