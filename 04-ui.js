/* ---------- UI ---------- */
function ui(){
  const t=T.get(S.cur);
  $('#pt').textContent=t?t.title:'Ничего не играет';$('#pa').textContent=t?t.artist:'Добавьте музыку';
  $('#pc').style.cssText=t?cv(t):'';$('#pc').textContent=t?ini(t):'♪';$('#pf').className=t&&S.fav.includes(t.id)?'hot':'';$('#pf').style.color=S.fav.includes(S.cur)?'var(--ac)':'';
  $('#sh').className=S.shuf?'on':'';$('#rp').className=S.rep?'on':'';$('#rp').textContent=S.rep==2?'↻1':'↻';
  document.querySelectorAll('.row').forEach(r=>r.classList.toggle('on',r.dataset.id==S.cur));
}
const row=(id,i)=>{const t=T.get(id);return `<div class="row ${S.cur==id?'on':''}" data-id="${id}" data-i="${i}" ${REORD?'draggable="true"':''}><div class="cv" style="${cv(t)}">${ini(t)}</div><div class="tt"><b>${esc(t.title)}</b><small>${esc(t.artist)} · ${esc(t.album)}</small></div><span class="d">${fmt(t.dur)}</span><span class="d s">${(t.src||t.yt)?'онлайн':t.fmt+' · '+mb(t.size)}</span><button data-a="fav" style="${S.fav.includes(id)?'color:var(--ac)':''}" title="Избранное">♥</button><button data-a="q" title="В очередь">＋</button><button data-a="more" title="Ещё">⋯</button></div>`};
const rows=(ids,msg)=>{LIST=ids.filter(id=>T.has(id));return LIST.length?LIST.map((id,i)=>row(id,i)).join(''):`<div class="empty">${msg||'Здесь пока пусто'}</div>`};
function libIds(){const q=Q.toLowerCase();const a=[...T.values()].filter(t=>!t.tmp).filter(t=>!q||(t.title+' '+t.artist+' '+t.album+' '+(t.genre||'')).toLowerCase().includes(q));
  a.sort(SO=='added'?(x,y)=>y.added-x.added:SO=='dur'||SO=='size'?(x,y)=>x[SO]-y[SO]:(x,y)=>x[SO].localeCompare(y[SO]));return a.map(t=>t.id)}
const nav=[['home','Главная'],['now','Плеер'],['web','Поиск в мире'],['lib','Моя музыка'],['fav','Избранное'],['hist','История'],['pls','Плейлисты'],['q','Очередь'],['eq','Эквалайзер'],['smart','Умный звук']];
const plCard=p=>{const t=T.get(p.ids.find(i=>T.has(i)))||{id:p.id};return `<div class="card" data-pl="${p.id}"><div class="cv" style="${cv(t)}">${ini(t)}</div><b>${esc(p.name)}</b><br><small>Песен: ${p.ids.length}</small></div>`};
function render(){
  REORD=null;$('#nav').innerHTML=nav.map(([k,n])=>`<button data-v="${k}" class="${view==k?'on':''}">${n}</button>`).join('');
  const m=$('#main');
  if(view=='home'){const all=[...T.values()].filter(t=>!t.tmp),tot=all.reduce((a,t)=>a+t.dur,0);
    const rec=all.sort((a,b)=>b.added-a.added).slice(0,5).map(t=>t.id),pl=S.hist.slice(0,5).map(h=>h.id);
    m.innerHTML=`<h2>Главная</h2><div class="stats"><div class="stat"><b>${all.length}</b>песен</div><div class="stat"><b>${new Set(all.map(t=>t.album)).size}</b>альбомов</div><div class="stat"><b>${new Set(all.map(t=>t.artist)).size}</b>исполнителей</div><div class="stat"><b>${(tot/3600).toFixed(1)} ч</b>вся библиотека</div></div>
    ${S.cur&&T.has(S.cur)?`<h3>Продолжить прослушивание</h3><div class="row" data-resume="1"><div class="cv" style="${cv(T.get(S.cur))}">▶</div><div class="tt"><b>${esc(T.get(S.cur).title)}</b><small>с ${fmt(S.pos)}</small></div></div>`:''}
    <h3>Недавно добавленные</h3>${rows(rec,'Нажмите «Добавить музыку» или перетащите файлы в окно')}<h3>Недавно воспроизведённые</h3>${rows(pl,'Вы ещё ничего не слушали')}
    <h3>Мои плейлисты</h3>${S.pl.length?`<div class="grid">${S.pl.map(plCard).join('')}</div>`:'<div class="empty">Плейлистов пока нет</div>'}`}
  else if(view=='lib'){m.innerHTML=`<h2>Моя музыка</h2><div class="bar"><button class="vmb" data-t="mix">🔀 Разнобой</button><input type="search" id="sq" placeholder="Поиск по названию, исполнителю, альбому" value="${esc(Q)}"><select id="so">${[['added','Дата добавления'],['title','Название'],['artist','Исполнитель'],['album','Альбом'],['dur','Длительность'],['size','Размер']].map(([k,n])=>`<option value="${k}" ${SO==k?'selected':''}>${n}</option>`).join('')}</select></div><div id="lst">${rows(libIds(),'Библиотека пуста или ничего не найдено')}</div>`;
    $('#sq').oninput=e=>{Q=e.target.value;$('#lst').innerHTML=rows(libIds(),'Ничего не найдено')};$('#so').onchange=e=>{SO=e.target.value;S.so=SO;persist();$('#lst').innerHTML=rows(libIds())}}
  else if(view=='fav')m.innerHTML=`<h2>Избранное</h2><div class="bar"><button data-act="playlist-fav">▶ Играть всё</button><button data-act="fav2pl">В плейлист</button></div>${rows(S.fav,'Нажмите ♥ у песни, чтобы добавить её сюда')}`;
  else if(view=='hist')m.innerHTML=`<h2>История</h2><div class="bar"><button data-act="clrhist">Очистить историю</button></div>${S.hist.filter(h=>T.has(h.id)).length?rows(S.hist.map(h=>h.id)):rows([],'История пуста')}`;
  else if(view=='pls'){
    if(openPl){const p=S.pl.find(x=>x.id==openPl);if(!p){openPl=null;return render()}REORD=p.ids;
      m.innerHTML=`<h2>${esc(p.name)}</h2><div class="bar"><button data-act="plplay">▶ Играть</button><button data-t="mix">🔀 Разнобой</button><button data-act="plq">В очередь</button><input type="text" id="rn" value="${esc(p.name)}" aria-label="Название плейлиста"><button data-act="plclr">Очистить</button><button data-act="pldel">Удалить плейлист</button><button data-act="plback">← Все плейлисты</button></div>${rows(p.ids,'Плейлист пуст — добавляйте песни через меню ⋯')}`;
      REORD=p.ids;$('#rn').onchange=e=>{p.name=e.target.value.trim()||p.name;persist();render()}}
    else m.innerHTML=`<h2>Плейлисты</h2><div class="bar"><input type="text" id="np" placeholder="Название нового плейлиста"><button data-act="plnew">Создать</button></div>${S.pl.length?`<div class="grid">${S.pl.map(plCard).join('')}</div>`:'<div class="empty">Создайте первый плейлист</div>'}`}
  else if(view=='q'){REORD=S.q;m.innerHTML=`<h2>Очередь</h2><div class="bar"><button data-act="clrq">Очистить очередь</button></div><small>Очередь играет раньше текущего плейлиста</small>${rows(S.q,'Очередь пуста')}`;REORD=S.q}
  else if(view=='web')webView(m);
  else if(view=='smart'){const sn=S.sense||'',cap=Math.round((S.cap||1)*100),dt=Math.round((S.duckTo??.3)*100);
    m.innerHTML=`<h2>Умный звук</h2><p><small>Плеер сам держит громкость ровной и приглушает музыку, когда рядом появляется другой звук.</small></p>
<label class="bar"><input type="checkbox" id="lv" ${S.lv!==false?'checked':''}> Выравнивание громкости: музыка не орёт и не проваливается</label>
<label class="bar"><input type="checkbox" id="nt" ${S.night?'checked':''}> Тихий режим: сильнее сглаживает громкие пики</label>
<label class="bar"><input type="checkbox" id="kp" ${S.keep?'checked':''}> Помнить режимы между запусками (разнобой, повтор, тихий режим, микрофон). Выключено: каждый запуск начинается с чистого листа</label>
<div class="bar"><span>Потолок громкости</span><input type="range" id="cap" min="20" max="100" value="${cap}"><span class="d" id="capv">${cap}%</span></div>
<h3>Авто-приглушение</h3>
<div class="bar"><button class="vmb ${sn==''?'on':''}" data-sn="">Выкл</button><button class="vmb ${sn=='mic'?'on':''}" data-sn="mic">🎙 Микрофон</button><button class="vmb ${sn=='sys'?'on':''}" data-sn="sys">🖥 Звук компьютера (игра)</button><button class="vmb ${sn=='app'?'on':''}" data-sn="app">🪟 Окно приложения</button><span class="chip" id="snst" style="margin:0">Не подключено</span></div>
<div class="bar" id="appbox"></div>
<div class="bar"><span>Чувствительность</span><input type="range" id="sens" min="1" max="10" value="${S.sens||5}"></div>
<div class="bar"><span>Приглушать до</span><input type="range" id="dto" min="5" max="80" value="${dt}"><span class="d" id="dtov">${dt}%</span></div>
<p><small>Микрофон слышит голоса и звук из колонок. В наушниках игру он не услышит, тогда выберите «Звук компьютера»: браузер попросит выбрать экран или вкладку, отметьте «Поделиться звуком». «Окно приложения»: выберите окно игры или программы (в окне выбора видны миниатюры и названия), плеер следит за его картинкой и сам отключает музыку, когда приложение ожило. Для «Звука компьютера» картинка не нужна — берётся только звук. Громкий звук плавно приглушает музыку, через пару секунд она так же плавно возвращается.</small></p>`}
  else if(view=='now'){const t=T.get(S.cur);m.innerHTML=t?`<div class="hero"><div class="big" id="bigcv" style="${cv(t)}">${ini(t)}</div><div class="hi"><h2>${esc(t.title)}</h2><p>${esc(t.artist)} · ${esc(t.album)}${t.year?' · '+esc(t.year):''}${t.genre?' · '+esc(t.genre):''}</p>${transport(t)}<span class="chip" id="mood">Слушаю звук…</span><canvas id="vz" width="800" height="240"></canvas><div class="bar">${vmBar()}</div><div class="bar"><label><input type="checkbox" id="ae" ${S.ae?'checked':''}> Авто-эквалайзер: подстраивать звук под трек</label></div></div></div>`:'<h2>Сейчас играет</h2><div class="empty">Включите песню — здесь появится обложка и визуализатор</div>'}
  else{m.innerHTML=`<h2>Эквалайзер</h2>${isYT()?'<div class="empty" style="margin:0 0 12px">Сейчас играет трек с YouTube: звук идёт из плеера YouTube, и сайт не может его обработать. Эквалайзер, визуализатор и «Умный звук» работают для файлов, Audius и отрывков iTunes.</div>':''}<label class="bar"><input type="checkbox" id="ae" ${S.ae?'checked':''}> Авто-подстройка под музыку</label><span class="chip" id="mood">Слушаю звук…</span><canvas id="vz" width="800" height="240"></canvas><div class="bar">${vmBar()}</div><div class="bar"><select id="pre">${(()=>{const cur=Object.keys(PRE).find(k=>PRE[k].join()==S.eq.join());return Object.keys(PRE).map(k=>`<option ${k==cur?'selected':''}>${k}</option>`).join('')+`<option value="custom" ${cur?'':'selected'}>Свой</option>`})()}</select><select id="th"><option value="">Тема: системная</option><option value="dark">Тёмная</option><option value="light">Светлая</option></select><select id="sl"><option value="0">Таймер сна: выкл</option><option value="15">15 минут</option><option value="30">30 минут</option><option value="60">60 минут</option></select></div><div class="eq">${BANDS.map((f,i)=>`<label><span class="d">${S.eq[i]} дБ</span><input type="range" min="-12" max="12" step="1" value="${S.eq[i]}" data-b="${i}"><small>${f>=1000?f/1000+' кГц':f+' Гц'}</small></label>`).join('')}</div><p><small>Изменения применяются сразу, пока играет музыка.</small></p>`;
    $('#pre').onchange=e=>{if(!PRE[e.target.value])return;S.ae=false;S.eq=[...PRE[e.target.value]];applyEq();render()};
    $('#th').value=S.theme||'';$('#th').onchange=e=>{S.theme=e.target.value;e.target.value?root.dataset.theme=e.target.value:delete root.dataset.theme;setAccent(curH);persist()}}
  ui();
}
function applyEq(){filt.forEach((f,i)=>f.gain.setTargetAtTime(S.eq[i],ctx.currentTime,.35));persist()}
function menu(e,items){document.querySelectorAll('.menu').forEach(x=>x.remove());const m=document.createElement('div');m.className='menu';
  m.innerHTML=items.map((x,i)=>`<button data-i="${i}">${esc(x[0])}</button>`).join('');document.body.append(m);
  const r=e.target.getBoundingClientRect();{const Z=parseFloat(document.documentElement.style.zoom)||1;m.style.top=Math.max(8,Math.min(r.bottom,innerHeight-m.offsetHeight*Z-100))/Z+'px';m.style.left=Math.max(8,Math.min(r.left-120,innerWidth-m.offsetWidth*Z-8))/Z+'px'}
  m.onclick=ev=>{const i=ev.target.dataset.i;if(i!=null){m.remove();items[i][1]()}};
  setTimeout(()=>addEventListener('click',()=>m.remove(),{once:true}),0)}
var addToPl=(ids,p)=>{ids.forEach(i=>{if(!p.ids.includes(i))p.ids.push(i)});persist();toast(`Добавлено в «${p.name}»`);render()};
const plMenu=(e,ids)=>menu(e,[...S.pl.map(p=>[p.name,()=>addToPl(ids,p)]),['＋ Новый плейлист',()=>{const p={id:crypto.randomUUID(),name:'Плейлист '+(S.pl.length+1),ids:[]};S.pl.push(p);addToPl(ids,p)}]]);
function del(id){menu({target:$('#pt')},[['Удалить из библиотеки? Файл на диске останется',()=>{}],['Да, удалить',async()=>{if(S.cur==id){au.pause();au.removeAttribute('src');ytStop();S.cur=null;S.pos=0}T.delete(id);S.fav=S.fav.filter(x=>x!=id);S.q=S.q.filter(x=>x!=id);S.hist=S.hist.filter(h=>h.id!=id);S.pl.forEach(p=>p.ids=p.ids.filter(x=>x!=id));try{await tx('readwrite',s=>s.delete(id))}catch{}persist();render()}],['Отмена',()=>{}]])}
