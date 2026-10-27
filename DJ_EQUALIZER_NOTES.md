/* cloud-sync.js — синхронизация библиотеки между браузерами через Supabase.
   Настройки/плейлисты/избранное → таблица user_data; песни и обложки → Storage 'tracks' + user_tracks.
   Требует supabase-sync.sql и входа в облачный аккаунт. */
(()=>{
const C=window.AUTH_CFG||{};let U=null;try{U=JSON.parse(localStorage.getItem('mp_auth'))}catch{}
if(!U||!U.cloud||!C.SB_URL||!C.SB_KEY)return;
const uid=String(U.id).replace(/^sb_/,''),BUCKET='tracks',MAXF=50*1024*1024;
const KB='mp_sync_base:'+uid,KT='mp_sync_ts:'+uid,HIDE=/^(mp:|mp_auth|mp_accts|mp_sync_|sb-)/;
let sb,busy=false,applying=false,timer=0,last='',bigWarned=false;
const say=m=>{try{toast(m)}catch{console.info('[sync]',m)}};
const lib=()=>new Promise((r,j)=>{if(window.supabase)return r();const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';s.onload=r;s.onerror=()=>j(new Error('Supabase SDK'));document.head.appendChild(s)});
/* любое изменение настроек → отложенная отправка (не чаще раза в 20 с) */
const si=Storage.prototype.setItem;
Storage.prototype.setItem=function(k){const r=si.apply(this,arguments);if(this===localStorage&&!applying&&sb&&!HIDE.test(String(k))||(k==='mp'&&!applying&&sb))schedule();return r};
const schedule=()=>{if(timer)return;timer=setTimeout(()=>{timer=0;pushSettings().catch(()=>{})},20000)};
const snap=()=>{const o={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(!HIDE.test(k))o[k]=localStorage.getItem(k)}o.mp=localStorage.getItem('mp');return o};
async function pushSettings(){const data=snap(),j=JSON.stringify(data);if(j===last)return;const ts=Date.now();
  const{error}=await sb.from('user_data').upsert({user_id:uid,data,updated_at:new Date(ts).toISOString()});
  if(error)throw error;last=j;si.call(localStorage,KT,String(ts))}
async function pullSettings(){const{data,error}=await sb.from('user_data').select('data,updated_at').eq('user_id',uid).maybeSingle();if(error)throw error;
  const lt=+localStorage.getItem(KT)||0;if(!data)return false;const rt=Date.parse(data.updated_at);if(rt<=lt)return false;
  applying=true;try{for(const[k,v]of Object.entries(data.data||{}))if(v!=null)localStorage.setItem(k,v)}finally{applying=false}
  si.call(localStorage,KT,String(rt));return true}
/* ---- песни ---- */
const idbAll=()=>new Promise((res,rej)=>{const r=indexedDB.open('mp',1);r.onupgradeneeded=()=>r.result.createObjectStore('t',{keyPath:'id'});
  r.onsuccess=()=>{const d=r.result,q=d.transaction('t').objectStore('t').getAll();q.onsuccess=()=>{res(q.result);d.close()};q.onerror=()=>rej(q.error)};r.onerror=()=>rej(r.error)});
const meta=t=>{const m={...t};['file','cover','cu','tmp','hue'].forEach(k=>delete m[k]);m.fname=t.file&&t.file.name||null;m.ftype=t.file&&t.file.type||'';return m};
async function up(path,blob,type){const{error}=await sb.storage.from(BUCKET).upload(path,blob,{upsert:true,contentType:type});if(error)throw error}
async function dl(path){const{data,error}=await sb.storage.from(BUCKET).download(path);if(error)throw error;return data}
async function syncTracks(){
  const L=new Map((await idbAll()).map(t=>[t.id,t]));
  const{data:rem,error}=await sb.from('user_tracks').select('track_id,meta,file_path,cover_path').eq('user_id',uid);if(error)throw error;
  const R=new Map(rem.map(r=>[r.track_id,r])),base=new Set(JSON.parse(localStorage.getItem(KB)||'[]')),skip=new Set();let changed=false,n=0;
  for(const id of base){ /* удаление, сделанное на одной из сторон */
    if(!L.has(id)&&R.has(id)){const r=R.get(id);await sb.from('user_tracks').delete().eq('user_id',uid).eq('track_id',id);
      const p=[r.file_path,r.cover_path].filter(Boolean);if(p.length)await sb.storage.from(BUCKET).remove(p);R.delete(id);skip.add(id)}
    else if(L.has(id)&&!R.has(id)){await tx('readwrite',s=>s.delete(id)).catch(()=>{});T.delete(id);L.delete(id);skip.add(id);changed=true}}
  for(const t of L.values()){if(R.has(t.id)||skip.has(t.id))continue; /* отправка новых */
    if(t.file instanceof Blob&&t.file.size>MAXF){if(!bigWarned){bigWarned=true;say('Файл больше 50 МБ не попадёт в облако: '+(t.title||t.id))}continue}
    let fp=null,cp=null;
    if(t.file instanceof Blob){fp=uid+'/'+t.id;await up(fp,t.file,t.file.type||'audio/mpeg')}
    if(t.cover instanceof Blob){cp=uid+'/'+t.id+'.cover';await up(cp,t.cover,t.cover.type||'image/jpeg')}
    const{error:e}=await sb.from('user_tracks').upsert({user_id:uid,track_id:t.id,meta:meta(t),file_path:fp,cover_path:cp,updated_at:new Date().toISOString()});if(e)throw e;
    R.set(t.id,{track_id:t.id})}
  const need=[...R.values()].filter(r=>!L.has(r.track_id)&&!skip.has(r.track_id)&&r.meta);
  for(const r of need){ /* загрузка недостающих */
    say(`Облако: загружаю песни ${++n}/${need.length}`);
    const tr={...r.meta};if(r.file_path)tr.file=new File([await dl(r.file_path)],r.meta.fname||r.track_id,{type:r.meta.ftype||''});
    if(r.cover_path)tr.cover=await dl(r.cover_path);
    await put(tr);T.set(tr.id,tr);L.set(tr.id,tr);changed=true}
  si.call(localStorage,KB,JSON.stringify([...L.keys()].filter(id=>R.has(id))));
  if(changed){try{render()}catch{}if(n)say(`Синхронизировано песен: ${n}`)}}
async function run(){if(busy||!navigator.onLine)return;busy=true;
  try{await lib();sb=sb||window.supabase.createClient(C.SB_URL,C.SB_KEY);
    const{data}=await sb.auth.getSession();if(!data.session||data.session.user.id!==uid)return;
    if(!run.pulled){run.pulled=1;if(await pullSettings()){location.reload();return}}
    await syncTracks();await pushSettings()}
  catch(e){console.warn('[cloud-sync]',e&&e.message||e);if(/relation|schema cache|bucket|not found/i.test(e&&e.message||''))say('Облако: выполни supabase-sync.sql в Supabase')}
  finally{busy=false}}
window.cloudSyncNow=run;
addEventListener('load',()=>setTimeout(run,1500));
setInterval(()=>{if(!document.hidden)run()},60000);
addEventListener('online',run);
document.addEventListener('visibilitychange',()=>{if(document.hidden&&sb)pushSettings().catch(()=>{})});
})();
