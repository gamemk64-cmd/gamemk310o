/* ---------- events ---------- */
$('#main').addEventListener('click',e=>{
  const b=e.target.closest('button'),r=e.target.closest('.row'),a=b&&b.dataset.act;
  if(a){const p=S.pl.find(x=>x.id==openPl);
    if(a=='plnew'){const n=$('#np').value.trim();S.pl.push({id:crypto.randomUUID(),name:n||'Плейлист '+(S.pl.length+1),ids:[]});persist();render()}
    if(a=='plback'){openPl=null;render()}
    if(a=='plplay'&&p&&p.ids.length)play(p.ids[0],[...p.ids]);
    if(a=='plq'&&p){S.q.push(...p.ids);persist();toast('Плейлист добавлен в очередь')}
    if(a=='plclr'&&p){p.ids=[];persist();render()}
    if(a=='pldel'&&p)menu(e,[['Да, удалить плейлист',()=>{S.pl=S.pl.filter(x=>x!=p);openPl=null;persist();render()}],['Отмена',()=>{}]]);
    if(a=='clrhist'){S.hist=[];persist();render()}
    if(a=='clrq'){S.q=[];persist();render()}
    if(a=='playlist-fav'&&S.fav.length)play(S.fav.find(i=>T.has(i)),[...S.fav]);
    if(a=='fav2pl')plMenu(e,[...S.fav]);return}
  if(e.target.closest('[data-resume]')){return play(S.cur,ctxList.length?null:[S.cur],S.pos)}
  const c=e.target.closest('[data-pl]');if(c){openPl=c.dataset.pl;view='pls';return render()}
  if(!r)return;const id=r.dataset.id,i=+r.dataset.i;
  if(b){const k=b.dataset.a;
    if(k=='fav'){S.fav=S.fav.includes(id)?S.fav.filter(x=>x!=id):[...S.fav,id];persist();return view=='fav'||view=='home'?render():(b.style.color=S.fav.includes(id)?'var(--ac)':'',ui())}
    if(k=='q'){S.q.push(id);persist();return toast('Добавлено в очередь')}
    if(k=='more'){const it=[['Воспроизвести',()=>play(id,[...LIST])],['Воспроизвести следующей',()=>{S.q.unshift(id);persist();toast('Сыграет следующей')}],['Добавить в плейлист…',()=>setTimeout(()=>plMenu({target:b},[id]),0)]];
      if(view=='pls'&&openPl)it.push(['Убрать из плейлиста',()=>{const p=S.pl.find(x=>x.id==openPl);p.ids=p.ids.filter(x=>x!=id);persist();render()}]);
      if(view=='q')it.push(['Убрать из очереди',()=>{S.q.splice(i,1);persist();render()}]);
      it.push(['Сменить обложку…',()=>{coverFor=id;$('#fc').click()}],['Информация',()=>{const t=T.get(id);toast((t.src||t.yt)?`${t.title} · ${t.album} · онлайн`:`${t.file.name} · ${t.fmt} · ${mb(t.size)} · ${fmt(t.dur)}`)}],['Удалить из библиотеки',()=>setTimeout(()=>del(id),0)]);return menu(e,it)}}
  play(id,[...LIST])});
$('#main').addEventListener('contextmenu',e=>{const r=e.target.closest('.row');if(r&&r.dataset.id){e.preventDefault();r.querySelector('[data-a=more]').dispatchEvent(new MouseEvent('click',{bubbles:true}))}});
$('#main').addEventListener('input',e=>{if(e.target.dataset.b!=null){const i=+e.target.dataset.b;S.eq[i]=+e.target.value;if(S.ae){S.ae=false;const c=document.getElementById('ae');if(c)c.checked=false;toast('Авто-подстройка выключена')}e.target.previousSibling.previousSibling&&0;e.target.parentNode.firstChild.textContent=S.eq[i]+' дБ';applyEq()}});
$('#main').addEventListener('dragstart',e=>{const r=e.target.closest('.row');if(r&&REORD)dragI=+r.dataset.i});
$('#main').addEventListener('dragover',e=>{if(REORD&&dragI!=null)e.preventDefault()});
$('#main').addEventListener('drop',e=>{const r=e.target.closest('.row');if(REORD&&dragI!=null&&r){e.preventDefault();e.stopPropagation();const [x]=REORD.splice(dragI,1);REORD.splice(+r.dataset.i,0,x);dragI=null;persist();render()}});
$('#nav').onclick=e=>{const v=e.target.dataset.v;if(v){view=v;S.view=v;persist();openPl=null;render()}};
$('#b1').onclick=()=>$('#fi').click();$('#b2').onclick=()=>$('#fd').click();
$('#fi').onchange=e=>{imp(e.target.files);e.target.value=''};$('#fd').onchange=e=>{imp(e.target.files);e.target.value=''};
$('#pp').onclick=toggle;$('#nx').onclick=()=>next(false);$('#pv').onclick=prev;
$('#sh').onclick=()=>{S.shuf=!S.shuf;played.clear();if(S.cur)played.add(S.cur);persist();ui();toast(S.shuf?'Shuffle: без повторов':'Shuffle выключен')};
$('#rp').onclick=()=>{S.rep=(S.rep+1)%3;persist();ui();toast(['Повтор выключен','Повтор плейлиста','Повтор песни'][S.rep])};
$('#pf').onclick=()=>{if(!S.cur)return;S.fav=S.fav.includes(S.cur)?S.fav.filter(x=>x!=S.cur):[...S.fav,S.cur];persist();ui();if(view=='fav')render()};
$('#vr').oninput=e=>{muted=false;au.muted=false;setVol(e.target.value/100)};
$('#vr').addEventListener('wheel',e=>{e.preventDefault();muted=false;setVol(S.vol+(e.deltaY<0?.05:-.05))},{passive:false});
$('#mu').onclick=()=>{muted=!muted;applyVol();$('#mu').textContent=muted?'🔇':'🔊'};
let dc=0;addEventListener('dragenter',e=>{if(e.dataTransfer.types.includes('Files')){dc++;$('#drop').style.display='grid'}});
addEventListener('dragleave',()=>{if(--dc<=0){dc=0;$('#drop').style.display='none'}});
addEventListener('dragover',e=>e.preventDefault());
addEventListener('drop',e=>{e.preventDefault();dc=0;$('#drop').style.display='none';if(e.dataTransfer.files.length)imp(e.dataTransfer.files)});
addEventListener('keydown',e=>{const tg=e.target.tagName,typing=tg=='INPUT'&&e.target.type!='range'||tg=='SELECT';
  if(e.code=='Space'&&!typing&&tg!='BUTTON'){e.preventDefault();toggle()}
  if(e.ctrlKey){const k=e.key;
    if(k=='ArrowRight'){e.preventDefault();next(false)}else if(k=='ArrowLeft'){e.preventDefault();prev()}
    else if(k=='ArrowUp'){e.preventDefault();setVol(S.vol+.05)}else if(k=='ArrowDown'){e.preventDefault();setVol(S.vol-.05)}
    else if(k=='f'){e.preventDefault();view='lib';render();$('#sq').focus()}
    else if(k=='l'){e.preventDefault();view='lib';render()}
    else if(k=='p'){e.preventDefault();view='pls';openPl=null;render()}
    else if(k=='q'){e.preventDefault();view='q';render()}}});
if('mediaSession' in navigator){const ms=navigator.mediaSession;ms.setActionHandler('play',toggle);ms.setActionHandler('pause',toggle);ms.setActionHandler('nexttrack',()=>next(false));ms.setActionHandler('previoustrack',prev)}