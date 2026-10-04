/* Окно разрешений при входе. Показывается не всегда:
   — первый визит;
   — позже только если в прошлый раз был включён «Звук компьютера» или «Окно приложения» (их браузер не даёт запомнить);
   — не показывается, если нажато «Больше не спрашивать», и не чаще раза за сессию.
   Микрофон, если разрешён навсегда, включается сам и окно не нужно. */
(()=>{
const SS=window.sessionStorage,can=!!(navigator.mediaDevices&&navigator.mediaDevices.getDisplayMedia),mob=/Android|iPhone|iPad/i.test(navigator.userAgent);
/* запоминаем, какой режим был включён */
setInterval(()=>{if(S.sense&&S.lastSense!==S.sense){S.lastSense=S.sense;persist()}},1500);
document.addEventListener('click',e=>{const b=e.target.closest('[data-sn]');if(b&&b.dataset.sn===''){S.lastSense='';persist()}},true);
function need(){
  if(S.permAsk==='never'||SS.getItem('permAsked'))return false;
  if(S.sense)return false;                       /* уже что-то работает */
  if(S.permAsk===undefined)return true;          /* первый визит */
  return S.lastSense==='sys'||S.lastSense==='app';
}
async function micOk(){try{const r=await navigator.permissions.query({name:'microphone'});return r.state==='granted'}catch{return false}}
const opt=(k,ic,t,s)=>`<button class="o" data-pk="${k}"><i>${ic}</i><span>${t}<small>${s}</small></span></button>`;
async function show(){
  if(!need())return;
  if(S.permAsk!==undefined&&S.lastSense==='mic'&&await micOk())return;
  SS.setItem('permAsked','1');
  const d=document.createElement('div');d.id='pp2';
  const rec=S.lastSense;
  d.innerHTML=`<h3>${S.permAsk===undefined?'Включить умный звук?':'Продолжить, как в прошлый раз?'}</h3>
<p>${S.permAsk===undefined?'Плеер может сам приглушать музыку, когда включается игра или звонок. Выбери, как ему слушать, — браузер спросит разрешение один раз.':'Браузер не запоминает доступ к экрану, поэтому одно нажатие — и всё снова работает.'}</p>
${opt('mic','🎙','Микрофон','слышит голоса и колонки; разрешение запоминается'+(rec=='mic'?' · в прошлый раз':''))}
${can&&!mob?opt('sys','🖥','Звук компьютера','для игр в наушниках'+(rec=='sys'?' · в прошлый раз':'')):''}
${can&&!mob?opt('app','🪟','Окно приложения','выберешь окно игры — музыка отключится, когда оно ожило'+(rec=='app'?' · в прошлый раз':'')):''}
<div class="f"><label><input type="checkbox" id="ppn"> Больше не спрашивать</label><button id="ppl">Не сейчас</button></div>`;
  document.body.appendChild(d);requestAnimationFrame(()=>requestAnimationFrame(()=>d.classList.add('show')));
  const close=()=>{d.classList.remove('show');setTimeout(()=>d.remove(),500);removeEventListener('keydown',kd)};
  const done=()=>{S.permAsk=d.querySelector('#ppn').checked?'never':Date.now();persist()};
  const kd=e=>{if(e.key=='Escape'){done();close()}};addEventListener('keydown',kd);
  d.addEventListener('click',e=>{
    if(e.target.closest('#ppl')){done();return close()}
    const b=e.target.closest('[data-pk]');if(!b)return;
    done();close();startSense(b.dataset.pk)})}
/* ждём, пока закроется окно входа, и показываем с небольшой паузой */
let tries=0;const iv=setInterval(()=>{if(++tries>120)return clearInterval(iv);
  if(document.getElementById('ag'))return;clearInterval(iv);setTimeout(show,1400)},500);
})();
