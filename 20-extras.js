/* удобства и косметика поверх плеера; логика самого плеера не затронута */
(()=>{
const g=id=>document.getElementById(id);
/* заливка ползунков */
const upd=()=>{document.querySelectorAll('input[type=range]:not([data-b])').forEach(r=>{const mn=+r.min||0,mx=+r.max||100,p=((+r.value-mn)/(mx-mn||1)*100).toFixed(1)+'%';if(r._p!==p){r._p=p;r.style.setProperty('--p',p)}})};
const loop=()=>{upd();requestAnimationFrame(loop)};requestAnimationFrame(loop);
/* подсветка под курсором */
document.addEventListener('pointermove',e=>{const t=e.target.closest&&e.target.closest('.row,.card,.stat');if(!t)return;const b=t.getBoundingClientRect();t.style.setProperty('--mx',(e.clientX-b.left)+'px');t.style.setProperty('--my',(e.clientY-b.top)+'px')},{passive:true});
/* название трека во вкладке + флаг «играет» */
const sync=()=>{const on=g('pp').textContent=='⏸',has=S.cur&&T.has(S.cur);document.body.classList.toggle('playing',on);document.title=has?(on?'▶ ':'')+g('pt').textContent+' — '+g('pa').textContent:'Music Player'};
['pt','pa','pp'].forEach(id=>new MutationObserver(sync).observe(g(id),{childList:true,characterData:true,subtree:true}));sync();
/* при смене раздела — наверх */
g('nav').addEventListener('click',e=>{if(e.target.dataset.v)g('main').scrollTop=0});
/* клавиши: ← → перемотка 5 с, ↑ ↓ громкость, M — выключить звук */
addEventListener('keydown',e=>{
  if(e.ctrlKey||e.metaKey||e.altKey||bmOn||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName||''))return;
  const k=e.key;
  if(k=='ArrowRight'||k=='ArrowLeft'){e.preventDefault();const d=k=='ArrowRight'?5:-5;
    if(isYT()&&yp&&yp.getCurrentTime)yp.seekTo(Math.max(0,yp.getCurrentTime()+d),true);else if(au.src)au.currentTime=Math.max(0,Math.min(au.duration||1e9,au.currentTime+d))}
  else if(k=='ArrowUp'||k=='ArrowDown'){e.preventDefault();muted=false;au.muted=false;setVol(S.vol+(k=='ArrowUp'?.05:-.05));toast('Громкость '+Math.round(S.vol*100)+'%')}
  else if(k=='m'||k=='ь'){g('mu').click()}
});
})();