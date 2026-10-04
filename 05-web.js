/* ---------- world search (Audius = full tracks, iTunes = 30s previews) ---------- */
const AU='https://api.audius.co/v1',AP='app_name=MusicPlayer';
const RA='Скриптонит, Баста, Монеточка, Oxxxymiron, Miyagi & Эндшпиль, Макс Корж, Тима Белорусских, Zivert, MORGENSHTERN, Мот, Егор Крид, Клава Кока, Каспийский Груз, ЛСП, Элджей, Полматери, HammAli & Navai, Artik & Asti, Кино, Ленинград, Мумий Тролль, ДДТ';
let WR=[],WQ='',WS='all',WA=[],WT='',WBUSY=false,WMSG='';
const mapA=x=>({id:'au:'+x.id,src:`${AU}/tracks/${x.id}/stream?${AP}`,title:x.title,artist:(x.user&&x.user.name)||'—',album:'Audius',dur:x.duration||0,curl:(x.artwork&&(x.artwork['480x480']||x.artwork['150x150']))||'',fmt:'WEB',size:0,genre:x.genre||'',dl:!!((x.access&&x.access.download)||x.is_downloadable)});
const mapI=x=>({id:'it:'+x.trackId,src:x.previewUrl,title:x.trackName,artist:x.artistName,album:(x.collectionName||'iTunes')+' · отрывок 30 с',dur:30,curl:(x.artworkUrl100||'').replace('100x100','300x300'),fmt:'WEB',size:0,genre:x.primaryGenreName||''});
const shuffle=a=>a.map(x=>[Math.random(),x]).sort((p,q)=>p[0]-q[0]).map(x=>x[1]);
const ing=w=>{if(!T.has(w.id))T.set(w.id,{...w,file:null,tg:1,added:Date.now(),tmp:1});return w.id};
async function wfetch(rand){
  WBUSY=true;WMSG='';render();
  try{
    let list;
    const WM='world';
    if(rand&&WS!='audius'){const Q=['русские хиты','топ песен россия','новинки русская музыка','русский рэп хиты','поп хиты','rock hits','top hits'];try{list=await ytSearch(Q[Math.random()*Q.length|0])}catch(e){console.warn(e);toast('YouTube без ключа не работает — включаю Audius');list=((await J(`${AU}/tracks/trending?limit=100&time=allTime&${AP}`)).data||[]).map(mapA)}}
    else if(rand&&(WM=='chart'||WM=='chartw')){
      const C=WM=='chart'?['ru']:['us','gb','de','fr','br','tr','kz','ua'],cc=C[Math.random()*C.length|0];let ids=null;
      try{const ch=await J(`https://rss.applemarketingtools.com/api/v2/${cc}/music/most-played/100/songs.json`);ids=shuffle((ch.feed.results||[]).map(x=>x.id)).slice(0,40)}catch(e){console.warn('chart failed, fallback',e)}
      if(ids)list=((await J(`https://itunes.apple.com/lookup?id=${ids.join(',')}&country=${cc}`)).results||[]).filter(x=>x.previewUrl).map(mapI);
      else{list=await byArtists();toast('Чарт недоступен — играю по списку исполнителей')}}
    else if(rand&&WM=='ru'){list=await byArtists()}
    else if(WM=='world'||WS=='audius'){
      const G=['','Electronic','Rock','Pop','Hip-Hop/Rap','Alternative','Jazz','Metal','Lo-Fi'],g=G[Math.random()*G.length|0];
      const u=rand?`${AU}/tracks/trending?limit=100&time=allTime${g?'&genre='+encodeURIComponent(g):''}&${AP}`:`${AU}/tracks/search?query=${encodeURIComponent(WQ)}&${AP}`;
      list=((await J(u)).data||[]).map(mapA)}
    else{
      const W=['love','night','dance','summer','dream','fire','city','star','road','heart'],term=rand?W[Math.random()*W.length|0]:WQ;
      list=((await(await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=music&entity=song&limit=50`)).json()).results||[]).filter(x=>x.previewUrl).map(mapI)}
    WR=rand?shuffle(list).slice(0,30):list;
    if(!WR.length)WMSG='Ничего не найдено';
    else if(rand){S.shuf=true;played.clear();play(ing(WR[0]),WR.map(ing))}
  }catch(e){console.error(e);WMSG='Не удалось связаться с сервисом ('+(e&&e.message||e)+'). Нажмите F12 → Console и пришлите красную ошибку.'}
  WBUSY=false;if(view=='web')render()}

const JP=u=>new Promise((res,rej)=>{const n='jp'+Math.random().toString(36).slice(2),sc=document.createElement('script'),cl=()=>{delete window[n];sc.remove()};window[n]=d=>{cl();res(d)};sc.onerror=()=>{cl();rej(new Error('jsonp'))};setTimeout(()=>rej(new Error('timeout')),8000);sc.src=u+(u.includes('?')?'&':'?')+'callback='+n;document.head.append(sc)});
const J=async u=>{try{const r=await fetch(u);if(!r.ok)throw new Error('HTTP '+r.status);return await r.json()}catch(e){if(/^https:\/\/itunes\.apple\.com\/(search|lookup)/.test(u))return JP(u);throw e}};
async function byArtists(){const A=(S.ra||RA).split(',').map(x=>x.trim()).filter(Boolean);
  return (await Promise.all(shuffle(A).slice(0,8).map(a=>J(`https://itunes.apple.com/search?term=${encodeURIComponent(a)}&country=ru&media=music&entity=song&limit=8`).then(j=>j.results||[]).catch(()=>[])))).flat().filter(x=>x.previewUrl).map(mapI)}
async function wsearch(){
  WBUSY=true;WMSG='';WA=[];WT='';WE='';render();
  try{
    const yq=WS!='audius'?ytSearch(WQ).catch(e=>{WE=e.message;return[]}):[];
    const q=encodeURIComponent(WQ),I=false,A=WS!='yt',it='https://itunes.apple.com/search?term='+q+'&media=music&limit=40',ok=p=>Promise.resolve(p).catch(()=>null);
    const [s1,s2,a1,a2,t3,u3]=await Promise.all([I&&J(it+'&entity=song&country=ru'),I&&J(it+'&entity=song'),I&&J(it+'&entity=musicArtist&country=ru'),I&&J(it+'&entity=musicArtist'),A&&J(`${AU}/tracks/search?query=${q}&${AP}`),A&&J(`${AU}/users/search?query=${q}&${AP}`)].map(p=>p?ok(p):null));
    const seen=new Set(),songs=[];
    for(const x of [...((s1&&s1.results)||[]),...((s2&&s2.results)||[])])if(x.previewUrl&&!seen.has(x.trackId)){seen.add(x.trackId);songs.push(mapI(x))}
    WR=[...(await yq),...songs,...((t3&&t3.data)||[]).map(mapA)];
    const ar=new Set();
    for(const x of [...((a1&&a1.results)||[]),...((a2&&a2.results)||[])])if(x.artistId&&!ar.has(x.artistId)){ar.add(x.artistId);WA.push({k:'it',id:x.artistId,n:x.artistName})}
    for(const x of ((u3&&u3.data)||[]).slice(0,4))WA.push({k:'au',id:x.id,n:x.name+' (Audius)'});
    WA=WA.slice(0,10);
    if(!WR.length&&!WA.length)WMSG=WE||'Ничего не найдено';
  }catch(e){console.error(e);WMSG='Не удалось связаться с сервисом. Откройте файл как обычную страницу.'}
  WBUSY=false;if(view=='web')render()}
async function wartist(a){
  WBUSY=true;WMSG='';render();
  try{let list;
    if(a.k=='it'){const g=async c=>((await J(`https://itunes.apple.com/lookup?id=${a.id}&entity=song&limit=60${c}`)).results||[]).filter(x=>x.previewUrl);
      let t=await g('&country=ru');if(!t.length)t=await g('');list=t.map(mapI)}
    else list=((await J(`${AU}/users/${a.id}/tracks?limit=60&${AP}`)).data||[]).map(mapA);
    WR=list;WT=a.n;WMSG=list.length?'':'У этого исполнителя нет доступных песен'}
  catch(e){console.error(e);WMSG='Не удалось загрузить песни исполнителя'}
  WBUSY=false;if(view=='web')render()}
