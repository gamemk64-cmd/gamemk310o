/* Spotify-like discovery layer: live charts, removable sections, persisted preferences. */
(()=>{'use strict';
const $=s=>document.querySelector(s),KEY='spotifyDiscoveryPrefs';
let prefs={popular:true,quickPicks:true,chartCountry:'ru',limit:20};
try{prefs={...prefs,...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch{}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(prefs))}catch{}};
window.SpotifyDiscovery={get:()=>({...prefs}),update:(next={})=>{const before={...prefs};prefs={...prefs,...next};save();if(before.chartCountry!==prefs.chartCountry||before.limit!==prefs.limit){chart=[];loadedAt=0}if(!prefs.popular){$('#spotifyDiscover')?.remove()}else{mount();if(!chart.length&&!loading)fetchChart(true)}const quick=$('#xtm');if(quick)quick.style.display=prefs.quickPicks?'':'none';return {...prefs}}};
let chart=[],loading=false,error='',loadedAt=0,requestSeq=0,recoTracks=[],recoLoading=false,recoLoadedAt=0,recoSeq=0;
const esc2=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const colorArt=(i)=>['linear-gradient(135deg,#1ed760,#063b20)','linear-gradient(135deg,#f857a6,#ff5858)','linear-gradient(135deg,#4776e6,#8e54e9)','linear-gradient(135deg,#f7971e,#ffd200)','linear-gradient(135deg,#11998e,#38ef7d)','linear-gradient(135deg,#fc4a1a,#f7b733)'][i%6];
function trackFromApple(x){return {id:'spchart:'+x.trackId,src:x.previewUrl,title:x.trackName||x.name||'Без названия',artist:x.artistName||x.artist||'Неизвестный исполнитель',album:x.collectionName||'Популярное сейчас',dur:30,curl:(x.artworkUrl100||x.artwork||'').replace('100x100','600x600').replace('100x100bb','600x600bb'),fmt:'WEB',size:0,genre:x.primaryGenreName||'',tmp:1,added:Date.now()}}
async function fetchChart(force=false){if(loading)return;if(!force&&chart.length&&Date.now()-loadedAt<15*60*1000)return;loading=true;error='';const seq=++requestSeq;paint();
 try{
  const country=prefs.chartCountry||'ru';let results=[];
  try{
   const feed=await fetch(`https://rss.applemarketingtools.com/api/v2/${country}/music/most-played/${Math.min(50,Math.max(10,prefs.limit||20))}/songs.json`,{signal:AbortSignal.timeout?AbortSignal.timeout(8000):undefined}).then(r=>{if(!r.ok)throw Error('chart unavailable');return r.json()});
   const ids=(feed.feed?.results||[]).map(x=>{try{const u=new URL(x.id);return u.searchParams.get('i')||u.pathname.match(/\/(\d+)\/?$/)?.[1]||u.pathname.match(/id(\d+)/)?.[1]}catch{return String(x.id||'').match(/(\d+)(?:\?.*)?$/)?.[1]}}).filter(x=>/^\d+$/.test(x));
   if(ids.length){for(let i=0;i<ids.length;i+=30){const part=ids.slice(i,i+30);const url=`https://itunes.apple.com/lookup?id=${part.join(',')}&country=${country}`;const data=typeof J==='function'?await J(url):await fetch(url).then(r=>r.json());results.push(...(data.results||[]).filter(x=>x.wrapperType==='track'&&x.previewUrl));}}
  }catch(e){console.warn('Chart feed unavailable, using search fallback',e)}
  if(!results.length){
   const terms=country==='ru'?['русские хиты 2026','популярная музыка россия','топ песни русский рэп']:['top hits 2026','popular songs chart','global top hits'];
   for(const term of terms){try{const url=`https://itunes.apple.com/search?term=${encodeURIComponent(term)}&country=${country}&media=music&entity=song&limit=25`;const d=typeof J==='function'?await J(url):await fetch(url).then(r=>r.json());results.push(...(d.results||[]).filter(x=>x.previewUrl));}catch{}}
  }
  if(seq!==requestSeq)return;
  const seen=new Set();chart=results.filter(x=>{const id=x.trackId;if(!id||seen.has(id))return false;seen.add(id);return true}).slice(0,prefs.limit||20).map(trackFromApple);
  loadedAt=Date.now();if(!chart.length)error='Не удалось загрузить чарт. Проверь подключение к интернету.';
 }catch(e){error='Популярные песни сейчас недоступны.';console.warn(e)}finally{if(seq===requestSeq){loading=false;paint()}}
}
function trackExists(t){try{if(window.T&&T.has(t.id))return T.get(t.id);if(window.T){T.set(t.id,{...t});return T.get(t.id)}}catch{}return t}
function playTrack(t){try{const ids=chart.map(x=>typeof ing==='function'?ing(x):x.id);const id=typeof ing==='function'?ing(t):t.id;if(typeof play==='function')play(id,ids);else if(typeof window.play==='function')window.play(id);else {const a=$('#au');if(a&&t.src){a.src=t.src;a.play().catch(()=>{})}}}catch(e){console.warn(e);alert('Не получилось запустить предпрослушивание. Попробуй открыть «Поиск в мире».')}}
function artistNames(){try{const custom=JSON.parse(localStorage.getItem(ART_KEY)||'null');if(Array.isArray(custom)&&custom.length)return custom.slice(0,12)}catch{}try{const ids=[...(S.fav||[]),...(S.hist||[]),S.cur].filter(Boolean),out=[],seen=new Set();for(const id of ids){const t=T.get(id),a=t&&t.artist,k=String(a||'').toLowerCase();if(a&&!seen.has(k)){seen.add(k);out.push(a)}}if(out.length)return out.slice(0,8)}catch{}return ['MORGENSHTERN','Miyagi & Andy Panda','MACAN','The Weeknd','Bad Bunny','Travis Scott']}
function forYou(){
 const favArtists=[];try{for(const id of [...(S.fav||[]),...(S.hist||[]),S.cur].filter(Boolean)){const t=T.get(id),a=t&&t.artist;if(a&&!favArtists.some(x=>x.toLowerCase()===a.toLowerCase()))favArtists.push(a)}}catch{}
 const list=recoTracks.length?recoTracks:(chart.length?chart.slice(0,8):[]);
 if(recoLoading&&!list.length)return `<section class="sp-for-you"><div class="sp-for-you-head"><div><h2>Подобрано для тебя</h2><p>Ищем музыку по твоим исполнителям</p></div></div><div class="sp-reco-loading"><span class="spotify-spinner"></span> Собираем подборку…</div></section>`;
 if(!list.length)return '';
 return `<section class="sp-for-you"><div class="sp-for-you-head"><div><h2>${favArtists.length?'Подобрано для тебя':'Попробуй это'}</h2><p>${favArtists.length?'По исполнителям из твоей библиотеки':'Популярные треки для старта — подборка станет персональной'}</p></div><button type="button" data-sp-reco-refresh title="Обновить рекомендации">↻</button></div><div class="sp-for-you-grid">${list.slice(0,8).map((t,i)=>`<button class="sp-for-you-card" type="button" data-sp-reco="${i}"><span class="sp-for-you-cover">${t.curl?`<img loading="lazy" src="${esc2(t.curl)}" alt="" onerror="this.remove()">`:'♫'}</span><b>${esc2(t.title)}</b><small>${esc2(t.artist)}</small></button>`).join('')}</div><p class="sp-for-you-note">${favArtists.length?'На основе: '+esc2(favArtists.slice(0,4).join(' · ')):'Настрой любимых исполнителей в правой панели'} <button type="button" data-sp-edit-artists>Изменить</button></p></section>`
}
async function fetchRecommendations(force=false){
 if(recoLoading||(!force&&recoTracks.length&&Date.now()-recoLoadedAt<20*60*1000))return;
 recoLoading=true;const seq=++recoSeq;paint();
 let names=[];try{const custom=JSON.parse(localStorage.getItem(ART_KEY)||'null');if(Array.isArray(custom)&&custom.length)names=custom.slice(0,4)}catch{}
 if(!names.length){try{for(const id of [...(S.fav||[]),...(S.hist||[]),S.cur].filter(Boolean)){const t=T.get(id),a=t&&t.artist;if(a&&!names.some(x=>x.toLowerCase()===a.toLowerCase()))names.push(a)}}catch{}}
 if(!names.length)names=['MORGENSHTERN','Miyagi & Andy Panda','MACAN','The Weeknd'];
 try{
  const country=prefs.chartCountry||'ru';const jobs=names.slice(0,4).map(name=>Promise.race([
   J(`https://itunes.apple.com/search?term=${encodeURIComponent(name)}&country=${country}&media=music&entity=song&limit=12`).then(d=>(d.results||[]).filter(x=>x.previewUrl)),
   new Promise(resolve=>setTimeout(()=>resolve([]),8500))
  ]).catch(()=>[]));
  const results=(await Promise.all(jobs)).flat();if(seq!==recoSeq)return;const seen=new Set();recoTracks=results.filter(x=>{if(!x.trackId||seen.has(x.trackId))return false;seen.add(x.trackId);return true}).map(trackFromApple).slice(0,24);recoLoadedAt=Date.now();
 }catch(e){console.debug('recommendations unavailable',e)}finally{if(seq===recoSeq){recoLoading=false;paint()}}
}
function cards(){if(loading&&!chart.length)return '<div class="spotify-loading"><span class="spotify-spinner"></span> Загружаем чарт…</div>';if(!chart.length)return `<div class="spotify-empty">${esc2(error||'Популярные песни появятся здесь')} <button data-sp-refresh>Повторить</button></div>`;
 return `<div class="spotify-chart-grid">${chart.slice(0,prefs.limit||20).map((t,i)=>`<button class="spotify-track-card" data-sp-track="${i}" title="Воспроизвести ${esc2(t.title)}"><span class="spotify-cover" style="background:${colorArt(i)}">${t.curl?`<img loading="lazy" src="${esc2(t.curl)}" alt="" onerror="this.remove()">`:'♫'}</span><span class="spotify-track-title">${esc2(t.title)}</span><span class="spotify-track-artist">${esc2(t.artist)}</span><span class="spotify-play">▶</span></button>`).join('')}</div><p class="spotify-note">Предпрослушивание доступно для треков, которые предоставляют iTunes Preview. Чарт обновляется автоматически примерно раз в 15 минут.</p>`}
function mount(){const main=$('#main');if(!main||!document.body||!main.querySelector('h2'))return;const home=(typeof view!=='undefined'&&view==='home')||main.querySelector('h2')?.textContent?.trim()==='Главная';if(!home){$('#spotifyDiscover')?.remove();return}if(!prefs.popular){$('#spotifyDiscover')?.remove();return}
 let box=$('#spotifyDiscover');if(!box){box=document.createElement('section');box.id='spotifyDiscover';const h=main.querySelector('h2');h?.insertAdjacentElement('afterend',box)}
 box.innerHTML=`<div class="spotify-section-head"><div><p class="spotify-eyebrow">ОТКРЫВАЙ НОВОЕ</p><h2>Популярное сейчас</h2><p class="spotify-subtitle">Хиты из музыкального чарта · нажми на карточку, чтобы слушать</p></div><div class="spotify-actions"><button data-sp-refresh title="Обновить чарт">↻ Обновить</button><button data-sp-hide title="Скрыть подборку">Скрыть</button></div></div>${cards()}${forYou()}`;
 const quick=$('#xtm');if(quick)quick.style.display=prefs.quickPicks?'':'none';
 if(!chart.length&&!loading)fetchChart();
}
function paint(){const box=$('#spotifyDiscover');if(box)mount();}
const oldRender=window.render;if(typeof oldRender==='function'){window.render=function(...a){const out=oldRender.apply(this,a);setTimeout(mount,0);return out}}
// Add explicit controls to the existing right-click customization panel.
function addSettings(){ /* Настройки рекомендаций находятся во вкладке «Настройки» */ }
function events(){document.addEventListener('click',e=>{const card=e.target.closest('[data-sp-track]');if(card){e.preventDefault();const t=chart[+card.dataset.spTrack];if(t)playTrack(t);return}const recoCard=e.target.closest('[data-sp-reco]');if(recoCard){e.preventDefault();const items=recoTracks.length?recoTracks:chart;const t=items[+recoCard.dataset.spReco];if(t)playTrack(t);return}if(e.target.closest('[data-sp-edit-artists]')){const b=document.querySelector('#spEditArtists');if(b)b.click();return}if(e.target.closest('[data-sp-reco-refresh]')){recoTracks=[];recoLoadedAt=0;fetchRecommendations(true);return}if(e.target.closest('[data-sp-refresh]')){chart=[];loadedAt=0;fetchChart(true);return}if(e.target.closest('[data-sp-hide]')){prefs.popular=false;save();mount();const cb=$('#spPopularToggle');if(cb)cb.checked=false;return}})}
function boot(){addSettings();events();mount();fetchRecommendations();const obs=new MutationObserver(()=>{addSettings();});obs.observe(document.body,{childList:true,subtree:true});setTimeout(()=>obs.disconnect(),10000);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
