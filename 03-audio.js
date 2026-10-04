/* ---------- audio / EQ ---------- */
const BANDS=[60,230,910,3600,14000],PRE={Flat:[0,0,0,0,0],Rock:[5,3,-2,3,5],Pop:[-1,3,5,2,-1],Electronic:[6,3,0,2,5],Classical:[4,2,-1,3,4],Bass:[8,5,0,-1,-2],Vocal:[-2,1,5,4,1],Gaming:[4,0,2,5,3]};
function initAudio(){if(ctx)return;ctx=new AudioContext();let n=ctx.createMediaElementSource(au);an=ctx.createAnalyser();an.fftSize=1024;an.smoothingTimeConstant=.82;n.connect(an);BANDS.forEach((f,i)=>{const b=ctx.createBiquadFilter();b.type=i==0?'lowshelf':i==4?'highshelf':'peaking';b.frequency.value=f;b.gain.value=S.eq[i];n.connect(b);n=b;filt.push(b)});cm=ctx.createDynamicsCompressor();cm.attack.value=.003;cm.release.value=.2;setNight();lev=ctx.createGain();n.connect(lev);lev.connect(cm);mg=ctx.createGain();mg.gain.value=0;cm.connect(mg);mg.connect(ctx.destination);au.volume=1;applyVol()}
function play(id,list,pos){
  clearTimeout(play.t);
  if(document.hidden){play0(id,list,pos);fadeG=1;applyVol();return}
  if(ctx&&mg&&!au.paused&&pos===undefined&&ctx.state=='running'){fadeG=0;applyVol();clearTimeout(play.t);play.t=setTimeout(()=>{play0(id,list,pos);fadeG=1;applyVol()},170)}
  else{play0(id,list,pos);fadeG=1;applyVol()}}
function play0(id,list,pos){
  const t=T.get(id);if(!t)return;if(!t.yt&&!t.src&&!t.file){toast('Файл трека недоступен');return}initAudio();ctx.resume();if(list){ctxList=list;S.ctx=list}
  if(url)URL.revokeObjectURL(url);if(!t.yt)ytStop();if(t.yt){url=null;au.pause();au.removeAttribute('src');ytPlay(t.yt,pos)}else if(t.src){url=null;au.crossOrigin='anonymous';au.src=t.src}else{au.removeAttribute('crossorigin');url=URL.createObjectURL(t.file);au.src=url}
  if(pos&&!t.yt)au.addEventListener('loadedmetadata',()=>{au.currentTime=pos},{once:true});
  if(pos===undefined){au.play().catch(()=>{});played.add(id);
    const h=S.hist.find(x=>x.id==id);S.hist=[{id,at:Date.now(),n:(h?h.n:0)+1},...S.hist.filter(x=>x.id!=id)].slice(0,300)}
  S.cur=id;vibe(t);persist();ui();if(view=='now')render();
  if('mediaSession' in navigator)navigator.mediaSession.metadata=new MediaMetadata({title:t.title,artist:t.artist,album:t.album});
}
function next(auto){
  if(auto&&S.rep==2){if(isYT()&&yp){yp.seekTo(0,true);yp.playVideo()}else{au.currentTime=0;au.play()}return}
  while(S.q.length){const id=S.q.shift();if(T.has(id)){return play(id)}}
  const l=ctxList.filter(x=>T.has(x));if(!l.length)return;let id;const i=l.indexOf(S.cur);
  if(S.shuf){const r=l.filter(x=>!played.has(x));
    if(r.length)id=r[Math.random()*r.length|0];
    else if(S.rep==1||!auto){played.clear();const o=l.filter(x=>x!=S.cur);id=(o.length?o:l)[Math.random()*(o.length||l.length)|0]}
    else{au.pause();return}}
  else if(i+1>=l.length){if(S.rep==1||!auto)id=l[0];else{au.pause();return}}
  else id=l[i+1];
  play(id)}
function prev(){if(au.currentTime>3)return au.currentTime=0;const l=ctxList.filter(x=>T.has(x)),i=l.indexOf(S.cur);play(l[i>0?i-1:l.length-1]||S.cur)}
const toggle=()=>{if(isYT()){au.pause();if(yp&&yp.getPlayerState){if(yp.getPlayerState()==1)yp.pauseVideo();else{fadeG=1;applyVol();yp.playVideo()}}return}if(!au.src&&S.cur)return play(S.cur);if(au.paused){initAudio();ctx.resume();au.play();fadeG=1;applyVol()}else fadePause()};
const setVol=v=>{S.vol=Math.min(1,Math.max(0,v));applyVol();$('#vr').value=S.vol*100;$('#mu').textContent=S.vol==0||muted?'🔇':'🔊';persist()};
au.onended=()=>next(true);
au.onplay=au.onpause=()=>{if(isYT()){if(!au.paused)au.pause();return}$('#pp').textContent=au.paused?'▶':'⏸'};
au.onerror=()=>{if(!au.src)return;au.errN=(au.errN||0)+1;console.error('Ошибка воспроизведения',S.cur);if(au.errN>3){au.errN=0;toast('Несколько треков подряд не открылись — остановился (нет сети?)');return}toast('Не удаётся воспроизвести — пропускаю');setTimeout(()=>next(true),800)};au.addEventListener('playing',()=>{au.errN=0});
au.ontimeupdate=()=>{const d=au.duration||0;$('#tc').textContent=fmt(au.currentTime);$('#td').textContent=fmt(d);if(!seeking)$('#seek').value=d?au.currentTime/d*1000:0;S.pos=au.currentTime};
let seeking=false;const sk=$('#seek');sk.oninput=()=>{seeking=true};sk.onchange=()=>{if(isYT()&&yp&&yp.getDuration){yp.seekTo(sk.value/1000*(yp.getDuration()||0),true)}else au.currentTime=sk.value/1000*(au.duration||0);seeking=false};
setInterval(()=>{if(!au.paused)persist()},3000);