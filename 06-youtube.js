/* ---------- YouTube ---------- */
let yp=null;
const isYT=()=>{const t=T.get(S.cur);return !!(t&&t.yt)};
let ytTok=0;
const ytStop=()=>{ytTok++;try{yp&&yp.pauseVideo&&yp.pauseVideo();yp&&yp.stopVideo&&yp.stopVideo()}catch{}};
const ytVol=()=>{try{yp&&yp.setVolume&&yp.setVolume(Math.round(100*Math.max(0,Math.min(1,S.vol*(S.cap||1)*duckG*sleepG*(muted?0:1)))))}catch{}};
function ytLoad(cb){if(window.YT&&YT.Player)return cb();window.onYouTubeIframeAPIReady=cb;if(!$('#ytapi')){const e=document.createElement('script');e.id='ytapi';e.src='https://www.youtube.com/iframe_api';e.onerror=()=>toast('YouTube не загружается (в России без VPN он часто недоступен)');document.head.append(e);setTimeout(()=>{if(!(window.YT&&YT.Player))toast('YouTube не отвечает — нужен VPN или выберите «Только Audius»')},8000)}}
var ytPlay=function ytPlay0(id,pos){
  const tk=++ytTok;
  ytLoad(()=>{
    if(tk!==ytTok)return; /* пока грузился YouTube, выбрали другой трек — не запускаем */
    if(!yp)yp=new YT.Player('ytf',{width:'100%',height:'100%',videoId:id,playerVars:{playsinline:1,controls:0,rel:0,modestbranding:1,iv_load_policy:3,disablekb:1,autoplay:pos===undefined?1:0,start:pos|0,origin:location.origin},events:{
      onReady:()=>ytVol(),
      onStateChange:e=>{if(e.data===1&&!isYT()){try{yp.stopVideo()}catch{}return}if(e.data===1)ytVol();if(e.data===0)next(true);$('#pp').textContent=e.data===1?'⏸':'▶'},
      onError:e=>{toast('YouTube: не удалось воспроизвести (код '+e.data+(e.data==153?': откройте плеер через http://localhost, а не как файл':'')+')');if(e.data!=153)setTimeout(()=>next(true),1500)}}});
    else if(pos===undefined)yp.loadVideoById(id);else yp.cueVideoById(id,pos)})}
setInterval(()=>{if(!isYT()||!yp||!yp.getCurrentTime)return;try{const c=yp.getCurrentTime(),d=yp.getDuration()||0;$('#tc').textContent=fmt(c);$('#td').textContent=fmt(d);if(!seeking)$('#seek').value=d?c/d*1000:0;S.pos=c;ytVol()}catch{}},400);
const PIPED=['https://pipedapi.kavin.rocks','https://pipedapi.adminforge.de','https://api.piped.private.coffee'];
const ytdec=s=>{const e=document.createElement('textarea');e.innerHTML=s||'';return e.value};
const ISO=d=>{const m=/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(d||'')||[];return (+m[1]||0)*3600+(+m[2]||0)*60+(+m[3]||0)};
const mapY=(id,title,artist,dur,thumb)=>({id:'yt:'+id,yt:id,title,artist,album:'YouTube',dur,curl:thumb||'',fmt:'WEB',size:0});
async function ytSearch(q){
  if(S.ytk){const r=await J(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCategoryId=10&maxResults=25&q=${encodeURIComponent(q)}&key=${S.ytk}`);
    if(r.error)throw new Error(r.error.message);
    const it=r.items||[],du={};try{const v=await J(`https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${it.map(x=>x.id.videoId).join(',')}&key=${S.ytk}`);(v.items||[]).forEach(x=>du[x.id]=ISO(x.contentDetails.duration))}catch{}
    return it.map(x=>mapY(x.id.videoId,ytdec(x.snippet.title),ytdec(x.snippet.channelTitle),du[x.id.videoId]||0,(x.snippet.thumbnails.medium||x.snippet.thumbnails.default).url))}
  for(const h of PIPED){try{const r=await J(`${h}/search?q=${encodeURIComponent(q)}&filter=music_songs`);const it=(r.items||[]).filter(x=>x.url&&x.url.includes('v='));
    if(it.length)return it.map(x=>mapY(x.url.split('v=')[1].split('&')[0],x.title,(x.uploaderName||'').replace(' - Topic',''),x.duration||0,x.thumbnail))}catch{}}
  throw new Error('Поиск YouTube недоступен без ключа API (см. внизу страницы)')}
let WE='';
const wrow=(w,i)=>`<div class="row ${S.cur==w.id?'on':''}" data-w="${i}"><div class="cv" style="${cv(w)}"></div><div class="tt"><b>${esc(w.title)}</b><small>${esc(w.artist)} · ${esc(w.album)}${w.yt?' · <i>без эквалайзера</i>':''}</small></div><span class="d">${fmt(w.dur)}</span><button data-k="fav" style="${S.fav.includes(w.id)?'color:var(--ac)':''}" title="Лайк">♥</button><button data-k="pl" title="В плейлист">＋ в плейлист</button>${w.dl?'<button data-k="dl" title="Скачать">⬇</button>':''}</div>`;
function webView(m){
  m.innerHTML=`<h2>Поиск в мире</h2><div class="bar"><input type="search" id="wq" placeholder="Название песни или исполнитель" value="${esc(WQ)}"><button class="add" style="margin:0" id="wgo">Найти</button><select id="ws"><option value="all" ${WS=='all'?'selected':''}>YouTube + Audius</option><option value="yt" ${WS=='yt'?'selected':''}>Только YouTube</option><option value="audius" ${WS=='audius'?'selected':''}>Только Audius</option></select><button id="wrnd">🎲 Случайные полные треки</button></div>
  ${WA.length?'<div class="bar"><small>Исполнители и группы:</small>'+WA.map((a,i)=>`<button class="chip" data-ar="${i}" style="margin:0">${esc(a.n)}</button>`).join('')+'</div>':''}${WT?`<h3>${esc(WT)} — песни</h3>`:''}
  ${WBUSY?'<div class="empty">Загрузка…</div>':WR.length?WR.map(wrow).join(''):`<div class="empty">${WMSG||'Введите запрос или нажмите «Случайные песни»: плеер сам включит подборку, а ♥ сохранит понравившееся в «Избранное»'}</div>`}
  <p><small>Лайк, «в плейлист» и очередь сохраняют песню в вашу библиотеку (хранится только ссылка). Треки полные: YouTube (почти любые песни) и Audius. Из Audius и iTunes трек при «в плейлист» или ♥ скачивается в «Мою музыку» (там работает эквалайзер). YouTube скачать нельзя. Кнопка ⬇ — только для разрешённых автором.</small></p><div class="bar"><input type="text" id="yk" style="flex:1" placeholder="Ключ YouTube Data API (необязательно — повышает надёжность поиска)" value="${esc(S.ytk||'')}"></div>`;
  $('#wq').onkeydown=e=>{if(e.key=='Enter'){WQ=e.target.value.trim();WQ&&wsearch()}};
  $('#wq').oninput=e=>WQ=e.target.value;
  
  document.querySelectorAll('[data-ar]').forEach(b=>b.onclick=()=>wartist(WA[+b.dataset.ar]));
  $('#ws').onchange=e=>{WS=e.target.value};$('#yk').onchange=e=>{S.ytk=e.target.value.trim();persist();toast('Ключ сохранён')};
  $('#wgo').onclick=()=>{WQ=$('#wq').value.trim();WQ&&wsearch()};$('#wrnd').onclick=()=>wfetch(true)}
$('#main').addEventListener('click',async e=>{
  const r=e.target.closest('[data-w]');if(!r)return;e.stopPropagation();
  const w=WR[+r.dataset.w],b=e.target.closest('button'),k=b&&b.dataset.k;
  if(k=='fav'){const id=ing(w);S.fav=S.fav.includes(id)?S.fav.filter(x=>x!=id):[...S.fav,id];persist();b.style.color=S.fav.includes(id)?'var(--ac)':'';return ui()}
  if(k=='pl')return plMenu({target:b},[ing(w)]);
  if(k=='dl'){try{toast('Скачиваю…');const bl=await(await fetch(w.src)).blob(),nm=`${w.artist} - ${w.title}`.replace(/[\\/:*?"<>|]/g,'').slice(0,120)+'.mp3',f=new File([bl],nm,{type:bl.type||'audio/mpeg'});
      const l=document.createElement('a');l.href=URL.createObjectURL(f);l.download=nm;l.click();
      await imp([f]);const t=[...T.values()].find(x=>x.file&&x.file.name===nm);
      if(t){let p=S.pl.find(x=>x.name=='Скачанное');if(!p){p={id:crypto.randomUUID(),name:'Скачанное',ids:[]};S.pl.push(p)}addToPl([t.id],p)}}
    catch(err){console.error(err);toast('Скачивание недоступно для этого трека')}return}
  play(ing(w),WR.map(ing))},true);

