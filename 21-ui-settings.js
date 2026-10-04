/* v2: раздел «Биты» x1–x5, выбор интерфейса, версия для телефонов */
let BXm=1;
(()=>{
const R=document.documentElement,g=id=>document.getElementById(id);
const BXV=[.55,1,1.45,2,2.7],BXL=['тихо','норма','жёстко','мощно','максимум'],FXI=['fx0','fx1','fx2','fx3','fx4','fx5'];
MN.push('Туннель','Осциллограф');
if(S.bx===undefined)S.bx=2;BXm=BXV[S.bx-1]||1;
const THEMES=[['neon','Моно','Тёмный нейтральный','#f2f2f2','#151515'],['amoled','Чёрный','Чистый чёрный','#ffffff','#000000'],['graphite','Графит','Тёмно-серый','#e8e8e8','#262628'],['steel','Сталь','Средний серый','#ffffff','#46464a'],['glass','Белый','Светлый','#141414','#ffffff'],['paper','Серый','Светло-серый','#141414','#d9d9dc']],LIGHT={glass:1,paper:1};
function applyUI(){const u=S.ui||'neon',md=S.mode||'auto';R.dataset.lay=S.lay||'side';R.style.zoom=zc=zt=(S.sc||1)*AK();
  if(u=='neon'){delete R.dataset.ui;S.theme?R.dataset.theme=S.theme:delete R.dataset.theme}else{R.dataset.ui=u;R.dataset.theme=LIGHT[u]?'light':'dark'}
  R.classList.toggle('m',md=='phone'||(md=='auto'&&matchMedia(MQP).matches));
  setAccent(curH);const tc=document.querySelector('meta[name=theme-color]');if(tc)tc.content=getComputedStyle(R).getPropertyValue('--bg').trim()||'#0b0912'}
matchMedia(MQP).addEventListener('change',applyUI);
function setBX(n){S.bx=n;BXm=BXV[n-1];persist();const b=g('bmx2');if(b)b.textContent='x'+n;document.querySelectorAll('#bxs button').forEach(x=>x.classList.toggle('on',x.dataset.bx==n))}
/* разделы */
nav.splice(2,0,['beats','Биты']);nav.push(['ui','Интерфейс']);
const _r=render;render=function(){_r();if(S.ui&&S.ui!='neon')R.dataset.theme=LIGHT[S.ui]?'light':'dark';if(view=='beats')drawBeats();else if(view=='ui')drawUI()};
function drawBeats(){g('main').innerHTML=`<h2>Биты</h2><p class="d" style="margin:-6px 0 0">Насколько сильно экран реагирует на бит. В бит-режиме уровень меняют клавиши 1–5.</p>
<div class="bxs" id="bxs">${BXL.map((t,i)=>`<button data-bx="${i+1}" class="${S.bx==i+1?'on':''}">x${i+1}<small>${t}</small></button>`).join('')}</div>
<div class="bpv"><i id="bpl"></i><div><b>${S.cur?'Пульс вашей песни':'Демо-ритм — включите песню'}</b><div class="mt" id="bmt"><i></i><i></i><i></i><i></i><i></i></div></div></div>
<h3>Эффекты</h3><div class="grid">${MN.map((n,i)=>`<div class="card${!bmAuto&&bmMode==i?' sel':''}" data-fx="${i}"><div class="cv" style="background:linear-gradient(140deg,hsl(${i*58+20} 0% 52%),hsl(${i*58+90} 0% 22%))">${ICO(FXI[i])}</div><b>${n}</b><br><small>Нажмите, чтобы запустить</small></div>`).join('')}</div>
<div class="bar" style="margin-top:16px"><button class="add" id="bgo" style="margin:0">🔥 Запустить бит-режим</button><label><input type="checkbox" id="bau" ${bmAuto?'checked':''}> Менять эффекты сами</label><label><input type="checkbox" id="bcr" ${bmCrazy?'checked':''}> ⚠ Безумие: тряска и вспышки</label></div>`}
const LAYS=[['side','Слева','Меню с подписями'],['compact','Узкая панель','Только значки'],['right','Справа','Меню справа'],['top','Сверху','Меню полосой сверху']];
const wfs=(bar,pl)=>`<svg viewBox="0 0 80 50" style="width:80%;height:auto"><rect x="1" y="1" width="78" height="48" rx="5" fill="none" stroke="currentColor" opacity=".45"/><rect ${bar} rx="2" fill="currentColor" opacity=".4"/><rect x="${pl[0]}" y="40" width="${pl[1]}" height="7" rx="2" fill="currentColor" opacity=".25"/></svg>`;
const WF={side:wfs('x="3" y="3" width="17" height="35"',[3,74]),compact:wfs('x="3" y="3" width="7" height="35"',[3,74]),right:wfs('x="60" y="3" width="17" height="35"',[3,74]),top:wfs('x="3" y="3" width="74" height="7"',[3,74])};
let zc=S.sc||1,zt=zc,zr=0;
function zoomTo(v){zt=v;if(matchMedia('(prefers-reduced-motion:reduce)').matches){zc=v;R.style.zoom=v;return}if(zr)return;zr=requestAnimationFrame(function st(){zc+=(zt-zc)*.2;if(Math.abs(zt-zc)<.002){zc=zt;zr=0}else zr=requestAnimationFrame(st);R.style.zoom=zc})}
function setSC(v){v=Math.min(1.4,Math.max(.8,Math.round(v*20)/20));S.sc=v;persist();zoomTo(v*AK());const l=g('szv'),r=g('szr');if(l)l.textContent=Math.round(v*100)+'%';if(r)r.value=Math.round(v*100)}
function drawUI(){const u=S.ui||'neon',md=S.mode||'auto';g('main').innerHTML=`<h2>Интерфейс</h2><h3>Размер интерфейса</h3><div class="bar"><button data-sz="-1" aria-label="Меньше" style="font-size:20px;width:44px;background:var(--pn2)">−</button><input type="range" id="szr" min="80" max="140" step="5" value="${Math.round((S.sc||1)*100)}" style="flex:1;max-width:340px;min-width:120px" aria-label="Размер интерфейса"><button data-sz="1" aria-label="Больше" style="font-size:20px;width:44px;background:var(--pn2)">+</button><b id="szv" style="min-width:48px">${Math.round((S.sc||1)*100)}%</b><button data-sz="0" style="background:var(--pn2)">Сбросить</button></div>
<h3>Вид интерфейса</h3><div class="grid">${LAYS.map(([k,n,d])=>`<div class="card${(S.lay||'side')==k?' sel':''}" data-lay="${k}"><div class="cv" style="background:var(--pn2);color:var(--tx)">${WF[k]}</div><b>${n}</b><br><small>${d}</small></div>`).join('')}</div><p class="d">На телефоне меню всегда внизу, как в приложении.</p>
<h3>Оформление</h3><div class="grid">${THEMES.map(([k,n,d,ac,bg])=>`<div class="card${u==k?' sel':''}" data-ui="${k}"><div class="cv" style="background:${bg};border:1px solid var(--ln)"><span style="width:44px;height:44px;border-radius:50%;background:${ac}"></span></div><b>${n}</b><br><small>${d}</small></div>`).join('')}</div>
<h3>Версия сайта</h3><div class="bxs">${[['auto','Авто','по размеру экрана'],['phone','Телефон','iPhone и Android'],['desk','Компьютер','боковая панель']].map(([k,n,d])=>`<button data-md="${k}" class="${md==k?'on':''}" style="font-size:18px">${n}<small>${d}</small></button>`).join('')}</div>
<p class="d">iPhone: «Поделиться» → «На экран Домой». Android: меню браузера → «Установить приложение» (если страница открыта по https).</p>`}
g('main').addEventListener('click',e=>{const t=e.target,b=t.closest('[data-bx]'),f=t.closest('[data-fx]'),u=t.closest('.card[data-ui]'),m=t.closest('button[data-md]'),lz=t.closest('.card[data-lay]'),sz=t.closest('button[data-sz]');
  if(b)setBX(+b.dataset.bx);
  else if(f){bmAuto=false;bmMode=+f.dataset.fx;bmOpen();BM.querySelector('#bmm').textContent='Эффект: '+(bmMode+1)+' · '+MN[bmMode]}
  else if(t.id=='bgo')bmOpen();
  else if(u){S.ui=u.dataset.ui;persist();applyUI();drawUI()}
  else if(m){S.mode=m.dataset.md;persist();applyUI();drawUI()}
  else if(lz){S.lay=lz.dataset.lay;persist();applyUI();drawUI()}
  else if(sz){const d=+sz.dataset.sz;setSC(d?(S.sc||1)+d*.05:1)}});
g('main').addEventListener('input',e=>{if(e.target.id=='szr')setSC(e.target.value/100)});
g('main').addEventListener('change',e=>{if(e.target.id=='bau')bmAuto=e.target.checked;if(e.target.id=='bcr')bmCrazy=e.target.checked});
/* кнопка уровня в бит-режиме + клавиши 1–5 */
BM.querySelector('#bmq').insertAdjacentHTML('beforebegin',`<button id="bmx2" ${bb_}>x${S.bx}</button>`);
BM.querySelector('#bmx2').onclick=e=>{e.stopPropagation();setBX(S.bx%5+1)};
addEventListener('keydown',e=>{if(bmOn&&/^[1-5]$/.test(e.key)&&!e.ctrlKey&&!e.metaKey)setBX(+e.key)});
(function lp(){requestAnimationFrame(lp);const p=g('bpl');if(!p||view!='beats')return;const live=an&&!au.paused,d=Math.pow(1-((performance.now()/1000*2.07)%1),3),k=Math.min(1,(live?K:d)*BXm);
  p.style.transform=`scale(${1+k*.5})`;[...g('bmt').children].forEach((x,i)=>x.style.height=Math.max(4,Math.min(1,(live?E[i]:d*(1-i*.12))*BXm)*44)+'px')})();
/* телефон: кнопка «＋» */
document.body.insertAdjacentHTML('beforeend','<button id="fab" aria-label="Добавить">＋</button>');
g('fab').onclick=e=>{e.stopPropagation();menu(e,[['Добавить музыку',()=>g('b1').click()],['Добавить папку',()=>g('b2').click()],['🔥 Бит-режим',bmOpen]])};
/* установка на телефон */
document.head.insertAdjacentHTML('beforeend','<meta name="theme-color" content="#0b0912"><meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"><meta name="apple-mobile-web-app-title" content="Music">');
try{const c=document.createElement('canvas');c.width=c.height=180;const x=c.getContext('2d'),gr=x.createLinearGradient(0,0,180,180);gr.addColorStop(0,'#ffb347');gr.addColorStop(1,'#ff3b6b');x.fillStyle=gr;x.fillRect(0,0,180,180);x.fillStyle='#fff';x.font='100px sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText('♪',90,98);const ic=c.toDataURL();

  const mf=URL.createObjectURL(new Blob([JSON.stringify({name:'Music Player',short_name:'Music',display:'standalone',background_color:'#0b0912',theme_color:'#0b0912',start_url:location.href,icons:[{src:ic,sizes:'180x180',type:'image/png'}]})],{type:'application/manifest+json'}));
  }catch{}
addEventListener('resize',()=>zoomTo((S.sc||1)*AK()));
applyUI();
})();