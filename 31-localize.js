/* Сохранение мировых треков в библиотеку: при «в плейлист» / ♥ трек Audius/iTunes скачивается файлом
   и становится обычным своим треком (играет офлайн, с эквалайзером). YouTube скачать нельзя — остаётся ссылкой. */
(()=>{
const busy=new Set(),failed=new Set();
const isWeb=t=>t&&t.src&&!t.file&&!t.yt;
async function localize(id){
  const w=T.get(id);if(!isWeb(w)||busy.has(id)||failed.has(id))return;busy.add(id);
  try{
    const r=await fetch(w.src);if(!r.ok)throw new Error('HTTP '+r.status);
    const bl=await r.blob();if(!bl.size||(bl.type&&!/audio|octet|mpeg|mp4|ogg/i.test(bl.type)))throw new Error('не аудио');
    const ext=/mp4|m4a|aac/i.test(bl.type)?'m4a':'mp3';
    const nm=`${w.artist} - ${w.title}`.replace(/[\\/:*?"<>|]/g,'').slice(0,120)+'.'+ext;
    const f=new File([bl],nm,{type:bl.type||'audio/mpeg'});
    let cover=null;if(w.curl){try{const c=await fetch(w.curl);if(c.ok)cover=await c.blob()}catch{}}
    const nid=crypto.randomUUID();
    const tr={id:nid,file:f,tg:1,genre:w.genre||'',year:'',cover,artist:w.artist,title:w.title,album:w.album||'—',fmt:ext.toUpperCase(),size:f.size,added:Date.now(),dur:w.dur||await dur(f)};
    await put(tr);T.set(nid,tr);
    const sw=a=>a.map(x=>x==id?nid:x);
    S.fav=sw(S.fav);S.q=sw(S.q);S.pl.forEach(p=>p.ids=sw(p.ids));S.hist.forEach(h=>{if(h.id==id)h.id=nid});
    ctxList=sw(ctxList);if(S.ctx)S.ctx=sw(S.ctx);
    if(S.cur==id&&au.paused){S.cur=nid}  /* играет сейчас — не прерываем, подменится при следующем запуске */
    if(S.cur!=id){T.delete(id);try{await tx('readwrite',s=>s.delete(id))}catch{}}
    persist();toast('Сохранено в «Моя музыка»: '+w.title);if(['lib','pls','fav','web'].includes(view)||openPl)render();
  }catch(e){failed.add(id);console.warn('localize',e);toast('«'+w.title+'» не скачался (источник не разрешает) — останется онлайн-ссылкой')}
  busy.delete(id)}
const oa=addToPl;addToPl=function(ids,p){oa(ids,p);ids.forEach(localize)};
/* ♥ на мировом треке тоже сохраняет файл */
document.addEventListener('click',e=>{const b=e.target.closest('[data-w] [data-k=fav]');if(!b)return;
  setTimeout(()=>{S.fav.forEach(id=>{if(isWeb(T.get(id)))localize(id)})},50)},true);
})();
