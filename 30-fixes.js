/* Исправления: один источник звука, фон, экран блокировки, звонки */
(()=>{
const playing=()=>isYT()?!!(yp&&yp.getPlayerState&&yp.getPlayerState()==1):!au.paused;
/* 1. Защита: никогда не играют сразу локальный/онлайн трек и YouTube */
setInterval(()=>{try{if(isYT()){if(!au.paused)au.pause()}else if(yp&&yp.getPlayerState&&yp.getPlayerState()===1)yp.pauseVideo()}catch{}},500);
/* 2. Фон: уход из браузера звук не трогает; при возврате будим AudioContext, если музыка должна играть */
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&ctx&&ctx.state!='running'&&!au.paused)ctx.resume().catch(()=>{})});
/* 3. Шторка/экран блокировки/гарнитура: play и pause — отдельные команды (раньше обе переключали, и после звонка «pause» мог запустить музыку) */
if('mediaSession' in navigator){const ms=navigator.mediaSession,H=(a,f)=>{try{ms.setActionHandler(a,f)}catch{}};
  H('play',()=>{if(!playing())toggle()});H('pause',()=>{if(playing())toggle()});
  H('nexttrack',()=>next(false));H('previoustrack',prev)}
/* 4. Режим аудиосессии (там, где браузер это поддерживает) */
try{if(navigator.audioSession)navigator.audioSession.type='playback'}catch{}
/* 5. На YouTube фон на Android невозможен — предупреждаем один раз */
let warned=0;const ow=ytPlay;ytPlay=function(id,pos){if(!warned&&/Android/i.test(navigator.userAgent)){warned=1;toast('YouTube в фоне на Android замолкает. Для фона выбирайте Audius или свои файлы')}return ow(id,pos)};
/* 6. Пресет «Свой» при ручной подстройке ползунков */
document.addEventListener('input',e=>{if(e.target.dataset&&e.target.dataset.b!=null){const s=document.getElementById('pre');if(s)s.value='custom'}});
})();
