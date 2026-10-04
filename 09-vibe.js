/* ---------- vibe: covers, tags, analyser ---------- */
var an,lev,cm,mg,duckG=1,sleepG=1,fadeG=1,coverFor=null;const amb=$('#amb'),root=document.documentElement;
let ACC='',curH=40,buf=new Uint8Array(512),E=[0,0,0,0,0],P=[0,0,0,0,0],lastB=-1,lastT=0;
const put=t=>{const r={...t};delete r.cu;delete r.hue;return tx('readwrite',s=>s.put(r)).catch(()=>{})};
function setAccent(h){curH=h;root.style.setProperty('--h',h);root.style.removeProperty('--ac');ACC=(getComputedStyle(root).getPropertyValue('--ac')||'#f2f2f2').trim()}
const domHue=t=>new Promise(r=>{const i=new Image();i.onload=()=>{const c=document.createElement('canvas');c.width=c.height=16;const g=c.getContext('2d');g.drawImage(i,0,0,16,16);const d=g.getImageData(0,0,16,16).data;let x=0,y=0;
  for(let k=0;k<d.length;k+=4){const R=d[k]/255,G=d[k+1]/255,B=d[k+2]/255,mx=Math.max(R,G,B),mn=Math.min(R,G,B),sat=mx?(mx-mn)/mx:0;if(!sat)continue;
    let h=mx==R?((G-B)/(mx-mn))%6:mx==G?(B-R)/(mx-mn)+2:(R-G)/(mx-mn)+4;h*=Math.PI/3;const w=sat*mx;x+=Math.cos(h)*w;y+=Math.sin(h)*w}
  r(x||y?(Math.atan2(y,x)*180/Math.PI+360)%360:hue(t))};i.onerror=()=>r(hue(t));i.src=t.cu});
function vibe(t){P=[0,0,0,0,0];BA.style.cssText=cv(t);if(t.cu){if(t.hue!==undefined)setAccent(t.hue);else domHue(t).then(h=>{t.hue=h;if(S.cur==t.id)setAccent(h)})}else setAccent(hue(t))}
const RG=[[0,3],[3,8],[8,32],[32,120],[120,400]];
let bAvg=0,K=0,lastBeat=0,LV=0;
function fx(){const bg=document.getElementById('bigcv'),r=()=>Math.random()-.5;
  if(bg)bg.style.transform=`scale(${1+K*.08}) translate(${r()*8*K}px,${r()*8*K}px) rotate(${r()*2*K}deg)`;
  PCe.style.transform=`scale(${1+K*.14}) rotate(${r()*8*K}deg)`;BA.style.transform=`scale(${1.05+K*.05})`;
  PLe.style.boxShadow=K>.02?`0 -12px 50px -14px hsl(${curH} 0% 55%/${(K*.6).toFixed(2)})`:'none'}
function frame(now){requestAnimationFrame(frame);
  if(!an||au.paused){if(K>.01){K=0;fx()}return}
  an.getByteFrequencyData(buf);
  for(let i=0;i<5;i++){let s=0;const[a,b]=RG[i];for(let k=a;k<b;k++)s+=buf[k];E[i]=s/(b-a)/255;P[i]=P[i]*.995+E[i]*.005}
  const bs=Math.min(1,(E[0]*.6+E[1]*.4)*1.15),bl=E[0]*.7+E[1]*.3;
  bAvg=bAvg*.96+bl*.04;if(bl>bAvg*1.15+.03&&now-lastBeat>170){K=1;lastBeat=now}K*=.85;
  an.getByteTimeDomainData(tb);let q=0;for(let i=0;i<1024;i+=2){const v=(tb[i]-128)/128;q+=v*v}LV=LV*.985+Math.sqrt(q/512)*.015;
  if(lev){if(S.lv!==false&&LV>.008)lev.gain.value+=(Math.max(.5,Math.min(2,.13/LV))-lev.gain.value)*.006;else lev.gain.value+=(1-lev.gain.value)*.01}
  const bb=Math.min(1,bs*.7+K*.5);if(Math.abs(bb-lastB)>.02){lastB=bb;amb.style.setProperty('--b',bb.toFixed(2))}
  fx();
  const c=document.getElementById('vz');if(c)draw(c);
  if(now-lastT>800){lastT=now;mood();if(S.ae)autoEq()}}
const tb=new Uint8Array(1024);
function draw(c){const T=Math.min(3840,Math.round(c.clientWidth*(devicePixelRatio||1)*(parseFloat(document.documentElement.style.zoom)||1)));if(T>100&&Math.abs(c.width-T)>8){c.width=T;c.height=Math.round(T*.3)}const g=c.getContext('2d'),w=800,h=240,m=S.vm||0;g.setTransform(c.width/800,0,0,c.height/240,0,0);g.clearRect(0,0,w,h);g.fillStyle=g.strokeStyle=ACC;
  if(m==0){const n=56,bw=w/n;for(let i=0;i<n;i++){const v=buf[Math.floor(Math.pow(i/n,1.7)*300)+1]/255,bh=Math.max(4,v*h);g.globalAlpha=.35+v*.65;g.beginPath();g.roundRect?g.roundRect(i*bw+2,h-bh,bw-4,bh,5):g.rect(i*bw+2,h-bh,bw-4,bh);g.fill()}}
  else if(m==1){an.getByteTimeDomainData(tb);g.lineWidth=3;g.lineJoin='round';g.shadowColor=ACC;g.shadowBlur=14;g.beginPath();for(let i=0;i<w;i+=4){const v=tb[Math.floor(i/w*1000)]/128-1,y=h/2+v*h*.45;i?g.lineTo(i,y):g.moveTo(i,y)}g.stroke();g.shadowBlur=0}
  else{const n=96,cx=w/2,cy=h/2,r0=h*.28;g.lineWidth=3;g.lineCap='round';for(let i=0;i<n;i++){const v=buf[Math.floor(Math.pow((i%48)/48,1.6)*260)+1]/255,a=i/n*Math.PI*2-Math.PI/2,r1=r0+4+v*h*.3;g.globalAlpha=.3+v*.7;g.beginPath();g.moveTo(cx+Math.cos(a)*r0,cy+Math.sin(a)*r0);g.lineTo(cx+Math.cos(a)*r1,cy+Math.sin(a)*r1);g.stroke()}g.globalAlpha=.25;g.beginPath();g.arc(cx,cy,r0-6,0,7);g.stroke()}
  g.globalAlpha=1}
function mood(){const s=P.reduce((a,b)=>a+b,0),el=document.getElementById('mood');if(!el||s<.05)return;const lo=(P[0]+P[1])/s,hi=(P[3]+P[4])/s;
  el.textContent=lo>.4?'Тяжёлый, басовый звук':hi>.28?'Яркий, воздушный звук':P[2]/s>.33?'Вокальный, насыщенный звук':'Тёплый, ровный звук'}
function autoEq(){const s=P.reduce((a,b)=>a+b,0);if(s<.05)return;const m=s/5;
  S.eq=S.eq.map((g,i)=>{const t=Math.max(-7,Math.min(7,-(P[i]-m)/m*10));return Math.round((g+(t-g)*.15)*2)/2});applyEq();
  document.querySelectorAll('[data-b]').forEach(el=>{el.value=S.eq[el.dataset.b];el.parentNode.firstChild.textContent=S.eq[el.dataset.b]+' дБ'})}
const dec=d=>{const e=d[0],u=d.subarray(1),l=e==0?'windows-1252':e==3?'utf-8':(e==2||(u[0]==0xFE&&u[1]==0xFF))?'utf-16be':'utf-16le';try{return new TextDecoder(l).decode(u).replace(/\0[\s\S]*$/,'').replace(/^\uFEFF/,'').trim()}catch{return''}};
const MAP={TIT2:'title',TT2:'title',TPE1:'artist',TP1:'artist',TALB:'album',TAL:'album',TCON:'genre',TCO:'genre',TYER:'year',TYE:'year',TDRC:'year'};
async function tags(f){const o={};try{
  const h=new Uint8Array(await f.slice(0,10).arrayBuffer());
  if(String.fromCharCode(...h.slice(0,3))=='ID3'){
    const ver=h[3],sz=((h[6]&127)<<21)|((h[7]&127)<<14)|((h[8]&127)<<7)|(h[9]&127),v22=ver==2,hl=v22?6:10;
    const b=new Uint8Array(await f.slice(10,10+Math.min(sz,16e6)).arrayBuffer());let p=0;
    while(p+hl<=b.length&&b[p]){const id=String.fromCharCode(...b.slice(p,p+(v22?3:4)));let n;
      if(v22)n=(b[p+3]<<16)|(b[p+4]<<8)|b[p+5];else if(ver==4)n=((b[p+4]&127)<<21)|((b[p+5]&127)<<14)|((b[p+6]&127)<<7)|(b[p+7]&127);else n=((b[p+4]<<24)|(b[p+5]<<16)|(b[p+6]<<8)|b[p+7])>>>0;
      if(n<=0||p+hl+n>b.length)break;const d=b.subarray(p+hl,p+hl+n);p+=hl+n;
      if(MAP[id]){let v=dec(d);const k=MAP[id];if(k=='genre'&&/^\(?\d+\)?$/.test(v))v='';if(k=='year')v=v.slice(0,4);if(v&&!o[k])o[k]=v}
      else if((id=='APIC'||id=='PIC')&&!o.cover){const e=d[0];let i=1;if(v22)i=4;else{while(d[i])i++;i++}i++;
        if(e==1||e==2){while(i+1<d.length&&(d[i]||d[i+1]))i+=2;i+=2}else{while(d[i])i++;i++}
        const im=d.subarray(i);if(im.length>100)o.cover=new Blob([im],{type:im[0]==0x89?'image/png':'image/jpeg'})}}
  }else if(String.fromCharCode(...h.slice(0,4))=='fLaC'){
    const b=new Uint8Array(await f.slice(0,8e6).arrayBuffer());let p=4,last=0;
    while(!last&&p+4<=b.length){last=b[p]>>7;const ty=b[p]&127,n=(b[p+1]<<16)|(b[p+2]<<8)|b[p+3];p+=4;const d=b.subarray(p,p+n),v=new DataView(d.buffer,d.byteOffset,d.byteLength);
      if(ty==4){let q=4+v.getUint32(0,true);const c=v.getUint32(q,true);q+=4;const K={TITLE:'title',ARTIST:'artist',ALBUM:'album',GENRE:'genre',DATE:'year'};
        for(let k=0;k<c&&q+4<=d.length;k++){const l=v.getUint32(q,true);q+=4;const [kk,...r]=new TextDecoder().decode(d.subarray(q,q+l)).split('=');q+=l;const m=K[kk.toUpperCase()],val=r.join('=');if(m&&val)o[m]=m=='year'?val.slice(0,4):val}}
      if(ty==6&&!o.cover){let q=4;const ml=v.getUint32(q);q+=4;const mime=new TextDecoder().decode(d.subarray(q,q+ml));q+=ml;const dl=v.getUint32(q);q+=4+dl+16;const il=v.getUint32(q);q+=4;o.cover=new Blob([d.subarray(q,q+il)],{type:mime||'image/jpeg'})}
      p+=n}}
 }catch(e){console.error('Теги',f.name,e)}return o}
async function upgradeTags(){let ch=0;for(const t of T.values()){if(t.tg||!t.file)continue;const g=await tags(t.file);
  if(g.title||g.artist||g.album||g.genre||g.cover){Object.assign(t,{title:g.title||t.title,artist:g.artist||t.artist,album:g.album||t.album,genre:g.genre||'',year:g.year||'',cover:g.cover||t.cover||null,tg:1});await put(t);ch++}}
  if(ch){render();toast(`Обновлены теги и обложки: ${ch}`)}}
$('#fc').onchange=async e=>{const f=e.target.files[0];e.target.value='';const t=T.get(coverFor);if(!f||!t)return;if(t.cu)URL.revokeObjectURL(t.cu);t.cover=f;t.cu=null;t.hue=undefined;t.tg=1;await put(t);render();if(S.cur==t.id){vibe(t);ui()}toast('Обложка обновлена')};
$('#now').onclick=e=>{if(!e.target.closest('#pf')){view='now';S.view=view;persist();render()}};
$('#main').addEventListener('change',e=>{if(e.target.id=='ae'){S.ae=e.target.checked;persist();toast(S.ae?'Авто-эквалайзер включён':'Авто-эквалайзер выключен')}});
addEventListener('pagehide',persist);document.addEventListener('visibilitychange',()=>{if(document.hidden)persist()});
const vmBar=()=>[['0','Бары'],['1','Волна'],['2','Кольцо']].map(([k,n])=>`<button class="vmb ${(S.vm||0)==k?'on':''}" data-vm="${k}">${n}</button>`).join('');
let sleepAt=0;
setInterval(()=>{if(!sleepAt)return;const r=(sleepAt-Date.now())/1000;if(r<=0){sleepAt=0;sleepG=1;applyVol();au.pause();try{if(isYT()&&yp&&yp.pauseVideo)yp.pauseVideo()}catch{}toast('Таймер сна: музыка остановлена');return}if(r<30&&!au.paused){sleepG=r/30;applyVol()}},500);
$('#main').addEventListener('click',e=>{const b=e.target.closest('[data-vm]');if(b){S.vm=+b.dataset.vm;persist();document.querySelectorAll('[data-vm]').forEach(x=>x.classList.toggle('on',x.dataset.vm==S.vm))}});
$('#main').addEventListener('change',e=>{if(e.target.id=='sl'){const m=+e.target.value;sleepAt=m?Date.now()+m*6e4:0;if(!m){sleepG=1;applyVol()}toast(m?`Музыка затихнет через ${m} мин`:'Таймер сна выключен')}});
const nextName=()=>{if(S.q.length&&T.has(S.q[0]))return T.get(S.q[0]).title+' (из очереди)';if(S.shuf)return 'случайная песня';const l=ctxList.filter(x=>T.has(x)),i=l.indexOf(S.cur),id=l[i+1]||(S.rep==1?l[0]:null);return id?T.get(id).title:'конец списка'};
const transport=t=>{const d=au.duration||t.dur||0;return `<div class="tp"><div class="tr"><span class="d" id="ntc">${fmt(au.currentTime)}</span><input type="range" id="nseek" min="0" max="1000" value="${d?au.currentTime/d*1000:0}" aria-label="Перемотка"><span class="d" id="ntd">${fmt(d)}</span></div>
<div class="tb"><button data-t="shuf" class="${S.shuf?'on':''}" title="Перемешать песни">🔀 Разнобой</button><button data-t="prev" title="Назад">⏮</button><button data-t="b10" title="Назад 10 секунд">⏪ 10</button><button class="pp2" id="npp" data-t="toggle" title="Пауза / Играть">${au.paused?'▶':'⏸'}</button><button data-t="f10" title="Вперёд 10 секунд">10 ⏩</button><button data-t="next" title="Дальше">⏭</button><button data-t="stop" title="Стоп">⏹</button><button data-t="rep" class="${S.rep?'on':''}" title="Повтор">${S.rep==2?'↻1':'↻'}</button></div>
<small id="nxt">Дальше: ${esc(nextName())}</small></div>`};
function razn(force){
  if(!T.size)return toast('Сначала добавьте музыку');
  if(S.shuf&&!force){S.shuf=false;persist();ui();if(view=='now')render();return toast('Разнобой выключен')}
  S.shuf=true;played.clear();let l=ctxList.filter(x=>T.has(x));if(!l.length){l=[...T.keys()];ctxList=l;S.ctx=l}
  play(l[Math.random()*l.length|0]);ui();if(view=='now')render();toast('Разнобой: песни перемешаны')}
let nseeking=false;
au.addEventListener('timeupdate',()=>{const a=document.getElementById('ntc');if(!a)return;const d=au.duration||0;a.textContent=fmt(au.currentTime);document.getElementById('ntd').textContent=fmt(d);if(!nseeking)document.getElementById('nseek').value=d?au.currentTime/d*1000:0});
['play','pause'].forEach(ev=>au.addEventListener(ev,()=>{const b=document.getElementById('npp');if(b)b.textContent=au.paused?'▶':'⏸'}));
au.addEventListener('loadedmetadata',()=>{const a=document.getElementById('ntd');if(a)a.textContent=fmt(au.duration||0)});
$('#main').addEventListener('input',e=>{if(e.target.id=='nseek')nseeking=true});
$('#main').addEventListener('change',e=>{if(e.target.id=='nseek'){au.currentTime=e.target.value/1000*(au.duration||0);nseeking=false}});
$('#main').addEventListener('click',e=>{const b=e.target.closest('[data-t]');if(!b)return;const k=b.dataset.t;
  if(k=='toggle'){if(!S.cur){if(T.size){const l=[...T.keys()];ctxList=l;S.ctx=l;play(l[0])}else toast('Сначала добавьте музыку')}else toggle()}
  else if(k=='prev')prev();
  else if(k=='next')next(false);
  else if(k=='b10')au.currentTime=Math.max(0,au.currentTime-10);
  else if(k=='f10')au.currentTime=Math.min(au.duration||1e9,au.currentTime+10);
  else if(k=='stop'){fadePause(()=>{au.currentTime=0})}
  else if(k=='rep'){$('#rp').click();render()}
  else if(k=='shuf')razn();
  else if(k=='mix'){if(view=='lib')ctxList=libIds();else if(openPl){const pl=S.pl.find(x=>x.id==openPl);if(pl)ctxList=pl.ids.filter(i=>T.has(i))}S.ctx=ctxList;razn(true)}});
const BA=$('#bgart'),PCe=$('#pc'),PLe=$('#pl');
const applyVol=()=>{const v=Math.max(0,Math.min(1,S.vol*(S.cap||1)*duckG*sleepG*fadeG*(muted?0:1)));if(typeof ytVol=='function')ytVol();if(mg){if(ctx.state!='running')mg.gain.value=v;else{mg.gain.cancelScheduledValues(ctx.currentTime);mg.gain.setValueAtTime(mg.gain.value,ctx.currentTime);mg.gain.linearRampToValueAtTime(v,ctx.currentTime+(fadeG==0?.04:.06))}}else au.volume=v;$('#vr').title=Math.round(S.vol*100)+'%'};
function fadePause(cb){fadeG=0;applyVol();setTimeout(()=>{au.pause();try{if(isYT()&&yp&&yp.pauseVideo)yp.pauseVideo()}catch{}if(cb)cb()},170)}
function setNight(){if(cm){cm.threshold.value=S.night?-26:-8;cm.ratio.value=S.night?6:8;cm.knee.value=S.night?24:14}}
let micCtx,micAn,micStream,micBuf=new Uint8Array(512),fastL=0,slowL=0,lastHit=0,dSince=0;
async function startSense(kind){stopSense();if(kind=='app')return startAppSense();
  try{const st=kind=='sys'?await navigator.mediaDevices.getDisplayMedia({video:{width:1,height:1,frameRate:1},audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false,suppressLocalAudioPlayback:true,restrictOwnAudio:true}}):await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:false,autoGainControl:false}});
    const at=st.getAudioTracks();st.getVideoTracks().forEach(t=>{t.stop();st.removeTrack(t)});if(!at.length){st.getTracks().forEach(t=>t.stop());S.sense='';persist();render();return toast('Звук не передан: отметьте «Поделиться звуком»')}
    micStream=st;micCtx=new AudioContext();micAn=micCtx.createAnalyser();micAn.fftSize=512;micCtx.createMediaStreamSource(new MediaStream(at)).connect(micAn);fastL=slowL=0;
    at[0].onended=()=>{stopSense();S.sense='';persist();render()};S.sense=kind;persist();render();toast(kind=='sys'?'Слушаю звук компьютера':'Слушаю микрофон')
  }catch(e){S.sense='';persist();render();toast('Нет доступа к звуку ('+(e.name||'ошибка')+')')}}
function stopSense(){if(window.stopAppSense)stopAppSense();if(micStream)micStream.getTracks().forEach(t=>t.stop());if(micCtx)micCtx.close().catch(()=>{});micStream=micCtx=micAn=null;duckG=1;applyVol();const b=document.getElementById('duckb');if(b)b.style.display='none'}
setInterval(()=>{const st=document.getElementById('snst');if(!micAn){if(st)st.textContent=window.appSenseText?appSenseText():'Не подключено';return}
  micAn.getByteTimeDomainData(micBuf);let q=0;for(let i=0;i<512;i++){const v=(micBuf[i]-128)/128;q+=v*v}const r=Math.sqrt(q/512);
  fastL=fastL*.6+r*.4;const now=performance.now(),thr=slowL*(2.6-(S.sens||5)*.15)+.01;
  if(fastL>thr)lastHit=now;const ducked=now-lastHit<1700;
  if(ducked){if(!dSince)dSince=now}else dSince=0;
  slowL=ducked&&!(dSince&&now-dSince>4000)?slowL*.9995+r*.0005:slowL*.985+r*.015;
  const want=ducked?(S.duckTo??.3):1;duckG+=(want-duckG)*(want<duckG?.12:.035);if(Math.abs(duckG-want)<.01)duckG=want;applyVol();
  const bd=document.getElementById('duckb');if(bd)bd.style.display=duckG<.9?'inline-block':'none';if(st)st.textContent=duckG<.9?'Слышу звук: музыка приглушена':'Слушаю…'},60);
$('#main').addEventListener('change',e=>{const i=e.target.id;if(i=='lv'){S.lv=e.target.checked;persist()}else if(i=='nt'){S.night=e.target.checked;setNight();persist()}else if(i=='kp'){S.keep=e.target.checked;persist();toast(S.keep?'Режимы будут сохраняться':'Каждый запуск — с чистого листа')}});
$('#main').addEventListener('input',e=>{const i=e.target.id,v=+e.target.value;
  if(i=='cap'){S.cap=v/100;applyVol();document.getElementById('capv').textContent=v+'%';persist()}
  else if(i=='sens'){S.sens=v;persist()}
  else if(i=='dto'){S.duckTo=v/100;document.getElementById('dtov').textContent=v+'%';persist()}});
$('#main').addEventListener('click',e=>{const b=e.target.closest('[data-sn]');if(!b)return;const k=b.dataset.sn;if(!k){stopSense();S.sense='';persist();render()}else startSense(k)});