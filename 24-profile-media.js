/* v8: профиль, управление вне сайта (шторка/экран блокировки, ярлыки, мини-окно), установка */
(()=>{
const g=id=>document.getElementById(id),R=document.documentElement,esc=x=>String(x).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const AUm=()=>{try{return JSON.parse(localStorage.getItem('mp_auth'))}catch{return null}};
const playing=()=>g('pp').textContent=='⏸';
/* --- шторка уведомлений / экран блокировки / наушники / часы --- */
if('mediaSession' in navigator){const ms=navigator.mediaSession;let lid=null;
  const seek=t=>{if(isYT()&&yp&&yp.seekTo)yp.seekTo(Math.max(0,t),true);else if(au.src)au.currentTime=Math.max(0,Math.min(au.duration||1e9,t))};
  const cur=()=>isYT()&&yp&&yp.getCurrentTime?yp.getCurrentTime():au.currentTime;
  const H=(a,f)=>{try{ms.setActionHandler(a,f)}catch{}};
  H('seekbackward',()=>seek(cur()-10));H('seekforward',()=>seek(cur()+10));H('seekto',e=>seek(e.seekTime));
  H('stop',()=>{if(playing())g('pp').click()});
  setInterval(()=>{const t=S.cur&&T.get&&T.get(S.cur);if(!t)return;
    if(lid!=t.id){lid=t.id;const art=t.cu?[{src:t.cu,sizes:'512x512'}]:[{src:new URL('icon-512.png',location.href).href,sizes:'512x512',type:'image/png'}];
      ms.metadata=new MediaMetadata({title:t.title,artist:t.artist,album:t.album||'',artwork:art})}
    ms.playbackState=playing()?'playing':'paused';
    try{const d=isYT()&&yp&&yp.getDuration?yp.getDuration():au.duration;if(d&&isFinite(d))ms.setPositionState({duration:d,position:Math.min(cur(),d),playbackRate:1})}catch{}},1000)}
/* --- плавающее мини-окно (Chrome/Edge на ПК) --- */
let pip=null;
async function mini(){
  if(!('documentPictureInPicture' in window)){toast('Мини-окно — в Chrome/Edge на ПК. На телефоне управляй из шторки или с экрана блокировки');return}
  if(pip){pip.close();return}
  const w=pip=await documentPictureInPicture.requestWindow({width:340,height:170}),d=w.document,cs=getComputedStyle(R),v=k=>cs.getPropertyValue(k).trim();
  d.head.insertAdjacentHTML('beforeend',`<style>*{box-sizing:border-box}body{margin:0;padding:14px 16px;background:${v('--bg')};color:${v('--tx')};font:14px system-ui,sans-serif;display:flex;flex-direction:column;gap:8px;height:100vh;justify-content:center}
#t{font-weight:800;font-size:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#a{color:${v('--mu')};font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:-6px}
input{width:100%;accent-color:${v('--ac')}}.r{display:flex;justify-content:center;gap:14px;align-items:center}
button{border:0;border-radius:50%;width:44px;height:44px;background:${v('--pn2')};color:${v('--tx')};font-size:18px;cursor:pointer}#p{width:56px;height:56px;background:${v('--ac')};color:${v('--bg')};font-size:22px}</style>`);
  d.body.innerHTML='<div id="t"></div><div id="a"></div><input id="s" type="range" min="0" max="1000" value="0"><div class="r"><button id="b">⏮</button><button id="p">▶</button><button id="n">⏭</button></div>';
  const q=i=>d.getElementById(i);let drag=0;
  q('b').onclick=()=>g('pv').click();q('p').onclick=()=>g('pp').click();q('n').onclick=()=>g('nx').click();
  q('s').onpointerdown=()=>drag=1;q('s').onpointerup=()=>drag=0;
  q('s').oninput=e=>{const k=g('seek');k.value=e.target.value;k.dispatchEvent(new Event('input',{bubbles:true}));k.dispatchEvent(new Event('change',{bubbles:true}))};
  const up=()=>{q('t').textContent=g('pt').textContent;q('a').textContent=g('pa').textContent;q('p').textContent=playing()?'⏸':'▶';if(!drag)q('s').value=g('seek').value};
  up();const iv=setInterval(up,400);w.addEventListener('pagehide',()=>{clearInterval(iv);pip=null})}
/* --- установка на экран --- */
let dp=null;addEventListener('beforeinstallprompt',e=>{e.preventDefault();dp=e;const b=g('inst');if(b)b.hidden=false});
if('serviceWorker' in navigator&&/^https?:/.test(location.protocol))navigator.serviceWorker.register('sw.js').catch(()=>{});
/* --- кнопка «Мини-окно» в панели плеера (ПК) --- */
(()=>{const v=g('vol'),mu=g('mu'),b=document.createElement('button');b.id='mn';b.title='Мини-окно поверх всех окон';b.setAttribute('aria-label','Мини-окно');b.innerHTML=ICO('mon');b.style.cssText='width:38px;height:38px;padding:0;display:grid;place-items:center;border-radius:12px';b.onclick=mini;v.insertBefore(b,mu)})();
/* --- профиль --- */
nav.push(['prof','Профиль']);
document.head.insertAdjacentHTML('beforeend','<style>#nav button[data-v=prof]::before{content:"☺";font-size:17px}.pav{width:104px;height:104px;border-radius:50%;display:grid;place-items:center;font:800 42px var(--disp);background:var(--grad);color:var(--bg);background-size:cover;background-position:center;box-shadow:0 0 0 4px color-mix(in srgb,var(--ac) 25%,transparent),0 18px 40px -16px var(--ac);flex:none}.pbox{display:flex;gap:22px;align-items:center;flex-wrap:wrap;margin:6px 0 18px}.pbox>div:last-child{flex:1;min-width:220px;display:flex;flex-direction:column;gap:8px}html.m .pbox{flex-direction:column;text-align:center}html.m .pbox input{text-align:center}</style>');
const _r=render;render=function(){_r();if(view=='prof')drawProf()};
function drawProf(){const A=AUm(),p=S.prof||{},nm=p.name||(A&&A.name)||'Гость',kind=!A?'Гость · данные только на этом устройстве':A.cloud?'Облачный аккаунт':'Локальный аккаунт · только на этом устройстве';
  g('main').innerHTML=`<h2>Профиль</h2><div class="pbox"><div class="pav" id="pavv" style="${p.av?`background-image:url(${p.av});color:transparent`:''}">${esc(nm[0]||'?').toUpperCase()}</div>
<div><input type="text" id="pnm" value="${esc(nm)}" maxlength="32" aria-label="Имя"><small>${A?esc(A.email):'Не вошли в аккаунт'} · ${kind}</small>
<div class="bar" style="margin:4px 0 0"><button id="pph">Сменить фото</button><button id="psv" class="add" style="margin:0">Сохранить</button>${p.av?'<button id="prm">Убрать фото</button>':''}</div></div></div>
<div class="stats"><div class="stat"><b>${T.size}</b>песен</div><div class="stat"><b>${S.fav.length}</b>в избранном</div><div class="stat"><b>${S.pl.length}</b>плейлистов</div><div class="stat"><b>${S.hist.length}</b>в истории</div></div>
<h3>Управление вне сайта</h3><div class="bar"><button id="pmn">Мини-окно поверх окон (ПК)</button><button id="inst" ${dp?'':'hidden'}>Установить на экран</button></div>
<p><small>Когда музыка играет, кнопки пауза / вперёд / назад и перемотка появляются в шторке уведомлений и на экране блокировки (Android, iPhone), в наушниках и в медиа-панели браузера. Если установить сайт как приложение, по долгому нажатию на значок будут быстрые ярлыки: Плеер, Моя музыка, Поиск, Избранное.<br>iPhone: Safari → «Поделиться» → «На экран Домой».</small></p>
<h3>Аккаунт</h3><div class="bar">${A?'<button id="plo">Выйти из аккаунта</button>':'<button id="pli" class="add" style="margin:0">Войти или создать аккаунт</button>'}</div>`}
const resize=f=>new Promise(r=>{const i=new Image();i.onload=()=>{const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d'),m=Math.min(i.width,i.height);x.drawImage(i,(i.width-m)/2,(i.height-m)/2,m,m,0,0,256,256);r(c.toDataURL('image/jpeg',.85))};i.src=URL.createObjectURL(f)});
g('main').addEventListener('click',async e=>{const t=e.target.closest('button');if(!t||view!='prof')return;
  if(t.id=='pph')g('fc2').click();
  else if(t.id=='prm'){S.prof=Object.assign(S.prof||{},{av:''});persist();drawProf()}
  else if(t.id=='psv'){const n=g('pnm').value.trim().slice(0,32)||'Без имени';S.prof=Object.assign(S.prof||{},{name:n});persist();const A=AUm();if(A){A.name=n;localStorage.setItem('mp_auth',JSON.stringify(A));const c=document.querySelector('.acc');if(c)c.textContent=n}toast('Сохранено');drawProf()}
  else if(t.id=='pmn')mini();
  else if(t.id=='inst'&&dp){dp.prompt();dp=null;t.hidden=true}
  else if(t.id=='plo'){if(confirm('Выйти из аккаунта?'))logout()}
  else if(t.id=='pli')openAuth()});
document.body.insertAdjacentHTML('beforeend','<input type="file" id="fc2" accept="image/*" hidden>');
g('fc2').onchange=async e=>{const f=e.target.files[0];if(!f)return;S.prof=Object.assign(S.prof||{},{av:await resize(f)});persist();e.target.value='';drawProf()};
/* ярлыки с домашнего экрана: ?v=lib */
const qv=new URLSearchParams(location.search).get('v');if(qv&&nav.some(n=>n[0]==qv)){view=qv;S.view=qv;persist();render()}
})();