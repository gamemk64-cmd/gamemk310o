/* ---------- BEAT MODE ---------- */
const BM=document.createElement('div');BM.id='bm';BM.style.cssText='position:fixed;inset:0 0 0 0;z-index:60;background:#05050a;display:none;cursor:pointer;overflow:hidden';
const bb_='style="width:auto;display:inline-block;background:#ffffff22;color:#fff;backdrop-filter:blur(6px)"';
BM.innerHTML=`<canvas id="bmc" style="width:100%;height:100%;display:block"></canvas><div id="bmi" style="position:absolute;left:28px;bottom:22px;right:28px;pointer-events:none;color:#fff;text-shadow:0 2px 16px #000;font-weight:800"></div><div style="position:absolute;top:14px;right:14px;display:flex;gap:8px"><button id="bmm" ${bb_}>Эффект: 1</button><button id="bmx" ${bb_} title="Тряска и яркие вспышки. Осторожно при светочувствительности">⚠ Безумие: выкл</button><button id="bmq" ${bb_}>✕</button></div>`;
document.body.append(BM);
const bmc=BM.querySelector('#bmc'),bmg=bmc.getContext('2d'),bmi=BM.querySelector('#bmi');
let bmOn=false,bmMode=0,bmAuto=true,bmCrazy=false,bmP=[],bmR=[],bmRot=0,bmK=0,bmFl=0,bmSw=0,bmCur='';
const MN=['Кольца','Взрыв частиц','Неон-бары','Лазеры'];
function bmOpen(){bmOn=true;BM.style.display='block';BM.style.bottom=PLe.offsetHeight+'px';bmSw=performance.now();requestAnimationFrame(bmFrame)}
function bmClose(){bmOn=false;BM.style.display='none'}
function bmFrame(now){
  if(!bmOn)return;requestAnimationFrame(bmFrame);
  const w=bmc.clientWidth,h=bmc.clientHeight;if(bmc.width!=w||bmc.height!=h){bmc.width=w;bmc.height=h}
  const g=bmg,cx=w/2,cy=h/2,live=an&&!au.paused&&!isYT();let k,e,f;
  if(live){k=Math.min(1,K*BXm);e=E.map(v=>Math.min(1,v*BXm));f=i=>Math.min(1,buf[Math.min(i,255)]/255*BXm)}
  else{const ph=(now/1000*2.07)%1;k=Math.min(1,Math.pow(1-ph,3)*BXm);e=[k,k*.8,.4+.2*Math.sin(now/300),.3+.2*Math.sin(now/170),.3+.3*Math.sin(now/90)];f=i=>Math.min(1,.15+.5*k*Math.abs(Math.sin(i*.37+now/400))+.15*Math.random())}
  const kr=live?K:Math.pow(1-((now/1000*2.07)%1),3),beat=kr>.55&&bmK<=.55;bmK=kr;if(beat)bmFl=1;
  if(bmAuto&&now-bmSw>16000){bmMode=(bmMode+1)%MN.length;bmSw=now;BM.querySelector('#bmm').textContent='Эффект: '+(bmMode+1)}
  const H=(curH+(bmCrazy?now/10:now/80))%360;bmRot+=.004+e[0]*.02;
  g.fillStyle=`rgba(5,5,10,${bmCrazy?.16:.3})`;g.fillRect(0,0,w,h);
  const m=Math.min(w,h);
  if(bmMode==0){
    if(beat)bmR.push({r:m*.1,a:1});
    for(const q of bmR){q.r+=6+k*14;q.a*=.95;g.strokeStyle=`hsla(${H},0%,65%,${q.a})`;g.lineWidth=3+q.a*8;g.beginPath();g.arc(cx,cy,q.r,0,7);g.stroke()}
    bmR=bmR.filter(q=>q.a>.03);
    const n=96,b0=m*.16*(1+k*.35);
    for(let i=0;i<n;i++){const v=f(i*2+1),a=i/n*6.283+bmRot,r2=b0+8+v*m*.3;g.strokeStyle=`hsl(${(H+i*3)%360} 0% ${50+v*20}%)`;g.lineWidth=4+k*3;g.beginPath();g.moveTo(cx+Math.cos(a)*b0,cy+Math.sin(a)*b0);g.lineTo(cx+Math.cos(a)*r2,cy+Math.sin(a)*r2);g.stroke()}
    g.fillStyle=`hsla(${H},0%,60%,${.15+k*.4})`;g.beginPath();g.arc(cx,cy,b0*.9,0,7);g.fill()
  }else if(bmMode==1){
    if(beat||k>.9)for(let i=0;i<Math.round((bmCrazy?60:30)*BXm);i++){const a=Math.random()*6.283,s=(2+Math.random()*10)*(1+k);bmP.push({x:cx,y:cy,vx:Math.cos(a)*s,vy:Math.sin(a)*s,l:1,c:H+Math.random()*60})}
    for(const p of bmP){p.x+=p.vx;p.y+=p.vy;p.vx*=.985;p.vy*=.985;p.l-=.012;g.fillStyle=`hsla(${p.c},0%,60%,${p.l})`;g.shadowBlur=16;g.shadowColor=g.fillStyle;g.beginPath();g.arc(p.x,p.y,2+p.l*5,0,7);g.fill()}
    g.shadowBlur=0;bmP=bmP.filter(p=>p.l>0);if(bmP.length>900)bmP.splice(0,bmP.length-900);
    g.strokeStyle=`hsla(${H},0%,70%,.8)`;g.lineWidth=4;g.beginPath();g.arc(cx,cy,m*.06+k*m*.1,0,7);g.stroke()
  }else if(bmMode==2){
    const n=64,bw=w/n;g.shadowBlur=14;
    for(let i=0;i<n;i++){const v=f(i*3+1),bh=v*h*.46+4;g.fillStyle=g.shadowColor=`hsl(${(H+i*4)%360} 0% 58%)`;g.fillRect(i*bw+2,cy-bh,bw-4,bh*2)}
    g.shadowBlur=0
  }else if(bmMode==4){
    for(let i=0;i<14;i++){const z=(now/900*(1+k*2)+i/14)%1,r=z*z*m*.85+4;g.strokeStyle=`hsla(${(H+i*14)%360},0%,${45+k*25}%,${Math.min(1,z*1.6)})`;g.lineWidth=2+z*4+k*4;g.beginPath();for(let j=0;j<=6;j++){const t=j/6*6.283+bmRot*2+i*.15,q=1+f(j*5+1)*.3;j?g.lineTo(cx+Math.cos(t)*r*q,cy+Math.sin(t)*r*q):g.moveTo(cx+Math.cos(t)*r*q,cy+Math.sin(t)*r*q)}g.closePath();g.stroke()}
  }else if(bmMode==5){
    g.shadowBlur=18;for(let l=0;l<3;l++){g.strokeStyle=g.shadowColor=`hsla(${(H+l*50)%360},0%,${58+l*6}%,.85)`;g.lineWidth=Math.max(1,3+k*5-l);g.beginPath();for(let x=0;x<=w;x+=6){const u=x/w,y=cy+Math.sin(u*12+now/(260+l*90)+l)*(h*.12+f((u*60|0)+l)*h*.28)*(.4+k*.9);x?g.lineTo(x,y):g.moveTo(x,y)}g.stroke()}g.shadowBlur=0
  }else{
    g.lineCap='round';const L=Math.max(w,h);
    for(let j=0;j<14;j++){const a=bmRot*3+j/14*6.283,q=e[j%5];g.strokeStyle=`hsla(${(H+j*25)%360},0%,60%,${.25+q*.7})`;g.lineWidth=2+q*14+k*6;g.beginPath();g.moveTo(cx,cy);g.lineTo(cx+Math.cos(a)*L,cy+Math.sin(a)*L);g.stroke()}
  }
  if(bmFl>.02){g.fillStyle=`hsla(${H},0%,60%,${bmFl*(bmCrazy?.3:.12)*Math.min(2,BXm)})`;g.fillRect(0,0,w,h);bmFl*=.85}
  bmc.style.transform=bmCrazy?`translate(${(Math.random()-.5)*k*26}px,${(Math.random()-.5)*k*26}px) scale(${1+k*.05})`:'';
  const t=T.get(S.cur),nm=t?t.title+' — '+t.artist:'Включите песню — пока демо-ритм';
  if(nm!=bmCur){bmCur=nm;bmi.textContent=nm}bmi.style.fontSize=(26+k*14)+'px';bmi.style.opacity=.75+k*.25}
BM.querySelector('#bmq').onclick=e=>{e.stopPropagation();bmClose()};
BM.querySelector('#bmm').onclick=e=>{e.stopPropagation();bmAuto=false;bmMode=(bmMode+1)%MN.length;e.target.textContent='Эффект: '+(bmMode+1)+' · '+MN[bmMode]};
BM.querySelector('#bmx').onclick=e=>{e.stopPropagation();bmCrazy=!bmCrazy;e.target.textContent='⚠ Безумие: '+(bmCrazy?'вкл':'выкл')};
bmc.onclick=()=>{bmAuto=false;bmMode=(bmMode+1)%MN.length;BM.querySelector('#bmm').textContent='Эффект: '+(bmMode+1)+' · '+MN[bmMode]};
$('#b1').insertAdjacentHTML('beforebegin','<button class="add" id="bmb" style="margin:0 0 8px">🔥 Бит-режим</button>');
$('#bmb').onclick=bmOpen;
addEventListener('keydown',e=>{if(/INPUT|TEXTAREA|SELECT/.test((e.target.tagName||'')))return;if(e.key=='b'||e.key=='и')bmOn?bmClose():bmOpen();else if(e.key=='Escape'&&bmOn)bmClose()});
