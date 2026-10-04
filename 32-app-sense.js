/* «Окно приложения»: ты выбираешь окно игры/программы в окне выбора браузера (там миниатюры и названия).
   Плеер смотрит картинку этого окна: когда в нём пошла живая картинка — музыка ставится на паузу (или приглушается),
   когда окно замерло, свёрнуто или закрыто — музыка возвращается. Звук приложения не используется. */
(()=>{
let st=null,status='Не подключено';
const playingNow=()=>isYT()?!!(yp&&yp.getPlayerState&&yp.getPlayerState()==1):!au.paused;
const delay=()=>S.appDl||4,act=()=>S.appAct||'pause';
if(S.sense=='app'){S.sense=''}  /* выбор окна требует нажатия — сам после перезапуска не включится */
window.appSenseText=()=>status;
window.stopAppSense=()=>{if(!st)return;const s=st;st=null;clearInterval(s.iv);try{s.stream.getTracks().forEach(t=>t.stop())}catch{}
  if(s.paused&&!playingNow()){try{toggle()}catch{}}status='Не подключено'};
window.startAppSense=async()=>{
  if(!navigator.mediaDevices||!navigator.mediaDevices.getDisplayMedia){S.sense='';persist();render();return toast('Выбор окна работает только в Chrome/Edge на компьютере. На телефоне недоступно')}
  try{
    const cc=window.CaptureController?new CaptureController():null;
    const stream=await navigator.mediaDevices.getDisplayMedia(Object.assign({video:{frameRate:5,width:{max:640}},audio:false},cc?{controller:cc}:{}));
    try{if(cc)cc.setFocusBehavior('focus-captured-surface')}catch{}   /* браузер сам переключит на выбранное окно */
    const vt=stream.getVideoTracks()[0];
    if(vt.getSettings&&vt.getSettings().displaySurface=='monitor'){stream.getTracks().forEach(t=>t.stop());S.sense='';persist();render();return toast('Выбери именно ОКНО приложения, а не весь экран — иначе плеер увидит и себя')}
    const v=document.createElement('video');v.muted=true;v.playsInline=true;v.srcObject=stream;await v.play().catch(()=>{});
    const c=document.createElement('canvas');c.width=64;c.height=36;const x=c.getContext('2d',{willReadFrequently:true});
    st={stream,v,c,x,prev:null,live:0,still:0,on:false,paused:false,label:vt.label||''};
    vt.onended=()=>{toast('Окно закрыто — музыка вернулась. Выбери окно заново, когда запустишь приложение');stopSense();S.sense='';persist();if(view=='smart')render()};
    S.sense='app';persist();if(view=='smart')render();status='Жду, пока приложение запустится…';
    st.iv=setInterval(tick,500);toast('Слежу за окном. Музыка отключится, когда приложение оживёт')
  }catch(e){S.sense='';persist();if(view=='smart')render();toast(e&&e.name=='NotAllowedError'?'Окно не выбрано':'Нет доступа к экрану ('+(e&&e.name||'ошибка')+')')}};
function tick(){
  if(!st)return;const{v,x,c}=st;if(v.readyState<2)return;
  x.drawImage(v,0,0,64,36);const d=x.getImageData(0,0,64,36).data,n=64*36;let lum=0,diff=0;const cur=new Uint8Array(n);
  for(let i=0;i<n;i++){const l=(d[i*4]*.3+d[i*4+1]*.59+d[i*4+2]*.11)|0;cur[i]=l;lum+=l;if(st.prev)diff+=Math.abs(l-st.prev[i])}
  lum/=n;diff=st.prev?diff/n:0;st.prev=cur;
  const alive=lum>6&&diff>1.2;          /* не чёрный экран и картинка меняется */
  if(alive){st.live+=.5;st.still=0}else{st.still+=.5;if(st.still>=1)st.live=0}
  if(!st.on&&st.live>=delay()){st.on=true;if(act()=='pause'&&playingNow()){st.paused=true;fadePause()}toast('Приложение запущено — музыка отключена')}
  else if(st.on&&st.still>=8){st.on=false;if(st.paused){st.paused=false;if(!playingNow())toggle()}toast('Приложение затихло — музыка вернулась')}
  status=st.on?(act()=='pause'?'Приложение работает: музыка на паузе':'Приложение работает: музыка приглушена'):st.live>0?`Приложение запускается… ${Math.round(st.live)}/${delay()} с`:'Жду, пока приложение запустится…';
  const box=document.getElementById('appbox');
  if(box){if(!box.firstChild)drawBox(box);const pv=box.querySelector('#appprev');if(pv)pv.getContext('2d').drawImage(v,0,0,pv.width,pv.height)}}
setInterval(()=>{if(!st||act()!='duck')return;const want=st.on?(S.duckTo??.3):1;duckG+=(want-duckG)*(want<duckG?.12:.05);if(Math.abs(duckG-want)<.01)duckG=want;applyVol();
  const bd=document.getElementById('duckb');if(bd)bd.style.display=duckG<.9?'inline-block':'none'},60);
function drawBox(box){
  box.innerHTML=`${st?'<canvas id="appprev" width="160" height="90" style="border-radius:12px;border:1px solid var(--edge);background:#000"></canvas>':''}<span>Когда приложение работает</span><select id="appact"><option value="pause" ${act()=='pause'?'selected':''}>Ставить музыку на паузу</option><option value="duck" ${act()=='duck'?'selected':''}>Приглушать (до значения ниже)</option></select><span>Считать запущенным через</span><input type="range" id="appdl" min="1" max="20" value="${delay()}"><span class="d" id="appdlv">${delay()} с</span>`}
/* перерисовка блока при каждом открытии раздела */
new MutationObserver(()=>{const b=document.getElementById('appbox');if(b&&!b.firstChild)drawBox(b)}).observe(document.getElementById('main'),{childList:true});
const M=document.getElementById('main');
M.addEventListener('change',e=>{if(e.target.id=='appact'){S.appAct=e.target.value;persist()}});
M.addEventListener('input',e=>{if(e.target.id=='appdl'){S.appDl=+e.target.value;const l=document.getElementById('appdlv');if(l)l.textContent=S.appDl+' с';persist()}});
})();
