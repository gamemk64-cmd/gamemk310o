const $=s=>document.querySelector(s),au=$('#au');
const LS=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}};
let S=Object.assign({pl:[],fav:[],hist:[],vol:.8,shuf:false,rep:0,eq:[0,0,0,0,0],q:[],cur:null,pos:0},LS('mp',{}));
const persist=()=>{try{localStorage.setItem('mp',JSON.stringify(S))}catch{}
  for(const id of new Set([...S.fav,...S.q,...S.pl.flatMap(p=>p.ids)])){const t=T.get(id);if(t&&t.tmp){delete t.tmp;put(t)}}};
const T=new Map();let db,view='home',Q='',SO='added',openPl=null,LIST=[],REORD=null,ctxList=[],played=new Set(),url,ctx,filt=[],dragI=null,muted=false;
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt=s=>{s=Math.max(0,s|0);return String(s/60|0).padStart(2,'0')+':'+String(s%60).padStart(2,'0')};
const mb=b=>(b/1048576).toFixed(1)+' МБ';
const hue=t=>{let h=0;for(const c of t.id)h=(h*31+c.charCodeAt(0))%360;return t.hue??h};
const cv=t=>{if(t.curl)return `background:url("${t.curl}") center/cover,hsl(${hue(t)} 0% 30%)`;if(t.cover&&!t.cu)t.cu=URL.createObjectURL(t.cover);const h=hue(t);return t.cu?`background:url(${t.cu}) center/cover`:`background:radial-gradient(circle at 28% 22%,hsl(${h} 0% 62%),transparent 58%),linear-gradient(140deg,hsl(${h} 0% 38%),hsl(${(h+70)%360} 0% 20%))`};
const ini=t=>t.cover||t.curl?'':esc((t.title||'♪')[0].toUpperCase());
function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('show'),2200)}