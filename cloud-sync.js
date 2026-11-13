/* cloud-sync.js v24 — синхронизация библиотеки между браузерами (Supabase).
   Порядок при старте: песни → настройки → перезагрузка. Подключается СРАЗУ ПОСЛЕ скрипта входа, до плеера.
   Принудительно: добавь к адресу ?cloud=push (облако := этот браузер) или ?cloud=pull (этот браузер := облако). */
(()=>{
const C=window.AUTH_CFG||{};let U=null;try{U=JSON.parse(localStorage.getItem('mp_auth'))}catch{}
if(!U||!U.cloud||!C.SB_URL||!C.SB_KEY)return;
const uid=String(U.id).replace(/^sb_/,''),BUCKET='tracks',MAXF=50*1024*1024,KB='mp_sync_base:'+uid,KT='mp_sync_ts:'+uid,HIDE=/^(mp:|mp_auth|mp_accts|mp_sync_|sb-)/;
const Q=new URLSearchParams(location.search).get('cloud');
let sb,busy=false,applying=false,ready=false,timer=0,last='',bigWarned=false;
const say=m=>{console.info('[cloud-sync]',m);let n=0;const t=()=>{try{toast(m)}catch{if(n++<30)setTimeout(t,500)}};t()};
const lib=()=>new Promise((r,j)=>{if(window.supabase)return r();const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';s.onload=r;s.onerror=()=>j(new Error('Supabase SDK не загрузился'));document.head.appendChild(s)});
const si=Storage.prototype.setItem;
Storage.prototype.setItem=function(k){const r=si.apply(this,arguments);if(ready&&!applying&&this===localStorage&&(k==='mp'||!HIDE.test(String(k))))schedule();return r};
const schedule=()=>{if(timer)return;timer=setTimeout(()=>{timer=0;pushSettings().catch(()=>{})},20000)};
const sj=o=>JSON.stringify(o,Object.keys(o).sort());
const snap=()=>{const o={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(!HIDE.test(k))o[k]=localStorage.getItem(k)}o.mp=localStorage.getItem('mp');return o};
async function pushSettings(force){const data=snap(),j=sj(data);if(!force&&j===last)return;const ts=Date.now();
  const{error}=await sb.from('user_data').upsert({user_id:uid,data,updated_at:new Date(ts).toISOString()});if(error)throw error;last=j;si.call(localStorage,KT,String(ts))}
/* ---- IndexedDB (свои соединения, не зависят от кода плеера) ---- */
const open=()=>new Promise((res,rej)=>{const r=indexedDB.open('mp',1);r.onupgradeneeded=()=>r.result.createObjectStore('t',{keyPath:'id'});r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
const idb=async(mode,f)=>{const d=await open();try{return await new Promise((res,rej)=>{const t=d.transaction('t',mode),q=f(t.objectStore('t'));t.oncomplete=()=>res(q&&q.result);t.onerror=t.onabort=()=>rej(t.error)})}finally{d.close()}};
const meta=t=>{const m={...t};['file','cover','cu','tmp','hue'].forEach(k=>delete m[k]);m.fname=t.file&&t.file.name||null;m.ftype=t.file&&t.file.type||'';return m};
async function up(path,blob,type){const{error}=await sb.storage.from(BUCKET).upload(path,blob,{upsert:true,contentType:type});if(error)throw error}
async function dl(path){const{data,error}=await sb.storage.from(BUCKET).download(path);if(error)throw error;return data}
const em=e=>e&&(e.message||e.error||e.statusText)||JSON.stringify(e);
async function syncTracks(){
  const L=new Map((await idb('readonly',s=>s.getAll())).map(t=>[t.id,t]));
  const{data:rem,error}=await sb.from('user_tracks').select('track_id,meta,file_path,cover_path').eq('user_id',uid).limit(5000);if(error)throw error;
  const R=new Map(rem.map(r=>[r.track_id,r])),base=new Set(JSON.parse(localStorage.getItem(KB)||'[]')),skip=new Set(),errs=[];let changed=false,nUp=0,nDown=0;
  for(const id of base){ /* удаление, сделанное на одной из сторон */
    try{
      if(!L.has(id)&&R.has(id)){const r=R.get(id);await sb.from('user_tracks').delete().eq('user_id',uid).eq('track_id',id);
        const p=[r.file_path,r.cover_path].filter(Boolean);if(p.length)await sb.storage.from(BUCKET).remove(p);R.delete(id);skip.add(id)}
      else if(L.has(id)&&!R.has(id)){await idb('readwrite',s=>s.delete(id));L.delete(id);skip.add(id);changed=true}
    }catch(e){errs.push('удаление: '+em(e))}}
  const need=[...R.values()].filter(r=>!L.has(r.track_id)&&!skip.has(r.track_id)&&r.meta);let i=0;
  for(const r of need){ /* сначала загрузка недостающих */
    i++;if(i%3==1)say(`Облако: загружаю песни ${i}/${need.length}`);
    try{
      const tr={...r.meta};
      if(r.file_path)tr.file=new File([await dl(r.file_path)],r.meta.fname||r.track_id,{type:r.meta.ftype||''});
      if(r.cover_path)tr.cover=await dl(r.cover_path);
      await idb('readwrite',s=>s.put(tr));L.set(tr.id,tr);changed=true;nDown++
    }catch(e){errs.push('загрузка «'+(r.meta.title||r.track_id)+'»: '+em(e))}}
  const ups=[...L.values()].filter(t=>!R.has(t.id)&&!skip.has(t.id));i=0;
  for(const t of ups){ /* потом отправка новых; сбой одного трека не мешает остальным */
    i++;if(ups.length>2&&i%3==1)say(`Облако: отправляю ${i}/${ups.length}`);
    try{
      if(t.file instanceof Blob&&t.file.size>MAXF){if(!bigWarned){bigWarned=true;say('Файл больше 50 МБ не попадёт в облако: '+(t.title||t.id))}continue}
      let fp=null,cp=null;
      if(t.file instanceof Blob){fp=uid+'/'+t.id;await up(fp,t.file,t.file.type||'audio/mpeg')}
      if(t.cover instanceof Blob){cp=uid+'/'+t.id+'.cover';await up(cp,t.cover,t.cover.type||'image/jpeg')}
      const{error:e}=await sb.from('user_tracks').upsert({user_id:uid,track_id:t.id,meta:meta(t),file_path:fp,cover_path:cp,updated_at:new Date().toISOString()});if(e)throw e;
      R.set(t.id,{track_id:t.id});nUp++
    }catch(e){errs.push('отправка «'+(t.title||t.id)+'»: '+em(e))}}
  si.call(localStorage,KB,JSON.stringify([...L.keys()].filter(id=>R.has(id))));
  if(nUp+nDown)say(`Облако: отправлено ${nUp}, загружено ${nDown}`);
  return{errs,changed}}
async function run(boot){if(busy||!navigator.onLine)return;busy=true;
  try{await lib();sb=sb||window.supabase.createClient(C.SB_URL,C.SB_KEY);
    const{data:ses}=await sb.auth.getSession();if(!ses.session||ses.session.user.id!==uid)return;
    let apply=null;
    if(boot){
      if(Q==='push')await pushSettings(true);
      else{const{data,error}=await sb.from('user_data').select('data,updated_at').eq('user_id',uid).maybeSingle();if(error)throw error;
        const lt=+localStorage.getItem(KT)||0;
        if(data&&(Q==='pull'||Date.parse(data.updated_at)>lt))apply=data;else{if(data)last=sj(data.data||{});await pushSettings()}}}
    const r=await syncTracks(); /* песни ДО настроек: иначе плеер обрежет избранное */
    if(apply){applying=true;try{for(const[k,v]of Object.entries(apply.data||{}))if(v!=null)localStorage.setItem(k,v)}finally{applying=false}
      last=sj(apply.data||{});si.call(localStorage,KT,String(Date.parse(apply.updated_at)))}
    else if(!boot)await pushSettings();
    if(Q)history.replaceState(null,'',location.pathname);
    window.cloudSyncLog=r.errs;
    if(r.errs.length){console.warn('[cloud-sync]',r.errs);say('Облако: не удалось '+r.errs.length+' шт. — '+r.errs[0].slice(0,110))}
    if(apply||r.changed){const playing=typeof au!=='undefined'&&au&&!au.paused;if(boot||!playing)location.reload();else say('Облако: появились новые песни — обнови страницу')}}
  catch(e){console.warn('[cloud-sync]',e);if(/relation|schema cache|bucket/i.test(em(e)||''))say('Облако: выполни supabase-sync.sql в Supabase');else say('Облако: '+String(em(e)).slice(0,120))}
  finally{busy=false;if(boot)ready=true}}
window.cloudSyncNow=()=>run(false);
run(true);
setInterval(()=>{if(!document.hidden)run(false)},60000);
addEventListener('online',()=>run(false));
document.addEventListener('visibilitychange',()=>{if(document.hidden&&ready&&sb)pushSettings().catch(()=>{})});
})();
