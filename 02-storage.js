/* ---------- storage ---------- */
const idb=()=>new Promise((res,rej)=>{const r=indexedDB.open('mp',1);r.onupgradeneeded=()=>r.result.createObjectStore('t',{keyPath:'id'});r.onsuccess=()=>res(r.result);r.onerror=()=>rej()});
const tx=(m,f)=>new Promise((res,rej)=>{const t=db.transaction('t',m),r=f(t.objectStore('t'));t.oncomplete=()=>res(r.result);t.onerror=()=>rej()});
const dur=f=>new Promise(r=>{const a=new Audio(),u=URL.createObjectURL(f);const d=v=>{URL.revokeObjectURL(u);r(v)};a.preload='metadata';a.onloadedmetadata=()=>d(a.duration||0);a.onerror=()=>d(0);setTimeout(()=>d(0),3000);a.src=u});
async function imp(files){
  files=[...files].filter(f=>/\.(mp3|wav|flac|ogg|m4a|aac|opus)$/i.test(f.name));
  if(!files.length)return toast('Подходящих аудиофайлов не найдено');
  let n=0;
  for(const f of files){
    if([...T.values()].some(t=>t.file&&t.file.name===f.name&&t.size===f.size))continue;
    const b=f.name.replace(/\.[^.]+$/,''),p=b.split(' - '),id=crypto.randomUUID();
    const g=await tags(f);const tr={id,file:f,tg:1,genre:g.genre||'',year:g.year||'',cover:g.cover||null,artist:g.artist||(p.length>1?p[0].trim():'Неизвестный исполнитель'),title:g.title||(p.length>1?p.slice(1).join(' - '):b).trim(),
      album:g.album||(f.webkitRelativePath?(f.webkitRelativePath.split('/').slice(-2,-1)[0]||'—'):'—'),fmt:f.name.split('.').pop().toUpperCase(),size:f.size,added:Date.now()+n,dur:await dur(f)};
    await put(tr);
    T.set(id,tr);n++;if(n%5==0)toast(`Добавлено ${n} из ${files.length}`);
  }
  toast(`Добавлено песен: ${n}`);render();
}