/* Android-слой: логика меню. Работает только если на <html> есть класс .android (ставит index.html) */
(()=>{
const R=document.documentElement;if(!R.classList.contains('android'))return;
const g=id=>document.getElementById(id),svg=p=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
/* всегда режим телефона (и на планшетах), без авто-зума ПК */
if(!S.mode||S.mode=='auto'){S.mode='phone';persist();try{applyUI()}catch{}}
new MutationObserver(()=>{if(!R.classList.contains('m'))R.classList.add('m')}).observe(R,{attributes:true,attributeFilter:['class']});R.classList.add('m');
/* нижняя панель */
const nv=g('nav'),bar=document.createElement('div'),sc=document.createElement('div');bar.id='abar';sc.id='scrim';sc.hidden=true;
const MAIN=[['home','Главная','<path d="M3 11l9-8 9 8v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z"/>'],['web','Поиск','<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>'],['lib','Музыка','<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>'],['now','Плеер','<circle cx="12" cy="12" r="9"/><path d="M10 8.5v7l6-3.5z" fill="currentColor"/>']];
bar.innerHTML=MAIN.map(([k,n,p])=>`<button data-go="${k}">${svg(p)}<span>${n}</span></button>`).join('')+`<button data-go="more">${svg('<circle cx="5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="19" cy="12" r="1.6" fill="currentColor"/>')}<span>Ещё</span></button>`;
document.body.append(nv,bar,sc);
const close=()=>{nv.classList.remove('open');sc.hidden=true;sync()};
function sync(){const cur=document.querySelector('#nav button.on'),k=cur&&cur.dataset.v,open=nv.classList.contains('open');
  bar.querySelectorAll('button').forEach(b=>b.classList.toggle('on',open?b.dataset.go=='more':b.dataset.go==k||(b.dataset.go=='more'&&!MAIN.some(m=>m[0]==k)&&!!k)))}
bar.onclick=e=>{const b=e.target.closest('button');if(!b)return;const k=b.dataset.go;
  if(k=='more'){const o=!nv.classList.contains('open');nv.classList.toggle('open',o);sc.hidden=!o;return sync()}
  close();const t=nv.querySelector(`[data-v="${k}"]`);t&&t.click()};
sc.onclick=close;nv.addEventListener('click',()=>setTimeout(close,0));
new MutationObserver(sync).observe(nv,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});sync();
/* тап по мини-плееру открывает полный экран «Плеер» */
g('now').addEventListener('click',e=>{if(e.target.closest('button'))return;view='now';S.view='now';persist();openPl=null;render()});
})();
